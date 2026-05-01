import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/requireRole';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { AppShell } from '@/components/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HealthStatsPanel } from '@/components/dashboards/HealthStatsPanel';
import { CalendarTimeline } from '@/components/calendar/CalendarTimeline';
import { formatBP, formatGlucose, formatHR } from '@/utils/vitalsFormat';
import { relTime } from '@/utils/dateFormat';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function TrendsPage() {
  const session = await requireRole('patient');
  const { data: patient } = await supabaseAdmin
    .from('patient')
    .select('id')
    .eq('user_id', session.user.id)
    .maybeSingle();
  if (!patient) redirect('/onboarding');

  const { data: vitals } = await supabaseAdmin
    .from('vitals_log')
    .select('*')
    .eq('patient_id', patient.id)
    .order('logged_at', { ascending: true })
    .limit(30);

  const rows = (vitals ?? []) as any[];
  const hasAnyVital = (v: any) =>
    v.bp_systolic != null ||
    v.bp_diastolic != null ||
    v.glucose_mgdl != null ||
    v.heart_rate != null ||
    v.spo2 != null ||
    v.sleep_hours != null ||
    v.mood != null;
  const recent = rows.slice().reverse().filter(hasAnyVital);

  return (
    <AppShell role="patient" title="Trends" user={{ name: session.profile.full_name }}>
      <div className="space-y-6">
        <CalendarTimeline loggedAt={rows.map((r) => r.logged_at)} days={30} />

        {rows.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No vitals logged yet. Once you log a few entries, trends will appear here.
            </CardContent>
          </Card>
        ) : (
          <>
            <HealthStatsPanel rows={rows} />

            <Card>
              <CardHeader>
                <CardTitle>Recent entries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="py-2 text-left">When</th>
                        <th className="py-2 text-left">BP</th>
                        <th className="py-2 text-left">Glucose</th>
                        <th className="py-2 text-left">HR</th>
                        <th className="py-2 text-left">Sleep</th>
                        <th className="py-2 text-left">Mood</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recent.map((v) => (
                        <tr key={v.id} className="border-b last:border-b-0">
                          <td className="py-2 text-muted-foreground">{relTime(v.logged_at)}</td>
                          <td className="py-2">{formatBP(v.bp_systolic, v.bp_diastolic)}</td>
                          <td className="py-2">{formatGlucose(v.glucose_mgdl)}</td>
                          <td className="py-2">{formatHR(v.heart_rate)}</td>
                          <td className="py-2">{v.sleep_hours != null ? `${v.sleep_hours} h` : '—'}</td>
                          <td className="py-2">{v.mood ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}
