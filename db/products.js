const crypto = require('crypto');
const { getDb } = require('./connection');

function toMoney(value) {
  const num = Number(value || 0);
  return Math.round(num * 100) / 100;
}

function parseDosages(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch (error) {
    return [];
  }
}

function mapProductRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    price: toMoney(row.price),
    image: row.image || 'assets/products/default-product.png',
    inventory: Number(row.inventory || 0),
    category: row.category || '',
    tag: row.tag || '',
    color: row.color || '',
    dosages: parseDosages(row.dosages),
    created_at: row.created_at
  };
}

function normalizeProductInput(body, { partial = false } = {}) {
  const payload = body || {};
  const next = {};

  if (!partial || payload.name !== undefined) {
    next.name = String(payload.name || '').trim();
    if (!next.name) throw new Error('Product name is required.');
  }

  if (!partial || payload.description !== undefined) {
    next.description = String(payload.description || '').trim();
  }

  if (!partial || payload.price !== undefined) {
    next.price = toMoney(payload.price);
    if (!Number.isFinite(next.price) || next.price < 0) {
      throw new Error('Product price must be a non-negative number.');
    }
  }

  if (!partial || payload.image !== undefined) {
    next.image = String(payload.image || 'assets/products/default-product.png').trim();
  }

  if (!partial || payload.inventory !== undefined) {
    next.inventory = Math.max(0, parseInt(payload.inventory, 10) || 0);
  }

  if (!partial || payload.category !== undefined) {
    next.category = String(payload.category || '').trim();
  }

  if (!partial || payload.tag !== undefined) {
    next.tag = String(payload.tag || '').trim();
  }

  if (!partial || payload.color !== undefined) {
    next.color = String(payload.color || '').trim();
  }

  if (!partial || payload.dosages !== undefined) {
    if (Array.isArray(payload.dosages)) {
      next.dosages = payload.dosages.map((item) => String(item).trim()).filter(Boolean);
    } else if (typeof payload.dosages === 'string') {
      next.dosages = payload.dosages
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    } else {
      next.dosages = [];
    }
  }

  if (!partial || payload.id !== undefined) {
    const rawId = String(payload.id || '').trim();
    next.id = rawId || undefined;
  }

  return next;
}

async function listProducts() {
  const db = await getDb();
  const rows = await db.all('SELECT * FROM products ORDER BY name COLLATE NOCASE ASC;');
  return rows.map(mapProductRow);
}

async function getProductById(id) {
  const db = await getDb();
  const row = await db.get('SELECT * FROM products WHERE id = ?;', id);
  return mapProductRow(row);
}

async function createProduct(body) {
  const input = normalizeProductInput(body, { partial: false });
  const id = input.id || crypto.randomUUID();
  const db = await getDb();

  const existing = await db.get('SELECT id FROM products WHERE id = ?;', id);
  if (existing) {
    throw new Error('A product with this id already exists.');
  }

  await db.run(
    `
    INSERT INTO products (id, name, description, price, image, inventory, category, tag, color, dosages)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    id,
    input.name,
    input.description || '',
    input.price,
    input.image || 'assets/products/default-product.png',
    input.inventory || 0,
    input.category || '',
    input.tag || '',
    input.color || '',
    JSON.stringify(input.dosages || [])
  );

  return getProductById(id);
}

async function updateProduct(id, body) {
  const current = await getProductById(id);
  if (!current) {
    const error = new Error('Product not found.');
    error.statusCode = 404;
    throw error;
  }

  const input = normalizeProductInput(body, { partial: true });
  const next = {
    name: input.name !== undefined ? input.name : current.name,
    description: input.description !== undefined ? input.description : current.description,
    price: input.price !== undefined ? input.price : current.price,
    image: input.image !== undefined ? input.image : current.image,
    inventory: input.inventory !== undefined ? input.inventory : current.inventory,
    category: input.category !== undefined ? input.category : current.category,
    tag: input.tag !== undefined ? input.tag : current.tag,
    color: input.color !== undefined ? input.color : current.color,
    dosages: input.dosages !== undefined ? input.dosages : current.dosages
  };

  const db = await getDb();
  await db.run(
    `
    UPDATE products
    SET name = ?, description = ?, price = ?, image = ?, inventory = ?, category = ?, tag = ?, color = ?, dosages = ?
    WHERE id = ?;
    `,
    next.name,
    next.description,
    next.price,
    next.image,
    next.inventory,
    next.category,
    next.tag,
    next.color,
    JSON.stringify(next.dosages || []),
    id
  );

  return getProductById(id);
}

async function deleteProduct(id) {
  const db = await getDb();
  const result = await db.run('DELETE FROM products WHERE id = ?;', id);
  if (!result.changes) {
    const error = new Error('Product not found.');
    error.statusCode = 404;
    throw error;
  }
  return { ok: true };
}

async function decrementInventory(items) {
  const db = await getDb();
  for (const item of items) {
    await db.run(
      `
      UPDATE products
      SET inventory = CASE
        WHEN inventory > ? THEN inventory - ?
        ELSE 0
      END
      WHERE id = ?;
      `,
      item.quantity,
      item.quantity,
      item.productId
    );
  }
}

module.exports = {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  decrementInventory,
  mapProductRow,
  toMoney
};
