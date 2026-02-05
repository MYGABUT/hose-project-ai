-- FIX: Create missing Product Loans tables
-- This must be run BEFORE adding the 'type' column via phase8_hidden_gems.sql, 
-- OR this script already includes the 'type' column so it's a complete fix.

CREATE TABLE IF NOT EXISTS product_loans (
    id SERIAL PRIMARY KEY,
    loan_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INTEGER NOT NULL,
    customer_name VARCHAR(200),
    loan_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    notes TEXT,
    type VARCHAR(20) DEFAULT 'LOAN', -- Included Phase 8 column
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
