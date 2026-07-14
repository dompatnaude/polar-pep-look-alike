<!doctype html>
<html <?php language_attributes(); ?>>
<head>
  <meta charset="<?php bloginfo( 'charset' ); ?>">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<header>
  <div class="container nav">
    <a href="<?php echo esc_url(home_url('/')); ?>" class="logo"><span class="logo-mark" aria-label="PepX Research Chemicals"><span class="logo-word"><span class="logo-pep">pep</span><span class="logo-x">X</span></span><span class="logo-sub">research chemicals</span></span></a>
    <nav class="menu">
      <a href="<?php echo esc_url(home_url('/')); ?>">Home</a>
      <a href="<?php echo esc_url(home_url('/shop')); ?>">Shop</a>
      <a href="<?php echo esc_url(home_url('/#faq')); ?>">FAQ</a>
      <a href="<?php echo esc_url(home_url('/#about')); ?>">About</a>
      <a href="<?php echo esc_url(home_url('/#contact')); ?>">Contact</a>
    </nav>
    <div class="icons">
      <div class="search-wrap" id="searchWrap">
        <button type="button" id="searchBtn" class="icon-btn" title="Search" aria-label="Search">🔍</button>
        <input type="text" id="productSearch" placeholder="Search products" aria-label="Search products">
      </div>
      <a href="<?php echo esc_url(home_url('/checkout')); ?>" class="icon-btn cart-btn" id="cartBtn" title="Cart" aria-label="Cart">
        <span class="cart-count" id="cartCount" style="display:none">0</span>
      </a>
    </div>
  </div>
</header>
