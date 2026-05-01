import {
  CRITICAL_BP_SYSTOLIC,
  FORECAST_HORIZON_DAYS,
  MIN_DATA_POINTS_FOR_FORECAST
} from '@/lib/constants';
import type { Forecast } from '@/types/domain';

// Linear regression on a series + 95% interval + days-to-critical estimate.
export function forecast72hr(
  history: number[],
  criticalThreshold: number = CRITICAL_BP_SYSTOLIC
): Forecast | null {
  const n = history.length;
  if (n < MIN_DATA_POINTS_FOR_FORECAST) return null;

  const x = history.map((_, i) => i);
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = history.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((a, xi, i) => a + xi * history[i], 0);
  const sumX2 = x.reduce((a, xi) => a + xi * xi, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return null;

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  const projDay = n + FORECAST_HORIZON_DAYS;
  const predicted = intercept + slope * projDay;

  const residuals = history.map((y, i) => y - (intercept + slope * i));
  const stdRes = Math.sqrt(
    residuals.reduce((a, b) => a + b * b, 0) / Math.max(n - 2, 1)
  );

  const days_to_critical =
    slope > 0
      ? Math.min(30, Math.max(0, (criticalThreshold - intercept - slope * n) / slope))
      : 30;

  const confidence = Math.min(
    0.95,
    Math.max(0.3, (n / 30) * Math.min(1, Math.abs(slope) * 10))
  );

  return {
    predicted,
    interval_low: predicted - 1.96 * stdRes,
    interval_high: predicted + 1.96 * stdRes,
    days_to_critical,
    confidence
  };
}
