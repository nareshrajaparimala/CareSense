import { requireRole } from '@/lib/auth/requireRole';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/AppShell';
import { DoctorPatientRow } from '@/components/dashboards/DoctorPatientRow';
import { Card, CardContent } from '@/components/ui/card';
import { LEVEL_PRIORITY } from '@/lib/constants';
import type { AlertLevel } from '@/types/domain';

export default async function DoctorDashboard() {
  await requireRole('doctor');
  const supabase = createClient();

  const { data: patients } = await supabase
    .from('patient')
    .select('id, age, sex, conditions, user_profile:user_id(full_name)')
    .limit(100);

  const enriched = await Promise.all(
    ((patients ?? []) as any[]).map(async (p) => {
      const [{ data: alerts }, { data: lastVitals }] = await Promise.all([
        supabase.from('alert').select('level, status').eq('patient_id', p.id).eq('status', 'open').order('created_at', { ascending: false }).limit(1),
        supabase.from('vitals_log').select('logged_at').eq('patient_id', p.id).order('logged_at', { ascending: false }).limit(1).maybeSingle()
      ]);
      const level: AlertLevel = (alerts ?? [])[0]?.level ?? 'stable';
      return {
        id: p.id,
        name: p.user_profile?.full_name ?? 'Patient',
        age: p.age,
        sex: p.sex ?? '?',
        conditions: p.conditions ?? [],
        level,
        lastLoggedAt: (lastVitals as any)?.logged_at ?? null
      };
    })
  );

  enriched.sort((a, b) => (LEVEL_PRIORITY[b.level] ?? 0) - (LEVEL_PRIORITY[a.level] ?? 0));

  return (
    <AppShell role="doctor" title="Triage">
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-12 gap-2 border-b pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <div className="col-span-4">Patient</div>
            <div className="col-span-1">Age/Sex</div>
            <div className="col-span-4">Conditions</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1 text-right">Last log</div>
          </div>
          <div className="mt-2 space-y-2">
            {enriched.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">No patients yet.</p>
            ) : (
              enriched.map((row) => <DoctorPatientRow key={row.id} {...row} />)
            )}
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
