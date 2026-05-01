import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/getSession';
import { Splash } from '@/components/Splash';

export default async function Landing() {
  const session = await getSession();

  if (session?.role) {
    const dest =
      session.role === 'patient' ? '/patient/dashboard'
      : session.role === 'caregiver' ? '/caregiver/home'
      : session.role === 'doctor' ? '/doctor/dashboard'
      : '/onboarding';
    redirect(dest);
  }

  if (session && !session.role) {
    redirect('/onboarding');
  }

  return <Splash redirectTo="/login" />;
}
