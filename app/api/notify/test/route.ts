import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendSms, sendWhatsApp, isTwilioConfigured } from '@/lib/notify/twilio';
import { logNotification } from '@/lib/notify/sendAlert';

const Body = z.object({
  to: z.string().min(5),
  channel: z.enum(['sms', 'whatsapp']).default('sms'),
  message: z.string().max(500).optional()
});

// Doctor-only test endpoint to verify Twilio is wired correctly.
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from('user_profile')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if ((profile as any)?.role !== 'doctor') {
    return NextResponse.json({ ok: false, error: 'forbidden — doctors only' }, { status: 403 });
  }

  if (!isTwilioConfigured()) {
    return NextResponse.json({
      ok: false,
      error: 'Twilio is not configured. Set TWILIO_ACCOUNT_SID + (TWILIO_AUTH_TOKEN or TWILIO_API_KEY_SID/SECRET) and TWILIO_PHONE_NUMBER in .env.local.'
    }, { status: 400 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });
  }

  const message = parsed.data.message ?? 'CareSense test alert: this is a delivery check from the doctor dashboard.';
  const result =
    parsed.data.channel === 'whatsapp'
      ? await sendWhatsApp(parsed.data.to, message)
      : await sendSms(parsed.data.to, message);

  // Log outcome to the delivery feed regardless of success.
  await logNotification({
    patient_id: null,
    alert_id: null,
    recipient_label: 'Twilio test',
    recipient_phone: parsed.data.to,
    channel: parsed.data.channel,
    status: result.ok ? 'sent' : 'failed',
    twilio_sid: result.ok ? result.sid : null,
    error: result.ok ? null : result.error,
    body_preview: message.slice(0, 240),
    trigger: 'test'
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
  }
  return NextResponse.json({ ok: true, data: { sid: result.sid, channel: parsed.data.channel } });
}
