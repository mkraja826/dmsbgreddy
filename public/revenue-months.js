(() => {
  const boxId = 'monthly-revenue-dashboard-widget';
  const sessionKey = 'bg_reddy_dms_owner_session_v3';
  let monthOffset = 0;
  let busy = false;

  const rupees = (n) => '₹' + Math.round(Number(n || 0)).toLocaleString('en-IN');
  const readSession = () => { try { return JSON.parse(localStorage.getItem(sessionKey) || 'null'); } catch { return null; } };
  const readConfig = () => {
    const c = window.DMS_CONFIG || {};
    return { url: String(c.SUPABASE_URL || c.supabaseUrl || '').replace(/\/$/, ''), key: String(c.SUPABASE_ANON_KEY || c.supabaseAnonKey || '') };
  };

  function currentMonth() {
    const today = new Date();
    const first = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const last = new Date(first.getFullYear(), first.getMonth() + 1, 1);
    const days = monthOffset === 0 ? Math.max(1, today.getDate()) : new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    return { first, last, days, label: first.toLocaleString('en-IN', { month: 'long', year: 'numeric' }), start: first.toISOString().slice(0, 10) };
  }

  function target() {
    return document.querySelector('.dashboard-grid') || document.querySelector('.control-panel-grid');
  }

  function ensureBox() {
    const grid = target();
    if (!grid) return null;
    let box = document.getElementById(boxId);
    if (!box) {
      box = document.createElement('section');
      box.id = boxId;
      grid.insertBefore(box, grid.firstChild);
    }
    box.style.cssText = 'grid-column:1/-1;border-radius:28px;padding:24px;background:linear-gradient(135deg,#052a5c,#0877df);color:white;box-shadow:0 22px 60px rgba(5,58,121,.22)';
    return box;
  }

  function paint(box, month, data, status) {
    const nextDisabled = monthOffset >= 0 ? 'disabled' : '';
    const nextOpacity = monthOffset >= 0 ? '.35' : '1';
    box.innerHTML = '<div style="display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap"><div><div style="font-size:12px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;opacity:.78;margin-bottom:8px">Monthly Revenue</div><div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><button type="button" data-month-revenue="-1" style="width:42px;height:42px;border-radius:999px;border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.14);color:white;font-size:22px;font-weight:900">&lt;</button><h3 style="margin:0;font-size:clamp(26px,4vw,44px);line-height:1;color:white">' + month.label + '</h3><button type="button" data-month-revenue="1" ' + nextDisabled + ' style="width:42px;height:42px;border-radius:999px;border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.14);color:white;font-size:22px;font-weight:900;opacity:' + nextOpacity + '">&gt;</button></div><p style="margin:8px 0 0;opacity:.78;line-height:1.6">' + status + '</p></div><div style="text-align:right;min-width:190px"><strong style="display:block;font-size:clamp(34px,5vw,58px);line-height:.95">' + rupees(data.total) + '</strong><span style="display:block;margin-top:8px;opacity:.75;font-weight:800">Total collected</span></div></div><div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:18px"><div style="border:1px solid rgba(255,255,255,.16);border-radius:18px;padding:16px;background:rgba(255,255,255,.12)"><small style="display:block;opacity:.74;font-weight:800">Payments</small><b>' + data.count + '</b></div><div style="border:1px solid rgba(255,255,255,.16);border-radius:18px;padding:16px;background:rgba(255,255,255,.12)"><small style="display:block;opacity:.74;font-weight:800">Avg / day</small><b>' + rupees(data.avg) + '</b></div><div style="border:1px solid rgba(255,255,255,.16);border-radius:18px;padding:16px;background:rgba(255,255,255,.12)"><small style="display:block;opacity:.74;font-weight:800">Best day</small><b>' + rupees(data.best) + '</b></div><div style="border:1px solid rgba(255,255,255,.16);border-radius:18px;padding:16px;background:rgba(255,255,255,.12)"><small style="display:block;opacity:.74;font-weight:800">Days</small><b>' + month.days + '</b></div></div>';
  }

  async function fetchRevenue(c, token, month) {
    const res = await fetch(c.url + '/rest/v1/rpc/get_owner_monthly_revenue', { method: 'POST', headers: { apikey: c.key, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ p_month_start: month.start }) });
    if (!res.ok) throw new Error('revenue ' + res.status);
    const rows = await res.json();
    const row = Array.isArray(rows) ? rows[0] : rows;
    return { total: Number(row?.total_amount || 0), count: Number(row?.payment_count || 0), avg: Number(row?.average_per_day || 0), best: Number(row?.best_day_amount || 0) };
  }

  async function load() {
    if (busy) return;
    const box = ensureBox();
    if (!box) return;
    busy = true;
    const month = currentMonth();
    paint(box, month, { total: 0, count: 0, avg: 0, best: 0 }, 'Loading revenue...');
    try {
      const c = readConfig();
      const s = readSession();
      if (!c.url || !c.key || !s?.access_token) throw new Error('login/config missing');
      const data = await fetchRevenue(c, s.access_token, month);
      paint(box, month, data, 'Use < and > to scroll between months.');
    } catch (e) {
      paint(box, month, { total: 0, count: 0, avg: 0, best: 0 }, 'Revenue error: ' + e.message);
    }
    busy = false;
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('#' + boxId + ' [data-month-revenue]');
    if (!b) return;
    e.preventDefault();
    monthOffset = Math.min(0, monthOffset + Number(b.getAttribute('data-month-revenue') || 0));
    load();
  });

  setInterval(() => {
    const grid = target();
    const card = document.getElementById(boxId);
    if (grid && !card && !busy) load();
  }, 700);
})();
