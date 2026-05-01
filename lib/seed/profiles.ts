import 'server-only';

// Synthetic-data generators for the /api/seed-patient-history endpoint.
// Each preset returns 30 days of vitals + a medication regimen + an
// adherence pattern. Designed to drive different alert outcomes.

export type ClinicalProfile =
  | 'diabetic'
  | 'hypertensive'
  | 'cardiac'
  | 'kidney'
  | 'stable'
  | 'deteriorating'
  | 'heart_attack';

export type SyntheticVital = {
  day: number; // 1 = yesterday, 30 = 30 days ago
  bp_systolic: number;
  bp_diastolic: number;
  glucose_mgdl: number;
  heart_rate: number;
  spo2: number;
  sleep_hours: number;
  activity_level: 'low' | 'medium' | 'high';
  diet_flag: 'normal' | 'high_carb' | 'high_sodium';
  mood: number;
};

export type SyntheticMedication = {
  name: string;
  dosage: string;
  frequency: string;
  // Days where this medication was MISSED (1 = yesterday).
  missed_days: number[];
};

export type ProfileSpec = {
  conditions: string[];
  allergies: string[];
  vitals: SyntheticVital[];
  medications: SyntheticMedication[];
  meta: { description: string; expected_alert: string };
};

const noise = (sigma: number) => (Math.random() * 2 - 1) * sigma;
const clip = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function range(n: number) {
  return Array.from({ length: n }, (_, i) => i + 1);
}

// ---------- DIABETIC ----------
function diabetic(): ProfileSpec {
  const vitals: SyntheticVital[] = range(30).map((d) => {
    // Day 30..16 stable; Day 15..6 elevated; Day 5..1 spikes
    let glucose: number;
    if (d > 15) glucose = 130 + noise(10);
    else if (d > 5) glucose = 165 + (15 - d) * 3 + noise(15);
    else glucose = 220 + (5 - d) * 12 + noise(20);
    return {
      day: d,
      bp_systolic: clip(128 + noise(4), 100, 170),
      bp_diastolic: clip(82 + noise(3), 65, 105),
      glucose_mgdl: clip(glucose, 70, 400),
      heart_rate: clip(76 + noise(5), 55, 110),
      spo2: clip(97 + noise(1), 92, 100),
      sleep_hours: clip(d <= 5 ? 5.5 + noise(0.5) : 7 + noise(0.5), 3, 10),
      activity_level: d <= 5 ? 'low' : 'medium',
      diet_flag: d <= 7 ? 'high_carb' : 'normal',
      mood: d <= 5 ? 2 : 4
    };
  });

  return {
    conditions: ['diabetes'],
    allergies: ['Sulfa'],
    vitals,
    medications: [
      { name: 'Metformin',  dosage: '500mg', frequency: 'twice daily', missed_days: [4, 2] },
      { name: 'Glimepiride', dosage: '2mg',  frequency: 'morning',     missed_days: [5, 3, 1] }
    ],
    meta: {
      description: 'Type-2 diabetic with rising glucose and missed Glimepiride doses.',
      expected_alert: 'Glucose trend rising — risk level expected.'
    }
  };
}

// ---------- HYPERTENSIVE ----------
function hypertensive(): ProfileSpec {
  const vitals: SyntheticVital[] = range(30).map((d) => {
    let bps: number;
    if (d > 17) bps = 132 + noise(4);
    else if (d > 7) bps = 138 + (17 - d) * 1.5 + noise(3);
    else bps = 152 + (7 - d) * 2.5 + noise(3);
    return {
      day: d,
      bp_systolic: clip(bps, 100, 200),
      bp_diastolic: clip(bps * 0.6, 65, 120),
      glucose_mgdl: clip(105 + noise(8), 70, 180),
      heart_rate: clip(80 + noise(5), 55, 110),
      spo2: clip(97 + noise(1), 92, 100),
      sleep_hours: clip(d <= 7 ? 5 + noise(0.5) : 7 + noise(0.5), 3, 10),
      activity_level: 'medium',
      diet_flag: d <= 10 ? 'high_sodium' : 'normal',
      mood: d <= 7 ? 2 : 3
    };
  });

  return {
    conditions: ['hypertension'],
    allergies: [],
    vitals,
    medications: [
      { name: 'Amlodipine', dosage: '5mg',  frequency: 'morning', missed_days: [6, 4, 2] },
      { name: 'Losartan',   dosage: '50mg', frequency: 'morning', missed_days: [3, 1] }
    ],
    meta: {
      description: 'Hypertensive with progressive BP rise and missed doses.',
      expected_alert: 'BP trending up — risk/critical expected.'
    }
  };
}

// ---------- CARDIAC ----------
function cardiac(): ProfileSpec {
  const vitals: SyntheticVital[] = range(30).map((d) => {
    const hr = d <= 5 ? 95 + noise(8) : 70 + noise(6);
    return {
      day: d,
      bp_systolic: clip(125 + noise(5) + (d <= 5 ? 10 : 0), 100, 180),
      bp_diastolic: clip(80 + noise(3) + (d <= 5 ? 6 : 0), 60, 110),
      glucose_mgdl: clip(110 + noise(10), 70, 180),
      heart_rate: clip(hr, 50, 130),
      spo2: clip(d <= 3 ? 93 + noise(1) : 97 + noise(1), 88, 100),
      sleep_hours: clip(6.5 + noise(0.5), 3, 10),
      activity_level: d <= 5 ? 'low' : 'medium',
      diet_flag: 'normal',
      mood: 3
    };
  });

  return {
    conditions: ['cardiac'],
    allergies: ['Aspirin'],
    vitals,
    medications: [
      { name: 'Atorvastatin', dosage: '20mg', frequency: 'evening', missed_days: [] },
      { name: 'Metoprolol',   dosage: '25mg', frequency: 'twice daily', missed_days: [4, 2] }
    ],
    meta: {
      description: 'Post-cardiac patient with elevated HR and dropping SpO₂.',
      expected_alert: 'Heart rate elevated, SpO₂ borderline — watch/trend expected.'
    }
  };
}

// ---------- KIDNEY ----------
function kidney(): ProfileSpec {
  const vitals: SyntheticVital[] = range(30).map((d) => {
    const bps = d > 10 ? 130 + noise(4) : 142 + (10 - d) * 1.2 + noise(3);
    return {
      day: d,
      bp_systolic: clip(bps, 100, 200),
      bp_diastolic: clip(bps * 0.6, 65, 120),
      glucose_mgdl: clip(108 + noise(8), 70, 180),
      heart_rate: clip(78 + noise(5), 55, 110),
      spo2: clip(96 + noise(1), 90, 100),
      sleep_hours: clip(6 + noise(0.6), 3, 10),
      activity_level: 'low',
      diet_flag: 'normal',
      mood: 3
    };
  });

  return {
    conditions: ['kidney', 'hypertension'],
    allergies: ['NSAIDs'],
    vitals,
    medications: [
      { name: 'Ramipril',     dosage: '5mg',   frequency: 'morning', missed_days: [3] },
      { name: 'Furosemide',   dosage: '40mg',  frequency: 'morning', missed_days: [] }
    ],
    meta: {
      description: 'Stage-3 CKD with creeping BP.',
      expected_alert: 'Watch / Trend due to BP drift.'
    }
  };
}

// ---------- STABLE ----------
function stable(): ProfileSpec {
  const vitals: SyntheticVital[] = range(30).map((d) => ({
    day: d,
    bp_systolic: clip(122 + noise(3), 100, 140),
    bp_diastolic: clip(78 + noise(2), 60, 90),
    glucose_mgdl: clip(100 + noise(8), 80, 130),
    heart_rate: clip(70 + noise(4), 55, 95),
    spo2: clip(98 + noise(0.5), 95, 100),
    sleep_hours: clip(7.5 + noise(0.4), 5, 9),
    activity_level: 'medium',
    diet_flag: 'normal',
    mood: 4
  }));
  return {
    conditions: ['hypertension'],
    allergies: [],
    vitals,
    medications: [{ name: 'Telmisartan', dosage: '40mg', frequency: 'morning', missed_days: [] }],
    meta: { description: 'Well-managed patient.', expected_alert: 'No alerts (stable).' }
  };
}

// ---------- DETERIORATING (Ramesh-style) ----------
function deteriorating(): ProfileSpec {
  const vitals: SyntheticVital[] = range(30).map((d) => {
    let bps: number, glu: number, sleep: number;
    if (d > 13) { bps = 128 + noise(3); glu = 135 + noise(8); sleep = 7 + noise(0.5); }
    else if (d > 8) { bps = 130 + (14 - d) * 1.5 + noise(2); glu = 145 + (14 - d) * 4 + noise(8); sleep = 6.5 + noise(0.5); }
    else { bps = 138 + (9 - d) * 2.5 + noise(2); glu = 165 + (9 - d) * 5 + noise(8); sleep = 5 + noise(0.5); }
    return {
      day: d,
      bp_systolic: clip(bps, 100, 200),
      bp_diastolic: clip(bps * 0.6, 65, 120),
      glucose_mgdl: clip(glu, 70, 400),
      heart_rate: clip(78 + noise(4), 55, 110),
      spo2: clip(97 + noise(1), 90, 100),
      sleep_hours: clip(sleep, 3, 10),
      activity_level: d <= 8 ? 'low' : 'medium',
      diet_flag: 'normal',
      mood: d <= 8 ? 2 : 4
    };
  });
  return {
    conditions: ['diabetes', 'hypertension'],
    allergies: ['Penicillin'],
    vitals,
    medications: [
      { name: 'Metformin',  dosage: '500mg', frequency: 'twice daily', missed_days: [] },
      { name: 'Amlodipine', dosage: '5mg',   frequency: 'morning',     missed_days: [6, 4, 2] }
    ],
    meta: { description: 'Diabetic + Hypertensive with rising BP and 3 missed Amlodipine doses.', expected_alert: 'Risk → Critical expected.' }
  };
}

// ---------- HEART ATTACK (acute event, last 1-2 days) ----------
function heart_attack(): ProfileSpec {
  const vitals: SyntheticVital[] = range(30).map((d) => {
    let bps: number, hr: number, spo2: number;
    if (d > 7) {
      // Stable history before the event
      bps = 128 + noise(3);
      hr = 72 + noise(4);
      spo2 = 97 + noise(1);
    } else if (d > 2) {
      // Subtle warning signs in the last week
      bps = 138 + (7 - d) * 2 + noise(3);
      hr = 88 + (7 - d) * 2 + noise(4);
      spo2 = 95 + noise(1);
    } else {
      // Acute event in the last 48 hours
      bps = 178 + noise(6);
      hr = 118 + noise(8);
      spo2 = 89 + noise(1);
    }
    return {
      day: d,
      bp_systolic: clip(bps, 100, 220),
      bp_diastolic: clip(bps * 0.62, 65, 130),
      glucose_mgdl: clip(118 + noise(10), 80, 220),
      heart_rate: clip(hr, 50, 160),
      spo2: clip(spo2, 80, 100),
      sleep_hours: clip(d <= 2 ? 4 + noise(0.5) : 6.5 + noise(0.5), 3, 10),
      activity_level: 'low',
      diet_flag: 'normal',
      mood: d <= 2 ? 1 : 3
    };
  });
  return {
    conditions: ['cardiac', 'hypertension'],
    allergies: ['Aspirin'],
    vitals,
    medications: [
      { name: 'Atorvastatin', dosage: '20mg', frequency: 'evening', missed_days: [] },
      { name: 'Clopidogrel',  dosage: '75mg', frequency: 'morning', missed_days: [3, 2, 1] },
      { name: 'Metoprolol',   dosage: '25mg', frequency: 'twice daily', missed_days: [2, 1] }
    ],
    meta: {
      description: 'Acute cardiac event in last 48h: BP 178/110, HR 118, SpO₂ 89%, recent missed antiplatelet doses.',
      expected_alert: 'Critical (immediate emergency brief recommended).'
    }
  };
}

export const PROFILES: Record<ClinicalProfile, () => ProfileSpec> = {
  diabetic,
  hypertensive,
  cardiac,
  kidney,
  heart_attack,
  stable,
  deteriorating
};
