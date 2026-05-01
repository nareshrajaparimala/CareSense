import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/requireRole';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DailyLogForm } from '@/components/forms/DailyLogForm';

export default async function LogPage() {
  const session = await requireRole('patient');
  const supabase = createClient();
  const { data: patient } = await supabase
    .from('patient')
    .select('id')
    .eq('user_id', session.user.id)
    .maybeSingle();
  if (!patient) redirect('/onboarding');

  return (
    <AppShell role="patient" title="Log today">
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>Daily log</CardTitle>
          <CardDescription>Takes about 30 seconds. All fields optional except mood.</CardDescription>
        </CardHeader>
        <CardContent>
          <DailyLogForm patientId={patient.id} />
        </CardContent>
      </Card>
    </AppShell>
  );
}
