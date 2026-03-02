"""
HosePro WMS - GraphQL Schema
Hybrid REST + GraphQL architecture — GraphQL for composite/dashboard views.
Uses Strawberry for async-native GraphQL with FastAPI integration.
"""
import strawberry
from strawberry.fastapi import GraphQLRouter
from typing import Optional, List
from datetime import datetime, timedelta

from sqlalchemy import func, text, select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database_async import get_async_db


# ============ Types ============

@strawberry.type
class SalesSummary:
    """Sales module overview"""
    total_orders: int = 0
    total_revenue: float = 0.0
    pending_orders: int = 0
    confirmed_orders: int = 0
    completed_orders: int = 0
    cancelled_orders: int = 0
    avg_order_value: float = 0.0


@strawberry.type
class ProductionSummary:
    """Production/Job Order overview"""
    active_jobs: int = 0
    completed_jobs: int = 0
    in_progress_jobs: int = 0
    total_pending_qty: int = 0
    overdue_jobs: int = 0


@strawberry.type
class InventorySummary:
    """Inventory overview"""
    total_skus: int = 0
    total_batches: int = 0
    low_stock_count: int = 0
    total_stock_value: float = 0.0


@strawberry.type
class PurchaseSummary:
    """Purchase module overview"""
    total_pos: int = 0
    pending_pos: int = 0
    total_outstanding: float = 0.0


@strawberry.type
class FinancialSummary:
    """Financial overview"""
    total_receivable: float = 0.0
    total_payable: float = 0.0
    net_position: float = 0.0


@strawberry.type
class ActivityEvent:
    """Single activity event"""
    event_type: str
    icon: str
    action: str
    description: str
    reference: str
    timestamp: Optional[str] = None


@strawberry.type
class DashboardStats:
    """Executive Dashboard — all stats in one query"""
    sales: SalesSummary
    production: ProductionSummary
    inventory: InventorySummary
    purchase: PurchaseSummary
    financial: FinancialSummary
    recent_activity: List[ActivityEvent]


# ============ Resolvers ============

async def resolve_sales(db: AsyncSession, days: int) -> SalesSummary:
    """Fetch sales stats via raw SQL for maximum performance."""
    cutoff = datetime.now() - timedelta(days=days)
    
    result = await db.execute(text("""
        SELECT
            COUNT(*) as total_orders,
            COALESCE(SUM(total), 0) as total_revenue,
            COUNT(*) FILTER (WHERE status = 'DRAFT') as pending,
            COUNT(*) FILTER (WHERE status = 'CONFIRMED') as confirmed,
            COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed,
            COUNT(*) FILTER (WHERE status = 'CANCELLED') as cancelled,
            COALESCE(AVG(total), 0) as avg_value
        FROM sales_orders
        WHERE is_deleted = false AND created_at >= :cutoff
    """), {"cutoff": cutoff})
    
    row = result.fetchone()
    if not row:
        return SalesSummary()
    
    return SalesSummary(
        total_orders=row[0] or 0,
        total_revenue=float(row[1] or 0),
        pending_orders=row[2] or 0,
        confirmed_orders=row[3] or 0,
        completed_orders=row[4] or 0,
        cancelled_orders=row[5] or 0,
        avg_order_value=float(row[6] or 0),
    )


async def resolve_production(db: AsyncSession, days: int) -> ProductionSummary:
    cutoff = datetime.now() - timedelta(days=days)
    
    result = await db.execute(text("""
        SELECT
            COUNT(*) FILTER (WHERE status NOT IN ('COMPLETED', 'CANCELLED')) as active,
            COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed,
            COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') as in_progress,
            COALESCE(SUM(
                CASE WHEN status NOT IN ('COMPLETED', 'CANCELLED')
                THEN (SELECT COALESCE(SUM(jl.qty_ordered - jl.qty_completed), 0)
                      FROM jo_lines jl WHERE jl.jo_id = job_orders.id)
                ELSE 0 END
            ), 0) as pending_qty,
            COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('COMPLETED', 'CANCELLED')) as overdue
        FROM job_orders
        WHERE created_at >= :cutoff
    """), {"cutoff": cutoff})
    
    row = result.fetchone()
    if not row:
        return ProductionSummary()
    
    return ProductionSummary(
        active_jobs=row[0] or 0,
        completed_jobs=row[1] or 0,
        in_progress_jobs=row[2] or 0,
        total_pending_qty=int(row[3] or 0),
        overdue_jobs=row[4] or 0,
    )


async def resolve_inventory(db: AsyncSession) -> InventorySummary:
    result = await db.execute(text("""
        SELECT
            (SELECT COUNT(*) FROM products WHERE is_active = true) as total_skus,
            COUNT(*) as total_batches,
            (SELECT COUNT(*) FROM products p WHERE p.is_active = true AND p.min_stock > 0
             AND (SELECT COALESCE(SUM(ib.current_qty), 0) FROM inventory_batches ib
                  WHERE ib.product_id = p.id AND ib.is_deleted = false) < p.min_stock
            ) as low_stock,
            COALESCE(SUM(current_qty * COALESCE(cost_price, 0)), 0) as stock_value
        FROM inventory_batches
        WHERE is_deleted = false AND current_qty > 0
    """))
    
    row = result.fetchone()
    if not row:
        return InventorySummary()
    
    return InventorySummary(
        total_skus=row[0] or 0,
        total_batches=row[1] or 0,
        low_stock_count=row[2] or 0,
        total_stock_value=float(row[3] or 0),
    )


async def resolve_purchase(db: AsyncSession, days: int) -> PurchaseSummary:
    cutoff = datetime.now() - timedelta(days=days)
    
    result = await db.execute(text("""
        SELECT
            COUNT(*) as total_pos,
            COUNT(*) FILTER (WHERE status IN ('DRAFT', 'APPROVED', 'ORDERED')) as pending,
            COALESCE(SUM(total - amount_paid) FILTER (WHERE payment_status != 'PAID'), 0) as outstanding
        FROM purchase_orders
        WHERE is_deleted = false AND created_at >= :cutoff
    """), {"cutoff": cutoff})
    
    row = result.fetchone()
    if not row:
        return PurchaseSummary()
    
    return PurchaseSummary(
        total_pos=row[0] or 0,
        pending_pos=row[1] or 0,
        total_outstanding=float(row[2] or 0),
    )


async def resolve_financial(db: AsyncSession) -> FinancialSummary:
    result = await db.execute(text("""
        SELECT
            (SELECT COALESCE(SUM(total - amount_paid), 0) FROM sales_orders
             WHERE is_deleted = false AND payment_status != 'PAID') as receivable,
            (SELECT COALESCE(SUM(total - amount_paid), 0) FROM purchase_orders
             WHERE is_deleted = false AND payment_status != 'PAID') as payable
    """))
    
    row = result.fetchone()
    receivable = float(row[0] or 0) if row else 0
    payable = float(row[1] or 0) if row else 0
    
    return FinancialSummary(
        total_receivable=receivable,
        total_payable=payable,
        net_position=receivable - payable,
    )


async def resolve_activity(db: AsyncSession, limit: int) -> List[ActivityEvent]:
    result = await db.execute(text("""
        (SELECT 'sales' as type, '📝' as icon,
                CASE status WHEN 'CONFIRMED' THEN 'SO Confirmed'
                            WHEN 'CANCELLED' THEN 'SO Cancelled'
                            ELSE 'SO Created' END as action,
                so_number || ' — ' || customer_name as description,
                so_number as reference,
                created_at as ts
         FROM sales_orders WHERE is_deleted = false
         ORDER BY created_at DESC LIMIT :lim)
        UNION ALL
        (SELECT 'production', '🔧',
                CASE status WHEN 'COMPLETED' THEN 'JO Completed'
                            WHEN 'IN_PROGRESS' THEN 'JO In Progress'
                            ELSE 'JO Created' END,
                jo_number || ' — ' || COALESCE(assigned_to, 'Unassigned'),
                jo_number, created_at
         FROM job_orders ORDER BY created_at DESC LIMIT :lim)
        ORDER BY ts DESC LIMIT :lim
    """), {"lim": limit})
    
    events = []
    for row in result.fetchall():
        events.append(ActivityEvent(
            event_type=row[0],
            icon=row[1],
            action=row[2],
            description=row[3],
            reference=row[4],
            timestamp=row[5].isoformat() if row[5] else None,
        ))
    return events


# ============ Root Query ============

@strawberry.type
class Query:
    @strawberry.field(description="📊 Executive Dashboard — all stats in one query")
    async def dashboard(
        self,
        days: int = 30,
        activity_limit: int = 10,
    ) -> DashboardStats:
        """
        Single query to get everything the Executive Dashboard needs.
        Instead of 5+ REST calls, 1 GraphQL query.
        """
        from app.core.database_async import AsyncSessionLocal
        
        async with AsyncSessionLocal() as db:
            # Run all resolvers concurrently with asyncio.gather
            import asyncio
            sales, production, inventory, purchase, financial, activity = await asyncio.gather(
                resolve_sales(db, days),
                resolve_production(db, days),
                resolve_inventory(db),
                resolve_purchase(db, days),
                resolve_financial(db),
                resolve_activity(db, activity_limit),
            )
        
        return DashboardStats(
            sales=sales,
            production=production,
            inventory=inventory,
            purchase=purchase,
            financial=financial,
            recent_activity=activity,
        )
    
    @strawberry.field(description="🏥 Health check")
    def health(self) -> str:
        return "GraphQL layer is operational ✅"


# ============ Schema & Router ============

schema = strawberry.Schema(query=Query)
graphql_router = GraphQLRouter(schema)
