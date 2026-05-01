-- CareSense Initial Schema
-- Tables: user_profile, patient, caregiver_link, vitals_log, medication, medication_log,
--         patient_baseline, alert, hospital_mock, emergency_brief

-- 1. User profile (extends auth.users)
CREATE TABLE IF NOT EXISTS public.user_profile (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT CHECK (role IN ('patient', 'caregiver', 'doctor')) NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Patient (clinical profile)
CREATE TABLE IF NOT EXISTS public.patient (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES public.user_profile(id) ON DELETE CASCADE,
  age INT NOT NULL,
  sex TEXT CHECK (sex IN ('M', 'F', 'Other')),
  conditions TEXT[] NOT NULL DEFAULT '{}',
  allergies TEXT[] DEFAULT '{}',
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  location_lat DECIMAL,
  location_lng DECIMAL,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Caregiver-Patient linking
CREATE TABLE IF NOT EXISTS public.caregiver_link (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caregiver_id UUID NOT NULL REFERENCES public.user_profile(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patient(id) ON DELETE CASCADE,
  relationship TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(caregiver_id, patient_id)
);

-- 4. Vitals log (time-series)
CREATE TABLE IF NOT EXISTS public.vitals_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patient(id) ON DELETE CASCADE,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  bp_systolic INT,
  bp_diastolic INT,
  glucose_mgdl INT,
  heart_rate INT,
  spo2 INT,
  weight_kg DECIMAL,
  sleep_hours DECIMAL,
  activity_level TEXT CHECK (activity_level IN ('low', 'medium', 'high')),
  diet_flag TEXT CHECK (diet_flag IN ('normal', 'high_carb', 'high_sodium')),
  mood INT CHECK (mood BETWEEN 1 AND 5),
  notes TEXT
);

-- 5. Medication
CREATE TABLE IF NOT EXISTS public.medication (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patient(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Medication adherence log
CREATE TABLE IF NOT EXISTS public.medication_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id UUID NOT NULL REFERENCES public.medication(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patient(id) ON DELETE CASCADE,
  taken BOOLEAN NOT NULL,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_time TIMESTAMPTZ
);

-- 7. Patient baseline (computed)
CREATE TABLE IF NOT EXISTS public.patient_baseline (
  patient_id UUID PRIMARY KEY REFERENCES public.patient(id) ON DELETE CASCADE,
  bp_systolic_mean DECIMAL,
  bp_systolic_std DECIMAL,
  bp_diastolic_mean DECIMAL,
  bp_diastolic_std DECIMAL,
  glucose_mean DECIMAL,
  glucose_std DECIMAL,
  heart_rate_mean DECIMAL,
  heart_rate_std DECIMAL,
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  data_points_count INT
);

-- 8. Alert
CREATE TABLE IF NOT EXISTS public.alert (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patient(id) ON DELETE CASCADE,
  level TEXT CHECK (level IN ('watch', 'trend', 'risk', 'critical')) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  recommendation TEXT,
  shap_breakdown JSONB,
  confidence DECIMAL,
  forecast_72hr JSONB,
  message_source TEXT DEFAULT 'llm' CHECK (message_source IN ('llm', 'fallback')),
  status TEXT CHECK (status IN ('open', 'acknowledged', 'resolved')) DEFAULT 'open',
  acknowledged_by UUID REFERENCES public.user_profile(id),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Hospital (mock data, public read)
CREATE TABLE IF NOT EXISTS public.hospital_mock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  specialty TEXT[] DEFAULT '{}',
  address TEXT,
  lat DECIMAL,
  lng DECIMAL,
  beds_available INT DEFAULT 0,
  beds_total INT DEFAULT 0,
  rating DECIMAL,
  phone TEXT
);

-- 10. Emergency brief
CREATE TABLE IF NOT EXISTS public.emergency_brief (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID REFERENCES public.alert(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patient(id) ON DELETE CASCADE,
  brief_data JSONB,
  destination_hospital_id UUID REFERENCES public.hospital_mock(id),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
