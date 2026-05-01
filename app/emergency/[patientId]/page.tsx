import dynamicImport from 'next/dynamic';
import { notFound, redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/requireRole';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { buildEmergencyBrief } from '@/lib/services/emergency-brief';
import { AppShell } from '@/components/AppShell';
import { EmergencyBriefCard } from '@/components/emergency/EmergencyBriefCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const HospitalMap = dynamicImport(() => import('@/components/emergency/HospitalMap'), { ssr: false });

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EmergencyPage({ params }: { params: { patientId: string } }) {
  const session = await requireRole('caregiver', 'doctor', 'patient');
  const patientId = params.patientId;

  // Authorization: patient must own; caregiver must be linked; doctor sees all.
  if (session.role === 'patient') {
    const { data: own } = await supabaseAdmin
      .from('patient')
      .select('id')
      .eq('id', patientId)
      .eq('user_id', session.user.id)
      .maybeSingle();
    if (!own) redirect('/patient/dashboard');
  } else if (session.role === 'caregiver') {
    const { data: link } = await supabaseAdmin
      .from('caregiver_link')
      .select('id')
      .eq('caregiver_id', session.user.id)
      .eq('patient_id', patientId)
      .maybeSingle();
    if (!link) redirect('/caregiver/home');
  }

  const brief = await buildEmergencyBrief(patientId);
  if (!brief) notFound();

  return (
    <AppShell role={session.role} user={{ name: session.profile.full_name }}>
      <div className="space-y-6">
        <div className="rounded-md border-2 border-status-critical bg-status-critical/5 p-4 text-center">
          <p className="text-2xl font-bold">🚨 Emergency Brief — Auto-Generated</p>
          <p className="mt-1 text-sm text-muted-foreground">Status: ready to send to 108</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <EmergencyBriefCard brief={brief} />

          <Card>
            <CardHeader>
              <CardTitle>Nearest hospitals ({brief.hospitals.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <HospitalMap
                center={{ lat: brief.location.lat ?? 12.97, lng: brief.location.lng ?? 77.59 }}
                hospitals={brief.hospitals}
              />
              <ul className="space-y-2 text-sm">
                {brief.hospitals.map((h, i) => (
                  <li key={h.id} className={`rounded-md border p-3 ${i === 0 ? 'border-green-600 bg-green-50' : ''}`}>
                    <div className="flex justify-between">
                      <p className="font-semibold">{i === 0 && '✅ '}{h.name}</p>
                      <p className="text-xs text-muted-foreground">{h.distance_km?.toFixed(1)} km</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {h.beds_available}/{h.beds_total} beds · {h.specialty.join(', ')}
                    </p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button className="rounded-md border px-4 py-2 text-sm hover:bg-accent" disabled>
            Pre-alert hospital (mock)
          </button>
          <button className="rounded-md bg-destructive px-4 py-2 text-sm text-destructive-foreground hover:opacity-90" disabled>
            Send brief to 108 (mock)
          </button>
        </div>
      </div>
    </AppShell>
  );
}
