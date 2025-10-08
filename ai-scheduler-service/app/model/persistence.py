# import joblib
# import os

# MODEL_DIR = "models"
# def save_model(model, version="v1"):
#     os.makedirs(MODEL_DIR, exist_ok=True)
#     path = os.path.join(MODEL_DIR, f"model_{version}.pkl")
#     joblib.dump(model, path)
#     # write metadata file with timestamp, version
#     return path

# def load_latest_model():
#     # simplest: load model_model.pkl or find highest version
#     path = os.path.join(MODEL_DIR, "model_current.pkl")
#     return joblib.load(path)


# app/model/persistence.py
import joblib
import os
import time
from typing import Tuple
from app.settings import settings

def model_path(version_tag: str = None) -> str:
    os.makedirs(settings.MODEL_DIR, exist_ok=True)
    if version_tag:
        return os.path.join(settings.MODEL_DIR, f"model_{version_tag}.pkl")
    return os.path.join(settings.MODEL_DIR, settings.MODEL_NAME)

def save_model(model, version_tag: str = None) -> str:
    path = model_path(version_tag)
    joblib.dump(model, path, compress=settings.JOBLIB_COMPRESSION)
    # write metadata file
    meta_path = path + ".meta"
    with open(meta_path, "w") as f:
        f.write(f"saved_at: {time.time()}\nversion: {version_tag or 'current'}\n")
    return path

def load_model(version_tag: str = None):
    path = model_path(version_tag)
    if not os.path.exists(path):
        return None
    return joblib.load(path)
