/**
 * AarogyaNetra AI — Logistic Regression Inference Engine
 *
 * Lightweight binary classifier for on-device prediction.
 * Computes P(disease) = σ(w·x + b) where σ is the sigmoid function.
 *
 * Why LR in the ensemble:
 * - Fully interpretable (each weight = feature's contribution)
 * - Extremely fast (single dot product)
 * - Provides baseline probabilities for calibration
 * - Feature coefficients directly usable for SHAP-like explanations
 *
 * Memory: ~150 bytes per model (18 floats + 1 bias)
 * Latency: <0.01ms per inference
 */

import { LRWeights, ModelPrediction, NUM_FEATURES } from './types';

/**
 * Sigmoid activation function.
 * Clips input to [-500, 500] to prevent overflow.
 */
function sigmoid(z: number): number {
  const clipped = Math.max(-500, Math.min(500, z));
  return 1.0 / (1.0 + Math.exp(-clipped));
}

/**
 * Run logistic regression inference on a feature vector.
 *
 * @param features  - Normalized feature array (length = NUM_FEATURES)
 * @param weights   - Pre-trained LR weights
 * @returns ModelPrediction with probability and confidence
 */
export function predictLR(
  features: number[],
  weights: LRWeights,
): ModelPrediction {
  if (features.length !== NUM_FEATURES) {
    throw new Error(
      `LR: Expected ${NUM_FEATURES} features, got ${features.length}`
    );
  }

  // Linear combination: z = w·x + b
  let z = weights.bias;
  for (let i = 0; i < NUM_FEATURES; i++) {
    z += weights.weights[i] * features[i];
  }

  // Sigmoid activation
  const probability = sigmoid(z);

  // Confidence is based on how far from the decision boundary (0.5)
  // A prediction very close to 0.5 is uncertain; near 0 or 1 is confident
  const distance = Math.abs(probability - 0.5) * 2; // 0–1
  const confidence = 0.6 + distance * 0.35; // range: 0.6–0.95

  return {
    probability: parseFloat(probability.toFixed(4)),
    confidence: parseFloat(confidence.toFixed(4)),
    modelType: 'logistic_regression',
  };
}

/**
 * Compute per-feature contributions to the LR prediction.
 * This is a simple but effective SHAP-like explanation:
 * contribution_i = w_i * x_i / z  (proportion of the linear term)
 *
 * Positive contribution = pushes toward disease risk
 * Negative contribution = pushes away from disease risk
 */
export function computeLRContributions(
  features: number[],
  weights: LRWeights,
): number[] {
  const contributions: number[] = new Array(NUM_FEATURES);
  
  // Total magnitude for normalization
  let totalMagnitude = Math.abs(weights.bias);
  for (let i = 0; i < NUM_FEATURES; i++) {
    totalMagnitude += Math.abs(weights.weights[i] * features[i]);
  }

  // Avoid division by zero
  if (totalMagnitude === 0) {
    return new Array(NUM_FEATURES).fill(0);
  }

  for (let i = 0; i < NUM_FEATURES; i++) {
    // Signed contribution: positive means increases risk
    contributions[i] = (weights.weights[i] * features[i]) / totalMagnitude;
  }

  return contributions;
}
