-- 009_order_fulfillment.sql
-- Adds fulfillment / shipping-label columns to the orders table.
-- Idempotent: uses IF NOT EXISTS so re-running is safe.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS carrier VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_label_url TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_label_created_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP;

-- The app's public.users table (distinct from Supabase auth.users) has no
-- role column. Add one so admins can be designated for the admin console.
-- Admin rule (enforced in code): users.role = 'admin' grants admin access.
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'customer';
