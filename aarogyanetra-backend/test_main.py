import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from main import app

client = TestClient(app)

valid_payload = {
    "age": 35,
    "gender": 1,
    "height": 175.5,
    "weight": 70,
    "bmi": 22.7,
    "glucose": 95,
    "bp_sys": 120,
    "bp_dia": 80,
    "cholesterol": 1,
    "insulin": 15,
    "red_pixel": 40.5,
    "green_pixel": 30.2,
    "blue_pixel": 29.3,
    "hemoglobin": 14.5
}

@patch("main.diabetes_model")
@patch("main.hypertension_model")
@patch("main.anemia_model")
@patch("main.diabetes_explainer")
def test_predict_all_success(mock_anemia, mock_hypertension, mock_diabetes, mock_diabetes_explainer):
    # Mock probabilities: returns array of shape (1, 2) where [0][1] is risk probability
    mock_diabetes.predict_proba.return_value = [[0.2, 0.8]]  # 80% risk (Highest)
    mock_hypertension.predict_proba.return_value = [[0.6, 0.4]] # 40% risk
    mock_anemia.predict_proba.return_value = [[0.9, 0.1]] # 10% risk
    
    # Mock SHAP values from explainer format list returning 
    import numpy as np
    mock_diabetes_explainer.shap_values.return_value = np.array([[0.1, 0.2, 0.3]])

    response = client.post("/predict/all", json=valid_payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["diabetes_risk"] == 0.8
    assert data["hypertension_risk"] == 0.4
    assert data["anemia_risk"] == 0.1
    assert data["highest_risk_disease"] == "diabetes"
    assert "shap_values" in data

def test_predict_all_missing_fields():
    invalid_payload = {
        "age": 35,
        "gender": 1
        # missing remaining fields
    }
    response = client.post("/predict/all", json=invalid_payload)
    assert response.status_code == 422 # FastAPI validation Error Validation Error