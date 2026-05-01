import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/requireRole';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { AppShell } from '@/components/AppShell';
import { PatientStatusCard } from '@/components/dashboards/PatientStatusCard';
import { VitalTrendChart } from '@/components/charts/VitalTrendChart';
import { AlertCard } from '@/components/alerts/AlertCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { formatBP, formatGlucose } from '@/utils/vitalsFormat';
import { relTime } from '@/utils/dateFormat';
import { LEVEL_PRIORITY } from '@/lib/constants';
import type { Alert, AlertLevel } from '@/types/domain';

export default async function PatientDashboard() {
  const session = await requireRole('patient');
  const supabase = createClient();

  // Use admin to avoid RLS edge cases on the very first dashboard load.
  const { data: patient } = await supabaseAdmin
    .from('patient')
    .select('*')
    .eq('user_id', session.user.id)
    .maybeSingle();
  if (!patient) redirect('/onboarding');

  const [{ data: lastVitals }, { data: baseline }, { data: alerts }] = await Promise.all([
    supabase.from('vitals_log').select('*').eq('patient_id', patient.id).order('logged_at', { ascending: false }).limit(7),
    supabase.from('patient_baseline').select('*').eq('patient_id', patient.id).maybeSingle(),
    supabase.from('alert').select('*').eq('patient_id', patient.id).eq('status', 'open').order('created_at', { ascending: false }).limit(5)
  ]);

  const vitals = lastVitals ?? [];
  const latest = vitals[0];
  const openAlerts = (alerts ?? []) as Alert[];
  const topLevel: AlertLevel = openAlerts[0]?.level ?? 'stable';
  const streakDays = vitals.length;

  return (
    <AppShell role="patient">
      <div className="space-y-6">
        <PatientStatusCard
          level={topLevel}
          patientName={session.profile.full_name}
          subline={latest ? `Last logged ${relTime(latest.logged_at)}` : 'No vitals logged yet — start now.'}
        />

        <div className="flex justify-center">
          <Link href="/patient/log" className={buttonVariants({ size: 'xl' })}>
            Log Today's Vitals →
          </Link>
        </div>

        {openAlerts.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Active alerts</h2>
            {openAlerts
              .sort((a, b) => (LEVEL_PRIORITY[b.level] ?? 0) - (LEVEL_PRIORITY[a.level] ?? 0))
              .map((a) => (
                <AlertCard key={a.id} alert={a} />
              ))}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <Stat label="Latest BP" value={latest ? formatBP(latest.bp_systolic, latest.bp_diastolic) : '—'} sub={baseline?.bp_systolic_mean ? `Your normal: ${baseline.bp_systolic_mean.toFixed(0)}/${baseline.bp_diastolic_mean?.toFixed(0) ?? '—'}` : undefined} />
          <Stat label="Latest glucose" value={latest ? formatGlucose(latest.glucose_mgdl) : '—'} sub={baseline?.glucose_mean ? `Your normal: ${baseline.glucose_mean.toFixed(0)} mg/dL` : undefined} />
          <Stat label="Streak" value={`${streakDays} days`} sub="Days logged in last 7" />
        </div>

        {vitals.length >= 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent trend</CardTitle>
            </CardHeader>
            <CardContent>
              <VitalTrendChart
                data={vitals.slice().reverse()}
                baselineMean={baseline?.bp_systolic_mean ?? null}
                baselineStd={baseline?.bp_systolic_std ?? null}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

const Stat = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <Card>
    <CardContent className="p-6">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </CardContent>
  </Card>
);
