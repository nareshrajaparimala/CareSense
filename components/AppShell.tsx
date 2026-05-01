import { Sidebar, type NavItem } from './shell/Sidebar';
import { Topbar } from './shell/Topbar';

const NAV_BY_ROLE: Record<'patient' | 'caregiver' | 'doctor', NavItem[]> = {
  patient: [
    { href: '/patient/dashboard', label: 'Dashboard', icon: 'activity' },
    { href: '/patient/log', label: 'Log Vitals', icon: 'log' },
    { href: '/patient/trends', label: 'Trends', icon: 'trends' },
    { href: '/patient/meds', label: 'Medications', icon: 'log' },
    { href: '/patient/support', label: 'Care Team', icon: 'doctor' },
    { href: '/patient/settings', label: 'Settings', icon: 'family' }
  ],
  caregiver: [
    { href: '/caregiver/home', label: 'Family', icon: 'family' },
    { href: '/caregiver/home#alerts', label: 'Alerts', icon: 'alerts' }
  ],
  doctor: [
    { href: '/doctor/dashboard', label: 'Triage Queue', icon: 'doctor' },
    { href: '/doctor/dashboard#alerts', label: 'Alerts', icon: 'alerts' }
  ]
};

const SUBTITLE: Record<'patient' | 'caregiver' | 'doctor', string> = {
  patient: 'Personal Care',
  caregiver: 'Family Monitor',
  doctor: 'Clinical Intelligence'
};

const ROLE_LABEL: Record<'patient' | 'caregiver' | 'doctor', string> = {
  patient: 'Patient',
  caregiver: 'Caregiver',
  doctor: 'Clinician'
};

export function AppShell({
  role,
  children,
  title,
  user
}: {
  role: 'patient' | 'caregiver' | 'doctor';
  title?: string;
  user?: { name: string; role?: string };
  children: React.ReactNode;
}) {
  const u = {
    name: user?.name ?? '—',
    role: user?.role ?? ROLE_LABEL[role]
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        items={NAV_BY_ROLE[role]}
        user={u}
        subtitle={SUBTITLE[role]}
      />
      <div className="md:pl-64">
        <Topbar user={u} role={role} />
        <main className="px-4 pb-12 pt-6 md:px-8">
          {title && (
            <h1 className="mb-6 text-2xl font-bold tracking-tight">{title}</h1>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
