-- Replace the old test order schema (from 002) with the production-ready schema.
-- The previous orders/order_items tables held only test data and are dropped.
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'pending_payment',
    subtotal NUMERIC(10,2),
    shipping_cost NUMERIC(10,2) DEFAULT 0,
    total NUMERIC(10,2),
    shipping_name VARCHAR(255),
    shipping_email VARCHAR(255),
    shipping_address TEXT,
    shipping_city VARCHAR(100),
    shipping_state VARCHAR(100),
    shipping_zip VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    name VARCHAR(255),
    price NUMERIC(10,2),
    quantity INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
