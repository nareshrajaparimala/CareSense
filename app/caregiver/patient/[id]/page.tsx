import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/requireRole';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { AppShell } from '@/components/AppShell';
import { PatientStatusCard } from '@/components/dashboards/PatientStatusCard';
import { AlertCard } from '@/components/alerts/AlertCard';
import { VitalTrendChart } from '@/components/charts/VitalTrendChart';
import { ForecastChart } from '@/components/charts/ForecastChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { ClearHistoryButton } from '@/components/doctor/ClearHistoryButton';
import type { Alert, AlertLevel } from '@/types/domain';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CaregiverPatientPage({ params }: { params: { id: string } }) {
  const session = await requireRole('caregiver', 'doctor');
  const patientId = params.id;

  // Authorization: caregivers must be linked to this patient. Doctors see all.
  if (session.role === 'caregiver') {
    const { data: link } = await supabaseAdmin
      .from('caregiver_link')
      .select('id, status')
      .eq('caregiver_id', session.user.id)
      .eq('patient_id', patientId)
      .maybeSingle();
    if (!link || (link as any).status !== 'accepted') redirect('/caregiver/home');
  }

  const [{ data: patient }, { data: vitals }, { data: baseline }, { data: alerts }] = await Promise.all([
    supabaseAdmin.from('patient').select('*').eq('id', patientId).maybeSingle(),
    supabaseAdmin.from('vitals_log').select('*').eq('patient_id', patientId).order('logged_at', { ascending: true }).limit(30),
    supabaseAdmin.from('patient_baseline').select('*').eq('patient_id', patientId).maybeSingle(),
    supabaseAdmin.from('alert').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }).limit(10)
  ]);

  if (!patient) notFound();

  const { data: profile } = (patient as any).user_id
    ? await supabaseAdmin.from('user_profile').select('full_name').eq('id', (patient as any).user_id).maybeSingle()
    : { data: null as any };

  const openAlert = ((alerts ?? []) as Alert[]).find((a) => a.status === 'open') ?? null;
  const level: AlertLevel = openAlert?.level ?? 'stable';
  const patientName = profile?.full_name ?? 'Patient';

  return (
    <AppShell
      role={session.role === 'doctor' ? 'doctor' : 'caregiver'}
      title={patientName}
      user={{ name: session.profile.full_name }}
    >
      <div className="space-y-6">
        <PatientStatusCard
          level={level}
          patientName={patientName}
          subline={(patient as any).conditions?.join(' + ')}
        />

        <div className="flex flex-wrap items-center justify-end gap-2">
          {(level === 'critical' || level === 'risk') && (
            <Link href={`/emergency/${patientId}`} className={buttonVariants({ variant: 'destructive', size: 'lg' })}>
              View Emergency Brief →
            </Link>
          )}
          {session.role === 'doctor' && (
            <ClearHistoryButton patientId={patientId} patientName={patientName} />
          )}
        </div>

        {openAlert && <AlertCard alert={openAlert} />}

        {openAlert?.forecast_72hr && (
          <Card>
            <CardHeader>
              <CardTitle>72-hour forecast</CardTitle>
            </CardHeader>
            <CardContent>
              <ForecastChart history={(vitals as any) ?? []} forecast={openAlert.forecast_72hr} />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>30-day BP trend with personal baseline</CardTitle>
          </CardHeader>
          <CardContent>
            {((vitals as any[]) ?? []).length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No vitals logged yet for this patient.
              </p>
            ) : (
              <VitalTrendChart
                data={(vitals as any) ?? []}
                baselineMean={baseline?.bp_systolic_mean ?? null}
                baselineStd={baseline?.bp_systolic_std ?? null}
                height={320}
              />
            )}
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
                    <span className="text-xs text-muted-foreground">
                      {a.status} · {new Date(a.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
