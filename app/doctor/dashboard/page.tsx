import { requireRole } from '@/lib/auth/requireRole';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { AppShell } from '@/components/AppShell';
import { DoctorPatientRow } from '@/components/dashboards/DoctorPatientRow';
import { Card, CardContent } from '@/components/ui/card';
import { LEVEL_PRIORITY } from '@/lib/constants';
import type { AlertLevel } from '@/types/domain';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DoctorDashboard() {
  const session = await requireRole('doctor');

  const { data: patients } = await supabaseAdmin
    .from('patient')
    .select('id, age, sex, conditions, user_id')
    .limit(100);

  const enriched = await Promise.all(
    ((patients ?? []) as any[]).map(async (p) => {
      const [{ data: profile }, { data: alerts }, { data: lastVitals }] = await Promise.all([
        p.user_id
          ? supabaseAdmin.from('user_profile').select('full_name').eq('id', p.user_id).maybeSingle()
          : Promise.resolve({ data: null as any }),
        supabaseAdmin
          .from('alert')
          .select('level, status')
          .eq('patient_id', p.id)
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(1),
        supabaseAdmin
          .from('vitals_log')
          .select('logged_at')
          .eq('patient_id', p.id)
          .order('logged_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      ]);
      const level: AlertLevel = (alerts as any[] | null)?.[0]?.level ?? 'stable';
      return {
        id: p.id,
        name: (profile as any)?.full_name ?? 'Patient',
        age: p.age,
        sex: p.sex ?? '?',
        conditions: p.conditions ?? [],
        level,
        lastLoggedAt: (lastVitals as any)?.logged_at ?? null
      };
    })
  );

  enriched.sort((a, b) => (LEVEL_PRIORITY[b.level] ?? 0) - (LEVEL_PRIORITY[a.level] ?? 0));

  const counts = {
    critical: enriched.filter((p) => p.level === 'critical').length,
    risk: enriched.filter((p) => p.level === 'risk').length,
    trend: enriched.filter((p) => p.level === 'trend').length,
    watch: enriched.filter((p) => p.level === 'watch').length,
    stable: enriched.filter((p) => p.level === 'stable').length
  };

  return (
    <AppShell role="doctor" title="Triage Queue" user={{ name: session.profile.full_name }}>
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <CountTile label="Critical" value={counts.critical} color="bg-status-critical" />
          <CountTile label="Risk" value={counts.risk} color="bg-status-risk" />
          <CountTile label="Trend" value={counts.trend} color="bg-status-trend" />
          <CountTile label="Watch" value={counts.watch} color="bg-status-watch" />
          <CountTile label="Stable" value={counts.stable} color="bg-status-stable" />
        </div>

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
      </div>
    </AppShell>
  );
}

function CountTile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}
