(function () {
  var toastTimer = null;

  function showToast(message) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove('show');
    }, 2600);
  }

  function setMessage(id, text, isError) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = text || '';
    el.classList.toggle('error', !!isError);
  }

  function apiBase() {
    if (typeof window !== 'undefined' && window.PEPX_API_BASE) {
      return String(window.PEPX_API_BASE).replace(/\/$/, '');
    }
    return '';
  }

  function api(path, options) {
    return fetch(apiBase() + path, Object.assign({ credentials: 'include' }, options || {})).then(function (res) {
      return res.json().catch(function () {
        return {};
      }).then(function (data) {
        if (!res.ok) throw new Error(data.error || 'Request failed');
        return data;
      });
    });
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function money(value) {
    return '$' + Number(value || 0).toFixed(2);
  }

  var state = {
    user: null,
    products: [],
    orders: [],
    editingId: null
  };

  function showDashboard(show) {
    document.getElementById('adminGate').classList.toggle('hidden', show);
    document.getElementById('adminDashboard').classList.toggle('hidden', !show);
  }

  function renderProducts() {
    var tbody = document.querySelector('#adminProductsTable tbody');
    if (!tbody) return;
    if (!state.products.length) {
      tbody.innerHTML = '<tr><td colspan="5">No products yet.</td></tr>';
      return;
    }
    tbody.innerHTML = state.products.map(function (product) {
      return '<tr>' +
        '<td>' + escapeHtml(product.name) + '<div class="admin-muted">' + escapeHtml(product.id) + '</div></td>' +
        '<td>' + money(product.price) + '</td>' +
        '<td>' + Number(product.inventory || 0) + '</td>' +
        '<td>' + escapeHtml(product.category || '—') + '</td>' +
        '<td class="admin-actions">' +
          '<button type="button" class="btn ghost" data-edit-product="' + escapeHtml(product.id) + '">Edit</button>' +
          '<button type="button" class="btn ghost" data-delete-product="' + escapeHtml(product.id) + '">Delete</button>' +
        '</td>' +
      '</tr>';
    }).join('');
  }

  function renderOrders() {
    var tbody = document.querySelector('#adminOrdersTable tbody');
    if (!tbody) return;
    if (!state.orders.length) {
      tbody.innerHTML = '<tr><td colspan="6">No orders yet.</td></tr>';
      return;
    }

    var statuses = ['Processing', 'Paid', 'Shipped', 'Completed', 'Cancelled', 'Refunded'];
    tbody.innerHTML = state.orders.map(function (order) {
      var options = statuses.map(function (status) {
        return '<option value="' + status + '"' + (order.status === status ? ' selected' : '') + '>' + status + '</option>';
      }).join('');
      var items = (order.items || []).map(function (item) {
        return escapeHtml(item.name) + ' × ' + item.quantity;
      }).join('<br>');
      return '<tr>' +
        '<td>' + escapeHtml(order.id.slice(0, 8)) + '…</td>' +
        '<td>' + escapeHtml(order.createdAt || '') + '</td>' +
        '<td>' + money(order.total) + '</td>' +
        '<td class="admin-muted">' + escapeHtml(order.stripePaymentId || '—') + '</td>' +
        '<td><select data-order-status="' + escapeHtml(order.id) + '">' + options + '</select></td>' +
        '<td>' + (items || '—') + '</td>' +
      '</tr>';
    }).join('');
  }

  function loadProducts() {
    return api('/api/products').then(function (data) {
      state.products = data.products || [];
      renderProducts();
    });
  }

  function loadOrders() {
    return api('/api/admin/orders').then(function (data) {
      state.orders = data.orders || [];
      renderOrders();
    });
  }

  function resetProductForm() {
    var form = document.getElementById('adminProductForm');
    state.editingId = null;
    form.reset();
    form.id.value = '';
    form.classList.add('hidden');
  }

  function fillProductForm(product) {
    var form = document.getElementById('adminProductForm');
    state.editingId = product.id;
    form.id.value = product.id;
    form.name.value = product.name || '';
    form.price.value = product.price || 0;
    form.inventory.value = product.inventory || 0;
    form.category.value = product.category || '';
    form.tag.value = product.tag || '';
    form.image.value = product.image || '';
    form.dosages.value = (product.dosages || []).join(', ');
    form.description.value = product.description || '';
    form.classList.remove('hidden');
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function bootstrap() {
    api('/api/auth/session').then(function (data) {
      state.user = data.user;
      if (data.user && data.user.isAdmin) {
        showDashboard(true);
        return Promise.all([loadProducts(), loadOrders()]);
      }
      showDashboard(false);
      if (data.user) {
        setMessage('adminGateMessage', 'This account is signed in but is not an admin.', true);
      }
    }).catch(function () {
      showDashboard(false);
    });
  }

  document.getElementById('adminLoginForm').addEventListener('submit', function (event) {
    event.preventDefault();
    var form = event.currentTarget;
    setMessage('adminGateMessage', 'Signing in…');
    api('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.email.value,
        password: form.password.value
      })
    }).then(function (data) {
      if (!data.user || !data.user.isAdmin) {
        setMessage('adminGateMessage', 'Login succeeded, but this user is not an admin. Set ADMIN_EMAIL to this address and restart migrations/server.', true);
        return;
      }
      state.user = data.user;
      showDashboard(true);
      setMessage('adminGateMessage', '');
      showToast('Admin signed in');
      return Promise.all([loadProducts(), loadOrders()]);
    }).catch(function (err) {
      setMessage('adminGateMessage', err.message || 'Login failed', true);
    });
  });

  document.getElementById('adminLogoutBtn').addEventListener('click', function () {
    api('/api/auth/logout', { method: 'POST' }).then(function () {
      state.user = null;
      showDashboard(false);
      showToast('Signed out');
    });
  });

  document.querySelectorAll('[data-admin-tab]').forEach(function (tab) {
    tab.addEventListener('click', function () {
      var name = tab.getAttribute('data-admin-tab');
      document.querySelectorAll('[data-admin-tab]').forEach(function (item) {
        item.classList.toggle('active', item === tab);
      });
      document.getElementById('adminProductsPanel').classList.toggle('hidden', name !== 'products');
      document.getElementById('adminOrdersPanel').classList.toggle('hidden', name !== 'orders');
    });
  });

  document.getElementById('adminNewProductBtn').addEventListener('click', function () {
    resetProductForm();
    document.getElementById('adminProductForm').classList.remove('hidden');
  });

  document.getElementById('adminCancelProductBtn').addEventListener('click', resetProductForm);

  document.getElementById('adminProductForm').addEventListener('submit', function (event) {
    event.preventDefault();
    var form = event.currentTarget;
    var payload = {
      name: form.name.value,
      price: form.price.value,
      inventory: form.inventory.value,
      category: form.category.value,
      tag: form.tag.value,
      image: form.image.value,
      dosages: form.dosages.value,
      description: form.description.value
    };

    var editingId = state.editingId;
    var request = editingId
      ? api('/api/products/' + encodeURIComponent(editingId), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      : api('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

    request.then(function () {
      setMessage('adminMessage', editingId ? 'Product updated.' : 'Product created.');
      resetProductForm();
      return loadProducts();
    }).catch(function (err) {
      setMessage('adminMessage', err.message || 'Save failed', true);
    });
  });

  document.querySelector('#adminProductsTable').addEventListener('click', function (event) {
    var editId = event.target.getAttribute('data-edit-product');
    var deleteId = event.target.getAttribute('data-delete-product');

    if (editId) {
      var product = state.products.find(function (item) { return item.id === editId; });
      if (product) fillProductForm(product);
      return;
    }

    if (deleteId) {
      if (!window.confirm('Delete this product?')) return;
      api('/api/products/' + encodeURIComponent(deleteId), { method: 'DELETE' })
        .then(function () {
          showToast('Product deleted');
          return loadProducts();
        })
        .catch(function (err) {
          setMessage('adminMessage', err.message || 'Delete failed', true);
        });
    }
  });

  document.querySelector('#adminOrdersTable').addEventListener('change', function (event) {
    var orderId = event.target.getAttribute('data-order-status');
    if (!orderId) return;
    api('/api/admin/orders/' + encodeURIComponent(orderId) + '/status', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: event.target.value })
    }).then(function () {
      showToast('Order status updated');
      return loadOrders();
    }).catch(function (err) {
      setMessage('adminMessage', err.message || 'Status update failed', true);
      loadOrders();
    });
  });

  bootstrap();
})();
