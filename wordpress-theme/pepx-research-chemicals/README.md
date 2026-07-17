# PepX Research Chemicals — WordPress Theme

Upload-ready theme that wraps the PepX storefront (shop + cart) into WordPress.

## What works in WordPress

- Shop page with all 31 products (bundled fallback catalog)
- Category filters + sorting
- Add to cart / update quantities / remove items
- Cart totals with localStorage persistence

## What still needs the Express backend

- Stripe Checkout payments
- Admin product/order dashboard
- Server-side account auth + order history

## Install (ZIP upload)

1. In WordPress Admin go to **Appearance → Themes → Add New → Upload Theme**
2. Upload `pepx-research-chemicals-theme.zip`
3. Activate **PepX Research Chemicals**
4. Create two pages:
   - **Shop** → template: `Shop Page` → slug `shop`
   - **Checkout** (or Cart) → template: `Checkout Page` → slug `checkout`
5. Visit `/shop` and `/checkout`

## Notes

- Product images default to the bundled placeholder image.
- Cart data is stored in the browser (`pepxCart`), so it works without login.
