# app/settings.py
import os
# from pydantic import BaseSettings
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    MODEL_DIR: str = os.getenv("MODEL_DIR", "./models")
    MODEL_NAME: str = os.getenv("MODEL_NAME", "model_current.pkl")
    NODE_API_URL: str = os.getenv("NODE_API_URL", "")  # optional: to fetch training data
    NODE_API_KEY: str = os.getenv("NODE_API_KEY", "")  # optional: used to authenticate to Node
    RETRAIN_API_KEY: str = os.getenv("RETRAIN_API_KEY", "changeme")  # simple protection for /retrain
    DEFAULT_N_ESTIMATORS: int = int(os.getenv("DEFAULT_N_ESTIMATORS", "200"))
    JOBLIB_COMPRESSION: int = int(os.getenv("JOBLIB_COMPRESSION", "3"))
    # FastAPI uvicorn settings can be set externally
    class Config:
        env_file = ".env"

settings = Settings()
