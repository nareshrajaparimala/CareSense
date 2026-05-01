# 🛠️ DOCUMENT 2 — IMPLEMENTATION PLAN

# CareSense — Hour-by-Hour Build Guide (25 Hours)

**Tech Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Supabase (Postgres + Auth) · Recharts · Python (for ML scripts) · Claude/Gemini API · Vercel · Mapbox (free tier)

**Team:**
- **Naresh** — Backend, AI/ML scripts, API routes, data layer
- **Chinmayi** — Frontend, UI components, design system, page composition

---

## 📌 Table of Contents

1. [Pre-Build Checklist](#1-pre-build-checklist)
2. [Architecture Overview](#2-architecture-overview)
3. [Database Schema](#3-database-schema)
4. [File / Folder Structure](#4-file-folder-structure)
5. [API Routes Specification](#5-api-routes-specification)
6. [Page-by-Page Specification](#6-page-by-page-specification)
7. [AI / ML Implementation](#7-ai-ml-implementation)
8. [Hour-by-Hour Build Schedule](#8-hour-by-hour-schedule)
9. [Mock Data Strategy](#9-mock-data-strategy)
10. [Testing & QA Checklist](#10-testing-qa)
11. [Deployment Steps](#11-deployment)
12. [Demo Day Backup Plan](#12-demo-day-backup)

---

## 1. Pre-Build Checklist

Complete BEFORE Hour 0:

- [ ] GitHub repo created (`caresense`)
- [ ] Supabase project created (free tier)
- [ ] Vercel account linked to GitHub
- [ ] Claude API key (or Gemini free tier) ready
- [ ] Mapbox free token (for hospital map)
- [ ] Figma file shared between Naresh + Chinmayi
- [ ] Both members have local Node 20+ installed
- [ ] `npx create-next-app@latest` ready to run
- [ ] shadcn/ui CLI familiar to both

**Tools to install upfront:**
```bash
npx create-next-app@latest caresense --typescript --tailwind --app
cd caresense
npx shadcn-ui@latest init
npm install @supabase/supabase-js recharts lucide-react date-fns
npm install -D @types/node
```

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                    CARESENSE STACK                        │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  CLIENT (Browser)                                         │
│  ┌────────────────────────────────────────┐              │
│  │  Next.js 14 (App Router)               │              │
│  │  - React Server Components             │              │
│  │  - Tailwind + shadcn/ui                │              │
│  │  - Recharts visualizations             │              │
│  │  - Mapbox GL (hospital map)            │              │
│  └────────────────┬───────────────────────┘              │
│                   ↓                                       │
│  SERVER (Vercel Edge / Node)                              │
│  ┌────────────────────────────────────────┐              │
│  │  Next.js API Routes                    │              │
│  │  - /api/log-vitals                     │              │
│  │  - /api/analyze                        │              │
│  │  - /api/forecast                       │              │
│  │  - /api/alert                          │              │
│  │  - /api/emergency-brief                │              │
│  └────────────────┬───────────────────────┘              │
│                   ↓                                       │
│  AI LAYER                                                 │
│  ┌────────────────────────────────────────┐              │
│  │  Python scripts (run pre-deploy):       │              │
│  │  - generate_mock_data.py               │              │
│  │  - compute_baselines.py                │              │
│  │  - shap_attribution.py                 │              │
│  │                                         │              │
│  │  Runtime AI:                           │              │
│  │  - Claude API for alert explanations   │              │
│  │  - In-memory anomaly detection         │              │
│  └────────────────┬───────────────────────┘              │
│                   ↓                                       │
│  DATA LAYER                                              │
│  ┌────────────────────────────────────────┐              │
│  │  Supabase (Postgres)                   │              │
│  │  - users, patients, vitals_log         │              │
│  │  - medications, alerts                 │              │
│  │  - hospital_mock (seeded JSON)          │              │
│  └────────────────────────────────────────┘              │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema

### Supabase Tables

```sql
-- 1. Users (extends Supabase auth.users)
CREATE TABLE user_profile (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT NOT NULL,
  role TEXT CHECK (role IN ('patient', 'caregiver', 'doctor')) NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Patients (clinical profile)
CREATE TABLE patient (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profile(id),
  age INT NOT NULL,
  sex TEXT CHECK (sex IN ('M', 'F', 'Other')),
  conditions TEXT[] NOT NULL, -- ['diabetes', 'hypertension']
  allergies TEXT[],
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  location_lat DECIMAL,
  location_lng DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Caregiver-Patient Linking
CREATE TABLE caregiver_link (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caregiver_id UUID REFERENCES user_profile(id),
  patient_id UUID REFERENCES patient(id),
  relationship TEXT, -- 'son', 'daughter', 'spouse'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(caregiver_id, patient_id)
);

-- 4. Vitals Log (time-series)
CREATE TABLE vitals_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patient(id),
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  bp_systolic INT,
  bp_diastolic INT,
  glucose_mgdl INT,
  heart_rate INT,
  spo2 INT,
  weight_kg DECIMAL,
  sleep_hours DECIMAL,
  activity_level TEXT, -- 'low', 'medium', 'high'
  diet_flag TEXT, -- 'normal', 'high_carb', 'high_sodium'
  mood INT CHECK (mood BETWEEN 1 AND 5),
  notes TEXT
);

-- 5. Medications
CREATE TABLE medication (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patient(id),
  name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT, -- 'morning', 'morning_evening', etc.
  active BOOLEAN DEFAULT true
);

-- 6. Medication Adherence Log
CREATE TABLE medication_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id UUID REFERENCES medication(id),
  patient_id UUID REFERENCES patient(id),
  taken BOOLEAN NOT NULL,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_time TIMESTAMPTZ
);

-- 7. Patient Baselines (computed)
CREATE TABLE patient_baseline (
  patient_id UUID PRIMARY KEY REFERENCES patient(id),
  bp_systolic_mean DECIMAL,
  bp_systolic_std DECIMAL,
  bp_diastolic_mean DECIMAL,
  bp_diastolic_std DECIMAL,
  glucose_mean DECIMAL,
  glucose_std DECIMAL,
  heart_rate_mean DECIMAL,
  heart_rate_std DECIMAL,
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  data_points_count INT
);

-- 8. Alerts
CREATE TABLE alert (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patient(id),
  level TEXT CHECK (level IN ('watch', 'trend', 'risk', 'critical')) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL, -- LLM-generated
  shap_breakdown JSONB, -- {"bp_trend": 0.42, "meds_missed": 0.35, "sleep": 0.23}
  confidence DECIMAL,
  forecast_72hr JSONB, -- {"predicted_bp": 165, "interval": [155, 175], "days_to_critical": 2.3}
  status TEXT CHECK (status IN ('open', 'acknowledged', 'resolved')) DEFAULT 'open',
  acknowledged_by UUID REFERENCES user_profile(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Hospital (mock data — seed via JSON)
CREATE TABLE hospital_mock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  specialty TEXT[],
  address TEXT,
  lat DECIMAL,
  lng DECIMAL,
  beds_available INT,
  beds_total INT,
  rating DECIMAL,
  phone TEXT
);

-- 10. Emergency Brief (generated)
CREATE TABLE emergency_brief (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID REFERENCES alert(id),
  patient_id UUID REFERENCES patient(id),
  brief_data JSONB, -- the full assembled brief
  destination_hospital_id UUID REFERENCES hospital_mock(id),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES for performance
CREATE INDEX idx_vitals_patient_time ON vitals_log(patient_id, logged_at DESC);
CREATE INDEX idx_alerts_patient_status ON alert(patient_id, status);
CREATE INDEX idx_med_log_patient_time ON medication_log(patient_id, logged_at DESC);
```

---

## 4. File / Folder Structure

```
caresense/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
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
│   └── page.tsx
├── components/
│   ├── ui/                       # shadcn components
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
│   └── emergency/
│       ├── EmergencyBriefCard.tsx
│       └── HospitalMap.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── ai/
│   │   ├── baseline.ts
│   │   ├── shap.ts
│   │   ├── forecast.ts
│   │   └── llm-explainer.ts
│   └── utils.ts
├── scripts/
│   ├── generate_mock_data.py
│   ├── seed_database.ts
│   └── seed_hospitals.json
├── public/
└── README.md
```

---

## 5. API Routes Specification

### POST `/api/log-vitals`
**Purpose:** Patient logs daily vitals
**Auth:** Patient role required
**Body:**
```json
{
  "patient_id": "uuid",
  "bp_systolic": 138,
  "bp_diastolic": 88,
  "glucose_mgdl": 145,
  "sleep_hours": 5.5,
  "mood": 3
}
```
**Logic:**
1. Insert into `vitals_log`
2. Trigger `/api/analyze` for this patient
3. Return success + any new alerts

### POST `/api/analyze`
**Purpose:** Run analysis on latest data
**Logic:**
1. Fetch last 30 days of vitals
2. Compare to `patient_baseline`
3. Detect anomalies (>1.5 std dev)
4. Compute SHAP-style attribution
5. If anomaly + confidence > threshold → create alert
6. Call `/api/forecast` for trajectory

### GET `/api/forecast?patient_id=uuid&hours=72`
**Purpose:** Generate 72hr forecast
**Logic:**
1. Get last 14 days of trend
2. Apply linear regression + std error
3. Project forward 72 hours
4. Return: `{ predicted, interval_low, interval_high, days_to_critical, confidence }`

### POST `/api/alert`
**Purpose:** Create alert with LLM explanation
**Logic:**
1. Receive: patient_id, level, shap_breakdown, forecast
2. Call Claude API with structured prompt
3. Get back: title + plain-English message
4. Insert into `alert` table
5. Return alert object

### GET `/api/emergency-brief?alert_id=uuid`
**Purpose:** Generate paramedic brief
**Logic:**
1. Fetch patient profile + last vitals + meds + active alert
2. Call hospital finder (`/api/hospitals?lat=&lng=&specialty=`)
3. Assemble brief JSON
4. Return formatted brief + nearest hospital recommendation

### GET `/api/hospitals?lat=&lng=&specialty=`
**Purpose:** Find nearest hospitals with bed availability
**Logic:**
1. Query `hospital_mock` table
2. Filter by specialty (if provided)
3. Calculate distance using Haversine formula
4. Sort by: bed availability + distance
5. Return top 5

---

## 6. Page-by-Page Specification

### Page 1: `/login`
**Components:** Email magic link form
**Flow:** Enter email → Supabase sends magic link → on auth → role-based redirect

### Page 2: `/patient/dashboard` (Patient view)
**Layout:**
```
┌─────────────────────────────────────┐
│ Header: "Hello Ramesh" + status pill│
├─────────────────────────────────────┤
│ TODAY'S STATUS CARD                  │
│  🟢 Stable — looking good today      │
│  Last logged: 2 hrs ago              │
├─────────────────────────────────────┤
│ [LOG TODAY'S VITALS] (big CTA)       │
├─────────────────────────────────────┤
│ Quick Stats:                         │
│  BP: 128/82 (your normal: 128/82)   │
│  Glucose: 132 mg/dL                  │
│  Streak: 18 days                     │
├─────────────────────────────────────┤
│ Recent Trend (mini-chart, 7 days)    │
├─────────────────────────────────────┤
│ Today's Tip (LLM-generated)          │
└─────────────────────────────────────┘
```

### Page 3: `/patient/log`
**Components:** Daily log form
- BP (two number inputs)
- Glucose (number input + units)
- Heart rate (optional)
- SpO2 (optional)
- Sleep hours (slider)
- Activity level (3-button select)
- Diet flag (chips)
- Mood (1–5 emoji selector)
- Medication checklist (today's pills)
- Submit → POST `/api/log-vitals` → redirect to dashboard

### Page 4: `/patient/trends`
**Components:**
- Toggle: 7-day / 30-day
- Multi-vital chart (BP, glucose, heart rate)
- Baseline band overlay
- Anomaly markers
- Adherence streak
- Insight cards: med-vitals correlation

### Page 5: `/caregiver/home`
**Layout:**
```
┌─────────────────────────────────────┐
│ Header: "Your Family"                │
├─────────────────────────────────────┤
│ Patient Card: Dad (Ramesh)           │
│  🔴 Risk — BP trending up            │
│  72hr forecast: critical in 2.3 days │
│  [VIEW DETAILS]  [CALL DAD]          │
├─────────────────────────────────────┤
│ Patient Card: Mom (Lakshmi)          │
│  🟢 Stable                           │
│  All vitals normal                   │
│  [VIEW DETAILS]                      │
└─────────────────────────────────────┘
```

### Page 6: `/caregiver/patient/[id]`
**Layout:**
- Status header with color-coded ring
- Active alerts (with SHAP breakdown)
- 30-day trend chart with baseline
- Medication adherence weekly view
- "Call Patient" / "Message Doctor" CTAs (mocked)
- Emergency: link to `/emergency/[patientId]` (visible only at Critical level)

### Page 7: `/doctor/dashboard`
**Layout:**
- Patient list table with risk scores (sorted high to low)
- Color-coded rows
- Quick stats per patient: name, age, conditions, current alert, last logged
- Click row → patient detail

### Page 8: `/doctor/patient/[id]`
**Layout:**
- Full clinical timeline
- All alerts with SHAP details
- 30-day vitals chart with anomaly markers
- Medication adherence
- Acknowledge / Override / Schedule call buttons

### Page 9: `/emergency/[patientId]` ⭐ (THE WOW PAGE)
**Layout:**
```
┌─────────────────────────────────────┐
│ 🚨 EMERGENCY BRIEF — Auto-Generated  │
│ Status: PREPARING TO SEND TO 108     │
├─────────────────────────────────────┤
│ PATIENT                              │
│  Ramesh K., 62M                      │
│  Diabetic + Hypertensive             │
│  Allergies: Penicillin               │
├─────────────────────────────────────┤
│ CURRENT VITALS (live)                │
│  BP: 178/110  ⚠️                     │
│  Glucose: 340 mg/dL  ⚠️              │
│  HR: 112 bpm  ⚠️                     │
├─────────────────────────────────────┤
│ MEDICATIONS                          │
│  • Metformin 500mg (last: 8hrs ago) │
│  • Amlodipine 5mg (MISSED 3 times)  │
├─────────────────────────────────────┤
│ TREND (7-day mini-chart)             │
│  BP rising 8 pts/day for 5 days      │
├─────────────────────────────────────┤
│ PREDICTED EVENT                      │
│  Hypertensive crisis (87% confidence)│
├─────────────────────────────────────┤
│ LOCATION                             │
│  📍 12.97°N 77.59°E                 │
│  Whitefield, Bengaluru               │
├─────────────────────────────────────┤
│ DESTINATION HOSPITAL                 │
│  [Map showing 5 hospitals]           │
│  ✅ Apollo Whitefield (2.3 km)       │
│     Cardiology, 4 beds available     │
│     ETA: 12 min                      │
│  [PRE-ALERT HOSPITAL] (mocked)       │
├─────────────────────────────────────┤
│  [SEND BRIEF TO 108] (mocked)       │
└─────────────────────────────────────┘
```

---

## 7. AI / ML Implementation

### A) Personal Baseline Engine

**File:** `scripts/compute_baselines.py`

```python
import pandas as pd
import numpy as np
from supabase import create_client

def compute_baseline(patient_id: str):
    # Fetch last 30 days of vitals
    data = supabase.table('vitals_log') \
        .select('*') \
        .eq('patient_id', patient_id) \
        .order('logged_at', desc=True) \
        .limit(30) \
        .execute()

    df = pd.DataFrame(data.data)

    baseline = {
        'patient_id': patient_id,
        'bp_systolic_mean': df['bp_systolic'].mean(),
        'bp_systolic_std': df['bp_systolic'].std(),
        'bp_diastolic_mean': df['bp_diastolic'].mean(),
        'bp_diastolic_std': df['bp_diastolic'].std(),
        'glucose_mean': df['glucose_mgdl'].mean(),
        'glucose_std': df['glucose_mgdl'].std(),
        'heart_rate_mean': df['heart_rate'].mean(),
        'heart_rate_std': df['heart_rate'].std(),
        'data_points_count': len(df)
    }

    supabase.table('patient_baseline').upsert(baseline).execute()
    return baseline
```

**Run:** Once after seeding mock data, then on each new vital log via API trigger.

### B) Anomaly Detection (TypeScript, runs in API route)

**File:** `lib/ai/baseline.ts`

```typescript
export function detectAnomaly(
  current: number,
  baseline_mean: number,
  baseline_std: number,
  threshold: number = 1.5
): { isAnomaly: boolean; deviation: number; severity: string } {
  const deviation = (current - baseline_mean) / baseline_std;
  const isAnomaly = Math.abs(deviation) > threshold;

  let severity = 'normal';
  if (Math.abs(deviation) > 2.5) severity = 'critical';
  else if (Math.abs(deviation) > 2.0) severity = 'high';
  else if (Math.abs(deviation) > 1.5) severity = 'moderate';

  return { isAnomaly, deviation, severity };
}
```

### C) SHAP-Style Attribution

**File:** `lib/ai/shap.ts`

```typescript
export function computeShap(patient_id: string, current_vitals: any, baseline: any, med_log: any[], lifestyle: any) {
  // Score each factor 0–1 by how much it deviated
  const bp_score = Math.min(
    Math.abs(current_vitals.bp_systolic - baseline.bp_systolic_mean) / baseline.bp_systolic_std / 3,
    1
  );

  const med_missed_pct = med_log.filter(m => !m.taken).length / Math.max(med_log.length, 1);
  const med_score = Math.min(med_missed_pct * 2, 1);

  const sleep_deficit = Math.max(0, 7 - lifestyle.sleep_hours) / 7;
  const lifestyle_score = sleep_deficit;

  // Normalize to 100%
  const total = bp_score + med_score + lifestyle_score;
  return {
    vital_change: bp_score / total,
    medication: med_score / total,
    lifestyle: lifestyle_score / total,
    raw: { bp_score, med_score, lifestyle_score }
  };
}
```

### D) 72-Hour Forecast

**File:** `lib/ai/forecast.ts`

```typescript
export function forecast72hr(vitalHistory: number[]): {
  predicted: number;
  interval_low: number;
  interval_high: number;
  days_to_critical: number;
  confidence: number;
} {
  // Simple linear regression on last 14 days
  const x = vitalHistory.map((_, i) => i);
  const y = vitalHistory;
  const n = y.length;

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Project 3 days (72 hours) forward
  const projected_day = n + 3;
  const predicted = intercept + slope * projected_day;

  // Compute residuals for confidence interval
  const residuals = y.map((yi, i) => yi - (intercept + slope * i));
  const std_residual = Math.sqrt(residuals.reduce((a, b) => a + b * b, 0) / (n - 2));

  // 95% interval
  const interval_low = predicted - 1.96 * std_residual;
  const interval_high = predicted + 1.96 * std_residual;

  // Days to critical (e.g., BP > 160 systolic)
  const CRITICAL = 160;
  const days_to_critical = slope > 0 ? (CRITICAL - intercept - slope * n) / slope : 999;

  // Confidence — based on data quantity + trend strength
  const confidence = Math.min(0.95, (n / 30) * Math.min(1, Math.abs(slope) * 10));

  return {
    predicted,
    interval_low,
    interval_high,
    days_to_critical: Math.max(0, days_to_critical),
    confidence
  };
}
```

### E) LLM Explainer (Claude API)

**File:** `lib/ai/llm-explainer.ts`

```typescript
export async function generateAlertExplanation(context: {
  patient_name: string;
  conditions: string[];
  shap: { vital_change: number; medication: number; lifestyle: number };
  forecast: { predicted: number; days_to_critical: number; confidence: number };
  current_bp: { systolic: number; diastolic: number };
  baseline_bp: { systolic: number };
  missed_doses: number;
  sleep_avg: number;
}): Promise<{ title: string; message: string; recommendation: string }> {

  const prompt = `You are a medical AI assistant generating a patient alert.

Patient: ${context.patient_name}
Conditions: ${context.conditions.join(', ')}

Current state:
- BP: ${context.current_bp.systolic}/${context.current_bp.diastolic} (baseline: ${context.baseline_bp.systolic})
- Missed doses (last 7 days): ${context.missed_doses}
- Avg sleep (last 7 days): ${context.sleep_avg} hrs

72-hour forecast: BP predicted to reach ${context.forecast.predicted.toFixed(0)}
Days until critical threshold: ${context.forecast.days_to_critical.toFixed(1)}
Confidence: ${(context.forecast.confidence * 100).toFixed(0)}%

Factor contribution (SHAP):
- Vital trend: ${(context.shap.vital_change * 100).toFixed(0)}%
- Medication adherence: ${(context.shap.medication * 100).toFixed(0)}%
- Lifestyle: ${(context.shap.lifestyle * 100).toFixed(0)}%

Generate a JSON response with these fields:
{
  "title": "Short alert title (max 8 words)",
  "message": "2-sentence explanation in plain English. Say WHAT changed and WHY it matters.",
  "recommendation": "1-sentence specific action recommendation."
}

Be calm and factual. Avoid alarm. Always end with "If symptoms appear, consult your doctor."
Return ONLY valid JSON, no preamble.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await response.json();
  const text = data.content[0].text;
  return JSON.parse(text);
}
```

---

## 8. Hour-by-Hour Build Schedule

### PHASE 0 — SETUP (Hours 0–1) · BOTH

| Time | Naresh | Chinmayi |
|---|---|---|
| 0:00–0:30 | `create-next-app`, init Supabase, push to GitHub, link Vercel | Open Figma, set color palette (greens/yellows/reds for status), set typography |
| 0:30–1:00 | Install deps, scaffold folder structure | Sketch low-fi wireframes for 5 main pages |

### PHASE 1 — FOUNDATION (Hours 1–4)

| Time | Naresh | Chinmayi |
|---|---|---|
| 1–2 | Run schema SQL on Supabase | Build base layout + nav components |
| 2–3 | Write & run `generate_mock_data.py` (3 patients × 30 days) | Build `LoginPage`, `DailyLogForm` |
| 3–4 | Seed hospitals JSON, write baseline computation | Build `PatientStatusCard`, `VitalTrendChart` |

### PHASE 2 — CORE BUILD (Hours 4–10)

| Time | Naresh | Chinmayi |
|---|---|---|
| 4–6 | API: `/api/log-vitals`, `/api/analyze` | Patient dashboard page composition |
| 6–8 | API: `/api/forecast`, `/api/alert` + LLM call | `AlertCard`, `ShapBreakdown`, `ConfidenceBadge` |
| 8–10 | API: `/api/emergency-brief`, `/api/hospitals` | Caregiver home + patient detail pages |

### PHASE 3 — HERO FEATURES (Hours 10–15)

| Time | Naresh | Chinmayi |
|---|---|---|
| 10–12 | Wire 72hr forecast logic + chart data | `ForecastChart` component (with confidence band) |
| 12–14 | Build emergency brief page logic | `EmergencyBriefCard` + `HospitalMap` (Mapbox) |
| 14–15 | Doctor dashboard backend | Doctor dashboard UI |

### PHASE 4 — INTEGRATION (Hours 15–18)

| Time | Both |
|---|---|
| 15–16 | Wire end-to-end. Test: Patient logs → analysis → alert → caregiver view |
| 16–17 | Test demo flow with Ramesh data. Verify the deterioration story plays correctly |
| 17–18 | Polish — empty states, loading states, mobile responsive |

### PHASE 5 — DEMO PREP (Hours 18–22)

| Time | Naresh | Chinmayi |
|---|---|---|
| 18–20 | Record backup demo video (Loom / OBS). Verify Ramesh's deterioration plays cleanly | PPT slides 1–4 |
| 20–22 | Write Q&A flashcards | PPT slides 5–8 |

### PHASE 6 — REHEARSE (Hours 22–24)

| Time | Both |
|---|---|
| 22–23 | Run pitch out loud x3. Time each section. Cut what doesn't fit. |
| 23–24 | Final polish. Last bug fixes. Verify deployment works. |

### PHASE 7 — BUFFER (Hour 24–25)

| Time | Both |
|---|---|
| 24–25 | Sleep / coffee / final calm. **Do not build anything.** |

---

## 9. Mock Data Strategy

### The 3 Demo Patients

**Patient 1: Ramesh K. — The Hero Demo Patient**
- 62M, Diabetic + Hypertensive
- Day 1–17: Stable (BP ~128/82, Glucose ~135)
- Day 18: BP starts drifting (BP 132/85)
- Day 20–22: Trend confirmed (BP 138/88, 142/90, 145/92)
- Day 22: Forecast predicts BP 165 in 3 days, confidence 84%
- 3 missed insulin doses in the last week
- Sleep dropped to 4.5 hrs from baseline 7
- **This is the patient you demo.**

**Patient 2: Lakshmi P. — The Stable Patient**
- 58F, Hypertensive only
- All 30 days stable
- Used to show "🟢 All clear" view
- Demonstrates system isn't trigger-happy

**Patient 3: Suresh M. — The Resolved Case**
- 70M, Post-cardiac
- Day 1–14: Stable
- Day 15–18: Acute spike → alert fired
- Day 19: Acknowledged + resolved
- Used to show alert history + post-event view

### Mock Data Generation Script

`scripts/generate_mock_data.py` should produce:
- 30 days of vitals per patient
- Realistic trend curves (use sine + noise + drift for Ramesh)
- Medication logs (3 missed for Ramesh on days 16–18)
- Lifestyle logs

---

## 10. Testing & QA Checklist

### Critical User Flows (Must Work)

- [ ] Patient logs in → sees dashboard
- [ ] Patient logs vitals → triggers analysis
- [ ] Caregiver logs in → sees Ramesh's status as 🔴 Risk
- [ ] Caregiver clicks alert → sees SHAP breakdown
- [ ] Caregiver clicks "View Emergency" → sees brief page
- [ ] Emergency page shows: brief, map, hospital recommendations
- [ ] Doctor dashboard shows Ramesh sorted to top
- [ ] All charts render without errors
- [ ] Mobile responsive on iPhone size

### Demo-Critical Bug Checks

- [ ] LLM call has fallback if API fails (hardcoded explanation)
- [ ] Mapbox tile loads (use static image fallback if not)
- [ ] Charts have data even if Supabase is slow (cache last good)
- [ ] No console errors visible during demo

---

## 11. Deployment Steps

1. Push to GitHub `main` branch
2. Vercel auto-deploys
3. Add env vars to Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ANTHROPIC_API_KEY` (server-side only)
   - `NEXT_PUBLIC_MAPBOX_TOKEN`
4. Test deployed URL on phone + laptop
5. Have shareable URL ready: `caresense.vercel.app`

---

## 12. Demo Day Backup Plan

### If live demo fails:

1. **Backup 1:** Pre-recorded 90-second screen video (record at hour 18)
2. **Backup 2:** Static screenshots embedded in PPT
3. **Backup 3:** Localhost demo (run on laptop with mobile hotspot if WiFi fails)

### Common Failure Modes

| Failure | Mitigation |
|---|---|
| Vercel deploy down | Localhost demo |
| Supabase auth fails | Use seeded direct URLs (skip login) |
| LLM API timeout | Hardcoded explanations as fallback |
| Mapbox quota | Static map screenshot |
| WiFi flaky | Mobile hotspot ready |
| Browser crashes | Have Chrome + Firefox open |

---

## End of Document 2 — Implementation Plan

**Next: Document 3 — Pitch & Demo Playbook**
