import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Diagnostic endpoint — verify what's actually stored in Supabase for a given email.
 *
 *   GET /api/diag?email=user@example.com
 *
 * Returns row counts for every relevant table plus the role and visibility:
 * who else can see this user's data.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = url.searchParams.get('email');
  if (!email) {
    return NextResponse.json({ ok: false, error: 'email query param required' }, { status: 400 });
  }

  const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listErr) return NextResponse.json({ ok: false, error: listErr.message }, { status: 500 });

  const user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    return NextResponse.json(
      { ok: false, error: `No CareSense account for ${email}.` },
      { status: 404 }
    );
  }

  const userId = user.id;

  const { data: profile } = await supabaseAdmin
    .from('user_profile')
    .select('full_name, role')
    .eq('id', userId)
    .maybeSingle();

  const role = (profile as any)?.role as 'patient' | 'caregiver' | 'doctor' | null;

  // ---- patient diagnostics ----
  let patientDiag: any = null;
  if (role === 'patient') {
    const { data: patient } = await supabaseAdmin
      .from('patient')
      .select('id, age, sex, conditions, allergies, location_lat, location_lng')
      .eq('user_id', userId)
      .maybeSingle();

    if (patient) {
      const pid = (patient as any).id;
      const [vitals, meds, medLogs, alerts, briefs, baseline, links, latestVital] = await Promise.all([
        supabaseAdmin.from('vitals_log').select('id', { count: 'exact', head: true }).eq('patient_id', pid),
        supabaseAdmin.from('medication').select('id', { count: 'exact', head: true }).eq('patient_id', pid),
        supabaseAdmin.from('medication_log').select('id', { count: 'exact', head: true }).eq('patient_id', pid),
        supabaseAdmin.from('alert').select('id', { count: 'exact', head: true }).eq('patient_id', pid),
        supabaseAdmin.from('emergency_brief').select('id', { count: 'exact', head: true }).eq('patient_id', pid),
        supabaseAdmin.from('patient_baseline').select('patient_id', { count: 'exact', head: true }).eq('patient_id', pid),
        supabaseAdmin.from('caregiver_link').select('id', { count: 'exact', head: true }).eq('patient_id', pid),
        supabaseAdmin.from('vitals_log').select('logged_at, bp_systolic, bp_diastolic, glucose_mgdl').eq('patient_id', pid).order('logged_at', { ascending: false }).limit(1).maybeSingle()
      ]);

      // Caregivers who can see this patient
      const { data: linkRows } = await supabaseAdmin
        .from('caregiver_link')
        .select('caregiver_id, relationship')
        .eq('patient_id', pid);

      const caregiverList = await Promise.all(
        ((linkRows ?? []) as any[]).map(async (l) => {
          const cgUser = await supabaseAdmin.auth.admin.getUserById(l.caregiver_id);
          const { data: cgProfile } = await supabaseAdmin
            .from('user_profile')
            .select('full_name, role')
            .eq('id', l.caregiver_id)
            .maybeSingle();
          return {
            caregiver_email: cgUser.data.user?.email,
            caregiver_name: (cgProfile as any)?.full_name ?? null,
            relationship: l.relationship
          };
        })
      );

      // Doctors (everyone with role doctor sees this patient)
      const { data: doctors } = await supabaseAdmin
        .from('user_profile')
        .select('id, full_name')
        .eq('role', 'doctor');

      const doctorList = await Promise.all(
        ((doctors ?? []) as any[]).map(async (d) => {
          const dUser = await supabaseAdmin.auth.admin.getUserById(d.id);
          return { email: dUser.data.user?.email, name: d.full_name };
        })
      );

      patientDiag = {
        patient_id: pid,
        age: (patient as any).age,
        sex: (patient as any).sex,
        conditions: (patient as any).conditions,
        allergies: (patient as any).allergies,
        counts: {
          vitals: vitals.count ?? 0,
          medications: meds.count ?? 0,
          medication_logs: medLogs.count ?? 0,
          alerts: alerts.count ?? 0,
          emergency_briefs: briefs.count ?? 0,
          baseline_present: (baseline.count ?? 0) > 0,
          caregiver_links: links.count ?? 0
        },
        latest_vital: latestVital.data ?? null,
        visible_to: {
          self: true,
          caregivers: caregiverList,
          doctors: doctorList
        }
      };
    }
  }

  // ---- caregiver diagnostics ----
  let caregiverDiag: any = null;
  if (role === 'caregiver') {
    const { data: links } = await supabaseAdmin
      .from('caregiver_link')
      .select('patient_id, relationship')
      .eq('caregiver_id', userId);

    const linked = await Promise.all(
      ((links ?? []) as any[]).map(async (l) => {
        const { data: p } = await supabaseAdmin
          .from('patient')
          .select('user_id, age, conditions')
          .eq('id', l.patient_id)
          .maybeSingle();
        const pUser = (p as any)?.user_id ? await supabaseAdmin.auth.admin.getUserById((p as any).user_id) : null;
        const { data: latestAlert } = await supabaseAdmin
          .from('alert')
          .select('level, status')
          .eq('patient_id', l.patient_id)
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        return {
          patient_email: pUser?.data.user?.email ?? null,
          patient_age: (p as any)?.age,
          patient_conditions: (p as any)?.conditions ?? [],
          relationship: l.relationship,
          current_alert_level: (latestAlert as any)?.level ?? 'stable'
        };
      })
    );

    caregiverDiag = { linked_patients: linked, count: linked.length };
  }

  // ---- doctor diagnostics ----
  let doctorDiag: any = null;
  if (role === 'doctor') {
    const { data: patients } = await supabaseAdmin.from('patient').select('id', { count: 'exact', head: true });
    const { data: openAlerts } = await supabaseAdmin
      .from('alert')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open');
    doctorDiag = {
      patients_visible: (patients as any)?.count ?? 0,
      open_alerts_visible: (openAlerts as any)?.count ?? 0
    };
  }

  return NextResponse.json({
    ok: true,
    data: {
      email,
      auth_user_id: userId,
      profile: { full_name: (profile as any)?.full_name ?? null, role },
      patient: patientDiag,
      caregiver: caregiverDiag,
      doctor: doctorDiag
    }
  });
}
