import {
  ANOMALY_THRESHOLD_STD,
  HIGH_SEVERITY_STD,
  CRITICAL_SEVERITY_STD
} from '@/lib/constants';
import type { Severity, Vital, Baseline } from '@/types/domain';

export type AnomalyResult = {
  isAnomaly: boolean;
  deviation: number;
  severity: Severity;
};

export function detectAnomaly(
  current: number | null,
  mean: number | null,
  std: number | null,
  threshold: number = ANOMALY_THRESHOLD_STD
): AnomalyResult {
  if (current == null || mean == null || !std || std === 0) {
    return { isAnomaly: false, deviation: 0, severity: 'normal' };
  }
  const dev = (current - mean) / std;
  const abs = Math.abs(dev);
  let severity: Severity = 'normal';
  if (abs > CRITICAL_SEVERITY_STD) severity = 'critical';
  else if (abs > HIGH_SEVERITY_STD) severity = 'high';
  else if (abs > ANOMALY_THRESHOLD_STD) severity = 'moderate';
  return { isAnomaly: abs > threshold, deviation: dev, severity };
}

// Count trailing days where bp_systolic deviates above baseline (most-recent-first input).
export function countConsecutiveDeviations(
  vitalsDescByTime: Vital[],
  baseline: Baseline,
  threshold: number = ANOMALY_THRESHOLD_STD
): number {
  if (!baseline.bp_systolic_mean || !baseline.bp_systolic_std) return 0;
  let count = 0;
  for (const v of vitalsDescByTime) {
    if (v.bp_systolic == null) break;
    const dev = (v.bp_systolic - baseline.bp_systolic_mean) / baseline.bp_systolic_std;
    if (dev > threshold) count++;
    else break;
  }
  return count;
}

export function mean(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

export function std(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const v = arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(v);
}

// Compute a Baseline row from a list of vitals (chronological order doesn't matter).
export function computeBaseline(patient_id: string, vitals: Vital[]): Baseline & { computed_at?: string } {
  const sys = vitals.map((v) => v.bp_systolic).filter((n): n is number => n != null);
  const dia = vitals.map((v) => v.bp_diastolic).filter((n): n is number => n != null);
  const glu = vitals.map((v) => v.glucose_mgdl).filter((n): n is number => n != null);
  const hr = vitals.map((v) => v.heart_rate).filter((n): n is number => n != null);
  return {
    patient_id,
    bp_systolic_mean: sys.length ? mean(sys) : null,
    bp_systolic_std: sys.length ? std(sys) : null,
    bp_diastolic_mean: dia.length ? mean(dia) : null,
    bp_diastolic_std: dia.length ? std(dia) : null,
    glucose_mean: glu.length ? mean(glu) : null,
    glucose_std: glu.length ? std(glu) : null,
    heart_rate_mean: hr.length ? mean(hr) : null,
    heart_rate_std: hr.length ? std(hr) : null,
    data_points_count: vitals.length
  };
}
