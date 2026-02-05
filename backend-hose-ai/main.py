"""
HOSE PRO - Backend AI Scanner
Enterprise FastAPI Application with Strategy Pattern for Hose Detection
"""

import os
# JURUS ANTI CRASH WINDOWS - must be before other imports
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from app.api.v1.endpoints import scan, inventory, locations, batches, sales_orders, job_orders, delivery_orders, products, stock_cards, customers, suppliers, purchase_requests, stock_opname, auth
from app.core.config import settings
from app.core.database import init_db, test_connection


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup
    print("[INFO] Starting HOSE PRO WMS Backend...")
    print("[INFO] Testing PostgreSQL connection...")
    from app.core.database import engine, DATABASE_URL
    print(f"[DEBUG] DB URL (env): {DATABASE_URL}")
    print(f"[DEBUG] ENGINE URL: {engine.url}")
    if test_connection():
        init_db()
    else:
        print("[WARNING] Running without database - inventory features disabled")
    yield
    # Shutdown
    print("[INFO] Shutting down HOSE PRO Backend...")


# Initialize FastAPI App
app = FastAPI(
    title="HOSE PRO WMS",
    description="Enterprise Warehouse Management System for Hydraulic Hose with AI Scanner",
    version="3.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Middleware - Allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # React dev server
        "http://127.0.0.1:5173",
        "https://hosepro.id",     # Production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Static Files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Include API Routers
app.include_router(
    scan.router,
    prefix="/api/v1",
    tags=["Hose Scanner"]
)

app.include_router(
    auth.router,
    prefix="/api/v1",
    tags=["Authentication"]
)

app.include_router(
    inventory.router,
    prefix="/api/v1",
    tags=["Inventory (Legacy)"]
)

app.include_router(
    locations.router,
    prefix="/api/v1",
    tags=["WMS - Locations"]
)

app.include_router(
    batches.router,
    prefix="/api/v1",
    tags=["WMS - Batches"]
)

app.include_router(
    sales_orders.router,
    prefix="/api/v1",
    tags=["WMS - Sales Orders"]
)

app.include_router(
    job_orders.router,
    prefix="/api/v1",
    tags=["WMS - Job Orders"]
)

app.include_router(
    delivery_orders.router,
    prefix="/api/v1",
    tags=["WMS - Delivery Orders"]
)

app.include_router(
    products.router,
    prefix="/api/v1",
    tags=["WMS - Products"]
)

app.include_router(
    stock_cards.router,
    prefix="/api/v1",
    tags=["WMS - Stock Cards"]
)

app.include_router(
    customers.router,
    prefix="/api/v1",
    tags=["WMS - Customers"]
)

app.include_router(
    suppliers.router,
    prefix="/api/v1",
    tags=["WMS - Suppliers & AP"]
)

app.include_router(
    purchase_requests.router,
    prefix="/api/v1",
    tags=["WMS - Purchase Requests"]
)

app.include_router(
    stock_opname.router,
    prefix="/api/v1",
    tags=["WMS - Stock Opname"]
)

from app.api.v1.endpoints import invoices
app.include_router(
    invoices.router,
    prefix="/api/v1",
    tags=["Finance - Invoices"]
)

from app.api.v1.endpoints import reports
app.include_router(
    reports.router,
    prefix="/api/v1",
    tags=["Finance - Reports"]
)

from app.api.v1.endpoints import audit
app.include_router(
    audit.router,
    prefix="/api/v1",
    tags=["Admin - Audit Trail"]
)

from app.api.v1.endpoints import periods
app.include_router(
    periods.router,
    prefix="/api/v1",
    tags=["Admin - Period Lock"]
)

from app.api.v1.endpoints import assets
app.include_router(
    assets.router,
    prefix="/api/v1",
    tags=["Finance - Fixed Assets"]
)

from app.api.v1.endpoints import warehouse_transfer
app.include_router(
    warehouse_transfer.router,
    prefix="/api/v1",
    tags=["Inventory - Warehouse Transfer"]
)

from app.api.v1.endpoints import giro
app.include_router(
    giro.router,
    prefix="/api/v1",
    tags=["Finance - Giro Mundur"]
)

from app.api.v1.endpoints import salesmen
app.include_router(
    salesmen.router,
    prefix="/api/v1",
    tags=["Sales - Salesman & Commission"]
)

from app.api.v1.endpoints import petty_cash
app.include_router(
    petty_cash.router,
    prefix="/api/v1",
    tags=["Finance - Petty Cash"]
)

from app.api.v1.endpoints import efaktur
app.include_router(
    efaktur.router,
    prefix="/api/v1",
    tags=["Reports - Tax"]
)

from app.api.v1.endpoints import loans
app.include_router(
    loans.router,
    prefix="/api/v1",
    tags=["Inventory - Loan"]
)

from app.api.v1.endpoints import bookings
app.include_router(
    bookings.router,
    prefix="/api/v1",
    tags=["Inventory - Booking"]
)

from app.api.v1.endpoints import costing
app.include_router(
    costing.router,
    prefix="/api/v1",
    tags=["Finance - Costing"]
)

from app.api.v1.endpoints import projects
app.include_router(
    projects.router,
    prefix="/api/v1",
    tags=["Projects & Service"]
)

from app.api.v1.endpoints import assembly
app.include_router(
    assembly.router,
    prefix="/api/v1",
    tags=["Production - Assembly"]
)

from app.api.v1.endpoints import sales_swap
app.include_router(
    sales_swap.router,
    prefix="/api/v1",
    tags=["Sales - Swap"]
)

from app.api.v1.endpoints import traceability
app.include_router(
    traceability.router,
    prefix="/api/v1",
    tags=["Analytics - Traceability"]
)

from app.api.v1.endpoints import analytics
app.include_router(
    analytics.router,
    prefix="/api/v1",
    tags=["Analytics - General"]
)

from app.api.v1.endpoints import rma
app.include_router(
    rma.router,
    prefix="/api/v1",
    tags=["RMA - Returns"]
)

from app.api.v1.endpoints import assets
app.include_router(
    assets.router,
    prefix="/api/v1",
    tags=["Assets - Predictive"]
)

from app.api.v1.endpoints import pricing
app.include_router(
    pricing.router,
    prefix="/api/v1",
    tags=["Pricing - Management"]
)

from app.api.v1.endpoints import opname
app.include_router(
    opname.router,
    prefix="/api/v1",
    tags=["Opname - Audit"]
)

from app.api.v1.endpoints import users
app.include_router(
    users.router,
    prefix="/api/v1",
    tags=["Users & Auth"]
)
from app.api.v1.endpoints import qc
app.include_router(
    qc.router,
    prefix="/api/v1",
    tags=["Production - Quality Control"]
)
@app.get("/")
async def root():
    return {
        "message": "[INFO] HOSE PRO AI Scanner API",
        "version": "2.0.0",
        "docs": "/docs",
        "status": "online",
        "features": ["AI Scanner", "Multi-Photo", "Inventory Management"]
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "hose-ai-scanner",
        "database": "postgresql"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
