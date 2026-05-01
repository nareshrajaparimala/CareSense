'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function AlertActions({ alertId, status }: { alertId: string; status: 'open' | 'acknowledged' | 'resolved' }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const update = async (next: 'acknowledged' | 'resolved') => {
    setError(null);
    const res = await fetch('/api/alert', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alert_id: alertId, status: next })
    });
    const json = await res.json();
    if (!json.ok) {
      setError(json.error ?? 'Failed');
      return;
    }
    startTransition(() => router.refresh());
  };

  if (status === 'resolved') {
    return <span className="text-xs italic text-muted-foreground">Resolved</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === 'open' && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => update('acknowledged')}
          disabled={pending}
          className="transition-all duration-150 hover:scale-[1.02]"
        >
          Acknowledge
        </Button>
      )}
      <Button
        variant="default"
        size="sm"
        onClick={() => update('resolved')}
        disabled={pending}
        className="transition-all duration-150 hover:scale-[1.02]"
      >
        Mark resolved
      </Button>
      {status === 'acknowledged' && (
        <span className="text-xs italic text-muted-foreground">Acknowledged</span>
      )}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
