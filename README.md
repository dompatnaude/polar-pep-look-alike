# PepX Research Ecommerce

Express storefront with SQLite, session auth, product catalog, localStorage cart, Stripe Checkout, orders, and an admin dashboard.

## Stack

- **Frontend:** static HTML/CSS/JS (`index.html`, `shop.html`, `product.html`, `cart.html`, `account.html`, `admin.html`)
- **Backend:** Express (`server.js`)
- **Auth:** bcrypt password hashing + `express-session` (optional Google OAuth)
- **Database:** SQLite with versioned migrations (`db/migrations`)
- **Payments:** Stripe Checkout

## Local Setup

```bash
npm install
cp .env.example .env
```

Edit `.env` and set at least:

- `SESSION_SECRET`
- `ADMIN_EMAIL` (account email that should receive admin access)
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLIC_KEY`
- `APP_BASE_URL=http://localhost:3000`

Start the app:

```bash
npm start
```

Manual migrations/seed:

```bash
npm run migrate
```

Open:

- Storefront: http://localhost:3000/index.html
- Shop: http://localhost:3000/shop.html
- Cart: http://localhost:3000/cart.html
- Admin: http://localhost:3000/admin

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `SESSION_SECRET` | Yes | Signs session cookies |
| `DATABASE_PATH` | No | SQLite file path (default `./data/app.db`) |
| `PORT` | No | Server port (default `3000`) |
| `APP_BASE_URL` | Yes for Stripe | Success/cancel redirect base URL |
| `STRIPE_SECRET_KEY` | Yes for checkout | Server-only Stripe secret |
| `STRIPE_PUBLIC_KEY` | Recommended | Returned by `/api/config` (never put secret key in frontend) |
| `ADMIN_EMAIL` | Yes for admin | Promotes this user to admin |
| `CLIENT_ORIGIN` | Split deploy only | Allowed browser origin for CORS + credentials |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_CALLBACK_URL` | Optional | Google OAuth |

Secrets must stay in `.env` / host env settings. `.env` and `data/*.db` are gitignored.

## API Overview

### Auth
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`

### Products
- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/products` (admin)
- `PUT /api/products/:id` (admin)
- `DELETE /api/products/:id` (admin)

### Checkout / Orders
- `POST /api/create-checkout-session`
- `GET /api/checkout-session/:sessionId` (verifies payment + creates order)
- `GET /api/admin/orders` (admin)
- `PUT /api/admin/orders/:id/status` (admin)

## Feature Notes

1. **Products** are stored in SQLite and seeded from the previous hardcoded catalog on first migrate.
2. **Cart** uses `localStorage` (`pepxCart`) and works without login.
3. **Checkout** creates a Stripe Checkout Session; after payment, `success.html` confirms the session and persists an order.
4. **Orders** link to the signed-in user when available; guests can still pay.
5. **Admin** at `/admin` can CRUD products and update order status.

## Production Deployment

Recommended split:

| Piece | Host |
|---|---|
| Frontend static files | Vercel |
| Express API | Render or Railway |
| Database | Render persistent disk (SQLite) or managed Postgres (future migration) |

### Render / Railway (API)

1. Deploy this repo as a Node web service.
2. Start command: `npm start`
3. Set env vars from `.env.example`.
4. Set `APP_BASE_URL` to the public API/site URL that serves `success.html` and `cart.html`.
5. For SQLite on Render, attach a persistent disk and point `DATABASE_PATH` at that mount (example: `/var/data/app.db`).

### Vercel (frontend)

1. Publish the static HTML/CSS/JS assets (`vercel.json` included).
2. Before `script.js` / `admin.js`, set the API origin:

```html
<script>window.PEPX_API_BASE = 'https://your-api.onrender.com';</script>
```

3. Set `CLIENT_ORIGIN` on the API to your Vercel domain.
4. In production with cross-site cookies, the API uses `SameSite=None; Secure` when `CLIENT_ORIGIN` is set.

### Single-host option

You can also serve frontend + API together from Render/Railway (simplest). In that case leave `CLIENT_ORIGIN` empty and set `APP_BASE_URL` to the same host.

## Testing Checklist

```bash
npm run migrate
npm start
```

1. `GET /api/products` returns seeded products.
2. Shop/product pages render DB products.
3. Add/remove/update cart quantities on `/cart.html` (persists after refresh).
4. With Stripe test keys, checkout redirects to Stripe and returns to `/success.html`.
5. Paid session creates an order visible on `/account.html` (if logged in) and `/admin`.
6. Admin login (user matching `ADMIN_EMAIL`) can create/edit/delete products and update order status.

## Shopify / WordPress folders

`shopify-theme/` and `wordpress-theme/` remain available but are not required for this Express ecommerce path.
