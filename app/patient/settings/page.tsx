import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/requireRole';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { AppShell } from '@/components/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CaregiverInviteForm, type CaregiverItem } from '@/components/patient/CaregiverInviteForm';
import { ProfileForm } from '@/components/patient/ProfileForm';

export const dynamic = 'force-dynamic';

export default async function PatientSettings() {
  const session = await requireRole('patient');

  const { data: patient } = await supabaseAdmin
    .from('patient')
    .select('id, conditions, allergies, age, sex, address, emergency_contact_name, emergency_contact_phone')
    .eq('user_id', session.user.id)
    .maybeSingle();
  if (!patient) redirect('/onboarding');

  const { data: userProfile } = await supabaseAdmin
    .from('user_profile')
    .select('phone')
    .eq('id', session.user.id)
    .maybeSingle();

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
            <ProfileForm
              initial={{
                full_name: session.profile.full_name,
                phone: (userProfile as any)?.phone ?? null,
                age: (patient as any).age ?? null,
                sex: (patient as any).sex ?? null,
                conditions: (patient as any).conditions ?? [],
                allergies: (patient as any).allergies ?? [],
                emergency_contact_name: (patient as any).emergency_contact_name ?? null,
                emergency_contact_phone: (patient as any).emergency_contact_phone ?? null,
                address: (patient as any).address ?? null
              }}
            />
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

