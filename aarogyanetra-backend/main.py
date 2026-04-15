from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import joblib
import numpy as np
import pandas as pd
import shap
import os

app = FastAPI(title="AarogyaNetra AI Engine", description="FastAPI Backend for ML models")

# CORS Middleware for all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load Models
MODELS_DIR = "models"
try:
    diabetes_model = joblib.load(os.path.join(MODELS_DIR, "diabetes_model.pkl"))
    hypertension_model = joblib.load(os.path.join(MODELS_DIR, "hypertension_model.pkl"))
    anemia_model = joblib.load(os.path.join(MODELS_DIR, "anemia_model.pkl"))
    
    # Initialize explainers
    diabetes_explainer = shap.TreeExplainer(diabetes_model)
    hypertension_explainer = shap.TreeExplainer(hypertension_model)
    anemia_explainer = shap.TreeExplainer(anemia_model)
except Exception as e:
    print(f"Warning: Models not found or failed to load. Provide valid .pkl models! Error: {e}")
    diabetes_model = hypertension_model = anemia_model = None
    diabetes_explainer = hypertension_explainer = anemia_explainer = None

class PatientData(BaseModel):
    age: float
    gender: int = Field(description="0 for Female, 1 for Male")
    height: float
    weight: float
    bmi: float
    glucose: float
    bp_sys: float  # ap_hi
    bp_dia: float  # ap_lo
    cholesterol: float
    insulin: float
    red_pixel: float
    green_pixel: float
    blue_pixel: float
    hemoglobin: float

@app.post("/predict/all")
async def predict_all(data: PatientData):
    if not all([diabetes_model, hypertension_model, anemia_model]):
        raise HTTPException(status_code=500, detail="Models are not loaded on the server.")
        
    try:
        # --- 1. Diabetes Formatting ---
        # Cols: Pregnancies (default 0), Glucose, BloodPressure (bp_dia), SkinThickness (default 20), Insulin, BMI, DiabetesPedigreeFunction (default 0.5), Age.
        diabetes_df = pd.DataFrame([{
            "Pregnancies": 0,
            "Glucose": data.glucose,
            "BloodPressure": data.bp_dia,
            "SkinThickness": 20,
            "Insulin": data.insulin,
            "BMI": data.bmi,
            "DiabetesPedigreeFunction": 0.5,
            "Age": data.age
        }])
        diabetes_risk = float(diabetes_model.predict_proba(diabetes_df)[0][1])

        # --- 2. Hypertension Formatting ---
        # Cols: age, gender, height, weight, ap_hi, ap_lo, cholesterol (default 1), gluc (default 1).
        hypertension_df = pd.DataFrame([{
            "age": data.age,
            "gender": data.gender,
            "height": data.height,
            "weight": data.weight,
            "ap_hi": data.bp_sys,
            "ap_lo": data.bp_dia,
            "cholesterol": data.cholesterol if data.cholesterol else 1.0,
            "gluc": 1.0  # Optional mapping if needed
        }])
        hypertension_risk = float(hypertension_model.predict_proba(hypertension_df)[0][1])

        # --- 3. Anemia Formatting ---
        # Cols: Sex, %Red Pixel, %Green Pixel, %Blue Pixel, Hb.
        anemia_df = pd.DataFrame([{
            "Sex": data.gender,
            "%Red Pixel": data.red_pixel,
            "%Green Pixel": data.green_pixel,
            "%Blue Pixel": data.blue_pixel,
            "Hb": data.hemoglobin
        }])
        anemia_risk = float(anemia_model.predict_proba(anemia_df)[0][1])

        # Determine Highest Risk
        risks = {
            "diabetes": diabetes_risk,
            "hypertension": hypertension_risk,
            "anemia": anemia_risk
        }
        highest_risk_disease = max(risks, key=risks.get)

        # Compute SHAP for highest risk only to save processing
        shap_values_list = []
        if highest_risk_disease == "diabetes":
            shap_values = diabetes_explainer.shap_values(diabetes_df)
            shap_values_list = shap_values.tolist()
        elif highest_risk_disease == "hypertension":
            shap_values = hypertension_explainer.shap_values(hypertension_df)
            shap_values_list = shap_values.tolist()
        else:
            shap_values = anemia_explainer.shap_values(anemia_df)
            shap_values_list = shap_values.tolist()

        return {
            "diabetes_risk": diabetes_risk,
            "hypertension_risk": hypertension_risk,
            "anemia_risk": anemia_risk,
            "highest_risk_disease": highest_risk_disease,
            "shap_values": shap_values_list
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)