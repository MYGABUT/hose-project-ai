import sys
sys.path.append(".")
from app.core.database import engine
from sqlalchemy import text

def drop_tables():
    with engine.connect() as conn:
        print("🗑️ Dropping stale tables...")
        # Order matters due to FK
        # Drop dependent first
        conn.execute(text("DROP TABLE IF EXISTS project_sppd CASCADE"))
        conn.execute(text("DROP TABLE IF EXISTS project_daily_reports CASCADE"))
        conn.execute(text("DROP TABLE IF EXISTS project_commissioning CASCADE"))
        conn.execute(text("DROP TABLE IF EXISTS work_orders CASCADE"))
        conn.execute(text("DROP TABLE IF EXISTS projects CASCADE"))
        
        conn.execute(text("DROP TABLE IF EXISTS po_lines CASCADE"))
        conn.execute(text("DROP TABLE IF EXISTS purchase_orders CASCADE"))
        
        conn.execute(text("DROP TABLE IF EXISTS pr_lines CASCADE"))
        conn.execute(text("DROP TABLE IF EXISTS purchase_requests CASCADE"))
        
        conn.execute(text("DROP TABLE IF EXISTS stock_bookings CASCADE"))
        conn.execute(text("DROP TABLE IF EXISTS product_loans CASCADE"))
        conn.execute(text("DROP TABLE IF EXISTS rma_items CASCADE"))
        conn.execute(text("DROP TABLE IF EXISTS rma_tickets CASCADE"))
        
        conn.execute(text("DROP TABLE IF EXISTS customers CASCADE"))
        conn.execute(text("DROP TABLE IF EXISTS suppliers CASCADE")) # Also drop suppliers to be safe
        
        conn.commit()
        print("✅ Stale tables dropped.")

if __name__ == "__main__":
    drop_tables()
