from __future__ import annotations

from typing import List, Literal
from pydantic import BaseModel, Field, conint

Race = Literal["Caucasian", "AfricanAmerican", "Asian", "Hispanic", "Other", "Unknown"]
Gender = Literal["Male", "Female", "Unknown/Invalid"]
AgeBand = Literal[
    "[0-10)", "[10-20)", "[20-30)", "[30-40)", "[40-50)",
    "[50-60)", "[60-70)", "[70-80)", "[80-90)", "[90-100)",
]
A1CResult = Literal["None", "Norm", ">7", ">8"]
MedChange = Literal["No", "Ch"]
MedStatus = Literal["No", "Steady", "Up", "Down"]
DiabetesMed = Literal["Yes", "No"]

class PredictRequest(BaseModel):
    race: Race = Field(..., description="Self-reported race category")
    gender: Gender = Field(..., description="Gender")
    age: AgeBand = Field(..., description="Age band")
    admission_type_id: conint(ge=1, le=9) = Field(..., description="Admission type id")
    discharge_disposition_id: conint(ge=1, le=30) = Field(..., description="Discharge disposition id")
    admission_source_id: conint(ge=1, le=25) = Field(..., description="Admission source id")
    time_in_hospital: conint(ge=1, le=30) = Field(..., description="Length of stay in days")
    num_lab_procedures: conint(ge=0, le=200) = Field(..., description="Number of lab procedures")
    num_procedures: conint(ge=0, le=50) = Field(..., description="Number of procedures")
    num_medications: conint(ge=0, le=100) = Field(..., description="Number of medications")
    number_outpatient: conint(ge=0, le=50) = Field(..., description="Outpatient visits in past year")
    number_emergency: conint(ge=0, le=50) = Field(..., description="Emergency visits in past year")
    number_inpatient: conint(ge=0, le=50) = Field(..., description="Inpatient visits in past year")
    A1Cresult: A1CResult = Field(..., description="A1C result")
    metformin: MedStatus = Field(..., description="Metformin status")
    insulin: MedStatus = Field(..., description="Insulin status")
    change: MedChange = Field(..., description="Medication change")
    diabetesMed: DiabetesMed = Field(..., description="Diabetes medication prescribed")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "race": "Caucasian",
                    "gender": "Female",
                    "age": "[60-70)",
                    "admission_type_id": 1,
                    "discharge_disposition_id": 1,
                    "admission_source_id": 7,
                    "time_in_hospital": 4,
                    "num_lab_procedures": 50,
                    "num_procedures": 2,
                    "num_medications": 14,
                    "number_outpatient": 0,
                    "number_emergency": 1,
                    "number_inpatient": 0,
                    "A1Cresult": ">7",
                    "metformin": "Steady",
                    "insulin": "Up",
                    "change": "Ch",
                    "diabetesMed": "Yes",
                }
            ]
        }
    }

class FeatureContribution(BaseModel):
    feature: str
    contribution: float
    direction: Literal["increases_risk", "decreases_risk", "neutral"]

class PredictResponse(BaseModel):
    probability: float = Field(..., ge=0.0, le=1.0)
    risk_tier: Literal["low", "medium", "high"]
    top_features: List[FeatureContribution]
    caution: str

class ModelMetadata(BaseModel):
    model_version: str
    training_date: str
    feature_list: List[str]

class FairnessReport(BaseModel):
    generated_at: str
    metrics: dict

class MetricsReport(BaseModel):
    generated_at: str
    metrics: dict
