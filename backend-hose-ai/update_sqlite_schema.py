from sqlalchemy import create_engine, text
import os

# Force SQLite URI targeting the local file
DATABASE_URL = "sqlite:///./sql_app.db"

def add_column():
    print(f"Connecting to {DATABASE_URL}...")
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        try:
            print("Adding 'type' column to storage_locations...")
            conn.execute(text("ALTER TABLE storage_locations ADD COLUMN type VARCHAR(50) DEFAULT 'HOSE_RACK'"))
            # SQLite does not always require commit for DDL, but good to ensure
            print("✅ Column 'type' added successfully to SQLite.")
        except Exception as e:
            if "duplicate column" in str(e).lower() or "exists" in str(e).lower():
                print("⚠️ Column 'type' already exists.")
            else:
                print(f"❌ Error: {e}")

if __name__ == "__main__":
    add_column()
