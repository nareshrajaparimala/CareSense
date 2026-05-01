'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SplashUI } from './SplashUI';

export function Splash({ redirectTo = '/login', durationMs = 2600 }: { redirectTo?: string; durationMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.replace(redirectTo), durationMs);
    return () => clearTimeout(t);
  }, [router, redirectTo, durationMs]);

  return <SplashUI />;
}
