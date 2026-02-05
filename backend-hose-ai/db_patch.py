
from sqlalchemy import create_engine, text
from app.core.database import DATABASE_URL

engine = create_engine(DATABASE_URL)

sql = """
ALTER TABLE batch_movements 
ADD COLUMN IF NOT EXISTS unit_cost FLOAT,
ADD COLUMN IF NOT EXISTS total_value FLOAT;
"""

try:
    with engine.connect() as conn:
        conn.execute(text(sql))
        conn.commit()
    print("✅ Successfully patched batch_movements table.")
except Exception as e:
    print(f"❌ Patch failed: {e}")
