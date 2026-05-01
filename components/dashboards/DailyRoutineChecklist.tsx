'use client';

import { useEffect, useState } from 'react';
import { Activity, CheckCircle2, Circle, Droplet, Moon, Pill, Stethoscope, Sun } from 'lucide-react';

type Med = {
  id: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
};

type Props = {
  patientId: string;
  medications: Med[];
  vitalsLoggedToday: boolean;
  conditions: string[];
};

type LifestyleKey = 'water' | 'walk' | 'sleep' | 'meal' | 'stress';

const LIFESTYLE_ITEMS: Array<{ key: LifestyleKey; label: string; hint: string; icon: any }> = [
  { key: 'water', label: 'Drink 8 glasses of water', hint: 'Hydration helps BP and circulation', icon: Droplet },
  { key: 'walk', label: '20–30 minute walk', hint: 'Light cardio boosts mood & lowers BP', icon: Activity },
  { key: 'meal', label: 'Heart-friendly meals', hint: 'Low sodium, balanced carbs', icon: Sun },
  { key: 'sleep', label: '7+ hours of sleep tonight', hint: 'Recovery & blood pressure regulation', icon: Moon },
  { key: 'stress', label: '5-minute breathing/meditation', hint: 'Reduces stress hormones', icon: Stethoscope }
];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function DailyRoutineChecklist({ patientId, medications, vitalsLoggedToday, conditions }: Props) {
  const [medState, setMedState] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [lifestyle, setLifestyle] = useState<Record<LifestyleKey, boolean>>({
    water: false,
    walk: false,
    meal: false,
    sleep: false,
    stress: false
  });

  const storageKey = `routine:${patientId}:${todayKey()}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.lifestyle) setLifestyle((s) => ({ ...s, ...parsed.lifestyle }));
        if (parsed?.medState) setMedState(parsed.medState);
      }
    } catch { /* ignore */ }
  }, [storageKey]);

  const persist = (next: { lifestyle?: Record<LifestyleKey, boolean>; medState?: Record<string, boolean> }) => {
    try {
      const merged = { lifestyle: next.lifestyle ?? lifestyle, medState: next.medState ?? medState };
      localStorage.setItem(storageKey, JSON.stringify(merged));
    } catch { /* ignore */ }
  };

  const toggleLifestyle = (k: LifestyleKey) => {
    const next = { ...lifestyle, [k]: !lifestyle[k] };
    setLifestyle(next);
    persist({ lifestyle: next });
  };

  const toggleMed = async (med: Med) => {
    const taken = !medState[med.id];
    const next = { ...medState, [med.id]: taken };
    setMedState(next);
    persist({ medState: next });
    setBusy(med.id);
    try {
      await fetch('/api/medication-log', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: [{ medication_id: med.id, taken }] })
      });
    } catch { /* ignore */ } finally {
      setBusy(null);
    }
  };

  const total =
    medications.length +
    LIFESTYLE_ITEMS.length +
    1; // vitals
  const completed =
    Object.values(medState).filter(Boolean).length +
    Object.values(lifestyle).filter(Boolean).length +
    (vitalsLoggedToday ? 1 : 0);
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-base font-bold">Daily Routine</h3>
          <p className="text-xs text-muted-foreground">{dateLabel}</p>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-[#1E3FBF]">{pct}%</div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{completed}/{total} done</p>
        </div>
      </div>

      <div className="mb-4 h-2 overflow-hidden rounded-full bg-blue-100">
        <div
          className="h-full rounded-full bg-[#1E3FBF] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {medications.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Medications
          </p>
          <ul className="space-y-1.5">
            {medications.map((m) => {
              const taken = !!medState[m.id];
              const Icon = taken ? CheckCircle2 : Circle;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => toggleMed(m)}
                    disabled={busy === m.id}
                    className={`flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition ${
                      taken ? 'border-emerald-200 bg-emerald-50' : 'hover:bg-muted'
                    }`}
                  >
                    <Pill className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="font-medium">{m.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {[m.dosage, m.frequency].filter(Boolean).join(' • ') || '—'}
                      </div>
                    </div>
                    <Icon className={`h-5 w-5 ${taken ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mb-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Vitals
        </p>
        <div
          className={`flex items-center gap-3 rounded-md border px-3 py-2 text-sm ${
            vitalsLoggedToday ? 'border-emerald-200 bg-emerald-50' : ''
          }`}
        >
          <Stethoscope className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1">Log today's vitals</span>
          {vitalsLoggedToday ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          ) : (
            <a
              href="/patient/log"
              className="rounded-md bg-[#1E3FBF] px-2.5 py-1 text-[11px] font-semibold text-white hover:opacity-90"
            >
              Log
            </a>
          )}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Lifestyle
        </p>
        <ul className="space-y-1.5">
          {LIFESTYLE_ITEMS.map(({ key, label, hint, icon: Icon }) => {
            const done = lifestyle[key];
            return (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => toggleLifestyle(key)}
                  className={`flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition ${
                    done ? 'border-emerald-200 bg-emerald-50' : 'hover:bg-muted'
                  }`}
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="font-medium">{label}</div>
                    <div className="text-[11px] text-muted-foreground">{hint}</div>
                  </div>
                  {done ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {conditions.length > 0 && (
        <p className="mt-4 text-[11px] italic text-muted-foreground">
          Tailored for: {conditions.join(', ')}
        </p>
      )}
    </div>
  );
}
