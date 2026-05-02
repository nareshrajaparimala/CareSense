'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function LoginForm() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const redirect = typeof window !== 'undefined' ? `${location.origin}/auth/callback` : '';

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
    <div className="space-y-5">
      <Button
        onClick={signInGoogle}
        variant="outline"
        size="lg"
        disabled={loading}
        className="w-full border-slate-200 bg-white font-medium text-slate-800 hover:bg-slate-50"
      >
        <GoogleIcon />
        <span className="ml-2">Continue with Google</span>
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-3 text-slate-400">or</span>
        </div>
      </div>

      {sent ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          Check your email — we sent a magic link to <strong>{email}</strong>.
        </div>
      ) : (
        <form onSubmit={sendMagicLink} className="space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="email-magic" className="text-xs font-medium text-slate-700">Email</Label>
            <Input
              id="email-magic"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11"
            />
          </div>
          <Button type="submit" size="lg" disabled={loading || !email} className="h-11 w-full">
            {loading ? 'Sending…' : 'Send magic link'}
          </Button>
        </form>
      )}

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}
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
