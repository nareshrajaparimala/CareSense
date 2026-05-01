import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/getSession';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { OnboardingForm } from '@/components/auth/OnboardingForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session?.user) redirect('/login');

  // Onboarding is complete only when:
  //  - profile exists, AND
  //  - if role is 'patient', a patient row also exists.
  // (caregiver / doctor only need user_profile.)
  if (session.profile) {
    if (session.role === 'patient') {
      const { data: patientRow } = await supabaseAdmin
        .from('patient')
        .select('id')
        .eq('user_id', session.user.id)
        .maybeSingle();
      if (patientRow) redirect('/patient/dashboard');
      // else fall through and render the form so the user can finish.
    } else if (session.role === 'caregiver') {
      redirect('/caregiver/home');
    } else if (session.role === 'doctor') {
      redirect('/doctor/dashboard');
    }
  }

  const incompletePatient = !!session.profile && session.role === 'patient';

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Welcome to CareSense</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {incompletePatient
              ? 'Just a few clinical details to finish setting up your patient profile.'
              : 'Tell us who you are to set up your account.'}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{incompletePatient ? 'Patient profile' : 'I am a…'}</CardTitle>
            <CardDescription>
              {incompletePatient
                ? 'Your account is ready — please add your age, sex, and conditions.'
                : 'Choose the role that fits you best. You can change this later.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OnboardingForm
              userId={session.user.id}
              email={session.user.email ?? ''}
              prefillRole={incompletePatient ? 'patient' : null}
              prefillName={session.profile?.full_name ?? ''}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
