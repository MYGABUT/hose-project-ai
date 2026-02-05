-- Phase 9: Go-Live Features (DP & Substitutes)

-- 1. Down Payment Support in Sales Orders
ALTER TABLE sales_orders ADD COLUMN dp_amount NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE sales_orders ADD COLUMN dp_invoice_id INTEGER; -- Link to the DP Invoice

-- 2. Down Payment Support in Invoices
ALTER TABLE invoices ADD COLUMN is_dp BOOLEAN DEFAULT FALSE;
ALTER TABLE invoices ADD COLUMN deduction_amount NUMERIC(15, 2) DEFAULT 0; -- Input as negative usually, or handled in calculation

-- 3. Substitute Items (Barang Pengganti)
CREATE TABLE product_substitutes (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    substitute_product_id INTEGER REFERENCES products(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, substitute_product_id)
);
