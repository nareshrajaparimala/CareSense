import { cn } from '@/lib/utils';

export function VitalTile({
  label,
  value,
  unit,
  tone = 'default'
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: 'default' | 'good' | 'warn' | 'bad';
}) {
  const toneClasses = {
    default: 'text-foreground',
    good: 'text-emerald-600',
    warn: 'text-amber-600',
    bad: 'text-destructive'
  }[tone];

  return (
    <div className="rounded-xl border bg-card px-4 py-3 shadow-sm">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className={cn('text-2xl font-bold leading-none', toneClasses)}>{value}</span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}
