/**
 * CareSense seed script.
 *
 * Creates 3 demo accounts with synthetic 30-day vitals + medication histories,
 * plus seeds hospital_mock from seed_hospitals.json.
 *
 *   npm run seed
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
loadEnv(); // fallback to .env
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

// ------- helpers -------
const now = Date.now();
const dayMs = 86400_000;
const isoDayAgo = (n: number) => new Date(now - n * dayMs).toISOString();
const noise = (sigma: number) => (Math.random() * 2 - 1) * sigma;

async function ensureUser(email: string, password: string) {
  // Try create; if exists, look up via list
  const { data: created, error } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  if (created?.user) return created.user.id;
  if (error && !/already/i.test(error.message)) throw error;
  // list and find
  const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
  const user = list.users.find((u) => u.email === email);
  if (!user) throw new Error(`Could not find or create user ${email}`);
  return user.id;
}

async function upsertProfile(id: string, full_name: string, role: 'patient' | 'caregiver' | 'doctor') {
  const { error } = await sb
    .from('user_profile')
    .upsert({ id, full_name, role }, { onConflict: 'id' });
  if (error) throw error;
}

async function getOrCreatePatient(user_id: string, payload: any) {
  const { data: existing } = await sb.from('patient').select('id').eq('user_id', user_id).maybeSingle();
  if (existing) return existing.id as string;
  const { data, error } = await sb.from('patient').insert({ user_id, ...payload }).select('id').single();
  if (error) throw error;
  return data!.id as string;
}

async function clearPatientData(patientId: string) {
  await sb.from('emergency_brief').delete().eq('patient_id', patientId);
  await sb.from('alert').delete().eq('patient_id', patientId);
  await sb.from('medication_log').delete().eq('patient_id', patientId);
  await sb.from('medication').delete().eq('patient_id', patientId);
  await sb.from('vitals_log').delete().eq('patient_id', patientId);
  await sb.from('patient_baseline').delete().eq('patient_id', patientId);
}

async function insertVitals(patientId: string, days: { day: number; bpSys: number; bpDia: number; glucose: number; hr: number; sleep: number }[]) {
  const rows = days.map((d) => ({
    patient_id: patientId,
    logged_at: isoDayAgo(d.day),
    bp_systolic: Math.round(d.bpSys),
    bp_diastolic: Math.round(d.bpDia),
    glucose_mgdl: Math.round(d.glucose),
    heart_rate: Math.round(d.hr),
    spo2: 97,
    sleep_hours: Number(d.sleep.toFixed(1)),
    activity_level: d.sleep < 6 ? 'low' : 'medium',
    diet_flag: 'normal',
    mood: d.sleep < 6 ? 2 : 4
  }));
  const { error } = await sb.from('vitals_log').insert(rows);
  if (error) throw error;
}

async function insertMedication(patientId: string, name: string, dosage: string) {
  const { data, error } = await sb.from('medication').insert({ patient_id: patientId, name, dosage, frequency: 'daily', active: true }).select('id').single();
  if (error) throw error;
  return data!.id as string;
}

async function insertMedLog(patientId: string, medicationId: string, days: { day: number; taken: boolean }[]) {
  const rows = days.map((d) => ({
    patient_id: patientId,
    medication_id: medicationId,
    logged_at: isoDayAgo(d.day),
    scheduled_time: isoDayAgo(d.day),
    taken: d.taken
  }));
  const { error } = await sb.from('medication_log').insert(rows);
  if (error) throw error;
}

// ------- patient profiles -------
async function seedHospitals() {
  const path = resolve(process.cwd(), 'scripts/seed_hospitals.json');
  const data = JSON.parse(readFileSync(path, 'utf8'));
  // wipe + reinsert for idempotency (hospitals only)
  await sb.from('hospital_mock').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  const { error } = await sb.from('hospital_mock').insert(data);
  if (error) throw error;
  console.log(`✅ ${data.length} hospitals seeded`);
}

async function seedRamesh() {
  const userId = await ensureUser('ramesh@caresense.demo', 'password123');
  await upsertProfile(userId, 'Ramesh K.', 'patient');
  const patientId = await getOrCreatePatient(userId, {
    age: 62,
    sex: 'M',
    conditions: ['diabetes', 'hypertension'],
    allergies: ['Penicillin'],
    emergency_contact_name: 'Priya (Daughter)',
    emergency_contact_phone: '+91-90000-00001',
    location_lat: 12.9716, location_lng: 77.7500, address: 'Whitefield, Bengaluru'
  });
  await clearPatientData(patientId);

  // 30-day BP trajectory: stable Days 30-14, drift up Days 13-1
  const days: any[] = [];
  for (let d = 30; d >= 1; d--) {
    let bp: number, glu: number, sleep: number;
    if (d > 13) {
      // stable phase
      bp = 128 + noise(3);
      glu = 135 + noise(8);
      sleep = 7 + noise(0.5);
    } else if (d > 8) {
      // early drift
      bp = 130 + (14 - d) * 1.5 + noise(2);
      glu = 145 + (14 - d) * 4 + noise(8);
      sleep = 6.5 + noise(0.5);
    } else {
      // accelerating drift
      bp = 138 + (9 - d) * 2.5 + noise(2);
      glu = 165 + (9 - d) * 5 + noise(8);
      sleep = 5 + noise(0.5);
    }
    days.push({ day: d, bpSys: bp, bpDia: bp * 0.6, glucose: glu, hr: 78 + noise(4), sleep });
  }
  await insertVitals(patientId, days);

  const metformin = await insertMedication(patientId, 'Metformin', '500mg');
  const amlodipine = await insertMedication(patientId, 'Amlodipine', '5mg');

  // Medication log: missed Amlodipine on days 6, 4, 2
  const metLog = days.map((d) => ({ day: d.day, taken: true }));
  const amlLog = days.map((d) => ({ day: d.day, taken: ![6, 4, 2].includes(d.day) }));
  await insertMedLog(patientId, metformin, metLog);
  await insertMedLog(patientId, amlodipine, amlLog);

  console.log(`✅ Ramesh seeded (patient=${patientId}, user=${userId})`);
  return { userId, patientId };
}

async function seedLakshmi() {
  const userId = await ensureUser('lakshmi@caresense.demo', 'password123');
  await upsertProfile(userId, 'Lakshmi P.', 'patient');
  const patientId = await getOrCreatePatient(userId, {
    age: 58, sex: 'F',
    conditions: ['hypertension'],
    allergies: [],
    emergency_contact_name: 'Anand (Son)',
    emergency_contact_phone: '+91-90000-00002',
    location_lat: 12.9352, location_lng: 77.6245, address: 'BTM Layout, Bengaluru'
  });
  await clearPatientData(patientId);

  const days: any[] = [];
  for (let d = 30; d >= 1; d--) {
    days.push({ day: d, bpSys: 122 + noise(3), bpDia: 78 + noise(2), glucose: 100 + noise(8), hr: 70 + noise(4), sleep: 7.5 + noise(0.4) });
  }
  await insertVitals(patientId, days);

  const losartan = await insertMedication(patientId, 'Losartan', '50mg');
  await insertMedLog(patientId, losartan, days.map((d) => ({ day: d.day, taken: true })));
  console.log(`✅ Lakshmi seeded (patient=${patientId})`);
  return { userId, patientId };
}

async function seedSuresh() {
  const userId = await ensureUser('suresh@caresense.demo', 'password123');
  await upsertProfile(userId, 'Suresh M.', 'patient');
  const patientId = await getOrCreatePatient(userId, {
    age: 70, sex: 'M',
    conditions: ['cardiac'],
    allergies: ['Sulfa'],
    emergency_contact_name: 'Vikas (Son)',
    emergency_contact_phone: '+91-90000-00003',
    location_lat: 12.9279, location_lng: 77.6271, address: 'Jayanagar, Bengaluru'
  });
  await clearPatientData(patientId);

  const days: any[] = [];
  for (let d = 30; d >= 1; d--) {
    let bp: number;
    if (d > 17) bp = 130 + noise(3);
    else if (d >= 14) bp = 145 + (17 - d) * 4 + noise(3); // Days 17,16,15,14 spike
    else bp = 128 + noise(3); // resolved
    days.push({ day: d, bpSys: bp, bpDia: bp * 0.62, glucose: 110 + noise(10), hr: 76 + noise(5), sleep: 7 + noise(0.6) });
  }
  await insertVitals(patientId, days);

  const aspirin = await insertMedication(patientId, 'Aspirin', '75mg');
  await insertMedLog(patientId, aspirin, days.map((d) => ({ day: d.day, taken: true })));
  console.log(`✅ Suresh seeded (patient=${patientId})`);
  return { userId, patientId };
}

async function seedCaregiver(rameshPatientId: string, lakshmiPatientId: string) {
  const userId = await ensureUser('priya@caresense.demo', 'password123');
  await upsertProfile(userId, 'Priya K.', 'caregiver');

  await sb.from('caregiver_link').upsert(
    [
      { caregiver_id: userId, patient_id: rameshPatientId, relationship: 'daughter' },
      { caregiver_id: userId, patient_id: lakshmiPatientId, relationship: 'daughter' }
    ],
    { onConflict: 'caregiver_id,patient_id' }
  );
  console.log('✅ Priya (caregiver) linked to Ramesh & Lakshmi');
}

async function seedDoctor() {
  const userId = await ensureUser('dr.shah@caresense.demo', 'password123');
  await upsertProfile(userId, 'Dr. Shah', 'doctor');
  console.log('✅ Dr. Shah seeded');
}

// ------- run -------
(async () => {
  console.log('Seeding hospitals…');
  await seedHospitals();

  console.log('\nSeeding patients…');
  const ramesh = await seedRamesh();
  const lakshmi = await seedLakshmi();
  await seedSuresh();

  console.log('\nSeeding caregivers / doctors…');
  await seedCaregiver(ramesh.patientId, lakshmi.patientId);
  await seedDoctor();

  console.log('\n✨ Seed complete.');
  console.log('\nDemo accounts (password: password123):');
  console.log('  Patient   ramesh@caresense.demo  ← deteriorating (hero patient)');
  console.log('  Patient   lakshmi@caresense.demo ← stable');
  console.log('  Patient   suresh@caresense.demo  ← resolved spike');
  console.log('  Caregiver priya@caresense.demo   ← linked to Ramesh + Lakshmi');
  console.log('  Doctor    dr.shah@caresense.demo');
  console.log('\nNext: run `npm run baselines` to compute baselines + trigger first alerts.');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
