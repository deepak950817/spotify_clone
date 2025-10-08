# import numpy as np
# import pandas as pd

# def featurize(candidates, extra_lookup=None):
#     rows = []
#     for c in candidates:
#         rows.append({
#             "day_of_week": c["day_of_week"],
#             "hour_of_day": c["hour_of_day"],
#             "duration": c["duration_minutes"],
#             "practitioner_load": c.get("practitioner_load", 0.5),
#             "patient_flexibility": c.get("patient_flexibility", 1.0),
#             # optionally enrich with extra_lookup(practitioner_id)
#         })
#     return pd.DataFrame(rows)


# app/model/pipeline.py
import pandas as pd
import numpy as np
from typing import List, Dict, Any

# This file converts candidate dicts into a DataFrame of features used by the model.
# Extend it with richer features (practitioner history, patient behavior) by querying node backend.

def featurize(candidates: List[Dict[str, Any]]) -> pd.DataFrame:
    rows = []
    for c in candidates:
        start = c.get("start")
        # expect ISO string; derive day/hour when not provided
        dow = c.get("day_of_week")
        hod = c.get("hour_of_day")
        try:
            if (dow is None) or (hod is None):
                from dateutil import parser
                dt = parser.isoparse(start)
                dow = dt.weekday()  # 0=Monday
                hod = dt.hour
        except Exception:
            dow = dow or 0
            hod = hod or 0

        row = {
            "day_of_week": int(dow),
            "hour_of_day": int(hod),
            "duration_minutes": int(c.get("duration_minutes") or c.get("durationMinutes") or 60),
            "practitioner_load": float(c.get("practitioner_load", 0.5) or 0.5),
            "patient_flexibility": float(c.get("patient_flexibility", 1.0) or 1.0)
        }
        # incorporate any extras as numeric if present
        extra = c.get("extra") or {}
        # Example: extra may include practitioner_avg_rating or center_utilization
        row["practitioner_avg_rating"] = float(extra.get("practitioner_avg_rating", 3.5))
        row["center_utilization"] = float(extra.get("center_utilization", 0.5))
        rows.append(row)
    df = pd.DataFrame(rows)
    # simple imputation / normalization may be done by the model itself or externally
    df.fillna(0, inplace=True)
    return df
