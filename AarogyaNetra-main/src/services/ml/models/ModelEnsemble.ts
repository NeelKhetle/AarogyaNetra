/**
 * AarogyaNetra AI — Model Ensemble Combiner
 *
 * Combines predictions from Logistic Regression, Random Forest, and
 * Gradient Boosted Trees into a single fused risk score per disease.
 *
 * Ensemble formula:
 *   P_final = α·P_lr + β·P_rf + γ·P_gbt
 *
 * Adaptive weighting:
 *   When fewer features are available (more imputation), LR weight increases
 *   (more robust to missing data) and GBT weight decreases (prone to overfitting
 *   on imputed values).
 *
 * Confidence scoring:
 *   confidence = dataCompleteness × modelAgreement
 *   where dataCompleteness = availableFeatures / totalFeatures
 *   and modelAgreement = 1 - stddev(predictions) * 2
 */

import {
  NormalizedFeatures,
  FeatureMask,
  EnsembleConfig,
  EnsemblePrediction,
  FeatureContribution,
  DiseaseModelWeights,
  DEFAULT_ENSEMBLE_CONFIG,
  FEATURE_NAMES,
  NUM_FEATURES,
} from './types';

import { predictLR, computeLRContributions } from './LogisticRegression';
import { predictRF, getRFFeatureImportance } from './RandomForest';
import { predictGBT } from './GradientBoostedTrees';
import { featuresToArray, FEATURE_DESCRIPTIONS } from '../features/FeatureExtractor';

/**
 * Run the full 3-model ensemble for a single disease.
 *
 * @param features     - Normalized feature object
 * @param featureMask  - Which features have real data
 * @param modelWeights - Pre-trained weights for this disease
 * @param config       - Ensemble configuration (weights, adaptive mode)
 * @returns EnsemblePrediction with fused probability, confidence, and explanations
 */
export function predictEnsemble(
  features: NormalizedFeatures,
  featureMask: FeatureMask,
  modelWeights: DiseaseModelWeights,
  config: EnsembleConfig = DEFAULT_ENSEMBLE_CONFIG,
): EnsemblePrediction {
  const featureArray = featuresToArray(features);

  // ── Run all 3 models ──────────────────────────────
  const lrPred = predictLR(featureArray, modelWeights.logisticRegression);
  const rfPred = predictRF(featureArray, modelWeights.randomForest);
  const gbtPred = predictGBT(featureArray, modelWeights.gradientBoostedTrees);

  // ── Adaptive weighting based on data completeness ─
  let { lrWeight, rfWeight, gbtWeight } = config;

  if (config.adaptiveWeighting) {
    const dataQuality = featureMask.availableCount / NUM_FEATURES;

    // When data is sparse, shift weight toward LR (more robust)
    // When data is abundant, shift weight toward GBT (higher accuracy)
    //
    // dataQuality 1.0 → weights stay at default (0.25, 0.35, 0.40)
    // dataQuality 0.3 → LR dominates (0.50, 0.30, 0.20)
    const sparsenessFactor = 1 - dataQuality; // 0=complete, 1=no data

    lrWeight = config.lrWeight + sparsenessFactor * 0.25;
    rfWeight = config.rfWeight - sparsenessFactor * 0.05;
    gbtWeight = config.gbtWeight - sparsenessFactor * 0.20;

    // Renormalize to sum to 1.0
    const total = lrWeight + rfWeight + gbtWeight;
    lrWeight /= total;
    rfWeight /= total;
    gbtWeight /= total;
  }

  // ── Fused probability ─────────────────────────────
  const riskProbability = parseFloat((
    lrWeight * lrPred.probability +
    rfWeight * rfPred.probability +
    gbtWeight * gbtPred.probability
  ).toFixed(4));

  // ── Confidence scoring ────────────────────────────
  // Factor 1: Data completeness
  const dataCompleteness = featureMask.availableCount / NUM_FEATURES;

  // Factor 2: Model agreement (low variance = high agreement)
  const predictions = [lrPred.probability, rfPred.probability, gbtPred.probability];
  const mean = predictions.reduce((s, p) => s + p, 0) / 3;
  const variance = predictions.reduce((s, p) => s + (p - mean) ** 2, 0) / 3;
  const modelAgreement = Math.max(0, 1 - Math.sqrt(variance) * 3);

  const confidence = parseFloat((
    dataCompleteness * 0.5 + modelAgreement * 0.5
  ).toFixed(4));

  // ── Feature importance / explanations ─────────────
  const lrContributions = computeLRContributions(featureArray, modelWeights.logisticRegression);
  const rfImportance = getRFFeatureImportance(modelWeights.randomForest);

  // Blend LR contributions (signed) with RF importance (unsigned) for ranking
  const featureImportance: FeatureContribution[] = FEATURE_NAMES.map((name, i) => {
    // Combined importance: LR gives direction, RF gives magnitude ranking
    const lrContrib = lrContributions[i];
    const rfImp = rfImportance[i];
    const blendedContribution = lrContrib * 0.6 + rfImp * (Math.sign(lrContrib) || 1) * 0.4;

    return {
      featureName: FEATURE_DESCRIPTIONS[name],
      normalizedValue: featureArray[i],
      contribution: parseFloat(blendedContribution.toFixed(4)),
      description: generateFeatureExplanation(name, featureArray[i], lrContrib, modelWeights.disease),
      isMissing: !featureMask.available[i],
    };
  });

  // Sort by absolute contribution (most important first)
  featureImportance.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  return {
    riskProbability: Math.max(0, Math.min(1, riskProbability)),
    confidence: Math.max(0, Math.min(1, confidence)),
    individualPredictions: {
      logisticRegression: lrPred,
      randomForest: rfPred,
      gradientBoostedTrees: gbtPred,
    },
    featureImportance: featureImportance.slice(0, 8), // Top 8 features
    missingFeatureCount: featureMask.missingCount,
    totalFeatureCount: NUM_FEATURES,
  };
}

/**
 * Run ensemble prediction for all 3 diseases at once.
 */
export function predictAllDiseases(
  features: NormalizedFeatures,
  featureMask: FeatureMask,
  diabetesWeights: DiseaseModelWeights,
  hypertensionWeights: DiseaseModelWeights,
  anemiaWeights: DiseaseModelWeights,
  config: EnsembleConfig = DEFAULT_ENSEMBLE_CONFIG,
): {
  diabetes: EnsemblePrediction;
  hypertension: EnsemblePrediction;
  anemia: EnsemblePrediction;
} {
  return {
    diabetes: predictEnsemble(features, featureMask, diabetesWeights, config),
    hypertension: predictEnsemble(features, featureMask, hypertensionWeights, config),
    anemia: predictEnsemble(features, featureMask, anemiaWeights, config),
  };
}

// ─── Feature Explanation Generator ──────────────────────
function generateFeatureExplanation(
  featureName: keyof NormalizedFeatures,
  value: number,
  contribution: number,
  disease: string,
): string {
  const direction = contribution > 0 ? 'increases' : 'decreases';
  const strength = Math.abs(contribution) > 0.15 ? 'significantly' :
                   Math.abs(contribution) > 0.05 ? 'moderately' : 'slightly';

  const explanations: Partial<Record<keyof NormalizedFeatures, (v: number, d: string) => string>> = {
    age: (v) => v > 0.4 ? `Age is above 45 — ${strength} ${direction} ${disease} risk` : `Younger age ${strength} ${direction} ${disease} risk`,
    gender: (v) => v > 0.5 ? `Female gender ${strength} ${direction} ${disease} risk` : `Male gender ${strength} ${direction} ${disease} risk`,
    bmi: (v) => v > 0.5 ? `Elevated BMI (overweight/obese) ${strength} ${direction} ${disease} risk` : v < 0.12 ? `Low BMI (underweight) ${strength} ${direction} ${disease} risk` : `BMI is in normal range`,
    heartRate: (v) => v > 0.5 ? `Elevated resting heart rate ${strength} ${direction} ${disease} risk` : `Heart rate is within normal limits`,
    hrv: (v) => v < 0.4 ? `Reduced heart rate variability ${strength} ${direction} ${disease} risk — suggests autonomic stress` : `Healthy HRV pattern detected`,
    systolicBP: (v) => v > 0.36 ? `Elevated systolic blood pressure (>130 mmHg) ${strength} ${direction} ${disease} risk` : `Systolic BP within normal range`,
    diastolicBP: (v) => v > 0.33 ? `Elevated diastolic blood pressure (>80 mmHg) ${strength} ${direction} ${disease} risk` : `Diastolic BP within normal range`,
    spo2: (v) => v < 0.65 ? `Blood oxygen below 95% — ${strength} ${direction} ${disease} risk` : `Normal blood oxygen levels`,
    hemoglobin: (v) => v < 0.54 ? `Low hemoglobin level detected — ${strength} ${direction} ${disease} risk` : `Hemoglobin within reference range`,
    fastingGlucose: (v) => v > 0.21 ? `Elevated fasting glucose (>110 mg/dL) — ${strength} ${direction} ${disease} risk` : `Fasting glucose in normal range`,
    hba1c: (v) => v > 0.25 ? `Elevated HbA1c (>6.5%) — ${strength} ${direction} long-term glucose control concern` : `HbA1c within normal limits`,
    familyDiabetes: (v) => v > 0.5 ? `Family history of diabetes ${strength} ${direction} risk` : `No family history of diabetes`,
    familyHypertension: (v) => v > 0.5 ? `Family history of hypertension ${strength} ${direction} risk` : `No family history of hypertension`,
    familyAnemia: (v) => v > 0.5 ? `Family history of anemia ${strength} ${direction} risk (genetic predisposition)` : `No family history of anemia`,
    familyHeartDisease: (v) => v > 0.5 ? `Family history of heart disease ${strength} ${direction} cardiovascular risk` : `No family history of heart disease`,
    smokingStatus: (v) => v > 0.5 ? `Smoking habit ${strength} ${direction} ${disease} risk` : `Non-smoking status is protective`,
    physicalActivity: (v) => v > 0.6 ? `Active lifestyle ${strength} ${direction} ${disease} risk (protective)` : v < 0.3 ? `Sedentary lifestyle ${strength} ${direction} ${disease} risk` : `Moderate activity level`,
    respiratoryRate: (v) => v > 0.5 ? `Elevated respiratory rate may indicate compensatory breathing` : `Respiratory rate within normal range`,
  };

  const fn = explanations[featureName];
  return fn ? fn(value, disease) : `${FEATURE_DESCRIPTIONS[featureName]} ${strength} ${direction} risk`;
}
