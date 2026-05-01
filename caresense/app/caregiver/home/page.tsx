import { requireRole } from '@/lib/auth/requireRole';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/AppShell';
import { CaregiverPatientCard } from '@/components/dashboards/CaregiverPatientCard';
import type { Alert, AlertLevel } from '@/types/domain';
import { LEVEL_PRIORITY } from '@/lib/constants';

export default async function CaregiverHome() {
  const session = await requireRole('caregiver');
  const supabase = createClient();

  const { data: links } = await supabase
    .from('caregiver_link')
    .select('patient_id, relationship, patient:patient_id(*, user_profile:user_id(full_name))')
    .eq('caregiver_id', session.user.id);

  const items: Array<{ patient: any; relationship: string | null }> = (links ?? []).map((l: any) => ({
    patient: l.patient,
    relationship: l.relationship
  }));

  // For each patient, fetch latest open alert
  const enriched = await Promise.all(
    items.map(async ({ patient, relationship }) => {
      if (!patient) return null;
      const { data: alerts } = await supabase
        .from('alert')
        .select('*')
        .eq('patient_id', patient.id)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1);
      const alert = (alerts ?? [])[0] as Alert | undefined;
      const level: AlertLevel = alert?.level ?? 'stable';
      return { patient, relationship, alert: alert ?? null, level };
    })
  );

  const cards = enriched
    .filter((x): x is NonNullable<typeof x> => Boolean(x))
    .sort((a, b) => (LEVEL_PRIORITY[b.level] ?? 0) - (LEVEL_PRIORITY[a.level] ?? 0));

  return (
    <AppShell role="caregiver" title={`Hi ${session.profile.full_name}`}>
      {cards.length === 0 ? (
        <div className="rounded-md border bg-background p-8 text-center text-muted-foreground">
          You're not linked to any patients yet. Ask your family member to invite you from their settings.
        </div>
      ) : (
        <div className="space-y-4">
          {cards.map(({ patient, relationship, alert, level }) => (
            <CaregiverPatientCard
              key={patient.id}
              patientId={patient.id}
              patientName={patient.user_profile?.full_name ?? 'Patient'}
              relationship={relationship}
              alert={alert}
              level={level}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
