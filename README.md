# 🏥 AarogyaNetra AI — Mobile App

**Contactless, AI-Powered Multi-Disease Health Screening System**

> Zero Hardware. Zero Needles. Zero Network Required.

AarogyaNetra is an **offline-first React Native mobile application** that performs contactless screening for **Diabetes**, **Hypertension**, and **Anemia** using your smartphone's camera and on-device AI inference.

## 🎯 Key Features

| Feature | Description |
|---------|-------------|
| **Multi-Disease Screening** | Simultaneous risk assessment for Hypertension, Diabetes, and Anemia |
| **Offline-First** | 100% functional with zero network connectivity |
| **rPPG Analysis** | Facial video → Heart Rate, HRV, Blood Pressure proxy |
| **Conjunctival Pallor** | Eye image → Hemoglobin estimation, Anemia detection |
| **DREM** | Dynamic Risk Evolution Modeling — 6/12 month trajectory prediction |
| **ARE** | Adaptive Region Explanation — Explainable AI with clinical reasoning |
| **What-If Simulator** | Lifestyle parameter sliders with real-time risk projections |
| **Scan History** | Local timeline of past scans with trend visualization |
| **ABDM Ready** | Simulated ABHA ID linking and FHIR R4 report generation |

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React Native 0.85 (Bare CLI) |
| **Language** | TypeScript |
| **Navigation** | React Navigation v6 (Tab + Stack) |
| **State** | Zustand |
| **Charts** | react-native-chart-kit |
| **Animations** | react-native-reanimated v3 |
| **ML (Future)** | TensorFlow Lite (simulation fallback included) |
| **Storage** | Local state (SQLite ready) |
| **Target** | Android |

## 📱 Screens

1. **Home** — Health overview, scan CTA, disease info cards
2. **Scanner** — Two-phase capture (Face video → Eye photo) with countdown
3. **Results** — Health score gauge, 3 disease cards, vitals, ARE explanation
4. **DREM** — Risk trajectory charts (6/12 month Monte Carlo simulation)
5. **What-If** — 7 lifestyle sliders with live risk delta badges
6. **History** — Scan timeline with mini risk bars
7. **Profile** — User settings, ABHA ID, app info

## 🚀 Setup & Run

### Prerequisites
- Node.js >= 18
- JDK 17
- Android SDK (API 34+)
- Android emulator or physical device

### Install & Run
```bash
# Install dependencies
npm install

# Start Metro bundler
npm start

# Run on Android (in a separate terminal)
npm run android
```

### Build Release APK
```bash
cd android
./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk
```

## 🧠 AI Engine

The current MVP uses **scientifically-informed simulation** for all ML inference:

- **rPPG Simulation**: Generates realistic heart rate, HRV, and BP estimates using population-level clinical parameters adjusted by age and gender
- **Conjunctiva Simulation**: Produces hemoglobin estimates and pallor indices using WHO reference ranges
- **DREM Engine**: Monte Carlo simulation using Ornstein-Uhlenbeck stochastic process
- **What-If Engine**: Clinically-calibrated lifestyle parameter response curves

### Future TFLite Integration
The architecture is designed for drop-in replacement of simulation with TFLite models:
- `src/services/ml/AISimulationEngine.ts` → Replace with TFLite inference calls
- Models stored in `android/app/src/main/assets/models/`
- Target model size: ~5 MB total (INT8 quantized)

## 📂 Project Structure

```
src/
├── components/        # Reusable UI components
│   ├── common/        # GlassCard, RiskGauge, AnimatedButton, VitalPill
│   └── results/       # DiseaseCard
├── models/            # TypeScript data types
├── navigation/        # Tab + Stack navigator setup
├── screens/           # All 7 app screens
├── services/
│   ├── ml/            # AI simulation engine
│   └── engines/       # DREM + What-If engines
├── store/             # Zustand state management
└── theme/             # Colors, typography, spacing
```

## 👥 Team
**Tech-Tantra** — MIT-ADT AI Grand Challenge 2026

## ⚠️ Disclaimer
AarogyaNetra is a **screening tool** for early risk detection. It does not provide medical diagnoses. Always consult a qualified healthcare provider for medical decisions.
