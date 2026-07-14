// ---------- Product data ----------
var PRODUCTS = [
  {id:'bpc157', name:'BPC-157', tag:'ACCELERATED RECOVERY', color:'#e8fbef;color:#16a34a', category:'Recovery', description:'Advanced peptide formula designed to support faster tissue repair and recovery.', price:92.99},
  {id:'glp3', name:'GLP-3RT', tag:'METABOLIC SUPPORT', color:'#eef1fc;color:#2f43e0', category:'Metabolic', description:'A precision peptide blend for metabolic balance and gentle appetite support.', price:169.99},
  {id:'ghkcu', name:'GHK-Cu', tag:'SKIN & TISSUE REPAIR', color:'#fdeef4;color:#db2777', category:'Repair', description:'Copper peptide complex targeted for skin repair and soft tissue regeneration.', price:49.99},
  {id:'cjc', name:'CJC-1295 + Ipamorelin', tag:'SUSTAINED GH RELEASE', color:'#fff4e5;color:#d97706', category:'Growth', description:'A sustained release peptide stack for deeper restorative support.', price:94.99},
  {id:'motsc', name:'MOTS-c', tag:'MITOCHONDRIAL SUPPORT', color:'#e8fbef;color:#16a34a', category:'Cellular', description:'Cellular energy peptide engineered to support mitochondrial function.', price:64.99},
  {id:'blend', name:'BPC-157 + TB-500', tag:'TISSUE REPAIR', color:'#eef1fc;color:#2f43e0', category:'Recovery', description:'A premium recovery bundle combining BPC-157 with TB-500 for comprehensive tissue support.', price:179.99},
  {id:'semax', name:'Semax', tag:'FOCUS & NEUROPROTECTION', color:'#fdeef4;color:#db2777', category:'Neuro', description:'A nootropic peptide designed to support focus, cognition, and recovery.', price:79.99},
  {id:'nad', name:'NAD+', tag:'CELLULAR ENERGY', color:'#fff4e5;color:#d97706', category:'Cellular', description:'A high-purity NAD+ precursor for cellular performance and metabolic recovery.', price:129.99}
];
var STORAGE_KEY = 'pepxCart';
var cart = {};
var selectedProductId = null;
var activeCategory = 'all';
var activeSort = 'default';

function openProductModal(id){
  selectedProductId = id;
  var product = PRODUCTS.find(function(item){ return item.id === id; });
  if(!product) return;
  var modal = document.getElementById('productModal');
  if(!modal) return;
  document.getElementById('productModalTitle').textContent = product.name;
  document.getElementById('productModalTag').textContent = product.tag;
  document.getElementById('productModalPrice').textContent = '$' + product.price.toFixed(2);
  var descEl = modal.querySelector('.product-modal-description');
  if(descEl) descEl.textContent = product.description;
  var qty = document.getElementById('productModalQty');
  if(qty) qty.value = '1';
  modal.classList.add('show');
  document.getElementById('backdrop').classList.add('show');
}

function loadCart(){
  try {
    var saved = window.localStorage.getItem(STORAGE_KEY);
    if(saved){ cart = JSON.parse(saved) || {}; }
  } catch (err) {
    cart = {};
  }
}

function saveCart(){
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch (err) {}
}

function renderProducts(filter){
  var grid = document.getElementById('productGrid');
  if(!grid) return;
  var query = (filter || '').toLowerCase().trim();
  var visible = PRODUCTS.filter(function(p){
    var matchesText = !query || p.name.toLowerCase().includes(query) || p.tag.toLowerCase().includes(query) || p.description.toLowerCase().includes(query);
    var matchesCategory = activeCategory === 'all' || p.category === activeCategory;
    return matchesText && matchesCategory;
  });
  if(activeSort === 'priceAsc'){
    visible.sort(function(a,b){return a.price - b.price;});
  } else if(activeSort === 'priceDesc'){
    visible.sort(function(a,b){return b.price - a.price;});
  }
  grid.innerHTML = visible.map(function(p){
    return '<div class="product-card" data-id="'+p.id+'" role="button" tabindex="0">'+
      '<div class="product-card-media"></div><div class="product-card-body">'+
      '<div class="product-card-meta"><span class="label">'+p.category+'</span><span class="price">$'+p.price.toFixed(2)+'</span></div>'+ 
      '<h3>'+p.name+'</h3>'+ 
      '<p class="excerpt">'+p.description+'</p>'+ 
      '<div class="product-card-actions"><button class="btn primary add-btn" data-id="'+p.id+'">Add to Cart</button><button class="btn ghost quick-btn" type="button" data-id="'+p.id+'">View</button></div>'+ 
      '</div></div>';
  }).join('');
  if(!visible.length){
    grid.innerHTML = '<div class="review-empty">No products match your search.</div>';
    return;
  }
  grid.querySelectorAll('.product-card').forEach(function(card){
    card.addEventListener('click', function(e){
      if(e.target.closest('.add-btn') || e.target.closest('.quick-btn')) return;
      openProductModal(card.getAttribute('data-id'));
    });
    card.addEventListener('keydown', function(e){
      if(e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        openProductModal(card.getAttribute('data-id'));
      }
    });
  });
  grid.querySelectorAll('.add-btn').forEach(function(btn){
    btn.addEventListener('click', function(e){
      e.stopPropagation();
      addToCart(btn.getAttribute('data-id'));
      btn.textContent = 'Added ✓';
      btn.classList.add('added');
      setTimeout(function(){ btn.textContent='Add to Cart'; btn.classList.remove('added'); }, 1200);
    });
  });
  grid.querySelectorAll('.quick-btn').forEach(function(btn){
    btn.addEventListener('click', function(e){
      e.stopPropagation();
      openProductModal(btn.getAttribute('data-id'));
    });
  });
}

function closeProductModal(){
  var modal = document.getElementById('productModal');
  if(modal) modal.classList.remove('show');
  document.getElementById('backdrop').classList.remove('show');
}

function addSelectedProductToCart(){
  if(!selectedProductId) return;
  var qty = parseInt(document.getElementById('productModalQty').value, 10) || 1;
  cart[selectedProductId] = (cart[selectedProductId] || 0) + qty;
  showToast('Added ' + qty + ' item(s) to cart');
  renderCart();
  closeProductModal();
  saveCart();
}

// ---------- Cart ----------
function addToCart(id){
  cart[id] = (cart[id]||0) + 1;
  var p = PRODUCTS.find(function(x){return x.id===id;});
  showToast(p.name + ' added to cart');
  renderCart();
  saveCart();
}
function changeQty(id, delta){
  cart[id] = (cart[id]||0) + delta;
  if(cart[id] <= 0) delete cart[id];
  renderCart();
  saveCart();
}
function removeItem(id){ delete cart[id]; renderCart(); saveCart(); }

function renderCart(){
  var body = document.getElementById('cartBody');
  var checkout = document.getElementById('checkoutCart');
  var ids = Object.keys(cart);
  var count = 0, total = 0;
  ids.forEach(function(id){ count += cart[id]; total += cart[id]*PRODUCTS.find(function(x){return x.id===id;}).price; });
  var badge = document.getElementById('cartCount');
  if(badge){
    badge.textContent = count;
    badge.style.display = count>0 ? 'flex' : 'none';
  }
  var totalEl = document.getElementById('cartTotal');
  if(totalEl){ totalEl.textContent = '$'+total.toFixed(2); }
  if(!ids.length){
    if(body) body.innerHTML = '<p class="cart-empty">Your cart is empty.</p>';
    if(checkout) checkout.innerHTML = '<p class="cart-empty">Your cart is empty.</p>';
    return;
  }
  var itemsHtml = ids.map(function(id){
    var p = PRODUCTS.find(function(x){return x.id===id;});
    return '<div class="cart-item"><div class="thumb"></div><div class="info">'+
      '<div class="nm">'+p.name+'</div><div class="pr">$'+p.price.toFixed(2)+'</div>'+ 
      '<div class="qty"><button data-dec="'+id+'">-</button><span>'+cart[id]+'</span><button data-inc="'+id+'">+</button></div>'+ 
      '</div><button class="rm" data-rm="'+id+'">Remove</button></div>';
  }).join('');
  if(body) body.innerHTML = itemsHtml;
  if(checkout) checkout.innerHTML = itemsHtml;
  var attachHandlers = function(container){
    if(!container) return;
    container.querySelectorAll('[data-inc]').forEach(function(b){
      b.addEventListener('click', function(){ changeQty(b.getAttribute('data-inc'), 1); });
    });
    container.querySelectorAll('[data-dec]').forEach(function(b){
      b.addEventListener('click', function(){ changeQty(b.getAttribute('data-dec'), -1); });
    });
    container.querySelectorAll('[data-rm]').forEach(function(b){
      b.addEventListener('click', function(){ removeItem(b.getAttribute('data-rm')); });
    });
  };
  attachHandlers(body);
  attachHandlers(checkout);
}

function openCart(){
  var drawer = document.getElementById('drawer');
  var backdrop = document.getElementById('backdrop');
  if(drawer) drawer.classList.add('open');
  if(backdrop) backdrop.classList.add('show');
}
function closeCart(){
  var drawer = document.getElementById('drawer');
  if(drawer) drawer.classList.remove('open');
  var backdrop = document.getElementById('backdrop');
  if(backdrop) backdrop.classList.remove('show');
}

// ---------- Toast ----------
var toastTimer;
function showToast(msg){
  var t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ t.classList.remove('show'); }, 2000);
}

// ---------- Contact form ----------
function submitForm(e){
  e.preventDefault();
  document.querySelector('.form-msg').style.display='block';
  e.target.reset();
  return false;
}

// ---------- Reviews ----------
var reviews = [];

function renderReviews(){
  var list = document.getElementById('reviewList');
  if(!list) return;
  if(!reviews.length){
    list.innerHTML = '<div class="review-empty">No reviews yet. Be the first to leave one.</div>';
    return;
  }
  list.innerHTML = reviews.map(function(review){
    var stars = '★'.repeat(review.rating) + '☆'.repeat(5-review.rating);
    var name = review.name.trim();
    var parts = name.split(/\s+/);
    var displayName = parts.length > 1 ? parts[0] + ' ' + parts[parts.length-1].charAt(0) + '.' : name;
    return '<div class="tcard"><div class="stars">'+stars+'</div><p>"'+review.message+'"</p><div class="who">'+displayName+'<span>'+review.email+'</span></div></div>';
  }).join('');
}

function addReview(form){
  var data = new FormData(form);
  var review = {
    rating: parseInt(data.get('rating'), 10),
    name: data.get('name').toString().trim(),
    email: data.get('email').toString().trim(),
    message: data.get('message').toString().trim()
  };
  if(!review.rating || !review.name || !review.email || !review.message){ return; }
  reviews.unshift(review);
  renderReviews();
  form.reset();
  var picker = form.querySelector('.star-picker');
  if(picker){
    picker.querySelectorAll('.star-btn').forEach(function(btn){ btn.classList.remove('active'); });
    picker.querySelector('input[name="rating"]').value = '';
  }
}

// ---------- Entry gate ----------
function initGate(){
  var overlay = document.getElementById('gate');
  if(!overlay) return;
  document.body.classList.add('locked');
  var r=document.getElementById('g-research'), a=document.getElementById('g-age'), i=document.getElementById('g-inst'), e=document.getElementById('g-enter');
  function v(){ e.disabled = !(r.checked && a.checked && i.value); }
  [r,a,i].forEach(function(el){ el.addEventListener('change', v); });
  e.addEventListener('click', function(){ overlay.classList.add('hidden'); document.body.classList.remove('locked'); });
  var d=document.getElementById('g-decline');
  if(d) d.addEventListener('click', function(){ window.location.href='https://www.google.com'; });
  v();
}

// ---------- Init ----------
window.addEventListener('DOMContentLoaded', function(){
  loadCart();
  renderProducts();
  renderCart();
  initGate();

  // FAQ accordion
  document.addEventListener('click', function(e){
    var q = e.target.closest('.q');
    if(q) q.parentElement.classList.toggle('open');
  });

  // Reviews form
  var reviewForm = document.getElementById('reviewForm');
  if(reviewForm){
    var picker = reviewForm.querySelector('.star-picker');
    if(picker){
      picker.querySelectorAll('.star-btn').forEach(function(btn){
        btn.addEventListener('click', function(){
          var value = parseInt(btn.getAttribute('data-value'), 10);
          picker.querySelector('input[name="rating"]').value = value;
          picker.querySelectorAll('.star-btn').forEach(function(star){
            star.classList.toggle('active', parseInt(star.getAttribute('data-value'), 10) <= value);
          });
        });
      });
    }
    reviewForm.addEventListener('submit', function(e){
      e.preventDefault();
      addReview(reviewForm);
      showToast('Review submitted');
    });
  }
  renderReviews();

  // Header + cart controls
  var searchWrap = document.getElementById('searchWrap');
  var searchInput = document.getElementById('productSearch');
  var cartBtn = document.getElementById('cartBtn');
  if(cartBtn && cartBtn.tagName === 'BUTTON'){
    cartBtn.addEventListener('click', openCart);
  }
  var closeCartBtn = document.getElementById('closeCart');
  if(closeCartBtn){ closeCartBtn.addEventListener('click', closeCart); }
  var closeProductModalBtn = document.getElementById('closeProductModal');
  if(closeProductModalBtn){ closeProductModalBtn.addEventListener('click', closeProductModal); }
  var backdrop = document.getElementById('backdrop');
  if(backdrop){ backdrop.addEventListener('click', function(){ closeCart(); closeProductModal(); }); }
  var addProductModalBtn = document.getElementById('addProductModalBtn');
  if(addProductModalBtn){ addProductModalBtn.addEventListener('click', addSelectedProductToCart); }
  var searchBtnEl = document.getElementById('searchBtn');
  if(searchBtnEl && searchWrap && searchInput){
    searchBtnEl.addEventListener('click', function(){
      searchWrap.classList.add('active');
      searchInput.focus();
      var productsSection = document.getElementById('products');
      if(productsSection) productsSection.scrollIntoView({behavior:'smooth'});
    });
  }
  if(searchInput){
    searchInput.addEventListener('input', function(){
      renderProducts(searchInput.value);
    });
  }

  document.querySelectorAll('.pill').forEach(function(btn){
    btn.addEventListener('click', function(){
      document.querySelectorAll('.pill').forEach(function(item){ item.classList.remove('active'); });
      btn.classList.add('active');
      activeCategory = btn.getAttribute('data-filter');
      renderProducts(searchInput ? searchInput.value : '');
    });
  });

  var sortSelect = document.getElementById('sortSelect');
  if(sortSelect){
    sortSelect.addEventListener('change', function(){
      activeSort = sortSelect.value;
      renderProducts(searchInput ? searchInput.value : '');
    });
  }
  document.addEventListener('click', function(e){
    if(searchWrap && searchInput && !searchWrap.contains(e.target) && searchInput.value === ''){
      searchWrap.classList.remove('active');
    }
  });
  var accountBtn = document.getElementById('accountBtn');
  if(accountBtn){
    accountBtn.addEventListener('click', function(){
      var contactSection = document.getElementById('contact');
      if(contactSection){ contactSection.scrollIntoView({behavior:'smooth'}); }
      showToast('Sign-in coming soon \u2014 contact us for account access');
    });
  }
  var checkoutBtnEl = document.getElementById('checkoutBtn');
  if(checkoutBtnEl){
    checkoutBtnEl.addEventListener('click', function(){
      if(!Object.keys(cart).length){ showToast('Your cart is empty'); return; }
      cart = {}; renderCart(); closeCart();
      showToast('Order placed! (demo checkout)');
    });
  }

  // Smooth scroll for in-page anchors
  document.querySelectorAll('a[href^="#"]').forEach(function(link){
    link.addEventListener('click', function(ev){
      var id = link.getAttribute('href');
      if(id.length>1){
        var el = document.querySelector(id);
        if(el){ ev.preventDefault(); el.scrollIntoView({behavior:'smooth'}); }
      }
    });
  });
});
