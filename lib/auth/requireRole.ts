import 'server-only';
import { redirect } from 'next/navigation';
import { getSession } from './getSession';
import type { Role } from '@/types/domain';

export async function requireRole(...allowed: Role[]) {
  const session = await getSession();
  if (!session?.user) redirect('/login');
  if (!session.profile) redirect('/onboarding');
  if (!allowed.includes(session.role as Role)) redirect('/login');
  return session as { user: NonNullable<typeof session.user>; profile: NonNullable<typeof session.profile>; role: Role };
}
