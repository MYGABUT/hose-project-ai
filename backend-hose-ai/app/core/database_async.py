"""
PostgreSQL Async Database Configuration
Provides AsyncSession for GraphQL and high-concurrency endpoints.
The existing sync database.py remains untouched for backward compatibility.
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.config import settings


# Async Engine (uses asyncpg driver)
async_engine = create_async_engine(
    settings.DATABASE_URL_ASYNC,
    pool_pre_ping=True,
    pool_size=20,
    max_overflow=10,
    echo=False,
)

# Async Session Factory
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_async_db():
    """FastAPI Dependency for async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception as e:
            await session.rollback()
            raise e
        finally:
            await session.close()


async def test_async_connection() -> bool:
    """Test async database connection."""
    try:
        from sqlalchemy import text
        async with async_engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            result.fetchone()
        print("[SUCCESS] Async PostgreSQL connection successful!")
        return True
    except Exception as e:
        print(f"⚠️ Async PostgreSQL connection failed: {e}")
        print("[INFO] Falling back to sync-only mode. Install asyncpg: pip install asyncpg")
        return False
