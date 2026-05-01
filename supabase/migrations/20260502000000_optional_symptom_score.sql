-- Optional: add an explicit symptom_score column. Not required by the current
-- analysis pipeline (we derive symptom signal from `mood` + `sleep_hours`), but
-- gives the patient a direct slider in the daily-log form when added.
--
-- Safe to apply at any time — additive only.

ALTER TABLE public.vitals_log
  ADD COLUMN IF NOT EXISTS symptom_score INT CHECK (symptom_score BETWEEN 0 AND 10);
