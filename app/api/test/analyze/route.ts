import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { analyzePatient } from '@/lib/services/analyze';

const Body = z.object({
  // If omitted, runs analyze on EVERY patient.
  email: z.string().email().optional()
});

/**
 * POST /api/test/analyze
 *   Body: { "email": "user@example.com" }    → analyze that patient
 *   Body: {}                                  → analyze every patient (useful after bulk seed)
 *
 * Triggers the full alert pipeline (baseline → SHAP → forecast → escalation → LLM)
 * and returns one row per patient with the resulting level + alert id.
 */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });
  }

  let patientIds: { id: string; email: string | null; name: string | null }[] = [];

  if (parsed.data.email) {
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const user = list.users.find((u) => u.email?.toLowerCase() === parsed.data.email!.toLowerCase());
    if (!user) {
      return NextResponse.json({ ok: false, error: `No account for ${parsed.data.email}` }, { status: 404 });
    }
    const { data: p } = await supabaseAdmin.from('patient').select('id').eq('user_id', user.id).maybeSingle();
    if (!p) {
      return NextResponse.json({ ok: false, error: 'No patient row for that email' }, { status: 404 });
    }
    const { data: profile } = await supabaseAdmin.from('user_profile').select('full_name').eq('id', user.id).maybeSingle();
    patientIds = [{ id: (p as any).id, email: user.email ?? null, name: (profile as any)?.full_name ?? null }];
  } else {
    const { data: patients } = await supabaseAdmin.from('patient').select('id, user_id');
    const enriched = await Promise.all(
      ((patients ?? []) as any[]).map(async (p) => {
        const u = p.user_id ? await supabaseAdmin.auth.admin.getUserById(p.user_id) : null;
        const { data: profile } = p.user_id
          ? await supabaseAdmin.from('user_profile').select('full_name').eq('id', p.user_id).maybeSingle()
          : { data: null as any };
        return { id: p.id, email: u?.data.user?.email ?? null, name: (profile as any)?.full_name ?? null };
      })
    );
    patientIds = enriched;
  }

  const results = await Promise.all(
    patientIds.map(async (p) => {
      try {
        const r = await analyzePatient(p.id);
        return {
          patient_id: p.id,
          patient_name: p.name,
          email: p.email,
          level: r.level,
          alert_id: r.alert?.id ?? null,
          alert_title: r.alert?.title ?? null
        };
      } catch (e: any) {
        return { patient_id: p.id, patient_name: p.name, email: p.email, error: e.message };
      }
    })
  );

  return NextResponse.json({
    ok: true,
    data: {
      analyzed: results.length,
      results
    }
  });
}
