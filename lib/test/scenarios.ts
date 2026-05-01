import type { ClinicalProfile } from '@/lib/seed/profiles';

export type TestScenario = {
  slug: string;
  profile: ClinicalProfile;
  title: string;
  description: string;
  expected_alert: string;
  expected_dashboard: string;
  conditions: string[];
  default_age: number;
  default_sex: 'M' | 'F' | 'Other';
};

export const SCENARIOS: TestScenario[] = [
  {
    slug: 'diabetes',
    profile: 'diabetic',
    title: 'Type-2 Diabetes — rising glucose',
    description:
      '30 days of vitals where glucose drifts from ~135 mg/dL up to 220–280 mg/dL over the last week, with two missed Glimepiride doses.',
    expected_alert: 'Trend or Risk — title typically "Glucose rising trend" or similar.',
    expected_dashboard:
      'Latest glucose tile shows red (>250). Forecast chart shows ascending line with confidence band. SHAP highlights medication adherence + vital change.',
    conditions: ['diabetes'],
    default_age: 58,
    default_sex: 'M'
  },
  {
    slug: 'hypertension',
    profile: 'hypertensive',
    title: 'Hypertension — progressive BP rise',
    description:
      'Stable BP ~132/80 for 13 days, drift to 138 → 152, then 152 → 165 over the final week. Multiple missed Amlodipine + Losartan doses.',
    expected_alert: 'Risk → Critical. Title like "BP rising trend".',
    expected_dashboard:
      'BP tile turns red (>160). 72-hr forecast predicts continued rise; "critical in N days" countdown shows.',
    conditions: ['hypertension'],
    default_age: 62,
    default_sex: 'M'
  },
  {
    slug: 'heart-attack',
    profile: 'heart_attack',
    title: 'Heart attack — acute event in last 48 h',
    description:
      'Stable history until day 7. Mild warning signs days 3–7. Last 2 days: BP 178/110, HR 118, SpO₂ 89%, plus 3 missed antiplatelet doses.',
    expected_alert: 'Critical immediately. Emergency Brief recommended.',
    expected_dashboard:
      'BP, HR, and SpO₂ all flagged red. Status pill = Critical. Caregiver/Doctor sees an "Emergency Brief →" CTA. Brief shows 5 hospitals on the map.',
    conditions: ['cardiac', 'hypertension'],
    default_age: 65,
    default_sex: 'M'
  },
  {
    slug: 'kidney',
    profile: 'kidney',
    title: 'Stage-3 Chronic Kidney Disease',
    description:
      'Slow upward BP drift starting day 10 (from ~130 to ~152). On Ramipril + Furosemide. Mild adherence issue.',
    expected_alert: 'Watch or Trend.',
    expected_dashboard:
      'BP tile yellow/orange. Trends chart shows clear upslope vs personal baseline band.',
    conditions: ['kidney', 'hypertension'],
    default_age: 70,
    default_sex: 'F'
  },
  {
    slug: 'cardiac',
    profile: 'cardiac',
    title: 'Post-cardiac — elevated HR / borderline SpO₂',
    description:
      'Stable history with last 3–5 days showing HR ~95 bpm, SpO₂ 93%. On Atorvastatin + Metoprolol.',
    expected_alert: 'Watch / Trend.',
    expected_dashboard: 'HR + SpO₂ tiles in warning state. SHAP weights vital change higher.',
    conditions: ['cardiac'],
    default_age: 68,
    default_sex: 'M'
  },
  {
    slug: 'stable',
    profile: 'stable',
    title: 'Stable / well-managed',
    description: '30 days entirely within personal baseline; no missed doses.',
    expected_alert: 'No alert (level = stable).',
    expected_dashboard: 'All green tiles. "Active Monitoring — All vitals on track".',
    conditions: ['hypertension'],
    default_age: 55,
    default_sex: 'F'
  },
  {
    slug: 'deteriorating',
    profile: 'deteriorating',
    title: 'Deteriorating diabetic + hypertensive (Ramesh-style)',
    description:
      '14 stable days, then progressive BP + glucose rise, dropping sleep, and 3 missed Amlodipine doses.',
    expected_alert: 'Risk → Critical depending on day-of-trajectory.',
    expected_dashboard:
      'BP tile red, glucose tile red, sleep low. AlertCard with full SHAP + 72h forecast.',
    conditions: ['diabetes', 'hypertension'],
    default_age: 62,
    default_sex: 'M'
  }
];

export const BY_SLUG: Record<string, TestScenario> = Object.fromEntries(
  SCENARIOS.map((s) => [s.slug, s])
);
