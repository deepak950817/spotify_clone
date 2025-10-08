# from sklearn.ensemble import RandomForestRegressor
# import pandas as pd

# def train(X, y):
#     rf = RandomForestRegressor(n_estimators=200, random_state=42)
#     rf.fit(X, y)
#     return rf


# app/model/trainer.py
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
import numpy as np

def train_regressor(X, y, n_estimators=200, random_state=42):
    model = RandomForestRegressor(n_estimators=n_estimators, random_state=random_state, n_jobs=-1)
    model.fit(X, y)
    return model

def evaluate_regressor(model, X_test, y_test):
    preds = model.predict(X_test)
    mse = mean_squared_error(y_test, preds)
    r2 = r2_score(y_test, preds)
    return {"mse": float(mse), "r2": float(r2)}
