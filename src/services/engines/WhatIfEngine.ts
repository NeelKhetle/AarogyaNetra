/**
 * ArogyaNetra AI - What-If Simulation Engine
 * Lifestyle parameter perturbation with clinically-calibrated response curves
 * Runs 100% on-device.
 */

import { LifestyleParams, DEFAULT_LIFESTYLE, ScanResult, DREMTrajectory } from '../../models/types';
import { generateDREMTrajectory } from './DREMEngine';

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ─── Response Curves ────────────────────────────────────
/**
 * Each lifestyle parameter has a clinically-calibrated effect on disease risk.
 * Returns a multiplier: <1 means risk reduction, >1 means risk increase
 */
interface RiskModifiers {
  hypertension: number;
  diabetes: number;
  anemia: number;
}

function computeExerciseEffect(mins: number): RiskModifiers {
  // WHO recommends 150 min/week (~21 min/day)
  const normalizedDeviation = (mins - DEFAULT_LIFESTYLE.exerciseMins) / 60;
  return {
    hypertension: 1 - normalizedDeviation * 0.15,
    diabetes: 1 - normalizedDeviation * 0.2,
    anemia: 1 - normalizedDeviation * 0.05,
  };
}

function computeSugarEffect(grams: number): RiskModifiers {
  const normalizedDeviation = (grams - DEFAULT_LIFESTYLE.sugarGrams) / 100;
  return {
    hypertension: 1 + normalizedDeviation * 0.08,
    diabetes: 1 + normalizedDeviation * 0.25,
    anemia: 1 + normalizedDeviation * 0.02,
  };
}

function computeSodiumEffect(grams: number): RiskModifiers {
  const normalizedDeviation = (grams - DEFAULT_LIFESTYLE.sodiumGrams) / 5;
  return {
    hypertension: 1 + normalizedDeviation * 0.3,
    diabetes: 1 + normalizedDeviation * 0.05,
    anemia: 1,
  };
}

function computeIronEffect(servings: number): RiskModifiers {
  const normalizedDeviation = (servings - DEFAULT_LIFESTYLE.ironServings) / 7;
  return {
    hypertension: 1,
    diabetes: 1,
    anemia: 1 - normalizedDeviation * 0.35,
  };
}

function computeMedicationEffect(adherence: number): RiskModifiers {
  const normalizedDeviation = (adherence - DEFAULT_LIFESTYLE.medicationAdherence) / 100;
  return {
    hypertension: 1 - normalizedDeviation * 0.25,
    diabetes: 1 - normalizedDeviation * 0.2,
    anemia: 1 - normalizedDeviation * 0.15,
  };
}

function computeSleepEffect(hours: number): RiskModifiers {
  // Optimal sleep is 7-9 hours; both too little and too much increase risk
  const deviation = Math.abs(hours - 7.5);
  const penalty = deviation > 1.5 ? (deviation - 1.5) * 0.1 : 0;
  const benefit = hours >= 6 && hours <= 9 ? (hours - DEFAULT_LIFESTYLE.sleepHours) / 5 : 0;
  return {
    hypertension: 1 + penalty - benefit * 0.1,
    diabetes: 1 + penalty - benefit * 0.12,
    anemia: 1 + penalty * 0.5,
  };
}

function computeStressEffect(level: number): RiskModifiers {
  const normalizedDeviation = (level - DEFAULT_LIFESTYLE.stressLevel) / 10;
  return {
    hypertension: 1 + normalizedDeviation * 0.2,
    diabetes: 1 + normalizedDeviation * 0.15,
    anemia: 1 + normalizedDeviation * 0.05,
  };
}

// ─── Main What-If Function ──────────────────────────────
export interface WhatIfResult {
  modifiedRisks: {
    hypertension: number;
    diabetes: number;
    anemia: number;
  };
  deltas: {
    hypertension: number;
    diabetes: number;
    anemia: number;
  };
  modifiedTrajectory: DREMTrajectory;
}

export function runWhatIfSimulation(
  scan: ScanResult,
  params: LifestyleParams
): WhatIfResult {
  // Compute combined risk modifiers from all lifestyle parameters
  const effects = [
    computeExerciseEffect(params.exerciseMins),
    computeSugarEffect(params.sugarGrams),
    computeSodiumEffect(params.sodiumGrams),
    computeIronEffect(params.ironServings),
    computeMedicationEffect(params.medicationAdherence),
    computeSleepEffect(params.sleepHours),
    computeStressEffect(params.stressLevel),
  ];

  // Multiply all modifiers together for each disease
  let hypMod = 1, diabMod = 1, anemMod = 1;
  for (const effect of effects) {
    hypMod *= effect.hypertension;
    diabMod *= effect.diabetes;
    anemMod *= effect.anemia;
  }

  // Apply modifiers to current risk scores
  const modifiedRisks = {
    hypertension: parseFloat(clamp(
      scan.diseases.hypertension.riskScore * hypMod, 0, 1
    ).toFixed(3)),
    diabetes: parseFloat(clamp(
      scan.diseases.diabetes.riskScore * diabMod, 0, 1
    ).toFixed(3)),
    anemia: parseFloat(clamp(
      scan.diseases.anemia.riskScore * anemMod, 0, 1
    ).toFixed(3)),
  };

  // Compute deltas
  const deltas = {
    hypertension: parseFloat((modifiedRisks.hypertension - scan.diseases.hypertension.riskScore).toFixed(3)),
    diabetes: parseFloat((modifiedRisks.diabetes - scan.diseases.diabetes.riskScore).toFixed(3)),
    anemia: parseFloat((modifiedRisks.anemia - scan.diseases.anemia.riskScore).toFixed(3)),
  };

  // Generate modified DREM trajectory with new baseline
  const modifiedScan = {
    ...scan,
    diseases: {
      ...scan.diseases,
      hypertension: { ...scan.diseases.hypertension, riskScore: modifiedRisks.hypertension },
      diabetes: { ...scan.diseases.diabetes, riskScore: modifiedRisks.diabetes },
      anemia: { ...scan.diseases.anemia, riskScore: modifiedRisks.anemia },
    },
  };

  const modifiedTrajectory = generateDREMTrajectory(modifiedScan, 6);

  return {
    modifiedRisks,
    deltas,
    modifiedTrajectory,
  };
}
