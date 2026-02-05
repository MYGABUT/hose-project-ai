
-- 6. Bill of Materials (BOM) for Auto-Assembly
CREATE TABLE product_components (
    id SERIAL PRIMARY KEY,
    parent_product_id INTEGER REFERENCES products(id),
    child_product_id INTEGER REFERENCES products(id),
    qty NUMERIC(10, 4) NOT NULL, -- Qty needed per 1 parent unit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
