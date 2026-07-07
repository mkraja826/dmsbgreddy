(() => {
  const boxId = 'monthly-revenue-dashboard-widget';
  const sessionKey = 'bg_reddy_dms_owner_session_v3';
  let monthOffset = 0;
  let busy = false;
  let lastLoadAt = 0;
  let initialized = false;
  let intervalId = 0;

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
    const shell = document.querySelector('.portal-shell');
    if (!shell) return null;
    const loggedInDashboard = shell.querySelector('.portal-tabs, .control-panel-grid, .dashboard-grid');
    if (!loggedInDashboard) return null;
    return shell;
  }

  function anchor() {
    return document.querySelector('.portal-tabs') || document.querySelector('.success-box')?.nextSibling || document.querySelector('.loading-panel');
  }

  function ensureBox() {
    const shell = target();
    if (!shell) return null;
    let box = document.getElementById(boxId);
    if (!box) {
      box = document.createElement('section');
      box.id = boxId;
    }
    if (box.parentElement !== shell) {
      const before = anchor();
      shell.insertBefore(box, before || null);
    }
    box.style.cssText = 'width:100%;box-sizing:border-box;border-radius:28px;padding:24px;background:linear-gradient(135deg,#052a5c,#0877df);color:white;box-shadow:0 22px 60px rgba(5,58,121,.22);margin:18px 0 20px;position:relative;z-index:1';
    return box;
  }

  function paint(box, month, data, status) {
    const nextDisabled = monthOffset >= 0 ? 'disabled' : '';
    const nextOpacity = monthOffset >= 0 ? '.35' : '1';
    box.innerHTML = '<div style="display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap"><div><div style="font-size:12px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;opacity:.78;margin-bottom:8px">Monthly Revenue</div><div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><button type="button" aria-label="Previous month" data-month-revenue="-1" style="width:42px;height:42px;border-radius:999px;border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.14);color:white;font-size:22px;font-weight:900">&lt;</button><h3 style="margin:0;font-size:clamp(26px,4vw,44px);line-height:1;color:white">' + month.label + '</h3><button type="button" aria-label="Next month" data-month-revenue="1" ' + nextDisabled + ' style="width:42px;height:42px;border-radius:999px;border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.14);color:white;font-size:22px;font-weight:900;opacity:' + nextOpacity + '">&gt;</button></div><p style="margin:8px 0 0;opacity:.78;line-height:1.6">' + status + '</p></div><div style="text-align:right;min-width:190px"><strong style="display:block;font-size:clamp(34px,5vw,58px);line-height:.95">' + rupees(data.total) + '</strong><span style="display:block;margin-top:8px;opacity:.75;font-weight:800">Total collected</span></div></div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-top:18px"><div style="border:1px solid rgba(255,255,255,.16);border-radius:18px;padding:16px;background:rgba(255,255,255,.12)"><small style="display:block;opacity:.74;font-weight:800">Payments</small><b>' + data.count + '</b></div><div style="border:1px solid rgba(255,255,255,.16);border-radius:18px;padding:16px;background:rgba(255,255,255,.12)"><small style="display:block;opacity:.74;font-weight:800">Avg / day</small><b>' + rupees(data.avg) + '</b></div><div style="border:1px solid rgba(255,255,255,.16);border-radius:18px;padding:16px;background:rgba(255,255,255,.12)"><small style="display:block;opacity:.74;font-weight:800">Best day</small><b>' + rupees(data.best) + '</b></div><div style="border:1px solid rgba(255,255,255,.16);border-radius:18px;padding:16px;background:rgba(255,255,255,.12)"><small style="display:block;opacity:.74;font-weight:800">Days</small><b>' + month.days + '</b></div></div>';
  }

  async function fetchRevenue(c, token, month) {
    const res = await fetch(c.url + '/rest/v1/rpc/get_owner_monthly_revenue', { method: 'POST', headers: { apikey: c.key, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ p_month_start: month.start }) });
    if (!res.ok) throw new Error('revenue ' + res.status);
    const rows = await res.json();
    const row = Array.isArray(rows) ? rows[0] : rows;
    return { total: Number(row?.total_amount || 0), count: Number(row?.payment_count || 0), avg: Number(row?.average_per_day || 0), best: Number(row?.best_day_amount || 0) };
  }

  async function load(force = false) {
    const now = Date.now();
    if (busy) return;
    if (!force && now - lastLoadAt < 1200) {
      ensureBox();
      return;
    }
    const box = ensureBox();
    if (!box) return;
    busy = true;
    lastLoadAt = now;
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
    } finally {
      busy = false;
    }
  }

  function scheduleLoad(force = false) { window.requestAnimationFrame(() => load(force)); }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('#' + boxId + ' [data-month-revenue]');
    if (b) {
      e.preventDefault();
      monthOffset = Math.min(0, monthOffset + Number(b.getAttribute('data-month-revenue') || 0));
      scheduleLoad(true);
      return;
    }
    if (e.target.closest('.portal-tabs button, .portal-actions button, .control-card button, .shortcut-grid button')) {
      setTimeout(() => scheduleLoad(false), 80);
    }
  });

  window.addEventListener('focus', () => scheduleLoad(false));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) scheduleLoad(false); });
  const observer = new MutationObserver(() => scheduleLoad(false));

  function init() {
    if (initialized) return;
    initialized = true;
    scheduleLoad(true);
    if (document.body) observer.observe(document.body, { childList: true, subtree: true });
    intervalId = window.setInterval(() => {
      const shell = target();
      const card = document.getElementById(boxId);
      if (shell && (!card || card.parentElement !== shell) && !busy) scheduleLoad(false);
      if (!shell && card) card.remove();
    }, 1500);
  }

  if (document.readyState === 'loading') window.addEventListener('load', init, { once: true });
  else init();
})();

(() => {
  const PAGE_SIZE = 10;
  let currentPage = 0;
  let lastSignature = '';
  let applying = false;

  function directoryCard() {
    return Array.from(document.querySelectorAll('.portal-card.full-card')).find((card) => {
      const title = card.querySelector('.card-title h3')?.textContent?.trim().toLowerCase() || '';
      return title === 'patient directory';
    });
  }

  function pillButton(label, disabled, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.disabled = disabled;
    button.style.cssText = 'border:1px solid #d8e7f3;border-radius:999px;padding:8px 12px;font-weight:800;background:' + (disabled ? '#f4f8fb' : '#fff') + ';color:' + (disabled ? '#94a3b8' : '#064e7a') + ';cursor:' + (disabled ? 'not-allowed' : 'pointer');
    button.addEventListener('click', onClick);
    return button;
  }

  function applyPatientPagination() {
    if (applying) return;
    const card = directoryCard();
    const list = card?.querySelector('.table-list');
    if (!card || !list) return;

    const rows = Array.from(list.querySelectorAll('.patient-row'));
    const old = card.querySelector('.patient-pagination');
    if (!rows.length) {
      old?.remove();
      return;
    }

    const signature = rows.map((row) => row.textContent?.slice(0, 100) || '').join('|');
    if (signature !== lastSignature) {
      currentPage = 0;
      lastSignature = signature;
    }

    const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    currentPage = Math.min(currentPage, totalPages - 1);
    const start = currentPage * PAGE_SIZE;
    const end = start + PAGE_SIZE;

    rows.forEach((row, index) => {
      row.style.display = index >= start && index < end ? '' : 'none';
    });

    applying = true;
    old?.remove();
    const controls = document.createElement('div');
    controls.className = 'patient-pagination';
    controls.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:14px;padding:12px;border:1px solid #e3edf5;border-radius:16px;background:#f8fbfe';
    const info = document.createElement('span');
    info.textContent = 'Showing ' + (start + 1) + '-' + Math.min(end, rows.length) + ' of ' + rows.length + ' patients';
    info.style.cssText = 'color:#476579;font-weight:800;font-size:13px';
    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:8px';
    actions.append(
      pillButton('Previous', currentPage === 0, () => { currentPage = Math.max(0, currentPage - 1); applyPatientPagination(); card.scrollIntoView({ behavior: 'smooth', block: 'start' }); }),
      pillButton('Next', currentPage >= totalPages - 1, () => { currentPage = Math.min(totalPages - 1, currentPage + 1); applyPatientPagination(); card.scrollIntoView({ behavior: 'smooth', block: 'start' }); })
    );
    controls.append(info, actions);
    list.after(controls);
    applying = false;
  }

  const observer = new MutationObserver(() => window.requestAnimationFrame(applyPatientPagination));
  if (document.body) observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  document.addEventListener('click', (event) => {
    if (event.target.closest('.portal-tabs button, .portal-search button')) setTimeout(applyPatientPagination, 180);
  });
  window.setInterval(applyPatientPagination, 1000);
})();
