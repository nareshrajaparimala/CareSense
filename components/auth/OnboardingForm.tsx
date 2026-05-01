'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { Role } from '@/types/domain';

const ROLES: { value: Role; title: string; sub: string }[] = [
  { value: 'patient', title: 'I am a patient', sub: 'I want to track my own chronic condition.' },
  { value: 'caregiver', title: 'I care for someone', sub: 'A parent, spouse, or family member.' },
  { value: 'doctor', title: 'I am a doctor', sub: 'Triage chronic patients between visits.' }
];

export function OnboardingForm({
  userId,
  email,
  prefillRole = null,
  prefillName = ''
}: {
  userId: string;
  email: string;
  prefillRole?: Role | null;
  prefillName?: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [role, setRole] = useState<Role | null>(prefillRole);
  const [fullName, setFullName] = useState(prefillName);
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<'M' | 'F' | 'Other'>('M');
  const [conditions, setConditions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleCond = (c: string) =>
    setConditions((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const submit = async () => {
    if (!role || !fullName) return;
    setLoading(true);
    setError(null);

    const { error: profErr } = await supabase
      .from('user_profile')
      .upsert({ id: userId, full_name: fullName, role }, { onConflict: 'id' });
    if (profErr) {
      setError(profErr.message);
      setLoading(false);
      return;
    }

    if (role === 'patient') {
      const { error: pErr } = await supabase
        .from('patient')
        .upsert(
          {
            user_id: userId,
            age: Number(age) || 60,
            sex,
            conditions,
            location_lat: 12.9716,
            location_lng: 77.5946,
            address: 'Bengaluru, India'
          },
          { onConflict: 'user_id' }
        );
      if (pErr) {
        setError(pErr.message);
        setLoading(false);
        return;
      }
    }

    const dest =
      role === 'patient' ? '/patient/dashboard'
      : role === 'caregiver' ? '/caregiver/home'
      : '/doctor/dashboard';
    router.push(dest);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-3">
        {ROLES.map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => setRole(r.value)}
            className={cn(
              'rounded-lg border p-4 text-left transition-colors hover:bg-accent',
              role === r.value && 'border-primary bg-accent'
            )}
          >
            <div className="font-semibold">{r.title}</div>
            <div className="mt-1 text-xs text-muted-foreground">{r.sub}</div>
          </button>
        ))}
      </div>

      {role && (
        <div className="space-y-4 border-t pt-4">
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Your name</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" />
          </div>

          {role === 'patient' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="age">Age</Label>
                  <Input id="age" type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="62" />
                </div>
                <div className="space-y-1.5">
                  <Label>Sex</Label>
                  <div className="flex gap-2">
                    {(['M', 'F', 'Other'] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSex(s)}
                        className={cn(
                          'flex-1 rounded-md border px-3 py-2 text-sm',
                          sex === s && 'border-primary bg-accent'
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Conditions</Label>
                <div className="flex flex-wrap gap-2">
                  {['diabetes', 'hypertension', 'cardiac', 'kidney'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleCond(c)}
                      className={cn(
                        'rounded-full border px-3 py-1 text-sm capitalize',
                        conditions.includes(c) && 'border-primary bg-accent'
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <p className="text-xs text-muted-foreground">Signed in as {email}</p>

          <Button size="lg" onClick={submit} disabled={loading || !fullName} className="w-full">
            {loading ? 'Saving…' : 'Continue'}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}
