import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { analyzePatient } from '@/lib/services/analyze';
import type { ApiResp, LogVitalsResp } from '@/types/api';

const Body = z.object({
  patient_id: z.string().uuid(),
  bp_systolic: z.number().int().min(60).max(260).optional(),
  bp_diastolic: z.number().int().min(30).max(160).optional(),
  glucose_mgdl: z.number().int().min(30).max(600).optional(),
  heart_rate: z.number().int().min(30).max(220).optional(),
  spo2: z.number().int().min(50).max(100).optional(),
  weight_kg: z.number().min(20).max(300).optional(),
  sleep_hours: z.number().min(0).max(24).optional(),
  activity_level: z.enum(['low', 'medium', 'high']).optional(),
  diet_flag: z.enum(['normal', 'high_carb', 'high_sodium']).optional(),
  mood: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(500).optional()
});

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json<ApiResp<LogVitalsResp>>({ ok: false, error: 'unauthorized' }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json<ApiResp<LogVitalsResp>>({ ok: false, error: parsed.error.message }, { status: 400 });
  }

  // Confirm caller owns the patient row
  const { data: patient } = await supabase
    .from('patient')
    .select('id, user_id')
    .eq('id', parsed.data.patient_id)
    .maybeSingle();
  if (!patient || patient.user_id !== user.id) {
    return NextResponse.json<ApiResp<LogVitalsResp>>({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  const { data: vital, error: insErr } = await supabaseAdmin
    .from('vitals_log')
    .insert(parsed.data)
    .select()
    .single();

  if (insErr || !vital) {
    return NextResponse.json<ApiResp<LogVitalsResp>>(
      { ok: false, error: insErr?.message ?? 'insert failed' },
      { status: 500 }
    );
  }

  const result = await analyzePatient(parsed.data.patient_id);

  return NextResponse.json<ApiResp<LogVitalsResp>>({
    ok: true,
    data: { vital: vital as any, level: result.level, alert: result.alert }
  });
}
