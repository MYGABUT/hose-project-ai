
-- Add unit_cost and total_value to batch_movements
ALTER TABLE batch_movements ADD COLUMN unit_cost NUMERIC(15, 2);
ALTER TABLE batch_movements ADD COLUMN total_value NUMERIC(15, 2);
