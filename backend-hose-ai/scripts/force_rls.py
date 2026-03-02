import sys
import os
from sqlalchemy import create_engine, text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core.config import settings

def force_rls():
    print("Forces RLS...")
    # Connect as Superuser
    engine = create_engine(settings.DATABASE_URL)
    with engine.connect() as conn:
        print("1. Enabling RLS on inventory_batches...")
        conn.execute(text("ALTER TABLE inventory_batches ENABLE ROW LEVEL SECURITY"))
        
        print("2. Recreating Policy...")
        conn.execute(text("DROP POLICY IF EXISTS inventory_batches_isolation_policy ON inventory_batches"))
        sql = """
        CREATE POLICY inventory_batches_isolation_policy ON inventory_batches
        USING (
            owner_id = current_setting('app.current_company_id', true)::integer
        )
        WITH CHECK (
            owner_id = current_setting('app.current_company_id', true)::integer
        )
        """
        conn.execute(text(sql))
        
        print("3. Checking Policy Count...")
        count = conn.execute(text("SELECT COUNT(*) FROM pg_policy WHERE polrelid = 'inventory_batches'::regclass")).scalar()
        print(f"Policy Count: {count}")
        
        conn.commit()
    print("DONE.")

if __name__ == "__main__":
    force_rls()
