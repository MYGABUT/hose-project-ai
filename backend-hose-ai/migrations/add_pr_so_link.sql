-- Add sales_order_id to purchase_requests for FPP Traceability
ALTER TABLE purchase_requests ADD COLUMN sales_order_id INTEGER REFERENCES sales_orders(id);
CREATE INDEX idx_pr_sales_order_id ON purchase_requests(sales_order_id);
