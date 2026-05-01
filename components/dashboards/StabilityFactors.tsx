import { Brain } from 'lucide-react';

export type StabilityFactor = {
  label: string;
  value: number;        // 0..1 attribution share (higher = more responsible for risk)
  detail: string;       // explainable string ("Missed 3 of last 7 doses")
  available: boolean;   // false → render N/A
};

export function StabilityFactors({ factors }: { factors: StabilityFactor[] }) {
  if (!factors.length) {
    return (
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h3 className="text-base font-bold">Stability Factors</h3>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Not enough data yet — log a few more days to see what's driving your stability.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Brain className="h-5 w-5 text-primary" />
        <h3 className="text-base font-bold">Stability Factors</h3>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        SHAP attribution — what's contributing to risk right now.
      </p>

      <div className="mt-4 space-y-3.5">
        {factors.map((f) => {
          const pct = Math.round(Math.min(1, Math.max(0, f.value)) * 100);
          const tone =
            pct >= 50 ? 'bg-destructive' : pct >= 25 ? 'bg-amber-500' : 'bg-emerald-500';
          const label =
            pct >= 50 ? 'High' : pct >= 25 ? 'Moderate' : 'Low';
          return (
            <div key={f.label}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{f.label}</span>
                <span className="text-xs font-semibold text-muted-foreground">
                  {f.available ? `${pct}% · ${label}` : 'N/A'}
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                {f.available && (
                  <div
                    className={`h-full rounded-full ${tone}`}
                    style={{ width: `${pct}%` }}
                  />
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {f.available ? f.detail : 'No data logged for this factor yet.'}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
