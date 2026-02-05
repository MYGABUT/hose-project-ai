
import requests
import sys
from sqlalchemy import create_engine, inspect
from app.core.database import DATABASE_URL

# 1. Check DB Columns
engine = create_engine(DATABASE_URL)
inspector = inspect(engine)
table = "salesmen"
print(f"\nChecking table '{table}' columns:")
if inspector.has_table(table):
    cols = [c['name'] for c in inspector.get_columns(table)]
    print(cols)
    required = ['code', 'name', 'commission_rate', 'monthly_target']
    missing = [r for r in required if r not in cols]
    if missing:
        print(f"❌ Missing columns: {missing}")
    else:
        print("✅ Salesman columns look clear.")
else:
    print(f"❌ Table '{table}' NOT FOUND.")

# 2. Check API Health
print("\nChecking API Health...")
try:
    r = requests.get("http://localhost:8000/health")
    if r.status_code == 200:
        print("✅ API is UP")
    else:
        print(f"❌ API returned {r.status_code}")
except Exception as e:
    print(f"❌ API Connection Failed: {e}")

# 3. Check Dashboard API (Smoke Test)
print("\nChecking /inventory/dashboard...")
try:
    r = requests.get("http://localhost:8000/api/v1/inventory/dashboard?limit=5")
    if r.status_code == 200:
        print("✅ Dashboard API OK")
    else:
        print(f"❌ Dashboard API Failed: {r.status_code} - {r.text[:100]}")
except Exception as e:
    print(f"❌ Dashboard Test Failed: {e}")
