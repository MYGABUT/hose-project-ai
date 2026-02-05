"""
Inventory API Endpoints - Legacy (Deprecated)
Replaced by batches.py
"""
from fastapi import APIRouter

router = APIRouter()

@router.get("/inventory/stats/summary")
def get_inventory_stats():
    return {"status": "success", "stats": {"total_rolls": 0, "available_rolls": 0, "brands": {}}}

@router.get("/inventory/dashboard")
def get_inventory_dashboard():
    return {"status": "success", "data": []}
