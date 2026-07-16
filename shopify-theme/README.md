# Shopify Theme-First Integration

This folder contains a Shopify Online Store 2.0 theme scaffold for your PepX storefront.

## What this solves

- Uses Shopify-native Liquid templates/sections
- Renders products from a Shopify collection
- Adds products to cart via Shopify AJAX cart endpoints
- Uses Shopify cart count in header

## Included files

- layout/theme.liquid
- templates/index.json
- templates/page.shop.json
- sections/pepx-header.liquid
- sections/pepx-footer.liquid
- sections/pepx-hero.liquid
- sections/pepx-products-grid.liquid
- assets/pepx.css
- assets/pepx.js

## How to use

1. In Shopify admin, create a page named Shop.
2. Assign the page template suffix shop (which maps to page.shop.json).
3. Upload this theme with Shopify CLI:

   shopify theme push --path shopify-theme --store YOUR_STORE.myshopify.com

4. In Customize Theme:
   - Set navigation menu handle to main-menu (or edit section file to match your menu handle).
   - Configure the PepX Products Grid section collection.

## Notes

- This is intentionally theme-first. It does not use your Express auth/SQLite backend.
- If you want account features, use Shopify Customer Accounts or build a Shopify app for custom account flows.
