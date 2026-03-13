"""
HOSE PRO - Backend AI Scanner
Enterprise FastAPI Application with Strategy Pattern for Hose Detection
"""

import os
# JURUS ANTI CRASH WINDOWS - must be before other imports
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.middleware import SecurityHeadersMiddleware, AuditLogMiddleware, BruteForceProtectionMiddleware
from app.core.request_shield import RequestShieldMiddleware
from app.core.rate_limiter import limiter
from app.core.config import settings
from app.core.database import init_db, test_connection

# ============ Import ALL endpoint routers ============
from app.api.v1.endpoints import (
    scan, auth, locations, batches, sales_orders, job_orders,
    delivery_orders, products, stock_cards, customers, suppliers,
    purchase_requests, invoice_ingest, reports, audit, periods,
    assets, warehouse_transfer, giro, salesmen, petty_cash, efaktur,
    loans, bookings, costing, projects, assembly, sales_swap,
    traceability, analytics, rma, pricing, opname, users, qc,
    import_export, sync, search, activity_log, invoices, journals,
    invoice_ingestion, rack_management, crm, sales_intelligence,
    smart_quotation, smart_procurement, warehouse_velocity,
    production_security, honeypot, jo_profitability, jo_disassembly,
    so_payments, product_pricing, intercompany_loans, blanket_orders
)
from app.api.v1.endpoints import settings as settings_endpoints


# ============ Router Registry ============
# Each entry: (router, prefix, tags)
# Duplicates removed: assets (was 2x), activity_log import (was 2x)
ROUTER_REGISTRY = [
    # Core
    (scan.router,               "/api/v1",                      ["Hose Scanner"]),
    (auth.router,               "/api/v1",                      ["Auth"]),
    (users.router,              "/api/v1",                      ["Users & Auth"]),
    (settings_endpoints.router, "/api/v1/settings",             ["System Settings"]),
    (search.router,             "/api/v1/search",               ["Search"]),
    (activity_log.router,       "/api/v1/activity-logs",        ["Activity Logs"]),
    (import_export.router,      "/api/v1",                      ["Import/Export"]),
    (sync.router,               "/api/v1",                      ["Google Sheets Sync"]),

    # Inventory & Warehouse
    (locations.router,          "/api/v1",                      ["WMS - Locations"]),
    (batches.router,            "/api/v1",                      ["WMS - Batches"]),
    (stock_cards.router,        "/api/v1",                      ["WMS - Stock Cards"]),
    (products.router,           "/api/v1",                      ["WMS - Products"]),
    (opname.router,             "/api/v1",                      ["Inventory - Stock Opname"]),
    (warehouse_transfer.router, "/api/v1",                      ["Inventory - Warehouse Transfer"]),
    (rack_management.router,    "/api/v1",                      ["Warehouse - Rack Management"]),
    (loans.router,              "/api/v1",                      ["Inventory - Loan"]),
    (intercompany_loans.router, "/api/v1",                      ["Inventory - B2B Sync"]),
    (blanket_orders.router,     "/api/v1",                      ["Sales - Blanket Orders"]),
    (bookings.router,           "/api/v1",                      ["Inventory - Booking"]),
    (warehouse_velocity.router, "/api/v1",                      ["Warehouse Velocity"]),

    # Sales & CRM
    (sales_orders.router,       "/api/v1",                      ["WMS - Sales Orders"]),
    (so_payments.router,        "/api/v1",                      ["SO Payments & Piutang"]),
    (salesmen.router,           "/api/v1",                      ["Sales - Salesman & Commission"]),
    (customers.router,          "/api/v1",                      ["WMS - Customers"]),
    (crm.router,                "/api/v1/crm",                  ["Sales - CRM"]),
    (sales_intelligence.router, "/api/v1",                      ["Sales Intelligence"]),
    (smart_quotation.router,    "/api/v1",                      ["Smart Quotation"]),
    (sales_swap.router,         "/api/v1",                      ["Sales - Swap"]),

    # Purchasing & Suppliers
    (purchase_requests.router,  "/api/v1",                      ["WMS - Purchase Requests"]),
    (suppliers.router,          "/api/v1",                      ["WMS - Suppliers & AP"]),
    (smart_procurement.router,  "/api/v1",                      ["Smart Procurement"]),

    # Production
    (job_orders.router,         "/api/v1",                      ["WMS - Job Orders"]),
    (jo_profitability.router,   "/api/v1",                      ["JO Profitability"]),
    (jo_disassembly.router,     "/api/v1",                      ["JO Disassembly"]),
    (assembly.router,           "/api/v1",                      ["Production - Assembly"]),
    (qc.router,                 "/api/v1",                      ["Production - Quality Control"]),
    (production_security.router,"/api/v1",                      ["Production Security"]),

    # Outbound
    (delivery_orders.router,    "/api/v1",                      ["WMS - Delivery Orders"]),

    # Finance
    (invoices.router,           "/api/v1/invoices",             ["Sales - Invoices"]),
    (invoice_ingest.router,     "/api/v1",                      ["Smart Invoicing - Ingestion"]),
    (invoice_ingestion.router,  "/api/v1/invoice-ingestion",    ["Finance - Invoice OCR"]),
    (journals.router,           "/api/v1",                      ["Core Financials - GL"]),
    (reports.router,            "/api/v1",                      ["Finance - Reports"]),
    (giro.router,               "/api/v1",                      ["Finance - Giro Mundur"]),
    (petty_cash.router,         "/api/v1",                      ["Finance - Petty Cash"]),
    (costing.router,            "/api/v1",                      ["Finance - Costing"]),
    (efaktur.router,            "/api/v1",                      ["Reports - Tax"]),
    (pricing.router,            "/api/v1",                      ["Pricing - Management"]),
    (product_pricing.router,    "/api/v1",                      ["Product Pricing"]),

    # Admin & Audit
    (audit.router,              "/api/v1",                      ["Admin - Audit Trail"]),
    (periods.router,            "/api/v1",                      ["Admin - Period Lock"]),
    (assets.router,             "/api/v1",                      ["Finance - Fixed Assets"]),

    # Analytics
    (analytics.router,          "/api/v1",                      ["Analytics - General"]),
    (traceability.router,       "/api/v1",                      ["Analytics - Traceability"]),

    # Projects & RMA
    (projects.router,           "/api/v1",                      ["Projects & Service"]),
    (rma.router,                "/api/v1",                      ["RMA - Returns"]),

    # Security
    (honeypot.router,           "",                             ["Honeypot"]),
]


# ============ Lifecycle ============

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
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
    print("[INFO] Shutting down HOSE PRO Backend...")


# ============ App Init ============

app = FastAPI(
    title="HOSE PRO WMS",
    description="Enterprise Warehouse Management System for Hydraulic Hose with AI Scanner",
    version="3.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
    lifespan=lifespan
)

# Rate Limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ============ Middleware Stack (last added = first executed) ============

app.add_middleware(RequestShieldMiddleware)
app.add_middleware(AuditLogMiddleware)
app.add_middleware(BruteForceProtectionMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

if settings.DEBUG:
    allowed_origins = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "https://hosepro.id",
    ]
else:
    allowed_origins = [
        "https://hosepro.id",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============ Static Files ============

app.mount("/static", StaticFiles(directory="static"), name="static")


# ============ Register All Routers ============

for router, prefix, tags in ROUTER_REGISTRY:
    app.include_router(router, prefix=prefix, tags=tags)

# GraphQL (optional)
try:
    from app.graphql.schema import graphql_router
    app.include_router(graphql_router, prefix="/graphql", tags=["GraphQL"])
    print("[INFO] GraphQL endpoint mounted at /graphql")
except ImportError as e:
    print(f"[INFO] GraphQL not available: {e}")


# ============ Health Endpoints ============

@app.get("/")
async def root():
    return {
        "message": "HOSE PRO AI Scanner API",
        "version": "3.0.0",
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
        reload=False
    )
