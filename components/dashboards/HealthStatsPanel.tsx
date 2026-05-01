'use client';

import { useState } from 'react';
import { Activity, Droplet, HeartPulse, Moon, Smile, Wind } from 'lucide-react';

type Metric = 'bp' | 'glucose' | 'hr' | 'spo2' | 'sleep' | 'mood';

type Stat = {
  metric: Metric;
  label: string;
  value: string;
  unit?: string;
  tone: 'good' | 'warn' | 'bad' | 'neutral';
  recent: Array<number | null>;
  rawValue: number | string | null;
};

const ICON: Record<Metric, any> = {
  bp: HeartPulse,
  glucose: Droplet,
  hr: Activity,
  spo2: Wind,
  sleep: Moon,
  mood: Smile
};

const TONE: Record<Stat['tone'], string> = {
  good: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  warn: 'text-amber-600 bg-amber-50 border-amber-200',
  bad: 'text-red-600 bg-red-50 border-red-200',
  neutral: 'text-foreground bg-card border-border'
};

type Explanation = {
  level: string;
  factor: string;
  reason: string;
  source: string;
};

export function HealthStatsPanel({ rows, patientId }: { rows: any[]; patientId?: string }) {
  const stats = computeStats(rows);
  const [hover, setHover] = useState<Metric | null>(null);
  const [cache, setCache] = useState<Record<string, Explanation | 'loading'>>({});

  const fetchExplain = async (s: Stat) => {
    if (cache[s.metric]) return;
    setCache((c) => ({ ...c, [s.metric]: 'loading' }));
    try {
      const res = await fetch('/api/risk-explain', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metric: s.metric, value: s.rawValue, recent: s.recent, patient_id: patientId })
      });
      const json = await res.json();
      if (json?.ok) setCache((c) => ({ ...c, [s.metric]: json.data }));
    } catch {
      setCache((c) => {
        const next = { ...c };
        delete next[s.metric];
        return next;
      });
    }
  };

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold">Health Statistics</h3>
          <p className="text-xs text-muted-foreground">
            Hover any tile to see the AI's risk factor and reason.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => {
          const Icon = ICON[s.metric];
          const exp = cache[s.metric];
          const showTip = hover === s.metric;
          return (
            <div
              key={s.metric}
              className="relative"
              onMouseEnter={() => {
                setHover(s.metric);
                fetchExplain(s);
              }}
              onMouseLeave={() => setHover(null)}
            >
              <button
                type="button"
                className={`w-full rounded-xl border px-3 py-3 text-left transition hover:shadow-md ${TONE[s.tone]}`}
                aria-describedby={`tip-${s.metric}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
                    {s.label}
                  </span>
                  <Icon className="h-3.5 w-3.5 opacity-70" />
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-xl font-bold leading-none">{s.value}</span>
                  {s.unit && <span className="text-[10px] opacity-70">{s.unit}</span>}
                </div>
              </button>

              {showTip && (
                <div
                  id={`tip-${s.metric}`}
                  role="tooltip"
                  className="absolute left-1/2 top-full z-30 mt-2 w-64 -translate-x-1/2 rounded-lg border bg-popover p-3 text-xs shadow-xl"
                >
                  {exp === 'loading' || !exp ? (
                    <p className="text-muted-foreground">Analysing with AI…</p>
                  ) : (
                    <>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">
                          Risk factor
                        </span>
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                            exp.level === 'critical' || exp.level === 'risk'
                              ? 'bg-red-100 text-red-700'
                              : exp.level === 'trend' || exp.level === 'watch'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {exp.level}
                        </span>
                      </div>
                      <p className="font-semibold">{exp.factor}</p>
                      <p className="mt-1 text-muted-foreground">{exp.reason}</p>
                      {exp.source === 'fallback' && (
                        <p className="mt-1 text-[10px] italic text-muted-foreground">
                          (fallback — AI unavailable)
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function avg(nums: Array<number | null | undefined>): number | null {
  const xs = nums.filter((n): n is number => typeof n === 'number');
  if (xs.length === 0) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function fmt(n: number | null, digits = 0): string {
  return n == null ? '—' : n.toFixed(digits);
}

function computeStats(rows: any[]): Stat[] {
  const sysRecent = rows.map((r) => r.bp_systolic ?? null);
  const diaRecent = rows.map((r) => r.bp_diastolic ?? null);
  const gluRecent = rows.map((r) => r.glucose_mgdl ?? null);
  const hrRecent = rows.map((r) => r.heart_rate ?? null);
  const spoRecent = rows.map((r) => r.spo2 ?? null);
  const slpRecent = rows.map((r) => r.sleep_hours ?? null);
  const moodRecent = rows.map((r) => r.mood ?? null);

  const sys = avg(sysRecent);
  const dia = avg(diaRecent);
  const glu = avg(gluRecent);
  const hr = avg(hrRecent);
  const spo = avg(spoRecent);
  const slp = avg(slpRecent);
  const mood = avg(moodRecent);

  const bpTone: Stat['tone'] =
    sys == null ? 'neutral' : sys >= 160 ? 'bad' : sys >= 140 ? 'warn' : 'good';
  const gluTone: Stat['tone'] =
    glu == null ? 'neutral' : glu >= 250 ? 'bad' : glu >= 180 ? 'warn' : 'good';
  const hrTone: Stat['tone'] =
    hr == null ? 'neutral' : hr >= 110 || hr < 50 ? 'bad' : hr >= 100 ? 'warn' : 'good';
  const spoTone: Stat['tone'] =
    spo == null ? 'neutral' : spo < 92 ? 'bad' : spo < 95 ? 'warn' : 'good';
  const slpTone: Stat['tone'] =
    slp == null ? 'neutral' : slp < 6 ? 'bad' : slp < 7 ? 'warn' : 'good';
  const moodTone: Stat['tone'] =
    mood == null ? 'neutral' : mood < 2.5 ? 'bad' : mood < 3.5 ? 'warn' : 'good';

  return [
    {
      metric: 'bp',
      label: 'Avg BP',
      value: sys != null && dia != null ? `${sys.toFixed(0)}/${dia.toFixed(0)}` : '—',
      unit: 'mmHg',
      tone: bpTone,
      recent: sysRecent,
      rawValue: sys
    },
    {
      metric: 'glucose',
      label: 'Avg Glucose',
      value: fmt(glu, 0),
      unit: 'mg/dL',
      tone: gluTone,
      recent: gluRecent,
      rawValue: glu
    },
    {
      metric: 'hr',
      label: 'Avg HR',
      value: fmt(hr, 0),
      unit: 'bpm',
      tone: hrTone,
      recent: hrRecent,
      rawValue: hr
    },
    {
      metric: 'spo2',
      label: 'Avg SpO₂',
      value: spo != null ? `${spo.toFixed(0)}%` : '—',
      tone: spoTone,
      recent: spoRecent,
      rawValue: spo
    },
    {
      metric: 'sleep',
      label: 'Avg Sleep',
      value: fmt(slp, 1),
      unit: 'h',
      tone: slpTone,
      recent: slpRecent,
      rawValue: slp
    },
    {
      metric: 'mood',
      label: 'Avg Mood',
      value: fmt(mood, 1),
      unit: '/5',
      tone: moodTone,
      recent: moodRecent,
      rawValue: mood
    }
  ];
}
