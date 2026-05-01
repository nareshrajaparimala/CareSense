import Link from 'next/link';
import { SignOutButton } from './SignOutButton';

export function AppShell({
  role,
  children,
  title
}: {
  role: 'patient' | 'caregiver' | 'doctor';
  title?: string;
  children: React.ReactNode;
}) {
  const home =
    role === 'patient' ? '/patient/dashboard' :
    role === 'caregiver' ? '/caregiver/home' : '/doctor/dashboard';

  const navItems =
    role === 'patient'
      ? [
          { href: '/patient/dashboard', label: 'Today' },
          { href: '/patient/log', label: 'Log' },
          { href: '/patient/trends', label: 'Trends' }
        ]
      : role === 'caregiver'
      ? [{ href: '/caregiver/home', label: 'Family' }]
      : [{ href: '/doctor/dashboard', label: 'Triage' }];

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href={home} className="text-lg font-bold">CareSense</Link>
            <nav className="flex gap-4 text-sm">
              {navItems.map((n) => (
                <Link key={n.href} href={n.href} className="text-muted-foreground hover:text-foreground">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <SignOutButton />
        </div>
      </header>
      <main className="container py-6">
        {title && <h1 className="mb-6 text-2xl font-bold tracking-tight">{title}</h1>}
        {children}
      </main>
    </div>
  );
}
