import { cn } from '@/lib/utils';

export function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const tier = value > 0.85 ? 'High' : value > 0.7 ? 'Medium' : 'Low';
  const color =
    value > 0.85
      ? 'bg-green-100 text-green-900'
      : value > 0.7
      ? 'bg-yellow-100 text-yellow-900'
      : 'bg-red-100 text-red-900';
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', color)}>
      Confidence: {pct}% ({tier})
    </span>
  );
}
