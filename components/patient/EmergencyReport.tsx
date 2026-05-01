'use client';

import { Download, Printer, MessageSquare } from 'lucide-react';

type Patient = {
  full_name: string;
  phone: string | null;
  age: number | null;
  sex: 'M' | 'F' | 'Other' | null;
  conditions: string[];
  allergies: string[];
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
};

type Vital = {
  logged_at: string;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  glucose_mgdl: number | null;
  heart_rate: number | null;
  spo2: number | null;
  sleep_hours: number | null;
  mood: number | null;
};

type Medication = { id: string; name: string; dosage: string | null; frequency: string | null };
type MedLog = { taken: boolean; logged_at: string; medication?: { name: string } | null };
type Alert = { id: string; level: string; title: string; message: string; created_at: string; status: string };
type Caregiver = { name: string; phone: string | null; email: string | null; relationship: string | null };

export function EmergencyReport({
  patient,
  vitals,
  medications,
  medLogs,
  alerts,
  caregivers
}: {
  patient: Patient;
  vitals: Vital[];
  medications: Medication[];
  medLogs: MedLog[];
  alerts: Alert[];
  caregivers: Caregiver[];
}) {
  const today = new Date();
  const generatedAt = today.toLocaleString();
  const last = vitals[0];
  const adherence = (() => {
    if (medLogs.length === 0) return null;
    const taken = medLogs.filter((m) => m.taken).length;
    return Math.round((taken / medLogs.length) * 100);
  })();

  // Build a short WhatsApp summary (the PDF itself is shared via "Save as PDF" → attach manually).
  const whatsappSummary = [
    `*CareSense Emergency Report — ${patient.full_name}*`,
    `${patient.age ?? '?'}y ${patient.sex ?? ''}${patient.conditions.length ? ` · ${patient.conditions.join(', ')}` : ''}`,
    last
      ? `Latest vitals (${new Date(last.logged_at).toLocaleString()}): BP ${last.bp_systolic ?? '-'}/${last.bp_diastolic ?? '-'}, glucose ${last.glucose_mgdl ?? '-'} mg/dL, HR ${last.heart_rate ?? '-'}, SpO₂ ${last.spo2 ?? '-'}%.`
      : 'No vitals logged yet.',
    medications.length ? `Meds: ${medications.map((m) => `${m.name}${m.dosage ? ` ${m.dosage}` : ''}`).join(', ')}.` : '',
    adherence != null ? `Adherence (recent): ${adherence}%.` : '',
    patient.allergies.length ? `Allergies: ${patient.allergies.join(', ')}.` : '',
    patient.emergency_contact_name ? `Emergency contact: ${patient.emergency_contact_name}${patient.emergency_contact_phone ? ` · ${patient.emergency_contact_phone}` : ''}.` : '',
    `Generated ${generatedAt} via CareSense.`
  ].filter(Boolean).join('\n');

  const shareWhatsApp = (toPhone?: string | null) => {
    const text = encodeURIComponent(whatsappSummary);
    // wa.me works on mobile and desktop; if a number is provided, prefilled to that contact.
    const phoneDigits = toPhone ? toPhone.replace(/[^\d]/g, '') : '';
    const url = phoneDigits ? `https://wa.me/${phoneDigits}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <main className="mx-auto max-w-4xl bg-white p-8 text-black">
      <div className="no-print mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-md bg-[#1E3FBF] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          <Download className="h-4 w-4" />
          Save as PDF
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold hover:bg-muted"
        >
          <Printer className="h-4 w-4" />
          Print
        </button>
        <button
          type="button"
          onClick={() => shareWhatsApp(patient.emergency_contact_phone)}
          className="inline-flex items-center gap-2 rounded-md bg-[#25D366] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          title={patient.emergency_contact_phone ? `Share with ${patient.emergency_contact_name ?? 'emergency contact'}` : 'Share via WhatsApp'}
        >
          <MessageSquare className="h-4 w-4" />
          Share on WhatsApp
        </button>
        <a
          href="/patient/dashboard"
          className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold hover:bg-muted"
        >
          Back to dashboard
        </a>
      </div>
      <p className="no-print -mt-3 mb-4 text-[11px] text-muted-foreground">
        Tip: tap <strong>Save as PDF</strong> first to download, then attach the saved file in WhatsApp after the prefilled message opens.
      </p>

      <header className="mb-6 border-b-2 border-[#1E3FBF] pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#1E3FBF]">
              CareSense — Emergency Medical Record
            </p>
            <h1 className="mt-1 text-3xl font-bold">{patient.full_name}</h1>
            <p className="text-sm text-gray-600">
              Generated {generatedAt}
            </p>
          </div>
          <div className="text-right text-xs">
            <p className="font-semibold">For emergency use</p>
            <p className="text-gray-600">Verify all data with the patient</p>
          </div>
        </div>
      </header>

      <Section title="Patient Information">
        <Grid>
          <Field label="Full name" value={patient.full_name} />
          <Field label="Phone" value={patient.phone ?? '—'} />
          <Field label="Age" value={patient.age != null ? String(patient.age) : '—'} />
          <Field label="Sex" value={patient.sex ?? '—'} />
          <Field label="Address" value={patient.address ?? '—'} full />
        </Grid>
      </Section>

      <Section title="Critical Medical Info">
        <Grid>
          <Field label="Conditions" value={patient.conditions.join(', ') || '—'} full />
          <Field label="Allergies" value={patient.allergies.join(', ') || '— None reported —'} full />
        </Grid>
      </Section>

      <Section title="Emergency Contact">
        <Grid>
          <Field label="Name" value={patient.emergency_contact_name ?? '—'} />
          <Field label="Phone" value={patient.emergency_contact_phone ?? '—'} />
        </Grid>
      </Section>

      <Section title="Active Medications">
        {medications.length === 0 ? (
          <p className="text-sm text-gray-600">None recorded.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-1.5 pr-3">Name</th>
                <th className="py-1.5 pr-3">Dosage</th>
                <th className="py-1.5">Frequency</th>
              </tr>
            </thead>
            <tbody>
              {medications.map((m) => (
                <tr key={m.id} className="border-b">
                  <td className="py-1.5 pr-3 font-medium">{m.name}</td>
                  <td className="py-1.5 pr-3">{m.dosage ?? '—'}</td>
                  <td className="py-1.5">{m.frequency ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {adherence != null && (
          <p className="mt-2 text-xs text-gray-600">
            Adherence (last {medLogs.length} logs): <strong>{adherence}%</strong> taken
          </p>
        )}
      </Section>

      <Section title="Most Recent Vitals">
        {last ? (
          <Grid>
            <Field label="When" value={new Date(last.logged_at).toLocaleString()} />
            <Field
              label="Blood pressure"
              value={
                last.bp_systolic && last.bp_diastolic
                  ? `${last.bp_systolic}/${last.bp_diastolic} mmHg`
                  : '—'
              }
            />
            <Field
              label="Glucose"
              value={last.glucose_mgdl != null ? `${last.glucose_mgdl} mg/dL` : '—'}
            />
            <Field label="Heart rate" value={last.heart_rate != null ? `${last.heart_rate} bpm` : '—'} />
            <Field label="SpO₂" value={last.spo2 != null ? `${last.spo2}%` : '—'} />
            <Field label="Sleep" value={last.sleep_hours != null ? `${last.sleep_hours} h` : '—'} />
          </Grid>
        ) : (
          <p className="text-sm text-gray-600">No vitals logged.</p>
        )}
      </Section>

      <Section title="Vitals History (last 30)">
        {vitals.length === 0 ? (
          <p className="text-sm text-gray-600">No history available.</p>
        ) : (
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b text-left">
                <th className="py-1 pr-2">When</th>
                <th className="py-1 pr-2">BP</th>
                <th className="py-1 pr-2">Glu</th>
                <th className="py-1 pr-2">HR</th>
                <th className="py-1 pr-2">SpO₂</th>
                <th className="py-1 pr-2">Sleep</th>
                <th className="py-1">Mood</th>
              </tr>
            </thead>
            <tbody>
              {vitals.map((v, i) => (
                <tr key={i} className="border-b">
                  <td className="py-1 pr-2">{new Date(v.logged_at).toLocaleDateString()}</td>
                  <td className="py-1 pr-2">
                    {v.bp_systolic && v.bp_diastolic ? `${v.bp_systolic}/${v.bp_diastolic}` : '—'}
                  </td>
                  <td className="py-1 pr-2">{v.glucose_mgdl ?? '—'}</td>
                  <td className="py-1 pr-2">{v.heart_rate ?? '—'}</td>
                  <td className="py-1 pr-2">{v.spo2 != null ? `${v.spo2}%` : '—'}</td>
                  <td className="py-1 pr-2">{v.sleep_hours != null ? `${v.sleep_hours}h` : '—'}</td>
                  <td className="py-1">{v.mood ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Recent Alerts">
        {alerts.length === 0 ? (
          <p className="text-sm text-gray-600">No alerts on record.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {alerts.map((a) => (
              <li key={a.id} className="border-l-4 border-[#1E3FBF] pl-3">
                <p className="font-semibold">
                  {a.title}{' '}
                  <span className="ml-1 text-xs uppercase text-gray-500">
                    [{a.level}] · {a.status}
                  </span>
                </p>
                <p className="text-xs text-gray-600">{new Date(a.created_at).toLocaleString()}</p>
                <p>{a.message}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {caregivers.length > 0 && (
        <Section title="Authorised Caregivers">
          <ul className="space-y-1 text-sm">
            {caregivers.map((c, i) => (
              <li key={i}>
                <strong>{c.name}</strong>
                {c.relationship ? ` (${c.relationship})` : ''} — {c.phone ?? c.email ?? 'no contact'}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <footer className="mt-8 border-t pt-3 text-center text-[10px] text-gray-500">
        Generated by CareSense · Personal-baseline AI · Confidential — for the patient and their care team only.
      </footer>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          @page { margin: 0.6in; }
          body { background: white !important; }
        }
      `}</style>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 break-inside-avoid">
      <h2 className="mb-2 border-b text-sm font-bold uppercase tracking-wider text-[#1E3FBF]">{title}</h2>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">{children}</dl>;
}

function Field({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
