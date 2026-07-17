<!doctype html>
<html <?php language_attributes(); ?>>
<head>
  <meta charset="<?php bloginfo('charset'); ?>">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<div class="notice-bar">For research use only, Not for human consumption.</div>
<header>
  <div class="container nav">
    <a href="<?php echo esc_url(home_url('/')); ?>" class="logo">
      <span class="logo-mark" aria-label="PepX Research Chemicals">
        <span class="logo-word"><span class="logo-pep">pep</span><span class="logo-x">X</span></span>
        <span class="logo-sub">research chemicals</span>
      </span>
    </a>
    <nav class="menu" id="site-menu">
      <a href="<?php echo esc_url(home_url('/')); ?>">Home</a>
      <a href="<?php echo esc_url(home_url('/shop')); ?>">Shop</a>
      <a href="<?php echo esc_url(home_url('/checkout')); ?>">Cart</a>
      <a href="<?php echo esc_url(home_url('/#faq')); ?>">FAQ</a>
      <a href="<?php echo esc_url(home_url('/#about')); ?>">About</a>
      <a href="mailto:pepxaminos@gmail.com?subject=PepX%20Research%20Inquiry">Contact</a>
    </nav>
    <div class="icons">
      <button type="button" id="mobileMenuToggle" class="icon-btn mobile-nav-toggle" aria-label="Toggle navigation" aria-expanded="false" aria-controls="site-menu">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path></svg>
      </button>
      <div class="search-wrap" id="searchWrap">
        <button type="button" id="searchBtn" class="icon-btn" title="Search" aria-label="Search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="5.5" fill="none" stroke="currentColor" stroke-width="2"></circle><path d="M16 16l4.5 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path></svg>
        </button>
        <input type="text" id="productSearch" placeholder="Search products" aria-label="Search products">
      </div>
      <a href="<?php echo esc_url(home_url('/checkout')); ?>" class="icon-btn cart-btn" id="cartBtn" title="Cart" aria-label="Cart">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="20" r="1.4" fill="currentColor"></circle><circle cx="18" cy="20" r="1.4" fill="currentColor"></circle><path d="M2 4h2l2.2 9.2a1 1 0 0 0 1 .8h9.6a1 1 0 0 0 1-.8L17 7H6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>
        <span class="cart-count" id="cartCount" style="display:none">0</span>
      </a>
    </div>
  </div>
</header>
