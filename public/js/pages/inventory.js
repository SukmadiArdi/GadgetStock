import { ProductsAPI, DashboardAPI } from '../api.js';
import { formatRupiah, getStockStatus, debounce, getHashParams, isManagerOrAbove } from '../utils.js';
import State from '../state.js';

let currentPage = Number.parseInt(localStorage.getItem('gs_inv_page'), 10) || 1;
const limit = 12;

window.debouncedSearchInv = debounce(() => {
  filterInventory();
}, 300);

window.filterInventory = () => {
  currentPage = 1;
  void loadInventory();
};

async function loadCategories() {
  try {
    const { products } = await ProductsAPI.list({ limit: 1000 });
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const select = document.getElementById('cat-filter');
    if (!select) return;
    const currentVal = select.value;
    select.innerHTML = '<option value="">All Categories</option>' + 
      categories.map(c => `<option value="${c}" ${c===currentVal?'selected':''}>${c}</option>`).join('');
  } catch (err) { console.error('Failed to load categories', err); }
}

function getStockColor(stock, stockMin) {
  if (stock === 0) return 'color:var(--error);';
  if (stock <= stockMin) return 'color:#b45309;';
  return '';
}

function renderInventoryRow(p, canManage) {
  const s = getStockStatus(p.stock, p.stock_min);
  const stockStyle = getStockColor(p.stock, p.stock_min);
  const imgHtml = p.image_url
    ? `<img src="${p.image_url}" alt="${p.name}" style="width:2.25rem;height:2.25rem;border-radius:0.375rem;object-fit:cover;background:var(--surface-container-low);border:1px solid var(--outline-variant);flex-shrink:0;" onerror="this.style.display='none';" />`
    : `<div style="width:2.25rem;height:2.25rem;border-radius:0.375rem;background:var(--surface-container-low);border:1px solid var(--outline-variant);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><span class="material-symbols-outlined" style="font-size:1.25rem;color:var(--outline);">devices</span></div>`;

  const actionCol = canManage
    ? `<td style="text-align:center;"><button class="btn btn-ghost btn-sm" onclick="navigate('/product-detail?id=${p.id}')" title="Edit"><span class="material-symbols-outlined" style="font-size:1.125rem;">edit</span></button></td>`
    : '';

  return `<tr>
    <td><span style="font-family:monospace;font-size:0.75rem;color:var(--on-surface-variant);">${p.sku}</span></td>
    <td style="font-weight:700;color:var(--text-blue);">${p.brand||'—'}</td>
    <td>
      <div style="display:flex;align-items:center;gap:0.75rem;">
        ${imgHtml}
        <span style="font-weight:600;">${p.name}</span>
      </div>
    </td>
    <td style="font-size:0.8125rem;color:var(--on-surface-variant);">${p.category||'—'}</td>
    <td style="text-align:right;font-weight:700;color:var(--text-blue);" class="text-rupiah">${formatRupiah(p.price_sell)}</td>
    <td style="text-align:center;"><span class="badge ${s.class}">${s.label}</span></td>
    <td style="text-align:right;font-weight:700;${stockStyle}">${p.stock}</td>
    ${actionCol}
  </tr>`;
}

function renderPagination(total, pageNum, limitNum) {
  const totalPages = Math.ceil(total / limitNum) || 1;
  const startItem = (pageNum - 1) * limitNum + 1;
  const endItem = Math.min(pageNum * limitNum, total);

  document.getElementById('pagination-info').textContent = `Showing ${startItem}–${endItem} of ${total} products`;
  const ctrl = document.getElementById('pagination-controls');
  ctrl.innerHTML = `
    <button class="page-btn" onclick="changePage(${pageNum - 1})" ${pageNum <= 1 ? 'disabled' : ''}>
      <span class="material-symbols-outlined" style="font-size:1.125rem;">chevron_left</span>
    </button>
    <span class="page-btn active">${pageNum}</span>
    <button class="page-btn" onclick="changePage(${pageNum + 1})" ${pageNum >= totalPages ? 'disabled' : ''}>
      <span class="material-symbols-outlined" style="font-size:1.125rem;">chevron_right</span>
    </button>
  `;
}

async function loadInventory() {
  localStorage.setItem('gs_inv_page', currentPage);
  const tbody = document.getElementById('inventory-tbody');
  tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:3rem;color:var(--on-surface-variant);">Loading...</td></tr>`;

  try {
    const cat    = document.getElementById('cat-filter')?.value;
    const status = document.getElementById('status-filter')?.value;
    const search = document.getElementById('search-filter')?.value;
    
    const params = { page: currentPage, limit, category: cat, status };
    if (search) params.search = search;
    const { products, pagination } = await ProductsAPI.list(params);

    if (!products.length && currentPage > 1) {
      currentPage = 1;
      return void loadInventory();
    }

    const canManage = isManagerOrAbove(State.currentUser);
    const colspan = canManage ? 8 : 7;

    if (!products.length) {
      tbody.innerHTML = `<tr><td colspan="${colspan}" style="text-align:center;padding:3rem;color:var(--outline);">No products found</td></tr>`;
      document.getElementById('inventory-pagination').style.display = 'none';
      return;
    }

    tbody.innerHTML = products.map(p => renderInventoryRow(p, canManage)).join('');

    const actionHeader = document.getElementById('inv-action-header');
    if (actionHeader) actionHeader.style.display = canManage ? '' : 'none';

    const addBtn = document.getElementById('btn-add-product');
    if (addBtn) addBtn.style.display = canManage ? '' : 'none';

    const pag = document.getElementById('inventory-pagination');
    pag.style.display = 'flex';
    
    const scrollArea = document.getElementById('inv-table-scroll');
    const savedScroll = sessionStorage.getItem('gs_inv_scroll');
    if (savedScroll && scrollArea) {
      setTimeout(() => { scrollArea.scrollTop = Number.parseInt(savedScroll, 10); }, 50);
    }
    renderPagination(pagination.total, currentPage, limit);

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--error);">${err.message}</td></tr>`;
  }
}

window.changePage = function(p) {
  currentPage = p;
  localStorage.setItem('gs_inv_page', p);
  void loadInventory();
};

window.clearFilters = function() {
  document.getElementById('search-filter').value = '';
  document.getElementById('cat-filter').value = '';
  document.getElementById('status-filter').value = '';
  currentPage = 1; 
  localStorage.setItem('gs_inv_page', 1);
  void loadInventory();
};

// Load dashboard stats for sidebar
DashboardAPI.getSummary().then(data => {
  document.getElementById('inv-value').textContent = formatRupiah(data.inventory.stock_value);
  document.getElementById('inv-low').textContent   = data.inventory.low_stock_count + ' Items';
  document.getElementById('inv-oos').textContent   = data.inventory.out_of_stock_count + ' Items';
}).catch(() => {});

// Initialize search from URL params if present
const params = getHashParams();
if (params.search) {
  const searchInput = document.getElementById('search-filter');
  if (searchInput) searchInput.value = decodeURIComponent(params.search);
}

void loadCategories();
void loadInventory();
