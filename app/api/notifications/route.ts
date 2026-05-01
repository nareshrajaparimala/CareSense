import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export type NotificationItem = {
  id: string;
  kind: 'caregiver_invite' | 'invite_accepted' | 'invite_declined';
  title: string;
  message: string;
  created_at: string;
  unread: boolean;
  link_id?: string;
  patient_id?: string;
};

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from('user_profile')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  const role = (profile as any)?.role ?? null;

  const items: NotificationItem[] = [];

  if (role === 'caregiver') {
    const { data: pending } = await supabaseAdmin
      .from('caregiver_link')
      .select('id, patient_id, relationship, created_at, status')
      .eq('caregiver_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    for (const link of (pending ?? []) as any[]) {
      const { data: pat } = await supabaseAdmin
        .from('patient')
        .select('user_id')
        .eq('id', link.patient_id)
        .maybeSingle();
      const userId = (pat as any)?.user_id;
      const { data: prof } = userId
        ? await supabaseAdmin.from('user_profile').select('full_name').eq('id', userId).maybeSingle()
        : { data: null };
      const name = (prof as any)?.full_name ?? 'A patient';
      items.push({
        id: `inv-${link.id}`,
        kind: 'caregiver_invite',
        title: 'New care request',
        message: `${name} invited you to monitor their health${link.relationship ? ` (${link.relationship})` : ''}.`,
        created_at: link.created_at,
        unread: true,
        link_id: link.id,
        patient_id: link.patient_id
      });
    }
  }

  if (role === 'patient') {
    const { data: patient } = await supabaseAdmin
      .from('patient')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (patient) {
      const { data: links } = await supabaseAdmin
        .from('caregiver_link')
        .select('id, caregiver_id, status, created_at')
        .eq('patient_id', (patient as any).id)
        .in('status', ['accepted', 'declined'])
        .order('created_at', { ascending: false })
        .limit(10);

      for (const l of (links ?? []) as any[]) {
        const { data: prof } = await supabaseAdmin
          .from('user_profile')
          .select('full_name')
          .eq('id', l.caregiver_id)
          .maybeSingle();
        const name = (prof as any)?.full_name ?? 'Your caregiver';
        items.push({
          id: `lnk-${l.id}`,
          kind: l.status === 'accepted' ? 'invite_accepted' : 'invite_declined',
          title: l.status === 'accepted' ? 'Caregiver accepted' : 'Caregiver declined',
          message:
            l.status === 'accepted'
              ? `${name} accepted your invite and can now monitor your health.`
              : `${name} declined your invite.`,
          created_at: l.created_at,
          unread: false,
          link_id: l.id
        });
      }
    }
  }

  return NextResponse.json({ ok: true, data: items });
}
