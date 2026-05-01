import {
  CRITICAL_BP_SYSTOLIC,
  FORECAST_HORIZON_DAYS
} from '@/lib/constants';
import type { Forecast } from '@/types/domain';

// Last N entries used for short-term trend regression.
const FORECAST_WINDOW = 7;
const MIN_FORECAST_POINTS = 3;

// Linear regression on a series + 95% interval + days-to-critical estimate.
// Confidence = R² (coefficient of determination). Uses the last 7 entries by default.
export function forecast72hr(
  history: number[],
  criticalThreshold: number = CRITICAL_BP_SYSTOLIC
): Forecast | null {
  const series = history.slice(-FORECAST_WINDOW);
  const n = series.length;
  if (n < MIN_FORECAST_POINTS) return null;

  const x = series.map((_, i) => i);
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = series.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((a, xi, i) => a + xi * series[i], 0);
  const sumX2 = x.reduce((a, xi) => a + xi * xi, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return null;

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  const meanY = sumY / n;

  const projDay = n - 1 + FORECAST_HORIZON_DAYS;
  const predicted = intercept + slope * projDay;

  // Residuals + R²
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const yi = series[i];
    const yhat = intercept + slope * i;
    ssRes += (yi - yhat) ** 2;
    ssTot += (yi - meanY) ** 2;
  }
  const rSquared = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);
  const stdRes = Math.sqrt(ssRes / Math.max(n - 2, 1));

  const days_to_critical =
    slope > 0
      ? Math.min(30, Math.max(0, (criticalThreshold - intercept - slope * (n - 1)) / slope))
      : 30;

  // Confidence is R² gated by sample size — under 5 points, cap at 0.6.
  const sizeFactor = Math.min(1, n / FORECAST_WINDOW);
  const confidence = Math.min(0.99, Math.max(0.1, rSquared * sizeFactor));

  return {
    predicted,
    interval_low: predicted - 1.96 * stdRes,
    interval_high: predicted + 1.96 * stdRes,
    days_to_critical,
    confidence
  };
}

export { FORECAST_WINDOW, MIN_FORECAST_POINTS };
