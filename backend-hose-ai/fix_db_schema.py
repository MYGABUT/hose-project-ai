
import os
import sys
from sqlalchemy import text
from app.core.database import engine

def fix_schema():
    print("🔧 Fixing Database Schema...")
    
    with engine.connect() as conn:
        conn.execution_options(isolation_level="AUTOCOMMIT")
        
        # List of columns to check and add if missing
        columns = [
            # Column Name, Data Type, Default/Nullable
            ("sku", "VARCHAR(50)", "DEFAULT 'SKU-' || gen_random_uuid()::text"), # Ensure SKU exists
            ("search_keywords", "TEXT", "DEFAULT ''"),
            ("created_at", "TIMESTAMPTZ", "DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ", "NULL"),
            ("is_serialized", "BOOLEAN", "DEFAULT FALSE"), # Missing column causing crash
            ("alt_unit", "VARCHAR(20)", "NULL"),
            ("conversion_factor", "NUMERIC(10, 2)", "NULL"),
            ("specifications", "JSON", "DEFAULT '{}'"),
            ("cost_price", "INTEGER", "NULL"),
            ("sell_price", "INTEGER", "NULL"),
            ("min_stock", "INTEGER", "DEFAULT 0"),
            ("max_stock", "INTEGER", "NULL"),
            ("reorder_point", "INTEGER", "NULL"),
            ("is_active", "BOOLEAN", "DEFAULT TRUE"),
            ("is_sellable", "BOOLEAN", "DEFAULT TRUE"),
            ("is_purchasable", "BOOLEAN", "DEFAULT TRUE"),
            ("unit", "VARCHAR(20)", "DEFAULT 'METER'"), # Ensure unit exists as text if enum fails
            ("brand", "VARCHAR(50)", "NULL"),
            ("category", "VARCHAR(50)", "NULL")
        ]

        for col, dtype, constraints in columns:
            try:
                print(f"Checking column 'products.{col}'...")
                # Attempt to add column. If it exists, this will fail (handled by catch) 
                # or we can check existence first.
                # Postgres "ADD COLUMN IF NOT EXISTS" is supported in newer versions (9.6+), 
                # but let's use a safe checking block for older or generic compat.
                
                check_sql = text(f"SELECT column_name FROM information_schema.columns WHERE table_name='products' AND column_name='{col}'")
                result = conn.execute(check_sql).fetchone()
                
                if not result:
                    print(f"  ➕ Adding column '{col}'...")
                    add_sql = text(f"ALTER TABLE products ADD COLUMN {col} {dtype} {constraints}")
                    conn.execute(add_sql)
                    print(f"  ✅ Added '{col}'")
                else:
                    print(f"  OK: Column '{col}' already exists.")

            except Exception as e:
                print(f"  ⚠️ Error checking/adding {col}: {e}")

        # Fix Enum columns if they were created as VARCHAR but mapped as ENUM in code, or vice versa
        # For now, we assume simple types work.

    print("✅ Schema Fix Complete!")

if __name__ == "__main__":
    # Ensure import paths work
    sys.path.append(os.getcwd())
    fix_schema()
