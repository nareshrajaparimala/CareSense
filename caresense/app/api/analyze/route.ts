import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { analyzePatient } from '@/lib/services/analyze';
import type { ApiResp, AnalyzeResp } from '@/types/api';

const Body = z.object({ patient_id: z.string().uuid() });

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json<ApiResp<AnalyzeResp>>({ ok: false, error: 'unauthorized' }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json<ApiResp<AnalyzeResp>>({ ok: false, error: parsed.error.message }, { status: 400 });
  }

  // Caller must be the patient, a linked caregiver, or a doctor.
  const { data: patient } = await supabase
    .from('patient').select('id').eq('id', parsed.data.patient_id).maybeSingle();
  if (!patient) return NextResponse.json<ApiResp<AnalyzeResp>>({ ok: false, error: 'not found' }, { status: 404 });

  const result = await analyzePatient(parsed.data.patient_id);
  return NextResponse.json<ApiResp<AnalyzeResp>>({ ok: true, data: result });
}
