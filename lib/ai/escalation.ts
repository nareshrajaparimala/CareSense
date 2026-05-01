import type { AlertLevel, Severity } from '@/types/domain';

export type LevelInput = {
  severity: Severity;
  consecutiveDays: number;
  forecastConfidence: number;
  daysToCritical: number;
};

export function decideLevel(p: LevelInput): AlertLevel {
  if (p.severity === 'critical') return 'critical';
  if (p.daysToCritical < 1 && p.forecastConfidence > 0.7) return 'critical';
  if (p.forecastConfidence > 0.75 && p.daysToCritical < 3) return 'risk';
  if (p.severity === 'high' && p.consecutiveDays >= 2) return 'risk';
  if (p.consecutiveDays >= 3) return 'trend';
  if (p.severity !== 'normal') return 'watch';
  return 'stable';
}
