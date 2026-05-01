import dynamic from 'next/dynamic';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { requireRole } from '@/lib/auth/requireRole';
import { AppShell } from '@/components/AppShell';
import { EmergencyBriefCard } from '@/components/emergency/EmergencyBriefCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { EmergencyBrief } from '@/types/domain';

const HospitalMap = dynamic(() => import('@/components/emergency/HospitalMap'), { ssr: false });

async function getBrief(patientId: string, cookieHeader: string): Promise<EmergencyBrief | null> {
  const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/api/emergency-brief?patient_id=${patientId}`;
  const res = await fetch(url, { headers: { cookie: cookieHeader }, cache: 'no-store' });
  if (!res.ok) return null;
  const json = await res.json();
  return json.ok ? json.data : null;
}

export default async function EmergencyPage({ params }: { params: { patientId: string } }) {
  const session = await requireRole('caregiver', 'doctor', 'patient');
  const cookieHeader = headers().get('cookie') ?? '';
  const brief = await getBrief(params.patientId, cookieHeader);
  if (!brief) notFound();

  return (
    <AppShell role={session.role}>
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
              <HospitalMap center={{ lat: brief.location.lat ?? 12.97, lng: brief.location.lng ?? 77.59 }} hospitals={brief.hospitals} />
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
