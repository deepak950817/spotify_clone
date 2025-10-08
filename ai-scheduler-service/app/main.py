# from fastapi import FastAPI
# from app.api import predict, retrain, metrics

# app = FastAPI(title="AI Scheduler")

# app.include_router(predict.router, prefix="/predict_slots")
# app.include_router(retrain.router, prefix="/retrain")
# app.include_router(metrics.router, prefix="/metrics")

# @app.get("/health")
# async def health():
#     return {"status": "ok"}


# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import predict, retrain, metrics

app = FastAPI(title="AI Scheduler Service", version="0.1.0")

# Allow your Node backend origin(s)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # adjust in production
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict.router, prefix="/predict_slots", tags=["predict"])
app.include_router(retrain.router, prefix="/retrain", tags=["retrain"])
app.include_router(metrics.router, prefix="/metrics", tags=["metrics"])

@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}
