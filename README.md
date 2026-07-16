# PepX Research Website

This project now includes a real backend authentication setup (server-side sessions and password hashing), while still serving the same storefront pages.

## What Is Included

- Email/password signup and login via backend API
- Password hashing using `bcryptjs`
- Session-based authentication with `express-session`
- Persistent server-side user storage in SQLite (`data/app.db`)
- Migration runner with tracked schema versions (`schema_migrations` table)
- Google OAuth signup/login via Passport (when configured)

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create your environment file:

```bash
cp .env.example .env
```

3. Set required values in `.env`:

- `SESSION_SECRET` (required)
- `DATABASE_PATH` (optional, defaults to `./data/app.db`)
- `GOOGLE_CLIENT_ID` (optional for Google auth)
- `GOOGLE_CLIENT_SECRET` (optional for Google auth)
- `GOOGLE_CALLBACK_URL` (optional for Google auth)

4. Start the server:

```bash
npm start
```

To run migrations manually:

```bash
npm run migrate
```

5. Open the site:

- http://localhost:3000/index.html

## Auth API Endpoints

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`
- `GET /auth/google`
- `GET /auth/google/callback`

## Notes

- Google auth buttons are functional only when Google OAuth env vars are configured.
- User data is stored in SQLite at `data/app.db` for this deployment model.
- For production hardening, use an external database and a production session store.

## Shopify Theme-First Path

If you want Shopify-native integration, use the dedicated theme scaffold in `shopify-theme/`.

- Start with `shopify-theme/README.md`
- Push with Shopify CLI: `shopify theme push --path shopify-theme --store YOUR_STORE.myshopify.com`