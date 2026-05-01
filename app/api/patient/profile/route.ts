import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const Body = z.object({
  full_name: z.string().min(1).max(120).optional(),
  phone: z.string().max(40).optional().nullable(),
  age: z.number().int().min(0).max(130).optional(),
  sex: z.enum(['M', 'F', 'Other']).optional(),
  conditions: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  emergency_contact_name: z.string().max(120).optional().nullable(),
  emergency_contact_phone: z.string().max(40).optional().nullable(),
  address: z.string().max(300).optional().nullable()
});

export async function PUT(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });
  }

  const profileFields: Record<string, any> = {};
  if (parsed.data.full_name !== undefined) profileFields.full_name = parsed.data.full_name;
  if (parsed.data.phone !== undefined) profileFields.phone = parsed.data.phone;

  const patientFields: Record<string, any> = {};
  for (const k of [
    'age',
    'sex',
    'conditions',
    'allergies',
    'emergency_contact_name',
    'emergency_contact_phone',
    'address'
  ] as const) {
    if (parsed.data[k] !== undefined) patientFields[k] = parsed.data[k];
  }

  if (Object.keys(profileFields).length > 0) {
    const { error } = await supabaseAdmin
      .from('user_profile')
      .update(profileFields)
      .eq('id', user.id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  if (Object.keys(patientFields).length > 0) {
    const { error } = await supabaseAdmin
      .from('patient')
      .update(patientFields)
      .eq('user_id', user.id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: null });
}
