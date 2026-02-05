
from sqlalchemy import create_engine, text
from app.core.database import DATABASE_URL

engine = create_engine(DATABASE_URL)

sql = """
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sales_target NUMERIC(15, 2) DEFAULT 0;
"""

try:
    with engine.connect() as conn:
        conn.commit()
        conn.execute(text(sql))
        conn.commit()
    print("✅ Successfully patched customers table.")
except Exception as e:
    print(f"❌ Patch failed: {e}")
