export const formatBP = (sys: number | null, dia: number | null) =>
  sys != null && dia != null ? `${sys}/${dia}` : '—';

export const formatGlucose = (g: number | null) => (g != null ? `${g} mg/dL` : '—');

export const formatHR = (hr: number | null) => (hr != null ? `${hr} bpm` : '—');

export const formatSpO2 = (s: number | null) => (s != null ? `${s}%` : '—');

export const safeNum = (v: number | null | undefined, fallback = 0) =>
  typeof v === 'number' && !Number.isNaN(v) ? v : fallback;
