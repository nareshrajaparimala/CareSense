import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShapBreakdown } from './ShapBreakdown';
import { ConfidenceBadge } from './ConfidenceBadge';
import { AlertActions } from './AlertActions';
import { LEVEL_COLOR, LEVEL_LABEL } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Alert } from '@/types/domain';

export function AlertCard({ alert, showActions = true }: { alert: Alert; showActions?: boolean }) {
  return (
    <Card
      className={cn(
        'border-l-4 transition-shadow duration-200 hover:shadow-md animate-in fade-in slide-in-from-bottom-1',
        `border-l-status-${alert.level}`
      )}
    >
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>{alert.title}</CardTitle>
          <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', LEVEL_COLOR[alert.level])}>
            {LEVEL_LABEL[alert.level]}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{alert.message}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {alert.recommendation && (
          <div className="rounded-md border bg-muted/50 p-3 text-sm">
            <span className="font-medium">Recommended: </span>{alert.recommendation}
          </div>
        )}

        {alert.shap_breakdown && <ShapBreakdown shap={alert.shap_breakdown} />}

        <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-muted-foreground">
          {alert.confidence != null && <ConfidenceBadge value={alert.confidence} />}
          {alert.forecast_72hr && (
            <span>
              Predicted BP {alert.forecast_72hr.predicted.toFixed(0)} in 72h · critical in{' '}
              {alert.forecast_72hr.days_to_critical.toFixed(1)} days
            </span>
          )}
          {alert.message_source === 'fallback' && (
            <span className="italic">(fallback explanation — LLM unavailable)</span>
          )}
        </div>

        {showActions && (
          <div className="flex justify-end border-t pt-3">
            <AlertActions alertId={alert.id} status={alert.status} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
