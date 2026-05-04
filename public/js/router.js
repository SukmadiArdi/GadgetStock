// public/js/router.js - Hash-based SPA client-side router

const routes = {
  '/'               : '/pages/dashboard.html',
  '/dashboard'      : '/pages/dashboard.html',
  '/pos'            : '/pages/pos.html',
  '/checkout'       : '/pages/checkout.html',
  '/receipt'        : '/pages/receipt.html',
  '/inventory'      : '/pages/inventory.html',
  '/product-detail' : '/pages/product-detail.html',
  '/low-stock'      : '/pages/low-stock.html',
  '/sales-report'   : '/pages/sales-report.html',
  '/transactions'   : '/pages/transactions.html',
  '/analytics'      : '/pages/analytics.html'
};

const navMap = {
  '/dashboard'      : 'Dashboard',
  '/pos'            : 'POS',
  '/inventory'      : 'Inventory',
  '/product-detail' : 'Inventory',
  '/low-stock'      : 'Inventory',
  '/transactions'   : 'Transactions',
  '/sales-report'   : 'Reports',
  '/analytics'      : 'Analytics'
};

let currentPath = null;
let currentCleanup = null;

export function navigate(path) {
  window.location.hash = `#${path}`;
}

function getRoute() {
  const hash = window.location.hash || '#/';
  const full = hash.slice(1); // remove '#'
  const path = full.split('?')[0] || '/';
  return path;
}

async function render() {
  const path = getRoute();
  if (path === currentPath) return;
  currentPath = path;

  // Run cleanup of previous page
  if (typeof currentCleanup === 'function') { currentCleanup(); currentCleanup = null; }

  const filePath = routes[path] || routes['/'];
  const container = document.getElementById('page-content');

  // Loading skeleton
  container.innerHTML = `<div style="padding:2rem"><div class="skeleton" style="height:2rem;width:40%;margin-bottom:1rem;"></div><div class="skeleton" style="height:12rem;margin-bottom:1rem;"></div><div class="skeleton" style="height:8rem;"></div></div>`;

  try {
    const html = await fetch(filePath).then(r => r.text());
    container.innerHTML = html;
    container.querySelector('div, section')?.classList.add('fade-in');

    // Update active nav state
    updateNavActive(path);

    // Execute inline scripts
    container.querySelectorAll('script').forEach(oldScript => {
      const newScript = document.createElement('script');
      newScript.type = 'module';
      if (oldScript.src) { newScript.src = oldScript.src; }
      else { newScript.textContent = oldScript.textContent; }
      oldScript.replaceWith(newScript);
    });

    // Dispatch page:loaded event for page-specific init
    window.dispatchEvent(new CustomEvent('page:loaded', { detail: { path } }));

  } catch (err) {
    console.error('Router error:', err);
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:50vh;gap:1rem;">
        <span class="material-symbols-outlined" style="font-size:4rem;color:var(--outline)">error</span>
        <p style="font-weight:700;color:var(--on-surface)">Halaman tidak dapat dimuat</p>
        <button class="btn btn-primary btn-sm" onclick="navigate('/dashboard')">Kembali ke Dashboard</button>
      </div>`;
  }
}

function updateNavActive(path) {
  const activeLabel = navMap[path] || 'Dashboard';
  document.querySelectorAll('.nav-item').forEach(el => {
    const label = el.dataset.nav;
    el.classList.toggle('active', label === activeLabel);
  });
  document.querySelectorAll('.bottom-nav-item').forEach(el => {
    const label = el.dataset.nav;
    el.classList.toggle('active', label === activeLabel);
  });
}

export function initRouter() {
  window.addEventListener('hashchange', render);
  if (!window.location.hash) window.location.hash = '#/dashboard';
  render();
}

// Expose navigate globally for inline onclick usage
window.navigate = navigate;
