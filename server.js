const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const crypto = require('crypto');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const Stripe = require('stripe');
const { getDb } = require('./db/connection');
const { runMigrations } = require('./db/migrate');
const {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  decrementInventory,
  toMoney
} = require('./db/products');

require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-session-secret-change-me';
const APP_BASE_URL = String(process.env.APP_BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const CLIENT_ORIGIN = String(process.env.CLIENT_ORIGIN || '').replace(/\/$/, '');
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_PUBLIC_KEY = process.env.STRIPE_PUBLIC_KEY || '';
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    institution: user.institution || '',
    provider: user.provider || 'Email',
    isAdmin: !!user.isAdmin
  };
}

function mapUserRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    institution: row.institution,
    provider: row.provider,
    passwordHash: row.password_hash || '',
    googleId: row.google_id || '',
    isAdmin: !!row.is_admin
  };
}

function mapAddressRow(row) {
  if (!row) {
    return {
      billingAddress: '',
      shippingAddress: ''
    };
  }

  return {
    billingAddress: row.billing_address || '',
    shippingAddress: row.shipping_address || ''
  };
}

function sanitizeReturnPath(value) {
  const raw = String(value || '').trim();
  if (!raw.startsWith('/')) return null;
  if (raw.startsWith('//')) return null;
  if (raw.includes('://')) return null;
  return raw;
}

function withAuthQuery(pathname, authValue) {
  const safePath = sanitizeReturnPath(pathname) || '/index.html';
  const [base, queryString = ''] = safePath.split('?');
  const params = new URLSearchParams(queryString);
  params.set('auth', authValue);
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

async function findUserById(id) {
  const db = await getDb();
  const row = await db.get('SELECT * FROM users WHERE id = ?;', id);
  return mapUserRow(row);
}

async function findUserByEmail(email) {
  const db = await getDb();
  const normalized = normalizeEmail(email);
  const row = await db.get('SELECT * FROM users WHERE email = ?;', normalized);
  return mapUserRow(row);
}

async function saveOrUpdateUser(nextUser) {
  const db = await getDb();
  const existing = await db.get('SELECT id FROM users WHERE id = ?;', nextUser.id);

  if (existing) {
    await db.run(
      `
      UPDATE users
      SET name = ?, email = ?, institution = ?, provider = ?, password_hash = ?, google_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?;
      `,
      nextUser.name,
      normalizeEmail(nextUser.email),
      nextUser.institution,
      nextUser.provider,
      nextUser.passwordHash || null,
      nextUser.googleId || null,
      nextUser.id
    );
    return;
  }

  await db.run(
    `
    INSERT INTO users (id, name, email, institution, provider, password_hash, google_id)
    VALUES (?, ?, ?, ?, ?, ?, ?);
    `,
    nextUser.id,
    nextUser.name,
    normalizeEmail(nextUser.email),
    nextUser.institution,
    nextUser.provider,
    nextUser.passwordHash || null,
    nextUser.googleId || null
  );
}

async function findAddressByUserId(userId) {
  const db = await getDb();
  const row = await db.get('SELECT * FROM user_addresses WHERE user_id = ?;', userId);
  return mapAddressRow(row);
}

async function saveAddressByUserId(userId, nextAddress) {
  const db = await getDb();
  await db.run(
    `
    INSERT INTO user_addresses (user_id, billing_address, shipping_address, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET
      billing_address = excluded.billing_address,
      shipping_address = excluded.shipping_address,
      updated_at = CURRENT_TIMESTAMP;
    `,
    userId,
    String(nextAddress.billingAddress || '').trim(),
    String(nextAddress.shippingAddress || '').trim()
  );
}

async function resolveSessionUser(req) {
  if (req.user) return req.user;
  if (!req.session.userId) return null;
  const sessionUser = await findUserById(req.session.userId);
  if (!sessionUser) {
    req.session.destroy(() => {});
    return null;
  }
  req.user = sessionUser;
  return sessionUser;
}

function mapOrderRow(row, items = []) {
  return {
    id: row.id,
    userId: row.user_id || null,
    stripePaymentId: row.stripe_payment_id || null,
    status: row.status,
    total: toMoney(row.total),
    totalAmount: toMoney(row.total),
    createdAt: row.created_at,
    items
  };
}

async function listOrderItems(orderIds) {
  if (!orderIds.length) return new Map();
  const db = await getDb();
  const placeholders = orderIds.map(() => '?').join(',');
  const itemRows = await db.all(
    `
    SELECT id, order_id, product_id, product_name, price, quantity
    FROM order_items
    WHERE order_id IN (${placeholders})
    ORDER BY id ASC;
    `,
    ...orderIds
  );

  const itemsByOrderId = new Map();
  itemRows.forEach((row) => {
    const existing = itemsByOrderId.get(row.order_id) || [];
    existing.push({
      id: row.id,
      productId: row.product_id,
      name: row.product_name,
      unitPrice: toMoney(row.price),
      price: toMoney(row.price),
      quantity: Number(row.quantity || 0),
      lineTotal: toMoney(Number(row.quantity || 0) * Number(row.price || 0))
    });
    itemsByOrderId.set(row.order_id, existing);
  });
  return itemsByOrderId;
}

async function listOrdersByUserId(userId) {
  const db = await getDb();
  const orderRows = await db.all(
    `
    SELECT id, user_id, stripe_payment_id, status, total, created_at
    FROM orders
    WHERE user_id = ?
    ORDER BY datetime(created_at) DESC;
    `,
    userId
  );

  const itemsByOrderId = await listOrderItems(orderRows.map((row) => row.id));
  return orderRows.map((row) => mapOrderRow(row, itemsByOrderId.get(row.id) || []));
}

async function listAllOrders() {
  const db = await getDb();
  const orderRows = await db.all(
    `
    SELECT id, user_id, stripe_payment_id, status, total, created_at
    FROM orders
    ORDER BY datetime(created_at) DESC;
    `
  );
  const itemsByOrderId = await listOrderItems(orderRows.map((row) => row.id));
  return orderRows.map((row) => mapOrderRow(row, itemsByOrderId.get(row.id) || []));
}

async function getOrderByStripePaymentId(stripePaymentId) {
  const db = await getDb();
  const row = await db.get(
    'SELECT id, user_id, stripe_payment_id, status, total, created_at FROM orders WHERE stripe_payment_id = ?;',
    stripePaymentId
  );
  if (!row) return null;
  const itemsByOrderId = await listOrderItems([row.id]);
  return mapOrderRow(row, itemsByOrderId.get(row.id) || []);
}

async function createOrderRecord({ userId = null, stripePaymentId = null, status = 'Paid', items }) {
  const payloadItems = Array.isArray(items) ? items : [];
  if (!payloadItems.length) {
    throw new Error('Order must include at least one item.');
  }

  const normalizedItems = [];
  for (const item of payloadItems) {
    const productId = String(item.productId || item.id || '').trim();
    const quantity = Math.max(1, Number(item.quantity || 0));
    const product = await getProductById(productId);
    const name = String(item.name || (product && product.name) || '').trim();
    const unitPrice = toMoney(item.unitPrice !== undefined ? item.unitPrice : item.price !== undefined ? item.price : product && product.price);

    if (!productId || !name || !Number.isFinite(unitPrice) || unitPrice <= 0) {
      throw new Error('Invalid order item payload.');
    }

    normalizedItems.push({
      productId,
      name,
      quantity,
      unitPrice,
      lineTotal: toMoney(quantity * unitPrice)
    });
  }

  const orderId = crypto.randomUUID();
  const total = toMoney(normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0));
  const db = await getDb();

  await db.exec('BEGIN;');
  try {
    await db.run(
      'INSERT INTO orders (id, user_id, stripe_payment_id, status, total) VALUES (?, ?, ?, ?, ?);',
      orderId,
      userId || null,
      stripePaymentId || null,
      status,
      total
    );

    for (const item of normalizedItems) {
      await db.run(
        `
        INSERT INTO order_items (order_id, product_id, product_name, price, quantity)
        VALUES (?, ?, ?, ?, ?);
        `,
        orderId,
        item.productId,
        item.name,
        item.unitPrice,
        item.quantity
      );
    }

    await decrementInventory(normalizedItems);
    await db.exec('COMMIT;');
  } catch (error) {
    await db.exec('ROLLBACK;');
    throw error;
  }

  return {
    id: orderId,
    userId: userId || null,
    stripePaymentId: stripePaymentId || null,
    status,
    total,
    totalAmount: total,
    items: normalizedItems
  };
}

async function createOrderFromStripeSession(session) {
  if (!session || session.payment_status !== 'paid') {
    throw new Error('Checkout session is not paid.');
  }

  const paymentId = session.payment_intent || session.id;
  const existing = await getOrderByStripePaymentId(paymentId);
  if (existing) return { order: existing, created: false };

  let metadataItems = [];
  let intentUserId = null;
  const intentId = session.metadata && session.metadata.checkout_intent_id;
  const db = await getDb();
  if (intentId) {
    const intent = await db.get('SELECT items_json, user_id FROM checkout_intents WHERE id = ?;', intentId);
    if (intent) {
      intentUserId = intent.user_id || null;
      if (intent.items_json) {
        try {
          const parsed = JSON.parse(intent.items_json);
          if (Array.isArray(parsed)) metadataItems = parsed;
        } catch (error) {
          metadataItems = [];
        }
      }
    }
  }

  let lineItems = [];
  if (!metadataItems.length && stripe) {
    const stripeItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });
    lineItems = stripeItems.data || [];
  }

  const items = metadataItems.length
    ? metadataItems.map((item) => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      }))
    : lineItems.map((item) => ({
        productId: (item.price && item.price.product) || item.id,
        name: item.description || 'Product',
        quantity: item.quantity || 1,
        unitPrice: toMoney((item.amount_total || 0) / 100 / Math.max(1, item.quantity || 1))
      }));

  const metadataUserId = session.metadata && session.metadata.user_id ? session.metadata.user_id : null;
  const userId = intentUserId || metadataUserId || null;
  const order = await createOrderRecord({
    userId,
    stripePaymentId: paymentId,
    status: 'Paid',
    items
  });

  if (intentId) {
    await db.run('DELETE FROM checkout_intents WHERE id = ?;', intentId);
  }

  return { order, created: true };
}

app.use((req, res, next) => {
  if (!CLIENT_ORIGIN) return next();
  res.header('Access-Control-Allow-Origin', CLIENT_ORIGIN);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
});

app.use(express.json());
app.use(
  session({
    name: 'pepx.sid',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' && CLIENT_ORIGIN ? 'none' : 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await findUserById(id);
    done(null, user || false);
  } catch (error) {
    done(error);
  }
});

const googleConfigured =
  !!process.env.GOOGLE_CLIENT_ID &&
  !!process.env.GOOGLE_CLIENT_SECRET &&
  !!process.env.GOOGLE_CALLBACK_URL;

if (googleConfigured) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = normalizeEmail(profile.emails && profile.emails[0] ? profile.emails[0].value : '');
          const displayName = profile.displayName || 'Google User';
          const googleId = profile.id;

          if (!email) {
            return done(new Error('Google account did not provide an email address.'));
          }

          const db = await getDb();
          const existingByGoogle = await db.get('SELECT * FROM users WHERE google_id = ?;', googleId);
          const existingByEmail = await db.get('SELECT * FROM users WHERE email = ?;', email);
          let user = mapUserRow(existingByGoogle || existingByEmail);

          if (!user) {
            user = {
              id: crypto.randomUUID(),
              name: displayName,
              email,
              institution: 'Google Account',
              provider: 'Google',
              googleId,
              passwordHash: ''
            };
            await saveOrUpdateUser(user);
          } else {
            user.name = user.name || displayName;
            user.provider = 'Google';
            user.googleId = googleId;
            await saveOrUpdateUser(user);
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );
}

async function requireAuth(req, res, next) {
  try {
    const user = await resolveSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return next();
  } catch (error) {
    return next(error);
  }
}

async function requireAdmin(req, res, next) {
  try {
    const user = await resolveSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required.' });
    }
    return next();
  } catch (error) {
    return next(error);
  }
}

app.get('/api/config', (req, res) => {
  return res.json({
    stripePublicKey: STRIPE_PUBLIC_KEY || null,
    stripeEnabled: !!stripe
  });
});

app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password, institution } = req.body || {};
  const normalizedEmail = normalizeEmail(email);

  if (!name || !normalizedEmail || !password || !institution) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  if (String(password).length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  if (await findUserByEmail(normalizedEmail)) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const passwordHash = await bcrypt.hash(String(password), 12);
  const user = {
    id: crypto.randomUUID(),
    name: String(name).trim(),
    email: normalizedEmail,
    institution: String(institution).trim(),
    provider: 'Email',
    passwordHash,
    googleId: ''
  };

  await saveOrUpdateUser(user);

  const adminEmail = normalizeEmail(process.env.ADMIN_EMAIL || '');
  if (adminEmail && normalizedEmail === adminEmail) {
    const db = await getDb();
    await db.run('UPDATE users SET is_admin = 1 WHERE id = ?;', user.id);
    user.isAdmin = true;
  }

  req.session.userId = user.id;
  const saved = await findUserById(user.id);
  return res.status(201).json({ user: toPublicUser(saved || user) });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = await findUserByEmail(normalizedEmail);
  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const matches = await bcrypt.compare(String(password), user.passwordHash);
  if (!matches) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  req.session.userId = user.id;
  return res.json({ user: toPublicUser(user) });
});

app.post('/api/auth/logout', (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.clearCookie('pepx.sid');
      res.json({ ok: true });
    });
  });
});

app.get('/api/auth/session', async (req, res) => {
  try {
    const user = await resolveSessionUser(req);
    return res.json({ user: user ? toPublicUser(user) : null });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load auth session.' });
  }
});

app.get('/auth/google', (req, res, next) => {
  if (!googleConfigured) {
    const fallbackTarget = sanitizeReturnPath(req.query.next) || '/index.html';
    return res.redirect(withAuthQuery(fallbackTarget, 'google-not-configured'));
  }

  const requestedNext = sanitizeReturnPath(req.query.next) || '/account.html';
  req.session.oauthReturnTo = requestedNext;
  return passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

app.get('/auth/google/callback', (req, res, next) => {
  if (!googleConfigured) {
    return res.redirect('/index.html?auth=google-not-configured');
  }
  const returnTo = sanitizeReturnPath(req.session.oauthReturnTo) || '/account.html';
  delete req.session.oauthReturnTo;

  return passport.authenticate('google', { failureRedirect: withAuthQuery(returnTo, 'google-failed') })(req, res, async () => {
    req.session.userId = req.user.id;
    const adminEmail = normalizeEmail(process.env.ADMIN_EMAIL || '');
    if (adminEmail && normalizeEmail(req.user.email) === adminEmail) {
      const db = await getDb();
      await db.run('UPDATE users SET is_admin = 1 WHERE id = ?;', req.user.id);
    }
    res.redirect(withAuthQuery(returnTo, 'google-success'));
  });
});

app.get('/api/auth/protected', requireAuth, (req, res) => {
  return res.json({ user: toPublicUser(req.user) });
});

app.get('/api/products', async (req, res) => {
  try {
    const products = await listProducts();
    return res.json({ products });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load products.' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await getProductById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    return res.json({ product });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load product.' });
  }
});

app.post('/api/products', requireAdmin, async (req, res) => {
  try {
    const product = await createProduct(req.body || {});
    return res.status(201).json({ product });
  } catch (error) {
    const status = error.statusCode || (String(error.message || '').includes('required') || String(error.message || '').includes('exists') ? 400 : 500);
    return res.status(status).json({ error: error.message || 'Failed to create product.' });
  }
});

app.put('/api/products/:id', requireAdmin, async (req, res) => {
  try {
    const product = await updateProduct(req.params.id, req.body || {});
    return res.json({ product });
  } catch (error) {
    const status = error.statusCode || (String(error.message || '').includes('required') ? 400 : 500);
    return res.status(status).json({ error: error.message || 'Failed to update product.' });
  }
});

app.delete('/api/products/:id', requireAdmin, async (req, res) => {
  try {
    await deleteProduct(req.params.id);
    return res.json({ ok: true });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ error: error.message || 'Failed to delete product.' });
  }
});

app.post('/api/create-checkout-session', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe is not configured. Set STRIPE_SECRET_KEY.' });
    }

    const items = Array.isArray(req.body && req.body.items) ? req.body.items : [];
    if (!items.length) {
      return res.status(400).json({ error: 'Cart items are required.' });
    }

    const lineItems = [];
    const cartMeta = [];

    for (const item of items) {
      const productId = String(item.productId || item.id || '').trim();
      const quantity = Math.max(1, parseInt(item.quantity, 10) || 0);
      const product = await getProductById(productId);

      if (!product) {
        return res.status(400).json({ error: `Unknown product: ${productId}` });
      }
      if (product.inventory < quantity) {
        return res.status(400).json({ error: `Insufficient inventory for ${product.name}.` });
      }

      lineItems.push({
        quantity,
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(product.price * 100),
          product_data: {
            name: product.name,
            description: product.description || undefined,
            images: product.image && /^https?:\/\//i.test(product.image) ? [product.image] : undefined,
            metadata: { product_id: product.id }
          }
        }
      });

      cartMeta.push({
        productId: product.id,
        name: product.name,
        quantity,
        unitPrice: product.price
      });
    }

    const sessionUser = await resolveSessionUser(req);
    const successUrl = `${APP_BASE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${APP_BASE_URL}/cart.html`;
    const intentId = crypto.randomUUID();
    const db = await getDb();
    await db.run(
      'INSERT INTO checkout_intents (id, user_id, items_json) VALUES (?, ?, ?);',
      intentId,
      sessionUser ? sessionUser.id : null,
      JSON.stringify(cartMeta)
    );

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: sessionUser ? sessionUser.email : undefined,
      metadata: {
        user_id: sessionUser ? sessionUser.id : '',
        checkout_intent_id: intentId
      }
    });

    return res.json({
      id: session.id,
      url: session.url,
      publicKey: STRIPE_PUBLIC_KEY || null
    });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return res.status(500).json({ error: error.message || 'Failed to create checkout session.' });
  }
});

app.get('/api/checkout-session/:sessionId', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe is not configured.' });
    }

    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Checkout session not found.' });
    }

    let order = null;
    let created = false;
    if (session.payment_status === 'paid') {
      const result = await createOrderFromStripeSession(session);
      order = result.order;
      created = result.created;
    }

    return res.json({
      session: {
        id: session.id,
        paymentStatus: session.payment_status,
        amountTotal: toMoney((session.amount_total || 0) / 100),
        customerEmail: session.customer_details && session.customer_details.email
      },
      order,
      created
    });
  } catch (error) {
    console.error('Checkout session lookup failed:', error);
    return res.status(500).json({ error: 'Failed to verify checkout session.' });
  }
});

app.get('/api/admin/orders', requireAdmin, async (req, res) => {
  try {
    const orders = await listAllOrders();
    return res.json({ orders });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load orders.' });
  }
});

app.put('/api/admin/orders/:id/status', requireAdmin, async (req, res) => {
  try {
    const status = String((req.body && req.body.status) || '').trim();
    const allowed = ['Processing', 'Paid', 'Shipped', 'Completed', 'Cancelled', 'Refunded'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${allowed.join(', ')}` });
    }

    const db = await getDb();
    const result = await db.run('UPDATE orders SET status = ? WHERE id = ?;', status, req.params.id);
    if (!result.changes) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const row = await db.get(
      'SELECT id, user_id, stripe_payment_id, status, total, created_at FROM orders WHERE id = ?;',
      req.params.id
    );
    const itemsByOrderId = await listOrderItems([req.params.id]);
    return res.json({ order: mapOrderRow(row, itemsByOrderId.get(row.id) || []) });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update order status.' });
  }
});

app.get('/api/account/overview', async (req, res) => {
  try {
    const sessionUser = await resolveSessionUser(req);

    if (!sessionUser) {
      return res.json({
        profile: null,
        orders: []
      });
    }

    const user = await findUserById(sessionUser.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const address = await findAddressByUserId(user.id);
    const orders = await listOrdersByUserId(user.id);

    return res.json({
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        institution: user.institution,
        provider: user.provider,
        isAdmin: !!user.isAdmin,
        ...address
      },
      orders
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load account overview.' });
  }
});

app.put('/api/account/profile', requireAuth, async (req, res) => {
  try {
    const { name, email, institution } = req.body || {};
    const nextName = String(name || '').trim();
    const nextEmail = normalizeEmail(email);
    const nextInstitution = String(institution || '').trim();

    if (!nextName || !nextEmail || !nextInstitution) {
      return res.status(400).json({ error: 'Name, email, and institution are required.' });
    }

    const existingByEmail = await findUserByEmail(nextEmail);
    if (existingByEmail && existingByEmail.id !== req.user.id) {
      return res.status(409).json({ error: 'This email is already in use.' });
    }

    const current = await findUserById(req.user.id);
    if (!current) {
      return res.status(404).json({ error: 'User not found.' });
    }

    await saveOrUpdateUser({
      ...current,
      name: nextName,
      email: nextEmail,
      institution: nextInstitution
    });

    const updated = await findUserById(req.user.id);
    return res.json({ user: toPublicUser(updated) });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
});

app.put('/api/account/addresses', requireAuth, async (req, res) => {
  try {
    const { billingAddress, shippingAddress } = req.body || {};
    await saveAddressByUserId(req.user.id, {
      billingAddress: String(billingAddress || ''),
      shippingAddress: String(shippingAddress || '')
    });

    const address = await findAddressByUserId(req.user.id);
    return res.json(address);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update addresses.' });
  }
});

app.put('/api/account/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    const nextPassword = String(newPassword || '');

    if (nextPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    }

    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (user.passwordHash) {
      const validCurrent = await bcrypt.compare(String(currentPassword || ''), user.passwordHash);
      if (!validCurrent) {
        return res.status(401).json({ error: 'Current password is incorrect.' });
      }
    }

    const passwordHash = await bcrypt.hash(nextPassword, 12);
    await saveOrUpdateUser({
      ...user,
      passwordHash
    });

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update password.' });
  }
});

app.post('/api/account/orders', requireAuth, async (req, res) => {
  try {
    const { items } = req.body || {};
    const order = await createOrderRecord({
      userId: req.user.id,
      status: 'Processing',
      items
    });
    return res.status(201).json({ order });
  } catch (error) {
    const msg = error && error.message ? error.message : 'Failed to create order.';
    if (msg.includes('Invalid order item') || msg.includes('at least one item')) {
      return res.status(400).json({ error: msg });
    }
    return res.status(500).json({ error: 'Failed to create order.' });
  }
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.use(express.static(path.join(__dirname), {
  extensions: ['html'],
  index: 'index.html'
}));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/auth/')) {
    return res.status(404).json({ error: 'Not found.' });
  }
  return res.sendFile(path.join(__dirname, 'index.html'));
});

async function startServer() {
  const migrationResult = await runMigrations();
  app.listen(PORT, () => {
    console.log(`PepX server listening on http://localhost:${PORT}`);
    console.log(
      `Migrations: ${migrationResult.applied} applied, products seeded: ${migrationResult.seeded}, admin promoted: ${migrationResult.adminPromoted}`
    );
    if (!stripe) {
      console.warn('Stripe is not configured. Set STRIPE_SECRET_KEY and STRIPE_PUBLIC_KEY to enable checkout.');
    }
  });
}

startServer().catch((error) => {
  console.error('Server startup failed:', error);
  process.exit(1);
});
