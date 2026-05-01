import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { analyzePatient } from '@/lib/services/analyze';
import { PROFILES, type ClinicalProfile } from '@/lib/seed/profiles';

export type SeedOptions = {
  email: string;
  profile: ClinicalProfile;
  reset?: boolean;
  age?: number;
  sex?: 'M' | 'F' | 'Other';
  full_name?: string;
};

export type SeedResult = {
  patient_id: string;
  profile: ClinicalProfile;
  meta: { description: string; expected_alert: string };
  vitals_inserted: number;
  medications: number;
  analysis: { level: string; alert_id: string | null };
};

/**
 * Seeds 30 days of synthetic clinical history (vitals + meds + adherence)
 * for the patient identified by `email`, then runs the alert analyzer.
 *
 * Idempotent (`reset: true` wipes prior data first).
 *
 * Throws on missing user or DB errors so callers can convert to HTTP responses.
 */
export async function seedPatientHistory(opts: SeedOptions): Promise<SeedResult> {
  const { email, profile, reset = true, age, sex, full_name } = opts;
  const spec = PROFILES[profile]();

  // 1. Locate auth user
  const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listErr) throw new Error(`auth.listUsers: ${listErr.message}`);
  const user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) throw new Error(`No CareSense account for ${email}. Have them sign up first.`);

  // 2. Ensure user_profile
  await supabaseAdmin
    .from('user_profile')
    .upsert(
      { id: user.id, full_name: full_name ?? user.user_metadata?.full_name ?? email.split('@')[0], role: 'patient' },
      { onConflict: 'id' }
    );

  // 3. Ensure patient row
  const { data: existing } = await supabaseAdmin
    .from('patient')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  let patientId: string;
  if (existing) {
    patientId = (existing as any).id;
    await supabaseAdmin
      .from('patient')
      .update({
        age: age ?? 60,
        sex: sex ?? 'M',
        conditions: spec.conditions,
        allergies: spec.allergies
      })
      .eq('id', patientId);
  } else {
    const { data: created, error: pErr } = await supabaseAdmin
      .from('patient')
      .insert({
        user_id: user.id,
        age: age ?? 60,
        sex: sex ?? 'M',
        conditions: spec.conditions,
        allergies: spec.allergies,
        location_lat: 12.9716,
        location_lng: 77.5946,
        address: 'Bengaluru, India'
      })
      .select('id')
      .single();
    if (pErr || !created) throw new Error(`patient insert: ${pErr?.message}`);
    patientId = (created as any).id;
  }

  // 4. Reset existing data
  if (reset) {
    await supabaseAdmin.from('emergency_brief').delete().eq('patient_id', patientId);
    await supabaseAdmin.from('alert').delete().eq('patient_id', patientId);
    await supabaseAdmin.from('medication_log').delete().eq('patient_id', patientId);
    await supabaseAdmin.from('medication').delete().eq('patient_id', patientId);
    await supabaseAdmin.from('vitals_log').delete().eq('patient_id', patientId);
    await supabaseAdmin.from('patient_baseline').delete().eq('patient_id', patientId);
  }

  // 5. Vitals
  const now = Date.now();
  const dayMs = 86400_000;
  const vitalRows = spec.vitals.map((v) => ({
    patient_id: patientId,
    logged_at: new Date(now - v.day * dayMs).toISOString(),
    bp_systolic: Math.round(v.bp_systolic),
    bp_diastolic: Math.round(v.bp_diastolic),
    glucose_mgdl: Math.round(v.glucose_mgdl),
    heart_rate: Math.round(v.heart_rate),
    spo2: Math.round(v.spo2),
    sleep_hours: Number(v.sleep_hours.toFixed(1)),
    activity_level: v.activity_level,
    diet_flag: v.diet_flag,
    mood: v.mood
  }));
  await supabaseAdmin.from('vitals_log').insert(vitalRows);

  // 6. Medications + adherence
  for (const m of spec.medications) {
    const { data: med } = await supabaseAdmin
      .from('medication')
      .insert({ patient_id: patientId, name: m.name, dosage: m.dosage, frequency: m.frequency, active: true })
      .select('id')
      .single();
    if (!med) continue;
    const medId = (med as any).id;
    const logs = spec.vitals.map((v) => ({
      patient_id: patientId,
      medication_id: medId,
      logged_at: new Date(now - v.day * dayMs).toISOString(),
      scheduled_time: new Date(now - v.day * dayMs).toISOString(),
      taken: !m.missed_days.includes(v.day)
    }));
    await supabaseAdmin.from('medication_log').insert(logs);
  }

  // 7. Baseline (earliest 14-day window)
  const stableWindow = vitalRows
    .slice()
    .sort((a, b) => a.logged_at.localeCompare(b.logged_at))
    .slice(0, 14);
  const sysArr = stableWindow.map((r) => r.bp_systolic);
  const diaArr = stableWindow.map((r) => r.bp_diastolic);
  const gluArr = stableWindow.map((r) => r.glucose_mgdl);
  const hrArr = stableWindow.map((r) => r.heart_rate);
  const mean = (a: number[]) => a.reduce((s, n) => s + n, 0) / a.length;
  const std = (a: number[]) => {
    const m = mean(a);
    return Math.sqrt(a.reduce((s, n) => s + (n - m) ** 2, 0) / Math.max(a.length - 1, 1));
  };
  await supabaseAdmin.from('patient_baseline').upsert(
    {
      patient_id: patientId,
      bp_systolic_mean: mean(sysArr), bp_systolic_std: std(sysArr) || 1,
      bp_diastolic_mean: mean(diaArr), bp_diastolic_std: std(diaArr) || 1,
      glucose_mean: mean(gluArr), glucose_std: std(gluArr) || 1,
      heart_rate_mean: mean(hrArr), heart_rate_std: std(hrArr) || 1,
      data_points_count: vitalRows.length
    },
    { onConflict: 'patient_id' }
  );

  // 8. Trigger analysis
  const result = await analyzePatient(patientId);

  return {
    patient_id: patientId,
    profile,
    meta: spec.meta,
    vitals_inserted: vitalRows.length,
    medications: spec.medications.length,
    analysis: { level: result.level, alert_id: result.alert?.id ?? null }
  };
}

/**
 * Wipes ALL clinical data for the patient identified by `email`.
 * Auth user + user_profile + patient row are KEPT (so the user can log back in).
 * Deletes: vitals_log, medication_log, medication, alert, emergency_brief, patient_baseline.
 */
export async function flushPatientData(email: string): Promise<{
  patient_id: string | null;
  email: string;
  deleted: { vitals: number; medications: number; alerts: number; baselines: number; briefs: number };
}> {
  const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listErr) throw new Error(`auth.listUsers: ${listErr.message}`);
  const user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) throw new Error(`No CareSense account for ${email}.`);

  const { data: patient } = await supabaseAdmin
    .from('patient')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!patient) {
    return {
      patient_id: null,
      email,
      deleted: { vitals: 0, medications: 0, alerts: 0, baselines: 0, briefs: 0 }
    };
  }

  const patientId = (patient as any).id;

  const [briefsBefore, alertsBefore, medsBefore, vitalsBefore, baselinesBefore] = await Promise.all([
    supabaseAdmin.from('emergency_brief').select('id', { count: 'exact', head: true }).eq('patient_id', patientId),
    supabaseAdmin.from('alert').select('id', { count: 'exact', head: true }).eq('patient_id', patientId),
    supabaseAdmin.from('medication').select('id', { count: 'exact', head: true }).eq('patient_id', patientId),
    supabaseAdmin.from('vitals_log').select('id', { count: 'exact', head: true }).eq('patient_id', patientId),
    supabaseAdmin.from('patient_baseline').select('patient_id', { count: 'exact', head: true }).eq('patient_id', patientId)
  ]);

  await supabaseAdmin.from('emergency_brief').delete().eq('patient_id', patientId);
  await supabaseAdmin.from('alert').delete().eq('patient_id', patientId);
  await supabaseAdmin.from('medication_log').delete().eq('patient_id', patientId);
  await supabaseAdmin.from('medication').delete().eq('patient_id', patientId);
  await supabaseAdmin.from('vitals_log').delete().eq('patient_id', patientId);
  await supabaseAdmin.from('patient_baseline').delete().eq('patient_id', patientId);

  return {
    patient_id: patientId,
    email,
    deleted: {
      vitals: vitalsBefore.count ?? 0,
      medications: medsBefore.count ?? 0,
      alerts: alertsBefore.count ?? 0,
      baselines: baselinesBefore.count ?? 0,
      briefs: briefsBefore.count ?? 0
    }
  };
}
