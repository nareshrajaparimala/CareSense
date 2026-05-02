import Link from 'next/link';
import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 lg:grid-cols-2">
        {/* Left: brand panel — hidden on mobile */}
        <aside className="hidden flex-col justify-between bg-gradient-to-br from-slate-50 to-white p-10 lg:flex">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/caresense-logo.svg" alt="CareSense" className="h-9 w-9 rounded-lg" />
            <span className="text-lg font-semibold tracking-tight text-slate-900">CareSense</span>
          </Link>

          <div className="space-y-6">
            <h1 className="text-3xl font-semibold leading-tight tracking-tight text-slate-900">
              AI that watches between doctor visits.
            </h1>
            <p className="max-w-sm text-sm leading-relaxed text-slate-600">
              Continuous risk monitoring, medication adherence, and emergency alerts —
              for patients, caregivers, and doctors.
            </p>
            <ul className="space-y-2.5 text-sm text-slate-700">
              <Feature>Real-time vitals analysis</Feature>
              <Feature>WhatsApp & SMS alerting</Feature>
              <Feature>Doctor triage queue</Feature>
            </ul>
          </div>

          <p className="text-xs text-slate-400">© CareSense — built for the care continuum.</p>
        </aside>

        {/* Right: sign-in card */}
        <section className="flex items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-sm space-y-7">
            {/* Mobile brand */}
            <div className="text-center lg:hidden">
              <Link href="/" className="inline-flex items-center gap-2">
                <img src="/caresense-logo.svg" alt="CareSense" className="h-8 w-8 rounded-md" />
                <span className="text-lg font-semibold tracking-tight text-slate-900">CareSense</span>
              </Link>
            </div>

            <div className="space-y-1.5">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Welcome back</h2>
              <p className="text-sm text-slate-500">Sign in to continue to your dashboard.</p>
            </div>

            <LoginForm />

            <p className="text-center text-xs text-slate-400">
              By continuing you agree to CareSense's terms and privacy policy.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2.5">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/5 text-slate-700">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
      {children}
    </li>
  );
}
