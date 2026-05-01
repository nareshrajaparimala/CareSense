import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { forecast72hr } from '@/lib/ai/forecast';
import { CRITICAL_BP_SYSTOLIC } from '@/lib/constants';
import type { ApiResp, ForecastResp } from '@/types/api';

const Query = z.object({ patient_id: z.string().uuid() });

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = Query.safeParse({ patient_id: url.searchParams.get('patient_id') });
  if (!parsed.success) {
    return NextResponse.json<ApiResp<ForecastResp>>({ ok: false, error: parsed.error.message }, { status: 400 });
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json<ApiResp<ForecastResp>>({ ok: false, error: 'unauthorized' }, { status: 401 });

  const { data: vitalsRows } = await supabase
    .from('vitals_log')
    .select('bp_systolic, logged_at')
    .eq('patient_id', parsed.data.patient_id)
    .order('logged_at', { ascending: true })
    .limit(30);

  const series = (vitalsRows ?? [])
    .map((v) => v.bp_systolic)
    .filter((n): n is number => n != null);

  const forecast = forecast72hr(series, CRITICAL_BP_SYSTOLIC);
  return NextResponse.json<ApiResp<ForecastResp>>({ ok: true, data: forecast });
}
