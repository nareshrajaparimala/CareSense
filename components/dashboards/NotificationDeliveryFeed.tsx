'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, MessageSquare, Phone, RefreshCw, Send } from 'lucide-react';

type Row = {
  id: string;
  patient_id: string | null;
  alert_id: string | null;
  recipient_label: string;
  recipient_phone: string;
  channel: 'sms' | 'whatsapp';
  status: 'sent' | 'failed' | 'skipped';
  twilio_sid: string | null;
  error: string | null;
  body_preview: string | null;
  trigger: 'alert' | 'test' | 'pdf_share';
  created_at: string;
};

const TRIGGER_LABEL: Record<Row['trigger'], string> = {
  alert: 'Alert',
  test: 'Test',
  pdf_share: 'Report'
};

function rel(iso: string): string {
  const m = Math.floor((Date.now() - +new Date(iso)) / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationDeliveryFeed({
  showTester = false
}: {
  showTester?: boolean;
}) {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrationNeeded, setMigrationNeeded] = useState(false);

  // Tester state
  const [to, setTo] = useState('+91');
  const [channel, setChannel] = useState<'sms' | 'whatsapp'>('whatsapp');
  const [sending, setSending] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notify/log', { cache: 'no-store', credentials: 'same-origin' });
      const json = await res.json();
      setItems(json?.data ?? []);
      setMigrationNeeded(Boolean(json?.meta?.migration_needed));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  const sendTest = async () => {
    if (!to || sending) return;
    setSending(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/notify/test', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, channel })
      });
      const json = await res.json();
      setTestResult(json?.ok ? `✓ Sent (${json.data?.sid?.slice(-8) ?? 'ok'})` : `✗ ${json?.error ?? 'failed'}`);
      load();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold">Notification Delivery</h3>
          <p className="text-xs text-muted-foreground">SMS / WhatsApp dispatch from CareSense alerts</p>
        </div>
        <button
          type="button"
          onClick={load}
          aria-label="Refresh"
          disabled={loading}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {showTester && (
        <div className="mb-4 rounded-md border border-dashed bg-muted/30 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
            <Send className="h-3.5 w-3.5" /> Send a test message
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="+91XXXXXXXXXX"
              className="flex-1 min-w-[160px] rounded-md border bg-background px-2 py-1.5 text-xs"
            />
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as 'sms' | 'whatsapp')}
              className="rounded-md border bg-background px-2 py-1.5 text-xs"
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
            </select>
            <button
              type="button"
              onClick={sendTest}
              disabled={sending || !to.startsWith('+')}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {sending ? 'Sending…' : 'Send test'}
            </button>
          </div>
          {testResult && (
            <p className={`mt-2 text-xs ${testResult.startsWith('✓') ? 'text-emerald-600' : 'text-rose-600'}`}>
              {testResult}
            </p>
          )}
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            WhatsApp Sandbox? Recipient must first text <code>join &lt;code&gt;</code> to your Twilio number.
          </p>
        </div>
      )}

      {migrationNeeded && (
        <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 p-2 text-[11px] text-amber-800">
          <strong>One-time setup:</strong> apply <code>20260502200000_notification_log.sql</code> in Supabase SQL editor to enable this feed.
        </div>
      )}

      {loading && items.length === 0 ? (
        <div className="space-y-2">
          <div className="h-12 animate-pulse rounded-md bg-muted" />
          <div className="h-12 animate-pulse rounded-md bg-muted" />
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
          No messages dispatched yet. When an alert fires (Risk or higher) and Twilio is configured, sends will appear here.
        </p>
      ) : (
        <ul className="divide-y">
          {items.map((r) => {
            const ok = r.status === 'sent';
            const Icon = r.channel === 'whatsapp' ? MessageSquare : Phone;
            return (
              <li key={r.id} className="py-2.5">
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                      ok ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold">
                        <Icon className="mr-1 inline h-3 w-3" />
                        {r.channel.toUpperCase()}
                      </span>
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                        {TRIGGER_LABEL[r.trigger]}
                      </span>
                      <span className="font-medium">{r.recipient_label}</span>
                      <span className="text-muted-foreground">{r.recipient_phone}</span>
                      <span className="ml-auto text-muted-foreground">{rel(r.created_at)}</span>
                    </div>
                    {r.body_preview && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{r.body_preview}</p>
                    )}
                    {!ok && r.error && (
                      <p className="mt-0.5 text-[11px] text-rose-600">Twilio error: {r.error}</p>
                    )}
                    {ok && r.twilio_sid && (
                      <p className="mt-0.5 text-[10px] text-muted-foreground">SID …{r.twilio_sid.slice(-10)}</p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
