// ---------- Product data ----------
var PRODUCTS = [
  {id:'bpc157', name:'BPC-157', tag:'ACCELERATED RECOVERY', color:'#e8fbef;color:#16a34a', category:'Recovery', description:'Advanced peptide formula designed to support faster tissue repair and recovery.', price:92.99},
  {id:'glp3', name:'GLP-3RT', tag:'METABOLIC SUPPORT', color:'#eef1fc;color:#2f43e0', category:'Metabolic', description:'A precision peptide blend for metabolic balance and gentle appetite support.', price:75.00},
  {id:'ghkcu', name:'GHK-Cu', tag:'SKIN & TISSUE REPAIR', color:'#fdeef4;color:#db2777', category:'Repair', description:'Copper peptide complex targeted for skin repair and soft tissue regeneration.', price:49.99},
  {id:'cjc', name:'CJC-1295 + Ipamorelin', tag:'SUSTAINED GH RELEASE', color:'#fff4e5;color:#d97706', category:'Growth', description:'A sustained release peptide stack for deeper restorative support.', price:94.99},
  {id:'motsc', name:'MOTS-c', tag:'MITOCHONDRIAL SUPPORT', color:'#e8fbef;color:#16a34a', category:'Cellular', description:'Cellular energy peptide engineered to support mitochondrial function.', price:64.99},
  {id:'blend', name:'BPC-157 + TB-500', tag:'TISSUE REPAIR', color:'#eef1fc;color:#2f43e0', category:'Recovery', description:'A premium recovery bundle combining BPC-157 with TB-500 for comprehensive tissue support.', price:179.99},
  {id:'semax', name:'Semax', tag:'FOCUS & NEUROPROTECTION', color:'#fdeef4;color:#db2777', category:'Neuro', description:'A nootropic peptide designed to support focus, cognition, and recovery.', price:79.99},
  {id:'nad', name:'NAD+', tag:'CELLULAR ENERGY', color:'#fff4e5;color:#d97706', category:'Cellular', description:'A high-purity NAD+ precursor for cellular performance and metabolic recovery.', price:129.99}
];
var STORAGE_KEY = 'pepxCart';
var GATE_ACCEPTED_KEY = 'pepxGateAccepted';
var cart = {};
var selectedProductId = null;
var activeCategory = 'all';
var activeSort = 'default';
var currentAuthSession = null;
var DEFAULT_PRODUCT_IMAGE_URL = 'assets/products/default-product.png';

function getProductImage(product){
  return (product && product.image) ? product.image : DEFAULT_PRODUCT_IMAGE_URL;
}

function normalizeCategoryFilter(value){
  if(!value) return 'all';
  var normalized = String(value).trim().toLowerCase();
  if(normalized === 'all') return 'all';
  var match = PRODUCTS.find(function(product){
    return product.category.toLowerCase() === normalized;
  });
  return match ? match.category : 'all';
}

function syncActiveCategoryPills(){
  document.querySelectorAll('.pill').forEach(function(item){
    item.classList.toggle('active', item.getAttribute('data-filter') === activeCategory);
  });
}

function initShopCategoryFromUrl(){
  var params = new URLSearchParams(window.location.search);
  activeCategory = normalizeCategoryFilter(params.get('category'));
  syncActiveCategoryPills();
}

function initMenuDropdowns(){
  var menuItems = document.querySelectorAll('.menu-item');
  if(!menuItems.length) return;

  function closeAllDropdowns(){
    menuItems.forEach(function(item){ item.classList.remove('open'); });
  }

  menuItems.forEach(function(item){
    item.addEventListener('mouseenter', function(){
      closeAllDropdowns();
      item.classList.add('open');
    });
    item.addEventListener('focusin', function(){
      closeAllDropdowns();
      item.classList.add('open');
    });
  });

  document.addEventListener('click', function(e){
    var clickedItem = e.target.closest('.menu-item');
    if(clickedItem){
      menuItems.forEach(function(item){
        item.classList.toggle('open', item === clickedItem);
      });
      return;
    }
    closeAllDropdowns();
  });

  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape') closeAllDropdowns();
  });
}

function initMobileNav(){
  var nav = document.querySelector('nav.menu');
  var toggle = document.getElementById('mobileMenuToggle');
  if(!nav || !toggle) return;

  function closeNav(){
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }

  toggle.setAttribute('aria-expanded', 'false');
  toggle.addEventListener('click', function(){
    var isOpen = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  nav.querySelectorAll('a').forEach(function(link){
    link.addEventListener('click', closeNav);
  });

  document.addEventListener('click', function(e){
    if(nav.contains(e.target) || toggle.contains(e.target)) return;
    closeNav();
  });

  window.addEventListener('resize', function(){
    if(window.innerWidth > 900) closeNav();
  });
}

function getProductById(id){
  return PRODUCTS.find(function(item){ return item.id === id; }) || null;
}

function getProductUrl(id){
  return 'product.html?product=' + encodeURIComponent(id);
}

function getQuantityPricing(unitPrice, quantity){
  var parsedQty = parseInt(quantity, 10);
  var qty = Number.isFinite(parsedQty) ? Math.max(0, parsedQty) : 0;
  var normalTotal = unitPrice * qty;
  var discountSteps = Math.max(0, Math.min(qty - 1, 4));
  var discountRate = qty >= 10 ? 0.20 : discountSteps * 0.03;
  var discountedTotal = normalTotal * (1 - discountRate);
  return {
    qty: qty,
    normalTotal: normalTotal,
    discountedTotal: discountedTotal,
    hasDiscount: discountRate > 0
  };
}

function setDualPriceMarkup(priceEl, pricing){
  if(!priceEl) return;
  if(pricing.hasDiscount){
    priceEl.innerHTML = '<span class="price-normal">$' + pricing.normalTotal.toFixed(2) + '</span><span class="price-discount">$' + pricing.discountedTotal.toFixed(2) + '</span>';
    return;
  }
  priceEl.textContent = '$' + pricing.normalTotal.toFixed(2);
}

function renderSavingsRows(product){
  var rows = document.getElementById('productSavingsRows');
  if(!rows || !product) return;
  var levels = [1, 2, 3, 4, 5, '10+'];
  rows.innerHTML = levels.map(function(level){
    var qty = level === '10+' ? 10 : level;
    var pricing = getQuantityPricing(product.price, qty);
    var discountedLabel = level === '10+' ? ('$' + pricing.discountedTotal.toFixed(2) + '+') : ('$' + pricing.discountedTotal.toFixed(2));
    var percentSaved = pricing.normalTotal > 0 ? Math.round(((pricing.normalTotal - pricing.discountedTotal) / pricing.normalTotal) * 100) : 0;
    return '<tr><td>' + level + '</td><td>' + discountedLabel + '</td><td>' + percentSaved + '%</td></tr>';
  }).join('');
}

function toggleAddToCartOption(addBtn, quantity){
  if(!addBtn) return;
  var canAdd = quantity >= 1;
  addBtn.disabled = !canAdd;
  addBtn.style.display = canAdd ? '' : 'none';
}

function navigateToProductPage(id){
  if(!id) return;
  window.location.href = getProductUrl(id);
}

function getInitialProductSearchQuery(){
  try {
    var params = new URLSearchParams(window.location.search);
    return (params.get('q') || '').trim();
  } catch (err) {
    return '';
  }
}

function goToShopSearch(query){
  var term = (query || '').toString().trim();
  var target = 'shop.html' + (term ? ('?q=' + encodeURIComponent(term)) : '');
  window.location.href = target;
}

function escapeHtml(value){
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildProductDescription(product){
  return [
    product.description,
    'Prepared for ' + product.category.toLowerCase() + ' workflows where purity, repeatability, and documented handling matter.',
    'Each order is packaged for controlled laboratory storage and batch traceability.'
  ].join(' ');
}

function buildProductDisclaimer(product){
  return [
    '<p>The products offered by PepX Research are intended strictly for laboratory research purposes only and are sold exclusively to qualified professionals, institutions, and entities. These products are not for human consumption, veterinary use, or any other application involving living organisms, including but not limited to diagnostic, therapeutic, or recreational purposes.</p>',
    '<p>By purchasing this product, you confirm that:</p>',
    '<ul><li>You are a qualified professional or entity with the necessary knowledge, training, and facilities to handle chemical reagents safely and appropriately.</li><li>You will use this product in full compliance with all applicable local, state, and federal laws and regulations.</li></ul>',
    '<h4>Prohibited Uses</h4>',
    '<ul><li>This product is not to be used as an active pharmaceutical ingredient (API) in compounding or manufacturing drugs for human or veterinary use.</li><li>It is strictly prohibited to use this product for administration to humans or animals under any circumstances.</li><li>PepX Research does not condone or permit the use of its products for the development, testing, or production of illegal substances.</li></ul>',
    '<h4>Regulatory Compliance</h4>',
    '<p>PepX Research does not claim that this product is approved by the U.S. Food and Drug Administration (FDA) for any purpose. The statements regarding this product have not been evaluated by the FDA. This product is not intended to diagnose, treat, cure, or prevent any disease.</p>',
    '<h4>Liability Statement</h4>',
    '<p>The buyer assumes full responsibility for ensuring the safe handling, storage, and use of this product. PepX Research is not liable for any damages, direct or indirect, resulting from improper handling, storage, or unauthorized use of this product. Furthermore, PepX Research reserves the right to refuse sales to any individual or entity suspected of misusing its products.</p>',
    '<p>If you have questions about the safe and lawful use of this product, consult a qualified professional with expertise in laboratory research. By proceeding with this purchase, you agree to these terms and conditions.</p>'
  ].join('');
}

function getUpsellProducts(product, limit){
  return PRODUCTS.filter(function(item){
    return item.id !== product.id && item.category !== product.category;
  }).slice(0, limit);
}

function getRelatedProducts(product, limit){
  var matches = PRODUCTS.filter(function(item){
    return item.id !== product.id && item.category === product.category;
  });
  if(matches.length >= limit) return matches.slice(0, limit);
  return matches.concat(PRODUCTS.filter(function(item){
    return item.id !== product.id && item.category !== product.category;
  })).slice(0, limit);
}

function renderProductCards(products, options){
  var settings = options || {};
  var viewLabel = settings.viewLabel || 'View Details';
  return products.map(function(p){
    var image = getProductImage(p);
    return '<div class="product-card" data-id="'+p.id+'" role="button" tabindex="0">'+
      '<div class="product-card-media"><img src="'+image+'" alt="'+p.name+' product image" loading="lazy"></div><div class="product-card-body">'+
      '<div class="product-card-meta"><span class="label">'+p.category+'</span><span class="price">$'+p.price.toFixed(2)+'</span></div>'+
      '<h3>'+p.name+'</h3>'+
      '<p class="excerpt">'+p.description+'</p>'+
      '<div class="product-card-actions"><button class="btn primary add-btn" data-id="'+p.id+'">Add to Cart</button><button class="btn ghost quick-btn" type="button" data-id="'+p.id+'">'+viewLabel+'</button></div>'+
      '</div></div>';
  }).join('');
}

function attachProductCardInteractions(container){
  if(!container) return;
  container.querySelectorAll('.product-card').forEach(function(card){
    card.addEventListener('click', function(e){
      if(e.target.closest('.add-btn') || e.target.closest('.quick-btn')) return;
      navigateToProductPage(card.getAttribute('data-id'));
    });
    card.addEventListener('keydown', function(e){
      if(e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        navigateToProductPage(card.getAttribute('data-id'));
      }
    });
  });
  container.querySelectorAll('.add-btn').forEach(function(btn){
    btn.addEventListener('click', function(e){
      e.stopPropagation();
      addToCart(btn.getAttribute('data-id'));
      btn.textContent = 'Added ✓';
      btn.classList.add('added');
      setTimeout(function(){ btn.textContent='Add to Cart'; btn.classList.remove('added'); }, 1200);
    });
  });
  container.querySelectorAll('.quick-btn').forEach(function(btn){
    btn.addEventListener('click', function(e){
      e.stopPropagation();
      navigateToProductPage(btn.getAttribute('data-id'));
    });
  });
}

function openProductModal(id){
  selectedProductId = id;
  var product = getProductById(id);
  if(!product) return;
  var modal = document.getElementById('productModal');
  if(!modal) return;
  document.getElementById('productModalTitle').textContent = product.name;
  document.getElementById('productModalTag').textContent = product.tag;
  var modalPriceEl = document.getElementById('productModalPrice');
  var modalAddBtn = document.getElementById('addProductModalBtn');
  var modalImage = modal.querySelector('.product-modal-image');
  if(modalImage){
    modalImage.style.backgroundImage = 'url("' + getProductImage(product) + '")';
    modalImage.style.backgroundSize = 'cover';
    modalImage.style.backgroundPosition = 'center';
  }
  var descEl = modal.querySelector('.product-modal-description');
  if(descEl) descEl.textContent = product.description;
  var qty = document.getElementById('productModalQty');
  function updateModalPrice(){
    if(!qty || !modalPriceEl) return;
    var pricing = getQuantityPricing(product.price, qty.value);
    setDualPriceMarkup(modalPriceEl, pricing);
    toggleAddToCartOption(modalAddBtn, pricing.qty);
  }
  if(qty){
    qty.value = '1';
    qty.oninput = updateModalPrice;
    qty.onchange = updateModalPrice;
  }
  updateModalPrice();
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
  } else if(activeSort === 'nameAsc'){
    visible.sort(function(a,b){return a.name.localeCompare(b.name);});
  } else if(activeSort === 'nameDesc'){
    visible.sort(function(a,b){return b.name.localeCompare(a.name);});
  }
  grid.innerHTML = renderProductCards(visible, { viewLabel: 'View Details' });
  if(!visible.length){
    grid.innerHTML = '<div class="review-empty">No products match your search.</div>';
    return;
  }
  attachProductCardInteractions(grid);
}

function closeProductModal(){
  var modal = document.getElementById('productModal');
  if(modal) modal.classList.remove('show');
  var backdrop = document.getElementById('backdrop');
  if(backdrop) backdrop.classList.remove('show');
}

function renderProductRail(containerId, products){
  var container = document.getElementById(containerId);
  if(!container) return;
  container.innerHTML = renderProductCards(products, { viewLabel: 'View Details' });
  attachProductCardInteractions(container);
}

function renderHeroBestSellers(){
  var rail = document.getElementById('heroBestSellers');
  var prev = document.getElementById('heroBestPrev');
  var next = document.getElementById('heroBestNext');
  if(!rail || !prev || !next) return;
  var featured = PRODUCTS.slice(0, 6);
  if(!featured.length) return;

  var activeIndex = 0;
  var isAnimating = false;
  var TRANSITION_MS = 220;

  function draw(){
    var product = featured[activeIndex];
    rail.innerHTML = '<a class="hero-best-card" href="'+getProductUrl(product.id)+'" aria-label="'+escapeHtml(product.name)+' details">'+
      '<img class="hero-best-image" src="'+getProductImage(product)+'" alt="'+escapeHtml(product.name)+' product image" loading="lazy">'+
      '<p class="hero-best-title">'+escapeHtml(product.name)+'</p>'+
      '<p class="hero-best-price">$'+product.price.toFixed(2)+'</p>'+
    '</a>';
  }

  function clearAnimationClasses(){
    rail.classList.remove('is-exit-left', 'is-exit-right', 'is-enter-left', 'is-enter-right');
  }

  function animateTo(delta){
    if(isAnimating) return;
    isAnimating = true;

    var exitClass = delta > 0 ? 'is-exit-left' : 'is-exit-right';
    var enterClass = delta > 0 ? 'is-enter-right' : 'is-enter-left';

    clearAnimationClasses();
    rail.classList.add(exitClass);

    window.setTimeout(function(){
      activeIndex = (activeIndex + delta + featured.length) % featured.length;
      draw();
      clearAnimationClasses();
      rail.classList.add(enterClass);
      // Force reflow so removing enter class triggers a smooth transition to default state.
      rail.offsetWidth;
      rail.classList.remove(enterClass);

      window.setTimeout(function(){
        isAnimating = false;
      }, TRANSITION_MS);
    }, TRANSITION_MS);
  }

  prev.addEventListener('click', function(){
    animateTo(-1);
  });

  next.addEventListener('click', function(){
    animateTo(1);
  });

  draw();
}

function renderProductDetailPage(){
  var page = document.querySelector('[data-product-detail-page]');
  if(!page) return;

  var params = new URLSearchParams(window.location.search);
  var product = getProductById(params.get('product')) || PRODUCTS[0];
  var titleEl = document.getElementById('productDetailTitle');
  var tagEl = document.getElementById('productDetailTag');
  var priceEl = document.getElementById('productDetailPrice');
  var breadcrumbEl = document.getElementById('productDetailBreadcrumb');
  var summaryEl = document.getElementById('productDetailSummary');
  var descPanel = document.getElementById('productTabPanel');
  var qtyEl = document.getElementById('productDetailQty');
  var addBtn = document.getElementById('productDetailAddBtn');
  var tabs = page.querySelectorAll('[data-detail-tab]');
  var detailMedia = page.querySelector('.product-detail-media');
  var tabContent = {
    description: buildProductDescription(product),
    disclaimer: buildProductDisclaimer(product)
  };

  document.title = product.name + ' | PepX Research Chemicals';
  if(titleEl) titleEl.textContent = product.name;
  if(tagEl) tagEl.textContent = product.tag;
  if(breadcrumbEl) breadcrumbEl.textContent = product.name;
  if(summaryEl) summaryEl.textContent = product.description;
  renderSavingsRows(product);
  if(detailMedia){
    detailMedia.classList.add('has-product-image');
    detailMedia.style.backgroundImage = 'url("' + getProductImage(product) + '")';
    detailMedia.style.backgroundSize = 'cover';
    detailMedia.style.backgroundPosition = 'center';
  }

  function updateDetailPrice(){
    if(!priceEl) return;
    var pricing = getQuantityPricing(product.price, qtyEl ? qtyEl.value : 1);
    setDualPriceMarkup(priceEl, pricing);
    toggleAddToCartOption(addBtn, pricing.qty);
  }

  if(qtyEl){
    qtyEl.oninput = updateDetailPrice;
    qtyEl.onchange = updateDetailPrice;
  }
  updateDetailPrice();

  function setActiveTab(tabName){
    tabs.forEach(function(tab){
      tab.classList.toggle('active', tab.getAttribute('data-detail-tab') === tabName);
    });
    if(!descPanel) return;
    if(tabName === 'disclaimer'){
      descPanel.innerHTML = tabContent.disclaimer || '';
      return;
    }
    descPanel.innerHTML = '<p>' + escapeHtml(tabContent[tabName] || '') + '</p>';
  }

  tabs.forEach(function(tab){
    tab.addEventListener('click', function(){
      setActiveTab(tab.getAttribute('data-detail-tab'));
    });
  });
  setActiveTab('description');

  if(addBtn){
    addBtn.addEventListener('click', function(){
      var qty = qtyEl ? Math.max(0, parseInt(qtyEl.value, 10) || 0) : 0;
      if(qty < 1) return;
      cart[product.id] = (cart[product.id] || 0) + qty;
      renderCart();
      saveCart();
      showToast(qty + ' × ' + product.name + ' added to cart');
    });
  }

  renderProductRail('upsellGrid', getUpsellProducts(product, 3));
  renderProductRail('relatedGrid', getRelatedProducts(product, 3));
}

function addSelectedProductToCart(){
  if(!selectedProductId) return;
  var qty = parseInt(document.getElementById('productModalQty').value, 10) || 0;
  if(qty < 1) return;
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

// ---------- Account auth ----------
function authApi(path, options){
  var request = options || {};
  request.credentials = 'include';
  request.headers = request.headers || {};
  if(!(request.body instanceof FormData)){
    request.headers['Content-Type'] = request.headers['Content-Type'] || 'application/json';
  }

  return fetch(path, request).then(function(res){
    return res.json().catch(function(){ return {}; }).then(function(data){
      if(!res.ok){
        var error = new Error(data.error || 'Request failed');
        error.status = res.status;
        throw error;
      }
      return data;
    });
  });
}

function loadAuthSession(){
  return authApi('/api/auth/session', { method:'GET' }).then(function(data){
    currentAuthSession = data.user || null;
    return currentAuthSession;
  }).catch(function(){
    currentAuthSession = null;
    return null;
  });
}

function normalizeEmail(email){
  return (email || '').toString().trim().toLowerCase();
}

function ensureAuthModal(){
  if(document.getElementById('authModal')) return;
  var wrapper = document.createElement('div');
  wrapper.id = 'authModal';
  wrapper.className = 'auth-modal';
  wrapper.setAttribute('aria-hidden', 'true');
  wrapper.innerHTML = ''+
    '<div class="auth-modal-backdrop" data-auth-close="1"></div>'+
    '<div class="auth-modal-card" role="dialog" aria-modal="true" aria-labelledby="authTitle">'+
      '<button type="button" class="auth-close" id="authCloseBtn" aria-label="Close account panel">&times;</button>'+
      '<h3 id="authTitle">Your Account</h3>'+
      '<p class="auth-sub">Create an account or sign in to continue.</p>'+
      '<div class="auth-tabs">'+
        '<button type="button" class="auth-tab active" data-auth-tab="signup">Sign Up</button>'+
        '<button type="button" class="auth-tab" data-auth-tab="login">Log In</button>'+
      '</div>'+
      '<div class="auth-body">'+
        '<div class="auth-panel" id="authSignedPanel" style="display:none"></div>'+
        '<div class="auth-panel" id="authSignupPanel">'+
          '<button type="button" class="google-auth-btn" id="googleSignupBtn">Continue with Google</button>'+
          '<div class="auth-divider"><span>or use your email</span></div>'+
          '<form id="signupForm" class="auth-form" autocomplete="on">'+
            '<label><span>Full Name</span><input type="text" name="name" required></label>'+
            '<label><span>Email</span><input type="email" name="email" required></label>'+
            '<label><span>Password</span><input type="password" name="password" minlength="8" required></label>'+
            '<label><span>Institution Type</span>'+
              '<select name="institution" required>'+
                '<option value="">Select institution type...</option>'+
                '<option value="University / Academic">University / Academic</option>'+
                '<option value="Research Laboratory">Research Laboratory</option>'+
                '<option value="Clinical / Medical Facility">Clinical / Medical Facility</option>'+
                '<option value="Biotech / Pharmaceutical Company">Biotech / Pharmaceutical Company</option>'+
                '<option value="Government Agency">Government Agency</option>'+
                '<option value="Independent Researcher">Independent Researcher</option>'+
                '<option value="Other">Other</option>'+
              '</select>'+
            '</label>'+
            '<button type="submit" class="btn primary">Create Account</button>'+
          '</form>'+
        '</div>'+
        '<div class="auth-panel" id="authLoginPanel" style="display:none">'+
          '<button type="button" class="google-auth-btn" id="googleLoginBtn">Continue with Google</button>'+
          '<div class="auth-divider"><span>or log in with email</span></div>'+
          '<form id="loginForm" class="auth-form" autocomplete="on">'+
            '<label><span>Email</span><input type="email" name="email" required></label>'+
            '<label><span>Password</span><input type="password" name="password" required></label>'+
            '<button type="submit" class="btn primary">Log In</button>'+
          '</form>'+
        '</div>'+
        '<p class="auth-message" id="authMessage" aria-live="polite"></p>'+
      '</div>'+
    '</div>';
  document.body.appendChild(wrapper);
}

function setAuthMessage(message, isError){
  var el = document.getElementById('authMessage');
  if(!el) return;
  el.textContent = message || '';
  el.classList.toggle('error', !!isError);
  el.classList.toggle('success', !!message && !isError);
}

function switchAuthTab(tab){
  var signupPanel = document.getElementById('authSignupPanel');
  var loginPanel = document.getElementById('authLoginPanel');
  var signedPanel = document.getElementById('authSignedPanel');
  if(!signupPanel || !loginPanel || !signedPanel) return;
  signedPanel.style.display = 'none';
  signupPanel.style.display = tab === 'signup' ? 'block' : 'none';
  loginPanel.style.display = tab === 'login' ? 'block' : 'none';
  document.querySelectorAll('.auth-tab').forEach(function(btn){
    btn.classList.toggle('active', btn.getAttribute('data-auth-tab') === tab);
  });
}

function renderSignedInPanel(session){
  var signedPanel = document.getElementById('authSignedPanel');
  if(!signedPanel) return;
  signedPanel.innerHTML = ''+
    '<div class="signed-box">'+
      '<p><strong>Signed in as:</strong> ' + session.name + '</p>'+
      '<p><strong>Email:</strong> ' + session.email + '</p>'+
      '<p><strong>Institution:</strong> ' + (session.institution || 'Not set') + '</p>'+
      '<p><strong>Method:</strong> ' + session.provider + '</p>'+
      '<button type="button" class="btn ghost" id="logoutBtn">Log Out</button>'+
    '</div>';
  signedPanel.style.display = 'block';
  var signupPanel = document.getElementById('authSignupPanel');
  var loginPanel = document.getElementById('authLoginPanel');
  if(signupPanel) signupPanel.style.display = 'none';
  if(loginPanel) loginPanel.style.display = 'none';
  document.querySelectorAll('.auth-tab').forEach(function(btn){ btn.classList.remove('active'); });
  var logoutBtn = document.getElementById('logoutBtn');
  if(logoutBtn){
    logoutBtn.addEventListener('click', function(){
      authApi('/api/auth/logout', { method:'POST' }).then(function(){
        currentAuthSession = null;
        setAuthMessage('Logged out successfully.', false);
        switchAuthTab('login');
        updateAccountButtonState();
        window.dispatchEvent(new CustomEvent('pepx-auth-changed', { detail: { session: null } }));
      }).catch(function(err){
        setAuthMessage(err.message || 'Logout failed.', true);
      });
    });
  }
}

function openAuthModal(defaultTab){
  ensureAuthModal();
  var modal = document.getElementById('authModal');
  if(!modal) return;

  loadAuthSession().then(function(session){
    if(session){
      renderSignedInPanel(session);
    } else {
      switchAuthTab(defaultTab || 'signup');
    }
    setAuthMessage('', false);
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('locked');
  });
}

function closeAuthModal(){
  var modal = document.getElementById('authModal');
  if(!modal) return;
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
  if(!document.getElementById('gate') || document.getElementById('gate').classList.contains('hidden')){
    document.body.classList.remove('locked');
  }
}

function handleGoogleAuth(){
  var next = window.location.pathname + window.location.search;
  window.location.href = '/auth/google?next=' + encodeURIComponent(next);
}

function updateAccountButtonState(){
  var accountBtn = document.getElementById('accountBtn');
  if(!accountBtn) return;
  var session = currentAuthSession;
  if(session){
    accountBtn.setAttribute('title', 'Account: ' + session.name);
    accountBtn.setAttribute('aria-label', 'Account: signed in as ' + session.name);
    accountBtn.classList.add('signed-in');
  } else {
    accountBtn.setAttribute('title', 'Account');
    accountBtn.setAttribute('aria-label', 'Account');
    accountBtn.classList.remove('signed-in');
  }
}

function initAuth(){
  ensureAuthModal();
  var modal = document.getElementById('authModal');
  if(!modal) return;

  loadAuthSession().then(function(){
    updateAccountButtonState();

    var params = new URLSearchParams(window.location.search);
    var authState = params.get('auth');
    if(authState === 'google-success'){
      showToast('Google sign-in successful.');
    } else if(authState === 'google-failed'){
      showToast('Google sign-in failed. Please try again.');
    } else if(authState === 'google-not-configured'){
      showToast('Google sign-in is not configured yet.');
    } else if(authState === 'account-required'){
      showToast('Please sign in to access your account page.');
    }

    if(authState){
      params.delete('auth');
      var next = window.location.pathname + (params.toString() ? ('?' + params.toString()) : '') + window.location.hash;
      window.history.replaceState({}, '', next);
    }
  });

  modal.addEventListener('click', function(e){
    if(e.target.matches('[data-auth-close="1"]')) closeAuthModal();
  });
  var closeBtn = document.getElementById('authCloseBtn');
  if(closeBtn){ closeBtn.addEventListener('click', closeAuthModal); }

  document.querySelectorAll('.auth-tab').forEach(function(btn){
    btn.addEventListener('click', function(){
      switchAuthTab(btn.getAttribute('data-auth-tab'));
      setAuthMessage('', false);
    });
  });

  var signupForm = document.getElementById('signupForm');
  if(signupForm){
    signupForm.addEventListener('submit', function(e){
      e.preventDefault();
      var fd = new FormData(signupForm);
      var name = (fd.get('name') || '').toString().trim();
      var email = normalizeEmail(fd.get('email'));
      var password = (fd.get('password') || '').toString();
      var institution = (fd.get('institution') || '').toString();

      if(!name || !email || !password || !institution){
        setAuthMessage('All signup fields are required.', true);
        return;
      }
      if(password.length < 8){
        setAuthMessage('Password must be at least 8 characters.', true);
        return;
      }

      authApi('/api/auth/signup', {
        method:'POST',
        body: JSON.stringify({
          name: name,
          email: email,
          password: password,
          institution: institution
        })
      }).then(function(data){
        currentAuthSession = data.user;
        setAuthMessage('Account created successfully.', false);
        signupForm.reset();
        renderSignedInPanel(currentAuthSession);
        updateAccountButtonState();
        window.dispatchEvent(new CustomEvent('pepx-auth-changed', { detail: { session: currentAuthSession } }));
        showToast('Welcome, ' + currentAuthSession.name + '!');
      }).catch(function(err){
        setAuthMessage(err.message || 'Signup failed.', true);
      });
    });
  }

  var loginForm = document.getElementById('loginForm');
  if(loginForm){
    loginForm.addEventListener('submit', function(e){
      e.preventDefault();
      var fd = new FormData(loginForm);
      var email = normalizeEmail(fd.get('email'));
      var password = (fd.get('password') || '').toString();

      authApi('/api/auth/login', {
        method:'POST',
        body: JSON.stringify({ email: email, password: password })
      }).then(function(data){
        currentAuthSession = data.user;
        loginForm.reset();
        setAuthMessage('Login successful.', false);
        renderSignedInPanel(currentAuthSession);
        updateAccountButtonState();
        window.dispatchEvent(new CustomEvent('pepx-auth-changed', { detail: { session: currentAuthSession } }));
        showToast('Welcome back, ' + currentAuthSession.name + '!');
      }).catch(function(err){
        setAuthMessage(err.message || 'Login failed.', true);
      });
    });
  }

  var googleSignupBtn = document.getElementById('googleSignupBtn');
  if(googleSignupBtn){ googleSignupBtn.addEventListener('click', handleGoogleAuth); }
  var googleLoginBtn = document.getElementById('googleLoginBtn');
  if(googleLoginBtn){ googleLoginBtn.addEventListener('click', handleGoogleAuth); }

  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape') closeAuthModal();
  });
}

function formatOrderDate(value){
  var dt = new Date(value);
  if(Number.isNaN(dt.getTime())) return value || '';
  return dt.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function buildOrderCard(order){
  var itemsHtml = (order.items || []).map(function(item){
    return '<li><span>' + escapeHtml(item.name) + ' x' + item.quantity + '</span><span>$' + Number(item.lineTotal || 0).toFixed(2) + '</span></li>';
  }).join('');

  return '<article class="account-order-card">' +
    '<div class="account-order-head"><h4>Order #' + escapeHtml(order.id.slice(0, 8).toUpperCase()) + '</h4><span class="account-order-status">' + escapeHtml(order.status || 'Processing') + '</span></div>' +
    '<p class="account-order-date">Placed ' + escapeHtml(formatOrderDate(order.createdAt)) + '</p>' +
    '<ul class="account-order-items">' + itemsHtml + '</ul>' +
    '<div class="account-order-total">Total: $' + Number(order.totalAmount || 0).toFixed(2) + '</div>' +
    '</article>';
}

function renderOrdersByType(orders){
  var currentRoot = document.getElementById('currentOrdersList');
  var pastRoot = document.getElementById('pastOrdersList');
  if(!currentRoot || !pastRoot) return;

  var currentStatuses = { Processing: true, Pending: true, Shipped: true };
  var current = orders.filter(function(order){ return currentStatuses[order.status || '']; });
  var past = orders.filter(function(order){ return !currentStatuses[order.status || '']; });

  currentRoot.innerHTML = current.length
    ? current.map(buildOrderCard).join('')
    : '<p class="account-empty">No current orders.</p>';

  pastRoot.innerHTML = past.length
    ? past.map(buildOrderCard).join('')
    : '<p class="account-empty">No past orders.</p>';
}

function initAccountPage(){
  var page = document.querySelector('[data-account-page]');
  if(!page) return;

  var msg = document.getElementById('accountPageMessage');
  var profileForm = document.getElementById('accountProfileForm');
  var addressForm = document.getElementById('accountAddressForm');
  var passwordForm = document.getElementById('accountPasswordForm');
  var logoutBtn = document.getElementById('accountLogoutBtn');
  var accountSections = page.querySelectorAll('.account-card, .account-grid');

  function setPageMessage(text, isError){
    if(!msg) return;
    msg.textContent = text || '';
    msg.classList.toggle('error', !!isError);
    msg.classList.toggle('success', !!text && !isError);
  }

  function setAccountLocked(locked){
    accountSections.forEach(function(section){
      section.style.display = locked ? 'none' : '';
    });
    if(logoutBtn){
      logoutBtn.style.display = locked ? 'none' : '';
    }
  }

  function loadOverview(){
    return authApi('/api/account/overview', { method: 'GET' }).then(function(data){
      var profile = data.profile || {};
      if(profileForm){
        profileForm.name.value = profile.name || '';
        profileForm.email.value = profile.email || '';
        profileForm.institution.value = profile.institution || '';
      }
      if(addressForm){
        addressForm.billingAddress.value = profile.billingAddress || '';
        addressForm.shippingAddress.value = profile.shippingAddress || '';
      }
      renderOrdersByType(data.orders || []);
      return data;
    });
  }

  window.addEventListener('pepx-auth-changed', function(e){
    var session = e && e.detail ? e.detail.session : null;
    if(!session){
      setAccountLocked(true);
      setPageMessage('Sign in to view your account, orders, and saved addresses.', false);
      openAuthModal('login');
      return;
    }

    setAccountLocked(false);
    setPageMessage('', false);
    loadOverview().catch(function(err){
      setPageMessage(err.message || 'Failed to load account data.', true);
    });
  });

  loadAuthSession().then(function(session){
    updateAccountButtonState();
    if(!session){
      setAccountLocked(true);
      setPageMessage('Sign in to view your account, orders, and saved addresses.', false);
      openAuthModal('login');
      return;
    }

    setAccountLocked(false);
    setPageMessage('', false);
    loadOverview().catch(function(err){
      setPageMessage(err.message || 'Failed to load account data.', true);
    });
  });

  if(profileForm){
    profileForm.addEventListener('submit', function(e){
      e.preventDefault();
      var fd = new FormData(profileForm);
      authApi('/api/account/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: (fd.get('name') || '').toString().trim(),
          email: normalizeEmail(fd.get('email')),
          institution: (fd.get('institution') || '').toString().trim()
        })
      }).then(function(data){
        currentAuthSession = data.user || currentAuthSession;
        updateAccountButtonState();
        setPageMessage('Profile updated.', false);
      }).catch(function(err){
        setPageMessage(err.message || 'Failed to update profile.', true);
      });
    });
  }

  if(addressForm){
    addressForm.addEventListener('submit', function(e){
      e.preventDefault();
      var fd = new FormData(addressForm);
      authApi('/api/account/addresses', {
        method: 'PUT',
        body: JSON.stringify({
          billingAddress: (fd.get('billingAddress') || '').toString(),
          shippingAddress: (fd.get('shippingAddress') || '').toString()
        })
      }).then(function(){
        setPageMessage('Address information updated.', false);
      }).catch(function(err){
        setPageMessage(err.message || 'Failed to update addresses.', true);
      });
    });
  }

  if(passwordForm){
    passwordForm.addEventListener('submit', function(e){
      e.preventDefault();
      var fd = new FormData(passwordForm);
      var newPassword = (fd.get('newPassword') || '').toString();
      var confirmNewPassword = (fd.get('confirmNewPassword') || '').toString();
      if(newPassword !== confirmNewPassword){
        setPageMessage('New password and confirmation do not match.', true);
        return;
      }

      authApi('/api/account/password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: (fd.get('currentPassword') || '').toString(),
          newPassword: newPassword
        })
      }).then(function(){
        passwordForm.reset();
        setPageMessage('Password updated successfully.', false);
      }).catch(function(err){
        setPageMessage(err.message || 'Failed to update password.', true);
      });
    });
  }

  if(logoutBtn){
    logoutBtn.addEventListener('click', function(){
      authApi('/api/auth/logout', { method: 'POST' }).then(function(){
        window.location.href = '/index.html';
      });
    });
  }
}

// ---------- Reviews ----------
var reviews = [];
var HERO_REVIEW_FALLBACK = [
  {rating:5, name:'Avery M.', email:'Research Lab', message:'Excellent consistency between lots. Purity and handling quality are exactly what our bench workflow requires.'},
  {rating:5, name:'Logan R.', email:'Biotech Team', message:'Shipping and packaging have been reliable every time. Materials arrive cold, sealed, and ready for controlled use.'},
  {rating:5, name:'Taylor C.', email:'University Group', message:'Documentation and quality control are strong. This has become our preferred source for repeat peptide studies.'},
  {rating:4, name:'Jordan P.', email:'Independent Researcher', message:'Great communication and clear labeling. Products have integrated smoothly into our protocol validation work.'},
  {rating:5, name:'Riley D.', email:'Clinical Research Unit', message:'Fast fulfillment and consistent product integrity. We appreciate the professional handling standards.'},
  {rating:5, name:'Morgan L.', email:'Pharma R&D', message:'Reliable outcomes in our assays and very clean presentation. Exactly what we need from a research supplier.'}
];

function formatReviewDisplayName(name){
  var cleanName = (name || '').toString().trim();
  if(!cleanName) return 'Verified Researcher';
  var parts = cleanName.split(/\s+/);
  return parts.length > 1 ? parts[0] + ' ' + parts[parts.length-1].charAt(0) + '.' : cleanName;
}

function getHeroCollageReviews(){
  var source = reviews.length ? reviews.slice(0, 8) : HERO_REVIEW_FALLBACK.slice(0, 8);
  return source.map(function(review){
    return {
      rating: Math.max(1, Math.min(5, parseInt(review.rating, 10) || 5)),
      name: formatReviewDisplayName(review.name),
      message: (review.message || '').toString().trim() || 'High-quality materials and reliable service for repeatable research work.'
    };
  });
}

function renderHeroReviewCollage(){
  var root = document.getElementById('heroReviewCollage');
  if(!root) return;
  var entries = getHeroCollageReviews();
  var buildCards = function(items){
    return items.map(function(review){
      var stars = '★'.repeat(review.rating) + '☆'.repeat(5-review.rating);
      return '<article class="hero-review-card"><div class="hero-review-stars">'+stars+'</div><p class="hero-review-text">"'+escapeHtml(review.message)+'"</p><div class="hero-review-author">'+escapeHtml(review.name)+'</div></article>';
    }).join('');
  };
  var cards = buildCards(entries.concat(entries));
  root.innerHTML = '<div class="review-collage-track">'+cards+'</div>';
}

function renderReviews(){
  renderHeroReviewCollage();
  var list = document.getElementById('reviewList');
  if(!list) return;
  if(!reviews.length){
    list.innerHTML = '<div class="review-empty">No reviews yet. Be the first to leave one.</div>';
    return;
  }
  list.innerHTML = reviews.map(function(review){
    var stars = '★'.repeat(review.rating) + '☆'.repeat(5-review.rating);
    var displayName = formatReviewDisplayName(review.name);
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
  if(!review.rating || !review.name || !review.email || !review.message){ return false; }
  reviews.unshift(review);
  renderReviews();
  form.reset();
  var picker = form.querySelector('.star-picker');
  if(picker){
    picker.querySelectorAll('.star-btn').forEach(function(btn){ btn.classList.remove('active'); });
    picker.querySelector('input[name="rating"]').value = '';
  }
  return true;
}

// ---------- Entry gate ----------
function initGate(){
  var overlay = document.getElementById('gate');
  if(!overlay) return;

  var hasAcceptedGate = false;
  try {
    hasAcceptedGate = window.localStorage.getItem(GATE_ACCEPTED_KEY) === 'true';
  } catch (err) {
    hasAcceptedGate = false;
  }

  if(hasAcceptedGate){
    overlay.classList.add('hidden');
    document.body.classList.remove('locked');
    return;
  }

  document.body.classList.add('locked');
  var r=document.getElementById('g-research'), a=document.getElementById('g-age'), i=document.getElementById('g-inst'), e=document.getElementById('g-enter');
  function v(){ e.disabled = !(r.checked && a.checked && i.value); }
  [r,a,i].forEach(function(el){ el.addEventListener('change', v); });
  e.addEventListener('click', function(){
    try { window.localStorage.setItem(GATE_ACCEPTED_KEY, 'true'); } catch (err) {}
    overlay.classList.add('hidden');
    document.body.classList.remove('locked');
  });
  var d=document.getElementById('g-decline');
  if(d) d.addEventListener('click', function(){ window.location.href='https://www.google.com'; });
  v();
}

// ---------- Init ----------
window.addEventListener('DOMContentLoaded', function(){
  var initialSearchQuery = getInitialProductSearchQuery();
  loadCart();
  initShopCategoryFromUrl();
  initMenuDropdowns();
  initMobileNav();
  renderProducts(initialSearchQuery);
  renderHeroBestSellers();
  renderCart();
  renderProductDetailPage();
  initAccountPage();
  initGate();
  initAuth();

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
      var submitted = addReview(reviewForm);
      showToast(submitted ? 'Review submitted' : 'Please complete rating, name, email, and review');
    });
  }
  renderReviews();

  // Header + cart controls
  var searchWrap = document.getElementById('searchWrap');
  var searchInput = document.getElementById('productSearch');
  if(searchInput && initialSearchQuery){
    searchInput.value = initialSearchQuery;
    if(searchWrap) searchWrap.classList.add('active');
  }
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
      var query = searchInput.value.trim();
      if(query){
        goToShopSearch(query);
        return;
      }
      searchWrap.classList.add('active');
      searchInput.focus();
    });

    searchInput.addEventListener('keydown', function(e){
      if(e.key !== 'Enter') return;
      e.preventDefault();
      var query = searchInput.value.trim();
      if(query){
        goToShopSearch(query);
        return;
      }
      if(window.location.pathname.endsWith('shop.html') || window.location.pathname === '/shop.html'){
        renderProducts('');
      }
    });
  }
  if(searchInput){
    searchInput.addEventListener('input', function(){
      renderProducts(searchInput.value);
    });
  }

  document.querySelectorAll('.pill').forEach(function(btn){
    btn.addEventListener('click', function(){
      activeCategory = btn.getAttribute('data-filter');
      syncActiveCategoryPills();
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
      openAuthModal('signup');
    });
  }
  var checkoutBtnEl = document.getElementById('checkoutBtn');
  if(checkoutBtnEl){
    checkoutBtnEl.addEventListener('click', function(){
      if(!Object.keys(cart).length){ showToast('Your cart is empty'); return; }
      if(!currentAuthSession){
        showToast('Please sign in to place your order.');
        openAuthModal('login');
        return;
      }

      var items = Object.keys(cart).map(function(id){
        var product = getProductById(id);
        return {
          productId: id,
          name: product ? product.name : id,
          quantity: cart[id],
          unitPrice: product ? product.price : 0
        };
      });

      authApi('/api/account/orders', {
        method: 'POST',
        body: JSON.stringify({ items: items })
      }).then(function(){
        cart = {};
        renderCart();
        closeCart();
        showToast('Order placed successfully.');
        if(window.location.pathname.indexOf('checkout.html') !== -1){
          window.location.href = 'account.html';
        }
      }).catch(function(err){
        showToast(err.message || 'Failed to place order.');
      });
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
