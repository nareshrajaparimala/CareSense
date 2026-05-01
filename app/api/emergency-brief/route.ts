import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { buildEmergencyBrief } from '@/lib/services/emergency-brief';
import type { ApiResp, EmergencyBriefResp } from '@/types/api';

const Query = z.object({ patient_id: z.string().uuid() });

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = Query.safeParse({ patient_id: url.searchParams.get('patient_id') });
  if (!parsed.success) {
    return NextResponse.json<ApiResp<EmergencyBriefResp>>(
      { ok: false, error: parsed.error.message },
      { status: 400 }
    );
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json<ApiResp<EmergencyBriefResp>>(
      { ok: false, error: 'unauthorized' },
      { status: 401 }
    );
  }

  const brief = await buildEmergencyBrief(parsed.data.patient_id);
  if (!brief) {
    return NextResponse.json<ApiResp<EmergencyBriefResp>>(
      { ok: false, error: 'patient not found' },
      { status: 404 }
    );
  }

  return NextResponse.json<ApiResp<EmergencyBriefResp>>({ ok: true, data: brief });
}
