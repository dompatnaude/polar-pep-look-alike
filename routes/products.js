const express = require("express");
const router = express.Router();
const pool = require("../db/connection");

// GET all products (SELECT * includes category)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM products WHERE active = true ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// GET single product by slug (SELECT * includes category)
router.get("/:slug", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM products WHERE slug = $1",
      [req.params.slug]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

// CREATE product (now accepts category)
router.post("/", async (req, res) => {
  try {
    const { name, slug, description, price, image_url, sku, stock_quantity, category } = req.body;
    const result = await pool.query(
      `INSERT INTO products
        (name, slug, description, price, image_url, sku, stock_quantity, category)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [name, slug, description, price, image_url, sku, stock_quantity, category]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create product" });
  }
});

module.exports = router;
