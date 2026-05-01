// Tunable thresholds — single source of truth.

export const CRITICAL_BP_SYSTOLIC = 160;
export const CRITICAL_GLUCOSE = 250;

export const ANOMALY_THRESHOLD_STD = 1.5;
export const HIGH_SEVERITY_STD = 2.0;
export const CRITICAL_SEVERITY_STD = 2.5;

export const CONFIDENCE_ACT = 0.85;
export const CONFIDENCE_MONITOR = 0.70;

export const FORECAST_HORIZON_HOURS = 72;
export const FORECAST_HORIZON_DAYS = 3;
export const MIN_DATA_POINTS_FOR_FORECAST = 7;

export const HERO_PATIENT_NAME = 'Ramesh K.';

export const LEVEL_PRIORITY: Record<string, number> = {
  critical: 4,
  risk: 3,
  trend: 2,
  watch: 1,
  stable: 0
};

export const LEVEL_COLOR: Record<string, string> = {
  stable: 'bg-status-stable text-white',
  watch: 'bg-status-watch text-white',
  trend: 'bg-status-trend text-white',
  risk: 'bg-status-risk text-white',
  critical: 'bg-status-critical text-white'
};

export const LEVEL_LABEL: Record<string, string> = {
  stable: 'Stable',
  watch: 'Watch',
  trend: 'Trend',
  risk: 'Risk',
  critical: 'Critical'
};
