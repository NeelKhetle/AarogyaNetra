/**
 * AarogyaNetra AI — Feature Extraction Pipeline
 *
 * Converts raw user profile, vitals, and lab data into a normalized
 * 18-dimensional feature vector for ML model inference.
 *
 * Key design decisions:
 * - All features normalized to [0, 1] for model stability
 * - Missing features imputed with population medians (WHO/ICMR reference)
 * - Feature mask tracks which values are real vs imputed for confidence scoring
 * - Pure TypeScript — no external dependencies
 */

import {
  NormalizedFeatures,
  FeatureMask,
  NUM_FEATURES,
  FEATURE_NAMES,
} from '../models/types';

import type {
  UserProfile,
  VitalSigns,
  LabReportEntry,
  FamilyHealthHistory,
} from '../../../models/types';

// ─── Population Medians (ICMR / WHO reference) ─────────
/** Used to impute missing feature values */
const POPULATION_MEDIANS = {
  age: 35,
  bmi: 22.5,
  heartRate: 72,
  hrv: 42,
  systolicBP: 118,
  diastolicBP: 76,
  spo2: 97,
  respiratoryRate: 16,
  hemoglobin: 13.0,
  fastingGlucose: 95,
  hba1c: 5.4,
};

// ─── Normalization Ranges ───────────────────────────────
const NORMALIZATION = {
  age:              { min: 18, max: 90 },
  bmi:              { min: 15, max: 45 },
  heartRate:        { min: 50, max: 120 },
  hrv:              { min: 10, max: 70 },
  systolicBP:       { min: 90, max: 200 },
  diastolicBP:      { min: 55, max: 130 },
  spo2:             { min: 85, max: 100 },
  respiratoryRate:  { min: 10, max: 30 },
  hemoglobin:       { min: 5, max: 18 },
  fastingGlucose:   { min: 60, max: 300 },
  hba1c:            { min: 4, max: 14 },
};

/** Clamp and normalize a value to [0, 1] */
function normalize(value: number, min: number, max: number): number {
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

/** Compute BMI from weight (kg) and height (cm) */
function computeBMI(weight?: number, height?: number): number | null {
  if (!weight || !height || height <= 0) return null;
  const heightM = height / 100;
  return weight / (heightM * heightM);
}

// ─── Main Feature Extraction ────────────────────────────
export interface ExtractedFeatures {
  features: NormalizedFeatures;
  featureMask: FeatureMask;
  rawValues: Record<string, number | null>;
}

/**
 * Extract and normalize features from all available data sources.
 *
 * Data priority: Lab reports > Vitals > Profile > Population median
 * This progressive approach means predictions improve as more data is entered.
 */
export function extractFeatures(
  profile: UserProfile,
  vitals?: VitalSigns,
  labReports?: LabReportEntry[],
): ExtractedFeatures {
  const available: boolean[] = new Array(NUM_FEATURES).fill(false);
  const rawValues: Record<string, number | null> = {};

  // Sort lab reports by date (newest first)
  const sortedLabs = labReports
    ? [...labReports].sort(
        (a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime()
      )
    : [];

  // Find most recent lab values
  const latestLabValues = mergeLabValues(sortedLabs);

  // ── Feature 0: Age ──────────────────────────────
  const ageRaw = profile.age;
  rawValues.age = ageRaw;
  available[0] = true; // age is always available from profile

  // ── Feature 1: Gender ───────────────────────────
  const genderRaw = profile.gender;
  rawValues.gender = genderRaw === 'female' ? 1 : genderRaw === 'male' ? 0 : 0.5;
  available[1] = true;

  // ── Feature 2: BMI ─────────────────────────────
  const bmiRaw = computeBMI(profile.weight, profile.height)
    ?? (latestLabValues.weight && profile.height
      ? computeBMI(latestLabValues.weight, profile.height)
      : null);
  rawValues.bmi = bmiRaw;
  available[2] = bmiRaw !== null;

  // ── Feature 3: Heart Rate ──────────────────────
  const hrRaw = latestLabValues.heartRate ?? vitals?.heartRate ?? null;
  rawValues.heartRate = hrRaw;
  available[3] = hrRaw !== null;

  // ── Feature 4: HRV ────────────────────────────
  // HRV is typically from simulation/wearable — not in standard lab reports
  const hrvRaw = null; // Will come from simulation layer
  rawValues.hrv = hrvRaw;
  available[4] = false;

  // ── Feature 5: Systolic BP ─────────────────────
  const sysRaw = latestLabValues.systolic ?? vitals?.bloodPressureSystolic ?? null;
  rawValues.systolicBP = sysRaw;
  available[5] = sysRaw !== null;

  // ── Feature 6: Diastolic BP ────────────────────
  const diaRaw = latestLabValues.diastolic ?? vitals?.bloodPressureDiastolic ?? null;
  rawValues.diastolicBP = diaRaw;
  available[6] = diaRaw !== null;

  // ── Feature 7: SpO2 ───────────────────────────
  const spo2Raw = latestLabValues.spo2 ?? vitals?.spo2Proxy ?? null;
  rawValues.spo2 = spo2Raw;
  available[7] = spo2Raw !== null;

  // ── Feature 8: Respiratory Rate ────────────────
  const rrRaw = vitals?.respiratoryRate ?? null;
  rawValues.respiratoryRate = rrRaw;
  available[8] = rrRaw !== null;

  // ── Feature 9: Hemoglobin ──────────────────────
  const hbRaw = latestLabValues.hemoglobin ?? null;
  rawValues.hemoglobin = hbRaw;
  available[9] = hbRaw !== null;

  // ── Feature 10: Fasting Glucose ────────────────
  const fgRaw = latestLabValues.fastingGlucose ?? null;
  rawValues.fastingGlucose = fgRaw;
  available[10] = fgRaw !== null;

  // ── Feature 11: HbA1c ─────────────────────────
  const hba1cRaw = latestLabValues.hba1c ?? null;
  rawValues.hba1c = hba1cRaw;
  available[11] = hba1cRaw !== null;

  // ── Features 12–15: Family History ─────────────
  const fh = profile.familyHistory;
  rawValues.familyDiabetes = fh?.diabetesInFamily ? 1 : 0;
  rawValues.familyHypertension = fh?.hypertensionInFamily ? 1 : 0;
  rawValues.familyAnemia = fh?.anemiaInFamily ? 1 : 0;
  rawValues.familyHeartDisease = fh?.heartDiseaseInFamily ? 1 : 0;
  available[12] = true; // family history defaults to false (known absence)
  available[13] = true;
  available[14] = true;
  available[15] = true;

  // ── Feature 16: Smoking Status ─────────────────
  // Defaults to 0 (non-smoker) if not provided
  rawValues.smokingStatus = 0;
  available[16] = false; // not actively collected yet

  // ── Feature 17: Physical Activity ──────────────
  rawValues.physicalActivity = 0.5; // moderate default
  available[17] = false; // not actively collected yet

  // ── Build normalized feature vector ─────────────
  const N = NORMALIZATION;
  const features: NormalizedFeatures = {
    age:              normalize(ageRaw, N.age.min, N.age.max),
    gender:           rawValues.gender as number,
    bmi:              normalize(bmiRaw ?? POPULATION_MEDIANS.bmi, N.bmi.min, N.bmi.max),
    heartRate:        normalize(hrRaw ?? POPULATION_MEDIANS.heartRate, N.heartRate.min, N.heartRate.max),
    hrv:              normalize(hrvRaw ?? POPULATION_MEDIANS.hrv, N.hrv.min, N.hrv.max),
    systolicBP:       normalize(sysRaw ?? POPULATION_MEDIANS.systolicBP, N.systolicBP.min, N.systolicBP.max),
    diastolicBP:      normalize(diaRaw ?? POPULATION_MEDIANS.diastolicBP, N.diastolicBP.min, N.diastolicBP.max),
    spo2:             normalize(spo2Raw ?? POPULATION_MEDIANS.spo2, N.spo2.min, N.spo2.max),
    respiratoryRate:  normalize(rrRaw ?? POPULATION_MEDIANS.respiratoryRate, N.respiratoryRate.min, N.respiratoryRate.max),
    hemoglobin:       normalize(hbRaw ?? POPULATION_MEDIANS.hemoglobin, N.hemoglobin.min, N.hemoglobin.max),
    fastingGlucose:   normalize(fgRaw ?? POPULATION_MEDIANS.fastingGlucose, N.fastingGlucose.min, N.fastingGlucose.max),
    hba1c:            normalize(hba1cRaw ?? POPULATION_MEDIANS.hba1c, N.hba1c.min, N.hba1c.max),
    familyDiabetes:   rawValues.familyDiabetes as number,
    familyHypertension: rawValues.familyHypertension as number,
    familyAnemia:     rawValues.familyAnemia as number,
    familyHeartDisease: rawValues.familyHeartDisease as number,
    smokingStatus:    rawValues.smokingStatus as number,
    physicalActivity: rawValues.physicalActivity as number,
  };

  const availableCount = available.filter(Boolean).length;

  return {
    features,
    featureMask: {
      available,
      availableCount,
      missingCount: NUM_FEATURES - availableCount,
    },
    rawValues,
  };
}

/**
 * Update features with simulated vital signs from the rPPG simulation layer.
 * Called after the simulation runs to fill in vitals-derived features.
 */
export function updateFeaturesWithVitals(
  extracted: ExtractedFeatures,
  vitals: VitalSigns,
  hrv: number,
): ExtractedFeatures {
  const N = NORMALIZATION;
  const features = { ...extracted.features };
  const available = [...extracted.featureMask.available];
  const rawValues = { ...extracted.rawValues };

  // Update heart rate if not from lab
  if (!available[3]) {
    features.heartRate = normalize(vitals.heartRate, N.heartRate.min, N.heartRate.max);
    rawValues.heartRate = vitals.heartRate;
    available[3] = true;
  }

  // Update HRV
  if (!available[4]) {
    features.hrv = normalize(hrv, N.hrv.min, N.hrv.max);
    rawValues.hrv = hrv;
    available[4] = true;
  }

  // Update BP if not from lab
  if (!available[5]) {
    features.systolicBP = normalize(vitals.bloodPressureSystolic, N.systolicBP.min, N.systolicBP.max);
    rawValues.systolicBP = vitals.bloodPressureSystolic;
    available[5] = true;
  }
  if (!available[6]) {
    features.diastolicBP = normalize(vitals.bloodPressureDiastolic, N.diastolicBP.min, N.diastolicBP.max);
    rawValues.diastolicBP = vitals.bloodPressureDiastolic;
    available[6] = true;
  }

  // Update SpO2 if not from lab
  if (!available[7]) {
    features.spo2 = normalize(vitals.spo2Proxy, N.spo2.min, N.spo2.max);
    rawValues.spo2 = vitals.spo2Proxy;
    available[7] = true;
  }

  // Update respiratory rate
  if (!available[8]) {
    features.respiratoryRate = normalize(vitals.respiratoryRate, N.respiratoryRate.min, N.respiratoryRate.max);
    rawValues.respiratoryRate = vitals.respiratoryRate;
    available[8] = true;
  }

  const availableCount = available.filter(Boolean).length;

  return {
    features,
    featureMask: {
      available,
      availableCount,
      missingCount: NUM_FEATURES - availableCount,
    },
    rawValues,
  };
}

/**
 * Update features with hemoglobin from conjunctival simulation.
 */
export function updateFeaturesWithConjunctiva(
  extracted: ExtractedFeatures,
  hemoglobin: number,
): ExtractedFeatures {
  const N = NORMALIZATION;
  const features = { ...extracted.features };
  const available = [...extracted.featureMask.available];
  const rawValues = { ...extracted.rawValues };

  if (!available[9]) {
    features.hemoglobin = normalize(hemoglobin, N.hemoglobin.min, N.hemoglobin.max);
    rawValues.hemoglobin = hemoglobin;
    available[9] = true;
  }

  const availableCount = available.filter(Boolean).length;

  return {
    features,
    featureMask: {
      available,
      availableCount,
      missingCount: NUM_FEATURES - availableCount,
    },
    rawValues,
  };
}

/**
 * Convert NormalizedFeatures to a flat array in the order expected by models.
 */
export function featuresToArray(features: NormalizedFeatures): number[] {
  return FEATURE_NAMES.map(name => features[name]);
}

// ─── Helper: Merge Lab Values ───────────────────────────
function mergeLabValues(sortedLabs: LabReportEntry[]): Record<string, number | undefined> {
  const merged: Record<string, number | undefined> = {};

  // Walk through labs (newest first), fill in any missing values
  for (const lab of sortedLabs) {
    const v = lab.values;
    if (v.fastingGlucose !== undefined && merged.fastingGlucose === undefined) merged.fastingGlucose = v.fastingGlucose;
    if (v.hba1c !== undefined && merged.hba1c === undefined) merged.hba1c = v.hba1c;
    if (v.systolic !== undefined && merged.systolic === undefined) merged.systolic = v.systolic;
    if (v.diastolic !== undefined && merged.diastolic === undefined) merged.diastolic = v.diastolic;
    if (v.hemoglobin !== undefined && merged.hemoglobin === undefined) merged.hemoglobin = v.hemoglobin;
    if (v.heartRate !== undefined && merged.heartRate === undefined) merged.heartRate = v.heartRate;
    if (v.spo2 !== undefined && merged.spo2 === undefined) merged.spo2 = v.spo2;
    if (v.weight !== undefined && merged.weight === undefined) merged.weight = v.weight;
  }

  return merged;
}

// ─── Human-readable Feature Descriptions ────────────────
export const FEATURE_DESCRIPTIONS: Record<keyof NormalizedFeatures, string> = {
  age: 'Age',
  gender: 'Gender',
  bmi: 'Body Mass Index',
  heartRate: 'Resting Heart Rate',
  hrv: 'Heart Rate Variability',
  systolicBP: 'Systolic Blood Pressure',
  diastolicBP: 'Diastolic Blood Pressure',
  spo2: 'Blood Oxygen Saturation',
  respiratoryRate: 'Respiratory Rate',
  hemoglobin: 'Hemoglobin Level',
  fastingGlucose: 'Fasting Blood Glucose',
  hba1c: 'Glycated Hemoglobin (HbA1c)',
  familyDiabetes: 'Family History of Diabetes',
  familyHypertension: 'Family History of Hypertension',
  familyAnemia: 'Family History of Anemia',
  familyHeartDisease: 'Family History of Heart Disease',
  smokingStatus: 'Smoking Status',
  physicalActivity: 'Physical Activity Level',
};
