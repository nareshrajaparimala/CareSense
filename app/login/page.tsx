import Link from 'next/link';
import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50">
      {/* Decorative background */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-100/30 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Left: brand panel */}
            <aside className="relative hidden flex-col justify-between bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-10 text-white lg:flex">
              <Link href="/" className="flex items-center gap-2.5">
                <img src="/caresense-logo.svg" alt="CareSense" className="h-9 w-9 rounded-lg bg-white/10 p-1" />
                <span className="text-lg font-semibold tracking-tight">CareSense</span>
              </Link>

              <div className="space-y-6">
                <h1 className="text-3xl font-semibold leading-tight tracking-tight">
                  AI that watches between doctor visits.
                </h1>
                <p className="max-w-sm text-sm leading-relaxed text-slate-200">
                  Continuous risk monitoring, medication adherence, and emergency alerts —
                  for patients, caregivers, and doctors.
                </p>
                <ul className="space-y-2.5 text-sm text-slate-100">
                  <Feature>Real-time vitals analysis</Feature>
                  <Feature>WhatsApp & SMS alerting</Feature>
                  <Feature>Doctor triage queue</Feature>
                </ul>
              </div>

              <p className="text-xs text-slate-300/70">© CareSense — built for the care continuum.</p>
            </aside>

            {/* Right: sign-in card */}
            <section className="flex items-center justify-center px-6 py-12 sm:px-10">
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
        </div>
      </div>
    </main>
  );
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2.5">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15 text-white">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
      {children}
    </li>
  );
}
