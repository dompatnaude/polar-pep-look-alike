(function () {
  function updateCartCount(count) {
    var el = document.getElementById('pepx-cart-count');
    if (!el) return;
    el.textContent = String(count || 0);
    el.style.display = count > 0 ? 'inline-flex' : 'none';
  }

  function showStatus(button, message) {
    var original = button.getAttribute('data-original-label') || button.textContent;
    button.setAttribute('data-original-label', original);
    button.textContent = message;
    window.setTimeout(function () {
      button.textContent = original;
    }, 1200);
  }

  async function addToCart(variantId, button) {
    var endpoint = (window.PEPX_ROUTES && window.PEPX_ROUTES.cartAdd) || '/cart/add.js';
    var payload = { items: [{ id: Number(variantId), quantity: 1 }] };

    button.disabled = true;
    try {
      var addResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!addResponse.ok) {
        throw new Error('Could not add to cart');
      }

      var cartResponse = await fetch('/cart.js', { headers: { Accept: 'application/json' } });
      if (cartResponse.ok) {
        var cart = await cartResponse.json();
        updateCartCount(cart.item_count || 0);
      }

      showStatus(button, 'Added');
    } catch (error) {
      showStatus(button, 'Failed');
    } finally {
      button.disabled = false;
    }
  }

  function bindAddButtons() {
    var buttons = document.querySelectorAll('.js-add-to-cart[data-variant-id]');
    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        var variantId = button.getAttribute('data-variant-id');
        if (!variantId) return;
        addToCart(variantId, button);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    bindAddButtons();
  });
})();
