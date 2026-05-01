'use client';

import { useEffect, useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';

type Suggestion = {
  greeting: string;
  focus: string;
  tips: string[];
  source: 'llm' | 'fallback';
};

export function AIDailySuggestion({ patientId }: { patientId: string }) {
  const [data, setData] = useState<Suggestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ai-suggest?patient_id=${patientId}`, {
        cache: 'no-store',
        credentials: 'same-origin'
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error ?? 'Failed');
      setData(json.data);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load AI suggestions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  return (
    <div className="rounded-xl border bg-gradient-to-br from-blue-50 via-white to-blue-50 p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1E3FBF] text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold leading-tight">AI Daily Guidance</h3>
            <p className="text-[11px] text-muted-foreground">Personalised by your last 7 days</p>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          aria-label="Refresh suggestion"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && !data && (
        <div className="space-y-2">
          <div className="h-4 w-2/3 animate-pulse rounded bg-blue-100" />
          <div className="h-3 w-full animate-pulse rounded bg-blue-100" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-blue-100" />
          <div className="h-3 w-4/6 animate-pulse rounded bg-blue-100" />
        </div>
      )}

      {error && !loading && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {data && (
        <>
          <p className="text-base font-semibold text-[#1E3FBF]">{data.greeting}</p>
          <p className="mt-1 text-sm text-foreground">{data.focus}</p>
          <ul className="mt-3 space-y-1.5">
            {data.tips.map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1E3FBF]" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
          {data.source === 'fallback' && (
            <p className="mt-3 text-[11px] italic text-muted-foreground">
              (heuristic — set GROQ_API_KEY for personalised AI guidance)
            </p>
          )}
        </>
      )}
    </div>
  );
}
