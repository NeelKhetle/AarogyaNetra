from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import numpy as np
import shap

app = FastAPI()

# 1. Model Load karna
model = joblib.load("models/diabetes_model.pkl")
explainer = shap.TreeExplainer(model)

# 2. Input Data ka structure (Pydantic model)
class PatientData(BaseModel):
    glucose: float
    bmi: float
    age: float
    bp: float
    insulin: float
    # Baaki features bhi add kar sakte ho jo dataset mein the

@app.post("/predict/diabetes")
async def predict_diabetes(data: PatientData):
    # Data ko array mein convert karna
    input_array = np.array([[data.glucose, data.bp, 0, data.insulin, data.bmi, 0, data.age, 0]]) # Columns match hone chahiye
    
    # Prediction
    prediction = model.predict(input_array)
    probability = model.predict_proba(input_array)[0][1]
    
    # XAI (SHAP) Calculation
    shap_values = explainer.shap_values(input_array)
    
    return {
        "risk_score": float(probability),
        "prediction": int(prediction[0]),
        "shap_values": shap_values.tolist()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)