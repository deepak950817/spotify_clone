# from ortools.sat.python import cp_model

# def pick_feasible_subsets(candidates, constraints):
#     model = cp_model.CpModel()
#     # binary var per candidate
#     x = [model.NewBoolVar(f"x{i}") for i in range(len(candidates))]
#     # add constraints (no overlapping per practitioner)
#     # ... build constraints
#     model.Maximize(sum(x))  # or other objective
#     solver = cp_model.CpSolver()
#     solver.Solve(model)
#     return [candidates[i] for i in range(len(candidates)) if solver.Value(x[i]) == 1]


# app/ortools_util.py
# Minimal feasibility filter using simple overlap checks per practitioner.
# For heavy-duty constraint solving, implement CP-SAT/OR-Tools below.

from typing import List, Dict
from datetime import datetime

def iso_to_dt(s: str):
    from dateutil import parser
    return parser.isoparse(s)

def filter_conflicts(candidates: List[Dict], existing_sessions: List[Dict]) -> List[Dict]:
    """
    Remove candidate slots that conflict with existing_sessions (list of dicts with practitioner_id,start,end).
    This is a fast filter; for advanced constraints use CP-SAT with OR-Tools.
    """
    out = []
    # build per-practitioner schedule
    schedule = {}
    for s in existing_sessions:
        pid = str(s.get("practitioner_id") or s.get("practitionerId"))
        schedule.setdefault(pid, []).append((iso_to_dt(s["start"]), iso_to_dt(s["end"])))
    for c in candidates:
        pid = c.get("practitioner_id") or c.get("practitionerId")
        s = iso_to_dt(c["start"])
        e = iso_to_dt(c["end"])
        conflict = False
        for (a,b) in schedule.get(str(pid), []):
            if (s < b) and (e > a):
                conflict = True
                break
        if not conflict:
            out.append(c)
    return out
