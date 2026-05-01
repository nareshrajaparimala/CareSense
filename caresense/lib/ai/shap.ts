import type { Baseline, ShapBreakdown, Vital } from '@/types/domain';

export type ShapInput = {
  current: Vital;
  baseline: Baseline;
  medLog: { taken: boolean }[];
  sleep_hours_avg: number;
};

// Compute normalized 0–1 contributions of vital, medication, and lifestyle factors.
export function computeShap(input: ShapInput): ShapBreakdown {
  const { current, baseline, medLog, sleep_hours_avg } = input;

  const bpStd = baseline.bp_systolic_std || 1;
  const bpMean = baseline.bp_systolic_mean ?? current.bp_systolic ?? 0;
  const sysDev = current.bp_systolic != null ? Math.abs(current.bp_systolic - bpMean) / bpStd : 0;
  const bp_score = Math.min(sysDev / 3, 1);

  const missedPct = medLog.length ? medLog.filter((m) => !m.taken).length / medLog.length : 0;
  const med_score = Math.min(missedPct * 2, 1);

  const sleepDeficit = Math.max(0, 7 - sleep_hours_avg) / 7;
  const lifestyle_score = Math.min(sleepDeficit, 1);

  const total = bp_score + med_score + lifestyle_score || 1;
  return {
    vital_change: bp_score / total,
    medication: med_score / total,
    lifestyle: lifestyle_score / total,
    raw: { bp_score, med_score, lifestyle_score }
  };
}
