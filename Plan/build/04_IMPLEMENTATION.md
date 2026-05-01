# 🔧 DOCUMENT 4 — IMPLEMENTATION

File-by-file build guide. Signatures, key snippets, gotchas. Pair with `03_TASKS.md` for sequencing.

---

## 1. Project Bootstrap

```bash
cd /Users/nareshraja/Desktop/Hack
bun create next-app caresense --typescript --tailwind --app --eslint --no-src-dir --import-alias "@/*"
cd caresense
bunx shadcn-ui@latest init   # base color: slate; CSS vars: yes
bun add @supabase/supabase-js @supabase/ssr recharts react-leaflet leaflet lucide-react date-fns zod
bun add -d @types/leaflet supabase
bunx shadcn-ui@latest add button card input select slider badge dialog separator tabs table form label toast
```

`tailwind.config.ts` — add status colors:
```ts
extend: {
  colors: {
    status: {
      stable: '#16a34a', watch: '#eab308', trend: '#f97316',
      risk: '#dc2626', critical: '#991b1b'
    }
  }
}
```

---

## 2. Supabase Clients

### `lib/supabase/client.ts` (browser)
```ts
'use client';
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

export const createClient = () =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
```

### `lib/supabase/server.ts` (server components / route handlers)
```ts
import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export const createClient = () => {
  const cookieStore = cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: (name, value, options) => { try { cookieStore.set({ name, value, ...options }); } catch {} },
        remove: (name, options) => { try { cookieStore.set({ name, value: '', ...options }); } catch {} },
      },
    }
  );
};
```

### `lib/supabase/admin.ts` (service role — server only)
```ts
import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
```

---

## 3. Auth

### `components/auth/LoginForm.tsx`
```tsx
'use client';
import { createClient } from '@/lib/supabase/client';
import { useState } from 'react';

export function LoginForm() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const sendMagicLink = async () => {
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` }
    });
    setSent(true);
  };

  const signInGoogle = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` }
    });

  return (
    <div className="space-y-4">
      <button onClick={signInGoogle} className="w-full">Continue with Google</button>
      <div className="text-center text-xs text-muted-foreground">or</div>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
      <button onClick={sendMagicLink} disabled={!email}>Send magic link</button>
      {sent && <p className="text-sm text-green-600">Check your email.</p>}
    </div>
  );
}
```

### `app/auth/callback/route.ts`
```ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  if (!code) return NextResponse.redirect(new URL('/login', url));

  const supabase = createClient();
  await supabase.auth.exchangeCodeForSession(code);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', url));

  const { data: profile } = await supabase
    .from('user_profile').select('role').eq('id', user.id).maybeSingle();

  if (!profile) return NextResponse.redirect(new URL('/onboarding', url));

  const dest = {
    patient: '/patient/dashboard',
    caregiver: '/caregiver/home',
    doctor: '/doctor/dashboard'
  }[profile.role] ?? '/onboarding';

  return NextResponse.redirect(new URL(dest, url));
}
```

### `middleware.ts` (auth gate)
```ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const ROLE_PREFIX: Record<string, string> = {
  '/patient': 'patient', '/caregiver': 'caregiver', '/doctor': 'doctor',
};

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (n) => req.cookies.get(n)?.value,
        set: (n, v, o) => res.cookies.set({ name: n, value: v, ...o }),
        remove: (n, o) => res.cookies.set({ name: n, value: '', ...o }),
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();

  const path = req.nextUrl.pathname;
  const protectedPrefix = Object.keys(ROLE_PREFIX).find(p => path.startsWith(p));
  if (protectedPrefix && !user) return NextResponse.redirect(new URL('/login', req.url));

  return res;
}

export const config = { matcher: ['/patient/:path*', '/caregiver/:path*', '/doctor/:path*', '/emergency/:path*'] };
```

---

## 4. AI / ML modules (`lib/ai/*`)

### `baseline.ts`
```ts
export type AnomalyResult = { isAnomaly: boolean; deviation: number; severity: 'normal'|'moderate'|'high'|'critical' };

export function detectAnomaly(current: number, mean: number, std: number, threshold = 1.5): AnomalyResult {
  if (!std || std === 0) return { isAnomaly: false, deviation: 0, severity: 'normal' };
  const dev = (current - mean) / std;
  const abs = Math.abs(dev);
  const severity = abs > 2.5 ? 'critical' : abs > 2.0 ? 'high' : abs > 1.5 ? 'moderate' : 'normal';
  return { isAnomaly: abs > threshold, deviation: dev, severity };
}
```

### `forecast.ts`
```ts
export function forecast72hr(history: number[], criticalThreshold: number) {
  const n = history.length;
  if (n < 7) return null; // insufficient data
  const x = history.map((_, i) => i);
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = history.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((a, xi, i) => a + xi * history[i], 0);
  const sumX2 = x.reduce((a, xi) => a + xi * xi, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  const projDay = n + 3;
  const predicted = intercept + slope * projDay;
  const residuals = history.map((y, i) => y - (intercept + slope * i));
  const stdRes = Math.sqrt(residuals.reduce((a, b) => a + b * b, 0) / Math.max(n - 2, 1));
  const days_to_critical = slope > 0
    ? Math.min(30, Math.max(0, (criticalThreshold - intercept - slope * n) / slope))
    : 30;
  const confidence = Math.min(0.95, (n / 30) * Math.min(1, Math.abs(slope) * 10));
  return {
    predicted, interval_low: predicted - 1.96 * stdRes, interval_high: predicted + 1.96 * stdRes,
    days_to_critical, confidence
  };
}
```

### `shap.ts`, `escalation.ts`, `llm-explainer.ts`
See `02_IMPLEMENTATION_PLAN.md` §7 for shap + LLM. `escalation.ts`:
```ts
export type Level = 'stable'|'watch'|'trend'|'risk'|'critical';
export function decideLevel(p: { severity: 'normal'|'moderate'|'high'|'critical'; consecutiveDays: number; forecastConfidence: number; daysToCritical: number; }): Level {
  if (p.severity === 'critical' || p.daysToCritical < 1) return 'critical';
  if (p.forecastConfidence > 0.75 && p.daysToCritical < 3) return 'risk';
  if (p.consecutiveDays >= 3) return 'trend';
  if (p.severity !== 'normal') return 'watch';
  return 'stable';
}
```

---

## 5. API Routes

Pattern (every route):
```ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const Body = z.object({ /* ... */ });

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });

  // ... business logic
  return NextResponse.json({ ok: true, data: result });
}
```

### `/api/log-vitals` flow
```
1. Validate body
2. Insert into vitals_log
3. Trigger /api/analyze (internal call) or call analyze() directly
4. Return { ok: true, data: { vital, alert? } }
```

### `/api/analyze` flow
```
1. Fetch last 30 days of vitals (DESC)
2. Fetch patient_baseline
3. For each vital: detectAnomaly()
4. Count consecutive days deviating
5. Fetch last 7 days medication_log → missed%
6. computeShap()
7. forecast72hr() on bp_systolic series
8. decideLevel()
9. If level !== 'stable' → POST /api/alert (LLM explanation + insert)
10. Return { level, scores, forecast, alertId? }
```

### `/api/hospitals`
```ts
// haversine + sort by (beds_available DESC, distance ASC)
const ranked = hospitals
  .map(h => ({ ...h, distance_km: haversine(lat, lng, h.lat, h.lng) }))
  .filter(h => specialty ? h.specialty.includes(specialty) : true)
  .sort((a, b) => b.beds_available - a.beds_available || a.distance_km - b.distance_km)
  .slice(0, 5);
```

---

## 6. Components — key gotchas

### `HospitalMap.tsx` — must be dynamic to avoid SSR
```tsx
// In parent:
import dynamic from 'next/dynamic';
const HospitalMap = dynamic(() => import('@/components/emergency/HospitalMap'), { ssr: false });
```
Inside `HospitalMap.tsx`:
```tsx
'use client';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
// ... fix default icon paths (Leaflet quirk)
```

### `VitalTrendChart.tsx` — Recharts with baseline band
- Use `<ReferenceArea>` for baseline band (mean ± std).
- Use `<ReferenceLine>` for critical threshold.
- Toggle 7d/30d via `useState`.

### `ShapBreakdown.tsx`
- Horizontal bars, three rows, percentages.
- Color-code: vital_change=red, medication=orange, lifestyle=yellow.
- Caption from `alert.message` below bars.

### `ForecastChart.tsx`
- Line for actual + dashed line for projection.
- `<Area>` with `interval_low`/`interval_high` for confidence band.
- Marker at "days_to_critical" point.

---

## 7. Seed Script (`scripts/seed.ts`)

Skeleton:
```ts
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function seedRamesh() {
  // 1. Create auth user (sb.auth.admin.createUser)
  // 2. Insert user_profile (role='patient')
  // 3. Insert patient row (62M, conditions: ['diabetes','hypertension'])
  // 4. Insert medication: Metformin, Amlodipine
  // 5. Insert 30 days vitals_log:
  //    Days 1-17: BP ~128/82 + N(0,3) noise, glucose ~135
  //    Days 18-22: BP rises 132→138→142→145→148, glucose creeps to 180
  //    Sleep drops 7→4.5 from day 18
  // 6. Insert medication_log:
  //    Days 1-15: all taken
  //    Days 16-18: Amlodipine missed 3 times
}

async function seedLakshmi() { /* stable 30 days */ }
async function seedSuresh()  { /* spike day 15-18 then resolved */ }
async function seedHospitals() {
  const json = await import('./seed_hospitals.json', { assert: { type: 'json' } });
  await sb.from('hospital_mock').insert(json.default);
}

await seedHospitals();
await seedRamesh();
await seedLakshmi();
await seedSuresh();
console.log('✅ Seed complete');
```

Run: `bun run scripts/seed.ts`

---

## 8. RLS Policies (sketch)

```sql
ALTER TABLE patient ENABLE ROW LEVEL SECURITY;

-- Patient reads own
CREATE POLICY patient_self_read ON patient
  FOR SELECT USING (user_id = auth.uid());

-- Caregiver reads linked patients
CREATE POLICY patient_caregiver_read ON patient
  FOR SELECT USING (id IN (
    SELECT patient_id FROM caregiver_link WHERE caregiver_id = auth.uid()
  ));

-- Doctor reads all (MVP simplification)
CREATE POLICY patient_doctor_read ON patient
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profile WHERE id = auth.uid() AND role = 'doctor')
  );

-- Patient inserts/updates own
CREATE POLICY patient_self_write ON patient
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```
Repeat the pattern for `vitals_log`, `medication_log`, `alert`, `emergency_brief` (use `patient.user_id` lookup).
`hospital_mock`: `FOR SELECT USING (true)` — public.

---

## 9. Tests (lightweight)

Add `vitest` for pure functions only:
```bash
bun add -d vitest
```
Test files:
- `lib/ai/baseline.test.ts` — 3 fixtures for `detectAnomaly`
- `lib/ai/forecast.test.ts` — flat / rising / falling series
- `lib/ai/escalation.test.ts` — table-driven over level transitions
- `utils/distance.test.ts` — known city pair

Skip integration tests; manual demo flow check is enough.

---

## End of Document 4 — Implementation
