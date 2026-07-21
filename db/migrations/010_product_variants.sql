CREATE TABLE IF NOT EXISTS product_variants (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id
    ON product_variants(product_id);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id_active
    ON product_variants(product_id, active);

ALTER TABLE cart_items
    ADD COLUMN IF NOT EXISTS variant_id INTEGER REFERENCES product_variants(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cart_items_cart_id_product_id_key'
  ) THEN
    ALTER TABLE cart_items DROP CONSTRAINT cart_items_cart_id_product_id_key;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_items_unique_product_without_variant
    ON cart_items(cart_id, product_id)
    WHERE variant_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_items_unique_product_with_variant
    ON cart_items(cart_id, product_id, variant_id)
    WHERE variant_id IS NOT NULL;

ALTER TABLE order_items
    ADD COLUMN IF NOT EXISTS variant_id INTEGER REFERENCES product_variants(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS variant_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS variant_price NUMERIC(10,2);