import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { callGroq } from '@/lib/ai/groq';

type Body = {
  metric: 'bp' | 'glucose' | 'hr' | 'spo2' | 'sleep' | 'mood';
  value: number | string | null;
  recent: Array<number | null>;
  patient_id?: string;
};

const META: Record<Body['metric'], { label: string; unit: string; range: string }> = {
  bp: { label: 'Blood pressure (systolic)', unit: 'mmHg', range: 'normal: 110–129; high: 140+' },
  glucose: { label: 'Blood glucose', unit: 'mg/dL', range: 'normal: 80–140; high: 180+' },
  hr: { label: 'Heart rate', unit: 'bpm', range: 'normal: 60–90; concern: <50 or >110' },
  spo2: { label: 'Oxygen saturation', unit: '%', range: 'normal: 95–100; concern: <92' },
  sleep: { label: 'Sleep duration', unit: 'hours', range: 'target: 7–9; concern: <6' },
  mood: { label: 'Mood', unit: '1–5 scale', range: 'higher is better; concern: <3 for several days' }
};

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body || !body.metric || !(body.metric in META)) {
    return NextResponse.json({ ok: false, error: 'invalid body' }, { status: 400 });
  }

  const meta = META[body.metric];
  const recentStr = body.recent.filter((n) => n != null).join(', ') || 'no recent values';

  // Pull patient context (conditions, age) so the AI can personalise the explanation.
  let patientCtx = '';
  if (body.patient_id) {
    const { data: patient } = await supabaseAdmin
      .from('patient')
      .select('user_id, age, sex, conditions')
      .eq('id', body.patient_id)
      .maybeSingle();
    if (patient && (patient as any).user_id === user.id) {
      const conditions = ((patient as any).conditions ?? []) as string[];
      patientCtx = `\nPatient context (use it to tailor the explanation):
- Age: ${(patient as any).age ?? 'unknown'}
- Sex: ${(patient as any).sex ?? 'unknown'}
- Conditions: ${conditions.length ? conditions.join(', ') : 'none recorded'}`;
    }
  }

  const prompt = `You are CareSense, a chronic-care AI explainer.
Metric: ${meta.label} (${meta.unit}). Reference: ${meta.range}.
Latest value: ${body.value ?? 'unknown'}
Recent values (newest first): ${recentStr}${patientCtx}

Return ONLY valid JSON:
{
  "level": "stable" | "watch" | "trend" | "risk" | "critical",
  "factor": "the single biggest risk-causing factor for THIS patient in plain English (max 12 words)",
  "reason": "one short sentence explaining WHY based on the numbers and the patient's conditions"
}`;

  const out = await callGroq(
    [{ role: 'user', content: prompt }],
    { maxTokens: 200, temperature: 0.3, json: true }
  );

  if (!out) {
    return NextResponse.json({
      ok: true,
      data: {
        level: 'stable',
        factor: 'Insufficient data for AI explanation',
        reason: `${meta.label} reference range — ${meta.range}.`,
        source: 'fallback'
      }
    });
  }

  try {
    const parsed = JSON.parse(out);
    return NextResponse.json({ ok: true, data: { ...parsed, source: 'llm' } });
  } catch {
    return NextResponse.json({
      ok: true,
      data: {
        level: 'stable',
        factor: 'Could not interpret AI response',
        reason: `${meta.label} reference range — ${meta.range}.`,
        source: 'fallback'
      }
    });
  }
}
