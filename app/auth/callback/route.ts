import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  if (!code) return NextResponse.redirect(new URL('/login', url));

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL('/login?error=auth', url));

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', url));

  // Bypass RLS for the profile lookup — we already verified the user above.
  // Using the user-scoped client here can race with the cookie write,
  // returning null and sending an existing user back to /onboarding.
  const { data: profile } = await supabaseAdmin
    .from('user_profile')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) return NextResponse.redirect(new URL('/onboarding', url));

  const role = (profile as any).role;
  const dest =
    role === 'patient'   ? '/patient/dashboard'
    : role === 'caregiver' ? '/caregiver/home'
    : role === 'doctor'    ? '/doctor/dashboard'
    : '/onboarding';

  return NextResponse.redirect(new URL(dest, url));
}
