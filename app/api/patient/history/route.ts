import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const Body = z.object({
  patient_id: z.string().uuid(),
  scope: z.enum(['all', 'vitals', 'alerts', 'medications']).default('all')
});

// DELETE: doctor-only. Wipes a patient's logged history (vitals, medication logs,
// alerts, baseline). Useful for clearing test/seed data.
export async function DELETE(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from('user_profile')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if ((profile as any)?.role !== 'doctor') {
    return NextResponse.json({ ok: false, error: 'forbidden — doctors only' }, { status: 403 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });
  }

  const pid = parsed.data.patient_id;
  const scope = parsed.data.scope;

  const { data: patient } = await supabaseAdmin
    .from('patient')
    .select('id')
    .eq('id', pid)
    .maybeSingle();
  if (!patient) {
    return NextResponse.json({ ok: false, error: 'patient not found' }, { status: 404 });
  }

  // Each Supabase query builder is thenable but not strictly a Promise<T>.
  // Wrap with Promise.resolve so TS accepts them as Promise<any>[].
  const tasks: Promise<any>[] = [];
  if (scope === 'all' || scope === 'vitals') {
    tasks.push(Promise.resolve(supabaseAdmin.from('vitals_log').delete().eq('patient_id', pid)));
    tasks.push(Promise.resolve(supabaseAdmin.from('patient_baseline').delete().eq('patient_id', pid)));
  }
  if (scope === 'all' || scope === 'alerts') {
    tasks.push(Promise.resolve(supabaseAdmin.from('alert').delete().eq('patient_id', pid)));
  }
  if (scope === 'all' || scope === 'medications') {
    tasks.push(Promise.resolve(supabaseAdmin.from('medication_log').delete().eq('patient_id', pid)));
  }

  const results = await Promise.all(tasks);
  const firstErr = results.find((r: any) => r?.error);
  if (firstErr) {
    return NextResponse.json({ ok: false, error: (firstErr as any).error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: { scope } });
}
