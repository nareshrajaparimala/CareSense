import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Build a tight, structured "patient card" the LLM can quote from.
// Uses ONLY the signed-in user's data — no generic answers.
async function buildPatientContext(userId: string): Promise<string | null> {
  const sb = supabaseAdmin;

  const { data: profile } = await sb
    .from('user_profile')
    .select('full_name, role')
    .eq('id', userId)
    .maybeSingle();

  const { data: patient } = await sb
    .from('patient')
    .select('id, age, sex, conditions, allergies')
    .eq('user_id', userId)
    .maybeSingle();
  if (!patient) return null;

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();

  const [
    { data: vitals },
    { data: baseline },
    { data: meds },
    { data: medLogs },
    { data: alert }
  ] = await Promise.all([
    sb.from('vitals_log')
      .select('logged_at, bp_systolic, bp_diastolic, glucose_mgdl, heart_rate, spo2, sleep_hours, mood, diet_flag, activity_level')
      .eq('patient_id', patient.id)
      .order('logged_at', { ascending: false })
      .limit(7),
    sb.from('patient_baseline').select('*').eq('patient_id', patient.id).maybeSingle(),
    sb.from('medication').select('id, name, dosage, frequency').eq('patient_id', patient.id).eq('active', true),
    sb.from('medication_log').select('medication_id, taken, logged_at').eq('patient_id', patient.id).gte('logged_at', sevenDaysAgo),
    sb.from('alert').select('level, title, message, recommendation, created_at').eq('patient_id', patient.id).eq('status', 'open').order('created_at', { ascending: false }).limit(1).maybeSingle()
  ]);

  const v = (vitals ?? []) as any[];
  const latest = v[0] ?? {};
  const conditions = (patient.conditions ?? []) as string[];
  const allergies = (patient.allergies ?? []) as string[];

  // Per-medication adherence over the last 7 days.
  const adherence = ((meds ?? []) as any[]).map((m) => {
    const rows = ((medLogs ?? []) as any[]).filter((l) => l.medication_id === m.id);
    const taken = rows.filter((r) => r.taken).length;
    const total = rows.length;
    return {
      name: m.name,
      dosage: m.dosage ?? '',
      frequency: m.frequency ?? '',
      taken,
      total,
      missed: total - taken
    };
  });

  // 7-day averages (skip nulls)
  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
  const sys7 = avg(v.map((r) => r.bp_systolic).filter((x): x is number => x != null));
  const glu7 = avg(v.map((r) => r.glucose_mgdl).filter((x): x is number => x != null));
  const hr7 = avg(v.map((r) => r.heart_rate).filter((x): x is number => x != null));
  const sleep7 = avg(v.map((r) => r.sleep_hours).filter((x): x is number => x != null));
  const mood7 = avg(v.map((r) => r.mood).filter((x): x is number => x != null));

  const dietFlags = v.map((r) => r.diet_flag).filter(Boolean);
  const activityFlags = v.map((r) => r.activity_level).filter(Boolean);

  const lines: string[] = [];
  lines.push(`PATIENT: ${profile?.full_name ?? 'Patient'}, ${patient.age ?? '?'} y, ${patient.sex ?? '?'}.`);
  lines.push(`CONDITIONS: ${conditions.length ? conditions.join(', ') : 'none on file'}.`);
  if (allergies.length) lines.push(`ALLERGIES: ${allergies.join(', ')}.`);

  if (latest.bp_systolic || latest.glucose_mgdl) {
    lines.push(
      `LATEST VITALS (${latest.logged_at ? new Date(latest.logged_at).toISOString().slice(0, 10) : 'recent'}):` +
        ` BP ${latest.bp_systolic ?? '?'}/${latest.bp_diastolic ?? '?'} mmHg,` +
        ` glucose ${latest.glucose_mgdl ?? '?'} mg/dL,` +
        ` HR ${latest.heart_rate ?? '?'},` +
        ` SpO2 ${latest.spo2 ?? '?'}%,` +
        ` sleep ${latest.sleep_hours ?? '?'} h,` +
        ` mood ${latest.mood ?? '?'}/5.`
    );
  }

  const sevenDaySummary: string[] = [];
  if (sys7 != null) sevenDaySummary.push(`BP avg ${sys7.toFixed(0)}`);
  if (glu7 != null) sevenDaySummary.push(`glucose avg ${glu7.toFixed(0)}`);
  if (hr7 != null) sevenDaySummary.push(`HR avg ${hr7.toFixed(0)}`);
  if (sleep7 != null) sevenDaySummary.push(`sleep avg ${sleep7.toFixed(1)} h`);
  if (mood7 != null) sevenDaySummary.push(`mood avg ${mood7.toFixed(1)}/5`);
  if (sevenDaySummary.length) lines.push(`7-DAY AVG: ${sevenDaySummary.join(', ')}.`);

  if (baseline?.bp_systolic_mean) {
    lines.push(
      `PERSONAL BASELINE BP: ${Number(baseline.bp_systolic_mean).toFixed(0)} ± ${(1.5 * Number(baseline.bp_systolic_std ?? 0)).toFixed(0)} mmHg.`
    );
  }

  if (dietFlags.length) {
    const counts: Record<string, number> = {};
    dietFlags.forEach((d: string) => (counts[d] = (counts[d] ?? 0) + 1));
    const summary = Object.entries(counts).map(([k, v]) => `${k.replace('_', ' ')} ×${v}`).join(', ');
    lines.push(`DIET (last 7 logs): ${summary}.`);
  }
  if (activityFlags.length) {
    lines.push(`ACTIVITY (last 7 logs): ${activityFlags.join(', ')}.`);
  }

  if (adherence.length) {
    const medSummary = adherence
      .map((m) => `${m.name}${m.dosage ? ` ${m.dosage}` : ''} (${m.frequency || 'daily'}): ${m.taken}/${m.total || 0} taken${m.missed > 0 ? `, missed ${m.missed}` : ''}`)
      .join('; ');
    lines.push(`MEDICATIONS (last 7d): ${medSummary}.`);
  }

  if (alert) {
    lines.push(
      `OPEN ALERT: ${alert.level?.toUpperCase()} — "${alert.title}". ${alert.message}` +
        (alert.recommendation ? ` Recommended: ${alert.recommendation}` : '')
    );
  }

  return lines.join('\n');
}

export async function POST(req: NextRequest) {
  const { message } = await req.json().catch(() => ({ message: '' }));
  if (!message?.trim()) {
    return NextResponse.json({ reply: 'Please ask me something.' });
  }
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({
      reply: 'AI is not configured yet. Please add GROQ_API_KEY to .env.local and restart the dev server.'
    });
  }

  // Pull the signed-in patient's full context — server-side, no trust on client.
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const patientCtx = user ? await buildPatientContext(user.id) : null;

  const systemPrompt = [
    'You are CareSense, a personal health companion for ONE patient whose data is below.',
    'Use ONLY their data when giving advice. Do not give generic textbook lists.',
    '',
    'STYLE RULES — follow strictly:',
    '• Reply in SHORT, SIMPLE words. No long paragraphs. No filler.',
    '• Use bullet points. Each bullet ≤ 12 words.',
    '• When giving diet, list specific foods with grams/cups/portions, not vague advice.',
    '• When discussing meds, name the patient\'s actual medication and the missed-dose count.',
    '• Reference the patient\'s real numbers (BP, glucose, HR, sleep) — never invent values.',
    '• If something is medically risky, end with one short line: "Call your doctor if it stays high."',
    '• Do NOT begin with "I am not a doctor" disclaimers — keep tone direct and warm.',
    '• If the user asks about something we have no data for, say so in one line.',
    '',
    patientCtx
      ? `PATIENT DATA (authoritative — quote from this):\n${patientCtx}`
      : 'No patient record found. Ask them to log their vitals first.'
  ].join('\n');

  try {
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        // Larger model for better personalization quality
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 450,
        temperature: 0.4
      })
    });

    const data = await resp.json();
    const reply = data?.choices?.[0]?.message?.content ?? 'No response.';
    return NextResponse.json({ reply: reply.trim() });
  } catch {
    return NextResponse.json({ reply: 'Sorry, the AI service is unavailable right now.' });
  }
}
