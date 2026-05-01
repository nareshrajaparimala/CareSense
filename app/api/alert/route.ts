import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import type { ApiResp } from '@/types/api';

const PatchBody = z.object({
  alert_id: z.string().uuid(),
  status: z.enum(['acknowledged', 'resolved'])
});

export async function PATCH(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json<ApiResp<null>>({ ok: false, error: 'unauthorized' }, { status: 401 });

  const parsed = PatchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json<ApiResp<null>>({ ok: false, error: parsed.error.message }, { status: 400 });
  }

  const { error } = await supabase
    .from('alert')
    .update({
      status: parsed.data.status,
      acknowledged_by: user.id,
      acknowledged_at: new Date().toISOString()
    })
    .eq('id', parsed.data.alert_id);

  if (error) return NextResponse.json<ApiResp<null>>({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json<ApiResp<null>>({ ok: true, data: null });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const patientId = url.searchParams.get('patient_id');
  if (!patientId) return NextResponse.json({ ok: false, error: 'patient_id required' }, { status: 400 });

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('alert')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}
