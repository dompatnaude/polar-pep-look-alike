-- Admin flag for product/order management
ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0;

PRAGMA foreign_keys = OFF;

-- Rebuild orders to support guest checkout + Stripe payment ids
CREATE TABLE orders_new (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  stripe_payment_id TEXT UNIQUE,
  total REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Processing',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO orders_new (id, user_id, stripe_payment_id, total, status, created_at)
SELECT id, user_id, NULL, total_amount, status, created_at
FROM orders;

-- Align order_items with ecommerce schema while keeping display fields
CREATE TABLE order_items_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price REAL NOT NULL,
  product_name TEXT NOT NULL DEFAULT '',
  FOREIGN KEY(order_id) REFERENCES orders_new(id) ON DELETE CASCADE
);

INSERT INTO order_items_new (id, order_id, product_id, quantity, price, product_name)
SELECT id, order_id, product_id, quantity, unit_price, product_name
FROM order_items;

DROP TABLE order_items;
DROP TABLE orders;
ALTER TABLE orders_new RENAME TO orders;
ALTER TABLE order_items_new RENAME TO order_items;

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_payment_id ON orders(stripe_payment_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

PRAGMA foreign_keys = ON;
