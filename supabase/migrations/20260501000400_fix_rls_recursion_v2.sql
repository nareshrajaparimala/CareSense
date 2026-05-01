-- Fix #2: "infinite recursion detected in policy for relation patient"
--
-- Cause: cross-table cycle between `patient` and `caregiver_link` policies.
--   patient_caregiver_read: id IN (SELECT patient_id FROM caregiver_link WHERE caregiver_id = auth.uid())
--   caregiver_link_self_read: ... OR patient_id IN (SELECT id FROM patient WHERE user_id = auth.uid())
-- Each subquery re-evaluates the other table's policies → loop.
--
-- Fix: helper SECURITY DEFINER functions that read these tables with the
-- function owner's privileges (bypass RLS), so policies don't recurse.

-- ===== helper functions =====

-- Returns patient.id rows for the calling user (the user is the patient).
CREATE OR REPLACE FUNCTION public.my_patient_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.patient WHERE user_id = auth.uid();
$$;

-- Returns patient.id rows the calling user is linked to as a caregiver.
CREATE OR REPLACE FUNCTION public.my_caregiver_patient_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT patient_id FROM public.caregiver_link WHERE caregiver_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.my_patient_ids() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.my_caregiver_patient_ids() TO anon, authenticated;

-- ===== patient =====
DROP POLICY IF EXISTS patient_self_read ON public.patient;
CREATE POLICY patient_self_read ON public.patient
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS patient_caregiver_read ON public.patient;
CREATE POLICY patient_caregiver_read ON public.patient
  FOR SELECT USING (id IN (SELECT public.my_caregiver_patient_ids()));

DROP POLICY IF EXISTS patient_self_write ON public.patient;
CREATE POLICY patient_self_write ON public.patient
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ===== caregiver_link =====
DROP POLICY IF EXISTS caregiver_link_self_read ON public.caregiver_link;
CREATE POLICY caregiver_link_self_read ON public.caregiver_link
  FOR SELECT USING (
    caregiver_id = auth.uid()
    OR patient_id IN (SELECT public.my_patient_ids())
  );

DROP POLICY IF EXISTS caregiver_link_patient_insert ON public.caregiver_link;
CREATE POLICY caregiver_link_patient_insert ON public.caregiver_link
  FOR INSERT WITH CHECK (patient_id IN (SELECT public.my_patient_ids()));

DROP POLICY IF EXISTS caregiver_link_self_delete ON public.caregiver_link;
CREATE POLICY caregiver_link_self_delete ON public.caregiver_link
  FOR DELETE USING (
    caregiver_id = auth.uid()
    OR patient_id IN (SELECT public.my_patient_ids())
  );

-- ===== vitals_log =====
DROP POLICY IF EXISTS vitals_patient_write ON public.vitals_log;
CREATE POLICY vitals_patient_write ON public.vitals_log
  FOR INSERT WITH CHECK (patient_id IN (SELECT public.my_patient_ids()));

DROP POLICY IF EXISTS vitals_patient_read ON public.vitals_log;
CREATE POLICY vitals_patient_read ON public.vitals_log
  FOR SELECT USING (patient_id IN (SELECT public.my_patient_ids()));

DROP POLICY IF EXISTS vitals_caregiver_read ON public.vitals_log;
CREATE POLICY vitals_caregiver_read ON public.vitals_log
  FOR SELECT USING (patient_id IN (SELECT public.my_caregiver_patient_ids()));

-- ===== medication =====
DROP POLICY IF EXISTS medication_patient_all ON public.medication;
CREATE POLICY medication_patient_all ON public.medication
  FOR ALL USING (patient_id IN (SELECT public.my_patient_ids()))
  WITH CHECK (patient_id IN (SELECT public.my_patient_ids()));

DROP POLICY IF EXISTS medication_caregiver_read ON public.medication;
CREATE POLICY medication_caregiver_read ON public.medication
  FOR SELECT USING (patient_id IN (SELECT public.my_caregiver_patient_ids()));

-- ===== medication_log =====
DROP POLICY IF EXISTS medlog_patient_write ON public.medication_log;
CREATE POLICY medlog_patient_write ON public.medication_log
  FOR INSERT WITH CHECK (patient_id IN (SELECT public.my_patient_ids()));

DROP POLICY IF EXISTS medlog_patient_read ON public.medication_log;
CREATE POLICY medlog_patient_read ON public.medication_log
  FOR SELECT USING (patient_id IN (SELECT public.my_patient_ids()));

DROP POLICY IF EXISTS medlog_caregiver_read ON public.medication_log;
CREATE POLICY medlog_caregiver_read ON public.medication_log
  FOR SELECT USING (patient_id IN (SELECT public.my_caregiver_patient_ids()));

-- ===== patient_baseline =====
DROP POLICY IF EXISTS baseline_patient_read ON public.patient_baseline;
CREATE POLICY baseline_patient_read ON public.patient_baseline
  FOR SELECT USING (patient_id IN (SELECT public.my_patient_ids()));

DROP POLICY IF EXISTS baseline_caregiver_read ON public.patient_baseline;
CREATE POLICY baseline_caregiver_read ON public.patient_baseline
  FOR SELECT USING (patient_id IN (SELECT public.my_caregiver_patient_ids()));

-- ===== alert =====
DROP POLICY IF EXISTS alert_patient_read ON public.alert;
CREATE POLICY alert_patient_read ON public.alert
  FOR SELECT USING (patient_id IN (SELECT public.my_patient_ids()));

DROP POLICY IF EXISTS alert_caregiver_read ON public.alert;
CREATE POLICY alert_caregiver_read ON public.alert
  FOR SELECT USING (patient_id IN (SELECT public.my_caregiver_patient_ids()));

-- ===== emergency_brief =====
DROP POLICY IF EXISTS brief_patient_read ON public.emergency_brief;
CREATE POLICY brief_patient_read ON public.emergency_brief
  FOR SELECT USING (patient_id IN (SELECT public.my_patient_ids()));

DROP POLICY IF EXISTS brief_caregiver_read ON public.emergency_brief;
CREATE POLICY brief_caregiver_read ON public.emergency_brief
  FOR SELECT USING (patient_id IN (SELECT public.my_caregiver_patient_ids()));
