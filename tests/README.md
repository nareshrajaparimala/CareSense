# 🧪 CareSense Test API Catalog

This folder documents the **test data APIs**. Each endpoint seeds a clinically-realistic 30-day history for a given patient (by email), runs the alert analyzer, and returns a summary describing what the dashboards will now show.

## How it works

1. The patient must already have a CareSense account (sign up at `/login` first).
2. Hit one test endpoint with `{ email }`. The API:
   - upserts `user_profile` (role=patient) and a `patient` row with the right conditions/allergies for the scenario,
   - **wipes** prior clinical data (`reset: true` is the default),
   - inserts 30 days of vitals + medication + adherence,
   - computes a personal baseline using the earliest 14 days,
   - runs `analyzePatient()` to fire any alerts.
3. Reload `/patient/dashboard`, `/caregiver/home` (if the caregiver is linked), or `/doctor/dashboard` to see the new state.

## Endpoints

All endpoints accept JSON body. Base path: `/api/test/<slug>`.

| Method | Path | Purpose |
|---|---|---|
| `GET`  | `/api/test/list` | Catalog of every scenario with descriptions. |
| `POST` | `/api/test/diabetes` | Type-2 diabetic with rising glucose. |
| `POST` | `/api/test/hypertension` | Progressive BP rise + missed BP meds. |
| `POST` | `/api/test/heart-attack` | Acute cardiac event in last 48 h. |
| `POST` | `/api/test/cardiac` | Post-cardiac with elevated HR / dropping SpO₂. |
| `POST` | `/api/test/kidney` | Stage-3 CKD with creeping BP. |
| `POST` | `/api/test/deteriorating` | Diabetic + Hypertensive deterioration (Ramesh-style). |
| `POST` | `/api/test/stable` | Well-managed patient — no alerts. |
| `POST` | `/api/test/flush` | **Wipes all clinical data** for a patient (auth user kept). |

## Body schema (every scenario endpoint)

```json
{
  "email": "user@example.com",        // required — must already be signed up
  "reset": true,                      // default true — wipe prior data first
  "age": 62,                          // optional — overrides scenario default
  "sex": "M",                         // optional — "M" | "F" | "Other"
  "full_name": "Ramesh K."            // optional — stored on user_profile
}
```

## Response shape

```json
{
  "ok": true,
  "data": {
    "scenario": "hypertension",
    "title": "Hypertension — progressive BP rise",
    "description": "Stable BP ~132/80 for 13 days, …",
    "expected_alert": "Risk → Critical. Title like \"BP rising trend\".",
    "expected_dashboard": "BP tile turns red (>160). 72-hr forecast …",
    "patient_id": "uuid…",
    "profile": "hypertensive",
    "vitals_inserted": 30,
    "medications": 2,
    "analysis": { "level": "risk", "alert_id": "uuid…" }
  }
}
```

`expected_alert` and `expected_dashboard` are plain-English summaries you can paste into a demo script — they describe what the user will *see* after running the seeder.

## Scenario reference (what each one does to the dashboard)

### `diabetes`
- **Vitals trajectory**: glucose 130 mg/dL → drift to 165 → spikes 220–280; BP stable ~128/82.
- **Medications**: Metformin 500mg (twice daily), Glimepiride 2mg (morning).
- **Adherence**: 2 missed Metformin doses + 3 missed Glimepiride doses.
- **Dashboard after**: glucose tile red. Alert title typically *"Glucose rising trend"*. SHAP shows medication adherence as the dominant factor.

### `hypertension`
- **Vitals trajectory**: BP 132/80 stable → 138/83 → 152/91 → 165/98 in last week.
- **Medications**: Amlodipine 5mg, Losartan 50mg.
- **Adherence**: 5 missed doses across the two meds.
- **Dashboard after**: BP tile red. 72-hr forecast bands show predicted >170. "Critical in N days" countdown visible.

### `heart-attack`
- **Vitals trajectory**: stable history, last 2 days BP 178/110, HR 118, SpO₂ 89%.
- **Medications**: Atorvastatin, Clopidogrel, Metoprolol.
- **Adherence**: 5 missed antiplatelet/beta-blocker doses in last 3 days.
- **Dashboard after**: status pill = **Critical**. AlertCard with high confidence. Caregiver/Doctor sees "View Emergency Brief →" CTA. Brief renders 5 nearest hospitals on the OSM map.

### `cardiac`
- **Vitals trajectory**: HR creeps to 95 bpm and SpO₂ drops to 93% over last 5 days.
- **Medications**: Atorvastatin, Metoprolol.
- **Dashboard after**: HR + SpO₂ tiles in warning state. Watch / Trend alert.

### `kidney`
- **Vitals trajectory**: BP rises slowly from ~130/78 to ~152/91 over 10 days.
- **Medications**: Ramipril, Furosemide.
- **Dashboard after**: BP tile orange. Trend chart shows clean upslope vs personal baseline band.

### `deteriorating`
- **Vitals trajectory**: 14 stable days → 5 drift days → 8 acceleration days. BP & glucose both rising; sleep dropping from 7h → 5h.
- **Medications**: Metformin, Amlodipine.
- **Adherence**: 3 missed Amlodipine doses.
- **Dashboard after**: BP tile red, glucose tile red, sleep low. Full SHAP breakdown + ForecastChart + alert with "X days to critical".

### `stable`
- **Vitals trajectory**: all values within normal personal baseline; no missed doses.
- **Dashboard after**: every tile green. Status: *"Active Monitoring — All vitals on track"*. No active alerts.

### `flush`
- **Body**: `{ "email": "user@example.com" }`
- **Effect**: deletes all `vitals_log`, `medication_log`, `medication`, `alert`, `emergency_brief`, and `patient_baseline` rows for that user.
- **Keeps**: `auth.users`, `user_profile`, and the `patient` row itself (so the user can sign back in and start fresh).
- **Response message**: e.g. *"Flushed clinical data for foo@example.com: 30 vitals, 2 meds, 1 alerts. Auth user kept."*

## Try it

See `curl.sh` for one-line shell commands and `tests.http` for VS Code REST Client / IntelliJ HTTP-Client format.
