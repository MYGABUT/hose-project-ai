
from sqlalchemy import create_engine, inspect
from app.core.database import DATABASE_URL

engine = create_engine(DATABASE_URL)
inspector = inspect(engine)

table_name = "batch_movements"

print(f"Checking columns for {table_name}...")
if inspector.has_table(table_name):
    print(f"✅ Table '{table_name}' exists.")
    columns = [c['name'] for c in inspector.get_columns(table_name)]
    print(f"Columns: {columns}")
    
    expected = ['unit_cost', 'total_value']
    missing = [col for col in expected if col not in columns]
    
    if missing:
        print(f"❌ MISSING COLUMNS: {missing}")
    else:
        print("✅ All Cost/Value columns present.")
else:
    print(f"❌ Table '{table_name}' does not exist!")

# Also check Postgres Enum types if they exist
# but native_enum=False creates VARCHAR + CHECK usually
