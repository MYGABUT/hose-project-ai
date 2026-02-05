-- MASTER FIX SCRIPT (PHASE 8 + MISSING TABLES)
-- Run this SINGLE script to apply ALL changes safely.

-- 1. FIX MISSING Product Loans (Phase 7 Catch-up)
CREATE TABLE IF NOT EXISTS product_loans (
    id SERIAL PRIMARY KEY,
    loan_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INTEGER NOT NULL,
    customer_name VARCHAR(200),
    loan_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    notes TEXT,
    type VARCHAR(20) DEFAULT 'LOAN', -- Phase 8 Column included
    status VARCHAR(20) DEFAULT 'OPEN',
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS product_loan_items (
    id SERIAL PRIMARY KEY,
    loan_id INTEGER REFERENCES product_loans(id),
    product_id INTEGER,
    product_sku VARCHAR(50),
    product_name VARCHAR(200),
    qty_loaned NUMERIC(10, 2) DEFAULT 0,
    qty_returned NUMERIC(10, 2) DEFAULT 0,
    qty_invoiced NUMERIC(10, 2) DEFAULT 0,
    batch_id INTEGER
);

-- 2. Phase 8: Landed Cost
CREATE TABLE IF NOT EXISTS landed_costs (
    id SERIAL PRIMARY KEY,
    po_id INTEGER REFERENCES purchase_orders(id),
    amount NUMERIC(15, 2) NOT NULL,
    allocation_method VARCHAR(20) DEFAULT 'VALUE',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(50)
);

-- 3. Phase 8: Payments & Multi-Currency
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    po_id INTEGER REFERENCES purchase_orders(id),
    amount NUMERIC(15, 2) NOT NULL,
    payment_date DATE DEFAULT CURRENT_DATE,
    payment_method VARCHAR(50),
    exchange_rate NUMERIC(10, 2) DEFAULT 1.0,
    realized_gain_loss NUMERIC(15, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(50)
);

-- 4. Phase 8: Auto-Assembly (BOM)
CREATE TABLE IF NOT EXISTS product_components (
    id SERIAL PRIMARY KEY,
    parent_product_id INTEGER REFERENCES products(id),
    child_product_id INTEGER REFERENCES products(id),
    qty NUMERIC(10, 4) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Add Columns Safely (Use DO block to avoid errors if column exists)

-- PO Currency
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchase_orders' AND column_name='currency') THEN
        ALTER TABLE purchase_orders ADD COLUMN currency VARCHAR(3) DEFAULT 'IDR';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchase_orders' AND column_name='exchange_rate') THEN
        ALTER TABLE purchase_orders ADD COLUMN exchange_rate NUMERIC(10, 2) DEFAULT 1.0;
    END IF;
END $$;

-- Serial Number
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='is_serialized') THEN
        ALTER TABLE products ADD COLUMN is_serialized BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Batch Image (Phase 7 Fix)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_batches' AND column_name='image_path') THEN
        ALTER TABLE inventory_batches ADD COLUMN image_path VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_batches' AND column_name='serial_number') THEN
        ALTER TABLE inventory_batches ADD COLUMN serial_number VARCHAR(100);
    END IF;
END $$;

-- Movement Cost (Phase 7 Fix)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='batch_movements' AND column_name='unit_cost') THEN
        ALTER TABLE batch_movements ADD COLUMN unit_cost NUMERIC(15, 2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='batch_movements' AND column_name='total_value') THEN
        ALTER TABLE batch_movements ADD COLUMN total_value NUMERIC(15, 2);
    END IF;
END $$;
