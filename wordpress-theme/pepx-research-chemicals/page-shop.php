<?php
/*
Template Name: Shop Page
*/
get_header(); ?>
<main class="container page-shop">
  <section class="shop-banner" aria-label="Shop banner">
    <h1>SHOP</h1>
    <p>High quality peptides for research purposes only</p>
  </section>
  <section class="shop-hero shop-hero-modern">
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
        <select id="sortSelect" class="sort-select">
          <option value="default">Recommended</option>
          <option value="nameAsc">A-Z</option>
          <option value="nameDesc">Z-A</option>
          <option value="priceAsc">Price: Low to High</option>
          <option value="priceDesc">Price: High to Low</option>
        </select>
      </div>
    </div>
  </section>
  <section class="section section-shop">
    <div class="grid grid-shop" id="productGrid"></div>
  </section>
</main>

<div class="backdrop" id="backdrop"></div>
<div class="product-modal" id="productModal">
  <div class="product-modal-card">
    <button class="product-modal-close" id="closeProductModal" type="button">&times;</button>
    <div class="product-modal-body">
      <div class="product-modal-image"></div>
      <div class="product-modal-info">
        <span class="tag" id="productModalTag"></span>
        <h3 id="productModalTitle"></h3>
        <p class="product-modal-price" id="productModalPrice"></p>
        <p class="product-modal-description">Research-grade reagent for laboratory use only. Handle with appropriate controls and safety procedures.</p>
        <div class="product-modal-qty">
          <label for="productModalQty">Quantity</label>
          <input type="number" id="productModalQty" min="1" value="1">
        </div>
        <button class="btn primary" id="addProductModalBtn" type="button">Add to Cart</button>
      </div>
    </div>
  </div>
</div>
<div class="toast" id="toast"></div>
<?php get_footer(); ?>
