# 🗺️ DOCUMENT 2 — PLAN

**Goal:** Ship a demoable CareSense MVP in ~25 hours that lets a judge:
1. Log in (magic link or Google) as patient → log vitals.
2. Log in as caregiver → see Ramesh in 🔴 Risk with SHAP + forecast.
3. Click into emergency page → see brief + nearest hospitals on a free OSM map.
4. Log in as doctor → see triage list with Ramesh on top.

---

## 1. MoSCoW

### Must (demo blockers)
- Auth: magic link + Google OAuth, role-based redirect
- Patient daily log form + vitals trend chart with baseline band
- Caregiver home + patient detail with active alert
- Alert generation pipeline (analyze → forecast → SHAP → LLM explanation)
- Emergency brief page with hospital map (Leaflet/OSM)
- Doctor triage dashboard (read-only)
- Seeded data: 3 patients × 30 days

### Should
- Medication checklist + adherence streak
- Confidence badge on every alert
- 72h forecast chart with confidence band
- Med-vital correlation insight card

### Could
- Doctor acknowledge / override workflow
- Family member invite (caregiver linking via email)
- Alert history page

### Won't (this sprint)
- LSTM model training
- Real 108 / hospital API integration
- Wearable sync
- i18n
- Push notifications (in-app badges only)

---

## 2. Phased Delivery (25 hours)

| Phase | Hours | Outcome |
|---|---|---|
| P0 — Setup | 0–1 | Repo scaffolded, Supabase connected, auth works locally |
| P1 — Foundation | 1–4 | Schema applied, RLS on, mock data seeded, base layout shipping |
| P2 — Core Build | 4–10 | All 6 API routes live + patient/caregiver pages render real data |
| P3 — Hero Features | 10–15 | Forecast chart, SHAP card, emergency brief, hospital map |
| P4 — Integration | 15–18 | End-to-end demo flow polished, mobile responsive |
| P5 — Demo Prep | 18–22 | Backup video recorded, slides done |
| P6 — Rehearse | 22–24 | Pitch timed, bugs squashed |
| P7 — Buffer | 24–25 | Sleep |

(Hour-by-hour split between Naresh + Chinmayi: see existing `02_IMPLEMENTATION_PLAN.md` §8.)

---

## 3. Build Order (dependency-respecting)

```
1. Project scaffold (Next.js + bun + Tailwind + shadcn)
2. Supabase project + env vars wired
3. Migrations applied (schema + indexes + RLS)
4. lib/supabase/{client,server,admin}.ts
5. Auth: /login + /auth/callback + middleware
6. Onboarding (role pick) + user_profile insert
7. Seed script run → 3 patients × 30 days
8. compute-baselines.ts run → patient_baseline filled
9. Components: shadcn primitives installed (button, card, input, select, slider, badge)
10. lib/ai/baseline.ts + shap.ts + forecast.ts (pure TS, no I/O)
11. API: /api/log-vitals (writes vital + triggers analyze)
12. API: /api/analyze (reads baseline, scores, decides level)
13. API: /api/forecast (linear regression + interval)
14. API: /api/alert (calls Claude, persists alert)
15. API: /api/hospitals (haversine sort)
16. API: /api/emergency-brief (assembles JSON)
17. Patient dashboard + log page + trends page
18. Caregiver home + patient detail
19. Doctor dashboard
20. Emergency page (with HospitalMap)
21. Polish: empty states, loading, mobile
22. Deploy to Vercel
```

---

## 4. Demo Script (the 90-second flow)

```
0:00  "Chronic patients see doctor every 90 days. The other 89 are silent."
0:15  Show patient view — Ramesh's stable streak (Day 1–17)
0:30  Fast-forward — Day 18: 🟡 Watch nudge appears
0:40  Day 22: Caregiver dashboard — daughter sees 🔴 Risk
0:55  Click alert — SHAP: BP trend 42% / missed insulin 35% / sleep 23%
1:05  72hr forecast chart: critical in 2.3 days, 84% confidence
1:15  Click "View Emergency" — full brief + map of 5 hospitals
1:30  "Crisis prevented at Day 23, not Day 25." End.
```

---

## 5. Risks (build-side, not product-side)

| Risk | Mitigation |
|---|---|
| RLS breaks queries silently | Test with anon key from start; admin client only in API routes |
| Claude API rate limit / outage | Hardcoded fallback explanation in `llm-explainer.ts` |
| Leaflet SSR hydration error | Dynamic import with `ssr: false` |
| Supabase magic link in dev not arriving | Use Supabase dashboard "Auth → Users → Send magic link" |
| Forecast jitter on small datasets | Floor `n ≥ 7` before computing; show "gathering data" UI otherwise |
| Time blowout on Doctor view | Cut to read-only table; skip acknowledge workflow |

---

## 6. Definition of Done (per role)

**Patient:** Can sign up via Google or magic link, log vitals, see today's status pill, see 7-day trend with baseline band.

**Caregiver:** Can see linked patient cards, click into Ramesh, view alert with SHAP + forecast + confidence, click through to emergency.

**Doctor:** Can see triage list sorted by risk, click into a patient timeline.

**Emergency:** Brief renders, map shows ≥5 hospitals sorted by distance × beds, "Send to 108" button is mock-clickable.

---

## End of Document 2 — Plan
