<?php
/*
Template Name: Checkout Page
*/
get_header(); ?>
<main class="container page-checkout page-cart">
  <section class="section">
    <h1>Your Cart</h1>
    <p class="sub">Review items, update quantities, and continue shopping. Live Stripe checkout requires the Express backend.</p>
    <div class="cart-table" id="checkoutCart"></div>
    <div class="drawer-foot cart-summary">
      <div class="tot"><span>Subtotal</span><span id="cartSubtotal">$0.00</span></div>
      <div class="tot"><span>Total</span><span id="cartTotal">$0.00</span></div>
      <button class="btn primary co" id="checkoutBtn" type="button">Checkout with Stripe</button>
      <a class="btn ghost" href="<?php echo esc_url(home_url('/shop')); ?>">Continue Shopping</a>
    </div>
  </section>
</main>
<?php get_footer(); ?>
