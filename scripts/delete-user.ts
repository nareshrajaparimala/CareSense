/**
 * Targeted user wipe — deletes ONE auth user by email.
 * Cascade FKs in the schema (auth.users → user_profile → patient → *) take care
 * of every dependent row. Nothing else is touched.
 *
 *   npx tsx scripts/delete-user.ts <email>
 */
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
loadEnv();
import { createClient } from '@supabase/supabase-js';

const TARGET_EMAIL = process.argv[2];
if (!TARGET_EMAIL) {
  console.error('Usage: npx tsx scripts/delete-user.ts <email>');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

async function findUserByEmail(email: string) {
  // Paginate auth.users (no direct findByEmail in admin API)
  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (data.users.length < perPage) return null;
    page++;
    if (page > 50) return null; // safety bail
  }
}

(async () => {
  console.log(`🔍 Looking up: ${TARGET_EMAIL}`);
  const user = await findUserByEmail(TARGET_EMAIL);
  if (!user) {
    console.log('   No auth user found. Nothing to delete.');
    return;
  }
  console.log(`   Found auth.users row → id=${user.id}`);

  // Snapshot what cascade will remove (read-only).
  const { data: profile } = await sb.from('user_profile').select('full_name, role').eq('id', user.id).maybeSingle();
  const { data: patient } = await sb.from('patient').select('id').eq('user_id', user.id).maybeSingle();

  let counts = { vitals: 0, meds: 0, medLogs: 0, alerts: 0, baseline: 0 };
  if (patient?.id) {
    const [v, m, ml, a, b] = await Promise.all([
      sb.from('vitals_log').select('id', { count: 'exact', head: true }).eq('patient_id', patient.id),
      sb.from('medication').select('id', { count: 'exact', head: true }).eq('patient_id', patient.id),
      sb.from('medication_log').select('id', { count: 'exact', head: true }).eq('patient_id', patient.id),
      sb.from('alert').select('id', { count: 'exact', head: true }).eq('patient_id', patient.id),
      sb.from('patient_baseline').select('patient_id', { count: 'exact', head: true }).eq('patient_id', patient.id)
    ]);
    counts = {
      vitals: v.count ?? 0,
      meds: m.count ?? 0,
      medLogs: ml.count ?? 0,
      alerts: a.count ?? 0,
      baseline: b.count ?? 0
    };
  }

  console.log('\n   Will cascade-delete:');
  console.log(`     • auth.users           1`);
  console.log(`     • user_profile         ${profile ? 1 : 0}  ${profile ? `(${profile.full_name ?? '—'}, role=${profile.role ?? '—'})` : ''}`);
  console.log(`     • patient              ${patient ? 1 : 0}`);
  console.log(`     • vitals_log           ${counts.vitals}`);
  console.log(`     • medication           ${counts.meds}`);
  console.log(`     • medication_log       ${counts.medLogs}`);
  console.log(`     • alert                ${counts.alerts}`);
  console.log(`     • patient_baseline     ${counts.baseline}`);

  // Pre-step: null out FK references that don't cascade.
  // alert.acknowledged_by → user_profile(id) has no ON DELETE rule, so any alert
  // (even on a different patient) acknowledged by this user would block deletion.
  const { error: ackErr, count: ackCount } = await sb
    .from('alert')
    .update({ acknowledged_by: null, acknowledged_at: null }, { count: 'exact' })
    .eq('acknowledged_by', user.id);
  if (ackErr) throw ackErr;
  if ((ackCount ?? 0) > 0) {
    console.log(`\n   Pre-cleared acknowledged_by on ${ackCount} alert row(s) (kept the alerts).`);
  }

  console.log('\n🗑   Deleting auth user…');
  const { error } = await sb.auth.admin.deleteUser(user.id);
  if (error) throw error;
  console.log('✅  Done. All cascaded rows are gone.');
})().catch((e) => {
  console.error('❌  Failed:', e);
  process.exit(1);
});
