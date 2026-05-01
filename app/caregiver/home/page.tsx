import { requireRole } from '@/lib/auth/requireRole';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { AppShell } from '@/components/AppShell';
import { CaregiverPatientCard } from '@/components/dashboards/CaregiverPatientCard';
import type { Alert, AlertLevel } from '@/types/domain';
import { LEVEL_PRIORITY } from '@/lib/constants';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CaregiverHome() {
  const session = await requireRole('caregiver');

  // 1. Caregiver links — admin (we already authenticated the user)
  const { data: links } = await supabaseAdmin
    .from('caregiver_link')
    .select('patient_id, relationship')
    .eq('caregiver_id', session.user.id)
    .eq('status', 'accepted');

  const linkRows = (links ?? []) as { patient_id: string; relationship: string | null }[];

  if (linkRows.length === 0) {
    return (
      <AppShell role="caregiver" title="Family Overview" user={{ name: session.profile.full_name }}>
        <div className="rounded-md border bg-background p-8 text-center text-muted-foreground">
          You're not linked to any patients yet. Ask your family member to invite you from their settings.
        </div>
      </AppShell>
    );
  }

  // 2. Hydrate each link with patient + profile name + latest open alert
  const cards = await Promise.all(
    linkRows.map(async ({ patient_id, relationship }) => {
      const [{ data: patient }, { data: alerts }] = await Promise.all([
        supabaseAdmin.from('patient').select('id, user_id, conditions').eq('id', patient_id).maybeSingle(),
        supabaseAdmin.from('alert').select('*').eq('patient_id', patient_id).eq('status', 'open').order('created_at', { ascending: false }).limit(1)
      ]);
      if (!patient) return null;

      const { data: profile } = patient.user_id
        ? await supabaseAdmin.from('user_profile').select('full_name').eq('id', patient.user_id).maybeSingle()
        : { data: null as any };

      const alert = ((alerts ?? []) as Alert[])[0] ?? null;
      const level: AlertLevel = alert?.level ?? 'stable';
      return {
        patientId: patient.id,
        patientName: profile?.full_name ?? 'Patient',
        relationship,
        alert,
        level,
        conditions: (patient.conditions ?? []) as string[]
      };
    })
  );

  const visible = cards
    .filter((x): x is NonNullable<typeof x> => Boolean(x))
    .sort((a, b) => (LEVEL_PRIORITY[b.level] ?? 0) - (LEVEL_PRIORITY[a.level] ?? 0));

  return (
    <AppShell role="caregiver" title="Family Overview" user={{ name: session.profile.full_name }}>
      <div className="space-y-4">
        {visible.map((c) => (
          <CaregiverPatientCard
            key={c.patientId}
            patientId={c.patientId}
            patientName={c.patientName}
            relationship={c.relationship}
            alert={c.alert}
            level={c.level}
          />
        ))}
      </div>
    </AppShell>
  );
}
