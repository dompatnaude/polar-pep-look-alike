const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const crypto = require('crypto');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { getDb } = require('./db/connection');
const { runMigrations } = require('./db/migrate');

require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-session-secret-change-me';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    institution: user.institution || '',
    provider: user.provider || 'Email'
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
    googleId: row.google_id || ''
  };
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
      sameSite: 'lax',
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
    if (!req.user && !req.session.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!req.user && req.session.userId) {
      const sessionUser = await findUserById(req.session.userId);
      if (!sessionUser) {
        req.session.destroy(() => {});
        return res.status(401).json({ error: 'Unauthorized' });
      }
      req.user = sessionUser;
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

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
  req.session.userId = user.id;

  return res.status(201).json({ user: toPublicUser(user) });
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
    if (req.user) {
      return res.json({ user: toPublicUser(req.user) });
    }
    if (req.session.userId) {
      const user = await findUserById(req.session.userId);
      if (user) {
        return res.json({ user: toPublicUser(user) });
      }
    }
    return res.json({ user: null });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load auth session.' });
  }
});

app.get('/auth/google', (req, res, next) => {
  if (!googleConfigured) {
    return res.redirect('/index.html?auth=google-not-configured');
  }
  return passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

app.get('/auth/google/callback', (req, res, next) => {
  if (!googleConfigured) {
    return res.redirect('/index.html?auth=google-not-configured');
  }
  return passport.authenticate('google', { failureRedirect: '/index.html?auth=google-failed' })(req, res, () => {
    req.session.userId = req.user.id;
    res.redirect('/index.html?auth=google-success');
  });
});

app.get('/api/auth/protected', requireAuth, (req, res) => {
  return res.json({ user: toPublicUser(req.user) });
});

app.use(express.static(path.join(__dirname)));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

async function startServer() {
  await runMigrations();
  app.listen(PORT, () => {
    console.log(`PepX server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Server startup failed:', error);
  process.exit(1);
});
