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
