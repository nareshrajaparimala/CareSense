/**
 * Recompute baselines for all patients and trigger an analysis run.
 * Useful after seeding or whenever you want to refresh alerts for the demo.
 *
 *   npm run baselines
 */
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
loadEnv();
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

function mean(arr: number[]) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
function std(arr: number[]) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1));
}

(async () => {
  const { data: patients } = await sb.from('patient').select('id');
  if (!patients) { console.log('No patients found'); return; }

  for (const p of patients) {
    const { data: vitals } = await sb
      .from('vitals_log')
      .select('bp_systolic, bp_diastolic, glucose_mgdl, heart_rate')
      .eq('patient_id', p.id)
      .order('logged_at', { ascending: false })
      .limit(30);

    if (!vitals || vitals.length < 7) {
      console.log(`Skipping ${p.id} — insufficient data (${vitals?.length ?? 0} rows)`);
      continue;
    }

    // Baselines from EARLIEST stable window only — first 14 days, not all 30
    // (otherwise the rising trend pollutes Ramesh's "personal normal")
    const stable = vitals.slice(-14);
    const sys = stable.map((v: any) => v.bp_systolic).filter((n: any) => n != null);
    const dia = stable.map((v: any) => v.bp_diastolic).filter((n: any) => n != null);
    const glu = stable.map((v: any) => v.glucose_mgdl).filter((n: any) => n != null);
    const hr  = stable.map((v: any) => v.heart_rate).filter((n: any) => n != null);

    await sb.from('patient_baseline').upsert({
      patient_id: p.id,
      bp_systolic_mean: mean(sys), bp_systolic_std: std(sys) || 1,
      bp_diastolic_mean: mean(dia), bp_diastolic_std: std(dia) || 1,
      glucose_mean: mean(glu), glucose_std: std(glu) || 1,
      heart_rate_mean: mean(hr), heart_rate_std: std(hr) || 1,
      data_points_count: vitals.length
    });
    console.log(`✅ Baseline for ${p.id} — BP mean ${mean(sys).toFixed(0)}/${mean(dia).toFixed(0)}, std ${std(sys).toFixed(1)}`);
  }
})().catch((e) => { console.error(e); process.exit(1); });
