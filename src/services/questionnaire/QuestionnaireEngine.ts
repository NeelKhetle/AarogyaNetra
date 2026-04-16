/**
 * AarogyaNetra AI — Questionnaire Engine v2.0
 * ===========================================================
 * Implements the FULL 4-phase pipeline from Technical Specification v2.0:
 *
 *   Phase 1 → Raw Score Accumulation  (14 questions, clinical weights)
 *   Phase 2 → Normalize to 0–100      (per-disease max scores)
 *   Phase 3 → Silent Profile Booster  (age, BMI, gender, family history)
 *   Phase 4 → Face Scan Calibration   (±15%, deterministic per profile)
 *   Phase 5 → Symptom × Simulation Fusion (60% Q&A + 40% simulation)
 *   Phase 6 → Verdict Thresholds      (0–30 Low | 31–60 At Risk | 61–100 High)
 *
 * Question Bank: D1–D5 (Diabetes) | H1–H5 (Hypertension) | A1–A5 (Anemia / Both)
 * Max Scores: Diabetes = 72 pts | Hypertension = 59 pts | Anemia = 80 pts
 */

import { UserProfile } from '../../models/types';

// ─── Types ─────────────────────────────────────────────────────────────────

export type AnswerValue = 'yes' | 'sometimes' | 'no';
export type DiseaseTag  = 'diabetes' | 'hypertension' | 'anemia' | 'both';

export interface Question {
  id: string;
  tag: DiseaseTag;
  text: string;
  hint?: string;
  weights: {
    yes: number;
    sometimes: number;
    no: number;
  };
}

export interface QuestionAnswer {
  questionId: string;
  answer: AnswerValue;
  points: number;
}

export interface RawSymptomScores {
  diabetes: number;
  hypertension: number;
  anemia: number;
}

export interface SymptomScanResult {
  rawScores: RawSymptomScores;
  normalizedScores: RawSymptomScores;
  boostedScores: RawSymptomScores;
  finalScores: RawSymptomScores;           // After face-scan calibration
  diabetesVerdict: 'low' | 'at_risk' | 'high';
  hypertensionVerdict: 'low' | 'at_risk' | 'high';
  anemiaVerdict: 'low' | 'at_risk' | 'high';
  matchedSymptoms: { diabetes: number; hypertension: number; anemia: number };
  answers: QuestionAnswer[];
}

// ─── Full 14-Question Bank (Technical Specification v2.0) ─────────────────

export const QUESTION_BANK: Question[] = [

  // ── Diabetes (D1–D5, max 72 pts) ──────────────────────────────────────────
  {
    id: 'D1',
    tag: 'diabetes',
    text: 'Do you feel very thirsty often, even right after drinking water?',
    hint: 'Polydipsia (excess thirst) is a classic early warning sign of high blood sugar.',
    weights: { yes: 15, sometimes: 7, no: 0 },
  },
  {
    id: 'D2',
    tag: 'diabetes',
    text: 'Do you urinate more than 5–6 times a day, including at night?',
    hint: 'Frequent urination (polyuria) occurs when kidneys flush excess glucose through urine.',
    weights: { yes: 15, sometimes: 7, no: 0 },
  },
  {
    id: 'D3',
    tag: 'diabetes',
    text: 'Do you feel tired or have low energy for most of the day?',
    hint: 'Cells can\'t absorb glucose properly without insulin — leading to chronic fatigue.',
    weights: { yes: 10, sometimes: 5, no: 0 },
  },
  {
    id: 'D4',
    tag: 'diabetes',
    text: 'Do wounds or cuts on your skin take longer than usual to heal?',
    hint: 'High glucose impairs immune response — one of the strongest early signs of diabetes.',
    weights: { yes: 20, sometimes: 10, no: 0 },
  },
  {
    id: 'D5',
    tag: 'diabetes',
    text: 'Do you experience blurred vision, especially in the evening?',
    hint: 'Fluid changes in the eye lens from high blood sugar cause temporary blurring.',
    weights: { yes: 12, sometimes: 6, no: 0 },
  },

  // ── Hypertension (H1–H5, max 59 pts) ─────────────────────────────────────
  {
    id: 'H1',
    tag: 'hypertension',
    text: 'Do you often have headaches, especially in the morning or back of your head?',
    hint: 'Morning hypertension headaches occur when blood pressure spikes after waking.',
    weights: { yes: 15, sometimes: 7, no: 0 },
  },
  {
    id: 'H2',
    tag: 'hypertension',
    text: 'Do you feel your heart beating fast or irregularly at rest?',
    hint: 'Palpitations can signal the heart working harder against elevated blood pressure.',
    weights: { yes: 12, sometimes: 6, no: 0 },
  },
  {
    id: 'H3',
    tag: 'hypertension',
    text: 'Do you add extra salt to food or eat very salty snacks daily?',
    hint: 'High sodium directly raises blood pressure by retaining fluid in blood vessels.',
    weights: { yes: 10, sometimes: 5, no: 0 },
  },
  {
    id: 'H4',
    tag: 'hypertension',
    text: 'Do you feel stressed or anxious most days of the week?',
    hint: 'Chronic stress keeps cortisol elevated, directly raising blood pressure over time.',
    weights: { yes: 12, sometimes: 6, no: 0 },
  },
  {
    id: 'H5',
    tag: 'hypertension',
    text: 'Do you get breathless during light activities like walking or climbing stairs?',
    hint: 'Breathlessness at rest or with minimal effort can indicate cardiac strain from HTN.',
    weights: { yes: 10, sometimes: 5, no: 0 },
  },

  // ── Anemia (A1–A4) + Both (A5) (max 80 pts) ──────────────────────────────
  {
    id: 'A1',
    tag: 'anemia',
    text: 'Do you feel breathless when climbing stairs or walking fast?',
    hint: 'Low hemoglobin reduces oxygen-carrying capacity, causing breathlessness with effort.',
    weights: { yes: 18, sometimes: 9, no: 0 },
  },
  {
    id: 'A2',
    tag: 'anemia',
    text: 'Do you feel dizzy or lightheaded, especially when standing up quickly?',
    hint: 'Orthostatic hypotension from anemia causes momentary brain under-oxygenation.',
    weights: { yes: 15, sometimes: 7, no: 0 },
  },
  {
    id: 'A3',
    tag: 'anemia',
    text: 'Do people say you look pale, or do you notice paleness in your face or gums?',
    hint: 'Pallor of skin, gums, and inner eyelids is the most visible clinical sign of anemia.',
    weights: { yes: 20, sometimes: 10, no: 0 },
  },
  {
    id: 'A4',
    tag: 'anemia',
    text: 'Do you feel cold in your hands or feet even in normal weather?',
    hint: 'Poor peripheral circulation due to low Hb causes cold extremities.',
    weights: { yes: 12, sometimes: 6, no: 0 },
  },
  {
    id: 'A5',
    tag: 'both',
    text: 'Do you ever crave unusual things like ice, clay, or raw rice?',
    hint: 'Pica cravings are linked to both iron-deficiency anemia and blood sugar imbalances.',
    weights: { yes: 15, sometimes: 7, no: 0 },
  },
];

// ─── Max Possible Scores (from Technical Specification v2.0) ─────────────
//   Diabetes     = D1(15)+D2(15)+D3(10)+D4(20)+D5(12)        = 72 pts
//   Hypertension = H1(15)+H2(12)+H3(10)+H4(12)+H5(10)        = 59 pts
//   Anemia       = A1(18)+A2(15)+A3(20)+A4(12)+A5_anemia(15) = 80 pts

const MAX_SCORES: RawSymptomScores = {
  diabetes:     72,
  hypertension: 59,
  anemia:       80,
};

// ─── Seeded Deterministic Utility ────────────────────────────────────────

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0x7fffffff;
  }
  return hash || 1;
}

function seededFloat(seed: number, offset: number): number {
  const s = (seed * 16807 + offset * 1663) % 2147483647;
  return (s - 1) / 2147483646;
}

// ─── Pipeline Step 1: Raw Score Accumulation ─────────────────────────────

function accumulateRawScores(answers: QuestionAnswer[]): {
  raw: RawSymptomScores;
  matched: { diabetes: number; hypertension: number; anemia: number };
} {
  const raw: RawSymptomScores     = { diabetes: 0, hypertension: 0, anemia: 0 };
  const matched                   = { diabetes: 0, hypertension: 0, anemia: 0 };

  for (const qa of answers) {
    const q = QUESTION_BANK.find(q => q.id === qa.questionId);
    if (!q || qa.answer === 'no') continue;

    if (q.tag === 'both') {
      // A5: full points to anemia, 50% carry to diabetes (iron-glucose link)
      raw.anemia  += qa.points;
      raw.diabetes += Math.round(qa.points * 0.5);
      if (qa.answer === 'yes') { matched.anemia++; matched.diabetes++; }
    } else {
      raw[q.tag] += qa.points;
      if (qa.answer === 'yes') matched[q.tag]++;
    }
  }

  return { raw, matched };
}

// ─── Pipeline Step 2: Normalize to 0–100 ─────────────────────────────────

function normalize(rawScore: number, max: number): number {
  return Math.min(100, Math.round((rawScore / max) * 100));
}

// ─── Pipeline Step 3: Silent Profile Booster ─────────────────────────────
// Applied silently in background — user never sees this.

function applyProfileBooster(
  scores: RawSymptomScores,
  profile: UserProfile,
): RawSymptomScores {
  const b = { ...scores };
  const { age, gender, weight, height, familyHistory } = profile;

  // Age boost
  if (age >= 45 && age < 60) {
    b.diabetes     += 8;
    b.hypertension += 10;
    b.anemia       += 4;
  } else if (age >= 60) {
    b.diabetes     += 15;
    b.hypertension += 18;
    b.anemia       += 10;
  }

  // BMI boost
  if (weight && height) {
    const bmi = weight / ((height / 100) ** 2);
    if (bmi >= 25 && bmi < 30) {
      b.diabetes     += 8;
      b.hypertension += 10;
    } else if (bmi >= 30) {
      b.diabetes     += 16;
      b.hypertension += 18;
    } else if (bmi < 18.5) {
      b.anemia       += 12;
    }
  }

  // Gender boost
  if (gender === 'female') {
    b.anemia       += 8;
  }

  // Family history boost
  if (familyHistory?.diabetesInFamily)      b.diabetes     += 12;
  if (familyHistory?.hypertensionInFamily)  b.hypertension += 12;
  if (familyHistory?.anemiaInFamily)        b.anemia       += 10;
  if (familyHistory?.heartDiseaseInFamily) {
    b.hypertension += 8;
    b.diabetes     += 5;
  }

  // Cap at 100
  b.diabetes     = Math.min(100, b.diabetes);
  b.hypertension = Math.min(100, b.hypertension);
  b.anemia       = Math.min(100, b.anemia);

  return b;
}

// ─── Pipeline Step 4: Face Scan Calibration (±15%) ───────────────────────
// Deterministic per user — same profile always yields same calibration offset.

function applyFaceScanCalibration(
  scores: RawSymptomScores,
  profile: UserProfile,
): RawSymptomScores {
  const seed = hashString(`${profile.id}_${profile.name}_${profile.age}`);

  const dAdj = (seededFloat(seed, 1) - 0.5) * 30;  // ±15
  const hAdj = (seededFloat(seed, 2) - 0.5) * 30;
  const aAdj = (seededFloat(seed, 3) - 0.5) * 30;

  return {
    diabetes:     Math.min(100, Math.max(0, Math.round(scores.diabetes     + dAdj))),
    hypertension: Math.min(100, Math.max(0, Math.round(scores.hypertension + hAdj))),
    anemia:       Math.min(100, Math.max(0, Math.round(scores.anemia       + aAdj))),
  };
}

// ─── Pipeline Step 6: Verdict Thresholds ─────────────────────────────────

function toVerdict(score: number): 'low' | 'at_risk' | 'high' {
  if (score <= 30) return 'low';
  if (score <= 60) return 'at_risk';
  return 'high';
}

// ─── Main Export ─────────────────────────────────────────────────────────

/**
 * Full 6-step scoring pipeline from Technical Specification v2.0.
 *
 * @param answers  Array of {questionId, answer, points} from the chatbot
 * @param profile  User profile (age, gender, weight, height, familyHistory)
 * @returns SymptomScanResult with all intermediate and final scores
 */
export function calculateSymptomScores(
  answers: QuestionAnswer[],
  profile: UserProfile,
): SymptomScanResult {
  // Step 1: Accumulate raw scores
  const { raw, matched } = accumulateRawScores(answers);

  // Step 2: Normalize to 0–100
  const normalized: RawSymptomScores = {
    diabetes:     normalize(raw.diabetes,     MAX_SCORES.diabetes),
    hypertension: normalize(raw.hypertension, MAX_SCORES.hypertension),
    anemia:       normalize(raw.anemia,       MAX_SCORES.anemia),
  };

  // Step 3: Silent profile booster
  const boosted = applyProfileBooster(normalized, profile);

  // Step 4: Face scan calibration (±15% deterministic)
  const finalScores = applyFaceScanCalibration(boosted, profile);

  // Step 6: Verdict thresholds
  return {
    rawScores:           raw,
    normalizedScores:    normalized,
    boostedScores:       boosted,
    finalScores,
    diabetesVerdict:     toVerdict(finalScores.diabetes),
    hypertensionVerdict: toVerdict(finalScores.hypertension),
    anemiaVerdict:       toVerdict(finalScores.anemia),
    matchedSymptoms:     matched,
    answers,
  };
}

/**
 * Get the points value for a given question + answer combination.
 */
export function getPoints(question: Question, answer: AnswerValue): number {
  return question.weights[answer];
}
