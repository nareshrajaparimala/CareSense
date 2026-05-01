# 📚 DOCUMENT 1 — DOCS / REFERENCE

**Project:** CareSense
**Folder root:** `Hack/caresense/`
**Reference codebase (read-only):** `/Users/nareshraja/Desktop/Code/Gostudio.ai/main_gostudio.ai/gostudio-web-main/` — DO NOT MODIFY.

---

## 1. Stack (locked)

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) | Matches gostudio; route groups for role-based UI |
| Language | TypeScript (strict) | One language end-to-end |
| Runtime / pkg mgr | bun | Matches gostudio; faster installs |
| Styling | Tailwind CSS + shadcn/ui | Matches gostudio; copy components.json pattern |
| Charts | Recharts | Lightweight; baseline band + forecast band easy |
| Map | **react-leaflet + OpenStreetMap** | Free, no token; replaces Mapbox |
| DB / Auth | Supabase (Postgres + Auth) | Magic link + Google OAuth supported out of box |
| LLM | Claude API (`claude-haiku-4-5-20251001`) | Fast + cheap for alert explanations |
| Hosting | Vercel | Auto-deploy from `main` |
| Seeding | `bun run scripts/seed.ts` | TypeScript only — no Python in critical path |

---

## 2. Authentication Strategy

Two paths, same redirect logic.

### A) Magic Link (email)
- User enters email → Supabase sends OTP link → click → session created.
- Supabase Auth → Email → enable "Magic Link". No SMTP setup needed in dev (uses Supabase mailer).

### B) Google OAuth
- Supabase Dashboard → Auth → Providers → Google → enable.
- Add Google Cloud OAuth credentials:
  - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
  - Local dev redirect: `http://localhost:3000/auth/callback`
- Frontend: `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: <callback> } })`.

### Post-login flow (both paths)
```
auth callback → /auth/callback/route.ts (server)
  → exchangeCodeForSession()
  → check user_profile row exists
     ├── no  → redirect to /onboarding (pick role: patient/caregiver/doctor)
     └── yes → redirect by role:
                 patient   → /patient/dashboard
                 caregiver → /caregiver/home
                 doctor    → /doctor/dashboard
```

### Role gating
- `middleware.ts` reads session from cookies, checks `user_profile.role`, blocks cross-role access.
- `lib/auth/requireRole.ts` is the server-side helper used inside server components and API routes.

---

## 3. Folder Structure (canonical)

```
Hack/caresense/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── onboarding/page.tsx
│   ├── auth/callback/route.ts          # OAuth + magic link landing
│   ├── (patient)/
│   │   ├── dashboard/page.tsx
│   │   ├── log/page.tsx
│   │   └── trends/page.tsx
│   ├── (caregiver)/
│   │   ├── home/page.tsx
│   │   └── patient/[id]/page.tsx
│   ├── (doctor)/
│   │   ├── dashboard/page.tsx
│   │   └── patient/[id]/page.tsx
│   ├── emergency/[patientId]/page.tsx
│   ├── api/
│   │   ├── log-vitals/route.ts
│   │   ├── analyze/route.ts
│   │   ├── forecast/route.ts
│   │   ├── alert/route.ts
│   │   ├── emergency-brief/route.ts
│   │   └── hospitals/route.ts
│   ├── layout.tsx
│   ├── page.tsx                        # marketing landing
│   └── globals.css
├── components/
│   ├── ui/                             # shadcn primitives (button, card, dialog, …)
│   ├── charts/
│   │   ├── VitalTrendChart.tsx
│   │   ├── BaselineBand.tsx
│   │   └── ForecastChart.tsx
│   ├── alerts/
│   │   ├── AlertCard.tsx
│   │   ├── ShapBreakdown.tsx
│   │   └── ConfidenceBadge.tsx
│   ├── forms/
│   │   ├── DailyLogForm.tsx
│   │   └── MedicationChecklist.tsx
│   ├── dashboards/
│   │   ├── PatientStatusCard.tsx
│   │   ├── CaregiverPatientCard.tsx
│   │   └── DoctorPatientRow.tsx
│   ├── emergency/
│   │   ├── EmergencyBriefCard.tsx
│   │   └── HospitalMap.tsx             # react-leaflet
│   └── auth/
│       ├── LoginForm.tsx               # magic link + Google buttons
│       └── RoleGuard.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts                   # browser client (anon key)
│   │   ├── server.ts                   # server component / route handler client
│   │   └── admin.ts                    # service-role client (server-only, seed scripts)
│   ├── ai/
│   │   ├── baseline.ts
│   │   ├── shap.ts
│   │   ├── forecast.ts
│   │   ├── escalation.ts               # state machine: stable→watch→trend→risk→critical
│   │   └── llm-explainer.ts
│   └── auth/
│       ├── getSession.ts
│       └── requireRole.ts
├── utils/
│   ├── distance.ts                     # haversine
│   ├── vitalsFormat.ts
│   └── dateFormat.ts
├── types/
│   ├── supabase.ts                     # generated: `bun supabase gen types`
│   ├── domain.ts                       # Patient, Vital, Alert, Forecast, Shap
│   └── api.ts                          # request/response per endpoint
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 20260501000000_init_schema.sql
│   │   ├── 20260501000100_indexes.sql
│   │   └── 20260501000200_rls_policies.sql
│   └── seed.sql                        # hospital_mock rows
├── scripts/
│   ├── seed.ts                         # 3 patients × 30 days, TS
│   ├── seed_hospitals.json
│   └── compute-baselines.ts
├── public/
├── middleware.ts
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── components.json
├── package.json
├── bun.lockb
├── .env.local.example
└── README.md
```

---

## 4. Environment Variables

`.env.local.example`:
```
# Supabase (client-safe)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Supabase (server-only)
SUPABASE_SERVICE_ROLE_KEY=

# Claude
ANTHROPIC_API_KEY=

# App
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

No Mapbox token needed — react-leaflet uses OSM tiles directly.

---

## 5. Database Reference (summary — full SQL in `02_IMPLEMENTATION_PLAN.md` §3)

| Table | Purpose | Key columns |
|---|---|---|
| `user_profile` | extends `auth.users` | id, full_name, role |
| `patient` | clinical profile | id, user_id, age, sex, conditions[], lat/lng |
| `caregiver_link` | links caregivers ↔ patients | caregiver_id, patient_id |
| `vitals_log` | time-series | patient_id, logged_at, bp_*, glucose, hr, sleep |
| `medication` | active medications | patient_id, name, dosage, frequency |
| `medication_log` | adherence | medication_id, taken, scheduled_time |
| `patient_baseline` | computed normals | patient_id (PK), means + stds |
| `alert` | generated alerts | patient_id, level, shap_breakdown, forecast_72hr, confidence |
| `hospital_mock` | seeded hospitals | name, lat/lng, beds_available, specialty[] |
| `emergency_brief` | paramedic brief | alert_id, patient_id, brief_data jsonb |

---

## 6. RLS Policy Summary (file: `20260501000200_rls_policies.sql`)

Every table: `ALTER TABLE … ENABLE ROW LEVEL SECURITY;` then:

| Table | Policy |
|---|---|
| `user_profile` | own row read/write; doctors read all |
| `patient` | own row R/W (where user_id = auth.uid()); caregivers read via `caregiver_link`; doctors read all |
| `caregiver_link` | caregiver and patient can read their own links; only patient can insert |
| `vitals_log` | patient writes own; caregiver reads linked; doctor reads all |
| `medication` / `medication_log` | same as vitals_log |
| `patient_baseline` | service role only writes; patient/caregiver/doctor read |
| `alert` | service role writes; patient/caregiver/doctor read by patient |
| `hospital_mock` | public read |
| `emergency_brief` | linked caregiver + doctor read; service role write |

Service role bypasses RLS — used only in API routes / seed scripts via `lib/supabase/admin.ts`.

---

## 7. Patterns Borrowed from gostudio (DO NOT COPY CODE — pattern only)

| Pattern | gostudio file | Our analog |
|---|---|---|
| Three Supabase clients (browser/server/admin) | `lib/supabase.ts` + `utils/` | `lib/supabase/{client,server,admin}.ts` |
| `app/api/<route>/route.ts` for handlers | `app/api/*` | same |
| Generated types in `types/supabase.ts` | `types/supabase.ts` | same |
| `components.json` for shadcn | root | same |
| `middleware.ts` for auth gates | root | same |

---

## 8. Naming & Style Conventions

- **Components:** PascalCase, one component per file, named after the file.
- **Hooks:** `use<Thing>` in `lib/hooks/` (create if needed).
- **Server-only modules:** add `import 'server-only'` at top (Next.js guard).
- **Types:** suffix `T` for unions (`AlertLevelT`), no suffix for object types.
- **API responses:** always `{ ok: true, data } | { ok: false, error }` shape.
- **Colors (status):** `green` stable, `yellow` watch, `orange` trend, `red` risk, `crimson` critical. Wire as Tailwind tokens in `tailwind.config.ts`.

---

## 9. Demo Constants (used across components)

```ts
// lib/constants.ts
export const CRITICAL_BP_SYSTOLIC = 160;
export const ANOMALY_THRESHOLD_STD = 1.5;
export const CONFIDENCE_ACT = 0.85;
export const CONFIDENCE_MONITOR = 0.70;
export const FORECAST_HORIZON_HOURS = 72;
export const HERO_PATIENT_NAME = "Ramesh K.";
```

---

## 10. References for Implementation

- Next.js App Router: https://nextjs.org/docs/app
- Supabase Auth (Next.js): https://supabase.com/docs/guides/auth/server-side/nextjs
- Supabase Google OAuth: https://supabase.com/docs/guides/auth/social-login/auth-google
- react-leaflet: https://react-leaflet.js.org/
- shadcn/ui: https://ui.shadcn.com/docs
- Recharts: https://recharts.org/

---

## End of Document 1 — Docs / Reference
