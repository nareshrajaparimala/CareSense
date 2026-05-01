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
    tips.push('Cut salt today: skip pickles, papad, packaged snacks.');
    tips.push('Walk 20 minutes after lunch — slow pace.');
  } else {
    tips.push('Walk 20 minutes after lunch.');
  }
  if (last?.glucose_mgdl && last.glucose_mgdl >= 180) {
    tips.push('Swap rice for ½ cup brown rice + 1 cup veggies at dinner.');
  } else {
    tips.push('Drink 2 glasses of water in the next hour.');
  }
  if (!last?.sleep_hours || last.sleep_hours < 7) {
    tips.push('Lights out by 10:30 PM tonight — aim for 7–8 h sleep.');
  } else {
    tips.push('Take meds with breakfast — set a 8 AM reminder.');
  }
  return {
    greeting: `Hi, ${name.split(' ')[0]}.`,
    focus: 'Stay steady today.',
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
    .select('id, user_id, age, sex, conditions, allergies')
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

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();

  const [{ data: vitals }, { data: meds }, { data: medLogs }, { data: baseline }, { data: alert }] = await Promise.all([
    supabaseAdmin
      .from('vitals_log')
      .select('*')
      .eq('patient_id', patientId)
      .order('logged_at', { ascending: false })
      .limit(7),
    supabaseAdmin
      .from('medication')
      .select('id, name, dosage, frequency')
      .eq('patient_id', patientId)
      .eq('active', true),
    supabaseAdmin
      .from('medication_log')
      .select('medication_id, taken, logged_at')
      .eq('patient_id', patientId)
      .gte('logged_at', sevenDaysAgo),
    supabaseAdmin
      .from('patient_baseline')
      .select('*')
      .eq('patient_id', patientId)
      .maybeSingle(),
    supabaseAdmin
      .from('alert')
      .select('level, title, message, recommendation, created_at')
      .eq('patient_id', patientId)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  const name = (profile as any)?.full_name ?? 'there';
  const recent = (vitals ?? []) as any[];
  const medications = (meds ?? []) as any[];
  const adherenceLogs = (medLogs ?? []) as any[];

  // Per-medication adherence (last 7 days)
  const adherence = medications.map((m) => {
    const rows = adherenceLogs.filter((l) => l.medication_id === m.id);
    const taken = rows.filter((r) => r.taken).length;
    const total = rows.length;
    return {
      name: m.name,
      dosage: m.dosage ?? '',
      frequency: m.frequency ?? 'daily',
      taken,
      total,
      missed: Math.max(0, total - taken)
    };
  });

  // Trend deltas (newest - oldest)
  const trendDelta = (key: string): { from: number; to: number; arrow: string } | null => {
    const xs = recent.map((r) => r[key]).filter((n: any) => typeof n === 'number');
    if (xs.length < 2) return null;
    const from = xs[xs.length - 1];
    const to = xs[0];
    const d = to - from;
    return { from, to, arrow: d > 1 ? '↑ rising' : d < -1 ? '↓ falling' : '→ stable' };
  };

  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
  const sys7 = avg(recent.map((r) => r.bp_systolic).filter((x): x is number => x != null));
  const glu7 = avg(recent.map((r) => r.glucose_mgdl).filter((x): x is number => x != null));
  const hr7 = avg(recent.map((r) => r.heart_rate).filter((x): x is number => x != null));
  const sleep7 = avg(recent.map((r) => r.sleep_hours).filter((x): x is number => x != null));
  const mood7 = avg(recent.map((r) => r.mood).filter((x): x is number => x != null));

  const dietFlags: Record<string, number> = {};
  recent.forEach((r) => {
    if (r.diet_flag) dietFlags[r.diet_flag] = (dietFlags[r.diet_flag] ?? 0) + 1;
  });
  const activitySummary = recent.map((r) => r.activity_level).filter(Boolean).join(', ');

  const conditions = ((patient as any).conditions ?? []) as string[];
  const allergies = ((patient as any).allergies ?? []) as string[];

  // ── Build the structured patient card ──
  const lines: string[] = [];
  lines.push(`PATIENT: ${name}, ${(patient as any).age ?? '?'} y, ${(patient as any).sex ?? '?'}.`);
  lines.push(`CONDITIONS: ${conditions.length ? conditions.join(', ') : 'none on file'}.`);
  if (allergies.length) lines.push(`ALLERGIES: ${allergies.join(', ')}.`);

  if (recent[0]) {
    const last = recent[0];
    lines.push(
      `LATEST VITALS (${new Date(last.logged_at).toISOString().slice(0, 10)}):` +
        ` BP ${last.bp_systolic ?? '?'}/${last.bp_diastolic ?? '?'},` +
        ` glucose ${last.glucose_mgdl ?? '?'} mg/dL,` +
        ` HR ${last.heart_rate ?? '?'},` +
        ` SpO2 ${last.spo2 ?? '?'}%,` +
        ` sleep ${last.sleep_hours ?? '?'} h,` +
        ` mood ${last.mood ?? '?'}/5.`
    );
  } else {
    lines.push('LATEST VITALS: none logged yet.');
  }

  const sevenDay: string[] = [];
  if (sys7 != null) sevenDay.push(`BP avg ${sys7.toFixed(0)}`);
  if (glu7 != null) sevenDay.push(`glucose avg ${glu7.toFixed(0)}`);
  if (hr7 != null) sevenDay.push(`HR avg ${hr7.toFixed(0)}`);
  if (sleep7 != null) sevenDay.push(`sleep avg ${sleep7.toFixed(1)} h`);
  if (mood7 != null) sevenDay.push(`mood avg ${mood7.toFixed(1)}/5`);
  if (sevenDay.length) lines.push(`7-DAY AVG: ${sevenDay.join(', ')}.`);

  if ((baseline as any)?.bp_systolic_mean) {
    const b: any = baseline;
    lines.push(
      `PERSONAL BP BASELINE: ${Number(b.bp_systolic_mean).toFixed(0)} ± ${(1.5 * Number(b.bp_systolic_std ?? 0)).toFixed(0)}.`
    );
  }

  const tBp = trendDelta('bp_systolic');
  const tGlu = trendDelta('glucose_mgdl');
  if (tBp) lines.push(`BP TREND: ${tBp.arrow} (${tBp.from} → ${tBp.to}).`);
  if (tGlu) lines.push(`GLUCOSE TREND: ${tGlu.arrow} (${tGlu.from} → ${tGlu.to}).`);

  if (Object.keys(dietFlags).length) {
    lines.push(
      `DIET FLAGS (last 7 logs): ${Object.entries(dietFlags).map(([k, v]) => `${k.replace('_', ' ')} ×${v}`).join(', ')}.`
    );
  }
  if (activitySummary) lines.push(`ACTIVITY (last 7 logs): ${activitySummary}.`);

  if (adherence.length) {
    lines.push(
      'MEDICATIONS (last 7d):\n' +
        adherence
          .map((m) => `  - ${m.name}${m.dosage ? ` ${m.dosage}` : ''} (${m.frequency}): ${m.taken}/${m.total || 0} taken${m.missed > 0 ? `, missed ${m.missed}` : ''}`)
          .join('\n')
    );
  } else {
    lines.push('MEDICATIONS: none on file.');
  }

  if (alert) {
    lines.push(
      `OPEN ALERT: ${(alert as any).level?.toUpperCase()} — "${(alert as any).title}". ${(alert as any).message}` +
        ((alert as any).recommendation ? ` Recommended: ${(alert as any).recommendation}` : '')
    );
  }

  const patientCard = lines.join('\n');

  const systemPrompt = [
    'You are CareSense, a personal health companion writing TODAY\'s daily guidance for ONE patient.',
    'Use ONLY the data card below. Do not give generic textbook advice.',
    '',
    'STYLE RULES — follow strictly:',
    '• Each tip ≤ 14 words. SHORT, simple words. No filler.',
    '• Tips must reference the patient\'s real numbers OR a specific named medication.',
    '• Diet tips: name specific foods + portions (cups, grams, glasses). Not vague.',
    '• Med tips: use the exact medication name + missed-dose count from the card.',
    '• If a trend is rising, call it out with the from→to numbers.',
    '• No medical disclaimers in the JSON.',
    '• If a number is missing, do not invent it — write a tip that helps log it.',
    '',
    `DATA CARD (authoritative):\n${patientCard}`,
    '',
    'Return ONLY valid JSON (no markdown, no code fences):',
    '{',
    '  "greeting": "short hello with first name (max 6 words)",',
    '  "focus": "one short sentence stating today\'s main focus, citing one real number from the card",',
    '  "tips": ["3 to 5 short, specific, personalised tips obeying the rules above"]',
    '}'
  ].join('\n');

  const out = await callGroq(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Write today\'s guidance for this patient.' }
    ],
    {
      // Larger model = better personalization quality
      model: 'llama-3.3-70b-versatile',
      maxTokens: 600,
      temperature: 0.4,
      json: true
    }
  );

  if (!out) {
    return NextResponse.json({ ok: true, data: fallback(name, recent) });
  }

  try {
    const parsed = JSON.parse(out);
    if (
      typeof parsed.greeting === 'string' &&
      typeof parsed.focus === 'string' &&
      Array.isArray(parsed.tips) &&
      parsed.tips.length > 0
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
