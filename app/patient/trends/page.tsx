import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/requireRole';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VitalTrendChart } from '@/components/charts/VitalTrendChart';

export default async function TrendsPage() {
  const session = await requireRole('patient');
  const supabase = createClient();
  const { data: patient } = await supabase
    .from('patient')
    .select('id')
    .eq('user_id', session.user.id)
    .maybeSingle();
  if (!patient) redirect('/onboarding');

  const [{ data: vitals }, { data: baseline }] = await Promise.all([
    supabase.from('vitals_log').select('*').eq('patient_id', patient.id).order('logged_at', { ascending: true }).limit(30),
    supabase.from('patient_baseline').select('*').eq('patient_id', patient.id).maybeSingle()
  ]);

  return (
    <AppShell role="patient" title="Trends">
      <Card>
        <CardHeader>
          <CardTitle>Last 30 days</CardTitle>
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
    </AppShell>
  );
}
