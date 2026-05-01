'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';

type Scope = 'all' | 'vitals' | 'alerts' | 'medications';

export function ClearHistoryButton({ patientId, patientName }: { patientId: string; patientName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<Scope>('all');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/patient/history', {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patientId, scope })
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error ?? 'Clear failed');
      setOpen(false);
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? 'Clear failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Clear test history
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-card p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold">Clear history for {patientName}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              This permanently deletes data. Choose what to remove:
            </p>

            <div className="mt-3 space-y-2 text-sm">
              {(['all', 'vitals', 'alerts', 'medications'] as Scope[]).map((s) => (
                <label key={s} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="scope"
                    value={s}
                    checked={scope === s}
                    onChange={() => setScope(s)}
                    className="accent-red-600"
                  />
                  <span>
                    {s === 'all' && 'Everything (vitals + alerts + meds + baseline)'}
                    {s === 'vitals' && 'Vitals + baseline only'}
                    {s === 'alerts' && 'Alerts only'}
                    {s === 'medications' && 'Medication logs only'}
                  </span>
                </label>
              ))}
            </div>

            {err && <p className="mt-3 text-sm text-destructive">{err}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                className="rounded-md border px-3 py-1.5 text-sm font-semibold hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={busy}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {busy ? 'Clearing…' : 'Confirm clear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
