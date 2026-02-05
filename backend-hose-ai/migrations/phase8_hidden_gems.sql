
-- 1. Landed Cost Table
CREATE TABLE landed_costs (
    id SERIAL PRIMARY KEY,
    po_id INTEGER REFERENCES purchase_orders(id),
    amount NUMERIC(15, 2) NOT NULL,
    allocation_method VARCHAR(20) DEFAULT 'VALUE', -- VALUE, QTY
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(50)
);

-- 2. Multi-Currency for Purchasing
ALTER TABLE purchase_orders ADD COLUMN currency VARCHAR(3) DEFAULT 'IDR';
ALTER TABLE purchase_orders ADD COLUMN exchange_rate NUMERIC(10, 2) DEFAULT 1.0;

-- 3. Payment & FX Gain/Loss
CREATE TABLE payments (
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

-- 4. Consignment Support in Product Loans
ALTER TABLE product_loans ADD COLUMN type VARCHAR(20) DEFAULT 'LOAN'; -- LOAN, CONSIGNMENT

-- 5. Serial Number Enforcement
ALTER TABLE products ADD COLUMN is_serialized BOOLEAN DEFAULT FALSE;
