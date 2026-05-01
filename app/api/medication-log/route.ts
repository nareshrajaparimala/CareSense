import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const Body = z.object({
  // Multiple entries in one call.
  entries: z.array(z.object({
    medication_id: z.string().uuid(),
    taken: z.boolean(),
    scheduled_time: z.string().datetime().optional()
  })).min(1).max(20)
});

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });

  const { data: patient } = await supabaseAdmin
    .from('patient')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!patient) return NextResponse.json({ ok: false, error: 'no patient profile' }, { status: 400 });
  const patientId = (patient as any).id;

  const ids = parsed.data.entries.map((e) => e.medication_id);
  const { data: meds } = await supabaseAdmin
    .from('medication')
    .select('id, patient_id')
    .in('id', ids);
  const owned = new Set(((meds ?? []) as any[]).filter((m) => m.patient_id === patientId).map((m) => m.id));
  if (ids.some((id) => !owned.has(id))) {
    return NextResponse.json({ ok: false, error: 'forbidden — one or more medications not yours' }, { status: 403 });
  }

  const rows = parsed.data.entries.map((e) => ({
    patient_id: patientId,
    medication_id: e.medication_id,
    taken: e.taken,
    scheduled_time: e.scheduled_time ?? new Date().toISOString(),
    logged_at: new Date().toISOString()
  }));

  const { error } = await supabaseAdmin.from('medication_log').insert(rows);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, data: { inserted: rows.length } });
}
