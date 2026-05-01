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
  CartesianGrid
} from 'recharts';
import { CRITICAL_BP_SYSTOLIC } from '@/lib/constants';
import { shortDate } from '@/utils/dateFormat';
import type { Forecast } from '@/types/domain';

export type HistoryPoint = { logged_at: string; bp_systolic: number | null };

export function ForecastChart({
  history,
  forecast,
  height = 260
}: {
  history: HistoryPoint[];
  forecast: Forecast | null;
  height?: number;
}) {
  if (!forecast) {
    return <p className="text-sm text-muted-foreground">Not enough data for a forecast yet.</p>;
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

  return (
    <div className="space-y-2">
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
          <Tooltip />
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
