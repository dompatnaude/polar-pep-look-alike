UPDATE products
SET stock_quantity = 10,
    updated_at = CURRENT_TIMESTAMP;

UPDATE product_variants
SET stock_quantity = 10,
    updated_at = CURRENT_TIMESTAMP;