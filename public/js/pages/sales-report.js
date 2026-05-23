import { ReportsAPI } from '/js/api.js';
import { formatRupiah, formatDate, todayISO } from '/js/utils.js';

document.getElementById('report-date').value = todayISO();

let currentReportData = null;

async function loadReport() {
  window.loadReport = loadReport;
  const date = document.getElementById('report-date').value || todayISO();
  try {
    const data = await ReportsAPI.daily(date);
    currentReportData = data;
    const { totalRevenue, totalOrders, avgOrderValue, totalItemsSold } = data.summary;

    document.getElementById('r-revenue').textContent = formatRupiah(totalRevenue);
    document.getElementById('r-orders').textContent  = totalOrders;
    document.getElementById('r-avg').textContent     = formatRupiah(avgOrderValue);
    document.getElementById('r-items').textContent   = totalItemsSold;

    // Hourly chart
    const maxRev = Math.max(...data.hourly.map(h=>h.revenue), 1);
    const peakHours = Array.from({length: 16}, (_, i) => i + 7); // 07:00 to 22:00
    const chartDiv = document.getElementById('hourly-chart');
    const labelDiv = document.getElementById('hour-labels');
    
    const filteredHours = data.hourly.filter(h => peakHours.includes(h.hour));
    
    chartDiv.innerHTML = filteredHours.map(h => {
      const pct = Math.max(0, (h.revenue / maxRev) * 100);
      const isActive = h.revenue > 0;
      const formatted = formatRupiah(h.revenue);
      return `<div title="${h.label}: ${formatted}" 
        onclick="showToast('${h.label}: ${formatted}', 'info', 2000)"
        style="flex:1; background:${isActive ? 'linear-gradient(to top, var(--primary-container), #3b82f6)' : 'var(--surface-container-high)'}; 
        border-radius:4px 4px 0 0; height:${pct}%; cursor:pointer; transition:all 0.3s ease;
        box-shadow: ${isActive ? '0 4px 10px rgba(59, 130, 246, 0.15)' : 'none'};"
        onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'"></div>`;
    }).join('');

    labelDiv.innerHTML = filteredHours.map((h, i) =>
      `<div style="flex:1;font-size:0.625rem;text-align:center;color:var(--on-surface-variant);font-weight:600;">${h.hour % 2 === 0 || i === 0 || i === filteredHours.length-1 ? h.hour : ''}</div>`
    ).join('');

    // Top products
    const topDiv = document.getElementById('top-products');
    if (!data.topProducts.length) { topDiv.innerHTML = `<p style="color:var(--outline);font-size:0.875rem;">No sales data</p>`; }
    else {
      const maxRev2 = data.topProducts[0].revenue;
      topDiv.innerHTML = data.topProducts.map((p,i) => `
        <div style="display:flex;align-items:center;gap:0.75rem;">
          <span style="font-size:0.75rem;font-weight:700;color:var(--on-surface-variant);width:1rem;text-align:center;">${i+1}</span>
          <div style="flex:1;">
            <div style="display:flex;justify-content:space-between;font-size:0.8125rem;margin-bottom:0.25rem;">
              <span style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:10rem;">${p.name}</span>
              <span style="font-weight:700;" class="text-rupiah">${formatRupiah(p.revenue)}</span>
            </div>
            <div style="height:0.375rem;background:var(--surface-container-high);border-radius:9999px;overflow:hidden;">
              <div style="height:100%;width:${(p.revenue/maxRev2*100).toFixed(0)}%;background:var(--primary-container);border-radius:9999px;"></div>
            </div>
          </div>
          <span style="font-size:0.75rem;color:var(--on-surface-variant);">×${p.qty}</span>
        </div>`).join('');
    }

    // Transactions table pagination
    const txnLimit = 5;
    let txnPage = 1;
    const methodIcons = { cash:'payments', qris:'qr_code_scanner', debit:'credit_card', credit:'credit_score' };

    window.renderTxnPage = (page) => {
      txnPage = page;
      const start = (txnPage - 1) * txnLimit;
      const end = start + txnLimit;
      const pageTxns = data.transactions.slice(start, end);
      const totalPages = Math.ceil(data.transactions.length / txnLimit);

      const tbody = document.getElementById('report-txn-tbody');
      tbody.innerHTML = pageTxns.map(t => {
        const items = (t.transaction_items||[]);
        const itemSummary = items.length > 0 ? `${items.length} item${items.length>1?'s':''}` : '—';
        const methodIcon  = methodIcons[t.payment_method] || 'payments';
        const statusColor = t.status === 'completed' ? '#15803d' : t.status === 'voided' ? 'var(--error)' : '#b45309';
        
        return `<tr>
          <td><span style="font-family:monospace;font-size:0.75rem;font-weight:700;color:var(--text-blue);">${t.txn_number}</span></td>
          <td style="font-size:0.8125rem;">${formatDate(t.created_at,'time')}</td>
          <td style="font-size:0.8125rem;">${t.customer_name||'Walk-in'}</td>
          <td style="font-size:0.8125rem;color:var(--on-surface-variant);text-align:center;">${itemSummary}</td>
          <td style="text-align:right;font-weight:700;" class="text-rupiah">${formatRupiah(t.total)}</td>
          <td>
            <div style="display:flex;align-items:center;gap:0.375rem;font-size:0.8125rem;text-transform:capitalize;">
              <span class="material-symbols-outlined" style="font-size:1rem;color:var(--on-surface-variant);">${methodIcon}</span>
              ${t.payment_method||'—'}
            </div>
          </td>
          <td style="text-align:center;">
            <span style="display:inline-flex;align-items:center;gap:0.25rem;font-size:0.6875rem;font-weight:700;text-transform:uppercase;color:${statusColor};background:${statusColor}15;padding:0.25rem 0.625rem;border-radius:var(--radius-full);">
              <span class="material-symbols-outlined" style="font-size:0.875rem;">${t.status==='completed'?'check_circle':t.status==='voided'?'cancel':'pending'}</span>
              ${t.status}
            </span>
          </td>
        </tr>`;
      }).join('');

      document.getElementById('report-pag-info').textContent = `Page ${txnPage} of ${totalPages}`;
      
      const pagCtrl = document.getElementById('report-pag-ctrl');
      const pagWrap = document.getElementById('report-pagination');
      
      if (totalPages > 1) {
        pagWrap.style.display = 'flex';
        pagCtrl.innerHTML = `
          <button class="page-btn" onclick="renderTxnPage(${txnPage-1})" ${txnPage<=1?'disabled':''}>
            <span class="material-symbols-outlined" style="font-size:1.125rem;">chevron_left</span>
          </button>
          <span class="page-btn active">${txnPage}</span>
          <button class="page-btn" onclick="renderTxnPage(${txnPage+1})" ${txnPage>=totalPages?'disabled':''}>
            <span class="material-symbols-outlined" style="font-size:1.125rem;">chevron_right</span>
          </button>`;
      } else {
        pagWrap.style.display = 'none';
      }
    };

    if (!data.transactions.length) {
      document.getElementById('report-txn-tbody').innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--outline);">No transactions on this date</td></tr>`;
      document.getElementById('report-pagination').style.display = 'none';
      document.getElementById('report-pag-info').textContent = '';
    } else {
      renderTxnPage(1);
    }
  } catch (err) {
    document.getElementById('r-revenue').textContent = formatRupiah(0);
    document.getElementById('report-txn-tbody').innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--error);">${err.message}</td></tr>`;
  }
}

window.exportExcel = async function() {
  if (!currentReportData || !currentReportData.transactions.length) return alert('No data to export');
  
  const btn = document.getElementById('btn-export-sales');
  const oldHTML = btn.innerHTML;
  btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:1rem;">hourglass_empty</span>Loading...`;
  
  try {
    if (!window.XLSX) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    const data = currentReportData.transactions.map(t => ({
      'TXN Number': t.txn_number,
      'Time': new Date(t.created_at).toLocaleTimeString('id-ID'),
      'Customer Name': t.customer_name || 'Walk-in',
      'Total Amount (IDR)': t.total,
      'Payment Method': (t.payment_method || '').toUpperCase()
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales");
    XLSX.writeFile(wb, `Sales_Report_${document.getElementById('report-date').value}.xlsx`);
  } catch (err) {
    alert('Failed to export Excel');
  } finally {
    btn.innerHTML = oldHTML;
  }
};

loadReport();
