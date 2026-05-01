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
