from app.core.database import engine
from sqlalchemy import text

def add_column():
    print("Connecting to DB...")
    with engine.connect() as conn:
        try:
            # Check if column exists first? SQLite doesn't have easy check, just try ADD
            print("Adding 'type' column to storage_locations...")
            conn.execute(text("ALTER TABLE storage_locations ADD COLUMN type VARCHAR(50) DEFAULT 'HOSE_RACK'"))
            conn.commit()
            print("✅ Column 'type' added successfully.")
        except Exception as e:
            if "duplicate column" in str(e).lower() or "exists" in str(e).lower():
                print("⚠️ Column 'type' already exists.")
            else:
                print(f"❌ Error: {e}")

if __name__ == "__main__":
    add_column()
