'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type CaregiverItem = {
  link_id: string;
  caregiver_id: string;
  caregiver_name: string;
  caregiver_email: string;
  relationship: string | null;
};

export function CaregiverInviteForm({ caregivers }: { caregivers: CaregiverItem[] }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    const res = await fetch('/api/caregiver-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caregiver_email: email, relationship: relationship || undefined })
    });
    const json = await res.json();
    setLoading(false);
    if (!json.ok) {
      setError(json.error ?? 'Failed to invite');
      return;
    }
    setSuccess(`✅ Linked ${email}`);
    setEmail('');
    setRelationship('');
    router.refresh();
  };

  const remove = async (link_id: string) => {
    if (!confirm('Remove this caregiver?')) return;
    const res = await fetch('/api/caregiver-invite', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ link_id })
    });
    const json = await res.json();
    if (!json.ok) { alert(json.error); return; }
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cg-email">Caregiver email</Label>
            <Input
              id="cg-email"
              type="email"
              placeholder="daughter@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cg-rel">Relationship (optional)</Label>
            <Input
              id="cg-rel"
              placeholder="daughter, son, spouse…"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
            />
          </div>
        </div>
        <Button type="submit" disabled={loading || !email}>
          {loading ? 'Linking…' : 'Add caregiver'}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}
      </form>

      <div>
        <p className="mb-2 text-sm font-semibold">Linked caregivers</p>
        {caregivers.length === 0 ? (
          <p className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
            No caregivers yet. Add one above so they can see your status.
          </p>
        ) : (
          <ul className="space-y-2">
            {caregivers.map((c) => (
              <li
                key={c.link_id}
                className="flex items-center justify-between rounded-md border bg-card p-3 text-sm animate-in fade-in slide-in-from-bottom-1 duration-300"
              >
                <div>
                  <p className="font-medium">{c.caregiver_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.caregiver_email}{c.relationship ? ` · ${c.relationship}` : ''}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => remove(c.link_id)}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
