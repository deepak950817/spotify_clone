# app/schemas.py
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class Candidate(BaseModel):
    practitioner_id: str = Field(..., alias="practitionerId")
    center_id: Optional[str] = Field(None, alias="centerId")
    start: str
    end: str
    duration_minutes: int = Field(..., alias="durationMinutes")
    practitioner_load: Optional[float] = 0.0
    patient_flexibility: Optional[float] = 1.0
    day_of_week: Optional[int] = None
    hour_of_day: Optional[int] = None
    extra: Optional[Dict[str, Any]] = None

class PredictRequest(BaseModel):
    request_id: str
    patient_id: Optional[str] = None
    therapy_type: Optional[str] = None
    candidates: List[Candidate]
    context: Optional[Dict[str, Any]] = {}

class Recommendation(BaseModel):
    practitioner_id: str = Field(..., alias="practitionerId")
    start: str
    score: float

class PredictResponse(BaseModel):
    request_id: str
    recommendations: List[Recommendation]
    meta: Optional[Dict[str, Any]] = {}
