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

// Compute a Baseline row from a list of vitals.
// Spec: window of last 21 days. To avoid the well-known "rolling-window pollution"
// where a recent spike inflates the baseline std and masks itself as normal, we
// EXCLUDE the most recent 3 days from the baseline once enough history exists.
// This makes baseline = "what your normal was last week" so today's spike
// shows up as a real anomaly, not a self-validating one.
export const BASELINE_WINDOW_DAYS = 21;
export const BASELINE_EXCLUDE_RECENT_DAYS = 3;
const BASELINE_MIN_FOR_EXCLUSION = 8; // need this many entries before we can afford to drop 3.

export function computeBaseline(patient_id: string, vitals: Vital[]): Baseline & { computed_at?: string } {
  const sorted = vitals.slice().sort((a, b) => +new Date(b.logged_at) - +new Date(a.logged_at));
  const windowed = (() => {
    if (sorted.length === 0) return sorted;
    const newest = +new Date(sorted[0].logged_at);
    const cutoff = newest - BASELINE_WINDOW_DAYS * 86400_000;
    return sorted.filter((v) => +new Date(v.logged_at) >= cutoff);
  })();
  // Drop most recent N days when we have headroom — keeps baseline = "personal normal pre-spike".
  const stableWindow = (() => {
    if (windowed.length < BASELINE_MIN_FOR_EXCLUSION) return windowed;
    const newest = +new Date(windowed[0].logged_at);
    const excludeCutoff = newest - BASELINE_EXCLUDE_RECENT_DAYS * 86400_000;
    const trimmed = windowed.filter((v) => +new Date(v.logged_at) < excludeCutoff);
    // Don't trim so aggressively we lose statistical power.
    return trimmed.length >= 5 ? trimmed : windowed;
  })();
  const source = stableWindow.length >= 2 ? stableWindow : vitals;
  const sys = source.map((v) => v.bp_systolic).filter((n): n is number => n != null);
  const dia = source.map((v) => v.bp_diastolic).filter((n): n is number => n != null);
  const glu = source.map((v) => v.glucose_mgdl).filter((n): n is number => n != null);
  const hr = source.map((v) => v.heart_rate).filter((n): n is number => n != null);
  // Floor std at 1.0 — a pathological zero-variance window would otherwise
  // make detectAnomaly() short-circuit forever.
  const safeStd = (arr: number[]) => (arr.length >= 2 ? Math.max(std(arr), 1) : null);
  return {
    patient_id,
    bp_systolic_mean: sys.length ? mean(sys) : null,
    bp_systolic_std: safeStd(sys),
    bp_diastolic_mean: dia.length ? mean(dia) : null,
    bp_diastolic_std: safeStd(dia),
    glucose_mean: glu.length ? mean(glu) : null,
    glucose_std: safeStd(glu),
    heart_rate_mean: hr.length ? mean(hr) : null,
    heart_rate_std: safeStd(hr),
    data_points_count: source.length
  };
}
