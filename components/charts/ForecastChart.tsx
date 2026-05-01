'use client';

import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  CartesianGrid
} from 'recharts';
import { CRITICAL_BP_SYSTOLIC } from '@/lib/constants';
import { shortDate } from '@/utils/dateFormat';
import type { Forecast } from '@/types/domain';

export type HistoryPoint = { logged_at: string; bp_systolic: number | null };

export function ForecastChart({
  history,
  forecast,
  baseline,
  height = 260
}: {
  history: HistoryPoint[];
  forecast: Forecast | null;
  baseline?: { mean: number; std: number } | null;
  height?: number;
}) {
  if (!forecast) {
    const bpPoints = history.filter((h) => typeof h.bp_systolic === 'number').length;
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Forecast not ready yet</p>
        <p className="mt-1 text-xs">
          Need at least 3 logs with a blood-pressure reading. You have {bpPoints} so far.
        </p>
        <a
          href="/patient/log"
          className="mt-3 inline-block rounded-md bg-[#1E3FBF] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
        >
          Log BP now
        </a>
      </div>
    );
  }

  const past = history.map((h) => ({
    label: shortDate(h.logged_at),
    actual: h.bp_systolic ?? null,
    forecast: null as number | null,
    low: null as number | null,
    high: null as number | null
  }));

  const last = history[history.length - 1]?.bp_systolic ?? forecast.predicted;
  const projected = [
    { label: '+24h', actual: null, forecast: last + (forecast.predicted - last) / 3, low: null, high: null },
    { label: '+48h', actual: null, forecast: last + (2 * (forecast.predicted - last)) / 3, low: null, high: null },
    {
      label: '+72h',
      actual: null,
      forecast: forecast.predicted,
      low: forecast.interval_low,
      high: forecast.interval_high
    }
  ];

  const data = [...past, ...projected];

  // Confidence label / tone
  const conf = forecast.confidence ?? 0;
  const confPct = Math.round(conf * 100);
  const confLabel = conf >= 0.75 ? 'High confidence' : conf >= 0.5 ? 'Moderate confidence' : 'Low confidence';
  const confTone =
    conf >= 0.75 ? 'bg-emerald-100 text-emerald-700' :
    conf >= 0.5  ? 'bg-amber-100 text-amber-700' :
                   'bg-rose-100 text-rose-700';

  // Personal-baseline ±1.5σ band
  const bandLow = baseline ? baseline.mean - 1.5 * baseline.std : null;
  const bandHigh = baseline ? baseline.mean + 1.5 * baseline.std : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold ${confTone}`}>
          {confLabel} · R²={confPct}%
        </span>
        {baseline && (
          <span className="text-muted-foreground">
            Personal normal {baseline.mean.toFixed(0)} ± {(1.5 * baseline.std).toFixed(0)} mmHg
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
          <Tooltip />
          {bandLow != null && bandHigh != null && (
            <ReferenceArea y1={bandLow} y2={bandHigh} fill="#10b981" fillOpacity={0.08} stroke="none" />
          )}
          {baseline && (
            <ReferenceLine y={baseline.mean} stroke="#10b981" strokeDasharray="2 4" strokeOpacity={0.6} />
          )}
          <Area dataKey="high" stroke="none" fill="#dc2626" fillOpacity={0.12} />
          <Area dataKey="low" stroke="none" fill="#ffffff" />
          <ReferenceLine y={CRITICAL_BP_SYSTOLIC} stroke="#dc2626" strokeDasharray="4 4" />
          <Line type="monotone" dataKey="actual" stroke="#2563eb" strokeWidth={2} dot={{ r: 2 }} name="Actual" />
          <Line type="monotone" dataKey="forecast" stroke="#dc2626" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3 }} name="Forecast" />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="text-xs text-muted-foreground">
        Predicted {forecast.predicted.toFixed(0)} mmHg in 72h · 95% interval [{forecast.interval_low.toFixed(0)},{' '}
        {forecast.interval_high.toFixed(0)}] · critical threshold reached in {forecast.days_to_critical.toFixed(1)} days
      </p>
    </div>
  );
}
