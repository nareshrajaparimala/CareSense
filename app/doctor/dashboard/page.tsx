import { requireRole } from '@/lib/auth/requireRole';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { analyzePatient } from '@/lib/services/analyze';
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
      const [{ data: profile }, { data: openAlerts }, { data: lastVitals }, analysis] = await Promise.all([
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
          .maybeSingle(),
        // Live re-analysis — guarantees the queue reflects current vitals,
        // not just whatever was last persisted in the alert table.
        analyzePatient(p.id).catch(() => null)
      ]);
      // Pick the highest level from: live analysis, persisted open alert, or stable.
      const persistedLevel: AlertLevel = (openAlerts as any[] | null)?.[0]?.level ?? 'stable';
      const liveLevel: AlertLevel = analysis?.level ?? 'stable';
      const level: AlertLevel =
        (LEVEL_PRIORITY[liveLevel] ?? 0) >= (LEVEL_PRIORITY[persistedLevel] ?? 0)
          ? liveLevel
          : persistedLevel;
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

  // Pull recent open alerts across all patients for the alert feed.
  const { data: rawAlerts } = await supabaseAdmin
    .from('alert')
    .select('id, patient_id, level, title, message, recommendation, created_at, status')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(20);

  const alertNameById = new Map(enriched.map((p) => [p.id, p.name]));
  const recentAlerts = (rawAlerts ?? []).map((a: any) => ({
    ...a,
    patient_name: alertNameById.get(a.patient_id) ?? 'Patient'
  }));

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

        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold">Recent Alerts</h2>
              <span className="text-xs text-muted-foreground">
                {recentAlerts.length} open across all patients
              </span>
            </div>
            {recentAlerts.length === 0 ? (
              <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                No open alerts. New alerts from any patient will appear here as they fire.
              </p>
            ) : (
              <ul className="divide-y">
                {recentAlerts.map((a: any) => (
                  <li key={a.id} className="flex items-start gap-3 py-3">
                    <span
                      className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-status-${a.level}`}
                      aria-label={a.level}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <a
                          href={`/caregiver/patient/${a.patient_id}`}
                          className="text-sm font-semibold hover:underline"
                        >
                          {a.patient_name}
                        </a>
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          {a.level} · {new Date(a.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm font-medium">{a.title}</p>
                      <p className="text-xs text-muted-foreground">{a.message}</p>
                      {a.recommendation && (
                        <p className="mt-1 text-xs italic text-muted-foreground">
                          → {a.recommendation}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
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
