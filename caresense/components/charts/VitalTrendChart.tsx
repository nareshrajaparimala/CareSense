'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
  CartesianGrid
} from 'recharts';
import { shortDate } from '@/utils/dateFormat';
import { CRITICAL_BP_SYSTOLIC } from '@/lib/constants';

export type TrendPoint = {
  logged_at: string;
  bp_systolic: number | null;
  glucose_mgdl?: number | null;
};

export function VitalTrendChart({
  data,
  baselineMean,
  baselineStd,
  height = 240
}: {
  data: TrendPoint[];
  baselineMean: number | null;
  baselineStd: number | null;
  height?: number;
}) {
  const series = data.map((d) => ({
    date: shortDate(d.logged_at),
    bp: d.bp_systolic,
    glucose: d.glucose_mgdl ?? null
  }));

  const lo = baselineMean != null && baselineStd != null ? baselineMean - baselineStd : null;
  const hi = baselineMean != null && baselineStd != null ? baselineMean + baselineStd : null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={series} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
        <Tooltip />
        {lo != null && hi != null && (
          <ReferenceArea y1={lo} y2={hi} fill="#16a34a" fillOpacity={0.08} />
        )}
        <ReferenceLine y={CRITICAL_BP_SYSTOLIC} stroke="#dc2626" strokeDasharray="4 4" />
        <Line type="monotone" dataKey="bp" stroke="#2563eb" strokeWidth={2} dot={{ r: 2 }} name="BP systolic" />
      </LineChart>
    </ResponsiveContainer>
  );
}
