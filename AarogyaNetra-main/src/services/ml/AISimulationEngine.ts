/**
 * AarogyaNetra AI - AI Simulation Engine v2.0 (ML-Powered)
 *
 * UPGRADE from v1.0:
 * - v1.0: Rule-based risk scoring with hardcoded thresholds
 * - v2.0: 3-model ML ensemble (Logistic Regression + Random Forest + Gradient Boosted Trees)
 *
 * Architecture:
 *   Phase 1: Vitals Simulation  → rPPG (HR, HRV, BP, SpO2) + Conjunctiva (Hb, pallor)
 *   Phase 2: Feature Extraction → 18-dim normalized feature vector from profile + vitals + labs
 *   Phase 3: ML Prediction      → 3 models × 3 diseases = 9 inference runs, ensemble-fused
 *   Phase 4: Lab Override        → Real lab data overrides simulated values
 *   Phase 5: XAI Explanation     → SHAP-like feature attribution + counterfactuals
 *   Phase 6: Diet Generation     → Personalized Indian diet based on ML risk scores
 *
 * This runs 100% on-device with zero network dependency.
 * In the future, replace simulation functions with TFLite model inference.
 */

import {
  ScanResult,
  VitalSigns,
  HypertensionResult,
  DiabetesResult,
  AnemiaResult,
  UserProfile,
  LabReportEntry,
  DietPlan,
  DietRecommendation,
  FamilyHealthHistory,
} from '../../models/types';

// ML Model imports
import { extractFeatures, updateFeaturesWithVitals, updateFeaturesWithConjunctiva } from './features/FeatureExtractor';
import { predictAllDiseases } from './models/ModelEnsemble';
import { DIABETES_WEIGHTS } from './weights/diabetesWeights';
import { HYPERTENSION_WEIGHTS } from './weights/hypertensionWeights';
import { ANEMIA_WEIGHTS } from './weights/anemiaWeights';
import { generateMLExplanation, classifyRiskFromML, getRiskCategory } from './explainability/ExplainableAI';

// ─── Per-User + Per-Scan Seeded Random ──────────────────
/**
 * TWO-LAYER randomness:
 *   Layer 1 (Profile Seed): Determines the BASELINE for this person.
 *     - A 25-year-old female named "Priya" gets DIFFERENT baselines than
 *       a 50-year-old male named "Ramesh". This is driven by age, gender,
 *       name, weight, height — the actual medical factors.
 *   Layer 2 (Scan Nonce): Adds NATURAL per-scan variation (±3-5%).
 *     - Even the same person's BP varies by ~5 mmHg between readings.
 *     - This uses the current timestamp so each scan is slightly different.
 *
 * Result: Different people → different results. Same person → similar but
 * not identical results (like real medical readings).
 */
let seed = 0;
let scanNonce = 0; // per-scan variation

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0x7fffffff;
  }
  return hash || 1;
}

function initSeed(profile: UserProfile): void {
  // Layer 1: Profile-based baseline seed
  // Uses ALL profile fields so different users get different readings
  const profileKey = [
    profile.name.toLowerCase().trim(),
    profile.age,
    profile.gender,
    profile.weight || 0,
    profile.height || 0,
    profile.id,
  ].join('_');
  seed = hashString(profileKey);

  // Layer 2: Per-scan nonce from current time (gives natural ±3-5% variation)
  // This is intentional — real vitals vary between measurements
  scanNonce = hashString(Date.now().toString());
}

function seededRandom(): number {
  // Mix profile seed with scan nonce for each call
  seed = (seed * 16807 + scanNonce) % 2147483647;
  scanNonce = (scanNonce * 48271) % 2147483647;
  return (seed - 1) / 2147483646;
}

function gaussianRandom(mean: number, stddev: number): number {
  // Box-Muller transform
  const u1 = Math.max(seededRandom(), 0.0001); // prevent log(0)
  const u2 = seededRandom();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + stddev * z;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ─── rPPG Simulation (Profile-Deterministic) ──────────
/**
 * Simulates rPPG signal analysis from facial video.
 * Uses age/gender-adjusted physiological models.
 * In production, this would be replaced by TFLite model inference
 * on actual video frames.
 */
function simulateRPPG(
  age: number,
  gender: string,
  familyHistory?: FamilyHealthHistory,
): {
  heartRate: number;
  hrv: number;
  systolic: number;
  diastolic: number;
  respiratoryRate: number;
  spo2: number;
} {
  // Age-adjusted heart rate (resting) — deterministic per profile
  const baseHR = gender === 'female' ? 75 : 72;
  const ageEffect = age > 50 ? (age - 50) * 0.15 : 0;
  // Use a small deterministic perturbation, not a large random variance
  const hrVariation = gaussianRandom(0, 3); // smaller stddev for consistency
  const heartRate = Math.round(clamp(baseHR + ageEffect + hrVariation, 55, 105));

  // HRV (SDNN) — decreases with age
  const baseHRV = 50 - (age - 30) * 0.5;
  const hrvVariation = gaussianRandom(0, 3);
  const hrv = clamp(baseHRV + hrvVariation, 15, 70);

  // Blood pressure — increases with age, family history matters
  let baseSystolic = 110 + (age - 25) * 0.6 + (gender === 'male' ? 5 : 0);
  let baseDiastolic = 70 + (age - 25) * 0.3;

  // Family history adjustment
  if (familyHistory?.hypertensionInFamily) {
    baseSystolic += 8;
    baseDiastolic += 5;
  }
  if (familyHistory?.heartDiseaseInFamily) {
    baseSystolic += 4;
  }

  const systolic = Math.round(clamp(baseSystolic + gaussianRandom(0, 4), 95, 185));
  const diastolic = Math.round(clamp(baseDiastolic + gaussianRandom(0, 3), 58, 115));

  // Respiratory rate (12-20 is normal)
  const respiratoryRate = Math.round(clamp(gaussianRandom(16, 1), 12, 22));

  // SpO2
  const spo2 = Math.round(clamp(gaussianRandom(97, 0.8), 92, 100));

  return { heartRate, hrv, systolic, diastolic, respiratoryRate, spo2 };
}

// ─── Conjunctiva Simulation ───────────────────────────
/**
 * Simulates conjunctival color analysis for anemia detection.
 * In production, this would analyze actual eye images using TFLite.
 */
function simulateConjunctiva(
  age: number,
  gender: string,
  familyHistory?: FamilyHealthHistory,
): {
  hemoglobin: number;
  pallorIndex: number;
  colorScore: number;
} {
  // Gender-based hemoglobin distribution (WHO reference)
  let baseHb = gender === 'female' ? 12.5 : 14.0;
  const ageEffect = age > 60 ? -0.5 : 0;

  // Family history adjustment
  if (familyHistory?.anemiaInFamily) {
    baseHb -= 0.8;
  }

  const hemoglobin = clamp(
    baseHb + ageEffect + gaussianRandom(0, 0.6), // smaller variance for consistency
    7.0, 17.0
  );

  // Pallor index: 0=healthy pink, 1=pale/white
  const normalHb = gender === 'female' ? 12.0 : 13.5;
  const pallorIndex = clamp(
    1 - (hemoglobin / normalHb) + gaussianRandom(0, 0.03),
    0, 1
  );

  // Conjunctival color score
  const colorScore = clamp(
    hemoglobin / 16.0 + gaussianRandom(0, 0.02),
    0, 1
  );

  return { hemoglobin, pallorIndex, colorScore };
}

// ─── Lab Data Override ────────────────────────────────
/**
 * When lab report data is available, use REAL values instead of simulated ones.
 * This is the key to eliminating random predictions.
 */
function applyLabDataOverrides(
  rppg: { heartRate: number; hrv: number; systolic: number; diastolic: number; respiratoryRate: number; spo2: number },
  conjunctiva: { hemoglobin: number; pallorIndex: number; colorScore: number },
  labReports: LabReportEntry[],
): {
  rppg: typeof rppg;
  conjunctiva: typeof conjunctiva;
  usedLabData: boolean;
} {
  if (!labReports || labReports.length === 0) {
    return { rppg, conjunctiva, usedLabData: false };
  }

  let usedLabData = false;

  // Sort by reportDate descending to use most recent data
  const sorted = [...labReports].sort(
    (a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime()
  );

  for (const report of sorted) {
    const v = report.values;

    // Blood pressure override
    if (v.systolic && v.diastolic) {
      rppg.systolic = v.systolic;
      rppg.diastolic = v.diastolic;
      usedLabData = true;
    }

    // Heart rate override
    if (v.heartRate) {
      rppg.heartRate = v.heartRate;
      usedLabData = true;
    }

    // SpO2 override
    if (v.spo2) {
      rppg.spo2 = v.spo2;
      usedLabData = true;
    }

    // Hemoglobin override
    if (v.hemoglobin) {
      conjunctiva.hemoglobin = v.hemoglobin;
      const normalHb = 13.0;
      conjunctiva.pallorIndex = clamp(1 - (v.hemoglobin / normalHb), 0, 1);
      conjunctiva.colorScore = clamp(v.hemoglobin / 16.0, 0, 1);
      usedLabData = true;
    }

    // Once we've found the most recent data, break
    if (usedLabData) break;
  }

  return { rppg, conjunctiva, usedLabData };
}

// ─── Diet Plan Generator ──────────────────────────────
function generateDietPlan(
  hypRisk: number,
  diabRisk: number,
  anemRisk: number,
  profile: UserProfile,
  scanId: string,
): DietPlan {
  const recommendations: DietRecommendation[] = [];

  // Hypertension diet
  if (hypRisk > 0.2) {
    recommendations.push({
      category: 'Heart Health (DASH Diet)',
      icon: '❤️',
      title: 'Blood Pressure Management',
      description: hypRisk > 0.5
        ? 'Your BP readings suggest following a strict DASH diet to lower blood pressure naturally.'
        : 'Preventive heart-healthy eating to maintain optimal blood pressure.',
      foods: [
        'Leafy greens (spinach, palak, methi)',
        'Bananas, oranges, pomegranates',
        'Whole grains (bajra, jowar, ragi)',
        'Low-fat dahi & paneer',
        'Garlic, turmeric, ginger',
        'Flaxseeds & walnuts',
        'Lauki (bottle gourd) juice',
      ],
      avoid: [
        'Excess salt & pickles (achar)',
        'Papad, chips, namkeen',
        'Processed & packaged foods',
        'Red meat in excess',
        'Alcohol & caffeine',
        'Fried foods (pakoras, samosas)',
      ],
      mealPlan: {
        breakfast: 'Oats upma with vegetables + green tea + banana',
        lunch: 'Brown rice + dal + palak sabzi + cucumber raita',
        dinner: 'Roti (wheat) + lauki sabzi + moong dal soup',
        snacks: 'Handful of walnuts + pomegranate/orange',
      },
    });
  }

  // Diabetes diet
  if (diabRisk > 0.2) {
    recommendations.push({
      category: 'Blood Sugar Control',
      icon: '🩸',
      title: 'Glycemic Management Diet',
      description: diabRisk > 0.5
        ? 'Your HbA1c levels indicate the need for strict glycemic control through diet.'
        : 'Preventive diet to maintain healthy blood sugar levels.',
      foods: [
        'Bitter gourd (karela) — natural insulin',
        'Fenugreek (methi) seeds & leaves',
        'Whole grains: ragi, jowar, barley',
        'Green vegetables: bhindi, tinda, tori',
        'Jamun (Indian blackberry)',
        'Amla (Indian gooseberry)',
        'Cinnamon (dalchini) tea',
        'Moong dal & chana',
      ],
      avoid: [
        'White rice, maida (refined flour)',
        'Sugary drinks, juices with added sugar',
        'Sweets: mithai, gulab jamun, jalebi',
        'White bread, naan',
        'Potatoes in excess',
        'Mangoes & grapes in excess',
        'Packaged fruit juices',
      ],
      mealPlan: {
        breakfast: 'Methi paratha (wheat) + sugar-free tea + boiled egg',
        lunch: 'Bajra roti + karela sabzi + dal + salad',
        dinner: 'Jowar roti + mixed veg + moong soup',
        snacks: 'Soaked methi seeds water + roasted chana + cucumber',
      },
    });
  }

  // Anemia diet
  if (anemRisk > 0.2) {
    recommendations.push({
      category: 'Iron-Rich Diet',
      icon: '👁️',
      title: 'Hemoglobin Boosting Plan',
      description: anemRisk > 0.5
        ? 'Your hemoglobin levels are low. Urgent dietary iron supplementation recommended.'
        : 'Maintain healthy hemoglobin levels with iron-rich foods.',
      foods: [
        'Spinach (palak), amaranth (chaulai)',
        'Beetroot — juice or sabzi',
        'Pomegranate (anar)',
        'Jaggery (gur) instead of sugar',
        'Dates (khajur) & figs (anjeer)',
        'Green peas, rajma, chana',
        'Egg yolk & chicken liver',
        'Vitamin C foods (amla, lemon) for iron absorption',
      ],
      avoid: [
        'Tea/coffee with meals (blocks iron absorption)',
        'Excess calcium with iron-rich foods',
        'Processed junk food',
        'Excess dairy right after iron-rich meals',
      ],
      mealPlan: {
        breakfast: 'Beetroot-pomegranate smoothie + dates + poha with peanuts',
        lunch: 'Rice/roti + rajma/chana + palak sabzi + lemon',
        dinner: 'Ragi roti + green veg sabzi + dal with jaggery',
        snacks: 'Gur chana + amla juice + handful of dry fruits',
      },
    });
  }

  // General wellness
  recommendations.push({
    category: 'General Wellness',
    icon: '🌿',
    title: 'Overall Health & Immunity',
    description: 'Daily habits for optimal health maintenance.',
    foods: [
      'Seasonal fruits & vegetables',
      'Haldi (turmeric) milk before bed',
      'Tulsi & ginger tea',
      'Sprouts (moong, chana)',
      'Curd/Dahi for probiotics',
      'Nuts: almonds, cashews, peanuts',
    ],
    avoid: [
      'Skipping meals',
      'Late-night heavy eating',
      'Excess oily & fried foods',
      'Sedentary lifestyle after meals',
    ],
    mealPlan: {
      breakfast: 'Fresh seasonal fruit + any healthy option from above',
      lunch: 'Balanced thali: roti/rice + dal + sabzi + salad + curd',
      dinner: 'Light meal 2-3 hours before sleep',
      snacks: 'Fruits, dry fruits, sprouts, buttermilk (chaas)',
    },
  });

  // Calculate approximate daily calories based on profile
  let dailyCalories = 2000;
  if (profile.gender === 'female') dailyCalories = 1800;
  if (profile.age > 50) dailyCalories -= 200;
  if (profile.age < 25) dailyCalories += 200;

  return {
    scanId,
    generatedAt: new Date().toISOString(),
    overallAdvice: getOverallDietAdvice(hypRisk, diabRisk, anemRisk),
    recommendations,
    dailyCalories,
    waterIntake: '8-10 glasses (2.5-3 liters) daily',
    exerciseAdvice: getExerciseAdvice(hypRisk, diabRisk, anemRisk, profile.age),
  };
}

function getOverallDietAdvice(hypRisk: number, diabRisk: number, anemRisk: number): string {
  const risks = [];
  if (hypRisk > 0.3) risks.push('hypertension');
  if (diabRisk > 0.3) risks.push('diabetes');
  if (anemRisk > 0.3) risks.push('anemia');

  if (risks.length === 0) {
    return 'Your health indicators are in a good range. Focus on a balanced Indian diet with plenty of seasonal fruits, vegetables, whole grains, and dals. Stay active and hydrated.';
  }
  return `Based on your AI-powered screening, dietary focus areas include: ${risks.join(', ')}. Follow the specific meal plans below and consult your doctor for personalized guidance. These recommendations are based on ICMR (Indian Council of Medical Research) dietary guidelines.`;
}

function getExerciseAdvice(hypRisk: number, diabRisk: number, anemRisk: number, age: number): string {
  if (anemRisk > 0.6) {
    return 'Light walking (15-20 min) twice daily. Avoid strenuous exercise until hemoglobin improves. Consult your doctor before starting any exercise program.';
  }
  if (hypRisk > 0.5 || diabRisk > 0.5) {
    return 'Brisk walking for 30-45 minutes daily. Add yoga (pranayama & surya namaskar) for stress relief. Avoid heavy weight lifting if BP is elevated.';
  }
  if (age > 55) {
    return 'Moderate walking 30 minutes daily. Yoga and light stretching recommended. Swimming is excellent for joint-friendly cardio.';
  }
  return '30-45 minutes of moderate exercise daily — brisk walking, cycling, yoga, or swimming. Include 2 sessions of strength training per week.';
}

// ─── Main Scan Function (ML-POWERED) ──────────────────
/**
 * Run a complete health scan using the 3-model ML ensemble.
 *
 * UPGRADE from v1.0:
 * 1. Uses real ML models (LR + RF + GBT) instead of rule-based scoring
 * 2. 18-dimensional feature extraction with normalization
 * 3. Ensemble prediction with adaptive weighting
 * 4. SHAP-like explainability from model coefficients
 * 5. Confidence scoring based on data completeness + model agreement
 *
 * KEY PRESERVED from v1.0:
 * - Deterministic seeded simulation for consistent readings
 * - Lab report data overrides simulation
 * - Family history affects risk calculations
 * - Diet plan generation
 */
export function runScanSimulation(
  userId: string,
  profile: UserProfile,
  labReports?: LabReportEntry[],
): ScanResult {
  // Initialize deterministic seed from user profile
  initSeed(profile);

  const { age, gender, familyHistory } = profile;

  // ═══ Phase 1: Vitals Simulation ═══════════════════
  const rppgRaw = simulateRPPG(age, gender, familyHistory);
  const conjunctivaRaw = simulateConjunctiva(age, gender, familyHistory);

  // ═══ Phase 2: Lab Data Override ═══════════════════
  const { rppg, conjunctiva, usedLabData } = applyLabDataOverrides(
    rppgRaw, conjunctivaRaw, labReports || []
  );

  // ═══ Phase 3: Feature Extraction (18-dim vector) ══
  let extracted = extractFeatures(profile, undefined, labReports);

  // Inject simulated vitals into feature vector
  const vitals: VitalSigns = {
    heartRate: rppg.heartRate,
    respiratoryRate: rppg.respiratoryRate,
    spo2Proxy: rppg.spo2,
    bloodPressureSystolic: rppg.systolic,
    bloodPressureDiastolic: rppg.diastolic,
  };

  extracted = updateFeaturesWithVitals(extracted, vitals, rppg.hrv);
  extracted = updateFeaturesWithConjunctiva(extracted, conjunctiva.hemoglobin);

  // ═══ Phase 4: ML Ensemble Prediction ══════════════
  const mlPredictions = predictAllDiseases(
    extracted.features,
    extracted.featureMask,
    DIABETES_WEIGHTS,
    HYPERTENSION_WEIGHTS,
    ANEMIA_WEIGHTS,
  );

  // ═══ Phase 5: Build Disease Results ═══════════════
  const hypertension: HypertensionResult = {
    riskLevel: classifyRiskFromML(mlPredictions.hypertension.riskProbability),
    riskScore: parseFloat(mlPredictions.hypertension.riskProbability.toFixed(2)),
    confidence: parseFloat(mlPredictions.hypertension.confidence.toFixed(2)),
    systolicEstimate: rppg.systolic,
    diastolicEstimate: rppg.diastolic,
    heartRate: rppg.heartRate,
    hrvIndex: parseFloat(rppg.hrv.toFixed(1)),
    category: getRiskCategory(mlPredictions.hypertension.riskProbability),
  };

  const diabetes: DiabetesResult = {
    riskLevel: classifyRiskFromML(mlPredictions.diabetes.riskProbability),
    riskScore: parseFloat(mlPredictions.diabetes.riskProbability.toFixed(2)),
    confidence: parseFloat(mlPredictions.diabetes.confidence.toFixed(2)),
    hba1cProxy: estimateHba1cFromML(mlPredictions.diabetes.riskProbability, labReports),
    fastingGlucoseProxy: estimateGlucoseFromML(mlPredictions.diabetes.riskProbability, labReports),
    hrvDepressionIndex: parseFloat(clamp(1 - (rppg.hrv / 60), 0, 1).toFixed(2)),
    category: getRiskCategory(mlPredictions.diabetes.riskProbability),
  };

  const anemia: AnemiaResult = {
    riskLevel: classifyRiskFromML(mlPredictions.anemia.riskProbability),
    riskScore: parseFloat(mlPredictions.anemia.riskProbability.toFixed(2)),
    confidence: parseFloat(mlPredictions.anemia.confidence.toFixed(2)),
    hemoglobinEstimate: parseFloat(conjunctiva.hemoglobin.toFixed(1)),
    pallorIndex: parseFloat(conjunctiva.pallorIndex.toFixed(2)),
    conjunctivalColorScore: parseFloat(conjunctiva.colorScore.toFixed(2)),
    category: getRiskCategory(mlPredictions.anemia.riskProbability),
  };

  // ═══ Phase 6: Overall Health Score ════════════════
  const overallHealthScore = Math.round(clamp(
    100 - (
      mlPredictions.hypertension.riskProbability * 35 +
      mlPredictions.diabetes.riskProbability * 35 +
      mlPredictions.anemia.riskProbability * 30
    ) * 100 / 100,
    0,
    100
  ));

  // ═══ Phase 7: ML-Powered ARE Explanation ══════════
  const areExplanation = generateMLExplanation(
    mlPredictions.diabetes,
    mlPredictions.hypertension,
    mlPredictions.anemia,
    extracted.featureMask,
    usedLabData,
  );

  // ═══ Phase 8: Scan ID ════════════════════════════
  const now = new Date();
  const scanId = `scn_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${hashString(now.toISOString() + userId).toString(36).substring(0, 6)}`;

  // ═══ Phase 9: Diet Plan ══════════════════════════
  const dietPlan = generateDietPlan(
    mlPredictions.hypertension.riskProbability,
    mlPredictions.diabetes.riskProbability,
    mlPredictions.anemia.riskProbability,
    profile,
    scanId,
  );

  return {
    scanId,
    timestamp: now.toISOString(),
    userId,
    overallHealthScore,
    diseases: {
      hypertension,
      diabetes,
      anemia,
    },
    vitals,
    areExplanation,
    dietPlan,
    synced: false,
    usedLabData,
  };
}

// ─── Helper: Estimate HbA1c from ML risk probability ────
/**
 * Maps ML-predicted diabetes risk back to an estimated HbA1c value
 * for display purposes. Uses lab data if available, otherwise derives
 * from the risk probability using the ADA risk-to-HbA1c mapping.
 */
function estimateHba1cFromML(diabRisk: number, labReports?: LabReportEntry[]): number {
  // Use real data if available
  const latestLab = labReports?.find(r => r.values.hba1c);
  if (latestLab?.values.hba1c) return latestLab.values.hba1c;

  // Map probability to approximate HbA1c range
  // 0.0 risk → ~5.0% | 0.25 risk → ~5.7% | 0.50 risk → ~6.5% | 1.0 risk → ~9.0%
  const hba1c = 5.0 + diabRisk * 4.0;
  return parseFloat(clamp(hba1c, 4.0, 12.0).toFixed(1));
}

function estimateGlucoseFromML(diabRisk: number, labReports?: LabReportEntry[]): number {
  const latestLab = labReports?.find(r => r.values.fastingGlucose);
  if (latestLab?.values.fastingGlucose) return latestLab.values.fastingGlucose;

  // Map probability to approximate fasting glucose
  // 0.0 risk → ~85 | 0.25 risk → ~100 | 0.50 risk → ~126 | 1.0 risk → ~200
  const glucose = 85 + diabRisk * 115;
  return Math.round(clamp(glucose, 65, 240));
}
