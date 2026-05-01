import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/requireRole';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { AppShell } from '@/components/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DailyLogForm, type MedOption } from '@/components/forms/DailyLogForm';

export const dynamic = 'force-dynamic';

export default async function LogPage() {
  const session = await requireRole('patient');
  const { data: patient } = await supabaseAdmin
    .from('patient')
    .select('id')
    .eq('user_id', session.user.id)
    .maybeSingle();
  if (!patient) redirect('/onboarding');

  const { data: meds } = await supabaseAdmin
    .from('medication')
    .select('id, name, dosage, frequency')
    .eq('patient_id', (patient as any).id)
    .eq('active', true)
    .order('created_at', { ascending: true });

  return (
    <AppShell role="patient" title="Log Today's Vitals" user={{ name: session.profile.full_name }}>
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>Daily log</CardTitle>
          <CardDescription>
            Takes about 30 seconds.{' '}
            {((meds ?? []) as any[]).length === 0 && (
              <>
                No medications added yet —{' '}
                <Link href="/patient/meds" className="underline">add some</Link> to track adherence.
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DailyLogForm patientId={(patient as any).id} medications={(meds ?? []) as MedOption[]} />
        </CardContent>
      </Card>
    </AppShell>
  );
}
