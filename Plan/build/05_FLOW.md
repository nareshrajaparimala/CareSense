# 🔁 DOCUMENT 5 — FLOWS & SUBTASK FLOWS

ASCII sequence + decision diagrams for every critical path. Use this as the runtime mental model.

---

## 1. Auth Flow (Magic Link + Google)

```
┌───────────┐     enters email or clicks Google
│  Browser  │ ─────────────────────────────────────┐
└─────┬─────┘                                       │
      │ POST signInWithOtp / signInWithOAuth        │
      ▼                                             ▼
┌──────────────────┐                   ┌─────────────────────┐
│ Supabase Auth    │                   │  Google OAuth       │
│ sends email link │                   │  consent screen     │
└──────────────────┘                   └─────────┬───────────┘
                                                 │ redirect
                                                 ▼
                                  ┌──────────────────────────┐
                                  │  /auth/callback?code=…   │
                                  └─────────┬────────────────┘
                                            │
                                            ▼
                              exchangeCodeForSession()
                                            │
                                            ▼
                          ┌─────────────────────────────────┐
                          │ user_profile row exists?        │
                          └────────┬───────────────┬────────┘
                                no │            yes│
                                   ▼               ▼
                            /onboarding      role-based redirect:
                            (pick role)      patient   → /patient/dashboard
                                             caregiver → /caregiver/home
                                             doctor    → /doctor/dashboard
```

**Subtasks**
- T-A1: `LoginForm` triggers correct method per button.
- T-A2: `/auth/callback/route.ts` exchanges code, sets session cookies.
- T-A3: Reads `user_profile.role`; if absent, sends to onboarding.
- T-A4: Onboarding inserts `user_profile` and (if patient) creates `patient` row.
- T-A5: `middleware.ts` enforces role on subsequent navigations.

---

## 2. Daily Vital Logging Flow

```
Patient on /patient/log
        │
        │ fills DailyLogForm + submits
        ▼
POST /api/log-vitals  ──── Zod validate body
        │
        ▼
Insert into vitals_log (patient_id, vitals…)
        │
        ▼
Call analyze(patient_id) [internal]    ◄── reuse, don't HTTP-fetch internally
        │
        ▼
Read patient_baseline + last 30d vitals + last 7d med_log
        │
        ▼
For each vital → detectAnomaly()
Compute consecutiveDays of deviation
computeShap()
forecast72hr()
decideLevel()
        │
        ▼
   level === 'stable'?
        │
   yes  │  no
   │    ▼
   │   generateAlertExplanation() [Claude]   ◄── try/catch → fallback copy
   │            │
   │            ▼
   │   Insert into alert (level, shap, forecast, confidence, message)
   │            │
   │            ▼
   ▼   if level === 'critical' → also create emergency_brief stub
return { ok: true, data: { vital, alert?, level } }
        │
        ▼
Client: redirect to /patient/dashboard with toast
```

**Subtasks**
- T-V1: Validate body (BP ranges, glucose > 0, etc).
- T-V2: Insert vital → return inserted row.
- T-V3: Call `analyze()` server-side function (not HTTP).
- T-V4: Persist baseline if `data_points_count < 30` → recompute via `lib/ai/baseline.ts`.
- T-V5: Persist alert with `shap_breakdown` JSONB and `forecast_72hr` JSONB.
- T-V6: At critical level, pre-create `emergency_brief` row so caregiver page can link instantly.

---

## 3. Caregiver View Flow

```
Caregiver lands on /caregiver/home
        │
        ▼
Server component fetches:
  caregiver_link WHERE caregiver_id = auth.uid()
  JOIN patient
  LEFT JOIN latest alert per patient
        │
        ▼
Render CaregiverPatientCard per row
        │
        │ click "View Details" on Ramesh
        ▼
/caregiver/patient/[id]
        │
        ▼
Server fetch (parallel):
  patient + active alert + last 30d vitals + baseline + medication adherence
        │
        ▼
Render:
  - PatientStatusCard (color by alert.level)
  - AlertCard + ShapBreakdown + ConfidenceBadge
  - VitalTrendChart with BaselineBand
  - ForecastChart (if alert.forecast_72hr present)
  - "Call Patient" / "Message Doctor" (mock CTAs)
  - At level='critical': "View Emergency Brief" button → /emergency/[patientId]
```

---

## 4. Alert Generation Pipeline (detail)

```
analyze(patient_id)
   │
   ├── fetch baseline           ─── if missing → recompute now
   ├── fetch last 30d vitals    ─── if < 7 entries → return level='stable' (insufficient data)
   ├── fetch last 7d med_log
   ├── fetch lifestyle from latest vital row
   │
   ▼
scores = {
  bp_anomaly:      detectAnomaly(latest.bp_sys, baseline.mean, baseline.std),
  glucose_anomaly: detectAnomaly(latest.glucose, baseline.mean, baseline.std),
  consecutive:     countConsecutiveDeviations(vitals, baseline),
  missed_pct:      missedDoses / totalScheduled,
  sleep_avg:       mean(last7.sleep_hours),
}
   │
   ▼
shap = computeShap({ vital_change, medication, lifestyle })
   │
   ▼
forecast = forecast72hr(vitals.map(v => v.bp_systolic), 160)
   │
   ▼
level = decideLevel({
  severity:           bp_anomaly.severity,
  consecutiveDays:    scores.consecutive,
  forecastConfidence: forecast?.confidence ?? 0,
  daysToCritical:     forecast?.days_to_critical ?? 30,
})
   │
   ▼
if level !== 'stable':
   llm = await generateAlertExplanation(context)
   insert alert { level, title: llm.title, message: llm.message, shap, forecast, confidence }
```

**Decision table for `decideLevel`:**

| severity | consecutive | forecastConf | daysToCritical | → level |
|---|---|---|---|---|
| critical | * | * | * | critical |
| * | * | * | <1 | critical |
| high | * | >0.75 | <3 | risk |
| moderate+ | * | >0.75 | <3 | risk |
| * | ≥3 | * | * | trend |
| moderate+ | * | * | * | watch |
| normal | <3 | * | * | stable |

---

## 5. Emergency Brief Flow

```
Trigger: caregiver/doctor opens /emergency/[patientId]
         OR alert level became 'critical' (auto-generated)
         │
         ▼
GET /api/emergency-brief?patient_id=…
         │
         ▼
Parallel fetch:
  patient profile (with allergies, conditions, lat/lng, emergency_contact)
  latest vitals_log (most recent row)
  active medications + last dose taken time
  active alert (level='critical')
  last 7 days vitals (for mini-trend)
         │
         ▼
GET /api/hospitals?lat=&lng=&specialty=cardiology  (called from same handler)
         │
         ▼
Assemble brief JSON:
{
  patient: { name, age, sex, conditions, allergies },
  vitals_now: { bp, glucose, hr, spo2 },
  medications: [{ name, dosage, last_taken, missed_count }],
  trend_7d: [...],
  predicted_event: { type, confidence },
  location: { lat, lng, address },
  destination: hospitals[0],
  hospitals: hospitals.slice(0, 5)
}
         │
         ▼
Persist into emergency_brief.brief_data (jsonb)
         │
         ▼
Return → Page renders:
  EmergencyBriefCard (sections: Patient / Vitals / Meds / Trend / Predicted / Location / Destination)
  HospitalMap (Leaflet, 5 markers, recommended one highlighted)
  [PRE-ALERT HOSPITAL] (mock — sets emergency_brief.sent_at)
  [SEND BRIEF TO 108]  (mock — toast)
```

**Subtasks**
- T-E1: Compute haversine + bed-aware sort in `/api/hospitals`.
- T-E2: Brief JSON schema is fixed — front-end has no fallbacks for missing keys.
- T-E3: Map default-icon path fix (`L.Icon.Default.mergeOptions(...)`).
- T-E4: Recommended hospital marker uses different color/larger size.

---

## 6. Doctor Triage Flow

```
GET /doctor/dashboard
        │
        ▼
Server fetch (admin or RLS-aware):
  patient JOIN latest_alert per patient
  ORDER BY level_priority DESC, alert.created_at DESC
        │
        ▼
Render table:
  | Patient | Age | Conditions | Level | Last Vital | Last Logged | Action |
        │
        │ click row
        ▼
/doctor/patient/[id]   ── reuses caregiver-detail layout + extra clinical fields
```

`level_priority` = `CASE level WHEN 'critical' THEN 4 WHEN 'risk' THEN 3 WHEN 'trend' THEN 2 WHEN 'watch' THEN 1 ELSE 0 END`.

---

## 7. Onboarding Flow (first login)

```
/onboarding
   │
   ▼
"Who are you?" — three big cards:
   [ I am a patient ]   [ I care for someone ]   [ I am a doctor ]
   │
   ▼
On select:
  upsert user_profile { id: auth.uid(), role, full_name }
   │
   ├── if patient   → create patient row (collect age, sex, conditions, allergies, emergency contact)
   ├── if caregiver → "Your patient's email" input → look up user → insert caregiver_link
   └── if doctor    → no extra step
   │
   ▼
Redirect to role dashboard
```

---

## 8. Data Recompute Cadence

| Trigger | Action |
|---|---|
| Every `/api/log-vitals` POST | Run `analyze()` (synchronous) |
| `analyze()` finds `data_points_count` increased by 5 since last baseline | Recompute baseline |
| Manual via `bun run scripts/compute-baselines.ts` | Recompute all |
| Demo reset (admin) | Truncate `vitals_log`, `alert`, `emergency_brief` then re-seed |

---

## 9. Failure Paths (subtask flows)

### LLM call fails
```
generateAlertExplanation() throws
   │
   ▼
catch → return hardcoded fallback:
  { title: "BP rising trend detected",
    message: "Your readings have drifted above baseline for 3 days...",
    recommendation: "Please consult your doctor within 24 hours." }
   │
   ▼
Alert still inserted with `message_source: 'fallback'`
```

### Leaflet hydration mismatch
```
HospitalMap imported normally → SSR renders empty → client hydrates → mismatch warning
   │ FIX
   ▼
Parent uses next/dynamic with { ssr: false }
```

### RLS blocks legitimate query
```
Caregiver can't see patient row → empty list
   │ DEBUG
   ▼
Check caregiver_link row exists
Check policy uses auth.uid() not user.id
Verify session cookie reached server (server.ts cookies adapter)
```

---

## 10. End-to-End Demo Trajectory (golden path)

```
T+0:00  Login as caregiver (Google OAuth, daughter@example.com)
T+0:10  Land on /caregiver/home — see Ramesh card 🔴 Risk
T+0:20  Click → /caregiver/patient/<ramesh-id>
T+0:25  See AlertCard: "BP rising trend — critical in 2.3 days"
T+0:30  ShapBreakdown: BP 42% / Meds 35% / Sleep 23%
T+0:40  ConfidenceBadge: 84% (High)
T+0:50  ForecastChart: BP projection with band
T+1:00  Click "View Emergency Brief"
T+1:05  /emergency/<ramesh-id> — full brief + map
T+1:20  Click "Pre-alert Apollo Whitefield" — toast confirms
T+1:30  END
```

---

## End of Document 5 — Flows & Subtask Flows
