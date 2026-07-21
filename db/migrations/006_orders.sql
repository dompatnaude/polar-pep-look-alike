-- DEPRECATED / NO-OP
-- This migration originally used CREATE TABLE IF NOT EXISTS for orders/order_items,
-- but those tables already existed (from 002), so it created no useful schema.
-- The production-ready order schema is defined in 007_replace_orders.sql.
-- Kept as an empty no-op because 006_orders.sql is already recorded in schema_migrations.
SELECT 1;
