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
  return (
    <Link
      href={`/doctor/patient/${id}`}
      className={cn(
        'grid grid-cols-12 items-center gap-2 rounded-md border p-3 text-sm transition-colors hover:bg-accent',
        level === 'critical' && 'border-l-4 border-l-status-critical',
        level === 'risk' && 'border-l-4 border-l-status-risk',
        level === 'trend' && 'border-l-4 border-l-status-trend'
      )}
    >
      <div className="col-span-4 font-semibold">{name}</div>
      <div className="col-span-1 text-muted-foreground">{age}{sex}</div>
      <div className="col-span-4 text-muted-foreground">{conditions.join(', ')}</div>
      <div className="col-span-2">
        <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-semibold', LEVEL_COLOR[level])}>
          {LEVEL_LABEL[level]}
        </span>
      </div>
      <div className="col-span-1 text-right text-xs text-muted-foreground">
        {lastLoggedAt ? new Date(lastLoggedAt).toLocaleDateString() : '—'}
      </div>
    </Link>
  );
}
