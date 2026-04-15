/**
 * AarogyaNetra AI — Gradient Boosted Trees Inference Engine
 *
 * On-device GBT (XGBoost-style) classifier.
 * Prediction = σ(basePrediction + lr * Σ tree_i(x))
 *
 * Why GBT in the ensemble:
 * - Highest accuracy among the 3 models (sequential error correction)
 * - Handles feature interactions and non-linearities
 * - Each tree corrects residual errors from previous trees
 * - Additive model: each tree's contribution is interpretable
 *
 * Key difference from RF:
 * - RF: trees trained independently, predictions averaged (bagging)
 * - GBT: trees trained sequentially, predictions summed (boosting)
 *
 * Memory: ~2-3 KB per disease (10 boosted trees × ~15 nodes each)
 * Latency: <0.1ms per inference
 */

import { TreeNode, GBTWeights, ModelPrediction, NUM_FEATURES } from './types';

/**
 * Sigmoid function for converting log-odds to probability.
 */
function sigmoid(z: number): number {
  const clipped = Math.max(-500, Math.min(500, z));
  return 1.0 / (1.0 + Math.exp(-clipped));
}

/**
 * Traverse a single boosted tree to get the leaf value (raw score, not probability).
 */
function traverseTree(tree: TreeNode[], features: number[]): number {
  let nodeIndex = 0;

  while (nodeIndex < tree.length) {
    const node = tree[nodeIndex];

    // Leaf node — return raw score
    if (node.featureIndex === -1) {
      return node.value;
    }

    // Branch on feature
    const featureValue = features[node.featureIndex] ?? 0.5;
    if (featureValue < node.threshold) {
      nodeIndex = node.left;
    } else {
      nodeIndex = node.right;
    }

    if (nodeIndex <= 0 && node.featureIndex !== -1) {
      return 0;
    }
  }

  return 0;
}

/**
 * Run GBT inference: sum of boosted tree outputs through sigmoid.
 *
 * Formula: P(disease) = sigmoid(base + lr * sum(tree_i(x)))
 *
 * @param features - Normalized feature array (length = NUM_FEATURES)
 * @param weights  - Pre-trained GBT model
 * @returns ModelPrediction with probability and confidence
 */
export function predictGBT(
  features: number[],
  weights: GBTWeights,
): ModelPrediction {
  if (features.length !== NUM_FEATURES) {
    throw new Error(
      `GBT: Expected ${NUM_FEATURES} features, got ${features.length}`
    );
  }

  // Sum contributions from all boosted trees
  let rawScore = weights.basePrediction;
  const treeContributions: number[] = [];

  for (let t = 0; t < weights.numTrees; t++) {
    const treeScore = traverseTree(weights.trees[t], features);
    const contribution = weights.learningRate * treeScore;
    treeContributions.push(contribution);
    rawScore += contribution;
  }

  // Convert log-odds to probability via sigmoid
  const probability = sigmoid(rawScore);

  // Confidence from consistency of tree contributions
  // If trees agree (similar sign), confidence is high
  const sumAbs = treeContributions.reduce((s, c) => s + Math.abs(c), 0);
  const netEffect = Math.abs(treeContributions.reduce((s, c) => s + c, 0));
  const consistency = sumAbs > 0 ? netEffect / sumAbs : 0.5;
  const confidence = 0.60 + consistency * 0.35; // range: 0.60–0.95

  return {
    probability: parseFloat(Math.max(0, Math.min(1, probability)).toFixed(4)),
    confidence: parseFloat(confidence.toFixed(4)),
    modelType: 'gradient_boosted_trees',
  };
}

/**
 * Get per-tree contributions for explainability.
 * Useful for understanding how each boosting round contributed.
 */
export function getGBTTreeContributions(
  features: number[],
  weights: GBTWeights,
): number[] {
  const contributions: number[] = [];
  for (let t = 0; t < weights.numTrees; t++) {
    const treeScore = traverseTree(weights.trees[t], features);
    contributions.push(weights.learningRate * treeScore);
  }
  return contributions;
}
