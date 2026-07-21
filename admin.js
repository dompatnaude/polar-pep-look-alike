(function () {
  'use strict';

  var state = {
    tab: 'orders',
    filter: '',
    search: '',
    orders: [],
    statuses: [],
    currentId: null,
    products: [],
    productSearch: '',
    editingProductId: null,
    productVariants: []
  };

  function $(id) { return document.getElementById(id); }
  function money(n) { n = Number(n) || 0; return '$' + n.toFixed(2); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmtDate(d) { if (!d) return ''; try { return new Date(d).toLocaleString(); } catch (e) { return String(d); } }
  function slugify(v) {
    return String(v || '').toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
  }

  function toast(msg) {
    var t = $('toast'); if (!t) { return; }
    t.textContent = msg; t.classList.add('show');
    setTimeout(function () { t.classList.remove('show'); }, 2200);
  }

  // Thin API wrapper. Sends cookies; throws Error with .status on non-2xx.
  function api(path, options) {
    options = options || {};
    options.credentials = 'include';
    options.headers = options.headers || {};
    if (options.body && !(options.body instanceof FormData)) {
      options.headers['Content-Type'] = 'application/json';
    }
    return fetch(path, options).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) {
          var err = new Error(data.error || ('Request failed (' + res.status + ')'));
          err.status = res.status; throw err;
        }
        return data;
      });
    });
  }

  // Map a UI filter chip to a server status query.
  function filterToStatus(filter) {
    if (filter === 'new') return 'pending_payment';
    if (filter === 'processing') return 'processing';
    if (filter === 'shipped') return 'shipped';
    if (filter === 'completed') return 'completed';
    return '';
  }

  function statusBadge(status) {
    var cls = 'gray';
    if (status === 'processing' || status === 'paid') cls = 'blue';
    else if (status === 'shipped') cls = 'amber';
    else if (status === 'completed') cls = 'green';
    else if (status === 'cancelled') cls = 'red';
    return '<span class="badge ' + cls + '">' + esc(status || '') + '</span>';
  }
  function fulfillmentBadge(f) {
    var cls = 'gray', label = f || 'unfulfilled';
    if (f === 'shipped') { cls = 'green'; }
    else if (f === 'label_created') { cls = 'blue'; label = 'label created'; }
    return '<span class="badge ' + cls + '">' + esc(label) + '</span>';
  }

  function loadOrders() {
    var qs = [];
    var status = filterToStatus(state.filter);
    if (status) qs.push('status=' + encodeURIComponent(status));
    if (state.search) qs.push('search=' + encodeURIComponent(state.search));
    var url = '/api/admin/orders' + (qs.length ? ('?' + qs.join('&')) : '');
    return api(url).then(function (data) {
      state.orders = data.orders || [];
      state.statuses = data.statuses || [];
      $('adminDenied').classList.add('hidden');
      $('adminApp').classList.remove('hidden');
      renderTable();
    }).catch(function (err) {
      if (err.status === 401 || err.status === 403) { showDenied(err.status); }
      else { toast(err.message || 'Failed to load orders'); }
    });
  }

  function showDenied(status) {
    $('adminApp').classList.add('hidden');
    var d = $('adminDenied'); d.classList.remove('hidden');
    d.querySelector('p').textContent = status === 401
      ? 'You must be signed in as an administrator to use this console.'
      : 'Your account does not have admin access.';
  }

  function renderProductTable() {
    var body = $('productsBody');
    if (!body) return;
    var q = state.productSearch.toLowerCase();
    var rows = state.products.filter(function (p) {
      if (!q) return true;
      var hay = [p.name, p.slug, p.sku, p.category].filter(Boolean).join(' ').toLowerCase();
      return hay.indexOf(q) !== -1;
    });
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="7" class="muted">No products found.</td></tr>';
      return;
    }
    body.innerHTML = rows.map(function (p) {
      var image = p.image_url ? '<img class="product-thumb" src="' + esc(p.image_url) + '" alt="' + esc(p.name || 'Product') + '">' : '<span class="muted">No image</span>';
      var status = p.active ? '<span class="badge green">active</span>' : '<span class="badge gray">inactive</span>';
      var toggleText = p.active ? 'Disable' : 'Enable';
      return '<tr>'
        + '<td>' + image + '</td>'
        + '<td><strong>' + esc(p.name || '') + '</strong><br><span class="muted">' + esc(p.slug || '') + '</span></td>'
        + '<td>' + esc(p.category || '\u2014') + '</td>'
        + '<td>' + money(p.price) + '</td>'
        + '<td>' + esc(String(p.stock_quantity == null ? '' : p.stock_quantity)) + '</td>'
        + '<td>' + status + '</td>'
        + '<td>'
        + '<button class="btn-sm secondary" data-product-edit="' + p.id + '">Edit</button> '
        + '<button class="btn-sm secondary" data-product-toggle="' + p.id + '">' + toggleText + '</button> '
        + '<button class="btn-sm danger" data-product-delete="' + p.id + '">Delete</button>'
        + '</td>'
        + '</tr>';
    }).join('');

    Array.prototype.forEach.call(body.querySelectorAll('[data-product-edit]'), function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(btn.getAttribute('data-product-edit'), 10);
        var p = state.products.find(function (x) { return Number(x.id) === id; });
        if (p) openProductModal(p);
      });
    });

    Array.prototype.forEach.call(body.querySelectorAll('[data-product-toggle]'), function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(btn.getAttribute('data-product-toggle'), 10);
        var p = state.products.find(function (x) { return Number(x.id) === id; });
        if (!p) return;
        updateProductStatus(id, !p.active);
      });
    });

    Array.prototype.forEach.call(body.querySelectorAll('[data-product-delete]'), function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(btn.getAttribute('data-product-delete'), 10);
        removeProduct(id);
      });
    });
  }

  function loadProducts() {
    return api('/api/admin/products').then(function (data) {
      state.products = data.products || [];
      $('adminDenied').classList.add('hidden');
      $('adminApp').classList.remove('hidden');
      renderProductTable();
    }).catch(function (err) {
      if (err.status === 401 || err.status === 403) { showDenied(err.status); }
      else { toast(err.message || 'Failed to load products'); }
    });
  }

  function setVariantEditorMode(enabled) {
    $('variantCreateRow').classList.toggle('hidden', !enabled);
    $('btnAddVariant').classList.toggle('hidden', !enabled);
    $('variantListTable').classList.toggle('hidden', !enabled);
    $('variantHint').textContent = enabled
      ? 'Add dosage-specific pricing and inventory.'
      : 'Save product first to add variants.';
    $('variantEmpty').classList.toggle('hidden', !enabled);
  }

  function renderVariantRows() {
    var tbody = $('variantRows');
    if (!tbody) return;
    var variants = (state.productVariants || []).filter(function (v) { return v.active !== false; });
    if (!variants.length) {
      tbody.innerHTML = '';
      $('variantEmpty').textContent = 'No variants yet.';
      $('variantEmpty').classList.remove('hidden');
      return;
    }
    $('variantEmpty').classList.add('hidden');
    tbody.innerHTML = variants.map(function (v) {
      return '<tr data-variant-id="' + v.id + '">'
        + '<td><input data-field="name" type="text" value="' + esc(v.name || '') + '" maxlength="100"></td>'
        + '<td><input data-field="price" type="number" min="0" step="0.01" value="' + Number(v.price || 0).toFixed(2) + '"></td>'
        + '<td><input data-field="stock_quantity" type="number" min="0" step="1" value="' + (Number(v.stock_quantity || 0)) + '"></td>'
        + '<td>' + (v.active ? '<span class="badge green">active</span>' : '<span class="badge gray">inactive</span>') + '</td>'
        + '<td class="variant-actions">'
        + '<button class="btn-sm secondary" type="button" data-variant-save="' + v.id + '">Save</button>'
        + '<button class="btn-sm secondary" type="button" data-variant-toggle="' + v.id + '">' + (v.active ? 'Disable' : 'Enable') + '</button>'
        + '<button class="btn-sm danger" type="button" data-variant-delete="' + v.id + '">Delete</button>'
        + '</td>'
        + '</tr>';
    }).join('');

    Array.prototype.forEach.call(tbody.querySelectorAll('[data-variant-save]'), function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(btn.getAttribute('data-variant-save'), 10);
        saveVariant(id);
      });
    });
    Array.prototype.forEach.call(tbody.querySelectorAll('[data-variant-toggle]'), function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(btn.getAttribute('data-variant-toggle'), 10);
        toggleVariant(id);
      });
    });
    Array.prototype.forEach.call(tbody.querySelectorAll('[data-variant-delete]'), function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(btn.getAttribute('data-variant-delete'), 10);
        disableVariant(id);
      });
    });
  }

  function loadVariants(productId) {
    if (!Number.isInteger(productId)) return Promise.resolve();
    return api('/api/admin/products/' + productId + '/variants')
      .then(function (data) {
        state.productVariants = data.variants || [];
        renderVariantRows();
      })
      .catch(function (err) {
        state.productVariants = [];
        renderVariantRows();
        toast(err.message || 'Failed to load variants');
      });
  }

  function getVariantRowPayload(variantId) {
    var row = $('variantRows').querySelector('tr[data-variant-id="' + variantId + '"]');
    if (!row) return null;
    var name = row.querySelector('input[data-field="name"]');
    var price = row.querySelector('input[data-field="price"]');
    var stock = row.querySelector('input[data-field="stock_quantity"]');
    var current = state.productVariants.find(function (v) { return Number(v.id) === Number(variantId); });
    return {
      name: String(name && name.value || '').trim(),
      price: Number(price && price.value),
      stock_quantity: parseInt(stock && stock.value, 10),
      active: current ? !!current.active : true
    };
  }

  function saveVariant(variantId) {
    var payload = getVariantRowPayload(variantId);
    if (!payload) return;
    api('/api/admin/variants/' + variantId, { method: 'PUT', body: JSON.stringify(payload) })
      .then(function () {
        toast('Variant updated');
        return loadVariants(state.editingProductId);
      })
      .catch(function (err) { toast(err.message || 'Failed to update variant'); });
  }

  function toggleVariant(variantId) {
    var payload = getVariantRowPayload(variantId);
    var current = state.productVariants.find(function (v) { return Number(v.id) === Number(variantId); });
    if (!current) return;
    payload.active = !current.active;
    api('/api/admin/variants/' + variantId, { method: 'PUT', body: JSON.stringify(payload) })
      .then(function () {
        toast(payload.active ? 'Variant enabled' : 'Variant disabled');
        return loadVariants(state.editingProductId);
      })
      .catch(function (err) { toast(err.message || 'Failed to update variant'); });
  }

  function disableVariant(variantId) {
    api('/api/admin/variants/' + variantId, { method: 'DELETE' })
      .then(function (data) {
        toast(data && data.mode === 'hard_delete' ? 'Variant deleted' : 'Variant archived');
        return loadVariants(state.editingProductId);
      })
      .catch(function (err) { toast(err.message || 'Failed to delete variant'); });
  }

  function addVariant() {
    if (!Number.isInteger(state.editingProductId)) {
      toast('Save product before adding variants');
      return;
    }
    var payload = {
      name: String($('variantName').value || '').trim(),
      price: Number($('variantPrice').value),
      stock_quantity: parseInt($('variantStock').value, 10),
      active: true
    };
    api('/api/admin/products/' + state.editingProductId + '/variants', {
      method: 'POST', body: JSON.stringify(payload)
    }).then(function () {
      $('variantName').value = '';
      $('variantPrice').value = '';
      $('variantStock').value = '';
      toast('Variant created');
      return loadVariants(state.editingProductId);
    }).catch(function (err) { toast(err.message || 'Failed to create variant'); });
  }

  function openProductModal(product) {
    var wrap = $('productModalWrap');
    var form = $('productForm');
    if (!wrap || !form) return;
    form.reset();
    form.elements.product_id.value = product && product.id ? String(product.id) : '';
    form.elements.name.value = product && product.name || '';
    form.elements.slug.value = product && product.slug || '';
    form.elements.description.value = product && product.description || '';
    form.elements.price.value = product && product.price != null ? Number(product.price).toFixed(2) : '';
    form.elements.category.value = product && product.category || '';
    form.elements.image_url.value = product && product.image_url || '';
    form.elements.sku.value = product && product.sku || '';
    form.elements.stock_quantity.value = product && product.stock_quantity != null ? String(product.stock_quantity) : '0';
    form.elements.active.value = product && product.active === false ? 'false' : 'true';
    state.editingProductId = product && product.id ? Number(product.id) : null;
    state.productVariants = [];
    renderVariantRows();
    if (Number.isInteger(state.editingProductId)) {
      setVariantEditorMode(true);
      loadVariants(state.editingProductId);
    } else {
      setVariantEditorMode(false);
    }
    $('productModalTitle').textContent = product && product.id ? 'Edit Product' : 'Add Product';
    wrap.classList.remove('hidden');
  }

  function closeProductModal() {
    var wrap = $('productModalWrap');
    if (wrap) wrap.classList.add('hidden');
    state.editingProductId = null;
    state.productVariants = [];
  }

  function collectProductPayload(form) {
    var price = Number(form.elements.price.value);
    var stock = parseInt(form.elements.stock_quantity.value, 10);
    return {
      name: String(form.elements.name.value || '').trim(),
      slug: slugify(form.elements.slug.value),
      description: String(form.elements.description.value || '').trim(),
      price: Number.isFinite(price) ? price : null,
      category: String(form.elements.category.value || '').trim(),
      image_url: String(form.elements.image_url.value || '').trim(),
      sku: String(form.elements.sku.value || '').trim(),
      stock_quantity: Number.isInteger(stock) ? stock : null,
      active: form.elements.active.value === 'true'
    };
  }

  function saveProduct(evt) {
    evt.preventDefault();
    var form = evt.target;
    var id = parseInt(form.elements.product_id.value, 10);
    var body = collectProductPayload(form);
    var method = Number.isInteger(id) ? 'PUT' : 'POST';
    var path = Number.isInteger(id) ? '/api/admin/products/' + id : '/api/admin/products';

    api(path, { method: method, body: JSON.stringify(body) })
      .then(function () {
        toast(Number.isInteger(id) ? 'Product updated' : 'Product created');
        closeProductModal();
        return loadProducts();
      })
      .catch(function (err) { toast(err.message || 'Failed to save product'); });
  }

  function updateProductStatus(id, active) {
    api('/api/admin/products/' + id + '/status', {
      method: 'PUT', body: JSON.stringify({ active: active })
    }).then(function () {
      toast(active ? 'Product enabled' : 'Product disabled');
      return loadProducts();
    }).catch(function (err) { toast(err.message || 'Failed to update product status'); });
  }

  function removeProduct(id) {
    api('/api/admin/products/' + id, { method: 'DELETE' })
      .then(function () {
        toast('Product disabled');
        return loadProducts();
      })
      .catch(function (err) { toast(err.message || 'Failed to delete product'); });
  }

  function switchTab(tab) {
    state.tab = tab === 'products' ? 'products' : 'orders';
    Array.prototype.forEach.call($('adminTabs').querySelectorAll('button'), function (b) {
      b.classList.toggle('active', b.getAttribute('data-tab') === state.tab);
    });
    $('ordersSection').classList.toggle('hidden', state.tab !== 'orders');
    $('productsSection').classList.toggle('hidden', state.tab !== 'products');
    if (state.tab === 'products') {
      loadProducts();
    } else {
      loadOrders();
    }
  }

  function renderTable() {
    var body = $('ordersBody');
    if (!state.orders.length) {
      body.innerHTML = '<tr><td colspan="8" class="muted">No orders found.</td></tr>';
      return;
    }
    body.innerHTML = state.orders.map(function (o) {
      var tracking = o.tracking_number
        ? (esc(o.carrier ? o.carrier + ' ' : '') + esc(o.tracking_number))
        : '<span class="muted">\u2014</span>';
      return '<tr>'
        + '<td>' + esc(o.order_number) + '</td>'
        + '<td>' + esc(o.shipping_name || '') + '<br><span class="muted">' + esc(o.shipping_email || '') + '</span></td>'
        + '<td>' + esc(fmtDate(o.created_at)) + '</td>'
        + '<td>' + money(o.total) + '</td>'
        + '<td>' + statusBadge(o.status) + '</td>'
        + '<td>' + fulfillmentBadge(o.fulfillment_status) + '</td>'
        + '<td>' + tracking + '</td>'
        + '<td><button class="link-btn" data-open="' + o.id + '">Open</button></td>'
        + '</tr>';
    }).join('');
    Array.prototype.forEach.call(body.querySelectorAll('[data-open]'), function (btn) {
      btn.addEventListener('click', function () { openOrder(parseInt(btn.getAttribute('data-open'), 10)); });
    });
  }

  function openOrder(id) {
    state.currentId = id;
    return api('/api/admin/orders/' + id).then(function (d) { renderDetail(d); })
      .catch(function (err) { toast(err.message || 'Failed to open order'); });
  }

  function renderDetail(d) {
    var order = d.order || {};
    var addr = d.shipping_address || {};
    var items = d.items || [];
    var tr = d.tracking || {};
    var panel = $('orderDetail');
    var itemsRows = items.map(function (it) {
      return '<tr><td>' + esc(it.name) + '</td><td>' + (Number(it.quantity) || 0) + '</td><td>'
        + money(it.price) + '</td><td>' + money(Number(it.price) * (Number(it.quantity) || 0)) + '</td></tr>';
    }).join('') || '<tr><td colspan="4" class="muted">No items</td></tr>';

    panel.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;">'
      + '<h2 style="margin:0;">' + esc(order.order_number) + '</h2>'
      + '<button class="link-btn" id="detailClose">Close</button></div>'
      + '<p>Status: ' + statusBadge(order.status) + ' &nbsp; Fulfillment: '
      + fulfillmentBadge(tr.shipped_at ? 'shipped' : (tr.shipping_label_url ? 'label_created' : 'unfulfilled')) + '</p>'
      + '<div class="admin-grid">'
      + '<div><h3>Customer</h3><div>' + esc(d.customer && d.customer.name || '') + '</div>'
      + '<div class="muted">' + esc(d.customer && d.customer.email || '') + '</div></div>'
      + '<div><h3>Shipping address</h3>'
      + '<div>' + esc(addr.name || '') + '</div>'
      + '<div>' + esc(addr.address || '') + '</div>'
      + '<div>' + esc([addr.city, addr.state, addr.zip].filter(Boolean).join(', ')) + '</div></div>'
      + '</div>'
      + '<h3 style="margin-top:1rem;">Items</h3>'
      + '<table class="admin-table"><thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Line total</th></tr></thead>'
      + '<tbody>' + itemsRows + '</tbody></table>'
      + '<p style="margin-top:.6rem;">Subtotal: ' + money(d.totals && d.totals.subtotal) + ' &nbsp; '
      + 'Shipping: ' + money(d.totals && d.totals.shipping_cost) + ' &nbsp; '
      + '<strong>Total: ' + money(d.totals && d.totals.total) + '</strong></p>'
      + '<h3 style="margin-top:1rem;">Tracking</h3>'
      + '<div>Carrier: ' + esc(tr.carrier || '\u2014') + ' &nbsp; Tracking #: ' + esc(tr.tracking_number || '\u2014') + '</div>'
      + '<div>Label: ' + (tr.shipping_label_url ? '<a href="' + esc(tr.shipping_label_url) + '" target="_blank" rel="noopener">view label</a>' : '<span class="muted">none</span>') + '</div>'
      + '<div class="track-form">'
      + '<input id="tfCarrier" placeholder="Carrier" value="' + esc(tr.carrier || '') + '">'
      + '<input id="tfTracking" placeholder="Tracking number" value="' + esc(tr.tracking_number || '') + '">'
      + '<input id="tfLabel" placeholder="Label URL" value="' + esc(tr.shipping_label_url || '') + '">'
      + '<button class="secondary" id="btnSaveTracking">Add Tracking</button>'
      + '</div>'
      + '<div class="admin-actions">'
      + '<button id="btnLabel">Create Shipping Label</button>'
      + '<button class="secondary" id="btnProcessing">Mark Processing</button>'
      + '<button id="btnShipped">Mark Shipped</button>'
      + '</div>';
    panel.classList.remove('hidden');

    $('detailClose').addEventListener('click', function () { panel.classList.add('hidden'); });
    $('btnLabel').addEventListener('click', createLabel);
    $('btnProcessing').addEventListener('click', function () { setStatus('processing'); });
    $('btnShipped').addEventListener('click', function () { setStatus('shipped'); });
    $('btnSaveTracking').addEventListener('click', saveTracking);
  }

  function createLabel() {
    api('/api/admin/orders/' + state.currentId + '/label', { method: 'POST', body: '{}' })
      .then(function (r) {
        var lbl = r.label || {};
        toast('Label created \u2014 ' + (lbl.carrier || '') + ' ' + (lbl.tracking_number || ''));
        return openOrder(state.currentId);
      }).then(loadOrders)
      .catch(function (err) { toast(err.message || 'Failed to create label'); });
  }

  function setStatus(status) {
    api('/api/admin/orders/' + state.currentId + '/status', { method: 'PUT', body: JSON.stringify({ status: status }) })
      .then(function () { toast('Status \u2192 ' + status); return openOrder(state.currentId); })
      .then(loadOrders)
      .catch(function (err) { toast(err.message || 'Failed to update status'); });
  }

  function saveTracking() {
    var body = {
      carrier: $('tfCarrier').value,
      tracking_number: $('tfTracking').value,
      shipping_label_url: $('tfLabel').value
    };
    api('/api/admin/orders/' + state.currentId + '/shipping', { method: 'PUT', body: JSON.stringify(body) })
      .then(function () { toast('Tracking saved'); return openOrder(state.currentId); })
      .then(loadOrders)
      .catch(function (err) { toast(err.message || 'Failed to save tracking'); });
  }

  function wire() {
    var search = $('adminSearch');
    var timer = null;
    search.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { state.search = search.value.trim(); loadOrders(); }, 300);
    });
    Array.prototype.forEach.call($('adminFilters').querySelectorAll('button'), function (btn) {
      btn.addEventListener('click', function () {
        Array.prototype.forEach.call($('adminFilters').querySelectorAll('button'), function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        state.filter = btn.getAttribute('data-filter') || '';
        loadOrders();
      });
    });
    var lb = $('adminLoginBtn');
    if (lb) lb.addEventListener('click', function () { window.location.href = 'account.html'; });

    var productSearch = $('productSearch');
    if (productSearch) {
      var pTimer = null;
      productSearch.addEventListener('input', function () {
        clearTimeout(pTimer);
        pTimer = setTimeout(function () {
          state.productSearch = productSearch.value.trim();
          renderProductTable();
        }, 250);
      });
    }

    var tabs = $('adminTabs');
    if (tabs) {
      Array.prototype.forEach.call(tabs.querySelectorAll('button[data-tab]'), function (btn) {
        btn.addEventListener('click', function () { switchTab(btn.getAttribute('data-tab')); });
      });
    }

    var addBtn = $('btnAddProduct');
    if (addBtn) addBtn.addEventListener('click', function () { openProductModal(null); });
    var addVariantBtn = $('btnAddVariant');
    if (addVariantBtn) addVariantBtn.addEventListener('click', addVariant);
    var modalClose = $('productModalClose');
    if (modalClose) modalClose.addEventListener('click', closeProductModal);
    var modalCancel = $('productModalCancel');
    if (modalCancel) modalCancel.addEventListener('click', closeProductModal);
    var productForm = $('productForm');
    if (productForm) {
      productForm.addEventListener('submit', saveProduct);
      var slugInput = productForm.elements.slug;
      var nameInput = productForm.elements.name;
      nameInput.addEventListener('input', function () {
        if (!slugInput.value.trim()) {
          slugInput.value = slugify(nameInput.value);
        }
      });
      slugInput.addEventListener('blur', function () {
        slugInput.value = slugify(slugInput.value);
      });
    }

    var modalWrap = $('productModalWrap');
    if (modalWrap) {
      modalWrap.addEventListener('click', function (evt) {
        if (evt.target === modalWrap) closeProductModal();
      });
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    wire();
    loadOrders();
  });
})();
