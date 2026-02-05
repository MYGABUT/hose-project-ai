import os
import sys
from sqlalchemy import text
from app.core.database import engine

def test_query():
    print("🧪 Testing direct SQL query...")
    try:
        with engine.connect() as conn:
            # Try selecting the problematic columns
            sql = text("SELECT id, sku, created_at, updated_at FROM products LIMIT 1")
            result = conn.execute(sql)
            row = result.fetchone()
            print(f"✅ Query Successful! Found row: {row}")
    except Exception as e:
        print(f"❌ Query Failed: {e}")

if __name__ == "__main__":
    sys.path.append(os.getcwd())
    test_query()
