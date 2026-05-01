import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/requireRole';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/AppShell';
import { PatientStatusCard } from '@/components/dashboards/PatientStatusCard';
import { AlertCard } from '@/components/alerts/AlertCard';
import { VitalTrendChart } from '@/components/charts/VitalTrendChart';
import { ForecastChart } from '@/components/charts/ForecastChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import type { Alert, AlertLevel } from '@/types/domain';

export default async function CaregiverPatientPage({ params }: { params: { id: string } }) {
  await requireRole('caregiver', 'doctor');
  const supabase = createClient();
  const patientId = params.id;

  const [{ data: patient }, { data: profile }, { data: vitals }, { data: baseline }, { data: alerts }] =
    await Promise.all([
      supabase.from('patient').select('*').eq('id', patientId).maybeSingle(),
      supabase
        .from('caregiver_link')
        .select('relationship, patient:patient_id(user_profile:user_id(full_name))')
        .eq('patient_id', patientId)
        .maybeSingle(),
      supabase.from('vitals_log').select('*').eq('patient_id', patientId).order('logged_at', { ascending: true }).limit(30),
      supabase.from('patient_baseline').select('*').eq('patient_id', patientId).maybeSingle(),
      supabase.from('alert').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }).limit(10)
    ]);

  if (!patient) notFound();

  const openAlert = ((alerts ?? []) as Alert[]).find((a) => a.status === 'open') ?? null;
  const level: AlertLevel = openAlert?.level ?? 'stable';
  const patientName = (profile as any)?.patient?.user_profile?.full_name ?? 'Patient';

  return (
    <AppShell role="caregiver" title={patientName}>
      <div className="space-y-6">
        <PatientStatusCard level={level} patientName={patientName} subline={patient.conditions?.join(' + ')} />

        {level === 'critical' && (
          <div className="flex justify-end">
            <Link href={`/emergency/${patientId}`} className={buttonVariants({ variant: 'destructive', size: 'lg' })}>
              View Emergency Brief →
            </Link>
          </div>
        )}

        {openAlert && <AlertCard alert={openAlert} />}

        {openAlert?.forecast_72hr && (
          <Card>
            <CardHeader>
              <CardTitle>72-hour forecast</CardTitle>
            </CardHeader>
            <CardContent>
              <ForecastChart history={vitals ?? []} forecast={openAlert.forecast_72hr} />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>30-day BP trend with personal baseline</CardTitle>
          </CardHeader>
          <CardContent>
            <VitalTrendChart
              data={vitals ?? []}
              baselineMean={baseline?.bp_systolic_mean ?? null}
              baselineStd={baseline?.bp_systolic_std ?? null}
              height={320}
            />
          </CardContent>
        </Card>

        {((alerts ?? []) as Alert[]).filter((a) => a.id !== openAlert?.id).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Alert history</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {((alerts ?? []) as Alert[])
                .filter((a) => a.id !== openAlert?.id)
                .map((a) => (
                  <div key={a.id} className="flex items-center justify-between border-b py-2 text-sm last:border-b-0">
                    <span>{a.title}</span>
                    <span className="text-xs text-muted-foreground">{a.status} · {new Date(a.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
