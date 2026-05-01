import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const Body = z.object({
  caregiver_email: z.string().email(),
  relationship: z.string().max(40).optional()
});

const DeleteBody = z.object({ link_id: z.string().uuid() });

// POST: patient invites a caregiver by email.
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });
  }

  // Look up patient row owned by caller
  const { data: patient } = await supabaseAdmin
    .from('patient')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!patient) {
    return NextResponse.json({ ok: false, error: 'You must complete patient onboarding first.' }, { status: 400 });
  }

  // Look up caregiver auth user by email
  const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const caregiverUser = list.users.find((u) => u.email?.toLowerCase() === parsed.data.caregiver_email.toLowerCase());
  if (!caregiverUser) {
    return NextResponse.json(
      { ok: false, error: `No CareSense account found for ${parsed.data.caregiver_email}. Ask them to sign up first.` },
      { status: 404 }
    );
  }

  // Ensure caregiver has a user_profile with role='caregiver'
  const { data: caregiverProfile } = await supabaseAdmin
    .from('user_profile')
    .select('id, role')
    .eq('id', caregiverUser.id)
    .maybeSingle();

  if (!caregiverProfile) {
    await supabaseAdmin.from('user_profile').insert({
      id: caregiverUser.id,
      full_name: caregiverUser.user_metadata?.full_name ?? parsed.data.caregiver_email.split('@')[0],
      role: 'caregiver'
    });
  } else if ((caregiverProfile as any).role !== 'caregiver') {
    return NextResponse.json(
      { ok: false, error: `${parsed.data.caregiver_email} is registered as a ${(caregiverProfile as any).role}, not a caregiver.` },
      { status: 400 }
    );
  }

  // Insert link as pending — caregiver must accept before monitoring starts.
  const { data: link, error: linkErr } = await supabaseAdmin
    .from('caregiver_link')
    .upsert(
      {
        caregiver_id: caregiverUser.id,
        patient_id: (patient as any).id,
        relationship: parsed.data.relationship ?? null,
        status: 'pending'
      },
      { onConflict: 'caregiver_id,patient_id' }
    )
    .select('id, relationship, caregiver_id, status')
    .single();

  if (linkErr) return NextResponse.json({ ok: false, error: linkErr.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    data: {
      link_id: (link as any).id,
      caregiver_email: parsed.data.caregiver_email,
      relationship: (link as any).relationship
    }
  });
}

// DELETE: remove a caregiver link
export async function DELETE(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const parsed = DeleteBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });
  }

  // Verify ownership: link's patient must belong to caller
  const { data: link } = await supabaseAdmin
    .from('caregiver_link')
    .select('id, patient_id')
    .eq('id', parsed.data.link_id)
    .maybeSingle();
  if (!link) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });

  const { data: patient } = await supabaseAdmin
    .from('patient')
    .select('user_id')
    .eq('id', (link as any).patient_id)
    .maybeSingle();
  if (!patient || (patient as any).user_id !== user.id) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  await supabaseAdmin.from('caregiver_link').delete().eq('id', parsed.data.link_id);
  return NextResponse.json({ ok: true, data: null });
}
