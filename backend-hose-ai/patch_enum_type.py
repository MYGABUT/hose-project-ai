from app.core.database import engine
from sqlalchemy import text

def patch_enum():
    print("Connecting to DB...")
    with engine.connect() as conn:
        try:
            # Need to disable transaction block for ALTER TYPE ADD VALUE in some Postgres versions?
            # Or just execute via autocommit transaction.
            # But SQLAlchemy 'connect' might start transaction.
            # We try standard execution.
            print("Adding 'ASSEMBLY_RESULT' to movementtype enum...")
            conn.execute(text("ALTER TYPE movementtype ADD VALUE 'ASSEMBLY_RESULT'"))
            conn.commit()
            print("✅ Enum updated successfully.")
        except Exception as e:
            if "duplicate check" in str(e).lower() or "already exists" in str(e).lower():
                 print("⚠️ Enum value already exists.")
            else:
                 print(f"❌ Error: {e}")

if __name__ == "__main__":
    patch_enum()
