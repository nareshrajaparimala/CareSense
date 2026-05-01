import type { ShapBreakdown as ShapBreakdownT } from '@/types/domain';

const COLOR = {
  vital_change: 'bg-red-500',
  medication: 'bg-orange-500',
  lifestyle: 'bg-yellow-500'
} as const;

const LABEL = {
  vital_change: 'Vital trend',
  medication: 'Medication adherence',
  lifestyle: 'Lifestyle (sleep)'
} as const;

export function ShapBreakdown({ shap }: { shap: ShapBreakdownT }) {
  const rows: Array<keyof typeof COLOR> = ['vital_change', 'medication', 'lifestyle'];
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Why this alert?</p>
      {rows.map((k) => {
        const pct = Math.round(shap[k] * 100);
        return (
          <div key={k} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>{LABEL[k]}</span>
              <span className="font-medium">{pct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className={`h-full ${COLOR[k]}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
