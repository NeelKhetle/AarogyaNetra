/**
 * AarogyaNetra AI — Random Forest Inference Engine
 *
 * On-device Random Forest classifier using pre-trained decision trees.
 * Each tree is stored as a flat array of TreeNode objects for cache-friendly traversal.
 *
 * Why RF in the ensemble:
 * - Captures non-linear feature interactions (e.g., age + BMI compound risk)
 * - Robust to noisy/missing features (each tree uses different feature subsets)
 * - Provides feature importance via mean decrease in Gini impurity
 * - Prediction = average of all tree predictions (probability)
 *
 * Memory: ~3-4 KB per disease (12 trees × ~20 nodes × 5 fields)
 * Latency: <0.1ms per inference
 */

import { TreeNode, RFWeights, ModelPrediction, NUM_FEATURES } from './types';

/**
 * Traverse a single decision tree to get a leaf prediction.
 *
 * @param tree     - Flat array of TreeNode (index 0 = root)
 * @param features - Normalized feature array
 * @returns Leaf node prediction value (probability)
 */
function traverseTree(tree: TreeNode[], features: number[]): number {
  let nodeIndex = 0;

  while (nodeIndex < tree.length) {
    const node = tree[nodeIndex];

    // Leaf node — return prediction
    if (node.featureIndex === -1) {
      return node.value;
    }

    // Internal node — branch on feature threshold
    const featureValue = features[node.featureIndex] ?? 0.5; // fallback for safety
    if (featureValue < node.threshold) {
      nodeIndex = node.left;
    } else {
      nodeIndex = node.right;
    }

    // Safety: prevent infinite loops from malformed trees
    if (nodeIndex <= 0 && node.featureIndex !== -1) {
      return 0.5; // uncertain prediction
    }
  }

  return 0.5; // fallback
}

/**
 * Run Random Forest inference: average prediction across all trees.
 *
 * @param features - Normalized feature array (length = NUM_FEATURES)
 * @param weights  - Pre-trained RF model (trees + feature importance)
 * @returns ModelPrediction with probability and confidence
 */
export function predictRF(
  features: number[],
  weights: RFWeights,
): ModelPrediction {
  if (features.length !== NUM_FEATURES) {
    throw new Error(
      `RF: Expected ${NUM_FEATURES} features, got ${features.length}`
    );
  }

  // Collect predictions from all trees
  const predictions: number[] = [];
  for (let t = 0; t < weights.numTrees; t++) {
    const treePred = traverseTree(weights.trees[t], features);
    predictions.push(treePred);
  }

  // Average prediction (bagging)
  const probability = predictions.reduce((sum, p) => sum + p, 0) / weights.numTrees;

  // Confidence from prediction variance (low variance = high agreement = high confidence)
  const mean = probability;
  const variance = predictions.reduce((sum, p) => sum + (p - mean) ** 2, 0) / weights.numTrees;
  const stddev = Math.sqrt(variance);
  // Lower stddev → higher confidence. Stddev of 0.5 (max for binary) → lowest confidence
  const confidence = Math.max(0.55, Math.min(0.95, 1.0 - stddev * 1.5));

  return {
    probability: parseFloat(Math.max(0, Math.min(1, probability)).toFixed(4)),
    confidence: parseFloat(confidence.toFixed(4)),
    modelType: 'random_forest',
  };
}

/**
 * Get feature importance from the RF model.
 * Pre-computed during training as mean decrease in Gini impurity.
 */
export function getRFFeatureImportance(weights: RFWeights): number[] {
  return weights.featureImportance;
}
