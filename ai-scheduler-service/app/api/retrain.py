# app/api/retrain.py
from fastapi import APIRouter, HTTPException, Header, Request
from pydantic import BaseModel
from typing import Optional, List
from app.model.pipeline import featurize
from app.model.trainer import train_regressor, evaluate_regressor
from app.model.persistence import save_model, load_model
from app.settings import settings
import requests
import pandas as pd
import traceback

router = APIRouter()

class RetrainPayload(BaseModel):
    # Optionally accept training dataset inline or instruct the service to pull from Node
    # training_data: list[dict]  # each item should include features and target label 'y'
    fetch_from_node: Optional[bool] = True
    max_samples: Optional[int] = 10000
    n_estimators: Optional[int] = None

def fetch_completed_sessions_from_node(limit=5000):
    if not settings.NODE_API_URL:
        return []
    headers = {}
    if settings.NODE_API_KEY:
        headers["Authorization"] = f"Bearer {settings.NODE_API_KEY}"
    url = settings.NODE_API_URL.rstrip("/") + "/api/admin/sessions?status=completed&limit=" + str(limit)
    r = requests.get(url, headers=headers, timeout=20)
    r.raise_for_status()
    body = r.json()
    # expect { sessions: [...] } or list
    if isinstance(body, dict) and "sessions" in body:
        return body["sessions"]
    if isinstance(body, list):
        return body
    return []

@router.post("/")
async def retrain(payload: RetrainPayload, x_retrain_api_key: Optional[str] = Header(None)):
    # simple API key protection
    if x_retrain_api_key != settings.RETRAIN_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid retrain API key")

    try:
        # 1) get data
        if payload.fetch_from_node:
            sessions = fetch_completed_sessions_from_node(limit=payload.max_samples or 5000)
        else:
            sessions = []
        if not sessions:
            raise HTTPException(status_code=400, detail="No training data available")

        # sessions should include: candidate features, and feedback label (ratings.overall)
        # We'll derive training rows: for each session create a single sample using session fields.
        # This is a simplified pipeline — in production you should generate many candidate rows per session and label them.
        rows = []
        for s in sessions:
            # attempt to get label from nested structure
            y = None
            try:
                y = s.get("outcome", {}).get("feedbackScore") or s.get("feedbackScore") or s.get("feedback", {}).get("overall")
            except Exception:
                y = None
            if y is None:
                # skip unlabeled
                continue
            # compose features similar to featurize expectations
            from dateutil import parser
            start = parser.isoparse(s["scheduledStart"])
            rows.append({
                "day_of_week": start.weekday(),
                "hour_of_day": start.hour,
                "duration_minutes": s.get("durationMinutes", 60),
                "practitioner_load": s.get("practitionerLoad", 0.5),
                "patient_flexibility": s.get("patientFlexibility", 1.0),
                "practitioner_avg_rating": s.get("practitionerAvgRating", 3.5),
                "center_utilization": s.get("centerUtilization", 0.5),
                "y": float(y)
            })
        if not rows:
            raise HTTPException(status_code=400, detail="No labeled training rows found")
        df = pd.DataFrame(rows)
        X = df.drop(columns=["y"])
        y = df["y"].values
        # train/test split
        from sklearn.model_selection import train_test_split
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.15, random_state=42)
        n_estimators = payload.n_estimators or settings.DEFAULT_N_ESTIMATORS
        model = train_regressor(X_train, y_train, n_estimators=n_estimators)
        metrics = evaluate_regressor(model, X_test, y_test)
        # persist model with a timestamped version
        import time
        version_tag = f"v{int(time.time())}"
        path = save_model(model, version_tag=version_tag)
        return {"status": "ok", "model_path": path, "metrics": metrics, "version": version_tag}
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Retrain failed: {str(e)}")
