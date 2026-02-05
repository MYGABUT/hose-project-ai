
from sqlalchemy import create_engine, text
from app.core.database import DATABASE_URL

engine = create_engine(DATABASE_URL)

sql = """
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS salesman_id INTEGER;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS salesman_id INTEGER;
"""

print("Applying DB Patch for Salesman feature...")
with engine.connect() as conn:
    conn.execute(text(sql))
    conn.commit()
    print("✅ Successfully added salesman_id to sales_orders and invoices.")
