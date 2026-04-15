/**
 * ArogyaNetra AI - Global App Store (Zustand + Persistent Storage)
 * Manages user profile, current scan, history, lab reports, and family history
 * Data persists across app restarts via SimpleStorage
 */

import { create } from 'zustand';
import { SimpleStorage } from '../services/storage/SimpleStorage';
import {
  UserProfile,
  ScanResult,
  DREMTrajectory,
  LifestyleParams,
  DEFAULT_LIFESTYLE,
  ScanHistoryEntry,
  LabReportEntry,
  FamilyHealthHistory,
  DEFAULT_FAMILY_HISTORY,
} from '../models/types';
import { runScanSimulation } from '../services/ml/AISimulationEngine';
import { generateDREMTrajectory } from '../services/engines/DREMEngine';
import { runWhatIfSimulation, WhatIfResult } from '../services/engines/WhatIfEngine';

// Simple ID generator (uuid v4 crashes on Hermes release builds due to missing crypto.getRandomValues)
function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  const randomPart2 = Math.random().toString(36).substring(2, 6);
  return `${timestamp}-${randomPart}-${randomPart2}`;
}

// ─── Storage Keys ─────────────────────────────────────
const STORAGE_KEYS = {
  USER: '@aarogya_user',
  SCAN_HISTORY: '@aarogya_scan_history',
  STORED_SCANS: '@aarogya_stored_scans',
  LAB_REPORTS: '@aarogya_lab_reports',
};

// ─── Store Shape ──────────────────────────────────────
interface AppState {
  // User
  user: UserProfile | null;
  setUser: (profile: Partial<UserProfile>) => void;
  initializeDefaultUser: () => void;

  // Scan
  currentScan: ScanResult | null;
  scanStatus: 'idle' | 'capturing' | 'processing' | 'complete';
  setScanStatus: (status: AppState['scanStatus']) => void;
  runScan: () => ScanResult | null;

  // DREM
  currentDREM: DREMTrajectory | null;
  generateDREM: (horizon: 6 | 12) => void;

  // What-If
  whatIfParams: LifestyleParams;
  whatIfResult: WhatIfResult | null;
  setWhatIfParam: <K extends keyof LifestyleParams>(key: K, value: LifestyleParams[K]) => void;
  resetWhatIfParams: () => void;
  computeWhatIf: () => void;

  // History
  scanHistory: ScanHistoryEntry[];
  addScanToHistory: (scan: ScanResult) => void;
  getScanFromHistory: (scanId: string) => ScanHistoryEntry | undefined;

  // Stored full scan results (for viewing past results)
  storedScans: Record<string, ScanResult>;
  getStoredScan: (scanId: string) => ScanResult | undefined;

  // Lab Reports
  labReports: LabReportEntry[];
  addLabReport: (report: LabReportEntry) => void;
  removeLabReport: (reportId: string) => void;
  getLatestLabReport: () => LabReportEntry | undefined;

  // Family History
  updateFamilyHistory: (history: FamilyHealthHistory) => void;

  // Persistence
  loadPersistedData: () => Promise<void>;
  dataLoaded: boolean;
}

// ─── Store Implementation ─────────────────────────────
export const useAppStore = create<AppState>((set, get) => ({
  // ─── User ───────────────────────────
  user: null,
  dataLoaded: false,

  setUser: (profile) => {
    const current = get().user;
    let updated: UserProfile;
    if (current) {
      updated = { ...current, ...profile };
    } else {
      updated = {
        id: generateId(),
        name: profile.name || 'User',
        age: profile.age || 30,
        gender: profile.gender || 'male',
        abhaId: profile.abhaId,
        abhaVerified: profile.abhaVerified,
        familyHistory: profile.familyHistory || DEFAULT_FAMILY_HISTORY,
        createdAt: new Date().toISOString(),
        ...profile,
      } as UserProfile;
    }
    set({ user: updated });
    SimpleStorage.setJSON(STORAGE_KEYS.USER, updated);
  },

  initializeDefaultUser: () => {
    if (!get().user) {
      const defaultUser: UserProfile = {
        id: generateId(),
        name: 'User',
        age: 35,
        gender: 'male',
        familyHistory: DEFAULT_FAMILY_HISTORY,
        createdAt: new Date().toISOString(),
      };
      set({ user: defaultUser });
      SimpleStorage.setJSON(STORAGE_KEYS.USER, defaultUser);
    }
  },

  // ─── Scan ───────────────────────────
  currentScan: null,
  scanStatus: 'idle',

  setScanStatus: (status) => set({ scanStatus: status }),

  runScan: () => {
    const { user, labReports } = get();
    if (!user) return null;

    set({ scanStatus: 'processing' });

    // Pass lab reports to the simulation engine for real data overrides
    const result = runScanSimulation(user.id, user, labReports);

    const newStoredScans = { ...get().storedScans, [result.scanId]: result };

    set({
      currentScan: result,
      scanStatus: 'complete',
      storedScans: newStoredScans,
    });

    // Auto-add to history
    get().addScanToHistory(result);

    // Persist scans
    SimpleStorage.setJSON(STORAGE_KEYS.STORED_SCANS, newStoredScans);

    return result;
  },

  // ─── DREM ───────────────────────────
  currentDREM: null,

  generateDREM: (horizon) => {
    const { currentScan } = get();
    if (!currentScan) return;

    const trajectory = generateDREMTrajectory(currentScan, horizon);
    set({ currentDREM: trajectory });
  },

  // ─── What-If ────────────────────────
  whatIfParams: { ...DEFAULT_LIFESTYLE },
  whatIfResult: null,

  setWhatIfParam: (key, value) => {
    const newParams = { ...get().whatIfParams, [key]: value };
    set({ whatIfParams: newParams });
    // Auto-recompute
    const { currentScan } = get();
    if (currentScan) {
      const result = runWhatIfSimulation(currentScan, newParams);
      set({ whatIfResult: result });
    }
  },

  resetWhatIfParams: () => {
    set({
      whatIfParams: { ...DEFAULT_LIFESTYLE },
      whatIfResult: null,
    });
  },

  computeWhatIf: () => {
    const { currentScan, whatIfParams } = get();
    if (!currentScan) return;

    const result = runWhatIfSimulation(currentScan, whatIfParams);
    set({ whatIfResult: result });
  },

  // ─── History ────────────────────────
  scanHistory: [],

  addScanToHistory: (scan) => {
    const entry: ScanHistoryEntry = {
      scanId: scan.scanId,
      timestamp: scan.timestamp,
      overallScore: scan.overallHealthScore,
      hypertensionRisk: scan.diseases.hypertension.riskScore,
      diabetesRisk: scan.diseases.diabetes.riskScore,
      anemiaRisk: scan.diseases.anemia.riskScore,
    };

    const newHistory = [entry, ...get().scanHistory].slice(0, 50);
    set({ scanHistory: newHistory });
    SimpleStorage.setJSON(STORAGE_KEYS.SCAN_HISTORY, newHistory);
  },

  getScanFromHistory: (scanId) => {
    return get().scanHistory.find(s => s.scanId === scanId);
  },

  // ─── Stored Scans ──────────────────
  storedScans: {},

  getStoredScan: (scanId) => {
    return get().storedScans[scanId];
  },

  // ─── Lab Reports ────────────────────
  labReports: [],

  addLabReport: (report) => {
    const newReports = [report, ...get().labReports].slice(0, 100);
    set({ labReports: newReports });
    SimpleStorage.setJSON(STORAGE_KEYS.LAB_REPORTS, newReports);
  },

  removeLabReport: (reportId) => {
    const newReports = get().labReports.filter(r => r.id !== reportId);
    set({ labReports: newReports });
    SimpleStorage.setJSON(STORAGE_KEYS.LAB_REPORTS, newReports);
  },

  getLatestLabReport: () => {
    const reports = get().labReports;
    if (reports.length === 0) return undefined;
    return [...reports].sort(
      (a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime()
    )[0];
  },

  // ─── Family History ─────────────────
  updateFamilyHistory: (history) => {
    const user = get().user;
    if (!user) return;
    const updated = { ...user, familyHistory: history };
    set({ user: updated });
    SimpleStorage.setJSON(STORAGE_KEYS.USER, updated);
  },

  // ─── Persistence ────────────────────
  loadPersistedData: async () => {
    try {
      const [user, history, storedScans, labReports] = await Promise.all([
        SimpleStorage.getJSON<UserProfile>(STORAGE_KEYS.USER),
        SimpleStorage.getJSON<ScanHistoryEntry[]>(STORAGE_KEYS.SCAN_HISTORY),
        SimpleStorage.getJSON<Record<string, ScanResult>>(STORAGE_KEYS.STORED_SCANS),
        SimpleStorage.getJSON<LabReportEntry[]>(STORAGE_KEYS.LAB_REPORTS),
      ]);

      set({
        user: user || get().user,
        scanHistory: history || [],
        storedScans: storedScans || {},
        labReports: labReports || [],
        dataLoaded: true,
      });
    } catch (e) {
      console.warn('Failed to load persisted data:', e);
      set({ dataLoaded: true });
    }
  },
}));
