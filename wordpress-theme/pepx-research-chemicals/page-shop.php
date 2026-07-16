<?php
/*
Template Name: Shop Page
*/
get_header(); ?>
<main class="container page-shop">
  <?php // Insert the shop hero and filter markup ?>
  <section class="shop-hero shop-hero-modern">
    <div class="hero-copy">
      <span class="badge"><span class="dot"></span>Research Catalog</span>
      <h1>Modern peptide sourcing with clean product cards.</h1>
      <p>Browse the latest research compounds, filter by category, and add items directly to cart.</p>
    </div>
    <div class="hero-actions">
      <div class="filter-bar">
        <div class="filter-group">
          <span class="filter-label">Category</span>
          <div class="pill-list">
            <button type="button" class="pill active" data-filter="all">All</button>
            <button type="button" class="pill" data-filter="Recovery">Recovery</button>
            <button type="button" class="pill" data-filter="Metabolic">Metabolic</button>
            <button type="button" class="pill" data-filter="Repair">Repair</button>
            <button type="button" class="pill" data-filter="Growth">Growth</button>
            <button type="button" class="pill" data-filter="Cellular">Cellular</button>
            <button type="button" class="pill" data-filter="Neuro">Neuro</button>
          </div>
        </div>
        <div class="filter-group sort-group">
          <label for="sortSelect">Sort by</label>
          <select id="sortSelect">
            <option value="default">Recommended</option>
            <option value="nameAsc">A-Z</option>
            <option value="nameDesc">Z-A</option>
            <option value="priceAsc">Price: Low to High</option>
            <option value="priceDesc">Price: High to Low</option>
          </select>
        </div>
      </div>
    </div>
  </section>
  <section class="section section-shop">
    <div class="grid grid-shop" id="productGrid"></div>
  </section>
</main>
<?php get_footer(); ?>
