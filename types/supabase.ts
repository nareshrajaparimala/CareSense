// PLACEHOLDER — replace by running:
//   npx supabase login
//   npx supabase link --project-ref <ref>
//   npm run gen:types
// This file is hand-written to match the migrations until then.

export type Database = {
  public: {
    Tables: {
      user_profile: {
        Row: { id: string; full_name: string; role: 'patient' | 'caregiver' | 'doctor'; phone: string | null; created_at: string };
        Insert: { id: string; full_name: string; role: 'patient' | 'caregiver' | 'doctor'; phone?: string | null };
        Update: Partial<{ full_name: string; role: 'patient' | 'caregiver' | 'doctor'; phone: string | null }>;
      };
      patient: {
        Row: {
          id: string;
          user_id: string | null;
          age: number;
          sex: 'M' | 'F' | 'Other' | null;
          conditions: string[];
          allergies: string[] | null;
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          location_lat: number | null;
          location_lng: number | null;
          address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          age: number;
          sex?: 'M' | 'F' | 'Other' | null;
          conditions?: string[];
          allergies?: string[] | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          location_lat?: number | null;
          location_lng?: number | null;
          address?: string | null;
        };
        Update: Partial<{
          age: number;
          sex: 'M' | 'F' | 'Other' | null;
          conditions: string[];
          allergies: string[] | null;
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          location_lat: number | null;
          location_lng: number | null;
          address: string | null;
        }>;
      };
      caregiver_link: {
        Row: { id: string; caregiver_id: string; patient_id: string; relationship: string | null; created_at: string };
        Insert: { caregiver_id: string; patient_id: string; relationship?: string | null };
        Update: Partial<{ relationship: string | null }>;
      };
      vitals_log: {
        Row: {
          id: string; patient_id: string; logged_at: string;
          bp_systolic: number | null; bp_diastolic: number | null;
          glucose_mgdl: number | null; heart_rate: number | null;
          spo2: number | null; weight_kg: number | null;
          sleep_hours: number | null;
          activity_level: 'low' | 'medium' | 'high' | null;
          diet_flag: 'normal' | 'high_carb' | 'high_sodium' | null;
          mood: number | null; notes: string | null;
        };
        Insert: Partial<{
          id: string; logged_at: string;
          bp_systolic: number | null; bp_diastolic: number | null;
          glucose_mgdl: number | null; heart_rate: number | null;
          spo2: number | null; weight_kg: number | null;
          sleep_hours: number | null;
          activity_level: 'low' | 'medium' | 'high' | null;
          diet_flag: 'normal' | 'high_carb' | 'high_sodium' | null;
          mood: number | null; notes: string | null;
        }> & { patient_id: string };
        Update: Partial<{
          bp_systolic: number | null; bp_diastolic: number | null;
          glucose_mgdl: number | null; heart_rate: number | null;
          spo2: number | null; weight_kg: number | null;
          sleep_hours: number | null;
          activity_level: 'low' | 'medium' | 'high' | null;
          diet_flag: 'normal' | 'high_carb' | 'high_sodium' | null;
          mood: number | null; notes: string | null;
        }>;
      };
      medication: {
        Row: { id: string; patient_id: string; name: string; dosage: string | null; frequency: string | null; active: boolean; created_at: string };
        Insert: { patient_id: string; name: string; dosage?: string | null; frequency?: string | null; active?: boolean };
        Update: Partial<{ name: string; dosage: string | null; frequency: string | null; active: boolean }>;
      };
      medication_log: {
        Row: { id: string; medication_id: string; patient_id: string; taken: boolean; logged_at: string; scheduled_time: string | null };
        Insert: { medication_id: string; patient_id: string; taken: boolean; scheduled_time?: string | null; logged_at?: string };
        Update: Partial<{ taken: boolean }>;
      };
      patient_baseline: {
        Row: {
          patient_id: string;
          bp_systolic_mean: number | null; bp_systolic_std: number | null;
          bp_diastolic_mean: number | null; bp_diastolic_std: number | null;
          glucose_mean: number | null; glucose_std: number | null;
          heart_rate_mean: number | null; heart_rate_std: number | null;
          computed_at: string; data_points_count: number | null;
        };
        Insert: {
          patient_id: string;
          bp_systolic_mean?: number | null; bp_systolic_std?: number | null;
          bp_diastolic_mean?: number | null; bp_diastolic_std?: number | null;
          glucose_mean?: number | null; glucose_std?: number | null;
          heart_rate_mean?: number | null; heart_rate_std?: number | null;
          data_points_count?: number | null;
        };
        Update: Partial<{
          bp_systolic_mean: number | null; bp_systolic_std: number | null;
          bp_diastolic_mean: number | null; bp_diastolic_std: number | null;
          glucose_mean: number | null; glucose_std: number | null;
          heart_rate_mean: number | null; heart_rate_std: number | null;
          data_points_count: number | null;
        }>;
      };
      alert: {
        Row: {
          id: string; patient_id: string;
          level: 'watch' | 'trend' | 'risk' | 'critical';
          title: string; message: string; recommendation: string | null;
          shap_breakdown: any; confidence: number | null;
          forecast_72hr: any;
          message_source: 'llm' | 'fallback';
          status: 'open' | 'acknowledged' | 'resolved';
          acknowledged_by: string | null; acknowledged_at: string | null;
          created_at: string;
        };
        Insert: {
          patient_id: string;
          level: 'watch' | 'trend' | 'risk' | 'critical';
          title: string; message: string; recommendation?: string | null;
          shap_breakdown?: any; confidence?: number | null;
          forecast_72hr?: any;
          message_source?: 'llm' | 'fallback';
          status?: 'open' | 'acknowledged' | 'resolved';
        };
        Update: Partial<{
          status: 'open' | 'acknowledged' | 'resolved';
          acknowledged_by: string | null; acknowledged_at: string | null;
        }>;
      };
      hospital_mock: {
        Row: {
          id: string; name: string; specialty: string[]; address: string | null;
          lat: number | null; lng: number | null;
          beds_available: number; beds_total: number;
          rating: number | null; phone: string | null;
        };
        Insert: {
          name: string; specialty?: string[]; address?: string | null;
          lat?: number | null; lng?: number | null;
          beds_available?: number; beds_total?: number;
          rating?: number | null; phone?: string | null;
        };
        Update: Partial<{
          name: string; specialty: string[]; address: string | null;
          lat: number | null; lng: number | null;
          beds_available: number; beds_total: number;
          rating: number | null; phone: string | null;
        }>;
      };
      emergency_brief: {
        Row: {
          id: string; alert_id: string | null; patient_id: string;
          brief_data: any; destination_hospital_id: string | null;
          sent_at: string | null; created_at: string;
        };
        Insert: {
          alert_id?: string | null; patient_id: string;
          brief_data?: any; destination_hospital_id?: string | null;
          sent_at?: string | null;
        };
        Update: Partial<{
          brief_data: any; destination_hospital_id: string | null; sent_at: string | null;
        }>;
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
};
