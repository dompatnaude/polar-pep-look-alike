CREATE TABLE IF NOT EXISTS checkout_intents (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  items_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_checkout_intents_created_at ON checkout_intents(created_at);
