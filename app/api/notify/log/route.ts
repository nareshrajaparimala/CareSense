import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Recent dispatch log — readable by patient (own), caregiver (linked), doctor (all).
export async function GET(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from('user_profile')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const url = new URL(req.url);
  const patientId = url.searchParams.get('patient_id');
  const limit = Math.min(50, Number(url.searchParams.get('limit') ?? 20));

  let q = supabaseAdmin
    .from('notification_log')
    .select('id, patient_id, alert_id, recipient_label, recipient_phone, channel, status, twilio_sid, error, body_preview, trigger, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  // Doctors see all. Patients/caregivers are scoped.
  const role = (profile as any)?.role;
  if (role === 'patient') {
    const { data: pat } = await supabaseAdmin
      .from('patient').select('id').eq('user_id', user.id).maybeSingle();
    if (!pat) return NextResponse.json({ ok: true, data: [] });
    q = q.eq('patient_id', (pat as any).id);
  } else if (role === 'caregiver') {
    const { data: links } = await supabaseAdmin
      .from('caregiver_link').select('patient_id').eq('caregiver_id', user.id).eq('status', 'accepted');
    const ids = ((links ?? []) as any[]).map((l) => l.patient_id);
    if (!ids.length) return NextResponse.json({ ok: true, data: [] });
    q = q.in('patient_id', ids);
  } else if (patientId) {
    q = q.eq('patient_id', patientId);
  }

  const { data, error } = await q;
  if (error) {
    // Most likely cause: migration hasn't been applied yet.
    return NextResponse.json({
      ok: true,
      data: [],
      meta: { migration_needed: true, error: error.message }
    });
  }
  return NextResponse.json({ ok: true, data: data ?? [] });
}
