# ✅ DOCUMENT 3 — TASKS

Atomic, checkable tasks. ID format: `T<phase>.<seq>`. Each task has owner (N=Naresh, C=Chinmayi, B=Both), depends-on, and acceptance.

---

## Phase 0 — Setup (0–1 h)

| ID | Task | Owner | Deps | Acceptance |
|---|---|---|---|---|
| T0.1 | `bun create next-app caresense --typescript --tailwind --app` | N | — | `bun dev` shows Next.js welcome |
| T0.2 | `bunx shadcn-ui@latest init` | N | T0.1 | `components.json` exists |
| T0.3 | Install deps: `@supabase/supabase-js @supabase/ssr recharts react-leaflet leaflet lucide-react date-fns zod` | N | T0.1 | `package.json` updated |
| T0.4 | Install shadcn primitives: button, card, input, select, slider, badge, dialog, separator, tabs, table | C | T0.2 | Components in `components/ui/` |
| T0.5 | Create Supabase project, copy URL + anon + service_role keys | N | — | Keys in `.env.local` |
| T0.6 | Enable Google OAuth in Supabase dashboard + Magic Link | N | T0.5 | Both visible in Auth → Providers |
| T0.7 | Push to GitHub `main` + link Vercel | N | T0.1 | First Vercel deploy green |
| T0.8 | Set up Tailwind status color tokens (green/yellow/orange/red/crimson) | C | T0.1 | `tailwind.config.ts` extended |
| T0.9 | Create `.env.local.example` | N | T0.5 | File present with all keys (no secrets) |

---

## Phase 1 — Foundation (1–4 h)

| ID | Task | Owner | Deps | Acceptance |
|---|---|---|---|---|
| T1.1 | Write migration `20260501000000_init_schema.sql` (10 tables) | N | T0.5 | Migration applied via Supabase dashboard |
| T1.2 | Write migration `20260501000100_indexes.sql` | N | T1.1 | 3 indexes present |
| T1.3 | Write migration `20260501000200_rls_policies.sql` | N | T1.1 | RLS enabled on all tables |
| T1.4 | `lib/supabase/client.ts` — browser client | N | T0.3 | Type-safe export |
| T1.5 | `lib/supabase/server.ts` — server client (cookies) | N | T0.3 | Used by route handlers |
| T1.6 | `lib/supabase/admin.ts` — service-role client | N | T0.3 | `import 'server-only'` at top |
| T1.7 | `bun supabase gen types` → `types/supabase.ts` | N | T1.1 | Database types generated |
| T1.8 | `types/domain.ts` — Patient, Vital, Alert, Forecast, Shap | N | T1.7 | Compiles |
| T1.9 | `scripts/seed_hospitals.json` — 8 Bengaluru hospitals | N | — | Valid JSON |
| T1.10 | `scripts/seed.ts` — 3 patients × 30 days vitals + meds | N | T1.6, T1.9 | `bun run scripts/seed.ts` populates DB |
| T1.11 | `scripts/compute-baselines.ts` — fill `patient_baseline` for all | N | T1.10 | Baselines exist for all 3 patients |
| T1.12 | `app/layout.tsx` — global shell, Inter font, Toaster | C | T0.1 | All pages render inside |
| T1.13 | `components/auth/LoginForm.tsx` — magic link input + Google button | C | T0.4 | Both flows trigger Supabase calls |
| T1.14 | `app/(auth)/login/page.tsx` | C | T1.13 | `/login` renders form |
| T1.15 | `app/auth/callback/route.ts` — exchange code, redirect by role | N | T1.5 | Magic link + Google both land on dashboard |
| T1.16 | `middleware.ts` — auth gate + role redirect | N | T1.5 | Unauth user on `/patient/*` → `/login` |
| T1.17 | `app/(auth)/onboarding/page.tsx` — pick role + create user_profile | C+N | T1.5, T1.13 | New user picks role → row inserted |

---

## Phase 2 — Core Build (4–10 h)

### Pure logic (TS, no I/O) — testable

| ID | Task | Owner | Deps | Acceptance |
|---|---|---|---|---|
| T2.1 | `lib/ai/baseline.ts` — `detectAnomaly(current, mean, std)` | N | T1.8 | Unit tested with 3 fixtures |
| T2.2 | `lib/ai/shap.ts` — `computeShap(vitals, baseline, medLog, lifestyle)` | N | T1.8 | Returns normalized 0–1 contributions |
| T2.3 | `lib/ai/forecast.ts` — linear regression + interval + confidence | N | T1.8 | Returns predicted, low, high, days_to_critical |
| T2.4 | `lib/ai/escalation.ts` — state machine stable→watch→trend→risk→critical | N | T2.1 | Pure function: `decideLevel(scores)` |
| T2.5 | `lib/ai/llm-explainer.ts` — Claude call + JSON parse + fallback | N | T1.8 | Returns `{title, message, recommendation}` |
| T2.6 | `utils/distance.ts` — haversine | N | — | Returns km |

### API routes

| ID | Task | Owner | Deps | Acceptance |
|---|---|---|---|---|
| T2.7 | `POST /api/log-vitals` | N | T1.5, T2.1 | Inserts row, returns inserted vital |
| T2.8 | `POST /api/analyze` | N | T2.1, T2.2, T2.4 | Given patient_id, returns scores + level |
| T2.9 | `GET /api/forecast` | N | T2.3 | Returns 72hr projection |
| T2.10 | `POST /api/alert` | N | T2.5 | Creates alert row with LLM explanation |
| T2.11 | `GET /api/hospitals` | N | T2.6 | Returns top 5 by combined score |
| T2.12 | `GET /api/emergency-brief` | N | T2.10, T2.11 | Returns assembled brief JSON |

### UI

| ID | Task | Owner | Deps | Acceptance |
|---|---|---|---|---|
| T2.13 | `components/charts/VitalTrendChart.tsx` | C | T0.4 | Renders 7d/30d toggle |
| T2.14 | `components/charts/BaselineBand.tsx` | C | T2.13 | Shaded band = mean ± std |
| T2.15 | `components/dashboards/PatientStatusCard.tsx` | C | T0.4 | Color-coded by level |
| T2.16 | `components/forms/DailyLogForm.tsx` | C | T0.4 | Submits to `/api/log-vitals` |
| T2.17 | `app/(patient)/dashboard/page.tsx` | C | T2.15, T2.13 | Shows status + last vitals + trend |
| T2.18 | `app/(patient)/log/page.tsx` | C | T2.16 | Form → submit → redirect to dashboard |
| T2.19 | `app/(patient)/trends/page.tsx` | C | T2.13, T2.14 | 7/30 toggle + multi-vital |

---

## Phase 3 — Hero Features (10–15 h)

| ID | Task | Owner | Deps | Acceptance |
|---|---|---|---|---|
| T3.1 | `components/alerts/AlertCard.tsx` | C | T0.4 | Title + message + level pill |
| T3.2 | `components/alerts/ShapBreakdown.tsx` | C | T0.4 | Horizontal bar chart of contributions |
| T3.3 | `components/alerts/ConfidenceBadge.tsx` | C | T0.4 | High/Med/Low color tier |
| T3.4 | `components/charts/ForecastChart.tsx` | C | T2.13 | History + projection + confidence band |
| T3.5 | `components/dashboards/CaregiverPatientCard.tsx` | C | T0.4 | Status + CTA buttons |
| T3.6 | `app/(caregiver)/home/page.tsx` | C | T3.5 | Lists linked patients |
| T3.7 | `app/(caregiver)/patient/[id]/page.tsx` | C | T3.1, T3.2, T3.4 | Full alert + trends |
| T3.8 | `components/emergency/EmergencyBriefCard.tsx` | C | T0.4 | Renders brief JSON |
| T3.9 | `components/emergency/HospitalMap.tsx` (react-leaflet, dynamic import) | C | T0.3 | OSM map renders, 5 markers |
| T3.10 | `app/emergency/[patientId]/page.tsx` | C+N | T3.8, T3.9, T2.12 | Full emergency view |
| T3.11 | `components/dashboards/DoctorPatientRow.tsx` | C | T0.4 | Row with risk score |
| T3.12 | `app/(doctor)/dashboard/page.tsx` | C | T3.11 | Sorted triage list |
| T3.13 | `app/(doctor)/patient/[id]/page.tsx` | C | T3.7 | Same as caregiver detail + clinical fields |

---

## Phase 4 — Integration (15–18 h)

| ID | Task | Owner | Deps | Acceptance |
|---|---|---|---|---|
| T4.1 | End-to-end: log vital → alert appears in caregiver view | B | All P3 | Manual test passes |
| T4.2 | Verify Ramesh's deterioration story plays as scripted | B | T1.10 | Demo script timing matches |
| T4.3 | Empty states (no data, no alerts, loading skeletons) | C | — | No raw "undefined" anywhere |
| T4.4 | Mobile responsive (iPhone 12 viewport) | C | — | All pages usable at 390px |
| T4.5 | LLM fallback test (kill API key, verify hardcoded copy renders) | N | T2.5 | App still demos |
| T4.6 | Leaflet SSR check (no hydration warning) | C | T3.9 | Console clean |

---

## Phase 5–7 — Demo Prep / Rehearse / Buffer

See `02_IMPLEMENTATION_PLAN.md` §8 for hour split. Don't build new features after T4.

---

## Cut List (drop these first if behind schedule)

1. T3.13 — Doctor patient detail (use caregiver view URL instead)
2. T2.19 — `/patient/trends` separate page (fold into dashboard)
3. T3.4 — Forecast confidence band (show point estimate only)
4. Med-vital correlation insight card
5. Onboarding role pick (auto-assign 'patient' for new signups, switch via SQL for demo accounts)

---

## End of Document 3 — Tasks
