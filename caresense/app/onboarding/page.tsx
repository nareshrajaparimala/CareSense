import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/getSession';
import { OnboardingForm } from '@/components/auth/OnboardingForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session?.user) redirect('/login');
  if (session.profile) {
    const dest =
      session.role === 'patient' ? '/patient/dashboard'
      : session.role === 'caregiver' ? '/caregiver/home'
      : '/doctor/dashboard';
    redirect(dest);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Welcome to CareSense</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tell us who you are to set up your account.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>I am a…</CardTitle>
            <CardDescription>Choose the role that fits you best. You can change this later.</CardDescription>
          </CardHeader>
          <CardContent>
            <OnboardingForm userId={session.user.id} email={session.user.email ?? ''} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
