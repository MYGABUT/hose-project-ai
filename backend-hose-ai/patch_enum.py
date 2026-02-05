
from sqlalchemy import create_engine, text
from app.core.database import DATABASE_URL

engine = create_engine(DATABASE_URL)

# Note: 'ALTER TYPE ... ADD VALUE' cannot run inside a transaction block in some Postgres versions/setups, 
# but usually works if autocommit is ON or handled correctly. 
# SQLAlchemy 'execute' might wrap in transaction. We need to force commit or isolation level.

sql = """
ALTER TYPE batchstatus ADD VALUE IF NOT EXISTS 'QC_PENDING';
"""

try:
    with engine.connect() as conn:
        # Commit any open transaction
        conn.commit()
        # Execute in auto-commit mode or separate transaction
        conn.execution_options(isolation_level="AUTOCOMMIT").execute(text(sql))
    print("✅ Successfully patched batchstatus enum.")
except Exception as e:
    print(f"❌ Patch failed: {e}")
