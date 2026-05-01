import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { ApiResp } from '@/types/api';

const PatchBody = z.object({
  alert_id: z.string().uuid(),
  status: z.enum(['acknowledged', 'resolved'])
});

// Anyone with access to the patient can acknowledge / resolve their alert:
// the patient themselves, a linked caregiver, or any doctor.
async function canModifyAlert(userId: string, alertId: string): Promise<boolean> {
  const { data: alert } = await supabaseAdmin
    .from('alert')
    .select('patient_id')
    .eq('id', alertId)
    .maybeSingle();
  if (!alert) return false;
  const patientId = (alert as any).patient_id as string;

  // Patient owns?
  const { data: patient } = await supabaseAdmin
    .from('patient')
    .select('user_id')
    .eq('id', patientId)
    .maybeSingle();
  if ((patient as any)?.user_id === userId) return true;

  // Caregiver linked?
  const { data: link } = await supabaseAdmin
    .from('caregiver_link')
    .select('id')
    .eq('caregiver_id', userId)
    .eq('patient_id', patientId)
    .maybeSingle();
  if (link) return true;

  // Doctor?
  const { data: profile } = await supabaseAdmin
    .from('user_profile')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  return (profile as any)?.role === 'doctor';
}

export async function PATCH(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json<ApiResp<null>>({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const parsed = PatchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json<ApiResp<null>>({ ok: false, error: parsed.error.message }, { status: 400 });
  }

  const allowed = await canModifyAlert(user.id, parsed.data.alert_id);
  if (!allowed) {
    return NextResponse.json<ApiResp<null>>({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  // Use admin to bypass the alert_doctor_update-only RLS policy.
  const { error } = await supabaseAdmin
    .from('alert')
    .update({
      status: parsed.data.status,
      acknowledged_by: user.id,
      acknowledged_at: new Date().toISOString()
    })
    .eq('id', parsed.data.alert_id);

  if (error) {
    return NextResponse.json<ApiResp<null>>({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json<ApiResp<null>>({ ok: true, data: null });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const patientId = url.searchParams.get('patient_id');
  if (!patientId) {
    return NextResponse.json({ ok: false, error: 'patient_id required' }, { status: 400 });
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('alert')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}
