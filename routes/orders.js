const express = require("express");
const pool = require("../db/connection");

// Generate a unique order number, e.g. ORD-20260720-ABC123
function generateOrderNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `ORD-${y}${m}${d}-${suffix}`;
}

// Round to 2 decimal places and return a Number.
function money(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function getQuantityDiscountRate(quantity) {
  const qty = Number(quantity) || 0;
  if (qty >= 10) return 0.20;
  if (qty >= 5) return 0.12;
  if (qty === 4) return 0.09;
  if (qty === 3) return 0.06;
  if (qty === 2) return 0.03;
  return 0;
}

// Factory: mirrors createCartRouter(requireAuth). requireAuth is the existing
// auth middleware defined in server.js - we reuse it, no duplicate auth logic.
function createOrdersRouter(requireAuth) {
  const router = express.Router();

  // POST /api/orders - create an order from the logged-in user's cart.
  router.post("/", (req, res, next) => {
    // Guest guard with the spec-required message. Check the auth state the same
    // way requireAuth does (Passport user OR session user), BEFORE delegating,
    // so guests get the required message instead of the generic 401.
    if (!req.user && !(req.session && req.session.userId)) {
      return res.status(401).json({ error: "Login required to place order" });
    }
    // Reuse the existing requireAuth to resolve a session login into req.user.
    requireAuth(req, res, function () {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: "Login required to place order" });
      }
      createOrder(req, res).catch(next);
    });
  });

  // GET /api/orders - list the logged-in user's orders.
  router.get("/", requireAuth, async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT order_number, status, total, created_at
           FROM orders
          WHERE user_id = $1
          ORDER BY created_at DESC`,
        [req.user.id]
      );
      res.json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  // GET /api/orders/:id - a single order (only if it belongs to the user).
  router.get("/:id", requireAuth, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id, 10);
      if (!Number.isInteger(orderId)) {
        return res.status(400).json({ error: "Invalid order id" });
      }
      const orderRes = await pool.query(
        `SELECT * FROM orders WHERE id = $1 AND user_id = $2`,
        [orderId, req.user.id]
      );
      if (orderRes.rows.length === 0) {
        return res.status(404).json({ error: "Order not found" });
      }
      const order = orderRes.rows[0];
      const itemsRes = await pool.query(
        `SELECT id, product_id, variant_id, name, variant_name, variant_price, price, quantity
           FROM order_items
          WHERE order_id = $1
          ORDER BY id ASC`,
        [order.id]
      );
      res.json({
        order,
        items: itemsRes.rows,
        totals: {
          subtotal: order.subtotal,
          shipping_cost: order.shipping_cost,
          total: order.total,
        },
        status: order.status,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });

  return router;
}

// Core order-creation flow. Runs in a single transaction so that either the
// whole order (order + items + cart clear) succeeds, or nothing changes.
async function createOrder(req, res) {
  const userId = req.user.id;
  const body = req.body || {};
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Get the user's current cart.
    const cartRes = await client.query(
      "SELECT id FROM carts WHERE user_id = $1 ORDER BY id ASC LIMIT 1",
      [userId]
    );
    if (cartRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Cart is empty" });
    }
    const cartId = cartRes.rows[0].id;

    // 2. Confirm the cart contains items and include optional selected variant data.
    const itemsRes = await client.query(
      `SELECT ci.product_id,
              ci.variant_id,
              ci.quantity,
              p.name AS product_name,
              p.price AS product_price,
              p.stock_quantity AS product_stock,
              p.active AS product_active,
              pv.id AS variant_row_id,
              pv.name AS variant_name,
              pv.price AS variant_price,
              pv.stock_quantity AS variant_stock,
              pv.active AS variant_active
         FROM cart_items ci
         JOIN products p ON p.id = ci.product_id
         LEFT JOIN product_variants pv
           ON pv.id = ci.variant_id
          AND pv.product_id = p.id
        WHERE ci.cart_id = $1
        ORDER BY ci.id ASC`,
      [cartId]
    );
    if (itemsRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Cart is empty" });
    }

    // 3. Lock inventory rows and verify stock before pricing/inserting order items.
    const productById = new Map();
    const variantById = new Map();
    for (const it of itemsRes.rows) {
      const productId = Number(it.product_id);
      if (!productById.has(productId)) {
        const lockedProduct = await client.query(
          "SELECT id, stock_quantity, active FROM products WHERE id = $1 FOR UPDATE",
          [productId]
        );
        if (!lockedProduct.rows.length) {
          await client.query("ROLLBACK");
          return res.status(409).json({
            error: "One or more products are no longer available in the requested quantity.",
          });
        }
        const p = lockedProduct.rows[0];
        productById.set(productId, {
          stock_quantity: Number(p.stock_quantity || 0),
          active: !!p.active,
        });
      }

      if (it.variant_id != null) {
        const variantId = Number(it.variant_id);
        if (!variantById.has(variantId)) {
          const lockedVariant = await client.query(
            `SELECT id, product_id, stock_quantity, active, name, price
               FROM product_variants
              WHERE id = $1
                AND product_id = $2
              FOR UPDATE`,
            [variantId, productId]
          );
          if (!lockedVariant.rows.length) {
            await client.query("ROLLBACK");
            return res.status(409).json({
              error: "One or more products are no longer available in the requested quantity.",
            });
          }
          const v = lockedVariant.rows[0];
          variantById.set(variantId, {
            stock_quantity: Number(v.stock_quantity || 0),
            active: !!v.active,
            name: v.name,
            price: Number(v.price),
          });
        }
      }
    }

    for (const it of itemsRes.rows) {
      const productId = Number(it.product_id);
      const requestedQty = Number(it.quantity || 0);
      const product = productById.get(productId);
      if (!product || !product.active) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          error: "One or more products are no longer available in the requested quantity.",
        });
      }

      if (it.variant_id != null) {
        const variant = variantById.get(Number(it.variant_id));
        if (!variant || !variant.active || variant.stock_quantity < requestedQty) {
          await client.query("ROLLBACK");
          return res.status(409).json({
            error: "One or more products are no longer available in the requested quantity.",
          });
        }
      } else if (product.stock_quantity < requestedQty) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          error: "One or more products are no longer available in the requested quantity.",
        });
      }
    }

    // 4. Calculate discounted unit price and line totals server-side.
    const pricedItems = [];
    let subtotal = 0;
    for (const it of itemsRes.rows) {
      const quantity = Number(it.quantity) || 0;
      const hasVariant = it.variant_id != null;
      const variant = hasVariant ? variantById.get(Number(it.variant_id)) : null;
      const basePrice = hasVariant
        ? Number((variant && variant.price) || 0)
        : Number(it.product_price) || 0;
      const discountRate = getQuantityDiscountRate(quantity);
      const discountedUnitPrice = money(basePrice * (1 - discountRate));
      const lineTotal = money(discountedUnitPrice * quantity);
      subtotal += lineTotal;
      pricedItems.push({
        product_id: it.product_id,
        variant_id: hasVariant ? Number(it.variant_id) : null,
        name: it.product_name,
        variant_name: variant ? variant.name : null,
        variant_price: variant ? money(variant.price) : null,
        quantity,
        discount_rate: discountRate,
        discounted_unit_price: discountedUnitPrice,
        line_total: lineTotal
      });
    }
    subtotal = money(subtotal);
    const shippingCost = money(body.shipping_cost || 0);
    const total = money(subtotal + shippingCost);

    // 5. Create the order. Let PostgreSQL generate the identity id, then
    // derive the deterministic order_number (PX + id + 100000) from that id.
    // order_number is NOT NULL + UNIQUE, so insert a temporary unique
    // placeholder first, then update it once the generated id is known.
    const tempOrderNumber = `TMP-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const insertRes = await client.query(
      `INSERT INTO orders (order_number, user_id, status, subtotal, shipping_cost, total, shipping_name, shipping_email, shipping_address, shipping_city, shipping_state, shipping_zip) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [
        tempOrderNumber,
        userId,
        "pending_payment",
        subtotal,
        shippingCost,
        total,
        body.shipping_name || null,
        body.shipping_email || null,
        body.shipping_address || null,
        body.shipping_city || null,
        body.shipping_state || null,
        body.shipping_zip || null,
      ]
    );
    const orderId = insertRes.rows[0].id;
    const finalOrderNumber = `PX${String(Number(orderId) + 100000).padStart(6, "0")}`;
    const orderRes = await client.query(
      `UPDATE orders SET order_number = $1 WHERE id = $2 RETURNING id, order_number, status`,
      [finalOrderNumber, orderId]
    );
    const order = orderRes.rows[0];
    if (!order) {
      await client.query("ROLLBACK");
      return res.status(500).json({ error: "Could not create order" });
    }

    // 6. Copy cart items into order_items with discounted unit price snapshot.
    for (const it of pricedItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, variant_id, name, variant_name, variant_price, price, quantity)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          order.id,
          it.product_id,
          it.variant_id,
          it.name,
          it.variant_name,
          it.variant_price,
          it.discounted_unit_price,
          it.quantity,
        ]
      );
    }

    // 7. Decrement inventory now that order_items are persisted.
    for (const it of pricedItems) {
      if (it.variant_id != null) {
        await client.query(
          `UPDATE product_variants
              SET stock_quantity = stock_quantity - $1,
                  updated_at = CURRENT_TIMESTAMP
            WHERE id = $2`,
          [it.quantity, it.variant_id]
        );
      } else {
        await client.query(
          `UPDATE products
              SET stock_quantity = stock_quantity - $1,
                  updated_at = CURRENT_TIMESTAMP
            WHERE id = $2`,
          [it.quantity, it.product_id]
        );
      }
    }

    // 8. Clear the user's cart after successful order creation.
    await client.query("DELETE FROM cart_items WHERE cart_id = $1", [cartId]);
    await client.query(
      "UPDATE carts SET updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [cartId]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      order_id: order.id,
      order_number: order.order_number,
      status: order.status,
      totals: {
        subtotal,
        shipping_cost: shippingCost,
        total,
      },
      items: pricedItems.map((item) => ({
        product_id: item.product_id,
        variant_id: item.variant_id,
        name: item.name,
        variant_name: item.variant_name,
        variant_price: item.variant_price,
        quantity: item.quantity,
        discount_rate: item.discount_rate,
        unit_price: item.discounted_unit_price,
        line_total: item.line_total,
      })),
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    return res.status(500).json({ error: "Failed to create order" });
  } finally {
    client.release();
  }
}

module.exports = createOrdersRouter;
