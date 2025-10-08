# from fastapi import APIRouter
# from app.schemas import PredictRequest
# from app.model.persistence import load_latest_model
# from app.model.pipeline import featurize

# router = APIRouter()

# _model = None
# _model_version = "unknown"

# def get_model():
#     global _model, _model_version
#     if _model is None:
#         _model = load_latest_model()
#         _model_version = "v1.0"
#     return _model

# @router.post("/", response_model=dict)
# def predict(req: PredictRequest):
#     model = get_model()
#     df = featurize([c.dict() for c in req.candidates])
#     preds = model.predict(df)  # or predict_proba returning probabilities
#     recommendations = []
#     for c, s in zip(req.candidates, preds):
#         recommendations.append({"practitioner_id": c.practitioner_id, "start": c.start, "score": float(s)})
#     return {"request_id": req.request_id, "recommendations": recommendations, "meta": {"model_version": _model_version}}


# app/api/predict.py
from fastapi import APIRouter, HTTPException, Request
from app.schemas import PredictRequest, PredictResponse, Recommendation
from app.model.pipeline import featurize
from app.model.persistence import load_model, save_model
from app.settings import settings
from app.model.trainer import train_regressor
from app.model.persistence import load_model as load_model_fn
from typing import List, Dict
import time
import traceback

router = APIRouter()

# Load model into memory at startup (lazy)
_model = None
_model_version = "none"

def get_model():
    global _model, _model_version
    if _model is None:
        m = load_model_fn()
        if m is None:
            _model = None
            _model_version = "none"
        else:
            _model = m
            _model_version = "saved"
    return _model

@router.post("/", response_model=PredictResponse)
async def predict(req: PredictRequest):
    try:
        t0 = time.time()
        candidates = [c.dict(by_alias=True) for c in req.candidates]
        # optional: filter conflicts here using OR-Tools helper if you have existing sessions data
        X = featurize(candidates)
        model = get_model()
        if model is None:
            # no model: fallback heuristic score
            recommendations = []
            for c in candidates:
                recommendations.append({
                    "practitionerId": c["practitionerId"],
                    "start": c["start"],
                    "score": 0.5
                })
            return {"request_id": req.request_id, "recommendations": recommendations, "meta": {"model_version": _model_version, "scoring_time_ms": int((time.time()-t0)*1000)}}
        # model predicts numeric score (regression) or probability depending on your model design
        scores = model.predict(X)
        # build recommendations
        recs = []
        for c, s in zip(candidates, scores):
            recs.append({"practitionerId": c["practitionerId"], "start": c["start"], "score": float(s)})
        elapsed = int((time.time() - t0) * 1000)
        return {"request_id": req.request_id, "recommendations": recs, "meta": {"model_version": _model_version, "scoring_time_ms": elapsed}}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"AI predict error: {str(e)}")
