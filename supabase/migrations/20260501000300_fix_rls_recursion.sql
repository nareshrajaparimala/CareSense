-- Fix: "infinite recursion detected in policy for relation user_profile"
--
-- Cause: every doctor-read policy did
--   EXISTS (SELECT 1 FROM user_profile WHERE id = auth.uid() AND role = 'doctor')
-- The SELECT itself is gated by user_profile policies, so checking the
-- user_profile_doctor_read policy required reading user_profile, which
-- required checking user_profile_doctor_read, … forever.
--
-- Fix: introduce a SECURITY DEFINER function that reads user_profile with
-- the function owner's privileges (bypassing RLS for that one read), then
-- swap every doctor-check to call it.

-- 1) Helper function (runs with definer rights → bypasses RLS internally)
CREATE OR REPLACE FUNCTION public.is_doctor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profile
    WHERE id = auth.uid() AND role = 'doctor'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_doctor() TO anon, authenticated;

-- 2) Drop and recreate the recursive user_profile policy
DROP POLICY IF EXISTS user_profile_doctor_read ON public.user_profile;

CREATE POLICY user_profile_doctor_read ON public.user_profile
  FOR SELECT USING (public.is_doctor());

-- 3) Rewrite every other doctor policy to use the function

DROP POLICY IF EXISTS patient_doctor_read ON public.patient;
CREATE POLICY patient_doctor_read ON public.patient
  FOR SELECT USING (public.is_doctor());

DROP POLICY IF EXISTS vitals_doctor_read ON public.vitals_log;
CREATE POLICY vitals_doctor_read ON public.vitals_log
  FOR SELECT USING (public.is_doctor());

DROP POLICY IF EXISTS medication_doctor_read ON public.medication;
CREATE POLICY medication_doctor_read ON public.medication
  FOR SELECT USING (public.is_doctor());

DROP POLICY IF EXISTS medlog_doctor_read ON public.medication_log;
CREATE POLICY medlog_doctor_read ON public.medication_log
  FOR SELECT USING (public.is_doctor());

DROP POLICY IF EXISTS baseline_doctor_read ON public.patient_baseline;
CREATE POLICY baseline_doctor_read ON public.patient_baseline
  FOR SELECT USING (public.is_doctor());

DROP POLICY IF EXISTS alert_doctor_read ON public.alert;
CREATE POLICY alert_doctor_read ON public.alert
  FOR SELECT USING (public.is_doctor());

DROP POLICY IF EXISTS alert_doctor_update ON public.alert;
CREATE POLICY alert_doctor_update ON public.alert
  FOR UPDATE USING (public.is_doctor());

DROP POLICY IF EXISTS brief_doctor_read ON public.emergency_brief;
CREATE POLICY brief_doctor_read ON public.emergency_brief
  FOR SELECT USING (public.is_doctor());
