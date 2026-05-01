import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { callGroq } from '@/lib/ai/groq';

type Suggestion = {
  greeting: string;
  focus: string;
  tips: string[];
  source: 'llm' | 'fallback';
};

function fallback(name: string, vitals: any[]): Suggestion {
  const last = vitals[0];
  const tips: string[] = [];
  if (last?.bp_systolic && last.bp_systolic >= 140) {
    tips.push('Reduce sodium today and rest more — BP is above range.');
  } else {
    tips.push('Take a 20-minute walk after a meal to support circulation.');
  }
  if (last?.glucose_mgdl && last.glucose_mgdl >= 180) {
    tips.push('Choose lower-carb options at your next meal.');
  } else {
    tips.push('Drink 2 glasses of water in the next hour.');
  }
  if (!last?.sleep_hours || last.sleep_hours < 7) {
    tips.push('Aim for 7–8 hours of sleep tonight.');
  } else {
    tips.push('Keep your medication routine on schedule.');
  }
  return {
    greeting: `Hello, ${name.split(' ')[0]}.`,
    focus: 'Stay consistent with your daily routine.',
    tips,
    source: 'fallback'
  };
}

export async function GET(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const patientId = url.searchParams.get('patient_id');
  if (!patientId) return NextResponse.json({ ok: false, error: 'patient_id required' }, { status: 400 });

  const { data: patient } = await supabaseAdmin
    .from('patient')
    .select('id, user_id, conditions')
    .eq('id', patientId)
    .maybeSingle();

  if (!patient || (patient as any).user_id !== user.id) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  const { data: profile } = await supabaseAdmin
    .from('user_profile')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle();

  const { data: vitals } = await supabaseAdmin
    .from('vitals_log')
    .select('*')
    .eq('patient_id', patientId)
    .order('logged_at', { ascending: false })
    .limit(7);

  const name = (profile as any)?.full_name ?? 'there';
  const recent = (vitals ?? []) as any[];

  const summary = recent
    .map(
      (v) =>
        `${new Date(v.logged_at).toISOString().slice(0, 10)} | BP ${v.bp_systolic ?? '-'}/${v.bp_diastolic ?? '-'} | Glu ${v.glucose_mgdl ?? '-'} | HR ${v.heart_rate ?? '-'} | Sleep ${v.sleep_hours ?? '-'}h | Mood ${v.mood ?? '-'}`
    )
    .join('\n');

  const conditions = ((patient as any).conditions ?? []).join(', ') || 'none recorded';

  const prompt = `You are CareSense, a calm chronic-care AI companion.
Patient: ${name}
Conditions: ${conditions}
Recent 7-day vitals (newest first):
${summary || 'No vitals logged yet.'}

Return ONLY valid JSON (no markdown) with this shape:
{
  "greeting": "short personal hello (max 8 words)",
  "focus": "one short sentence describing today's main focus based on the data",
  "tips": ["actionable tip 1", "actionable tip 2", "actionable tip 3"]
}
Tips must be specific to the patient's recent numbers. Avoid medical disclaimers in the JSON itself.`;

  const out = await callGroq(
    [{ role: 'user', content: prompt }],
    { maxTokens: 350, temperature: 0.5, json: true }
  );

  if (!out) {
    return NextResponse.json({ ok: true, data: fallback(name, recent) });
  }

  try {
    const parsed = JSON.parse(out);
    if (
      typeof parsed.greeting === 'string' &&
      typeof parsed.focus === 'string' &&
      Array.isArray(parsed.tips)
    ) {
      return NextResponse.json({
        ok: true,
        data: { ...parsed, source: 'llm' as const }
      });
    }
  } catch {
    /* fall through */
  }

  return NextResponse.json({ ok: true, data: fallback(name, recent) });
}
