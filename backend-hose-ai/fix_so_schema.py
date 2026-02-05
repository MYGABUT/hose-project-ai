
import os
import sys
from sqlalchemy import text
from app.core.database import engine

def fix_so_schema():
    print("🔧 Fixing Sales Order Schema...")
    
    with engine.connect() as conn:
        conn.execution_options(isolation_level="AUTOCOMMIT")
        
        # Table: sales_orders
        so_columns = [
            ("subtotal", "NUMERIC(15, 2)", "DEFAULT 0"),
            ("discount", "NUMERIC(15, 2)", "DEFAULT 0"),
            ("tax", "NUMERIC(15, 2)", "DEFAULT 0"),
            ("total", "NUMERIC(15, 2)", "DEFAULT 0"),
            ("dp_amount", "NUMERIC(15, 2)", "DEFAULT 0"),
            ("dp_invoice_id", "INTEGER", "NULL"),
            ("payment_status", "VARCHAR(20)", "DEFAULT 'UNPAID'"),
            ("amount_paid", "NUMERIC(15, 2)", "DEFAULT 0"),
            ("payment_due_date", "TIMESTAMP WITH TIME ZONE", "NULL"),
            ("internal_notes", "TEXT", "NULL"),
            ("approved_by", "VARCHAR(50)", "NULL"),
            ("approved_at", "TIMESTAMP WITH TIME ZONE", "NULL"),
            ("is_deleted", "BOOLEAN", "DEFAULT FALSE")
        ]

        print("\nChecking 'sales_orders' table...")
        for col, dtype, constraints in so_columns:
            try:
                check_sql = text(f"SELECT column_name FROM information_schema.columns WHERE table_name='sales_orders' AND column_name='{col}'")
                result = conn.execute(check_sql).fetchone()
                
                if not result:
                    print(f"  ➕ Adding column '{col}'...")
                    add_sql = text(f"ALTER TABLE sales_orders ADD COLUMN {col} {dtype} {constraints}")
                    conn.execute(add_sql)
                    print(f"  ✅ Added '{col}'")
                else:
                    print(f"  OK: Column '{col}' already exists.")
            except Exception as e:
                print(f"  ⚠️ Error checking/adding {col}: {e}")


        # Table: so_lines
        line_columns = [
            ("product_id", "INTEGER", "NULL"),
            ("hose_product_id", "INTEGER", "NULL"),
            ("fitting_a_id", "INTEGER", "NULL"),
            ("fitting_b_id", "INTEGER", "NULL"),
            ("cut_length", "FLOAT", "NULL"),
            ("qty_produced", "INTEGER", "DEFAULT 0"),
            ("qty_shipped", "INTEGER", "DEFAULT 0"),
            ("unit_price", "NUMERIC(15, 2)", "DEFAULT 0"),
            ("discount", "NUMERIC(15, 2)", "DEFAULT 0"),
            ("line_total", "NUMERIC(15, 2)", "DEFAULT 0"),
            ("is_assembly", "BOOLEAN", "DEFAULT FALSE"),
            ("notes", "TEXT", "NULL")
        ]

        print("\nChecking 'so_lines' table...")
        for col, dtype, constraints in line_columns:
            try:
                check_sql = text(f"SELECT column_name FROM information_schema.columns WHERE table_name='so_lines' AND column_name='{col}'")
                result = conn.execute(check_sql).fetchone()
                
                if not result:
                    print(f"  ➕ Adding column '{col}'...")
                    add_sql = text(f"ALTER TABLE so_lines ADD COLUMN {col} {dtype} {constraints}")
                    conn.execute(add_sql)
                    print(f"  ✅ Added '{col}'")
                else:
                    print(f"  OK: Column '{col}' already exists.")
            except Exception as e:
                print(f"  ⚠️ Error checking/adding {col}: {e}")

    print("✅ SO Schema Fix Complete!")

if __name__ == "__main__":
    sys.path.append(os.getcwd())
    fix_so_schema()
