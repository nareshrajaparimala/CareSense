import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { analyzePatient } from '@/lib/services/analyze';

// Daily Vercel cron — refreshes baselines + re-runs analysis for every active patient
// so that patients who stop logging still get up-to-date "personal normal" rows
// and any rising trend that crosses thresholds surfaces an alert.
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // Vercel cron uses the CRON_SECRET header; allow either Authorization: Bearer <secret>
  // or ?key=<secret> for manual runs.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization') ?? '';
    const url = new URL(req.url);
    const key = url.searchParams.get('key') ?? '';
    if (auth !== `Bearer ${secret}` && key !== secret) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }
  }

  const { data: patients, error } = await supabaseAdmin
    .from('patient')
    .select('id');
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  let ok = 0;
  let failed = 0;
  for (const p of (patients ?? []) as { id: string }[]) {
    try {
      await analyzePatient(p.id);
      ok++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({ ok: true, data: { processed: ok, failed } });
}
