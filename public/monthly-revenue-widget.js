(() => {
  const SESSION_KEY = 'bg_reddy_dms_owner_session_v3';
  const WIDGET_ID = 'monthly-revenue-dashboard-widget';
  const STYLE_ID = 'monthly-revenue-dashboard-style';

  function readSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    } catch {
      return null;
    }
  }

  function readConfig() {
    const config = window.DMS_CONFIG || {};
    const url = String(config.SUPABASE_URL || config.supabaseUrl || '').replace(/\/$/, '');
    const key = String(config.SUPABASE_ANON_KEY || config.supabaseAnonKey || '');
    return { url, key };
  }

  function monthRange() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
    return { start, end, now };
  }

  function formatMoney(value) {
    return `₹${Math.round(Number(value || 0)).toLocaleString('en-IN')}`;
  }

  function monthLabel(date) {
    return date.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${WIDGET_ID} {
        grid-column: 1 / -1;
        border: 1px solid rgba(8, 119, 223, 0.18);
        border-radius: 28px;
        padding: 24px;
        background: linear-gradient(135deg, #052a5c, #0877df);
        color: #ffffff;
        box-shadow: 0 22px 60px rgba(5, 58, 121, 0.22);
      }
      #${WIDGET_ID} .monthly-revenue-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 18px;
      }
      #${WIDGET_ID} .monthly-revenue-kicker {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
        font-size: 12px;
        font-weight: 900;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: rgba(255,255,255,0.78);
      }
      #${WIDGET_ID} h3 {
        margin: 0;
        font-size: clamp(26px, 4vw, 44px);
        line-height: 1;
        letter-spacing: -0.04em;
        color: #ffffff;
      }
      #${WIDGET_ID} p {
        margin: 8px 0 0;
        color: rgba(255,255,255,0.78);
        line-height: 1.6;
      }
      #${WIDGET_ID} .monthly-revenue-total {
        min-width: 180px;
        text-align: right;
      }
      #${WIDGET_ID} .monthly-revenue-total strong {
        display: block;
        font-size: clamp(32px, 5vw, 56px);
        line-height: 0.95;
        letter-spacing: -0.05em;
      }
      #${WIDGET_ID} .monthly-revenue-total span {
        display: block;
        margin-top: 8px;
        color: rgba(255,255,255,0.75);
        font-weight: 800;
      }
      #${WIDGET_ID} .monthly-revenue-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
      }
      #${WIDGET_ID} .monthly-revenue-mini {
        border: 1px solid rgba(255,255,255,0.16);
        border-radius: 18px;
        padding: 16px;
        background: rgba(255,255,255,0.12);
      }
      #${WIDGET_ID} .monthly-revenue-mini small,
      #${WIDGET_ID} .monthly-revenue-mini b {
        display: block;
      }
      #${WIDGET_ID} .monthly-revenue-mini small {
        color: rgba(255,255,255,0.74);
        font-weight: 800;
        margin-bottom: 7px;
      }
      #${WIDGET_ID} .monthly-revenue-mini b {
        color: #ffffff;
        font-size: 20px;
      }
      @media (max-width: 760px) {
        #${WIDGET_ID} {
          border-radius: 22px;
          padding: 20px;
        }
        #${WIDGET_ID} .monthly-revenue-head {
          display: block;
        }
        #${WIDGET_ID} .monthly-revenue-total {
          margin-top: 18px;
          text-align: left;
        }
        #${WIDGET_ID} .monthly-revenue-grid {
          grid-template-columns: 1fr 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function getTargetGrid() {
    return document.querySelector('.dashboard-grid') || document.querySelector('.control-panel-grid');
  }

  function ensureWidget() {
    const grid = getTargetGrid();
    if (!grid) return null;

    let widget = document.getElementById(WIDGET_ID);
    if (!widget) {
      widget = document.createElement('section');
      widget.id = WIDGET_ID;
      widget.setAttribute('aria-label', 'Monthly revenue dashboard section');
      grid.insertBefore(widget, grid.firstChild);
    }

    return widget;
  }

  function render(widget, state) {
    const { label, revenue, count, daysElapsed, averagePerDay, bestDay, status } = state;
    widget.innerHTML = `
      <div class="monthly-revenue-head">
        <div>
          <span class="monthly-revenue-kicker">₹ Monthly Revenue</span>
          <h3>${label}</h3>
          <p>${status}</p>
        </div>
        <div class="monthly-revenue-total">
          <strong>${formatMoney(revenue)}</strong>
          <span>Collected this month</span>
        </div>
      </div>
      <div class="monthly-revenue-grid">
        <div class="monthly-revenue-mini"><small>Payments</small><b>${count}</b></div>
        <div class="monthly-revenue-mini"><small>Avg / day</small><b>${formatMoney(averagePerDay)}</b></div>
        <div class="monthly-revenue-mini"><small>Best day</small><b>${formatMoney(bestDay)}</b></div>
        <div class="monthly-revenue-mini"><small>Days counted</small><b>${daysElapsed}</b></div>
      </div>
    `;
  }

  async function loadMonthlyRevenue() {
    const widget = ensureWidget();
    if (!widget) return;

    injectStyles();
    const { start, end, now } = monthRange();
    const label = monthLabel(now);
    render(widget, {
      label,
      revenue: 0,
      count: 0,
      daysElapsed: now.getDate(),
      averagePerDay: 0,
      bestDay: 0,
      status: 'Loading monthly collection from clinic records...',
    });

    const config = readConfig();
    const session = readSession();
    const token = session?.access_token || '';

    if (!config.url || !config.key || !token) {
      render(widget, {
        label,
        revenue: 0,
        count: 0,
        daysElapsed: now.getDate(),
        averagePerDay: 0,
        bestDay: 0,
        status: 'Monthly revenue appears after owner login and DMS config are available.',
      });
      return;
    }

    const params = new URLSearchParams({
      select: 'amount,created_at',
      created_at: `gte.${start.toISOString()}`,
      order: 'created_at.asc',
      limit: '1000',
    });
    params.append('created_at', `lt.${end.toISOString()}`);

    try {
      const response = await fetch(`${config.url}/rest/v1/payments?${params.toString()}`, {
        headers: {
          apikey: config.key,
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) throw new Error(`Payments request failed ${response.status}`);

      const rows = await response.json();
      const byDay = new Map();
      const revenue = rows.reduce((total, row) => {
        const amount = Number(row.amount || 0);
        const day = new Date(row.created_at).toISOString().slice(0, 10);
        byDay.set(day, (byDay.get(day) || 0) + amount);
        return total + amount;
      }, 0);
      const daysElapsed = Math.max(1, now.getDate());
      const averagePerDay = revenue / daysElapsed;
      const bestDay = Math.max(0, ...byDay.values());

      render(widget, {
        label,
        revenue,
        count: rows.length,
        daysElapsed,
        averagePerDay,
        bestDay,
        status: 'Month-to-date collection from payments table. Pending dues are shown separately in the dashboard.',
      });
    } catch (error) {
      render(widget, {
        label,
        revenue: 0,
        count: 0,
        daysElapsed: now.getDate(),
        averagePerDay: 0,
        bestDay: 0,
        status: `Monthly revenue could not load: ${error.message}`,
      });
    }
  }

  let lastRun = 0;
  function scheduleLoad() {
    const now = Date.now();
    if (now - lastRun < 1500) return;
    lastRun = now;
    window.setTimeout(loadMonthlyRevenue, 250);
  }

  window.addEventListener('load', scheduleLoad);
  window.addEventListener('hashchange', scheduleLoad);
  document.addEventListener('click', () => window.setTimeout(scheduleLoad, 400));

  const observer = new MutationObserver(() => scheduleLoad());
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
