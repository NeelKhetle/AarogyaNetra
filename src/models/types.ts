/**
 * ArogyaNetra AI - Data Models
 * TypeScript types for all medical data structures
 */

// ─── Camera Modes ────────────────────────────────────
export type CameraMode = 'normal';

export interface CameraModeInfo {
  mode: CameraMode;
  label: string;
  icon: string;
  description: string;
  color: string;
}

export const CAMERA_MODES: CameraModeInfo[] = [
  {
    mode: 'normal',
    label: 'Normal',
    icon: '📷',
    description: 'Standard rPPG face scan with eye analysis',
    color: '#6C63FF',
  },
];

// ─── Thermal Scan Data ───────────────────────────────
export interface TemperatureZone {
  name: string;
  temperature: number;  // Always positive (°C)
  bloodFlowIndex: number; // 0–1 (0 = low flow, 1 = high flow)
  color: string;
}

export interface ThermalScanData {
  zones: TemperatureZone[];
  averageSkinTemp: number;     // Always positive °C
  coreBodyTempEstimate: number; // Always positive °C
  bloodFlowScore: number;       // 0–100
  peripheralCirculation: 'good' | 'moderate' | 'poor';
  coldExtremityIndex: number;   // 0–1, higher = warmer (positive scale)
  capturedAt: string;
}

// ─── User Profile ────────────────────────────────────
export interface UserProfile {
  id: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  weight?: number;       // kg
  height?: number;       // cm
  bmi?: number;          // calculated
  abhaId?: string;
  abhaVerified?: boolean;
  createdAt: string;
  familyHistory?: FamilyHealthHistory;
}

// ─── Family Health History ───────────────────────────
export interface FamilyHealthHistory {
  diabetesInFamily: boolean;
  hypertensionInFamily: boolean;
  anemiaInFamily: boolean;
  heartDiseaseInFamily: boolean;
  kidneyDiseaseInFamily: boolean;
  otherConditions: string;
}

export const DEFAULT_FAMILY_HISTORY: FamilyHealthHistory = {
  diabetesInFamily: false,
  hypertensionInFamily: false,
  anemiaInFamily: false,
  heartDiseaseInFamily: false,
  kidneyDiseaseInFamily: false,
  otherConditions: '',
};

// ─── Lab Report Entry ────────────────────────────────
export interface LabReportEntry {
  id: string;
  dateAdded: string;
  reportDate: string;
  reportType: 'blood_test' | 'sugar_test' | 'bp_reading' | 'cbc' | 'thyroid' | 'lipid_profile' | 'other';
  doctorName?: string;
  hospitalName?: string;
  values: LabReportValues;
  notes?: string;
}

export interface LabReportValues {
  // Blood sugar
  fastingGlucose?: number;      // mg/dL
  postprandialGlucose?: number; // mg/dL
  hba1c?: number;               // %

  // Blood pressure
  systolic?: number;            // mmHg
  diastolic?: number;           // mmHg

  // CBC (Complete Blood Count)
  hemoglobin?: number;          // g/dL
  rbc?: number;                 // million/mcL
  wbc?: number;                 // /mcL
  platelets?: number;           // /mcL
  mcv?: number;                 // fL
  mch?: number;                 // pg

  // Lipid Profile
  totalCholesterol?: number;    // mg/dL
  hdl?: number;                 // mg/dL
  ldl?: number;                 // mg/dL
  triglycerides?: number;       // mg/dL

  // Thyroid
  tsh?: number;                 // mIU/L
  t3?: number;                  // ng/dL
  t4?: number;                  // mcg/dL

  // Kidney
  creatinine?: number;          // mg/dL
  bun?: number;                 // mg/dL

  // Other
  heartRate?: number;           // BPM
  spo2?: number;                // %
  weight?: number;              // kg
}

// ─── Vital Signs ─────────────────────────────────────
export interface VitalSigns {
  heartRate: number;
  respiratoryRate: number;
  spo2Proxy: number;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
}

// ─── Disease Risk ────────────────────────────────────
export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';

export interface HypertensionResult {
  riskLevel: RiskLevel;
  riskScore: number;
  confidence: number;
  systolicEstimate: number;
  diastolicEstimate: number;
  heartRate: number;
  hrvIndex: number;
  category: string;
}

export interface DiabetesResult {
  riskLevel: RiskLevel;
  riskScore: number;
  confidence: number;
  hba1cProxy: number;
  fastingGlucoseProxy: number;
  hrvDepressionIndex: number;
  category: string;
}

export interface AnemiaResult {
  riskLevel: RiskLevel;
  riskScore: number;
  confidence: number;
  hemoglobinEstimate: number;
  pallorIndex: number;
  conjunctivalColorScore: number;
  category: string;
}

export interface DiseaseResults {
  hypertension: HypertensionResult;
  diabetes: DiabetesResult;
  anemia: AnemiaResult;
}

// ─── ARE Explanation ─────────────────────────────────
export interface AREExplanation {
  summary: string;
  details: string[];
  confidenceScore: number;
  counterfactual: string;
  featureImportance: Array<{
    feature: string;
    contribution: number;
    description: string;
  }>;
}

// ─── Diet Recommendation ─────────────────────────────
export interface DietRecommendation {
  category: string;
  icon: string;
  title: string;
  description: string;
  foods: string[];
  avoid: string[];
  mealPlan?: {
    breakfast: string;
    lunch: string;
    dinner: string;
    snacks: string;
  };
}

export interface DietPlan {
  scanId: string;
  generatedAt: string;
  overallAdvice: string;
  recommendations: DietRecommendation[];
  dailyCalories: number;
  waterIntake: string;
  exerciseAdvice: string;
}

// ─── Scan Result ─────────────────────────────────────
export interface ScanResult {
  scanId: string;
  timestamp: string;
  userId: string;
  overallHealthScore: number;
  diseases: DiseaseResults;
  vitals: VitalSigns;
  areExplanation: AREExplanation;
  dietPlan?: DietPlan;
  synced: boolean;
  usedLabData: boolean;       // Whether lab data influenced this scan
  cameraMode?: CameraMode;    // Which camera mode was used
  thermalData?: ThermalScanData; // Thermal scan data if thermal mode
}

// ─── DREM Trajectory ─────────────────────────────────
export interface TrajectoryData {
  months: number[];
  median: number[];
  p25: number[];
  p75: number[];
  p5: number[];
  p95: number[];
}

export interface DREMTrajectory {
  scanId: string;
  horizonMonths: 6 | 12;
  trajectories: {
    hypertension: TrajectoryData;
    diabetes: TrajectoryData;
    anemia: TrajectoryData;
  };
}

// ─── What-If Parameters ──────────────────────────────
export interface LifestyleParams {
  exerciseMins: number;
  sugarGrams: number;
  sodiumGrams: number;
  ironServings: number;
  medicationAdherence: number;
  sleepHours: number;
  stressLevel: number;
}

export const DEFAULT_LIFESTYLE: LifestyleParams = {
  exerciseMins: 30,
  sugarGrams: 50,
  sodiumGrams: 5,
  ironServings: 3,
  medicationAdherence: 80,
  sleepHours: 7,
  stressLevel: 5,
};

// ─── Scan History Entry ──────────────────────────────
export interface ScanHistoryEntry {
  scanId: string;
  timestamp: string;
  overallScore: number;
  hypertensionRisk: number;
  diabetesRisk: number;
  anemiaRisk: number;
}

// ─── Navigation Types ────────────────────────────────
export type RootTabParamList = {
  HomeTab: undefined;
  ChatbotTab: undefined;   // Doctor screen
  ProfileTab: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  Scanner: { cameraMode?: string } | undefined;
  Chatbot: undefined;
  Results: { scanId: string };
  DREM: { scanId: string };
  WhatIf: { scanId: string };
  Diet: { scanId: string };
};

export type HistoryStackParamList = {
  History: undefined;
  ResultDetail: { scanId: string };
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  ResultDetail: { scanId: string };
};

export type LabReportsStackParamList = {
  LabReportsList: undefined;
  AddLabReport: undefined;
  FamilyHistory: undefined;
};

