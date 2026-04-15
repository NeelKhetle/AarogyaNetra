import { useAppStore } from '../useAppStore';
import { runScanSimulation } from '../../services/ml/AISimulationEngine';

jest.mock('../../services/ml/AISimulationEngine', () => ({
  runScanSimulation: jest.fn(),
}));

jest.mock('../../services/storage/SimpleStorage', () => ({
  SimpleStorage: {
    getJSON: jest.fn(),
    setJSON: jest.fn(),
  },
}));

describe('useAppStore AI Predictions Integration', () => {
  beforeEach(() => {
    useAppStore.setState({
      user: {
        id: 'test-id',
        name: 'John',
        age: 35,
        gender: 'male',
        createdAt: new Date().toISOString(),
      },
      labReports: [],
      storedScans: {},
    });

    globalThis.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          diabetes_risk: 0.15,
          hypertension_risk: 0.40,
          anemia_risk: 0.80,
          highest_risk_disease: 'anemia',
          shap_values: [[0.5, 0.3, -0.1]]
        }),
      }) as any
    );

    (runScanSimulation as jest.Mock).mockReturnValue({
      scanId: 'mock-scan-id',
      diseases: {
        diabetes: { riskLevel: 'low', riskScore: 0.1, confidence: 0.9 },
        hypertension: { riskLevel: 'low', riskScore: 0.1, confidence: 0.9 },
        anemia: { riskLevel: 'low', riskScore: 0.1, confidence: 0.9 },
      },
      vitals: {},
      areExplanation: {}
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should update correct risk scores from AI prediction endpoint', async () => {
    const patientData = {
      age: 35,
      gender: 1,
      height: 175,
      weight: 70,
      bmi: 22.8,
      glucose: 90,
      bp_sys: 120,
      bp_dia: 80,
      cholesterol: 1.5,
      insulin: 10,
      red_pixel: 40,
      green_pixel: 30,
      blue_pixel: 30,
      hemoglobin: 14,
    };

    const state = useAppStore.getState();
    const result = await state.fetchAIPredictions(patientData);

    expect(fetch).toHaveBeenCalledWith('http://10.0.2.2:8000/predict/all', expect.any(Object));
    expect(result).not.toBeNull();
    
    // Low risk mapped appropriately from mock 0.15
    expect(result?.diseases.diabetes.riskScore).toBe(0.15);
    expect(result?.diseases.diabetes.riskLevel).toBe('low');
    
    // Moderate mapped 0.40
    expect(result?.diseases.hypertension.riskScore).toBe(0.40);
    expect(result?.diseases.hypertension.riskLevel).toBe('moderate');

    // Critical mapped 0.80
    expect(result?.diseases.anemia.riskScore).toBe(0.80);
    expect(result?.diseases.anemia.riskLevel).toBe('critical');

    // SHAP explanation validation
    expect(result?.areExplanation?.summary).toContain('High risk detected for anemia');
  });

  it('should handle network errors correctly', async () => {
    globalThis.fetch = jest.fn(() => Promise.reject(new Error('Network Request Failed')));
    
    const state = useAppStore.getState();
    await expect(state.fetchAIPredictions({} as any)).rejects.toThrow('Network Request Failed');
    
    // Verify state reverts from processing
    expect(useAppStore.getState().scanStatus).toBe('idle');
  });
});