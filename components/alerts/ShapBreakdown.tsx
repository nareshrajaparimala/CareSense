import type { ShapBreakdown as ShapBreakdownT } from '@/types/domain';

const COLOR = {
  vital_change: 'bg-red-500',
  medication: 'bg-orange-500',
  lifestyle: 'bg-yellow-500'
} as const;

const LABEL = {
  vital_change: 'Vital trend',
  medication: 'Medication adherence',
  lifestyle: 'Symptoms & sleep'
} as const;

export function ShapBreakdown({ shap }: { shap: ShapBreakdownT }) {
  const rows: Array<keyof typeof COLOR> = ['vital_change', 'medication', 'lifestyle'];
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Why this alert?</p>
      {rows.map((k) => {
        const pct = Math.round((shap[k] ?? 0) * 100);
        const detail = shap.details?.[k];
        const available = shap.available?.[k] ?? true;
        return (
          <div key={k} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>{LABEL[k]}</span>
              <span className="font-medium">{available ? `${pct}%` : 'N/A'}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              {available && (
                <div className={`h-full ${COLOR[k]}`} style={{ width: `${pct}%` }} />
              )}
            </div>
            {detail && (
              <p className="text-[11px] text-muted-foreground">{detail}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
