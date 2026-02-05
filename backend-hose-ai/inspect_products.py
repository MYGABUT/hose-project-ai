import os
import sys
from sqlalchemy import text, inspect
from app.core.database import engine

def check_structure():
    print("🔍 Inspecting 'products' table structure...")
    inspector = inspect(engine)
    columns = inspector.get_columns('products')
    
    found_sku = False
    found_updated = False
    for col in columns:
        print(f" - {col['name']} ({col['type']})")
        if col['name'] == 'sku':
            found_sku = True
        if col['name'] == 'updated_at':
            found_updated = True
            
    if not found_sku:
        print("\n❌ CRITICAL: 'sku' column is MISSING!")
    
    if not found_updated:
        print("\n❌ CRITICAL: 'updated_at' column is MISSING!")
        
        # Try to add it forcefully with a simpler default
        print("🛠️ Attempting emergency fix...")
        with engine.connect() as conn:
            conn.execution_options(isolation_level="AUTOCOMMIT")
            try:
                # Use a simpler default that doesn't rely on gen_random_uuid() if pgcrypto isn't there
                # just use a random number or timestamp
                sql = text("ALTER TABLE products ADD COLUMN sku VARCHAR(50) DEFAULT 'SKU-' || cast(floor(random()*1000000) as text)")
                conn.execute(sql)
                print("✅ Emergency fix executed. Column added.")
            except Exception as e:
                print(f"❌ Emergency fix failed: {e}")
                # Try adding without default, then update
                try:
                    print("⚠️ Retrying without default...")
                    conn.execute(text("ALTER TABLE products ADD COLUMN sku VARCHAR(50)"))
                    conn.execute(text("UPDATE products SET sku = 'SKU-' || id WHERE sku IS NULL"))
                    conn.execute(text("ALTER TABLE products ALTER COLUMN sku SET NOT NULL"))
                    print("✅ Retry successful.")
                except Exception as e2:
                    print(f"❌ Retry failed: {e2}")

    else:
        print("\n✅ 'sku' column exists.")

if __name__ == "__main__":
    sys.path.append(os.getcwd())
    check_structure()
