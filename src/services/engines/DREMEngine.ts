/**
 * ArogyaNetra AI - DREM (Dynamic Risk Evolution Modeling) Engine
 * Monte Carlo trajectory simulation with Ornstein-Uhlenbeck process
 * Runs 100% on-device.
 */

import { DREMTrajectory, TrajectoryData, ScanResult } from '../../models/types';

// ─── Constants ─────────────────────────────────────────
const NUM_SIMULATIONS = 100;
const MONTHS_6 = [0, 1, 2, 3, 4, 5, 6];
const MONTHS_12 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function gaussianRandom(mean: number, stddev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + stddev * z;
}

// ─── Ornstein-Uhlenbeck Process ────────────────────────
/**
 * Simulates a mean-reverting stochastic process.
 * Parameters:
 * - x0: starting value (current risk score)
 * - theta: speed of mean reversion (how fast it returns to mean)
 * - mu: long-term mean (demographic-expected risk)
 * - sigma: volatility (randomness)
 * - dt: time step (1 month)
 * - n: number of steps
 */
function ornsteinUhlenbeck(
  x0: number,
  theta: number,
  mu: number,
  sigma: number,
  n: number
): number[] {
  const path = [x0];
  let x = x0;
  const dt = 1; // 1 month timestep

  for (let i = 0; i < n; i++) {
    const drift = theta * (mu - x) * dt;
    const diffusion = sigma * Math.sqrt(dt) * gaussianRandom(0, 1);
    x = clamp(x + drift + diffusion, 0, 1);
    path.push(parseFloat(x.toFixed(3)));
  }

  return path;
}

// ─── Disease-Specific Parameters ────────────────────────
interface DiseaseParams {
  theta: number;  // Mean reversion speed
  muOffset: number; // Drift from current risk (aging effect)
  sigma: number;  // Volatility
}

const DISEASE_PARAMS: Record<string, DiseaseParams> = {
  hypertension: {
    theta: 0.05,     // Slow mean reversion
    muOffset: 0.02,  // Slight upward drift (age-related)
    sigma: 0.03,     // Moderate volatility
  },
  diabetes: {
    theta: 0.04,
    muOffset: 0.015,
    sigma: 0.025,
  },
  anemia: {
    theta: 0.06,     // Faster mean reversion (treatable)
    muOffset: 0.01,
    sigma: 0.035,
  },
};

// ─── Generate Percentile Bands ─────────────────────────
function generateTrajectory(
  currentRisk: number,
  disease: string,
  months: number[]
): TrajectoryData {
  const params = DISEASE_PARAMS[disease] || DISEASE_PARAMS.hypertension;
  const numSteps = months.length - 1;
  const mu = clamp(currentRisk + params.muOffset * numSteps, 0, 1);

  // Run Monte Carlo simulations
  const allPaths: number[][] = [];
  for (let sim = 0; sim < NUM_SIMULATIONS; sim++) {
    const path = ornsteinUhlenbeck(
      currentRisk,
      params.theta,
      mu,
      params.sigma,
      numSteps
    );
    allPaths.push(path);
  }

  // Compute percentiles at each time point
  const median: number[] = [];
  const p25: number[] = [];
  const p75: number[] = [];
  const p5: number[] = [];
  const p95: number[] = [];

  for (let t = 0; t <= numSteps; t++) {
    const values = allPaths.map(path => path[t]).sort((a, b) => a - b);
    const getPercentile = (p: number) => {
      const idx = Math.floor(p * values.length / 100);
      return values[Math.min(idx, values.length - 1)];
    };

    median.push(parseFloat(getPercentile(50).toFixed(3)));
    p25.push(parseFloat(getPercentile(25).toFixed(3)));
    p75.push(parseFloat(getPercentile(75).toFixed(3)));
    p5.push(parseFloat(getPercentile(5).toFixed(3)));
    p95.push(parseFloat(getPercentile(95).toFixed(3)));
  }

  return { months, median, p25, p75, p5, p95 };
}

// ─── Main DREM Function ────────────────────────────────
export function generateDREMTrajectory(
  scan: ScanResult,
  horizon: 6 | 12 = 6
): DREMTrajectory {
  const months = horizon === 6 ? MONTHS_6 : MONTHS_12;

  return {
    scanId: scan.scanId,
    horizonMonths: horizon,
    trajectories: {
      hypertension: generateTrajectory(
        scan.diseases.hypertension.riskScore,
        'hypertension',
        months
      ),
      diabetes: generateTrajectory(
        scan.diseases.diabetes.riskScore,
        'diabetes',
        months
      ),
      anemia: generateTrajectory(
        scan.diseases.anemia.riskScore,
        'anemia',
        months
      ),
    },
  };
}
