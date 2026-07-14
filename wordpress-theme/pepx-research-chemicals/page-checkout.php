<?php
/*
Template Name: Checkout Page
*/
get_header(); ?>
<main class="container page-checkout">
  <section class="section">
    <h1>Your Cart</h1>
    <p class="sub">Review your selected research compounds and proceed to checkout.</p>
    <div class="cart-table" id="checkoutCart"></div>
    <div class="drawer-foot">
      <div class="tot"><span>Total</span><span id="cartTotal">$0.00</span></div>
      <button class="btn primary co" id="checkoutBtn">Place Order</button>
    </div>
  </section>
</main>
<?php get_footer(); ?>
