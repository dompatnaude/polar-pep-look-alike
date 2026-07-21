'use strict';

const express = require('express');
const pool = require('../db/connection');

function toBoolean(value, fallback) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === 'true') return true;
    if (v === 'false') return false;
  }
  return fallback;
}

function normalizeText(value, maxLen) {
  if (value == null) return '';
  const normalized = String(value).trim();
  if (!normalized) return '';
  if (maxLen && normalized.length > maxLen) return normalized.slice(0, maxLen);
  return normalized;
}

function parsePrice(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

function parseStock(value) {
  const num = Number(value);
  if (!Number.isInteger(num) || num < 0) return null;
  return num;
}

function normalizedVariantKey(name) {
  return normalizeText(name, 100)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

async function hasDuplicateVariantName(productId, name, ignoreVariantId) {
  const key = normalizedVariantKey(name);
  if (!key) return false;
  const params = [productId, key];
  let query =
    "SELECT id FROM product_variants " +
    "WHERE product_id = $1 AND active = true " +
    "AND regexp_replace(lower(name), '[^a-z0-9]+', '', 'g') = $2";

  if (Number.isInteger(ignoreVariantId)) {
    params.push(ignoreVariantId);
    query += ' AND id <> $3';
  }

  query += ' LIMIT 1';
  const existing = await pool.query(query, params);
  return existing.rows.length > 0;
}

function buildVariantPayload(body) {
  const src = body || {};
  const payload = {
    name: normalizeText(src.name, 100),
    active: toBoolean(src.active, true)
  };
  if (!payload.name) {
    return { error: 'name is required' };
  }

  const price = parsePrice(src.price);
  if (price == null) {
    return { error: 'price must be a non-negative number' };
  }
  payload.price = price;

  const stockQuantity = parseStock(src.stock_quantity);
  if (stockQuantity == null) {
    return { error: 'stock_quantity must be an integer greater than or equal to 0' };
  }
  payload.stock_quantity = stockQuantity;
  return { payload };
}

function createAdminVariantsRouter(requireAuth) {
  const router = express.Router();

  async function requireAdmin(req, res, next) {
    try {
      const userId = (req.user && req.user.id) || (req.session && req.session.userId);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const result = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
      const role = result.rows.length ? result.rows[0].role : null;
      if (role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      req.adminUserId = userId;
      return next();
    } catch (error) {
      return next(error);
    }
  }

  const gate = [requireAuth, requireAdmin];

  router.get('/products/:id/variants', gate, async (req, res) => {
    try {
      const productId = parseInt(req.params.id, 10);
      if (!Number.isInteger(productId)) {
        return res.status(400).json({ error: 'Invalid product id' });
      }
      const product = await pool.query('SELECT id FROM products WHERE id = $1', [productId]);
      if (!product.rows.length) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const result = await pool.query(
        'SELECT id, product_id, name, price, stock_quantity, active, created_at, updated_at ' +
        'FROM product_variants WHERE product_id = $1 ORDER BY id ASC',
        [productId]
      );
      res.json({ variants: result.rows });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to list variants' });
    }
  });

  router.post('/products/:id/variants', gate, async (req, res) => {
    try {
      const productId = parseInt(req.params.id, 10);
      if (!Number.isInteger(productId)) {
        return res.status(400).json({ error: 'Invalid product id' });
      }
      const product = await pool.query('SELECT id FROM products WHERE id = $1', [productId]);
      if (!product.rows.length) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const built = buildVariantPayload(req.body);
      if (built.error) {
        return res.status(400).json({ error: built.error });
      }
      const v = built.payload;
      const duplicate = await hasDuplicateVariantName(productId, v.name);
      if (duplicate) {
        return res.status(409).json({ error: 'Duplicate dosage for this product is not allowed' });
      }
      const result = await pool.query(
        'INSERT INTO product_variants (product_id, name, price, stock_quantity, active) ' +
        'VALUES ($1, $2, $3, $4, $5) ' +
        'RETURNING id, product_id, name, price, stock_quantity, active, created_at, updated_at',
        [productId, v.name, v.price, v.stock_quantity, v.active]
      );
      res.status(201).json({ variant: result.rows[0] });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create variant' });
    }
  });

  router.put('/variants/:id', gate, async (req, res) => {
    try {
      const variantId = parseInt(req.params.id, 10);
      if (!Number.isInteger(variantId)) {
        return res.status(400).json({ error: 'Invalid variant id' });
      }
      const built = buildVariantPayload(req.body);
      if (built.error) {
        return res.status(400).json({ error: built.error });
      }
      const v = built.payload;
      const existingVariant = await pool.query('SELECT product_id FROM product_variants WHERE id = $1', [variantId]);
      if (!existingVariant.rows.length) {
        return res.status(404).json({ error: 'Variant not found' });
      }
      if (v.active) {
        const duplicate = await hasDuplicateVariantName(existingVariant.rows[0].product_id, v.name, variantId);
        if (duplicate) {
          return res.status(409).json({ error: 'Duplicate dosage for this product is not allowed' });
        }
      }
      const result = await pool.query(
        'UPDATE product_variants SET name = $1, price = $2, stock_quantity = $3, active = $4, updated_at = CURRENT_TIMESTAMP ' +
        'WHERE id = $5 RETURNING id, product_id, name, price, stock_quantity, active, created_at, updated_at',
        [v.name, v.price, v.stock_quantity, v.active, variantId]
      );
      res.json({ variant: result.rows[0] });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update variant' });
    }
  });

  // Soft-delete variants to preserve historical order rows.
  router.delete('/variants/:id', gate, async (req, res) => {
    try {
      const variantId = parseInt(req.params.id, 10);
      if (!Number.isInteger(variantId)) {
        return res.status(400).json({ error: 'Invalid variant id' });
      }

      const variantRes = await pool.query(
        'SELECT id, product_id, active FROM product_variants WHERE id = $1',
        [variantId]
      );
      if (!variantRes.rows.length) {
        return res.status(404).json({ error: 'Variant not found' });
      }

      const cartRefRes = await pool.query(
        'SELECT COUNT(*)::int AS count FROM cart_items WHERE variant_id = $1',
        [variantId]
      );
      const orderRefRes = await pool.query(
        'SELECT COUNT(*)::int AS count FROM order_items WHERE variant_id = $1',
        [variantId]
      );
      const hasCartRefs = Number(cartRefRes.rows[0] && cartRefRes.rows[0].count) > 0;
      const hasOrderRefs = Number(orderRefRes.rows[0] && orderRefRes.rows[0].count) > 0;

      if (!hasCartRefs && !hasOrderRefs) {
        await pool.query('DELETE FROM product_variants WHERE id = $1', [variantId]);
        return res.json({
          variant: { id: variantId, product_id: variantRes.rows[0].product_id },
          deleted: true,
          mode: 'hard_delete'
        });
      }

      const result = await pool.query(
        'UPDATE product_variants SET active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 ' +
        'RETURNING id, product_id, active',
        [variantId]
      );
      res.json({ variant: result.rows[0], deleted: true, mode: 'soft_disable' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to deactivate variant' });
    }
  });

  return router;
}

module.exports = createAdminVariantsRouter;