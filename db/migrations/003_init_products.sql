CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price REAL NOT NULL,
  image TEXT NOT NULL DEFAULT '',
  inventory INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT '',
  tag TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '',
  dosages TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
