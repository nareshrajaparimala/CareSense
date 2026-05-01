// Domain types — derived/named views over Supabase rows.

export type Role = 'patient' | 'caregiver' | 'doctor';
export type AlertLevel = 'stable' | 'watch' | 'trend' | 'risk' | 'critical';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved';
export type Severity = 'normal' | 'moderate' | 'high' | 'critical';
export type ActivityLevel = 'low' | 'medium' | 'high';
export type DietFlag = 'normal' | 'high_carb' | 'high_sodium';

export type Vital = {
  id: string;
  patient_id: string;
  logged_at: string;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  glucose_mgdl: number | null;
  heart_rate: number | null;
  spo2: number | null;
  weight_kg: number | null;
  sleep_hours: number | null;
  activity_level: ActivityLevel | null;
  diet_flag: DietFlag | null;
  mood: number | null;
  notes: string | null;
};

export type Baseline = {
  patient_id: string;
  bp_systolic_mean: number | null;
  bp_systolic_std: number | null;
  bp_diastolic_mean: number | null;
  bp_diastolic_std: number | null;
  glucose_mean: number | null;
  glucose_std: number | null;
  heart_rate_mean: number | null;
  heart_rate_std: number | null;
  data_points_count: number | null;
};

export type ShapBreakdown = {
  vital_change: number;
  medication: number;
  lifestyle: number;
  raw?: { bp_score: number; med_score: number; lifestyle_score: number };
};

export type Forecast = {
  predicted: number;
  interval_low: number;
  interval_high: number;
  days_to_critical: number;
  confidence: number;
};

export type Alert = {
  id: string;
  patient_id: string;
  level: Exclude<AlertLevel, 'stable'>;
  title: string;
  message: string;
  recommendation: string | null;
  shap_breakdown: ShapBreakdown | null;
  confidence: number | null;
  forecast_72hr: Forecast | null;
  message_source: 'llm' | 'fallback';
  status: AlertStatus;
  created_at: string;
};

export type Hospital = {
  id: string;
  name: string;
  specialty: string[];
  address: string | null;
  lat: number;
  lng: number;
  beds_available: number;
  beds_total: number;
  rating: number | null;
  phone: string | null;
  distance_km?: number;
};

export type EmergencyBrief = {
  patient: {
    id: string;
    name: string;
    age: number;
    sex: string;
    conditions: string[];
    allergies: string[];
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
  };
  vitals_now: {
    bp_systolic: number | null;
    bp_diastolic: number | null;
    glucose_mgdl: number | null;
    heart_rate: number | null;
    spo2: number | null;
    logged_at: string;
  };
  medications: Array<{
    name: string;
    dosage: string | null;
    last_taken: string | null;
    missed_count_7d: number;
  }>;
  trend_7d: Array<{ logged_at: string; bp_systolic: number | null; glucose_mgdl: number | null }>;
  predicted_event: { type: string; confidence: number } | null;
  location: { lat: number | null; lng: number | null; address: string | null };
  destination: Hospital | null;
  hospitals: Hospital[];
};
