-- ERP Gap Analysis Migration Script
-- Run this to add HPP and Payment tracking fields

-- =====================================================
-- 1. Sales Orders - Payment Tracking
-- =====================================================
ALTER TABLE sales_orders 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'UNPAID';

ALTER TABLE sales_orders 
ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(15,2) DEFAULT 0;

ALTER TABLE sales_orders 
ADD COLUMN IF NOT EXISTS payment_due_date TIMESTAMP WITH TIME ZONE;

-- =====================================================
-- 2. Job Orders - HPP Tracking
-- =====================================================
ALTER TABLE job_orders 
ADD COLUMN IF NOT EXISTS total_hpp INTEGER DEFAULT 0;

-- =====================================================
-- 3. JO Lines - HPP Breakdown
-- =====================================================
ALTER TABLE jo_lines 
ADD COLUMN IF NOT EXISTS line_hpp INTEGER DEFAULT 0;

ALTER TABLE jo_lines 
ADD COLUMN IF NOT EXISTS hose_cost INTEGER DEFAULT 0;

ALTER TABLE jo_lines 
ADD COLUMN IF NOT EXISTS fitting_a_cost INTEGER DEFAULT 0;

ALTER TABLE jo_lines 
ADD COLUMN IF NOT EXISTS fitting_b_cost INTEGER DEFAULT 0;

ALTER TABLE jo_lines 
ADD COLUMN IF NOT EXISTS labor_cost INTEGER DEFAULT 0;

-- =====================================================
-- Verify columns added
-- =====================================================
SELECT 'Migration complete!' as status;

-- =====================================================
-- 4. Customers Table - Credit Limit Tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL UNIQUE,
    phone VARCHAR(50),
    address TEXT,
    email VARCHAR(100),
    customer_type VARCHAR(50) DEFAULT 'RETAIL',
    price_level VARCHAR(20) DEFAULT 'REGULAR',
    credit_limit NUMERIC(15,2) DEFAULT 0,
    credit_term INTEGER DEFAULT 30,
    total_outstanding NUMERIC(15,2) DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    is_blacklisted BOOLEAN DEFAULT FALSE,
    blacklist_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Index for customer lookup
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers(is_active);

-- =====================================================
-- 5. Products - Unit Conversion
-- =====================================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS alt_unit VARCHAR(20);
ALTER TABLE products ADD COLUMN IF NOT EXISTS conversion_factor NUMERIC(10,2);
