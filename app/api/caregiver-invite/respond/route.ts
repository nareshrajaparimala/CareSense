import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const Body = z.object({
  link_id: z.string().uuid(),
  action: z.enum(['accept', 'decline'])
});

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });
  }

  const { data: link } = await supabaseAdmin
    .from('caregiver_link')
    .select('id, caregiver_id, status')
    .eq('id', parsed.data.link_id)
    .maybeSingle();

  if (!link) return NextResponse.json({ ok: false, error: 'invite not found' }, { status: 404 });
  if ((link as any).caregiver_id !== user.id) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  const status = parsed.data.action === 'accept' ? 'accepted' : 'declined';
  const { error } = await supabaseAdmin
    .from('caregiver_link')
    .update({ status })
    .eq('id', parsed.data.link_id);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data: { status } });
}
