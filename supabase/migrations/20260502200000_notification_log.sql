-- Persisted log of every SMS / WhatsApp dispatch attempt — so doctors and
-- caregivers can see in-app whether messages are actually going out, and to
-- whom. Apply via `supabase db push` or paste into Supabase SQL editor.

CREATE TABLE IF NOT EXISTS public.notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patient(id) ON DELETE CASCADE,
  alert_id UUID REFERENCES public.alert(id) ON DELETE SET NULL,
  recipient_label TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'whatsapp')),
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'skipped')),
  twilio_sid TEXT,
  error TEXT,
  body_preview TEXT,
  trigger TEXT NOT NULL CHECK (trigger IN ('alert', 'test', 'pdf_share')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notification_log_patient_idx
  ON public.notification_log(patient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notification_log_created_idx
  ON public.notification_log(created_at DESC);

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

-- Doctors see all; caregivers see linked patients; patients see their own.
DROP POLICY IF EXISTS notif_select ON public.notification_log;
CREATE POLICY notif_select ON public.notification_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profile up
       WHERE up.id = auth.uid() AND up.role = 'doctor'
    )
    OR EXISTS (
      SELECT 1 FROM public.patient p
       WHERE p.id = notification_log.patient_id AND p.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.caregiver_link cl
       WHERE cl.patient_id = notification_log.patient_id
         AND cl.caregiver_id = auth.uid()
         AND cl.status = 'accepted'
    )
  );
