import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatBP, formatGlucose, formatHR, formatSpO2 } from '@/utils/vitalsFormat';
import { relTime } from '@/utils/dateFormat';
import type { EmergencyBrief } from '@/types/domain';

export function EmergencyBriefCard({ brief }: { brief: EmergencyBrief }) {
  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <Section title="Patient">
          <p className="font-semibold">
            {brief.patient.name}, {brief.patient.age}{brief.patient.sex}
          </p>
          <p className="text-sm">{brief.patient.conditions.join(' + ')}</p>
          {brief.patient.allergies.length > 0 && (
            <p className="text-sm text-destructive">Allergies: {brief.patient.allergies.join(', ')}</p>
          )}
          {brief.patient.emergency_contact_name && (
            <p className="text-sm text-muted-foreground">
              Emergency contact: {brief.patient.emergency_contact_name} · {brief.patient.emergency_contact_phone}
            </p>
          )}
        </Section>

        <Separator />

        <Section title="Current vitals">
          <Grid>
            <Stat label="BP" value={formatBP(brief.vitals_now.bp_systolic, brief.vitals_now.bp_diastolic)} alert={ (brief.vitals_now.bp_systolic ?? 0) > 160 } />
            <Stat label="Glucose" value={formatGlucose(brief.vitals_now.glucose_mgdl)} alert={(brief.vitals_now.glucose_mgdl ?? 0) > 250} />
            <Stat label="Heart rate" value={formatHR(brief.vitals_now.heart_rate)} alert={(brief.vitals_now.heart_rate ?? 0) > 110} />
            <Stat label="SpO2" value={formatSpO2(brief.vitals_now.spo2)} alert={(brief.vitals_now.spo2 ?? 100) < 92} />
          </Grid>
          <p className="text-xs text-muted-foreground">Logged {relTime(brief.vitals_now.logged_at)}</p>
        </Section>

        <Separator />

        <Section title="Medications">
          <ul className="space-y-1 text-sm">
            {brief.medications.map((m) => (
              <li key={m.name}>
                <span className="font-medium">{m.name}</span> {m.dosage}
                {m.last_taken && (
                  <span className="text-muted-foreground"> · last taken {relTime(m.last_taken)}</span>
                )}
                {m.missed_count_7d > 0 && (
                  <span className="text-destructive"> · MISSED {m.missed_count_7d}× in last 7 days</span>
                )}
              </li>
            ))}
            {brief.medications.length === 0 && <li className="text-muted-foreground">No active medications.</li>}
          </ul>
        </Section>

        <Separator />

        {brief.predicted_event && (
          <Section title="Predicted event">
            <p className="text-sm">
              {brief.predicted_event.type} ({Math.round(brief.predicted_event.confidence * 100)}% confidence)
            </p>
          </Section>
        )}

        <Section title="Location">
          <p className="text-sm">📍 {brief.location.address ?? `${brief.location.lat?.toFixed(3)}, ${brief.location.lng?.toFixed(3)}`}</p>
        </Section>

        {brief.destination && (
          <>
            <Separator />
            <Section title="Recommended destination">
              <p className="font-semibold">{brief.destination.name}</p>
              <p className="text-sm">{brief.destination.address}</p>
              <p className="text-sm text-muted-foreground">
                {brief.destination.beds_available}/{brief.destination.beds_total} beds · {brief.destination.distance_km?.toFixed(1)} km
              </p>
            </Section>
          </>
        )}
      </CardContent>
    </Card>
  );
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
    {children}
  </div>
);

const Grid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{children}</div>
);

const Stat = ({ label, value, alert }: { label: string; value: string; alert?: boolean }) => (
  <div className={`rounded-md border p-3 ${alert ? 'border-destructive bg-destructive/5' : ''}`}>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="font-semibold">{value} {alert && '⚠️'}</p>
  </div>
);
