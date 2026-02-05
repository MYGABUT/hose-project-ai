
from app.core.database import engine
from sqlalchemy import text

def reset_transactions():
    print("🔥 Starting Transaction Cleanup (Keeping Master Data)...")
    
    # Direct DB Connection
    # engine is already configured in app.core.database
    
    with engine.connect() as conn:
        # Disable Triggers/Constraints temporarily if needed, but CASCADE should handle foreign keys.
        # Order matters somewhat, but CASCADE is powerful.
        
        tables_to_truncate = [
            "delivery_order_lines", "delivery_orders",
            "invoice_lines", "invoices", "payments",
            "qc_inspections",
            "job_order_lines", "job_orders",
            "sales_order_lines", "sales_orders",
            "stock_opname_items", "stock_opname",
            "purchase_request_lines", "purchase_requests",
            "purchase_order_lines", "purchase_orders",
            "batch_movements", "inventory_batches",
            "warehouse_transfers",
            "stock_bookings",
            "product_loans",
            "rma_items", "rma_tickets",
            "audit_logs",
            "notifications",
            # New Features
            "petty_cash_transactions", "petty_cash_balance",
            "project_daily_reports", "project_sppd", "project_commissioning", "work_orders", "projects",
            "depreciation_entries", "fixed_assets",
            "giros",
            "sales_commissions", "salesmen",
            "journal_lines", "journal_entries",
            "customer_assets",
            "pr_lines"
        ]
        
        # Verify table existence before Truncate to avoid error
        existing_tables = conn.execute(text(
            "SELECT table_name FROM information_schema.tables WHERE table_schema='public'"
        )).fetchall()
        existing_table_names = [t[0] for t in existing_tables]
        
        for table in tables_to_truncate:
            if table in existing_table_names:
                print(f"🗑️  Truncating {table}...")
                conn.execute(text(f"TRUNCATE TABLE {table} CASCADE;"))
            else:
                print(f"⚠️  Table {table} not found, skipping.")
                
        conn.commit()
        
    print("✅ All transaction data wiped. Master data (Products, Users, Locations) preserved.")

if __name__ == "__main__":
    reset_transactions()
