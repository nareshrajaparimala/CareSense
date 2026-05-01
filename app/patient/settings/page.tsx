import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/requireRole';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { AppShell } from '@/components/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CaregiverInviteForm, type CaregiverItem } from '@/components/patient/CaregiverInviteForm';

export const dynamic = 'force-dynamic';

export default async function PatientSettings() {
  const session = await requireRole('patient');

  const { data: patient } = await supabaseAdmin
    .from('patient')
    .select('id, conditions, allergies, age, sex, address')
    .eq('user_id', session.user.id)
    .maybeSingle();
  if (!patient) redirect('/onboarding');

  const { data: links } = await supabaseAdmin
    .from('caregiver_link')
    .select('id, caregiver_id, relationship')
    .eq('patient_id', (patient as any).id);

  const caregivers: CaregiverItem[] = await Promise.all(
    ((links ?? []) as any[]).map(async (l) => {
      const { data: profile } = await supabaseAdmin
        .from('user_profile')
        .select('full_name')
        .eq('id', l.caregiver_id)
        .maybeSingle();
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(l.caregiver_id);
      return {
        link_id: l.id,
        caregiver_id: l.caregiver_id,
        caregiver_name: (profile as any)?.full_name ?? 'Caregiver',
        caregiver_email: authUser?.user?.email ?? '',
        relationship: l.relationship ?? null
      };
    })
  );

  return (
    <AppShell role="patient" title="Settings" user={{ name: session.profile.full_name }}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Clinical details used to tailor alerts and forecasts.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-y-3 text-sm sm:grid-cols-3">
              <Item label="Name" value={session.profile.full_name} />
              <Item label="Age" value={String((patient as any).age)} />
              <Item label="Sex" value={(patient as any).sex ?? '—'} />
              <Item label="Conditions" value={((patient as any).conditions ?? []).join(', ') || '—'} />
              <Item label="Allergies" value={((patient as any).allergies ?? []).join(', ') || '—'} />
              <Item label="Location" value={(patient as any).address ?? '—'} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Caregivers</CardTitle>
            <CardDescription>
              People who can monitor your status. They must already have a CareSense account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CaregiverInviteForm caregivers={caregivers} />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
