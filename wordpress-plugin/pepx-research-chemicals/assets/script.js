(function(){
  const root = document.querySelector('.pepx-storefront');
  if(!root) return;

  const products = [
    {id:'bpc157', name:'BPC-157', tag:'ACCELERATED RECOVERY', price:92.99, description:'Research-grade recovery peptide suited to laboratory review and formulation testing.'},
    {id:'glp3', name:'GLP-3 Peptide', tag:'METABOLIC SUPPORT', price:169.99, description:'High-purity metabolic support compound for controlled research applications.'},
    {id:'ghkcu', name:'GHK-Cu', tag:'SKIN & TISSUE REPAIR', price:49.99, description:'A versatile peptide reagent for tissue repair and formulation studies.'},
    {id:'cjc', name:'CJC-1295 + Ipamorelin', tag:'SUSTAINED GH RELEASE', price:94.99, description:'A premium stack for advanced growth hormone pathway research.'},
    {id:'motsc', name:'MOTS-c', tag:'MITOCHONDRIAL SUPPORT', price:64.99, description:'A lab-use peptide product designed for mitochondrial research workflows.'},
    {id:'blend', name:'BPC-157 + TB-500', tag:'TISSUE REPAIR', price:179.99, description:'A combined tissue-repair blend for comparative research review.'},
    {id:'semax', name:'Semax', tag:'FOCUS & NEUROPROTECTION', price:79.99, description:'Neuroprotective peptide used for focus and CNS-related investigations.'},
    {id:'nad', name:'NAD+', tag:'CELLULAR ENERGY', price:129.99, description:'A high-purity cellular energy reagent for assay development.'}
  ];

  const state = {cart:[], reviews:[], search:'', selectedProduct:null};

  function currency(value){ return '$' + Number(value).toFixed(2); }
  function getEl(selector, fallbackId){ return root.querySelector(selector) || document.getElementById(fallbackId) || root.querySelector('#' + fallbackId); }

  function renderProducts(){
    const grid = getEl('#productGrid, [data-product-grid]', 'productGrid');
    if(!grid) return;
    const filtered = products.filter(function(product){
      const q = state.search.toLowerCase();
      return !q || product.name.toLowerCase().includes(q) || product.tag.toLowerCase().includes(q);
    });

    if(!filtered.length){ grid.innerHTML = '<div class="review-empty">No products match your search.</div>'; return; }

    grid.innerHTML = filtered.map(function(product){
      return '<article class="card" data-id="' + product.id + '" role="button" tabindex="0">' +
        '<div class="img"></div><div class="body">' +
        '<span class="tag">' + product.tag + '</span>' +
        '<h3>' + product.name + '</h3>' +
        '<div class="from">From <b>' + currency(product.price) + '</b></div>' +
        '<button class="add-btn" type="button" data-add="' + product.id + '">Add to Cart</button>' +
        '</div></article>';
    }).join('');

    grid.querySelectorAll('.card').forEach(function(card){
      card.addEventListener('click', function(e){
        if(e.target.closest('.add-btn')) return;
        openProductModal(card.getAttribute('data-id'));
      });
      card.addEventListener('keydown', function(e){
        if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); openProductModal(card.getAttribute('data-id')); }
      });
    });

    grid.querySelectorAll('.add-btn').forEach(function(btn){
      btn.addEventListener('click', function(e){ e.stopPropagation(); addToCart(btn.getAttribute('data-add')); });
    });
  }

  function renderCart(){
    const body = getEl('#cartBody, [data-cart-body]', 'cartBody');
    const count = getEl('#cartCount, [data-cart-count]', 'cartCount');
    const totalEl = getEl('#cartTotal, [data-cart-total]', 'cartTotal');
    if(!body) return;

    const totalQty = state.cart.reduce(function(sum,item){ return sum + item.qty; }, 0);
    const total = state.cart.reduce(function(sum,item){ return sum + item.price * item.qty; }, 0);

    if(count){
      count.textContent = totalQty;
      count.style.display = totalQty > 0 ? 'flex' : 'none';
    }
    if(totalEl){ totalEl.textContent = currency(total); }

    if(!state.cart.length){ body.innerHTML = '<p class="cart-empty">Your cart is empty.</p>'; return; }

    body.innerHTML = state.cart.map(function(item){
      return '<div class="cart-item"><div class="thumb"></div><div class="info">' +
        '<div class="nm">' + item.name + '</div><div class="pr">' + currency(item.price) + ' × ' + item.qty + '</div>' +
        '<div class="qty"><button type="button" data-dec="' + item.id + '">-</button><span>' + item.qty + '</span><button type="button" data-inc="' + item.id + '">+</button></div>' +
        '</div><button class="rm" type="button" data-rm="' + item.id + '">Remove</button></div>';
    }).join('');
  }

  function addToCart(id){
    const product = products.find(function(item){ return item.id === id; });
    if(!product) return;
    const existing = state.cart.find(function(item){ return item.id === product.id; });
    if(existing){ existing.qty += 1; } else { state.cart.push({id:product.id, name:product.name, price:product.price, qty:1}); }
    renderCart();
    showToast(product.name + ' added to cart');
  }

  function changeQty(id, delta){
    const existing = state.cart.find(function(item){ return item.id === id; });
    if(!existing) return;
    existing.qty += delta;
    if(existing.qty <= 0){ state.cart = state.cart.filter(function(item){ return item.id !== id; }); }
    renderCart();
  }

  function showToast(message){
    let toast = getEl('[data-toast]', 'toast');
    if(!toast){
      toast = document.createElement('div');
      toast.className = 'toast';
      toast.setAttribute('data-toast', '');
      root.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(function(){ toast.classList.remove('show'); }, 2200);
  }

  function openProductModal(id){
    const product = products.find(function(item){ return item.id === id; });
    if(!product) return;
    state.selectedProduct = product;
    const modal = getEl('#productModal, [data-product-modal]', 'productModal');
    if(!modal) return;
    const title = getEl('[data-product-title]', 'productModalTitle');
    const price = getEl('[data-product-price]', 'productModalPrice');
    const desc = getEl('[data-product-description]', 'productModalDescription');
    const qty = getEl('[data-product-qty]', 'productModalQty');
    if(title) title.textContent = product.name;
    if(price) price.textContent = currency(product.price);
    if(desc) desc.textContent = product.description;
    if(qty) qty.value = '1';
    modal.classList.add('show');
    const backdrop = getEl('#backdrop', 'backdrop');
    if(backdrop) backdrop.classList.add('show');
  }

  function closeProductModal(){
    const modal = getEl('#productModal, [data-product-modal]', 'productModal');
    if(modal) modal.classList.remove('show');
    const backdrop = getEl('#backdrop', 'backdrop');
    if(backdrop) backdrop.classList.remove('show');
  }

  function addSelectedProductToCart(){
    if(!state.selectedProduct) return;
    const qtyInput = getEl('[data-product-qty]', 'productModalQty');
    const qty = parseInt(qtyInput && qtyInput.value, 10) || 1;
    const existing = state.cart.find(function(item){ return item.id === state.selectedProduct.id; });
    if(existing){ existing.qty += qty; } else { state.cart.push({id:state.selectedProduct.id, name:state.selectedProduct.name, price:state.selectedProduct.price, qty:qty}); }
    renderCart();
    closeProductModal();
    showToast(qty + ' × ' + state.selectedProduct.name + ' added to cart');
  }

  function openCart(){
    const drawer = getEl('#drawer, [data-drawer]', 'drawer');
    const backdrop = getEl('#backdrop', 'backdrop');
    if(drawer) drawer.classList.add('open');
    if(backdrop) backdrop.classList.add('show');
  }

  function closeCart(){
    const drawer = getEl('#drawer, [data-drawer]', 'drawer');
    const backdrop = getEl('#backdrop', 'backdrop');
    if(drawer) drawer.classList.remove('open');
    if(backdrop) backdrop.classList.remove('show');
  }

  function initGate(){
    const overlay = getEl('#gate', 'gate');
    if(!overlay) return;
    document.body.classList.add('locked');
    const research = document.getElementById('g-research');
    const age = document.getElementById('g-age');
    const institution = document.getElementById('g-inst');
    const enter = document.getElementById('g-enter');
    const decline = document.getElementById('g-decline');

    function validateGate(){
      if(enter){ enter.disabled = !(research && research.checked && age && age.checked && institution && institution.value); }
    }

    [research, age, institution].forEach(function(el){ if(el){ el.addEventListener('change', validateGate); } });
    if(enter){ enter.addEventListener('click', function(){ overlay.classList.add('hidden'); document.body.classList.remove('locked'); }); }
    if(decline){ decline.addEventListener('click', function(){ window.location.href = 'https://www.google.com'; }); }
    validateGate();
  }

  function initReviews(){
    const form = getEl('#reviewForm, [data-review-form]', 'reviewForm');
    if(!form) return;
    const ratingInput = form.querySelector('input[name="rating"]');
    form.querySelectorAll('.star-btn').forEach(function(btn){
      btn.addEventListener('click', function(){
        const value = parseInt(btn.getAttribute('data-value'), 10);
        if(ratingInput) ratingInput.value = value;
        form.querySelectorAll('.star-btn').forEach(function(star){
          star.classList.toggle('active', parseInt(star.getAttribute('data-value'), 10) <= value);
        });
      });
    });
    form.addEventListener('submit', function(e){
      e.preventDefault();
      const data = new FormData(form);
      const rating = parseInt(data.get('rating'), 10) || 5;
      const name = String(data.get('name') || '').trim();
      const message = String(data.get('message') || '').trim();
      if(!name || !message){ return; }
      state.reviews.unshift({name:name, rating:rating, message:message});
      renderReviews();
      form.reset();
      if(ratingInput) ratingInput.value = '';
      form.querySelectorAll('.star-btn').forEach(function(btn){ btn.classList.remove('active'); });
      showToast('Review submitted');
    });
  }

  function renderReviews(){
    const list = getEl('#reviewList, [data-review-list]', 'reviewList');
    if(!list) return;
    if(!state.reviews.length){ list.innerHTML = '<div class="review-empty">No reviews yet. Be the first to leave one.</div>'; return; }
    list.innerHTML = state.reviews.map(function(review){
      const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
      return '<div class="qa" style="padding:18px 20px;"><div style="font-weight:700;display:flex;justify-content:space-between;gap:10px;align-items:center;"><span>' + review.name + '</span><span>' + stars + '</span></div><div style="color:#6b7280;font-size:14px;margin-top:8px;">' + review.message + '</div></div>';
    }).join('');
  }

  function initFaq(){
    root.querySelectorAll('.qa').forEach(function(item){
      item.addEventListener('click', function(e){
        if(e.target.closest('.q')){ item.classList.toggle('open'); }
      });
    });
  }

  function initSearch(){
    const searchWrap = document.getElementById('searchWrap');
    const searchInput = document.getElementById('productSearch');
    const searchBtn = document.getElementById('searchBtn');
    if(searchBtn && searchWrap){
      searchBtn.addEventListener('click', function(){
        searchWrap.classList.add('active');
        if(searchInput){ searchInput.focus(); }
      });
    }
    if(searchInput){
      searchInput.addEventListener('input', function(){
        state.search = searchInput.value;
        renderProducts();
      });
      searchInput.addEventListener('focus', function(){ if(searchWrap){ searchWrap.classList.add('active'); } });
    }
  }

  root.addEventListener('click', function(e){
    const addButton = e.target.closest('[data-add]');
    if(addButton){ addToCart(addButton.getAttribute('data-add')); return; }
    if(e.target.closest('#cartBtn, [data-cart-open]')){ openCart(); return; }
    if(e.target.closest('#closeCart, [data-drawer-close]')){ closeCart(); return; }
    if(e.target.closest('#closeProductModal, [data-product-modal-close]')){ closeProductModal(); return; }
    if(e.target.closest('#addProductModalBtn, [data-product-confirm]')){ addSelectedProductToCart(); return; }
    if(e.target.closest('[data-inc]')){ changeQty(e.target.closest('[data-inc]').getAttribute('data-inc'), 1); return; }
    if(e.target.closest('[data-dec]')){ changeQty(e.target.closest('[data-dec]').getAttribute('data-dec'), -1); return; }
    if(e.target.closest('[data-rm]')){ changeQty(e.target.closest('[data-rm]').getAttribute('data-rm'), -999); return; }
    if(e.target.id === 'backdrop' || e.target.classList.contains('overlay')){ closeCart(); closeProductModal(); }
  });

  root.addEventListener('submit', function(e){
    if(e.target.matches('#reviewForm, [data-review-form]')){ initReviews(); }
  });

  document.getElementById('checkoutBtn')?.addEventListener('click', function(){
    if(!state.cart.length){ showToast('Your cart is empty'); return; }
    state.cart = [];
    renderCart();
    closeCart();
    showToast('Order placed! (demo checkout)');
  });

  document.getElementById('accountBtn')?.addEventListener('click', function(){
    document.getElementById('contact')?.scrollIntoView({behavior:'smooth'});
    showToast('Sign-in coming soon — contact us for account access');
  });

  initGate();
  initSearch();
  initFaq();
  initReviews();
  renderProducts();
  renderCart();
  renderReviews();
})();