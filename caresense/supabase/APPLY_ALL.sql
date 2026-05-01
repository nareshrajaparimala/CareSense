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
-- CareSense Indexes
CREATE INDEX IF NOT EXISTS idx_vitals_patient_time
  ON public.vitals_log(patient_id, logged_at DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_patient_status
  ON public.alert(patient_id, status);

CREATE INDEX IF NOT EXISTS idx_alerts_patient_created
  ON public.alert(patient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_med_log_patient_time
  ON public.medication_log(patient_id, logged_at DESC);

CREATE INDEX IF NOT EXISTS idx_caregiver_link_caregiver
  ON public.caregiver_link(caregiver_id);

CREATE INDEX IF NOT EXISTS idx_caregiver_link_patient
  ON public.caregiver_link(patient_id);
-- CareSense RLS Policies
-- Helper: a doctor is any user_profile.role = 'doctor'
-- Service-role key bypasses RLS — used in API routes for writes that span users.

-- ============ user_profile ============
ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_profile_self_read ON public.user_profile
  FOR SELECT USING (id = auth.uid());

CREATE POLICY user_profile_doctor_read ON public.user_profile
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_profile up
            WHERE up.id = auth.uid() AND up.role = 'doctor')
  );

CREATE POLICY user_profile_self_insert ON public.user_profile
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY user_profile_self_update ON public.user_profile
  FOR UPDATE USING (id = auth.uid());

-- ============ patient ============
ALTER TABLE public.patient ENABLE ROW LEVEL SECURITY;

CREATE POLICY patient_self_read ON public.patient
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY patient_caregiver_read ON public.patient
  FOR SELECT USING (
    id IN (SELECT patient_id FROM public.caregiver_link WHERE caregiver_id = auth.uid())
  );

CREATE POLICY patient_doctor_read ON public.patient
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_profile up
            WHERE up.id = auth.uid() AND up.role = 'doctor')
  );

CREATE POLICY patient_self_write ON public.patient
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============ caregiver_link ============
ALTER TABLE public.caregiver_link ENABLE ROW LEVEL SECURITY;

CREATE POLICY caregiver_link_self_read ON public.caregiver_link
  FOR SELECT USING (
    caregiver_id = auth.uid()
    OR patient_id IN (SELECT id FROM public.patient WHERE user_id = auth.uid())
  );

CREATE POLICY caregiver_link_patient_insert ON public.caregiver_link
  FOR INSERT WITH CHECK (
    patient_id IN (SELECT id FROM public.patient WHERE user_id = auth.uid())
  );

CREATE POLICY caregiver_link_self_delete ON public.caregiver_link
  FOR DELETE USING (
    caregiver_id = auth.uid()
    OR patient_id IN (SELECT id FROM public.patient WHERE user_id = auth.uid())
  );

-- ============ vitals_log ============
ALTER TABLE public.vitals_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY vitals_patient_write ON public.vitals_log
  FOR INSERT WITH CHECK (
    patient_id IN (SELECT id FROM public.patient WHERE user_id = auth.uid())
  );

CREATE POLICY vitals_patient_read ON public.vitals_log
  FOR SELECT USING (
    patient_id IN (SELECT id FROM public.patient WHERE user_id = auth.uid())
  );

CREATE POLICY vitals_caregiver_read ON public.vitals_log
  FOR SELECT USING (
    patient_id IN (SELECT patient_id FROM public.caregiver_link WHERE caregiver_id = auth.uid())
  );

CREATE POLICY vitals_doctor_read ON public.vitals_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_profile up
            WHERE up.id = auth.uid() AND up.role = 'doctor')
  );

-- ============ medication ============
ALTER TABLE public.medication ENABLE ROW LEVEL SECURITY;

CREATE POLICY medication_patient_all ON public.medication
  FOR ALL USING (
    patient_id IN (SELECT id FROM public.patient WHERE user_id = auth.uid())
  ) WITH CHECK (
    patient_id IN (SELECT id FROM public.patient WHERE user_id = auth.uid())
  );

CREATE POLICY medication_caregiver_read ON public.medication
  FOR SELECT USING (
    patient_id IN (SELECT patient_id FROM public.caregiver_link WHERE caregiver_id = auth.uid())
  );

CREATE POLICY medication_doctor_read ON public.medication
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_profile up
            WHERE up.id = auth.uid() AND up.role = 'doctor')
  );

-- ============ medication_log ============
ALTER TABLE public.medication_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY medlog_patient_write ON public.medication_log
  FOR INSERT WITH CHECK (
    patient_id IN (SELECT id FROM public.patient WHERE user_id = auth.uid())
  );

CREATE POLICY medlog_patient_read ON public.medication_log
  FOR SELECT USING (
    patient_id IN (SELECT id FROM public.patient WHERE user_id = auth.uid())
  );

CREATE POLICY medlog_caregiver_read ON public.medication_log
  FOR SELECT USING (
    patient_id IN (SELECT patient_id FROM public.caregiver_link WHERE caregiver_id = auth.uid())
  );

CREATE POLICY medlog_doctor_read ON public.medication_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_profile up
            WHERE up.id = auth.uid() AND up.role = 'doctor')
  );

-- ============ patient_baseline ============
ALTER TABLE public.patient_baseline ENABLE ROW LEVEL SECURITY;

CREATE POLICY baseline_patient_read ON public.patient_baseline
  FOR SELECT USING (
    patient_id IN (SELECT id FROM public.patient WHERE user_id = auth.uid())
  );

CREATE POLICY baseline_caregiver_read ON public.patient_baseline
  FOR SELECT USING (
    patient_id IN (SELECT patient_id FROM public.caregiver_link WHERE caregiver_id = auth.uid())
  );

CREATE POLICY baseline_doctor_read ON public.patient_baseline
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_profile up
            WHERE up.id = auth.uid() AND up.role = 'doctor')
  );

-- ============ alert ============
ALTER TABLE public.alert ENABLE ROW LEVEL SECURITY;

CREATE POLICY alert_patient_read ON public.alert
  FOR SELECT USING (
    patient_id IN (SELECT id FROM public.patient WHERE user_id = auth.uid())
  );

CREATE POLICY alert_caregiver_read ON public.alert
  FOR SELECT USING (
    patient_id IN (SELECT patient_id FROM public.caregiver_link WHERE caregiver_id = auth.uid())
  );

CREATE POLICY alert_doctor_read ON public.alert
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_profile up
            WHERE up.id = auth.uid() AND up.role = 'doctor')
  );

CREATE POLICY alert_doctor_update ON public.alert
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_profile up
            WHERE up.id = auth.uid() AND up.role = 'doctor')
  );

-- ============ hospital_mock (public read) ============
ALTER TABLE public.hospital_mock ENABLE ROW LEVEL SECURITY;

CREATE POLICY hospital_public_read ON public.hospital_mock
  FOR SELECT USING (TRUE);

-- ============ emergency_brief ============
ALTER TABLE public.emergency_brief ENABLE ROW LEVEL SECURITY;

CREATE POLICY brief_patient_read ON public.emergency_brief
  FOR SELECT USING (
    patient_id IN (SELECT id FROM public.patient WHERE user_id = auth.uid())
  );

CREATE POLICY brief_caregiver_read ON public.emergency_brief
  FOR SELECT USING (
    patient_id IN (SELECT patient_id FROM public.caregiver_link WHERE caregiver_id = auth.uid())
  );

CREATE POLICY brief_doctor_read ON public.emergency_brief
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_profile up
            WHERE up.id = auth.uid() AND up.role = 'doctor')
  );
-- Seeds 8 Bengaluru hospitals into hospital_mock.
-- Run via Supabase SQL editor OR `supabase db reset` (loads automatically).
-- Patient/vitals/medication seeding is in scripts/seed.ts.

INSERT INTO public.hospital_mock (name, specialty, address, lat, lng, beds_available, beds_total, rating, phone) VALUES
  ('Apollo Hospital Whitefield',     ARRAY['cardiology','emergency','general'],   'Whitefield, Bengaluru',          12.9698, 77.7500, 4,  120, 4.6, '+91-80-12345001'),
  ('Manipal Hospital Whitefield',    ARRAY['cardiology','endocrinology','emergency'], 'Whitefield, Bengaluru',     12.9784, 77.7395, 7,  150, 4.5, '+91-80-12345002'),
  ('Columbia Asia Whitefield',       ARRAY['general','emergency'],                'Whitefield, Bengaluru',          12.9991, 77.7470, 2,   80, 4.3, '+91-80-12345003'),
  ('Fortis Cunningham Road',         ARRAY['cardiology','neurology','emergency'], 'Cunningham Road, Bengaluru',     12.9876, 77.5933, 5,  200, 4.4, '+91-80-12345004'),
  ('Narayana Health City',           ARRAY['cardiology','nephrology','emergency'], 'Bommasandra, Bengaluru',        12.8024, 77.6864, 12, 250, 4.7, '+91-80-12345005'),
  ('Sakra World Hospital',           ARRAY['endocrinology','general','emergency'], 'Marathahalli, Bengaluru',       12.9489, 77.7097, 3,  100, 4.4, '+91-80-12345006'),
  ('Sparsh Hospital Yeshwanthpur',   ARRAY['orthopedics','emergency','general'],  'Yeshwanthpur, Bengaluru',        13.0287, 77.5410, 6,   90, 4.2, '+91-80-12345007'),
  ('BGS Gleneagles Global',          ARRAY['cardiology','nephrology','emergency'], 'Kengeri, Bengaluru',            12.9082, 77.4842, 8,  180, 4.5, '+91-80-12345008');
