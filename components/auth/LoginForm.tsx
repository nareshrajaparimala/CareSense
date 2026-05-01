'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

// Demo accounts seeded by scripts/seed.ts — password is `password123`.
// Used for instant one-click demo sign-in (no magic-link round-trip).
const DEMO_PASSWORD = 'password123';
const DEMO_EMAILS: Array<{ email: string; label: string; role: 'patient' | 'caregiver' | 'doctor' }> = [
  { email: 'priya@caresense.demo',   label: 'Priya (Caregiver)',                    role: 'caregiver' },
  { email: 'ramesh@caresense.demo',  label: 'Ramesh (Patient — deteriorating)',     role: 'patient' },
  { email: 'lakshmi@caresense.demo', label: 'Lakshmi (Patient — stable)',           role: 'patient' },
  { email: 'suresh@caresense.demo',  label: 'Suresh (Patient — resolved)',          role: 'patient' },
  { email: 'dr.shah@caresense.demo', label: 'Dr. Shah (Doctor)',                    role: 'doctor' }
];

const HOME_FOR_ROLE: Record<string, string> = {
  patient: '/patient/dashboard',
  caregiver: '/caregiver/dashboard',
  doctor: '/doctor/dashboard'
};

export function LoginForm() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoadingFor, setDemoLoadingFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const redirect = typeof window !== 'undefined' ? `${location.origin}/auth/callback` : '';

  const signInDemo = async (acct: typeof DEMO_EMAILS[number]) => {
    setError(null);
    setDemoLoadingFor(acct.email);
    const { error } = await supabase.auth.signInWithPassword({
      email: acct.email,
      password: DEMO_PASSWORD
    });
    if (error) {
      setDemoLoadingFor(null);
      setError(`Demo sign-in failed: ${error.message}. Run \`npm run seed\` to provision demo accounts.`);
      return;
    }
    // Land directly on the role's dashboard — no email round-trip.
    router.push(HOME_FOR_ROLE[acct.role] ?? '/');
    router.refresh();
  };

  const sendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true); setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirect }
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  };

  const signInGoogle = async () => {
    setLoading(true); setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirect }
    });
    if (error) { setError(error.message); setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <Button onClick={signInGoogle} variant="outline" size="lg" disabled={loading} className="w-full">
        <GoogleIcon />
        Continue with Google
      </Button>

      <div className="relative">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs uppercase text-muted-foreground">
          or
        </span>
      </div>

      {sent ? (
        <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          Check your email — we sent a magic link to <strong>{email}</strong>.
        </div>
      ) : (
        <form onSubmit={sendMagicLink} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button type="submit" size="lg" disabled={loading || !email} className="w-full">
            {loading ? 'Sending…' : 'Send magic link'}
          </Button>
        </form>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <details className="rounded-md border bg-muted/30 p-3 text-xs" open>
        <summary className="cursor-pointer font-medium">
          Demo accounts — instant sign-in (no email needed)
        </summary>
        <ul className="mt-3 space-y-1.5">
          {DEMO_EMAILS.map((a) => (
            <li key={a.email}>
              <button
                type="button"
                disabled={demoLoadingFor !== null}
                onClick={() => signInDemo(a)}
                className="w-full rounded-md border bg-background px-3 py-2 text-left text-xs hover:border-primary hover:bg-accent disabled:opacity-50"
              >
                <span className="font-medium text-primary">
                  {demoLoadingFor === a.email ? 'Signing in…' : a.label}
                </span>
                <span className="ml-1 text-muted-foreground">— {a.email}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Sign-in uses the seeded password from <code>scripts/seed.ts</code>. Real users still get a magic link above.
        </p>
      </details>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.12A6.97 6.97 0 0 1 5.46 12c0-.74.13-1.45.36-2.12V7.04H2.18A10.98 10.98 0 0 0 1 12c0 1.77.42 3.45 1.18 4.96l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.07.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
    </svg>
  );
}
