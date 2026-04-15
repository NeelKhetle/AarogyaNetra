/**
 * AarogyaNetra AI — ML Model Type Definitions
 * Shared types for all on-device ML inference engines.
 *
 * Architecture: 3-model ensemble per disease
 *   - Logistic Regression (interpretable baseline)
 *   - Random Forest (non-linear feature interactions)
 *   - Gradient Boosted Trees (sequential error correction)
 *
 * All models run in pure TypeScript — zero native modules, zero network.
 */

// ─── Feature Vector ────────────────────────────────────
/**
 * Normalized (0–1) feature vector used by all models.
 * 18 features derived from profile, vitals, labs, and family history.
 * Missing features are imputed with population medians.
 */
export interface NormalizedFeatures {
  age: number;                  // (value - 18) / 72   → 18yo=0, 90yo=1
  gender: number;               // male=0, female=1, other=0.5
  bmi: number;                  // (value - 15) / 30   → 15=0, 45=1
  heartRate: number;            // (value - 50) / 70   → 50bpm=0, 120bpm=1
  hrv: number;                  // (value - 10) / 60   → 10ms=0, 70ms=1
  systolicBP: number;           // (value - 90) / 110  → 90mmHg=0, 200mmHg=1
  diastolicBP: number;          // (value - 55) / 75   → 55mmHg=0, 130mmHg=1
  spo2: number;                 // (value - 85) / 15   → 85%=0, 100%=1
  respiratoryRate: number;      // (value - 10) / 20   → 10=0, 30=1
  hemoglobin: number;           // (value - 5) / 13    → 5g/dL=0, 18g/dL=1
  fastingGlucose: number;       // (value - 60) / 240  → 60mg/dL=0, 300mg/dL=1
  hba1c: number;                // (value - 4) / 10    → 4%=0, 14%=1
  familyDiabetes: number;       // 0 or 1
  familyHypertension: number;   // 0 or 1
  familyAnemia: number;         // 0 or 1
  familyHeartDisease: number;   // 0 or 1
  smokingStatus: number;        // 0=never, 0.5=former, 1=current
  physicalActivity: number;     // 0=sedentary, 0.5=moderate, 1=active (inverted: active = lower risk)
}

/** Feature names as a tuple for ordered access */
export const FEATURE_NAMES: (keyof NormalizedFeatures)[] = [
  'age', 'gender', 'bmi', 'heartRate', 'hrv', 'systolicBP', 'diastolicBP',
  'spo2', 'respiratoryRate', 'hemoglobin', 'fastingGlucose', 'hba1c',
  'familyDiabetes', 'familyHypertension', 'familyAnemia', 'familyHeartDisease',
  'smokingStatus', 'physicalActivity',
];

export const NUM_FEATURES = 18;

// ─── Logistic Regression ───────────────────────────────
export interface LRWeights {
  weights: number[];  // length = NUM_FEATURES
  bias: number;
}

// ─── Decision Tree Node ─────────────────────────────────
/**
 * Compact binary tree node for Random Forest / GBT.
 *
 * Internal node: featureIndex ≥ 0, has left/right children
 * Leaf node: featureIndex = -1, value = prediction
 *
 * Storage: flat array of nodes with index-based children.
 * Tree[0] = root. Tree[node.left] = left child. Tree[node.right] = right child.
 */
export interface TreeNode {
  featureIndex: number;   // -1 for leaf
  threshold: number;      // split threshold (normalized 0–1 scale)
  left: number;           // index of left child (feature < threshold)
  right: number;          // index of right child (feature ≥ threshold)
  value: number;          // leaf prediction (probability for RF, raw score for GBT)
}

// ─── Random Forest ──────────────────────────────────────
export interface RFWeights {
  trees: TreeNode[][];         // array of trees, each tree = array of nodes
  numTrees: number;
  featureImportance: number[]; // per-feature importance (mean decrease in Gini)
}

// ─── Gradient Boosted Trees ─────────────────────────────
export interface GBTWeights {
  trees: TreeNode[][];
  numTrees: number;
  learningRate: number;        // shrinkage factor applied to each tree
  basePrediction: number;      // intercept (log-odds)
}

// ─── Disease Model Weights ──────────────────────────────
export interface DiseaseModelWeights {
  disease: 'diabetes' | 'hypertension' | 'anemia';
  version: string;
  trainedOn: string;           // description of training data
  logisticRegression: LRWeights;
  randomForest: RFWeights;
  gradientBoostedTrees: GBTWeights;
}

// ─── Ensemble Config ────────────────────────────────────
export interface EnsembleConfig {
  /** Base weights for model combination (sum to 1.0) */
  lrWeight: number;
  rfWeight: number;
  gbtWeight: number;
  /** Adaptive weight factor: increase ML weight when more data available */
  adaptiveWeighting: boolean;
}

export const DEFAULT_ENSEMBLE_CONFIG: EnsembleConfig = {
  lrWeight: 0.25,   // LR: interpretable anchor
  rfWeight: 0.35,   // RF: handles non-linearities
  gbtWeight: 0.40,  // GBT: highest accuracy
  adaptiveWeighting: true,
};

// ─── Prediction Result ──────────────────────────────────
export interface ModelPrediction {
  probability: number;         // 0–1 risk probability
  confidence: number;          // 0–1 confidence in prediction
  modelType: 'logistic_regression' | 'random_forest' | 'gradient_boosted_trees';
}

export interface EnsemblePrediction {
  riskProbability: number;     // final fused 0–1 risk
  confidence: number;          // data-completeness-weighted confidence
  individualPredictions: {
    logisticRegression: ModelPrediction;
    randomForest: ModelPrediction;
    gradientBoostedTrees: ModelPrediction;
  };
  featureImportance: FeatureContribution[];
  missingFeatureCount: number;
  totalFeatureCount: number;
}

export interface FeatureContribution {
  featureName: string;
  normalizedValue: number;     // the feature value used
  contribution: number;        // SHAP-like contribution to prediction
  description: string;         // human-readable explanation
  isMissing: boolean;          // was this feature imputed?
}

// ─── Feature Availability Mask ──────────────────────────
/**
 * Tracks which features have real data vs imputed defaults.
 * Used for confidence scoring: confidence = 1 - (missing / total)
 */
export interface FeatureMask {
  available: boolean[];       // length = NUM_FEATURES, true = real data
  availableCount: number;
  missingCount: number;
}
