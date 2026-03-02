import sys
import os
from sqlalchemy import create_engine, text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core.config import settings

def check_status():
    print("Status Check...")
    engine = create_engine(settings.DATABASE_URL)
    with engine.connect() as conn:
        # 1. User Privileges
        user = conn.execute(text("SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname='hose_app'")).fetchone()
        print(f"User: {user[0]}, Super: {user[1]}, BypassRLS: {user[2]}")
        
        # 2. Table RLS Status
        table = conn.execute(text("SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname='inventory_batches'")).fetchone()
        print(f"Table: {table[0]}, RLS: {table[1]}, Force: {table[2]}")
        
        # 3. Policy Count
        count = conn.execute(text("SELECT COUNT(*) FROM pg_policy WHERE polrelid = 'inventory_batches'::regclass")).scalar()
        print(f"Policy Count: {count}")
        
        # 4. Visible Rows (as Superuser) to confirm total
        total = conn.execute(text("SELECT COUNT(*) FROM inventory_batches")).scalar()
        print(f"Total Rows (Superuser): {total}")

if __name__ == "__main__":
    check_status()
