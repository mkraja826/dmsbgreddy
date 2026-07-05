(() => {
  const SESSION_KEY = 'bg_reddy_dms_owner_session_v3';
  const ID = 'monthly-revenue-dashboard-widget';
  let offset = 0;
  let loading = false;

  function session() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
  }

  function config() {
    const c = window.DMS_CONFIG || {};
    return {
      url: String(c.SUPABASE_URL || c.supabaseUrl || '').replace(/\/$/, ''),
      key: String(c.SUPABASE_ANON_KEY || c.supabaseAnonKey || '')
    };
  }

  function money(value) {
    return '₹' + Math.round(Number(value || 0)).toLocaleString('en-IN');
  }

  function range() {
    const now = new Date();
    const month = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const start = new Date(month.getFullYear(), month.getMonth(), 1);
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 1);
    const days = offset === 0 ? Math.max(1, now.getDate()) : new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return { start, end, days, label: month.toLocaleString('en-IN', { month: 'long', year: 'numeric' }) };
  }

  function grid() {
    return document.querySelector('.dashboard-grid') || document.querySelector('.control-panel-grid');
  }

  function mount() {
    const g = grid();
    if (!g) return null;
    let el = document.getElementById(ID);
    if (!el) {
      el = document.createElement('section');
      el.id = ID;
      g.insertBefore(el, g.firstChild);
    }
    el.style.cssText = 'grid-column:1/-1;border-radius:28px;padding:24px;background:linear-gradient(135deg,#052a5c,#0877df);color:#fff;box-shadow:0 22px 60px rgba(5,58,121,.22)';
    return el;
  }

  function html(state) {
    const nextDisabled = offset === 0 ? 'disabled' : '';
    return `<div style="display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap">
      <div>
        <div style="font-size:12px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;opacity:.78;margin-bottom:8px">₹ Monthly Revenue</div>
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <button type="button" data-rev-nav="-1" style="width:40px;height:40px;border-radius:999px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.14);color:#fff;font-size:22px;font-weight:900">&lt;</button>
          <h3 style="margin:0;font-size:clamp(26px,4vw,44px);line-height:1;color:#fff">${state.label}</h3>
          <button type="button" data-rev-nav="1" ${nextDisabled} style="width:40px;height:40px;border-radius:999px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.14);color:#fff;font-size:22px;font-weight:900;opacity:${offset === 0 ? '.35' : '1'}">&gt;</button>
        </div>
        <p style="margin:8px 0 0;opacity:.78;line-height:1.6">${state.status}</p>
      </div>
      <div style="text-align:right;min-width:180px"><strong style="display:block;font-size:clamp(32px,5vw,56px);line-height:.95">${money(state.total)}</strong><span style="display:block;margin-top:8px;opacity:.75;font-weight:800">Collected</span></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:18px">
      <div style="border:1px solid rgba(255,255,255,.16);border-radius:18px;padding:16px;background:rgba(255,255,255,.12)"><small style="display:block;opacity:.74;font-weight:800">Payments</small><b>${state.count}</b></div>
      <div style="border:1px solid rgba(255,255,255,.16);border-radius:18px;padding:16px;background:rgba(255,255,255,.12)"><small style="display:block;opacity:.74;font-weight:800">Avg / day</small><b>${money(state.avg)}</b></div>
      <div style="border:1px solid rgba(255,255,255,.16);border-radius:18px;padding:16px;background:rgba(255,255,255,.12)"><small style="display:block;opacity:.74;font-weight:800">Best day</small><b>${money(state.best)}</b></div>
      <div style="border:1px solid rgba(255,255,255,.16);border-radius:18px;padding:16px;background:rgba(255,255,255,.12)"><small style="display:block;opacity:.74;font-weight:800">Days counted</small><b>${state.days}</b></div>
    </div>`;
  }

  async function load() {
    if (loading) return;
    const el = mount();
    if (!el) return;
    loading = true;
    const r = range();
    el.innerHTML = html({ label: r.label, total: 0, count: 0, avg: 0, best: 0, days: r.days, status: 'Loading selected month...' });
    const c = config();
    const s = session();
    const token = s && s.access_token;
    if (!c.url || !c.key || !token) {
      el.innerHTML = html({ label: r.label, total: 0, count: 0, avg: 0, best: 0, days: r.days, status: 'Login and DMS config required.' });
      loading = false;
      return;
    }

    const params = new URLSearchParams({ select: 'amount,created_at', created_at: 'gte.' + r.start.toISOString(), order: 'created_at.asc', limit: '1000' });
    params.append('created_at', 'lt.' + r.end.toISOString());
    try {
      const res = await fetch(c.url + '/rest/v1/payments?' + params.toString(), { headers: { apikey: c.key, Authorization: 'Bearer ' + token, Accept: 'application/json' } });
      if (!res.ok) throw new Error('payments ' + res.status);
      const rows = await res.json();
      const byDay = new Map();
      const total = rows.reduce((sum, row) => {
        const amount = Number(row.amount || 0);
        const day = new Date(row.created_at).toISOString().slice(0, 10);
        byDay.set(day, (byDay.get(day) || 0) + amount);
        return sum + amount;
      }, 0);
      el.innerHTML = html({ label: r.label, total, count: rows.length, avg: total / r.days, best: Math.max(0, ...byDay.values()), days: r.days, status: 'Use < and > to move between months.' });
    } catch (e) {
      el.innerHTML = html({ label: r.label, total: 0, count: 0, avg: 0, best: 0, days: r.days, status: 'Could not load monthly revenue: ' + e.message });
    }
    loading = false;
  }

  document.addEventListener('click', (event) => {
    const btn = event.target.closest('#' + ID + ' [data-rev-nav]');
    if (!btn) return;
    event.preventDefault();
    event.stopPropagation();
    offset = Math.min(0, offset + Number(btn.getAttribute('data-rev-nav') || 0));
    load();
  });

  window.addEventListener('load', () => setTimeout(load, 600));
  window.addEventListener('hashchange', () => setTimeout(load, 600));
  setInterval(() => {
    if ((document.querySelector('.dashboard-grid') || document.querySelector('.control-panel-grid')) && !document.getElementById(ID)) load();
  }, 1000);
})();
