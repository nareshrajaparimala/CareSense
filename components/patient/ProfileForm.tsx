'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type ProfileInitial = {
  full_name: string;
  phone: string | null;
  age: number | null;
  sex: 'M' | 'F' | 'Other' | null;
  conditions: string[];
  allergies: string[];
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  address: string | null;
};

export function ProfileForm({ initial }: { initial: ProfileInitial }) {
  const router = useRouter();
  const [edit, setEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: initial.full_name ?? '',
    phone: initial.phone ?? '',
    age: initial.age != null ? String(initial.age) : '',
    sex: (initial.sex ?? '') as '' | 'M' | 'F' | 'Other',
    conditions: (initial.conditions ?? []).join(', '),
    allergies: (initial.allergies ?? []).join(', '),
    emergency_contact_name: initial.emergency_contact_name ?? '',
    emergency_contact_phone: initial.emergency_contact_phone ?? '',
    address: initial.address ?? ''
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr(null);

    const body: Record<string, any> = {
      full_name: form.full_name.trim(),
      phone: form.phone.trim() || null,
      conditions: form.conditions
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      allergies: form.allergies
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      emergency_contact_name: form.emergency_contact_name.trim() || null,
      emergency_contact_phone: form.emergency_contact_phone.trim() || null,
      address: form.address.trim() || null
    };
    if (form.age) body.age = Number(form.age);
    if (form.sex) body.sex = form.sex;

    try {
      const res = await fetch('/api/patient/profile', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error ?? 'Save failed');
      setEdit(false);
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (!edit) {
    return (
      <div className="space-y-4">
        <dl className="grid grid-cols-1 gap-y-3 text-sm sm:grid-cols-2">
          <Item label="Name" value={initial.full_name} />
          <Item label="Phone" value={initial.phone ?? '—'} />
          <Item label="Age" value={initial.age != null ? String(initial.age) : '—'} />
          <Item label="Sex" value={initial.sex ?? '—'} />
          <Item label="Conditions" value={initial.conditions.join(', ') || '—'} />
          <Item label="Allergies" value={initial.allergies.join(', ') || '—'} />
          <Item label="Emergency contact" value={initial.emergency_contact_name ?? '—'} />
          <Item label="Emergency phone" value={initial.emergency_contact_phone ?? '—'} />
          <Item label="Address" value={initial.address ?? '—'} fullWidth />
        </dl>
        <Button type="button" variant="outline" size="sm" onClick={() => setEdit(true)}>
          Edit profile
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Full name">
          <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
        </Field>
        <Field label="Phone">
          <Input
            type="tel"
            placeholder="+1 555 555 0123"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </Field>
        <Field label="Age">
          <Input
            type="number"
            min={0}
            max={130}
            value={form.age}
            onChange={(e) => setForm({ ...form, age: e.target.value })}
          />
        </Field>
        <Field label="Sex">
          <select
            value={form.sex}
            onChange={(e) => setForm({ ...form, sex: e.target.value as any })}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="">—</option>
            <option value="M">M</option>
            <option value="F">F</option>
            <option value="Other">Other</option>
          </select>
        </Field>
        <Field label="Conditions (comma-separated)" full>
          <Input
            placeholder="hypertension, type 2 diabetes"
            value={form.conditions}
            onChange={(e) => setForm({ ...form, conditions: e.target.value })}
          />
        </Field>
        <Field label="Allergies (comma-separated)" full>
          <Input
            placeholder="penicillin, peanuts"
            value={form.allergies}
            onChange={(e) => setForm({ ...form, allergies: e.target.value })}
          />
        </Field>
        <Field label="Emergency contact name">
          <Input
            value={form.emergency_contact_name}
            onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })}
          />
        </Field>
        <Field label="Emergency contact phone">
          <Input
            type="tel"
            value={form.emergency_contact_phone}
            onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })}
          />
        </Field>
        <Field label="Address" full>
          <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </Field>
      </div>
      {err && <p className="text-sm text-destructive">{err}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        <Button type="button" variant="outline" onClick={() => setEdit(false)} disabled={saving}>Cancel</Button>
      </div>
    </form>
  );
}

function Item({ label, value, fullWidth }: { label: string; value: string; fullWidth?: boolean }) {
  return (
    <div className={fullWidth ? 'sm:col-span-2' : ''}>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={`space-y-1.5 ${full ? 'sm:col-span-2' : ''}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
