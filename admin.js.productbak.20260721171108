(function () {
  'use strict';

  var state = { filter: '', search: '', orders: [], statuses: [], currentId: null };

  function $(id) { return document.getElementById(id); }
  function money(n) { n = Number(n) || 0; return '$' + n.toFixed(2); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmtDate(d) { if (!d) return ''; try { return new Date(d).toLocaleString(); } catch (e) { return String(d); } }

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
  }

  document.addEventListener('DOMContentLoaded', function () {
    wire();
    loadOrders();
  });
})();
