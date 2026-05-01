import { Card, CardContent } from '@/components/ui/card';
import { LEVEL_COLOR, LEVEL_LABEL } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { AlertLevel } from '@/types/domain';

const ICONS: Record<AlertLevel, string> = {
  stable: '🟢',
  watch: '🟡',
  trend: '🟠',
  risk: '🔴',
  critical: '🆘'
};

export function PatientStatusCard({
  level,
  patientName,
  subline
}: {
  level: AlertLevel;
  patientName: string;
  subline?: string;
}) {
  return (
    <Card className={cn('border-2', `border-status-${level}`)}>
      <CardContent className="flex items-center justify-between p-6">
        <div>
          <p className="text-sm text-muted-foreground">Hello, {patientName}</p>
          <p className="mt-1 text-2xl font-bold">
            {ICONS[level]} {LEVEL_LABEL[level]}
          </p>
          {subline && <p className="mt-1 text-sm text-muted-foreground">{subline}</p>}
        </div>
        <span className={cn('rounded-full px-3 py-1 text-sm font-semibold', LEVEL_COLOR[level])}>
          {LEVEL_LABEL[level]}
        </span>
      </CardContent>
    </Card>
  );
}
