# 📘 DOCUMENT 1 — PRODUCT SPECIFICATION

# CareSense — AI Health Companion for Chronic Patients

**Track:** AI for Social Good (Track 1) — Healthcare
**Team:** Naresh (Backend / AI / APIs) + Chinmayi (Frontend / Design)
**Build Window:** 25 hours
**Tagline:** *"AI that watches between doctor visits."*

---

## 📌 Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Target Audience](#3-target-audience)
4. [Market Landscape — What Exists, What's Missing](#4-market-landscape)
5. [The CareSense Solution](#5-the-caresense-solution)
6. [Complete Feature List](#6-complete-feature-list)
7. [Impact Analysis](#7-impact-analysis)
8. [How We Win the 4 Judging Criteria](#8-judging-criteria)
9. [Differentiation & Moat](#9-differentiation)
10. [Risks & Honest Limitations](#10-risks)

---

## 1. Executive Summary

**CareSense** is a web-based AI health companion that watches chronic patients' daily data, learns their personal baseline, and predicts deterioration **72 hours before crisis** — with explainable reasoning, confidence scores, and a graduated escalation system that prevents emergency calls from ever being needed.

### The Core Thesis

> **"We don't build a panic button. We build a prevention system that makes the panic button unnecessary."**

### Why Now

- 77M diabetics in India
- 220M hypertensive adults
- 1 doctor per 1,511 people
- 70% of chronic disease emergencies are preventable with earlier intervention
- Smartphone penetration crossed 750M users — every Indian family has a device

### What's New

Every existing solution is reactive (panic buttons, post-event consultation). CareSense is the first system to combine:
1. Personal baseline learning (not generic thresholds)
2. 72-hour predictive forecasting
3. SHAP-style explainability
4. Confidence-based escalation
5. Pre-filled emergency briefs for paramedics
6. Hospital bed pre-alerts before ambulance arrival

---

## 2. Problem Statement

### The Silent Gap in Chronic Care

Chronic patients in India — diabetics, hypertensives, cardiac and kidney patients — see their doctor once every 90 days. That's a 5-minute snapshot of a 90-day journey. **The other 89 days are silent.**

### The Real Problem

```
Day 1:    BP = 120/78  ✅ Normal
Day 5:    BP = 124/80  ✅ Fine
Day 10:   BP = 130/85  ⚠️  Trending up
Day 15:   BP = 138/89  ⚠️  Still rising
Day 20:   BP = 145/95  🚨 Pre-crisis
Day 25:   BP = 165/105 💀 Stroke / hospitalization
```

A doctor sees Day 1 and Day 25. **No one sees what happens in between.**

### Why Existing Solutions Fail

1. **Tracker apps** (HealthifyMe, BeatO) use textbook thresholds — "BP > 140 = bad" — ignoring that *your* normal is different from mine.
2. **Consultation apps** (Practo, MFine) are reactive — you call when something feels wrong.
3. **Hospital EHRs** only activate during admissions.
4. **Wearables** (Apple Watch, Fitbit) measure but don't reason.
5. **SOS apps** trigger after the crisis hits — too late.

### The Quantified Cost

- **₹50,000+** average cost per preventable hospitalization
- **30–40%** of ER visits are preventable chronic flare-ups
- **70%** of chronic emergencies have warning signs 1–3 weeks earlier
- **0** existing apps in India provide 72-hour predictive alerts

### The Gap We Fill

There is no system in India that:
- Watches a chronic patient's daily trajectory
- Learns their personal baseline
- Predicts deterioration 72 hours in advance
- Explains *why* with confidence scores
- Triggers a graduated response chain involving family, doctors, and emergency services
- Pre-loads paramedics with patient context before they arrive

**CareSense is that system.**

---

## 3. Target Audience

### Primary Users (Daily Logging)

**Profile:** Chronic patients aged 45–75 with diabetes, hypertension, cardiac disease, or kidney disease.

**Behavior:** Already track vitals manually in notebooks, WhatsApp messages, or scattered apps. No insight from the data.

**Pain points:**
- Don't know when something is "abnormal for me"
- Forget to take medication
- Visit doctor only when symptoms become unbearable

### Decision Makers (Who Acts on Alerts)

**Family Caregivers** — typically the adult child living away from elderly parents.

**Profile:** 28–45 years old, urban professional, smartphone-native, anxious about parents' health.

**Why they matter:** This is India's primary chronic care decision-maker. The daughter in Bangalore decides when Dad in Mysore should see a doctor. Existing apps ignore them.

**Pain points:**
- Get crisis calls, not early warnings
- Don't know how to interpret raw vitals
- Feel powerless and reactive

### Healthcare Professionals

**Family Physicians / GPs**

**Profile:** Solo practitioners or small clinics managing 200+ chronic patients.

**Pain points:**
- Can't track patients between visits
- No early warning system
- Manual chart review is impossible at scale

### Long-Term Users

- **ASHA workers** managing 1,000+ patients in rural India
- **Insurance companies** wanting to reduce chronic-disease claims
- **Hospitals** wanting to pre-position resources for incoming emergencies

---

## 4. Market Landscape

### What Exists

| Category | Examples | What They Do | What They Miss |
|---|---|---|---|
| Tracker apps | HealthifyMe, BeatO, Lybrate | Daily logging, generic dashboards | Threshold-based alerts, no personalization, no reasoning |
| Consultation | Practo, MFine, 1mg | On-demand doctor consultations | No continuous monitoring, no proactive alerts |
| Wearables | Apple Watch, Fitbit, Mi Band | Passive vitals tracking | No medical reasoning, no caregiver loop |
| Hospital EHR | Apollo, Manipal systems | Clinical records during admission | Not used in daily life, no patient access |
| SOS apps | India 112, panic buttons | Reactive emergency calls | Too late — crisis already happened |
| Remote monitoring | Dozee, BeatO Curv | Some continuous monitoring | Expensive, hospital-tied, no family integration |

### What's Missing (The CareSense Wedge)

1. **Personal baseline intelligence** — your normal, not textbook normal
2. **72-hour predictive forecasting** — see crises before they happen
3. **Explainable AI** — every alert ships with reasoning
4. **Confidence scoring** — honest about what we don't know
5. **Graduated escalation** — gentle nudges → family alerts → doctor → emergency
6. **Pre-filled paramedic briefs** — 108 calls with patient context
7. **Hospital bed pre-alerting** — destination ready before ambulance arrives

**No single product combines these. CareSense does.**

---

## 5. The CareSense Solution

### One-Line Pitch

> **CareSense watches chronic patients' daily data, predicts deterioration 72 hours before crisis, and triggers a graduated response chain — with explainable AI, confidence scores, and emergency briefs that reach paramedics before they arrive.**

### The Five Pillars

```
1. PERSONAL BASELINE       Your normal, learned from your data
2. PREDICTIVE FORECAST     72-hour risk trajectory
3. EXPLAINABLE ALERTS      SHAP-style factor breakdown
4. CONFIDENCE SCORING      Honest uncertainty handling
5. GRADUATED ESCALATION    Family → Doctor → Emergency
```

### The Escalation Ladder

```
LEVEL  STATE         TRIGGER                 ACTION
─────  ─────         ───────                 ──────
🟢 0   Stable        All vitals normal       Log only
🟡 1   Watch         Drift detected          Patient nudge + tip
🟠 2   Trend         3+ days deviation       Family dashboard alert
🔴 3   Risk          72hr forecast >75%      Auto doctor appointment
🆘 4   Critical      Imminent crisis         108 + Hospital + Brief
```

### How It Works (User Journey)

**Day 1–7:** Ramesh logs daily — BP, glucose, meds, sleep. CareSense learns his baseline.

**Day 8–17:** All green. Patient sees streaks. Family sees stable status.

**Day 18:** BP drifts up 6%. CareSense flags as 🟡 Watch. Patient gets gentle nudge.

**Day 20:** BP up 3 days running. Status → 🟠 Trend. Daughter sees alert: *"Dad's BP needs attention."*

**Day 22:** 72hr forecast model predicts critical threshold in 2.3 days. Confidence: 84%. Status → 🔴 Risk. Doctor auto-notified. SHAP shows: BP trend 42%, missed insulin 35%, low sleep 23%.

**Day 23:** Daughter calls Dad. Doctor adjusts medication. **Crisis prevented at Day 23, not Day 25.**

---

## 6. Complete Feature List

### TIER 1 — HERO FEATURES (Build + Demo + Pitch)

#### F1. Personal Baseline Engine
- Learns each patient's normal range from their first 7–14 days of data
- Rolling 7-day moving average + standard deviation per vital
- Visual baseline band on charts (green = your normal)
- Adapts as more data comes in

#### F2. 72-Hour Risk Forecast
- Predicts vital trajectory 72 hours ahead
- Risk score: 0–100
- Confidence interval shown as shaded band
- "Critical threshold reached in X.X days" countdown

#### F3. SHAP-Style Explainability
- Every alert shows weighted factor contributions
- Visual horizontal bar chart
- Plain-English caption (LLM-generated)
- Three components per alert: What changed / Why it matters / What to do

#### F4. Confidence-Rated Predictions
- Every prediction shows confidence %
- Tiered: High (>85%) / Medium (70–85%) / Low (<70%)
- Below 70% → escalate to human ("consult doctor")
- Confidence grows with data

#### F5. Multi-Stakeholder Dashboards
- **Patient view:** Daily log + status + tips
- **Caregiver view:** Status card + alerts + "Call patient" CTA
- **Doctor view:** Clinical timeline + flagged events + acknowledge

#### F6. Graduated Escalation Ladder
- 5-level state machine: Stable → Watch → Trend → Risk → Critical
- Each level triggers different UI + notifications
- Auto-progression based on data + thresholds

#### F7. Pre-filled 108 Emergency Brief
- Auto-generated medical brief at Critical level
- Contains: patient profile, current vitals, meds, 7-day trend, predicted event, GPS, destination hospital
- "Send to 108" action (mocked for demo)
- Printable / shareable view

#### F8. Hospital Bed Pre-Alert
- Map showing 5 nearest hospitals
- Filter by: specialty, distance, bed availability
- Pre-alert system: hospital sees incoming patient + history before ambulance arrives
- Color-coded availability (green/yellow/red)

### TIER 2 — SUPPORTING FEATURES (Build Light)

#### F9. Daily Vitals Logging
- Mobile-first form: BP (systolic/diastolic), glucose, weight, SpO2 (optional), heart rate (optional)
- 30-second flow
- Saves to Supabase, triggers analysis

#### F10. Medication Adherence Tracker
- Daily checklist (taken / missed / late)
- Streak tracking (gamification)
- Weekly adherence %
- Missed dose notifications

#### F11. Lifestyle Logger
- Sleep hours (1-tap selector)
- Activity level (low/medium/high)
- Diet flags (high carb / high sodium / normal)
- Mood (1–5 scale)

#### F12. Trend Visualization
- 7-day and 30-day toggle
- Multi-vital overlay
- Personal baseline band
- Anomaly markers
- Recharts library

#### F13. Medication-Vitals Correlation
- Lag analysis: did vital change 1–2 days after missed dose?
- Surfaces as insight card: *"Missed doses preceded BP spikes 4/5 times in last 30 days"*
- Powerful intelligence demonstration

#### F14. Alert History
- Past alerts with outcomes
- "Resolved" / "Acknowledged" status
- Trend of how the system performed

### TIER 3 — HARDER FEATURES (Build If Time)

#### F15. Doctor Acknowledgment Workflow
- Doctor sees flagged patients
- Acknowledge / Override / Schedule call
- Updates patient + caregiver views
- Audit trail

#### F16. Smart Notifications System
- In-app alert badges (no real push for MVP)
- Color-coded by severity
- Dismissible / actionable

#### F17. Patient History Timeline
- Chronological view of all events
- Logs, alerts, medication changes, doctor notes
- Filter by event type

#### F18. Family Member Linking
- Patient invites caregiver via email
- Role-based permissions
- Multiple caregivers per patient supported

### TIER 4 — ROADMAP (Slide-Only, Don't Build)

- Real LSTM model trained on MIMIC-III
- Wearable integration (Apple Health, Fitbit, Omron BP cuffs)
- Voice logging in Hindi/Kannada/Tamil
- ASHA worker mobile app
- Federated learning across consenting users
- Insurance partner integration
- Real 108 / NHA / Ayushman Bharat API integration
- Post-crisis learning loop (model self-improves per patient)
- WhatsApp Business API alerts
- Pharmacy auto-refill integration

---

## 7. Impact Analysis

### Per-Patient Impact

| Metric | Value | Source |
|---|---|---|
| Avg cost per avoided hospitalization | ₹50,000+ | NSSO 75th round |
| Lead time before crisis | 7–14 days | Remote monitoring meta-studies |
| Reduction in preventable admissions | 60–70% | Apollo CARE program data |
| Caregiver anxiety reduction | Significant | Qualitative |
| Medication adherence improvement | 40–60% | Tracker app studies |

### System-Level Impact (At Scale)

If CareSense reaches **1 million chronic patients** in Year 3:
- **600,000–700,000** preventable hospitalizations averted/year
- **₹3,000–3,500 crore** in healthcare costs saved
- **Reduced ER load** — 30%+ reduction in chronic flare-up admissions
- **Better data for doctors** — longitudinal real-world evidence
- **Lower insurance claims** — measurable reduction in chronic claim severity

### Market Size

- **Indian Remote Patient Monitoring market:** ₹4,500 Cr by 2027 (₹1,200 Cr today)
- **Total addressable chronic patient population:** ~300M Indians
- **Direct addressable (smartphone + caregiver):** ~75M households

### Social Impact

- **Reduces caregiver guilt and helplessness** — they get early warnings, not crisis calls
- **Empowers patients** — they understand their body, not just react to it
- **Supports under-resourced doctors** — AI co-pilot for patient triage
- **Future ASHA worker scale** — one health worker can monitor 1,000+ patients with AI assistance

### Business Model (Post-MVP)

- **B2C subscription:** ₹199/month for full family access
- **B2B with insurance:** Premium discount for verified usage
- **B2G:** ASHA worker deployment via state health departments
- **Pharma data partnerships:** Anonymized adherence data (with consent, regulated)

---

## 8. How We Win the 4 Judging Criteria

> *"Evaluated on intelligence, real-world applicability, explainability, and handling of uncertainty."*

### 🧠 Intelligence

**What we do:**
- Personal baseline learning (not generic thresholds)
- 72-hour predictive forecasting
- Medication-vitals correlation mining
- Multi-feature anomaly detection
- LSTM architecture (designed for production; statistical methods in MVP)

**What we say:**
> "Our system doesn't apply textbook ranges. It learns *your* normal from *your* data and forecasts your trajectory 72 hours ahead. That's four interacting intelligence layers — baseline learning, time-series forecasting, correlation mining, and contextual recommendation — not just one threshold check."

### 🌍 Real-World Applicability

**What we do:**
- Web-only — works on a ₹500 smartphone
- Manual entry — no expensive hardware required
- Multi-stakeholder design — fits Indian family caregiving model
- DPDP Act-aligned data architecture
- LLM-generated explanations work in plain language

**What we say:**
> "A patient with no wearable can use this in 2 minutes a day. A daughter in Bangalore can monitor her dad in Mysore. A doctor can triage 50 patients from one screen. This is built for India, not retrofitted from Silicon Valley."

### 💡 Explainability

**What we do:**
- SHAP-style attribution on every alert
- Visual factor breakdown (BP 42% / Meds 35% / Sleep 23%)
- LLM-generated plain-English captions
- Three-part alert structure: What / Why / Action
- No black boxes anywhere

**What we say:**
> "Every alert ships with a SHAP chart. A doctor sees exactly why our model flagged this patient. A daughter understands what's happening to her dad without a medical degree. Explainability isn't an add-on — it's the foundation."

### 📉 Uncertainty Handling

**What we do:**
- Confidence scores on every prediction
- Confidence bands on forecasts (range, not point estimate)
- Tiered escalation by confidence (>85% act / 70–85% monitor / <70% consult doctor)
- Alert suppression below 80% confidence — reduces alert fatigue
- "We don't know" is a valid output

**What we say:**
> "Our model is honest about what it doesn't know. We forecast as a range, not a single number. We only act when confidence exceeds 80%, because a wrong alert is as dangerous as a missed one. Below that, we escalate to humans. That's responsible AI."

---

## 9. Differentiation & Moat

### Vs. Existing Solutions

| Differentiator | CareSense | HealthifyMe / BeatO | Practo / MFine | Apple Health |
|---|---|---|---|---|
| Personal baselines | ✅ | ❌ | ❌ | ⚠️ Partial |
| 72hr forecast | ✅ | ❌ | ❌ | ❌ |
| Explainable AI | ✅ | ❌ | ❌ | ❌ |
| Confidence scoring | ✅ | ❌ | ❌ | ❌ |
| Caregiver loop | ✅ | ❌ | ❌ | ⚠️ Partial |
| Emergency brief generation | ✅ | ❌ | ❌ | ❌ |
| Hospital pre-alert | ✅ | ❌ | ❌ | ❌ |
| Works on ₹500 phone | ✅ | ✅ | ✅ | ❌ |

### Defensibility (Long-Term)

1. **Data moat:** Per-patient longitudinal data improves baseline accuracy
2. **Network moat:** Caregiver-patient-doctor triads are sticky
3. **Trust moat:** Medical-grade explainability builds clinician trust
4. **Workflow moat:** Once integrated into daily routine, switching cost is high
5. **Integration moat:** Hospital, insurance, ASHA partnerships create barriers

### Why a Bigger Player Hasn't Built This

- **Apollo / Manipal:** Think enterprise-down (hospital-first, not family-first)
- **Practo / MFine:** Optimized for one-time consultations, not continuous monitoring
- **HealthifyMe / BeatO:** Consumer wellness focus, not clinical-grade
- **Apple / Google:** Hardware-first, India is a low-priority market for chronic care
- **Government:** Slow, fragmented, no UX

**The gap is real, large, and underserved.**

---

## 10. Risks & Honest Limitations

### MVP Limitations (Be Transparent)

- **Statistical methods, not trained LSTM** — production version will use LSTM trained on MIMIC-III
- **Mocked 108 integration** — real integration requires government API access (months)
- **Mocked hospital bed data** — real integration via NHA/Ayushman Bharat APIs (post-MVP)
- **Manual data entry only** — wearable integration is roadmap
- **Hindi/regional language** — English-only in MVP

### Real Risks

| Risk | Mitigation |
|---|---|
| False positives create alert fatigue | Confidence threshold + tiered escalation |
| False negatives miss real crises | Conservative bias + caregiver loop |
| Data privacy concerns | DPDP-aligned consent, encryption at rest |
| Doctor skepticism of AI | SHAP explainability + human-in-the-loop |
| Patient non-adherence to logging | Smart nudges + caregiver-assisted logging |
| Liability for missed alerts | Clear "augment not replace" framing + disclaimers |

### What We Are NOT

- ❌ A replacement for doctors
- ❌ A diagnostic tool
- ❌ A medical device (yet — would require regulatory approval)
- ❌ A panic button or SOS app
- ❌ A wearable / hardware company

### What We ARE

- ✅ A daily intelligence layer for chronic patients
- ✅ A caregiver communication tool
- ✅ A doctor triage assistant
- ✅ An early warning system
- ✅ A prevention-first product

---

## End of Document 1 — Product Specification

**Next: Document 2 — Implementation Plan (hour-by-hour build guide)**
