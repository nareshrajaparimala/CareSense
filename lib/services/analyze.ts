import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { computeBaseline, countConsecutiveDeviations, detectAnomaly } from '@/lib/ai/baseline';
import { computeShap } from '@/lib/ai/shap';
import { forecast72hr } from '@/lib/ai/forecast';
import { decideLevel } from '@/lib/ai/escalation';
import { generateAlertExplanation } from '@/lib/ai/llm-explainer';
import { dispatchAlertNotifications } from '@/lib/notify/sendAlert';
import { CRITICAL_BP_SYSTOLIC } from '@/lib/constants';
import type { Alert, AlertLevel, Baseline, Forecast, ShapBreakdown, Vital } from '@/types/domain';

// Minimum vitals before baseline is meaningful (mean+std need ≥2; pick 2 to bootstrap fast).
const MIN_BASELINE_POINTS = 2;
// Minimum points before forecast/SHAP/alert pipeline runs.
const MIN_PIPELINE_POINTS = 3;

export type AnalyzeResult = {
  level: AlertLevel;
  scores: { severity: string; consecutiveDays: number; missedPct: number; sleepAvg: number };
  shap: ShapBreakdown | null;
  forecast: Forecast | null;
  alert: Alert | null;
  baseline: Baseline | null;
  insufficientData?: { current: number; required: number };
};

export async function analyzePatient(patientId: string): Promise<AnalyzeResult> {
  const sb = supabaseAdmin;

  // 1. Fetch last 30 days of vitals (we slice to the proper window inside each helper).
  const { data: vitalsRows } = await sb
    .from('vitals_log')
    .select('*')
    .eq('patient_id', patientId)
    .order('logged_at', { ascending: false })
    .limit(30);
  const vitals = (vitalsRows ?? []) as Vital[];

  // 2. Bootstrap baseline from day 1 — independent of pipeline gate.
  // Always recompute on every analysis run: cheap, stays in sync with new logs,
  // and avoids stale-baseline drift when a patient stops or resumes logging.
  let baseline: Baseline | null = null;
  if (vitals.length >= MIN_BASELINE_POINTS) {
    const computed = computeBaseline(patientId, vitals);
    await sb.from('patient_baseline').upsert(computed);
    baseline = computed;
  }

  // 3. Insufficient-data short-circuit (after baseline write).
  if (vitals.length < MIN_PIPELINE_POINTS || !baseline) {
    return {
      level: 'stable',
      scores: { severity: 'normal', consecutiveDays: 0, missedPct: 0, sleepAvg: 7 },
      shap: null,
      forecast: null,
      alert: null,
      baseline,
      insufficientData: { current: vitals.length, required: MIN_PIPELINE_POINTS }
    };
  }

  const latest = vitals[0];

  // 4. Anomaly + consecutive
  const bpAnomaly = detectAnomaly(latest.bp_systolic, baseline.bp_systolic_mean, baseline.bp_systolic_std);
  const consecutiveDays = countConsecutiveDeviations(vitals, baseline);

  // 5. Medication adherence (last 7d)
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
  const { data: medLogRows } = await sb
    .from('medication_log')
    .select('taken')
    .eq('patient_id', patientId)
    .gte('logged_at', sevenDaysAgo);
  const medLog = (medLogRows ?? []) as { taken: boolean }[];
  const missedPct = medLog.length ? medLog.filter((m) => !m.taken).length / medLog.length : 0;

  // 6. Sleep avg (last 7 vitals)
  const last7 = vitals.slice(0, 7);
  const sleepValues = last7.map((v) => v.sleep_hours).filter((n): n is number => n != null);
  const sleepAvg = sleepValues.length ? sleepValues.reduce((a, b) => a + b, 0) / sleepValues.length : 7;

  // 7. SHAP — always computed.
  const shap = computeShap({
    current: latest,
    baseline,
    medLog,
    sleep_hours_avg: sleepAvg,
    recent: last7
  });

  // 8. Forecast on bp_systolic chronological — last 7 entries are sliced inside.
  const bpSeries = [...vitals]
    .reverse()
    .map((v) => v.bp_systolic)
    .filter((n): n is number => n != null);
  const forecast = forecast72hr(bpSeries, CRITICAL_BP_SYSTOLIC);

  // 9. Decide level
  const level = decideLevel({
    severity: bpAnomaly.severity,
    consecutiveDays,
    forecastConfidence: forecast?.confidence ?? 0,
    daysToCritical: forecast?.days_to_critical ?? 30,
    currentBpSystolic: latest.bp_systolic,
    currentGlucose: latest.glucose_mgdl,
    currentSpo2: latest.spo2
  });

  let alert: Alert | null = null;

  if (level !== 'stable') {
    // Suppress duplicate open alerts at same level within last 12h
    const twelveHoursAgo = new Date(Date.now() - 12 * 3600_000).toISOString();
    const { data: existing } = await sb
      .from('alert')
      .select('*')
      .eq('patient_id', patientId)
      .eq('status', 'open')
      .eq('level', level)
      .gte('created_at', twelveHoursAgo)
      .maybeSingle();

    if (existing) {
      alert = existing as Alert;
    } else {
      const { data: patientRow } = await sb
        .from('patient')
        .select('id, conditions, user_id')
        .eq('id', patientId)
        .maybeSingle();
      const { data: profileRow } = patientRow?.user_id
        ? await sb.from('user_profile').select('full_name').eq('id', patientRow.user_id).maybeSingle()
        : { data: null };

      const explanation = await generateAlertExplanation({
        patient_name: profileRow?.full_name ?? 'Patient',
        conditions: (patientRow?.conditions as string[]) ?? [],
        shap,
        forecast,
        current_bp: { systolic: latest.bp_systolic ?? 0, diastolic: latest.bp_diastolic ?? 0 },
        baseline_bp_systolic: baseline.bp_systolic_mean ?? 120,
        missed_doses: medLog.filter((m) => !m.taken).length,
        sleep_avg: sleepAvg
      });

      const { data: inserted } = await sb
        .from('alert')
        .insert({
          patient_id: patientId,
          level: level as Exclude<AlertLevel, 'stable'>,
          title: explanation.title,
          message: explanation.message,
          recommendation: explanation.recommendation,
          shap_breakdown: shap,
          confidence: forecast?.confidence ?? 0.7,
          forecast_72hr: forecast,
          message_source: explanation.source
        })
        .select()
        .single();

      alert = inserted as Alert | null;

      // Best-effort SMS/WhatsApp dispatch — must never block the response.
      // Skips low-severity levels and silently no-ops if Twilio isn't configured.
      if (alert) {
        dispatchAlertNotifications(patientId, alert).catch((err) => {
          console.error('[notify] dispatch failed', err);
        });
      }
    }
  }

  return {
    level,
    scores: { severity: bpAnomaly.severity, consecutiveDays, missedPct, sleepAvg },
    shap,
    forecast,
    alert,
    baseline
  };
}
