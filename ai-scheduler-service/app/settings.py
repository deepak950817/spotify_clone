# app/settings.py
import os
# app/settings.py
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    MODEL_DIR: str = "./models"
    MODEL_NAME: str = "model_current.pkl"
    NODE_API_URL: str = ""
    NODE_API_KEY: str = ""
    RETRAIN_API_KEY: str = "changeme"
    DEFAULT_N_ESTIMATORS: int = 200
    JOBLIB_COMPRESSION: int = 3

settings = Settings()
