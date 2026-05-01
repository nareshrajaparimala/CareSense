# CareSense

AI health companion for chronic patients. Web-based: patient logs vitals → personal-baseline anomaly detection → 72h forecast → SHAP-style explainable alerts → graduated escalation → emergency brief with hospital map.

Built with Next.js 14 (App Router), TypeScript, Tailwind, Supabase (Postgres + Auth + RLS), Recharts, and react-leaflet over OpenStreetMap. Claude Haiku 4.5 generates the alert text (with a deterministic fallback when the API is unreachable).

---

## Quick start

```bash
cd Hack/caresense
cp .env.local.example .env.local   # fill in Supabase + Anthropic keys
npm install
```

Apply the SQL in `supabase/migrations/` to your Supabase project (paste into the SQL editor in order, or use `supabase db push` if you've linked the CLI). Then:

```bash
npm run seed         # creates 5 demo accounts with 30 days of synthetic data
npm run baselines    # computes personal baselines from the stable window
npm run dev          # http://localhost:3000
```

### Demo accounts (password: `password123`)

| Email | Role | Notes |
|---|---|---|
| `ramesh@caresense.demo` | patient | **hero demo** — deteriorating BP over last 13 days |
| `lakshmi@caresense.demo` | patient | stable (proves the system isn't trigger-happy) |
| `suresh@caresense.demo` | patient | resolved spike (alert history view) |
| `priya@caresense.demo` | caregiver | daughter linked to Ramesh & Lakshmi |
| `dr.shah@caresense.demo` | doctor | sees triage list of all patients |

---

## Authentication

Login page (`/login`) supports **Google OAuth** and **magic link**. Both land at `/auth/callback`, which exchanges the code for a session and redirects by role:

- patient → `/patient/dashboard`
- caregiver → `/caregiver/home`
- doctor → `/doctor/dashboard`
- no profile yet → `/onboarding`

Enable Google OAuth in Supabase: **Auth → Providers → Google**, with redirect URI `${SITE_URL}/auth/callback`.

---

## Project layout

```
caresense/
├── app/                      # Next.js routes (auth, role groups, /api/*, /emergency/[patientId])
├── components/               # ui primitives + feature components (charts/alerts/forms/dashboards)
├── lib/
│   ├── supabase/{client,server,admin}.ts
│   ├── ai/{baseline,shap,forecast,escalation,llm-explainer}.ts
│   ├── services/analyze.ts   # the alert pipeline (called from /api/log-vitals)
│   ├── auth/                 # session helpers
│   ├── constants.ts          # thresholds + colors
│   └── utils.ts
├── utils/                    # pure helpers (haversine, formatters)
├── types/                    # supabase + domain + api types
├── supabase/
│   ├── migrations/           # 3 files: schema, indexes, RLS
│   └── seed.sql              # hospitals
├── scripts/                  # seed.ts + compute-baselines.ts (TypeScript)
├── middleware.ts             # role-aware auth gate
└── public/
```

---

## API routes

| Route | Method | Purpose |
|---|---|---|
| `/api/log-vitals` | POST | Insert a vital, run analyze, return resulting alert (if any) |
| `/api/analyze` | POST | Re-run the alert pipeline for a patient |
| `/api/forecast` | GET | 72h BP projection with 95% interval |
| `/api/alert` | GET / PATCH | List alerts; acknowledge/resolve |
| `/api/hospitals` | GET | Top 5 hospitals near `(lat, lng)`, ranked by beds + distance |
| `/api/emergency-brief` | GET | Assemble full brief JSON, persist, return |

Every response uses `{ ok: true, data } | { ok: false, error }` shape.

---

## The alert pipeline (`lib/services/analyze.ts`)

```
fetch last 30d vitals  ──► detect anomaly (vs personal baseline ±1.5σ)
fetch last 7d med log  ──► missed-dose %
fetch last 7d sleep    ──► sleep avg
                ▼
       compute SHAP weights (vital / medication / lifestyle)
                ▼
       linear regression on bp_systolic ──► 72h forecast + confidence
                ▼
       decideLevel(severity, consecutiveDays, forecastConf, daysToCritical)
                ▼
       if level !== 'stable': Claude generates plain-English title/message/recommendation,
                              fall back to deterministic copy if LLM unavailable
                ▼
       insert alert row (idempotent: dedupes within 12h at same level)
```

---

## Demo flow (90 seconds)

1. Sign in as `priya@caresense.demo` → caregiver home.
2. Ramesh card shows 🔴 **Risk** with title from Claude.
3. Click → patient detail. SHAP breakdown: BP trend ~42%, missed Amlodipine ~35%, sleep deficit ~23%. Confidence badge ~84%.
4. Forecast chart: BP trending toward 160 with shaded interval; "critical in 2.3 days".
5. Click **View Emergency Brief** → patient profile, current vitals, missed-dose flags, OSM map with 5 hospitals (recommended in green).
6. End: "Crisis prevented at Day 23, not Day 25."

---

## Notes

- All schema is in `supabase/migrations/`. Apply in order.
- RLS is on for every patient-scoped table. Patients see their own data; caregivers see linked patients via `caregiver_link`; doctors see everyone (MVP simplification).
- `lib/supabase/admin.ts` uses the service-role key — only imported by `app/api/*` and seed scripts.
- The Leaflet map is `dynamic`-imported with `ssr: false` to avoid hydration issues.
- LLM model is `claude-haiku-4-5-20251001`; fallback copy is deterministic so the demo never breaks.
