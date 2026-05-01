import type { Baseline, ShapBreakdown, Vital } from '@/types/domain';

export type ShapInput = {
  current: Vital;
  baseline: Baseline;
  medLog: { taken: boolean }[];
  sleep_hours_avg: number;
  // Last 7 vitals (most recent first) — used to derive symptom score (mood inverse) + BP slope.
  recent?: Vital[];
};

// Compute normalized 0–1 contributions of vital, medication, and symptom factors.
// Each factor includes a `detail` string for explainable UI.
export function computeShap(input: ShapInput): ShapBreakdown {
  const { current, baseline, medLog, sleep_hours_avg, recent = [] } = input;

  // ── Vital change: current BP deviation from personal baseline + recent slope.
  const bpStd = baseline.bp_systolic_std || 1;
  const bpMean = baseline.bp_systolic_mean ?? current.bp_systolic ?? 0;
  const sysDev =
    current.bp_systolic != null ? Math.abs(current.bp_systolic - bpMean) / bpStd : 0;
  const bp_score = Math.min(sysDev / 3, 1);

  // Slope across last 7 entries (recent[0] = latest)
  const bpSeries = recent
    .slice()
    .reverse()
    .map((v) => v.bp_systolic)
    .filter((n): n is number => n != null);
  const bpSlope = bpSeries.length >= 2 ? linearSlope(bpSeries) : 0;

  let bp_detail: string;
  if (current.bp_systolic == null) {
    bp_detail = 'No recent BP reading';
  } else {
    const dirArrow = current.bp_systolic > bpMean ? '↑' : current.bp_systolic < bpMean ? '↓' : '·';
    const slopeStr = bpSlope > 0.2 ? ` · rising +${bpSlope.toFixed(1)} mmHg/day` :
                     bpSlope < -0.2 ? ` · falling ${bpSlope.toFixed(1)} mmHg/day` : '';
    bp_detail = `BP ${current.bp_systolic} ${dirArrow} vs baseline ${bpMean.toFixed(0)} (±${(baseline.bp_systolic_std ?? 0).toFixed(1)})${slopeStr}`;
  }

  // ── Medication adherence
  const totalDoses = medLog.length;
  const missedDoses = medLog.filter((m) => !m.taken).length;
  const missedPct = totalDoses ? missedDoses / totalDoses : 0;
  const med_score = totalDoses === 0 ? 0 : Math.min(missedPct * 2, 1);
  const med_detail = totalDoses === 0
    ? 'No medication logged this week'
    : missedDoses === 0
      ? `On track — ${totalDoses}/${totalDoses} doses taken`
      : `Missed ${missedDoses} of last ${totalDoses} doses`;
  const med_available = totalDoses > 0;

  // ── Symptom factor: derived from mood (1 worst – 5 best) across last 7 entries.
  const moods = recent.map((v) => v.mood).filter((n): n is number => n != null);
  const moodAvg = moods.length ? moods.reduce((a, b) => a + b, 0) / moods.length : null;
  // Symptom score 0–1: (5 - moodAvg) / 4. Sleep deficit also contributes when no mood.
  const sleepDeficit = Math.max(0, 7 - sleep_hours_avg) / 7;
  const moodSymptom = moodAvg != null ? Math.max(0, (5 - moodAvg) / 4) : 0;
  const symptom_score = Math.min(1, Math.max(moodSymptom, sleepDeficit * 0.6));
  const symptom_detail = moodAvg != null
    ? `Mood avg ${moodAvg.toFixed(1)}/5${sleep_hours_avg < 6.5 ? ` · sleep ${sleep_hours_avg.toFixed(1)}h` : ''}`
    : `Sleep avg ${sleep_hours_avg.toFixed(1)}h${sleepDeficit > 0.2 ? ' (deficit)' : ''}`;

  // Normalize across factors (skip med if no data so it doesn't suppress others).
  const totalRaw = bp_score + (med_available ? med_score : 0) + symptom_score;
  const total = totalRaw || 1;
  const vital_change = bp_score / total;
  const medication = med_available ? med_score / total : 0;
  const lifestyle = symptom_score / total;

  return {
    vital_change,
    medication,
    lifestyle,
    raw: { bp_score, med_score, lifestyle_score: symptom_score },
    details: {
      vital_change: bp_detail,
      medication: med_detail,
      lifestyle: symptom_detail
    },
    available: {
      vital_change: current.bp_systolic != null,
      medication: med_available,
      lifestyle: moods.length > 0 || recent.length > 0
    }
  };
}

function linearSlope(series: number[]): number {
  const n = series.length;
  const x = series.map((_, i) => i);
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = series.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((a, xi, i) => a + xi * series[i], 0);
  const sumX2 = x.reduce((a, xi) => a + xi * xi, 0);
  const denom = n * sumX2 - sumX * sumX;
  return denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
}
