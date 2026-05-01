import 'server-only';

// Twilio REST client using fetch + Basic Auth — no npm dependency.
// Supports two auth styles documented by Twilio:
//   1. Account SID + Auth Token         (basic auth as: AccountSid:AuthToken)
//   2. API Key SID + API Key Secret     (basic auth as: ApiKeySid:ApiKeySecret)
//      In this case the API path still uses the Account SID, so set
//      TWILIO_ACCOUNT_SID alongside the API key vars.

type TwilioCreds = {
  accountSid: string;
  username: string;
  password: string;
};

function getCreds(): TwilioCreds | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const apiKeySid = process.env.TWILIO_API_KEY_SID;
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET ?? process.env.TWILIO_API_SECRET;

  // API Key auth (preferred — narrower scope than auth token).
  if (accountSid?.startsWith('AC') && apiKeySid?.startsWith('SK') && apiKeySecret) {
    return { accountSid, username: apiKeySid, password: apiKeySecret };
  }

  // Account SID + Auth Token.
  if (accountSid?.startsWith('AC') && authToken) {
    return { accountSid, username: accountSid, password: authToken };
  }

  // Tolerate users who put their API Key SID into TWILIO_ACCOUNT_SID by
  // mistake — only works if they also provided the matching Account SID
  // separately. Otherwise we can't talk to Twilio.
  if (accountSid?.startsWith('SK') && apiKeySecret && process.env.TWILIO_ACCOUNT_SID_REAL?.startsWith('AC')) {
    return {
      accountSid: process.env.TWILIO_ACCOUNT_SID_REAL,
      username: accountSid,
      password: apiKeySecret
    };
  }

  return null;
}

export type SendResult = { ok: true; sid: string } | { ok: false; error: string };

async function postMessage(form: URLSearchParams): Promise<SendResult> {
  const creds = getCreds();
  if (!creds) {
    return {
      ok: false,
      error:
        'Twilio not configured. Set TWILIO_ACCOUNT_SID (AC...) and either TWILIO_AUTH_TOKEN or TWILIO_API_KEY_SID + TWILIO_API_KEY_SECRET in .env.local.'
    };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${creds.accountSid}/Messages.json`;
  const auth = Buffer.from(`${creds.username}:${creds.password}`).toString('base64');

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: form.toString()
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data?.message ?? `Twilio HTTP ${res.status}` };
    }
    return { ok: true, sid: data.sid };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Twilio fetch failed' };
  }
}

export async function sendSms(to: string, body: string): Promise<SendResult> {
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!from) return { ok: false, error: 'TWILIO_PHONE_NUMBER not set' };
  if (!to) return { ok: false, error: 'recipient phone missing' };

  const form = new URLSearchParams();
  form.set('To', to);
  form.set('From', from);
  form.set('Body', body);
  return postMessage(form);
}

export async function sendWhatsApp(to: string, body: string, mediaUrl?: string): Promise<SendResult> {
  // Default to Twilio's WhatsApp Sandbox sender unless the user set their own.
  const from = process.env.TWILIO_WHATSAPP_NUMBER ?? '+14155238886';
  if (!to) return { ok: false, error: 'recipient phone missing' };

  const form = new URLSearchParams();
  form.set('To', to.startsWith('whatsapp:') ? to : `whatsapp:${to}`);
  form.set('From', from.startsWith('whatsapp:') ? from : `whatsapp:${from}`);
  form.set('Body', body);
  if (mediaUrl) form.set('MediaUrl', mediaUrl);
  return postMessage(form);
}

export function isTwilioConfigured(): boolean {
  return getCreds() !== null && !!process.env.TWILIO_PHONE_NUMBER;
}
