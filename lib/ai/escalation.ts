import type { AlertLevel, Severity } from '@/types/domain';
import { CRITICAL_BP_SYSTOLIC } from '@/lib/constants';

export type LevelInput = {
  severity: Severity;
  consecutiveDays: number;
  forecastConfidence: number;
  daysToCritical: number;
  // Optional absolute-threshold inputs — give a safety net regardless of baseline.
  currentBpSystolic?: number | null;
  currentGlucose?: number | null;
  currentSpo2?: number | null;
};

// Absolute thresholds (independent of personal baseline).
// Used as a floor so an obviously bad reading never silently reads as "stable".
function absoluteFloor(p: LevelInput): AlertLevel {
  const bp = p.currentBpSystolic ?? null;
  const gl = p.currentGlucose ?? null;
  const sp = p.currentSpo2 ?? null;
  if ((bp != null && bp >= 180) || (gl != null && gl >= 300) || (sp != null && sp < 90)) return 'critical';
  if ((bp != null && bp >= CRITICAL_BP_SYSTOLIC) || (gl != null && gl >= 250) || (sp != null && sp < 92)) return 'risk';
  if ((bp != null && bp >= 140) || (gl != null && gl >= 200) || (sp != null && sp < 95)) return 'watch';
  return 'stable';
}

const ORDER: AlertLevel[] = ['stable', 'watch', 'trend', 'risk', 'critical'];
const rank = (l: AlertLevel) => ORDER.indexOf(l);
const max = (a: AlertLevel, b: AlertLevel) => (rank(a) >= rank(b) ? a : b);

export function decideLevel(p: LevelInput): AlertLevel {
  let level: AlertLevel = 'stable';
  if (p.severity === 'critical') level = 'critical';
  else if (p.daysToCritical < 1 && p.forecastConfidence > 0.7) level = 'critical';
  else if (p.forecastConfidence > 0.75 && p.daysToCritical < 3) level = 'risk';
  else if (p.severity === 'high' && p.consecutiveDays >= 2) level = 'risk';
  else if (p.consecutiveDays >= 3) level = 'trend';
  else if (p.severity !== 'normal') level = 'watch';

  // Promote with absolute thresholds.
  return max(level, absoluteFloor(p));
}
