import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus, TrendingUp, FileText } from 'lucide-react';
import { requireRole } from '@/lib/auth/requireRole';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { analyzePatient } from '@/lib/services/analyze';
import { AppShell } from '@/components/AppShell';
import { VitalTile } from '@/components/dashboards/VitalTile';
import { StabilityFactors } from '@/components/dashboards/StabilityFactors';
import { NotificationDeliveryFeed } from '@/components/dashboards/NotificationDeliveryFeed';
import { HotlineCard } from '@/components/dashboards/HotlineCard';
import { CareActivityTable } from '@/components/dashboards/CareActivityTable';
import { AIDailySuggestion } from '@/components/dashboards/AIDailySuggestion';
import { DailyRoutineChecklist } from '@/components/dashboards/DailyRoutineChecklist';
import { ForecastChart } from '@/components/charts/ForecastChart';
import { CalendarTimeline } from '@/components/calendar/CalendarTimeline';
import { AlertCard } from '@/components/alerts/AlertCard';
import { LEVEL_LABEL, LEVEL_PRIORITY } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Alert, AlertLevel } from '@/types/domain';

// Always render fresh — every visit must reflect the latest log.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PatientDashboard() {
  const session = await requireRole('patient');

  // Admin client for all reads — auth has already happened in requireRole().
  const { data: patient } = await supabaseAdmin
    .from('patient')
    .select('*')
    .eq('user_id', session.user.id)
    .maybeSingle();
  if (!patient) redirect('/onboarding');

  // Run analysis live so forecast + SHAP are always available, even when stable.
  const analysis = await analyzePatient(patient.id);

  const [
    { data: lastVitals },
    { data: alerts },
    { data: medLogs },
    { data: meds }
  ] = await Promise.all([
    supabaseAdmin.from('vitals_log').select('*').eq('patient_id', patient.id).order('logged_at', { ascending: false }).limit(14),
    supabaseAdmin.from('alert').select('*').eq('patient_id', patient.id).eq('status', 'open').order('created_at', { ascending: false }).limit(3),
    supabaseAdmin.from('medication_log').select('*, medication:medication_id(name)').eq('patient_id', patient.id).order('logged_at', { ascending: false }).limit(5),
    supabaseAdmin.from('medication').select('id, name, dosage, frequency').eq('patient_id', patient.id)
  ]);

  const medications = (meds ?? []) as Array<{ id: string; name: string; dosage: string | null; frequency: string | null }>;
  const todayStr = new Date().toISOString().slice(0, 10);
  const vitalsLoggedToday = (lastVitals ?? []).some((v: any) => v.logged_at?.slice(0, 10) === todayStr);
  const conditions = ((patient as any).conditions ?? []) as string[];

  const vitals = (lastVitals ?? []) as any[];
  const latest = vitals[0];
  const openAlerts = (alerts ?? []) as Alert[];
  const topLevel = (analysis.level ?? openAlerts[0]?.level ?? 'stable') as AlertLevel;

  const baseline = analysis.baseline;
  const forecast = analysis.forecast;
  const shap = analysis.shap;

  // Build factors. If no shap (insufficient data), pass empty so UI shows "Not enough data yet".
  const factors = shap
    ? [
        {
          label: 'Vital Trend',
          value: shap.vital_change ?? 0,
          detail: shap.details?.vital_change ?? '',
          available: shap.available?.vital_change ?? true
        },
        {
          label: 'Medication Adherence',
          value: shap.medication ?? 0,
          detail: shap.details?.medication ?? '',
          available: shap.available?.medication ?? true
        },
        {
          label: 'Symptoms & Sleep',
          value: shap.lifestyle ?? 0,
          detail: shap.details?.lifestyle ?? '',
          available: shap.available?.lifestyle ?? true
        }
      ]
    : [];

  const activity = [
    ...vitals.slice(0, 3).map((v: any) => ({
      id: `v-${v.id}`,
      icon: 'heart' as const,
      type: `Vitals — ${v.bp_systolic ?? '—'}/${v.bp_diastolic ?? '—'} mmHg`,
      timestamp: v.logged_at,
      status: 'logged' as const
    })),
    ...((medLogs ?? []) as any[]).slice(0, 3).map((m) => ({
      id: `m-${m.id}`,
      icon: 'pill' as const,
      type: `${m.medication?.name ?? 'Medication'} — ${m.taken ? 'Taken' : 'Missed'}`,
      timestamp: m.logged_at,
      status: (m.taken ? 'confirmed' : 'missed') as 'confirmed' | 'missed'
    }))
  ]
    .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))
    .slice(0, 5);

  const userName = session.profile.full_name;

  // Build calendar data: logged days + level overlay (any open alert that day)
  const loggedAt = vitals.map((v: any) => v.logged_at);
  const levelByDay: Record<string, 'stable' | 'watch' | 'trend' | 'risk' | 'critical'> = {};
  for (const a of openAlerts) {
    const k = new Date(a.created_at).toISOString().slice(0, 10);
    levelByDay[k] = a.level;
  }

  // Personal-baseline band for hero strip
  const bpMean = baseline?.bp_systolic_mean ?? null;
  const bpStd = baseline?.bp_systolic_std ?? null;
  const baselineBpLabel =
    bpMean != null && bpStd != null
      ? `Your normal: ${bpMean.toFixed(0)} ± ${(1.5 * bpStd).toFixed(0)} mmHg`
      : null;

  return (
    <AppShell role="patient" user={{ name: userName }}>
      <div className="space-y-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{userName}</h1>
            <div className="mt-1.5 flex items-center gap-2 text-sm text-muted-foreground">
              <span className={cn('h-2 w-2 rounded-full', `bg-status-${topLevel}`)} />
              <span>
                {topLevel === 'stable'
                  ? 'Active Monitoring — All vitals on track'
                  : `${LEVEL_LABEL[topLevel as string]} — review alerts below`}
              </span>
            </div>
            {baselineBpLabel && (
              <p className="mt-1 text-xs text-muted-foreground">
                {baselineBpLabel} <span className="opacity-60">· based on last {baseline?.data_points_count ?? 0} entries</span>
              </p>
            )}
            {analysis.insufficientData && (
              <p className="mt-1 text-xs text-amber-600">
                Log {analysis.insufficientData.required - analysis.insufficientData.current} more day(s) to unlock forecast & insights.
              </p>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3 lg:gap-3">
            <VitalTile
              label="BP (mmHg)"
              value={latest?.bp_systolic && latest?.bp_diastolic ? `${latest.bp_systolic}/${latest.bp_diastolic}` : '—'}
              tone={latest?.bp_systolic && latest.bp_systolic >= 160 ? 'bad' : latest?.bp_systolic && latest.bp_systolic >= 140 ? 'warn' : 'default'}
            />
            <VitalTile
              label="Glucose"
              value={latest?.glucose_mgdl?.toString() ?? '—'}
              unit="mg/dL"
              tone={latest?.glucose_mgdl && latest.glucose_mgdl >= 250 ? 'bad' : latest?.glucose_mgdl && latest.glucose_mgdl >= 180 ? 'warn' : 'default'}
            />
            <VitalTile
              label="SpO₂"
              value={latest?.spo2 ? `${latest.spo2}%` : '—'}
              tone={latest?.spo2 && latest.spo2 < 92 ? 'bad' : latest?.spo2 && latest.spo2 < 95 ? 'warn' : 'good'}
            />
          </div>
        </div>

        <CalendarTimeline loggedAt={loggedAt} levelByDay={levelByDay} days={30} />

        <div className="flex flex-wrap gap-3">
          <Link
            href="/patient/log"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Log Today's Vitals
          </Link>
          <Link
            href="/patient/trends"
            className="inline-flex items-center gap-2 rounded-lg border bg-card px-5 py-3 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted"
          >
            <TrendingUp className="h-4 w-4" /> View Trends
          </Link>
          <Link
            href="/patient/report"
            className="inline-flex items-center gap-2 rounded-lg border bg-card px-5 py-3 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted"
          >
            <FileText className="h-4 w-4" /> Emergency Report
          </Link>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">72-Hour Vital Forecast</h2>
                  <p className="text-xs text-muted-foreground">Personal-baseline anomaly model</p>
                </div>
                {forecast && (
                  <div className="text-right">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Predicted
                    </div>
                    <div className="text-lg font-bold">{forecast.predicted.toFixed(0)} mmHg</div>
                  </div>
                )}
              </div>
              <ForecastChart
                history={vitals.slice().reverse()}
                forecast={forecast}
                baseline={bpMean != null && bpStd != null ? { mean: bpMean, std: bpStd } : null}
              />
            </div>

            {openAlerts.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Active Alerts
                </h2>
                {openAlerts
                  .sort((a, b) => (LEVEL_PRIORITY[b.level] ?? 0) - (LEVEL_PRIORITY[a.level] ?? 0))
                  .map((a) => (
                    <AlertCard key={a.id} alert={a} />
                  ))}
              </div>
            )}

            <CareActivityTable items={activity} />
          </div>

          <div className="space-y-5">
            <AIDailySuggestion patientId={patient.id} />
            <DailyRoutineChecklist
              patientId={patient.id}
              medications={medications}
              vitalsLoggedToday={vitalsLoggedToday}
              conditions={conditions}
            />
            <StabilityFactors factors={factors} />
            <NotificationDeliveryFeed />
            <HotlineCard patientId={patient.id} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
