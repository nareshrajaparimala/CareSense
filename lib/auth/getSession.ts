import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Role } from '@/types/domain';

export async function getSession() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Profile lookup uses admin to avoid RLS / cookie-timing edge cases.
  const { data: profile } = await supabaseAdmin
    .from('user_profile')
    .select('id, full_name, role, phone')
    .eq('id', user.id)
    .maybeSingle();

  return {
    user,
    profile,
    role: ((profile as any)?.role ?? null) as Role | null
  };
}
