'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const ACTIVITIES = ['low', 'medium', 'high'] as const;
const DIET = ['normal', 'high_carb', 'high_sodium'] as const;
const MOODS = [1, 2, 3, 4, 5] as const;
const MOOD_LABEL: Record<number, string> = { 1: '😞', 2: '😕', 3: '😐', 4: '🙂', 5: '😄' };

export function DailyLogForm({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [bpSys, setBpSys] = useState('');
  const [bpDia, setBpDia] = useState('');
  const [glucose, setGlucose] = useState('');
  const [hr, setHr] = useState('');
  const [spo2, setSpo2] = useState('');
  const [sleep, setSleep] = useState('7');
  const [activity, setActivity] = useState<(typeof ACTIVITIES)[number]>('medium');
  const [diet, setDiet] = useState<(typeof DIET)[number]>('normal');
  const [mood, setMood] = useState<number>(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const body: any = { patient_id: patientId, activity_level: activity, diet_flag: diet, mood, sleep_hours: Number(sleep) };
    if (bpSys) body.bp_systolic = Number(bpSys);
    if (bpDia) body.bp_diastolic = Number(bpDia);
    if (glucose) body.glucose_mgdl = Number(glucose);
    if (hr) body.heart_rate = Number(hr);
    if (spo2) body.spo2 = Number(spo2);

    const res = await fetch('/api/log-vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const json = await res.json();
    setLoading(false);
    if (!json.ok) {
      setError(json.error ?? 'Failed to log');
      return;
    }
    router.push('/patient/dashboard');
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="bps">BP systolic</Label>
          <Input id="bps" type="number" inputMode="numeric" placeholder="128" value={bpSys} onChange={(e) => setBpSys(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bpd">BP diastolic</Label>
          <Input id="bpd" type="number" inputMode="numeric" placeholder="82" value={bpDia} onChange={(e) => setBpDia(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="glucose">Glucose (mg/dL)</Label>
          <Input id="glucose" type="number" inputMode="numeric" placeholder="135" value={glucose} onChange={(e) => setGlucose(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="hr">Heart rate</Label>
          <Input id="hr" type="number" inputMode="numeric" placeholder="72" value={hr} onChange={(e) => setHr(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="spo2">SpO2 (%)</Label>
          <Input id="spo2" type="number" inputMode="numeric" placeholder="98" value={spo2} onChange={(e) => setSpo2(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sleep">Sleep (hours)</Label>
          <Input id="sleep" type="number" step="0.5" inputMode="decimal" value={sleep} onChange={(e) => setSleep(e.target.value)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Activity level</Label>
        <div className="flex gap-2">
          {ACTIVITIES.map((a) => (
            <button key={a} type="button" onClick={() => setActivity(a)}
              className={cn('flex-1 rounded-md border px-3 py-2 text-sm capitalize', activity === a && 'border-primary bg-accent')}>
              {a}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Diet today</Label>
        <div className="flex flex-wrap gap-2">
          {DIET.map((d) => (
            <button key={d} type="button" onClick={() => setDiet(d)}
              className={cn('rounded-full border px-3 py-1 text-sm', diet === d && 'border-primary bg-accent')}>
              {d.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Mood</Label>
        <div className="flex gap-2">
          {MOODS.map((m) => (
            <button key={m} type="button" onClick={() => setMood(m)}
              className={cn('flex-1 rounded-md border py-2 text-2xl', mood === m && 'border-primary bg-accent')}>
              {MOOD_LABEL[m]}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" size="lg" disabled={loading} className="w-full">
        {loading ? 'Saving…' : "Log Today's Vitals"}
      </Button>
    </form>
  );
}
