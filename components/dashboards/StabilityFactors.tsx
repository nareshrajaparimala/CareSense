import { Brain } from 'lucide-react';

type Factor = { label: string; impact: number };

export function StabilityFactors({ factors }: { factors: Factor[] }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Brain className="h-5 w-5 text-primary" />
        <h3 className="text-base font-bold">Stability Factors</h3>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        What's driving your next 24 hours.
      </p>

      <div className="mt-4 space-y-3.5">
        {factors.map((f) => {
          const positive = f.impact >= 0;
          const pct = Math.min(100, Math.abs(f.impact));
          return (
            <div key={f.label}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{f.label}</span>
                <span
                  className={
                    positive
                      ? 'text-xs font-semibold text-emerald-600'
                      : 'text-xs font-semibold text-destructive'
                  }
                >
                  {positive ? '+' : '−'}
                  {pct.toFixed(0)}% Stability
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={
                    positive
                      ? 'h-full rounded-full bg-emerald-500'
                      : 'h-full rounded-full bg-destructive'
                  }
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
