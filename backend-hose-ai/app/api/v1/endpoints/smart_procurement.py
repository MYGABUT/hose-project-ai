"""
HosePro AI - Smart Procurement Engine
Phase 2 of the Super ERP Roadmap.

Features:
1. Reorder Alerts (based on Sales Velocity)
2. Supplier Lead Time Tracker
3. Purchase Suggestion Generator
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional

from app.core.database import get_db


router = APIRouter(prefix="/procurement", tags=["Smart Procurement"])


@router.get("/reorder-alerts")
def get_reorder_alerts(
    days_lookback: int = Query(30, ge=7, le=365, description="Days to calculate velocity"),
    critical_days: int = Query(14, ge=1, le=90, description="Days of stock left to flag as critical"),
    db: Session = Depends(get_db)
):
    """
    🚨 Smart Reorder Alerts

    Calculates daily sales velocity for each product and compares
    against current stock to predict when stock will run out.

    Returns products sorted by urgency (fewest days of stock remaining first).
    """
    result = db.execute(text("""
        WITH velocity AS (
            SELECT
                sol.product_id,
                SUM(sol.qty) as total_sold,
                SUM(sol.qty)::float / :days as daily_velocity
            FROM so_lines sol
            JOIN sales_orders so ON so.id = sol.so_id
            WHERE so.order_date >= NOW() - make_interval(days => :days)
              AND so.is_deleted = false
              AND so.status NOT IN ('CANCELLED', 'DRAFT')
            GROUP BY sol.product_id
        ),
        stock AS (
            SELECT
                product_id,
                SUM(current_qty) as current_stock,
                SUM(reserved_qty) as reserved_stock
            FROM inventory_batches
            WHERE is_deleted = false AND current_qty > 0
            GROUP BY product_id
        )
        SELECT
            p.id as product_id,
            p.name,
            p.sku,
            p.brand,
            p.category,
            p.min_stock,
            p.reorder_point,
            COALESCE(s.current_stock, 0) as current_stock,
            COALESCE(s.reserved_stock, 0) as reserved_stock,
            COALESCE(s.current_stock, 0) - COALESCE(s.reserved_stock, 0) as available_stock,
            COALESCE(v.total_sold, 0) as total_sold_period,
            COALESCE(v.daily_velocity, 0) as daily_velocity,
            -- Days until stockout
            CASE
                WHEN COALESCE(v.daily_velocity, 0) > 0 THEN
                    ROUND(((COALESCE(s.current_stock, 0) - COALESCE(s.reserved_stock, 0)) / v.daily_velocity)::numeric, 1)
                ELSE 999
            END as days_until_stockout,
            -- Suggested order qty (30 days of supply)
            CASE
                WHEN COALESCE(v.daily_velocity, 0) > 0 THEN
                    ROUND((v.daily_velocity * 30)::numeric, 0)
                ELSE 0
            END as suggested_order_qty
        FROM products p
        LEFT JOIN velocity v ON v.product_id = p.id
        LEFT JOIN stock s ON s.product_id = p.id
        WHERE p.is_active = true
          AND (
              -- Has sales velocity AND low stock
              (COALESCE(v.daily_velocity, 0) > 0 AND
               CASE
                   WHEN v.daily_velocity > 0 THEN
                       (COALESCE(s.current_stock, 0) - COALESCE(s.reserved_stock, 0)) / v.daily_velocity
                   ELSE 999
               END <= :critical_days
              )
              OR
              -- Below min_stock threshold
              (p.min_stock > 0 AND COALESCE(s.current_stock, 0) < p.min_stock)
              OR
              -- Below reorder_point
              (p.reorder_point IS NOT NULL AND COALESCE(s.current_stock, 0) <= p.reorder_point)
          )
        ORDER BY days_until_stockout ASC
    """), {
        "days": days_lookback,
        "critical_days": critical_days,
    })

    alerts = []
    for row in result:
        days_left = float(row.days_until_stockout)

        if days_left <= 3:
            urgency = "🔴 URGENT — Habis dalam 3 hari!"
        elif days_left <= 7:
            urgency = "🟠 HIGH — Habis dalam 1 minggu"
        elif days_left <= 14:
            urgency = "🟡 MEDIUM — Perlu order dalam 2 minggu"
        else:
            urgency = "🟢 LOW — Monitor"

        unit_display = "unit"
        if row.category and "HOSE" in str(row.category):
            unit_display = "meter"
        elif row.category and "FITTING" in str(row.category):
            unit_display = "pcs"

        alerts.append({
            "product_id": row.product_id,
            "name": row.name,
            "sku": row.sku,
            "brand": row.brand,
            "category": row.category,
            "current_stock": float(row.current_stock),
            "available_stock": float(row.available_stock),
            "min_stock": row.min_stock,
            "daily_velocity": round(float(row.daily_velocity), 2),
            "days_until_stockout": float(days_left),
            "suggested_order_qty": float(row.suggested_order_qty),
            "unit": unit_display,
            "urgency": urgency,
            "action": f"Order {int(row.suggested_order_qty)} {unit_display} sekarang. Stok tersisa {int(row.available_stock)} {unit_display}, habis dalam ~{int(days_left)} hari.",
        })

    return {
        "status": "success",
        "period_days": days_lookback,
        "critical_threshold_days": critical_days,
        "total_alerts": len(alerts),
        "summary": f"⚠️ {len(alerts)} produk perlu di-restock segera!",
        "data": alerts
    }


@router.get("/purchase-suggestion")
def generate_purchase_suggestion(
    days_supply: int = Query(30, ge=7, le=90, description="Days of supply to order for"),
    days_lookback: int = Query(30, ge=7, le=365, description="Days to calculate velocity"),
    min_velocity: float = Query(0.1, ge=0, description="Minimum daily velocity to include"),
    db: Session = Depends(get_db)
):
    """
    📋 Auto-Generate Purchase Suggestion

    Creates a suggested Purchase Order based on:
    - Current stock levels
    - Sales velocity over the lookback period
    - Desired days of supply

    Groups suggestions by brand/supplier for easy ordering.
    """
    result = db.execute(text("""
        WITH velocity AS (
            SELECT
                sol.product_id,
                SUM(sol.qty)::float / :days as daily_velocity
            FROM so_lines sol
            JOIN sales_orders so ON so.id = sol.so_id
            WHERE so.order_date >= NOW() - make_interval(days => :days)
              AND so.is_deleted = false
              AND so.status NOT IN ('CANCELLED', 'DRAFT')
            GROUP BY sol.product_id
            HAVING SUM(sol.qty)::float / :days >= :min_vel
        ),
        stock AS (
            SELECT product_id, SUM(current_qty) as current_stock
            FROM inventory_batches
            WHERE is_deleted = false AND current_qty > 0
            GROUP BY product_id
        )
        SELECT
            p.id, p.name, p.sku, p.brand, p.category,
            p.cost_price,
            COALESCE(s.current_stock, 0) as current_stock,
            v.daily_velocity,
            -- Need = (velocity * days_supply) - current_stock
            GREATEST(0, ROUND((v.daily_velocity * :supply_days - COALESCE(s.current_stock, 0))::numeric, 0)) as order_qty,
            GREATEST(0, ROUND((v.daily_velocity * :supply_days - COALESCE(s.current_stock, 0))::numeric, 0)) * COALESCE(p.cost_price, 0) as estimated_cost
        FROM velocity v
        JOIN products p ON p.id = v.product_id
        LEFT JOIN stock s ON s.product_id = p.id
        WHERE p.is_active = true
          AND (v.daily_velocity * :supply_days) > COALESCE(s.current_stock, 0)
        ORDER BY p.brand, estimated_cost DESC
    """), {
        "days": days_lookback,
        "supply_days": days_supply,
        "min_vel": min_velocity,
    })

    suggestions = []
    total_estimated_cost = 0
    brands = {}

    for row in result:
        order_qty = float(row.order_qty)
        est_cost = float(row.estimated_cost or 0)
        total_estimated_cost += est_cost
        brand = row.brand or "Unknown"

        if brand not in brands:
            brands[brand] = {"items": 0, "total_cost": 0}
        brands[brand]["items"] += 1
        brands[brand]["total_cost"] += est_cost

        suggestions.append({
            "product_id": row.id,
            "name": row.name,
            "sku": row.sku,
            "brand": brand,
            "category": row.category,
            "current_stock": float(row.current_stock),
            "daily_velocity": round(float(row.daily_velocity), 2),
            "order_qty": order_qty,
            "cost_price": float(row.cost_price or 0),
            "estimated_cost": est_cost,
        })

    return {
        "status": "success",
        "parameters": {
            "days_supply": days_supply,
            "velocity_period": days_lookback,
        },
        "summary": {
            "total_items": len(suggestions),
            "total_estimated_cost": total_estimated_cost,
            "by_brand": brands,
        },
        "data": suggestions
    }
