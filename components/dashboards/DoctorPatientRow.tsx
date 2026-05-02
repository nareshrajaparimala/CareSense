import Link from 'next/link';
import { LEVEL_COLOR, LEVEL_LABEL } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { AlertLevel } from '@/types/domain';

export function DoctorPatientRow({
  id,
  name,
  age,
  sex,
  conditions,
  level,
  lastLoggedAt
}: {
  id: string;
  name: string;
  age: number;
  sex: string;
  conditions: string[];
  level: AlertLevel;
  lastLoggedAt: string | null;
}) {
  const accent =
    level === 'critical' ? 'border-l-4 border-l-status-critical'
    : level === 'risk' ? 'border-l-4 border-l-status-risk'
    : level === 'trend' ? 'border-l-4 border-l-status-trend'
    : '';
  const lastLogText = lastLoggedAt ? new Date(lastLoggedAt).toLocaleDateString() : '—';
  const statusBadge = (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-semibold', LEVEL_COLOR[level])}>
      {LEVEL_LABEL[level]}
    </span>
  );

  return (
    <Link
      href={`/doctor/patient/${id}`}
      className={cn(
        'block rounded-md border p-3 text-sm transition-colors hover:bg-accent',
        accent
      )}
    >
      {/* Mobile: stacked card */}
      <div className="flex flex-col gap-2 md:hidden">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-semibold">{name}</div>
            <div className="text-xs text-muted-foreground">{age}{sex}</div>
          </div>
          {statusBadge}
        </div>
        {conditions.length > 0 && (
          <div className="text-xs text-muted-foreground">{conditions.join(', ')}</div>
        )}
        <div className="text-[11px] text-muted-foreground">Last log: {lastLogText}</div>
      </div>

      {/* Desktop: 12-col grid */}
      <div className="hidden grid-cols-12 items-center gap-2 md:grid">
        <div className="col-span-4 truncate font-semibold">{name}</div>
        <div className="col-span-1 text-muted-foreground">{age}{sex}</div>
        <div className="col-span-4 truncate text-muted-foreground">{conditions.join(', ')}</div>
        <div className="col-span-2">{statusBadge}</div>
        <div className="col-span-1 text-right text-xs text-muted-foreground">{lastLogText}</div>
      </div>
    </Link>
  );
}
