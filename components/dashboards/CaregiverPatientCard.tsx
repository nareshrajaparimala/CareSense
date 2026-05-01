import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { LEVEL_COLOR, LEVEL_LABEL } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Alert, AlertLevel } from '@/types/domain';

export function CaregiverPatientCard({
  patientId,
  patientName,
  level,
  alert,
  relationship
}: {
  patientId: string;
  patientName: string;
  level: AlertLevel;
  alert: Alert | null;
  relationship: string | null;
}) {
  return (
    <Card className={cn('border-l-4', `border-l-status-${level}`)}>
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-lg font-semibold">{patientName}</p>
            {relationship && <span className="text-sm text-muted-foreground">· {relationship}</span>}
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', LEVEL_COLOR[level])}>
              {LEVEL_LABEL[level]}
            </span>
          </div>
          {alert ? (
            <>
              <p className="font-medium">{alert.title}</p>
              {alert.forecast_72hr && (
                <p className="text-sm text-muted-foreground">
                  72hr forecast: critical in {alert.forecast_72hr.days_to_critical.toFixed(1)} days
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">All vitals within personal baseline.</p>
          )}
        </div>

        <div className="flex shrink-0 gap-2">
          <Link
            href={`/caregiver/patient/${patientId}`}
            className={buttonVariants({ variant: 'outline' })}
          >
            View Details
          </Link>
          {level === 'critical' && (
            <Link
              href={`/emergency/${patientId}`}
              className={buttonVariants({ variant: 'destructive' })}
            >
              Emergency
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
