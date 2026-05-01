import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

async function getPatientForCaller(userId: string) {
  const { data } = await supabaseAdmin.from('patient').select('id').eq('user_id', userId).maybeSingle();
  return (data as any)?.id as string | undefined;
}

// GET — list active medications for the calling patient
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const patientId = await getPatientForCaller(user.id);
  if (!patientId) return NextResponse.json({ ok: false, error: 'no patient profile' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('medication')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}

// POST — add medication
const PostBody = z.object({
  name: z.string().min(1).max(80),
  dosage: z.string().max(50).optional().nullable(),
  frequency: z.string().max(50).optional().nullable()
});

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const parsed = PostBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });

  const patientId = await getPatientForCaller(user.id);
  if (!patientId) return NextResponse.json({ ok: false, error: 'no patient profile' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('medication')
    .insert({
      patient_id: patientId,
      name: parsed.data.name,
      dosage: parsed.data.dosage ?? null,
      frequency: parsed.data.frequency ?? null,
      active: true
    })
    .select()
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}

// PATCH — toggle active / rename
const PatchBody = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(80).optional(),
  dosage: z.string().max(50).nullable().optional(),
  frequency: z.string().max(50).nullable().optional(),
  active: z.boolean().optional()
});

export async function PATCH(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const parsed = PatchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });

  const patientId = await getPatientForCaller(user.id);
  if (!patientId) return NextResponse.json({ ok: false, error: 'no patient profile' }, { status: 400 });

  const { id, ...patch } = parsed.data;

  // verify ownership
  const { data: existing } = await supabaseAdmin
    .from('medication')
    .select('patient_id')
    .eq('id', id)
    .maybeSingle();
  if (!existing || (existing as any).patient_id !== patientId) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from('medication')
    .update(patch as any)
    .eq('id', id)
    .select()
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}

// DELETE — remove medication
const DelBody = z.object({ id: z.string().uuid() });
export async function DELETE(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const parsed = DelBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });

  const patientId = await getPatientForCaller(user.id);
  if (!patientId) return NextResponse.json({ ok: false, error: 'no patient profile' }, { status: 400 });

  const { data: existing } = await supabaseAdmin
    .from('medication')
    .select('patient_id')
    .eq('id', parsed.data.id)
    .maybeSingle();
  if (!existing || (existing as any).patient_id !== patientId) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  await supabaseAdmin.from('medication').delete().eq('id', parsed.data.id);
  return NextResponse.json({ ok: true, data: null });
}
