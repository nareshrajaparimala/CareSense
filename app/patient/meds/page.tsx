import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/requireRole';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { AppShell } from '@/components/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MedicationManager, type MedicationItem } from '@/components/patient/MedicationManager';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MedsPage() {
  const session = await requireRole('patient');
  const { data: patient } = await supabaseAdmin
    .from('patient')
    .select('id')
    .eq('user_id', session.user.id)
    .maybeSingle();
  if (!patient) redirect('/onboarding');

  const { data: meds } = await supabaseAdmin
    .from('medication')
    .select('id, name, dosage, frequency, active')
    .eq('patient_id', (patient as any).id)
    .order('created_at', { ascending: false });

  return (
    <AppShell role="patient" title="Medications" user={{ name: session.profile.full_name }}>
      <Card>
        <CardHeader>
          <CardTitle>Manage medications</CardTitle>
          <CardDescription>
            Add or remove medications. They appear on the daily log so you can track adherence.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MedicationManager medications={(meds ?? []) as MedicationItem[]} />
        </CardContent>
      </Card>
    </AppShell>
  );
}
