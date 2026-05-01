-- Add invite lifecycle to caregiver_link.
-- Existing rows default to 'accepted' so already-linked caregivers keep access.
ALTER TABLE public.caregiver_link
  ADD COLUMN IF NOT EXISTS status TEXT
    CHECK (status IN ('pending', 'accepted', 'declined'))
    DEFAULT 'pending';

UPDATE public.caregiver_link SET status = 'accepted' WHERE status IS NULL;

-- Speed up notification queries.
CREATE INDEX IF NOT EXISTS caregiver_link_caregiver_status_idx
  ON public.caregiver_link (caregiver_id, status);
CREATE INDEX IF NOT EXISTS caregiver_link_patient_status_idx
  ON public.caregiver_link (patient_id, status);
