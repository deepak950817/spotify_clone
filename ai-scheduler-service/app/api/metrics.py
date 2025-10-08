# @router.get("/")
# def metrics():
#     return {"model_version": _model_version, "last_trained": "2025-10-01", "samples_trained": 12000}
# app/api/metrics.py
from fastapi import APIRouter
from app.model.persistence import load_model
from app.settings import settings
import os, time

router = APIRouter()

@router.get("/")
async def metrics():
    model_file = settings.MODEL_DIR + "/" + settings.MODEL_NAME
    exists = os.path.exists(model_file)
    info = {"model_exists": exists}
    if exists:
        info["model_path"] = model_file
        info["model_mtime"] = os.path.getmtime(model_file)
    return {"status": "ok", "info": info}
