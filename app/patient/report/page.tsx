import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/requireRole';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { EmergencyReport } from '@/components/patient/EmergencyReport';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ReportPage() {
  const session = await requireRole('patient');

  const { data: patient } = await supabaseAdmin
    .from('patient')
    .select('*')
    .eq('user_id', session.user.id)
    .maybeSingle();
  if (!patient) redirect('/onboarding');

  const { data: userProfile } = await supabaseAdmin
    .from('user_profile')
    .select('phone')
    .eq('id', session.user.id)
    .maybeSingle();

  const [{ data: vitals }, { data: meds }, { data: alerts }, { data: medLogs }, { data: links }] = await Promise.all([
    supabaseAdmin
      .from('vitals_log')
      .select('*')
      .eq('patient_id', (patient as any).id)
      .order('logged_at', { ascending: false })
      .limit(30),
    supabaseAdmin.from('medication').select('id, name, dosage, frequency').eq('patient_id', (patient as any).id),
    supabaseAdmin
      .from('alert')
      .select('*')
      .eq('patient_id', (patient as any).id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabaseAdmin
      .from('medication_log')
      .select('taken, logged_at, medication:medication_id(name)')
      .eq('patient_id', (patient as any).id)
      .order('logged_at', { ascending: false })
      .limit(20),
    supabaseAdmin
      .from('caregiver_link')
      .select('caregiver_id, relationship, status')
      .eq('patient_id', (patient as any).id)
      .eq('status', 'accepted')
  ]);

  const caregivers = await Promise.all(
    ((links ?? []) as any[]).map(async (l) => {
      const { data: prof } = await supabaseAdmin
        .from('user_profile')
        .select('full_name, phone')
        .eq('id', l.caregiver_id)
        .maybeSingle();
      const { data: au } = await supabaseAdmin.auth.admin.getUserById(l.caregiver_id);
      return {
        name: (prof as any)?.full_name ?? 'Caregiver',
        phone: (prof as any)?.phone ?? null,
        email: au?.user?.email ?? null,
        relationship: l.relationship ?? null
      };
    })
  );

  return (
    <EmergencyReport
      patient={{
        full_name: session.profile.full_name,
        phone: (userProfile as any)?.phone ?? null,
        age: (patient as any).age ?? null,
        sex: (patient as any).sex ?? null,
        conditions: (patient as any).conditions ?? [],
        allergies: (patient as any).allergies ?? [],
        address: (patient as any).address ?? null,
        emergency_contact_name: (patient as any).emergency_contact_name ?? null,
        emergency_contact_phone: (patient as any).emergency_contact_phone ?? null
      }}
      vitals={(vitals ?? []) as any[]}
      medications={(meds ?? []) as any[]}
      medLogs={(medLogs ?? []) as any[]}
      alerts={(alerts ?? []) as any[]}
      caregivers={caregivers}
    />
  );
}
