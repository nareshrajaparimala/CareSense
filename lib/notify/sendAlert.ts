import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendSms, sendWhatsApp, isTwilioConfigured } from './twilio';
import type { Alert } from '@/types/domain';

type Recipient = {
  label: string;
  phone: string;
  channels: Array<'sms' | 'whatsapp'>;
};

// Light E.164 sanity check. Twilio will fully validate; this just avoids
// obvious garbage being sent.
function normalisePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.replace(/[^\d+]/g, '');
  if (!trimmed) return null;
  if (trimmed.startsWith('+')) return trimmed;
  // Default-prefix country codes are too risky to guess; require a +.
  return null;
}

async function gatherRecipients(patientId: string): Promise<Recipient[]> {
  const list: Recipient[] = [];

  const { data: patient } = await supabaseAdmin
    .from('patient')
    .select('user_id, emergency_contact_name, emergency_contact_phone')
    .eq('id', patientId)
    .maybeSingle();
  if (!patient) return list;

  // Patient themself
  if ((patient as any).user_id) {
    const { data: profile } = await supabaseAdmin
      .from('user_profile')
      .select('full_name, phone')
      .eq('id', (patient as any).user_id)
      .maybeSingle();
    const phone = normalisePhone((profile as any)?.phone);
    if (phone) {
      list.push({
        label: `Patient (${(profile as any)?.full_name ?? 'self'})`,
        phone,
        channels: ['sms', 'whatsapp']
      });
    }
  }

  // Emergency contact
  const ecPhone = normalisePhone((patient as any).emergency_contact_phone);
  if (ecPhone) {
    list.push({
      label: `Emergency contact (${(patient as any).emergency_contact_name ?? 'unknown'})`,
      phone: ecPhone,
      channels: ['sms']
    });
  }

  // Linked, accepted caregivers
  const { data: links } = await supabaseAdmin
    .from('caregiver_link')
    .select('caregiver_id, status')
    .eq('patient_id', patientId)
    .eq('status', 'accepted');

  for (const l of (links ?? []) as any[]) {
    const { data: cg } = await supabaseAdmin
      .from('user_profile')
      .select('full_name, phone')
      .eq('id', l.caregiver_id)
      .maybeSingle();
    const phone = normalisePhone((cg as any)?.phone);
    if (phone) {
      list.push({
        label: `Caregiver (${(cg as any)?.full_name ?? 'unknown'})`,
        phone,
        channels: ['sms', 'whatsapp']
      });
    }
  }

  return list;
}

function formatBody(patientName: string, alert: Alert): string {
  const head = `[CareSense ${alert.level.toUpperCase()}] ${patientName}`;
  const body = alert.title ? `${head}\n${alert.title}` : head;
  const msg = alert.message ? `\n${alert.message}` : '';
  const rec = alert.recommendation ? `\nRecommended: ${alert.recommendation}` : '';
  return `${body}${msg}${rec}`.slice(0, 1500); // SMS will fragment beyond 160 chars; cap to keep cost sane.
}

export type DispatchResult = {
  attempted: number;
  sent: number;
  failures: Array<{ recipient: string; channel: string; error: string }>;
  skipped?: string;
};

// Best-effort persistence — fails silently if the notification_log table
// hasn't been migrated yet. Never throws.
async function logNotification(row: {
  patient_id: string | null;
  alert_id: string | null;
  recipient_label: string;
  recipient_phone: string;
  channel: 'sms' | 'whatsapp';
  status: 'sent' | 'failed' | 'skipped';
  twilio_sid?: string | null;
  error?: string | null;
  body_preview?: string | null;
  trigger: 'alert' | 'test' | 'pdf_share';
}) {
  try {
    await supabaseAdmin.from('notification_log').insert(row);
  } catch {
    // table may not exist yet — ignore.
  }
}

export { logNotification };

export async function dispatchAlertNotifications(
  patientId: string,
  alert: Alert
): Promise<DispatchResult> {
  if (!isTwilioConfigured()) {
    return { attempted: 0, sent: 0, failures: [], skipped: 'twilio not configured' };
  }

  // Only send for elevated alerts. Skip watch to avoid spamming.
  // (Alert.level is typed as Exclude<AlertLevel, 'stable'>, so 'stable' isn't possible here.)
  if (alert.level === 'watch') {
    return { attempted: 0, sent: 0, failures: [], skipped: `level=${alert.level}` };
  }

  const { data: patient } = await supabaseAdmin
    .from('patient')
    .select('user_id')
    .eq('id', patientId)
    .maybeSingle();
  const { data: profile } = (patient as any)?.user_id
    ? await supabaseAdmin
        .from('user_profile')
        .select('full_name')
        .eq('id', (patient as any).user_id)
        .maybeSingle()
    : { data: null as any };
  const patientName = (profile as any)?.full_name ?? 'Patient';

  const recipients = await gatherRecipients(patientId);
  const body = formatBody(patientName, alert);

  let attempted = 0;
  let sent = 0;
  const failures: DispatchResult['failures'] = [];

  await Promise.all(
    recipients.flatMap((r) =>
      r.channels.map(async (ch) => {
        attempted++;
        const res = ch === 'sms' ? await sendSms(r.phone, body) : await sendWhatsApp(r.phone, body);
        if (res.ok) sent++;
        else failures.push({ recipient: r.label, channel: ch, error: res.error });
        // Persist outcome — visible on the dashboard's Delivery Log.
        await logNotification({
          patient_id: patientId,
          alert_id: alert.id ?? null,
          recipient_label: r.label,
          recipient_phone: r.phone,
          channel: ch,
          status: res.ok ? 'sent' : 'failed',
          twilio_sid: res.ok ? res.sid : null,
          error: res.ok ? null : res.error,
          body_preview: body.slice(0, 240),
          trigger: 'alert'
        });
      })
    )
  );

  return { attempted, sent, failures };
}
