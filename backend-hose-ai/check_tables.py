
from sqlalchemy import create_engine, inspect
from app.core.database import DATABASE_URL

engine = create_engine(DATABASE_URL)
inspector = inspect(engine)

print("Connected to Database. Listing all tables:")
try:
    tables = inspector.get_table_names()
    print(tables)

    required = ['salesmen', 'projects', 'work_orders']
    for table in required:
        if table in tables:
            print(f"✅ Table '{table}' exists.")
        else:
            print(f"❌ Table '{table}' MISSING.")
except Exception as e:
    print(f"Error: {e}")
