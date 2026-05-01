import { Phone, Mail, MapPin, Stethoscope, Calendar, ShieldCheck, MessageSquare } from 'lucide-react';
import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/requireRole';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { AppShell } from '@/components/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Reference doctor roster shown to every patient. Real (seeded) doctor accounts are
// merged in from user_profile so the list stays in sync with whoever's actually in the system.
const REFERENCE_DOCTORS: DoctorCard[] = [
  {
    id: 'ref-shah',
    full_name: 'Dr. Anil Shah',
    specialty: 'Cardiology · Hypertension',
    hospital: 'Apollo Hospitals, Bangalore',
    phone: '+91 80 4612 3456',
    email: 'dr.shah@caresense.demo',
    languages: ['English', 'Hindi', 'Kannada'],
    experience_years: 18,
    availability: 'Mon–Fri · 9:00 AM – 5:00 PM',
    notes: 'Primary care for hypertension & coronary follow-up. Available on-call for CareSense alerts.'
  },
  {
    id: 'ref-rao',
    full_name: 'Dr. Meera Rao',
    specialty: 'Endocrinology · Diabetes',
    hospital: 'Manipal Hospital, Whitefield',
    phone: '+91 80 2502 4444',
    email: 'meera.rao@manipalhospitals.com',
    languages: ['English', 'Telugu', 'Kannada'],
    experience_years: 12,
    availability: 'Tue–Sat · 10:00 AM – 6:00 PM',
    notes: 'Insulin titration, glucose-trend reviews, and diet planning.'
  },
  {
    id: 'ref-iyer',
    full_name: 'Dr. Suresh Iyer',
    specialty: 'Geriatric Medicine',
    hospital: 'Fortis Hospital, Bannerghatta',
    phone: '+91 80 6621 4444',
    email: 'suresh.iyer@fortishealthcare.com',
    languages: ['English', 'Tamil', 'Hindi'],
    experience_years: 22,
    availability: 'Mon, Wed, Fri · 11:00 AM – 4:00 PM',
    notes: 'Senior-care specialist — manages multi-condition older adults.'
  },
  {
    id: 'ref-pillai',
    full_name: 'Dr. Aditi Pillai',
    specialty: 'Nephrology',
    hospital: 'Narayana Health, Bommasandra',
    phone: '+91 80 7122 2200',
    email: 'aditi.pillai@narayanahealth.org',
    languages: ['English', 'Malayalam', 'Hindi'],
    experience_years: 9,
    availability: 'Wed–Sun · 9:00 AM – 3:00 PM',
    notes: 'Kidney health, eGFR monitoring, BP-related renal risk.'
  }
];

type DoctorCard = {
  id: string;
  full_name: string;
  specialty: string;
  hospital: string;
  phone: string;
  email: string;
  languages: string[];
  experience_years: number;
  availability: string;
  notes: string;
};

export default async function PatientSupportPage() {
  const session = await requireRole('patient');

  const { data: patient } = await supabaseAdmin
    .from('patient')
    .select('id, conditions, emergency_contact_name, emergency_contact_phone')
    .eq('user_id', session.user.id)
    .maybeSingle();
  if (!patient) redirect('/onboarding');

  // Pull any real seeded doctors and prepend them so they show up first.
  const { data: liveDoctors } = await supabaseAdmin
    .from('user_profile')
    .select('id, full_name, role, phone')
    .eq('role', 'doctor');

  const live: DoctorCard[] = ((liveDoctors ?? []) as any[]).map((d) => ({
    id: d.id,
    full_name: d.full_name ?? 'Care doctor',
    specialty: 'On-call clinician',
    hospital: 'CareSense network',
    phone: d.phone ?? '+91 1800 200 200',
    email: d.full_name ? `${slug(d.full_name)}@caresense.demo` : 'care@caresense.demo',
    languages: ['English', 'Hindi'],
    experience_years: 15,
    availability: '24×7 via CareSense alerts',
    notes: 'Reviews CareSense triage queue and reaches out when an alert escalates.'
  }));

  const doctors = [...live, ...REFERENCE_DOCTORS];
  const conditions = ((patient as any).conditions ?? []) as string[];

  return (
    <AppShell role="patient" title="Care Team & Support" user={{ name: session.profile.full_name }}>
      <div className="space-y-8">
        <Card className="border-l-4 border-l-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" /> Need help right now?
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <a
              href="tel:108"
              className="flex items-center gap-3 rounded-lg border bg-destructive/5 p-4 transition hover:border-destructive"
            >
              <span className="rounded-full bg-destructive/10 p-2 text-destructive">
                <Phone className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">Emergency · 108</p>
                <p className="text-xs text-muted-foreground">Indian ambulance services</p>
              </div>
            </a>
            <a
              href={`tel:${patient.emergency_contact_phone ?? ''}`}
              className={`flex items-center gap-3 rounded-lg border p-4 transition hover:border-primary ${
                patient.emergency_contact_phone ? '' : 'pointer-events-none opacity-60'
              }`}
            >
              <span className="rounded-full bg-primary/10 p-2 text-primary">
                <Phone className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">
                  {patient.emergency_contact_name ?? 'Emergency contact'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {patient.emergency_contact_phone ?? 'Add one in Settings'}
                </p>
              </div>
            </a>
            <a
              href="tel:+918012001200"
              className="flex items-center gap-3 rounded-lg border bg-card p-4 transition hover:border-primary"
            >
              <span className="rounded-full bg-emerald-100 p-2 text-emerald-700">
                <MessageSquare className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">CareSense Hotline</p>
                <p className="text-xs text-muted-foreground">+91 80 1200 1200 · 24×7</p>
              </div>
            </a>
          </CardContent>
        </Card>

        <div>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="text-lg font-bold">Your care team</h2>
              <p className="text-xs text-muted-foreground">
                {conditions.length > 0
                  ? `Matched to your conditions: ${conditions.join(', ')}`
                  : 'Doctors on the CareSense network'}
              </p>
            </div>
            <span className="text-xs text-muted-foreground">{doctors.length} clinicians</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {doctors.map((d) => (
              <DoctorCardView key={d.id} d={d} highlight={matchesCondition(d, conditions)} />
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function DoctorCardView({ d, highlight }: { d: DoctorCard; highlight: boolean }) {
  return (
    <Card
      className={`flex h-full flex-col transition-shadow hover:shadow-md ${
        highlight ? 'border-l-4 border-l-emerald-500' : ''
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary">
            {initials(d.full_name)}
          </div>
          <div className="min-w-0">
            <CardTitle className="text-base">{d.full_name}</CardTitle>
            <p className="mt-0.5 text-xs font-medium text-primary">{d.specialty}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" /> {d.hospital}
            </p>
          </div>
        </div>
        {highlight && (
          <span className="mt-3 inline-flex items-center gap-1 self-start rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            <Stethoscope className="h-3 w-3" /> Matches your condition
          </span>
        )}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 text-sm">
        <p className="text-xs text-muted-foreground">{d.notes}</p>

        <ul className="space-y-1.5 text-xs">
          <li className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> {d.availability}
          </li>
          <li className="flex items-center gap-2 text-muted-foreground">
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
              {d.experience_years}+ yrs
            </span>
            Speaks: {d.languages.join(', ')}
          </li>
        </ul>

        <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
          <a
            href={`tel:${d.phone.replace(/\s/g, '')}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            <Phone className="h-3.5 w-3.5" /> Call
          </a>
          <a
            href={`mailto:${d.email}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border bg-card px-3 py-2 text-xs font-semibold hover:bg-accent"
          >
            <Mail className="h-3.5 w-3.5" /> Email
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

function initials(name: string): string {
  return name
    .replace(/^(Dr\.?|Mr\.?|Ms\.?|Mrs\.?)\s+/i, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('');
}

function slug(name: string): string {
  return name.toLowerCase().replace(/^dr\.?\s+/, '').replace(/[^a-z]+/g, '.').replace(/^\.+|\.+$/g, '');
}

function matchesCondition(d: DoctorCard, conditions: string[]): boolean {
  if (!conditions.length) return false;
  const haystack = `${d.specialty} ${d.notes}`.toLowerCase();
  return conditions.some((c) => {
    const k = c.toLowerCase();
    if (k.includes('diabetes')) return haystack.includes('diabet') || haystack.includes('endocr');
    if (k.includes('hypertension')) return haystack.includes('hypertens') || haystack.includes('cardio');
    if (k.includes('cardiac') || k.includes('heart')) return haystack.includes('cardio');
    if (k.includes('kidney') || k.includes('renal')) return haystack.includes('nephro');
    return haystack.includes(k);
  });
}
