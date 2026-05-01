'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export type MedicationItem = {
  id: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  active: boolean;
};

export function MedicationManager({ medications }: { medications: MedicationItem[] }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('morning');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    const res = await fetch('/api/medications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, dosage: dosage || null, frequency })
    });
    const json = await res.json();
    setLoading(false);
    if (!json.ok) { setError(json.error); return; }
    setName(''); setDosage(''); setFrequency('morning');
    router.refresh();
  };

  const toggle = async (id: string, active: boolean) => {
    await fetch('/api/medications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active })
    });
    router.refresh();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this medication?')) return;
    await fetch('/api/medications', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="med-name">Medication name</Label>
            <Input id="med-name" placeholder="Metformin" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="med-dose">Dosage</Label>
            <Input id="med-dose" placeholder="500mg" value={dosage} onChange={(e) => setDosage(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Frequency</Label>
          <div className="flex flex-wrap gap-2">
            {['morning', 'twice daily', 'thrice daily', 'evening', 'as needed'].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFrequency(f)}
                className={cn(
                  'rounded-full border px-3 py-1 text-sm capitalize transition-all duration-150',
                  frequency === f && 'border-primary bg-accent'
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <Button type="submit" disabled={loading || !name}>
          {loading ? 'Adding…' : 'Add medication'}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>

      <div>
        <p className="mb-2 text-sm font-semibold">Your medications</p>
        {medications.length === 0 ? (
          <p className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
            No medications added yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {medications.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-md border bg-card p-3 text-sm transition-all duration-200 animate-in fade-in slide-in-from-bottom-1"
              >
                <div className="flex items-center gap-3">
                  <span className={cn('h-2.5 w-2.5 rounded-full', m.active ? 'bg-status-stable' : 'bg-muted-foreground/50')} />
                  <div>
                    <p className={cn('font-medium', !m.active && 'text-muted-foreground line-through')}>
                      {m.name} {m.dosage ? <span className="text-muted-foreground font-normal">— {m.dosage}</span> : null}
                    </p>
                    <p className="text-xs text-muted-foreground">{m.frequency ?? '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => toggle(m.id, !m.active)}>
                    {m.active ? 'Deactivate' : 'Reactivate'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(m.id)}>
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
