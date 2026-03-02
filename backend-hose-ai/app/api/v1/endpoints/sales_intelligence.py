"""
HosePro AI - Sales Intelligence Engine (The "Wolf" Engine)
Phase 1 of the Super ERP Roadmap.

Features:
1. Customer Churn Prediction (Dormant Alert)
2. Upsell / Cross-Sell Engine
3. Dead Stock Killer
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text, func, desc
from typing import Optional
from datetime import datetime, timedelta

from app.core.database import get_db


router = APIRouter(prefix="/intelligence", tags=["Sales Intelligence"])


# ============================================================
# 1. CUSTOMER CHURN PREDICTION
# ============================================================

@router.get("/churn-alerts")
def get_churn_alerts(
    dormant_days: int = Query(30, ge=7, le=365, description="Days since last order to flag as dormant"),
    min_orders: int = Query(2, ge=1, description="Minimum historical orders to consider"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """
    🐺 Customer Churn Prediction
    
    Identifies customers who:
    - Have ordered at least {min_orders} times
    - Haven't ordered in {dormant_days} days
    - Are compared against their average order frequency
    
    Returns a "Risk Score" (higher = more urgent to contact).
    """
    result = db.execute(text("""
        WITH customer_stats AS (
            SELECT 
                customer_name,
                customer_phone,
                COUNT(*) as total_orders,
                SUM(CAST(total AS float)) as lifetime_value,
                MAX(order_date) as last_order_date,
                MIN(order_date) as first_order_date,
                -- Average days between orders
                CASE 
                    WHEN COUNT(*) > 1 THEN
                        EXTRACT(EPOCH FROM (MAX(order_date) - MIN(order_date))) / 86400 / (COUNT(*) - 1)
                    ELSE NULL
                END as avg_order_interval_days
            FROM sales_orders
            WHERE is_deleted = false
              AND status NOT IN ('CANCELLED', 'DRAFT')
            GROUP BY customer_name, customer_phone
            HAVING COUNT(*) >= :min_orders
        )
        SELECT 
            customer_name,
            customer_phone,
            total_orders,
            ROUND(lifetime_value::numeric, 0) as lifetime_value,
            last_order_date,
            ROUND(avg_order_interval_days::numeric, 1) as avg_interval_days,
            EXTRACT(EPOCH FROM (NOW() - last_order_date)) / 86400 as days_since_last_order,
            -- Risk Score: how many "expected intervals" have passed
            CASE 
                WHEN avg_order_interval_days > 0 THEN
                    ROUND(
                        (EXTRACT(EPOCH FROM (NOW() - last_order_date)) / 86400 / avg_order_interval_days * 100)::numeric,
                        0
                    )
                ELSE 0
            END as risk_score
        FROM customer_stats
        WHERE EXTRACT(EPOCH FROM (NOW() - last_order_date)) / 86400 >= :dormant_days
        ORDER BY risk_score DESC
        LIMIT :limit
    """), {
        "dormant_days": dormant_days,
        "min_orders": min_orders,
        "limit": limit,
    })
    
    alerts = []
    for row in result:
        days_since = round(row.days_since_last_order or 0, 0)
        avg_interval = row.avg_interval_days or 0
        
        # Determine urgency level
        if row.risk_score and row.risk_score >= 300:
            urgency = "🔴 CRITICAL"
        elif row.risk_score and row.risk_score >= 200:
            urgency = "🟠 HIGH"
        elif row.risk_score and row.risk_score >= 150:
            urgency = "🟡 MEDIUM"
        else:
            urgency = "🟢 LOW"
        
        alerts.append({
            "customer_name": row.customer_name,
            "customer_phone": row.customer_phone,
            "total_orders": row.total_orders,
            "lifetime_value": float(row.lifetime_value or 0),
            "last_order_date": row.last_order_date.isoformat() if row.last_order_date else None,
            "days_since_last_order": int(days_since),
            "avg_interval_days": float(avg_interval),
            "risk_score": int(row.risk_score or 0),
            "urgency": urgency,
            "action": f"Customer biasanya order setiap {int(avg_interval)} hari. Sudah {int(days_since)} hari tanpa order. Hubungi sekarang!",
        })
    
    return {
        "status": "success",
        "total_alerts": len(alerts),
        "dormant_threshold_days": dormant_days,
        "data": alerts
    }


# ============================================================
# 2. UPSELL / CROSS-SELL ENGINE
# ============================================================

@router.get("/upsell-suggestions")
def get_upsell_suggestions(
    product_id: Optional[int] = Query(None, description="Get suggestions for this product"),
    customer_name: Optional[str] = Query(None, description="Get suggestions based on customer history"),
    min_cooccurrence: int = Query(2, ge=1, description="Minimum times products bought together"),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """
    🛒 Cross-Sell & Upsell Engine ("Do you need fittings with that?")
    
    Analyzes historical SO lines to find products often bought together.
    """
    if product_id:
        # Find products frequently bought WITH this product
        result = db.execute(text("""
            WITH target_orders AS (
                -- Find all SOs that contain target product
                SELECT DISTINCT sol.so_id
                FROM so_lines sol
                WHERE sol.product_id = :product_id
            ),
            co_purchased AS (
                -- Find other products in those same SOs
                SELECT 
                    sol.product_id,
                    p.name as product_name,
                    p.sku,
                    p.category,
                    p.brand,
                    COUNT(DISTINCT sol.so_id) as times_bought_together,
                    ROUND(AVG(sol.unit_price)::numeric, 0) as avg_unit_price
                FROM so_lines sol
                JOIN products p ON p.id = sol.product_id
                WHERE sol.so_id IN (SELECT so_id FROM target_orders)
                  AND sol.product_id != :product_id
                  AND p.is_active = true
                GROUP BY sol.product_id, p.name, p.sku, p.category, p.brand
                HAVING COUNT(DISTINCT sol.so_id) >= :min_co
            )
            SELECT *, 
                   ROUND(times_bought_together * 100.0 / (SELECT COUNT(*) FROM target_orders)::numeric, 1) as affinity_pct
            FROM co_purchased
            ORDER BY times_bought_together DESC
            LIMIT :limit
        """), {
            "product_id": product_id,
            "min_co": min_cooccurrence,
            "limit": limit,
        })
        
        suggestions = []
        for row in result:
            suggestions.append({
                "product_id": row.product_id,
                "product_name": row.product_name,
                "sku": row.sku,
                "category": row.category,
                "brand": row.brand,
                "times_bought_together": row.times_bought_together,
                "affinity_pct": float(row.affinity_pct or 0),
                "avg_unit_price": float(row.avg_unit_price or 0),
                "suggestion": f"💡 {row.affinity_pct}% of customers who bought this also bought {row.product_name}",
            })
        
        return {
            "status": "success",
            "source": f"product_id={product_id}",
            "total_suggestions": len(suggestions),
            "data": suggestions
        }
    
    elif customer_name:
        # Find products this customer hasn't bought but similar customers have
        result = db.execute(text("""
            WITH customer_products AS (
                -- Products this customer already bought
                SELECT DISTINCT sol.product_id
                FROM so_lines sol
                JOIN sales_orders so ON so.id = sol.so_id
                WHERE so.customer_name = :customer_name
                  AND so.is_deleted = false
            ),
            similar_customer_products AS (
                -- Find customers who bought the same products and see what else they bought
                SELECT 
                    sol2.product_id,
                    p.name as product_name,
                    p.sku,
                    p.category,
                    COUNT(DISTINCT so2.customer_name) as bought_by_similar_customers
                FROM so_lines sol1
                JOIN sales_orders so1 ON so1.id = sol1.so_id
                JOIN sales_orders so2 ON so2.customer_name != :customer_name AND so2.is_deleted = false
                JOIN so_lines sol2 ON sol2.so_id = so2.id
                JOIN products p ON p.id = sol2.product_id AND p.is_active = true
                WHERE so1.customer_name = :customer_name
                  AND so1.is_deleted = false
                  AND sol2.product_id NOT IN (SELECT product_id FROM customer_products)
                  AND EXISTS (
                      SELECT 1 FROM so_lines x 
                      WHERE x.so_id = so2.id 
                        AND x.product_id IN (SELECT product_id FROM customer_products)
                  )
                GROUP BY sol2.product_id, p.name, p.sku, p.category
            )
            SELECT * FROM similar_customer_products
            ORDER BY bought_by_similar_customers DESC
            LIMIT :limit
        """), {
            "customer_name": customer_name,
            "limit": limit,
        })
        
        suggestions = []
        for row in result:
            suggestions.append({
                "product_id": row.product_id,
                "product_name": row.product_name,
                "sku": row.sku,
                "category": row.category,
                "bought_by_similar_customers": row.bought_by_similar_customers,
                "suggestion": f"🎯 {row.bought_by_similar_customers} similar customers also buy {row.product_name}",
            })

        return {
            "status": "success",
            "source": f"customer={customer_name}",
            "total_suggestions": len(suggestions),
            "data": suggestions
        }
    
    else:
        # Global: top product pairs
        result = db.execute(text("""
            SELECT 
                p1.name as product_a, p1.sku as sku_a,
                p2.name as product_b, p2.sku as sku_b,
                COUNT(DISTINCT sol1.so_id) as times_together
            FROM so_lines sol1
            JOIN so_lines sol2 ON sol1.so_id = sol2.so_id AND sol1.product_id < sol2.product_id
            JOIN products p1 ON p1.id = sol1.product_id
            JOIN products p2 ON p2.id = sol2.product_id
            GROUP BY p1.name, p1.sku, p2.name, p2.sku
            HAVING COUNT(DISTINCT sol1.so_id) >= :min_co
            ORDER BY times_together DESC
            LIMIT :limit
        """), {"min_co": min_cooccurrence, "limit": limit})
        
        pairs = []
        for row in result:
            pairs.append({
                "product_a": f"{row.product_a} ({row.sku_a})",
                "product_b": f"{row.product_b} ({row.sku_b})",
                "times_together": row.times_together,
            })
        
        return {
            "status": "success",    
            "source": "global_top_pairs",
            "total_pairs": len(pairs),
            "data": pairs
        }


# ============================================================
# 3. DEAD STOCK KILLER
# ============================================================

@router.get("/dead-stock")
def get_dead_stock(
    stale_days: int = Query(180, ge=30, le=730, description="Days without movement to flag as dead stock"),
    min_value: float = Query(0, ge=0, description="Minimum stock value (Rp) to include"),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """
    💀 Dead Stock Killer
    
    Finds products sitting in inventory for more than {stale_days} days
    without any sales movement. Recommends promo actions.
    """
    result = db.execute(text("""
        WITH product_movement AS (
            SELECT 
                p.id as product_id,
                p.name,
                p.sku,
                p.brand,
                p.category,
                p.cost_price,
                p.sell_price,
                -- Current stock
                COALESCE(SUM(ib.current_qty), 0) as total_stock,
                -- Last sale date
                (SELECT MAX(so.order_date) 
                 FROM so_lines sol 
                 JOIN sales_orders so ON so.id = sol.so_id
                 WHERE sol.product_id = p.id 
                   AND so.is_deleted = false
                   AND so.status != 'CANCELLED'
                ) as last_sold_date,
                -- Last received date
                MAX(ib.received_date) as last_received_date,
                -- Total value at cost
                COALESCE(SUM(ib.current_qty * COALESCE(ib.cost_price, 0)), 0) as stock_value_at_cost
            FROM products p
            LEFT JOIN inventory_batches ib ON ib.product_id = p.id 
                AND ib.is_deleted = false 
                AND ib.current_qty > 0
            WHERE p.is_active = true
            GROUP BY p.id, p.name, p.sku, p.brand, p.category, p.cost_price, p.sell_price
            HAVING COALESCE(SUM(ib.current_qty), 0) > 0
        )
        SELECT *,
            EXTRACT(EPOCH FROM (NOW() - COALESCE(last_sold_date, last_received_date))) / 86400 as days_without_sale,
            CASE 
                WHEN last_sold_date IS NULL THEN 'NEVER_SOLD'
                WHEN EXTRACT(EPOCH FROM (NOW() - last_sold_date)) / 86400 > :stale_days * 2 THEN 'CRITICAL'
                WHEN EXTRACT(EPOCH FROM (NOW() - last_sold_date)) / 86400 > :stale_days THEN 'STALE'
                ELSE 'ACTIVE'
            END as stock_status
        FROM product_movement
        WHERE (
            last_sold_date IS NULL 
            OR EXTRACT(EPOCH FROM (NOW() - last_sold_date)) / 86400 >= :stale_days
        )
        AND COALESCE(stock_value_at_cost, 0) >= :min_value
        ORDER BY stock_value_at_cost DESC
        LIMIT :limit
    """), {
        "stale_days": stale_days,
        "min_value": min_value,
        "limit": limit,
    })
    
    dead_items = []
    total_trapped_value = 0
    
    for row in result:
        days = int(row.days_without_sale or 0)
        value = float(row.stock_value_at_cost or 0)
        total_trapped_value += value
        
        # Suggest discount based on severity
        if row.stock_status == "NEVER_SOLD":
            suggested_action = "🔴 Belum pernah terjual. Pertimbangkan bundling atau diskon 30-50%."
            suggested_discount = 40
        elif row.stock_status == "CRITICAL":
            suggested_action = f"🟠 Tidak terjual {days} hari. Buat promo diskon 20-30%."
            suggested_discount = 25
        else:
            suggested_action = f"🟡 Tidak terjual {days} hari. Tawarkan ke customer via upsell."
            suggested_discount = 10
        
        dead_items.append({
            "product_id": row.product_id,
            "name": row.name,
            "sku": row.sku,
            "brand": row.brand,
            "category": row.category,
            "total_stock": float(row.total_stock),
            "cost_price": float(row.cost_price or 0),
            "sell_price": float(row.sell_price or 0),
            "stock_value": value,
            "last_sold_date": row.last_sold_date.isoformat() if row.last_sold_date else "Never",
            "days_without_sale": days,
            "stock_status": row.stock_status,
            "suggested_action": suggested_action,
            "suggested_discount_pct": suggested_discount,
        })
    
    return {
        "status": "success",
        "total_dead_items": len(dead_items),
        "total_trapped_value": total_trapped_value,
        "stale_threshold_days": stale_days,
        "summary": f"Ada {len(dead_items)} produk senilai Rp {total_trapped_value:,.0f} yang 'tidur' di gudang. Saatnya aksi!",
        "data": dead_items
    }


# ============================================================
# 4. SALES VELOCITY DASHBOARD
# ============================================================

@router.get("/sales-velocity")
def get_sales_velocity(
    days: int = Query(30, ge=7, le=365),
    top_n: int = Query(20, ge=5, le=100),
    db: Session = Depends(get_db)
):
    """
    📈 Sales Velocity — Top moving products and revenue analysis
    
    Shows which products are moving fastest and generating the most revenue.
    """
    result = db.execute(text("""
        SELECT 
            p.id as product_id,
            p.name,
            p.sku,
            p.brand,
            p.category,
            COUNT(DISTINCT sol.so_id) as order_count,
            SUM(sol.qty) as total_qty_sold,
            SUM(CAST(sol.line_total AS float)) as total_revenue,
            ROUND(AVG(CAST(sol.unit_price AS float))::numeric, 0) as avg_unit_price,
            -- Current stock
            COALESCE((
                SELECT SUM(ib.current_qty) 
                FROM inventory_batches ib 
                WHERE ib.product_id = p.id AND ib.is_deleted = false AND ib.current_qty > 0
            ), 0) as current_stock
        FROM so_lines sol
        JOIN sales_orders so ON so.id = sol.so_id
        JOIN products p ON p.id = sol.product_id
        WHERE so.order_date >= NOW() - make_interval(days => :days)
          AND so.is_deleted = false
          AND so.status NOT IN ('CANCELLED', 'DRAFT')
        GROUP BY p.id, p.name, p.sku, p.brand, p.category
        ORDER BY total_revenue DESC
        LIMIT :top_n
    """), {"days": days, "top_n": top_n})
    
    products = []
    for row in result:
        daily_velocity = (row.total_qty_sold or 0) / max(days, 1)
        days_of_stock = (row.current_stock / daily_velocity) if daily_velocity > 0 else 999
        
        products.append({
            "product_id": row.product_id,
            "name": row.name,
            "sku": row.sku,
            "brand": row.brand,
            "category": row.category,
            "order_count": row.order_count,
            "total_qty_sold": float(row.total_qty_sold or 0),
            "total_revenue": float(row.total_revenue or 0),
            "avg_unit_price": float(row.avg_unit_price or 0),
            "current_stock": float(row.current_stock),
            "daily_velocity": round(daily_velocity, 2),
            "days_of_stock_remaining": round(days_of_stock, 0),
            "reorder_alert": days_of_stock < 14,
        })
    
    return {
        "status": "success",
        "period_days": days,
        "total_products": len(products),
        "data": products
    }


# ============================================================
# 5. PRODUCT PERFORMANCE (FAST/MEDIUM/SLOW)
# ============================================================

@router.get("/product-performance")
def get_product_performance(
    days: int = Query(90, ge=30, le=365, description="Analysis period"),
    db: Session = Depends(get_db)
):
    """
    📊 Product Performance Classification (ABC Analysis)
    
    Classifies products into:
    - 🟢 FAST MOVING (Top 20% by frequency)
    - 🟡 MEDIUM MOVING (Next 40%)
    - 🟠 SLOW MOVING (Bottom 40%)
    - 🔴 DEAD STOCK (No sales in period)
    """
    # 1. Get sales frequency for ALL active products
    result = db.execute(text("""
        WITH sales_stats AS (
            SELECT 
                p.id,
                p.name,
                p.sku,
                p.category,
                COALESCE(COUNT(DISTINCT sol.so_id), 0) as order_frequency,
                COALESCE(SUM(sol.qty), 0) as total_qty_sold
            FROM products p
            LEFT JOIN so_lines sol ON sol.product_id = p.id
            LEFT JOIN sales_orders so ON so.id = sol.so_id 
                AND so.order_date >= NOW() - make_interval(days => :days)
                AND so.is_deleted = false
                AND so.status NOT IN ('CANCELLED', 'DRAFT')
            WHERE p.is_active = true
            GROUP BY p.id, p.name, p.sku, p.category
        )
        SELECT * FROM sales_stats
        ORDER BY order_frequency DESC, total_qty_sold DESC
    """), {"days": days}).fetchall()
    
    total_items = len(result)
    with_sales = [r for r in result if r.order_frequency > 0]
    dead_stock = [r for r in result if r.order_frequency == 0]
    
    count_sold = len(with_sales)
    
    # Define thresholds just for items WITH sales
    fast_threshold = int(count_sold * 0.20) # Top 20%
    medium_threshold = int(count_sold * 0.60) # Next 40% (cumulative 60%)
    
    categorized = {
        "fast_moving": [],
        "medium_moving": [],
        "slow_moving": [],
        "dead_stock": []
    }
    
    for i, row in enumerate(with_sales):
        item = {
            "product_id": row.id,
            "name": row.name,
            "sku": row.sku,
            "category": row.category,
            "order_frequency": row.order_frequency,
            "total_qty_sold": float(row.total_qty_sold),
        }
        
        if i < fast_threshold:
            categorized["fast_moving"].append(item)
        elif i < medium_threshold:
            categorized["medium_moving"].append(item)
        else:
            categorized["slow_moving"].append(item)
            
    # Add dead stock
    for row in dead_stock:
        categorized["dead_stock"].append({
            "product_id": row.id,
            "name": row.name,
            "sku": row.sku,
            "category": row.category,
            "order_frequency": 0,
            "total_qty_sold": 0,
            "action": "Consider Discount"
        })
        
    return {
        "status": "success",
        "period_days": days,
        "summary": {
            "total_products": total_items,
            "fast_count": len(categorized["fast_moving"]),
            "medium_count": len(categorized["medium_moving"]),
            "slow_count": len(categorized["slow_moving"]),
            "dead_count": len(categorized["dead_stock"]),
        },
        "data": categorized
    }
