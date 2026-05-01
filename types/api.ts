// Standard API envelope used by every route.
export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; error: string };
export type ApiResp<T> = ApiOk<T> | ApiErr;

import type { Alert, Forecast, Hospital, EmergencyBrief, Vital, AlertLevel, ShapBreakdown, Baseline } from './domain';

export type LogVitalsBody = {
  patient_id: string;
  bp_systolic?: number;
  bp_diastolic?: number;
  glucose_mgdl?: number;
  heart_rate?: number;
  spo2?: number;
  weight_kg?: number;
  sleep_hours?: number;
  activity_level?: 'low' | 'medium' | 'high';
  diet_flag?: 'normal' | 'high_carb' | 'high_sodium';
  mood?: number;
  notes?: string;
};
export type LogVitalsResp = { vital: Vital; level: AlertLevel; alert: Alert | null };

export type AnalyzeBody = { patient_id: string };
export type AnalyzeResp = {
  level: AlertLevel;
  scores: { severity: string; consecutiveDays: number; missedPct: number; sleepAvg: number };
  shap: ShapBreakdown | null;
  forecast: Forecast | null;
  alert: Alert | null;
  baseline?: Baseline | null;
  insufficientData?: { current: number; required: number };
};

export type ForecastResp = Forecast | null;

export type AlertCreateBody = {
  patient_id: string;
  level: Exclude<AlertLevel, 'stable'>;
  shap: ShapBreakdown;
  forecast: Forecast | null;
  context: {
    patient_name: string;
    conditions: string[];
    current_bp: { systolic: number; diastolic: number };
    baseline_bp_systolic: number;
    missed_doses: number;
    sleep_avg: number;
  };
};

export type HospitalsResp = Hospital[];
export type EmergencyBriefResp = EmergencyBrief;
