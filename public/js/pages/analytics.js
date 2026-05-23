import { ReportsAPI } from '/js/api.js';
import { formatRupiah, currentMonthISO } from '/js/utils.js';

document.getElementById('analytics-month').value = currentMonthISO();

let currentAnalyticsData = null;

async function loadAnalytics() {
  window.loadAnalytics = loadAnalytics;
  const month = document.getElementById('analytics-month').value || currentMonthISO();
  try {
    const data = await ReportsAPI.monthly(month);
    currentAnalyticsData = data;
    const { totalRevenue, totalOrders, avgOrder, revChangePct } = data.summary;

    document.getElementById('a-revenue').textContent = formatRupiah(totalRevenue);
    document.getElementById('a-orders').textContent  = totalOrders;
    document.getElementById('a-avg').textContent     = formatRupiah(avgOrder);

    const pct = revChangePct || 0;
    document.getElementById('a-rev-pct').textContent = `${pct >= 0 ? '+' : ''}${pct}% vs last month`;
    document.getElementById('a-rev-icon').textContent = pct >= 0 ? 'trending_up' : 'trending_down';
    document.getElementById('a-rev-icon').style.color = pct >= 0 ? '#4ade80' : '#f87171';

    // Daily chart
    const maxRev = Math.max(...data.daily.map(d=>d.revenue), 1);
    document.getElementById('last-day').textContent = data.daily.length;
    document.getElementById('daily-chart').innerHTML = data.daily.map(d => {
      const pct = Math.max(2, (d.revenue / maxRev) * 100);
      const isWeekend = (new Date(month + '-' + String(d.day).padStart(2,'0'))).getDay() % 6 === 0;
      const isActive = d.revenue > 0;
      return `<div title="Day ${d.day}: ${formatRupiah(d.revenue)}" 
        onclick="showToast('Day ${d.day}: ${formatRupiah(d.revenue)}', 'info', 2000)"
        style="flex:1; background:${isActive ? (isWeekend ? 'linear-gradient(to top, #64748b, #94a3b8)' : 'linear-gradient(to top, var(--primary-container), #3b82f6)') : 'var(--surface-container-high)'}; 
        border-radius:4px 4px 0 0; height:${pct}%; cursor:pointer; transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
        box-shadow: ${isActive ? '0 4px 12px rgba(59, 130, 246, 0.2)' : 'none'};"
        onmouseover="this.style.opacity='0.8'; this.style.transform='scaleY(1.02)'" 
        onmouseout="this.style.opacity='1'; this.style.transform='scaleY(1)'"></div>`;
    }).join('');

    // Top products
    const topDiv = document.getElementById('a-top-products');
    if (!data.topProducts.length) {
      topDiv.innerHTML = `<p style="color:var(--outline);font-size:0.875rem;">No sales data this month</p>`;
    } else {
      const maxRev2 = data.topProducts[0].revenue;
      const medals = ['🥇','🥈','🥉','4️⃣','5️⃣'];
      topDiv.innerHTML = data.topProducts.map((p,i) => `
        <div style="display:flex;align-items:center;gap:0.875rem;">
          <span style="font-size:1.25rem;">${medals[i]||i+1}</span>
          <div style="flex:1;">
            <div style="display:flex;justify-content:space-between;font-size:0.8125rem;margin-bottom:0.25rem;">
              <span style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:12rem;">${p.name}</span>
              <span style="font-weight:700;" class="text-rupiah">${formatRupiah(p.revenue)}</span>
            </div>
            <div style="height:0.375rem;background:var(--surface-container-high);border-radius:9999px;overflow:hidden;">
              <div style="height:100%;width:${Math.round(p.revenue/maxRev2*100)}%;background:${i===0?'#22c55e':i===1?'#3b82f6':i===2?'#f59e0b':'var(--primary-container)'};border-radius:9999px;"></div>
            </div>
            <span style="font-size:0.6875rem;color:var(--on-surface-variant);">${p.qty} units sold</span>
          </div>
        </div>`).join('');
    }
  } catch (err) {
    document.getElementById('a-revenue').textContent = 'Error';
    document.getElementById('a-top-products').innerHTML = `<p style="color:var(--error);">${err.message}</p>`;
  }
}

window.exportAnalyticsExcel = async function() {
  if (!currentAnalyticsData) return alert('No data to export');
  
  const btn = document.getElementById('btn-export-analytics');
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

    const wb = XLSX.utils.book_new();

    // Sheet 1: Daily Breakdown
    const dailyData = currentAnalyticsData.daily.map(d => ({
      'Date': `${document.getElementById('analytics-month').value}-${String(d.day).padStart(2,'0')}`,
      'Revenue (IDR)': d.revenue,
      'Orders': d.orders
    }));
    const wsDaily = XLSX.utils.json_to_sheet(dailyData);
    XLSX.utils.book_append_sheet(wb, wsDaily, "Daily Revenue");

    // Sheet 2: Top Products
    const productData = currentAnalyticsData.topProducts.map(p => ({
      'Product Name': p.name,
      'Quantity Sold': p.qty,
      'Revenue Generated (IDR)': p.revenue
    }));
    const wsProducts = XLSX.utils.json_to_sheet(productData);
    XLSX.utils.book_append_sheet(wb, wsProducts, "Top Products");

    XLSX.writeFile(wb, `Analytics_${document.getElementById('analytics-month').value}.xlsx`);
  } catch (err) {
    alert('Failed to export Excel');
  } finally {
    btn.innerHTML = oldHTML;
  }
};

loadAnalytics();
