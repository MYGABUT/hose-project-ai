
import os
import sys
from sqlalchemy import text
from app.core.database import engine

def fix_jo_schema():
    print("🔧 Fixing Job Order Schema...")
    
    with engine.connect() as conn:
        conn.execution_options(isolation_level="AUTOCOMMIT")
        
        # Table: job_orders
        jo_columns = [
            ("so_id", "INTEGER", "NULL"),
            ("priority", "INTEGER", "DEFAULT 3"),
            ("assigned_to", "VARCHAR(100)", "NULL"),
            ("workstation", "VARCHAR(50)", "NULL"),
            ("start_date", "TIMESTAMP WITH TIME ZONE", "NULL"),
            ("due_date", "TIMESTAMP WITH TIME ZONE", "NULL"),
            ("started_at", "TIMESTAMP WITH TIME ZONE", "NULL"),
            ("completed_at", "TIMESTAMP WITH TIME ZONE", "NULL"),
            ("current_step", "INTEGER", "DEFAULT 0"),
            ("total_steps", "INTEGER", "DEFAULT 0"),
            ("total_hpp", "INTEGER", "DEFAULT 0"),
            ("notes", "TEXT", "NULL"),
            ("created_by", "VARCHAR(50)", "NULL")
        ]

        print("\nChecking 'job_orders' table...")
        for col, dtype, constraints in jo_columns:
            try:
                check_sql = text(f"SELECT column_name FROM information_schema.columns WHERE table_name='job_orders' AND column_name='{col}'")
                result = conn.execute(check_sql).fetchone()
                
                if not result:
                    print(f"  ➕ Adding column '{col}'...")
                    add_sql = text(f"ALTER TABLE job_orders ADD COLUMN {col} {dtype} {constraints}")
                    conn.execute(add_sql)
                    print(f"  ✅ Added '{col}'")
                else:
                    print(f"  OK: Column '{col}' already exists.")
            except Exception as e:
                print(f"  ⚠️ Error checking/adding {col}: {e}")


        # Table: jo_lines
        line_columns = [
            ("so_line_id", "INTEGER", "NULL"),
            ("product_id", "INTEGER", "NULL"),
            ("hose_type", "VARCHAR(50)", "NULL"),
            ("hose_size", "VARCHAR(20)", "NULL"),
            ("cut_length", "FLOAT", "NULL"),
            ("fitting_a_code", "VARCHAR(50)", "NULL"),
            ("fitting_b_code", "VARCHAR(50)", "NULL"),
            ("qty_ordered", "INTEGER", "DEFAULT 1"),
            ("qty_completed", "INTEGER", "DEFAULT 0"),
            ("total_hose_length", "FLOAT", "NULL"),
            ("notes", "TEXT", "NULL"),
            ("line_hpp", "INTEGER", "DEFAULT 0"),
            ("hose_cost", "INTEGER", "DEFAULT 0"),
            ("fitting_a_cost", "INTEGER", "DEFAULT 0"),
            ("fitting_b_cost", "INTEGER", "DEFAULT 0"),
            ("labor_cost", "INTEGER", "DEFAULT 0")
        ]

        print("\nChecking 'jo_lines' table...")
        for col, dtype, constraints in line_columns:
            try:
                check_sql = text(f"SELECT column_name FROM information_schema.columns WHERE table_name='jo_lines' AND column_name='{col}'")
                result = conn.execute(check_sql).fetchone()
                
                if not result:
                    print(f"  ➕ Adding column '{col}'...")
                    add_sql = text(f"ALTER TABLE jo_lines ADD COLUMN {col} {dtype} {constraints}")
                    conn.execute(add_sql)
                    print(f"  ✅ Added '{col}'")
                else:
                    print(f"  OK: Column '{col}' already exists.")
            except Exception as e:
                print(f"  ⚠️ Error checking/adding {col}: {e}")

        # Table: jo_materials
        # Checks if table exists first, if not it's likely created by app restart but just in case
        try:
             check_table_sql = text("SELECT to_regclass('jo_materials')")
             table_exists = conn.execute(check_table_sql).fetchone()[0]
             
             if not table_exists:
                 print("\n⚠️ 'jo_materials' table missing. Ensure valid migration/init via app or manual SQL.")
             else:
                mat_columns = [
                    ("jo_line_id", "INTEGER", "NULL"),
                    ("batch_id", "INTEGER", "NULL"),
                    ("sequence_order", "INTEGER", "DEFAULT 1"),
                    ("allocated_qty", "FLOAT", "NULL"),
                    ("consumed_qty", "FLOAT", "DEFAULT 0"),
                    ("status", "VARCHAR(20)", "DEFAULT 'ALLOCATED'"),
                    ("allocated_at", "TIMESTAMP WITH TIME ZONE", "DEFAULT NOW()"),
                    ("picked_at", "TIMESTAMP WITH TIME ZONE", "NULL"),
                    ("consumed_at", "TIMESTAMP WITH TIME ZONE", "NULL")
                ]
                print("\nChecking 'jo_materials' table...")
                for col, dtype, constraints in mat_columns:
                    try:
                        check_sql = text(f"SELECT column_name FROM information_schema.columns WHERE table_name='jo_materials' AND column_name='{col}'")
                        result = conn.execute(check_sql).fetchone()
                        
                        if not result:
                            print(f"  ➕ Adding column '{col}'...")
                            add_sql = text(f"ALTER TABLE jo_materials ADD COLUMN {col} {dtype} {constraints}")
                            conn.execute(add_sql)
                            print(f"  ✅ Added '{col}'")
                        else:
                             print(f"  OK: Column '{col}' already exists.")
                    except Exception as e:
                        print(f"  ⚠️ Error checking/adding {col}: {e}")

        except Exception as e:
            print(f"Error validating jo_materials: {e}")

    print("✅ JO Schema Fix Complete!")

if __name__ == "__main__":
    sys.path.append(os.getcwd())
    fix_jo_schema()
