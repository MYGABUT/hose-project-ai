"""
PostgreSQL Database Configuration
"""
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# PostgreSQL Connection
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgress@localhost:5432/hose_pro_db"
)

# Create engine with client encoding
engine = create_engine(
    DATABASE_URL, 
    pool_pre_ping=True,
    connect_args={"client_encoding": "utf8"}
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


def get_db():
    """Dependency for getting database session."""
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        print(f"[ERROR] Database Session Error: {e}")
        with open("db_error.log", "w") as f:
            f.write(str(e))
        raise e
    finally:
        db.close()


def init_db():
    """Initialize database tables."""
    # Import all models to register them
    from app.models import (
        StorageLocation,
        Product,
        ProductAlias,
        InventoryBatch,
        BatchMovement,
        Customer,
        Supplier,
        SalesOrder,
        PurchaseOrder,
        PurchaseRequest,
        Project,
        WorkOrder,
        User,
        # Import others to ensure tables are created
        salesman,
        giro,
        petty_cash,
        journal,
        fixed_asset,
        stock_opname,
        delivery_order,
        job_order,
        stock_booking,
        product_loan,
        rma
    )
    Base.metadata.create_all(bind=engine)
    print("[SUCCESS] PostgreSQL database tables created!")


def test_connection():
    """Test database connection."""
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            result.fetchone()
        print("[SUCCESS] PostgreSQL connection successful!")
        return True
    except Exception as e:
        print(f"❌ PostgreSQL connection failed: {e}")
        return False

