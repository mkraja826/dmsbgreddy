(() => {
  const CONFIG = window.DMS_CONFIG || {};
  const SUPABASE_URL = String(CONFIG.SUPABASE_URL || CONFIG.supabaseUrl || '').replace(/\/$/, '');
  const SUPABASE_ANON_KEY = String(CONFIG.SUPABASE_ANON_KEY || CONFIG.supabaseAnonKey || '');
  const SESSION_KEY = 'bg_reddy_dms_owner_session_v3';
  const BUTTON_ID = 'oc-overdue-treatment-filter';
  const PANEL_ID = 'oc-overdue-treatment-panel';
  const STYLE_ID = 'oc-overdue-treatment-styles';
  const EXCLUDED_STATUSES = new Set(['completed', 'done', 'cancelled', 'canceled', 'no_show']);
  const CACHE_MS = 30_000;

  let rows = [];
  let active = false;
  let loading = null;
  let lastLoadedAt = 0;
  let observed = false;

  function readSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    } catch {
      return null;
    }
  }

  function headers(extra = {}) {
    const token = readSession()?.access_token || SUPABASE_ANON_KEY;
    return {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...extra,
    };
  }

  function scheduleCard() {
    return Array.from(document.querySelectorAll('.oc-card')).find((card) =>
      card.querySelector('.oc-card-head h3')?.textContent?.trim().toLowerCase() === 'schedule board'
    ) || null;
  }

  function isOverdue(item) {
    const date = new Date(item?.appointment_time || 0);
    const status = String(item?.status || 'scheduled').toLowerCase();
    return !Number.isNaN(date.getTime()) && date.getTime() < Date.now() && !EXCLUDED_STATUSES.has(status);
  }

  function patient(item) {
    return Array.isArray(item?.patients) ? item.patients[0] : item?.patients || {};
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Date unavailable';
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function overdueDays(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 0;
    return Math.max(1, Math.ceil((Date.now() - date.getTime()) / 86_400_000));
  }

  function cleanPhone(value) {
    const digits = String(value || '').replace(/\D/g, '');
    if (!digits) return '';
    return digits.length === 10 ? `91${digits}` : digits;
  }

  function reminderUrl(item) {
    const details = patient(item);
    const phone = cleanPhone(details.phone || item.patient_phone);
    if (!phone) return '';
    const name = details.name || item.patient_name || 'Patient';
    const message = `Hello ${name}, your dental treatment appointment at Sri B.G Reddy Dental Clinic was scheduled for ${formatDate(item.appointment_time)} and is now overdue. Please contact the clinic to reschedule your treatment. Thank you.`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${BUTTON_ID} {
        color: #b42318;
        border-color: #fecdca;
        background: #fff7f6;
      }
      #${BUTTON_ID}.active {
        color: #fff;
        border-color: #d92d20;
        background: #d92d20;
      }
      #${BUTTON_ID} .oc-overdue-count {
        display: inline-grid;
        min-width: 20px;
        height: 20px;
        margin-left: 6px;
        padding: 0 6px;
        place-items: center;
        border-radius: 999px;
        background: rgba(217, 45, 32, .12);
        font-size: 11px;
        font-weight: 900;
      }
      #${BUTTON_ID}.active .oc-overdue-count { background: rgba(255,255,255,.22); }
      #${PANEL_ID} { margin-top: 14px; }
      #${PANEL_ID} .oc-overdue-summary {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
        padding: 14px 16px;
        border: 1px solid #fecdca;
        border-radius: 14px;
        background: #fef3f2;
        color: #912018;
      }
      #${PANEL_ID} .oc-overdue-summary strong { display: block; font-size: 14px; }
      #${PANEL_ID} .oc-overdue-summary span { display: block; margin-top: 3px; color: #b42318; font-size: 12px; }
      #${PANEL_ID} .oc-overdue-days { color: #b42318; font-weight: 900; }
      #${PANEL_ID} .oc-overdue-reminder {
        display: inline-flex;
        align-items: center;
        min-height: 34px;
        padding: 0 10px;
        border: 1px solid #abefc6;
        border-radius: 9px;
        background: #ecfdf3;
        color: #067647;
        font-size: 12px;
        font-weight: 850;
        text-decoration: none;
      }
      .oc-nav button [data-overdue-treatment-badge] {
        margin-left: auto;
        color: #fff;
        background: #d92d20;
      }
      @media (max-width: 720px) {
        #${PANEL_ID} .oc-overdue-summary { align-items: flex-start; flex-direction: column; }
      }
    `;
    document.head.appendChild(style);
  }

  async function fetchRows(force = false) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return [];
    if (!force && Date.now() - lastLoadedAt < CACHE_MS) return rows;
    if (loading) return loading;

    loading = (async () => {
      const query = new URLSearchParams({
        select: 'id,patient_id,appointment_time,status,notes,patients(id,name,phone,patient_code)',
        appointment_time: `lt.${new Date().toISOString()}`,
        order: 'appointment_time.desc',
        limit: '120',
      });
      const response = await fetch(`${SUPABASE_URL}/rest/v1/appointments?${query.toString()}`, {
        headers: headers(),
      });
      if (!response.ok) throw new Error(`Overdue appointments request failed (${response.status})`);
      const payload = await response.json();
      rows = (Array.isArray(payload) ? payload : []).filter(isOverdue);
      lastLoadedAt = Date.now();
      return rows;
    })().finally(() => {
      loading = null;
    });

    return loading;
  }

  function updateNavigationBadge() {
    const navButton = Array.from(document.querySelectorAll('.oc-nav button')).find((button) =>
      button.textContent.toLowerCase().includes('appointments')
    );
    if (!navButton) return;
    let badge = navButton.querySelector('[data-overdue-treatment-badge]');
    if (!rows.length) {
      badge?.remove();
      return;
    }
    if (!badge) {
      badge = document.createElement('em');
      badge.dataset.overdueTreatmentBadge = 'true';
      navButton.appendChild(badge);
    }
    const nextCount = String(rows.length);
    if (badge.textContent !== nextCount) badge.textContent = nextCount;
    badge.title = `${rows.length} overdue treatment appointment${rows.length === 1 ? '' : 's'}`;
  }

  function updateButtonLabel(button) {
    const nextCount = String(rows.length);
    if (button.dataset.overdueCount === nextCount) return;
    button.dataset.overdueCount = nextCount;
    button.innerHTML = `Overdue treatment <span class="oc-overdue-count">${rows.length}</span>`;
  }

  function statusClass(value) {
    const normalized = String(value || 'scheduled').toLowerCase();
    if (['waiting', 'checked_in', 'pending'].includes(normalized)) return 'amber';
    return 'red';
  }

  function createActionButton(label, className, handler) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    if (className) button.className = className;
    button.addEventListener('click', handler);
    return button;
  }

  async function patchStatus(item, status) {
    const id = item.id || item.appointment_id;
    if (!id) return;
    const response = await fetch(`${SUPABASE_URL}/rest/v1/appointments?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: headers({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      const message = await response.text().catch(() => '');
      throw new Error(message || `Appointment update failed (${response.status})`);
    }
    lastLoadedAt = 0;
    await fetchRows(true);
    ensure(true);
  }

  function renderPanel(card) {
    card.querySelector(`#${PANEL_ID}`)?.remove();
    const original = card.querySelector('.oc-table-wrap');
    if (!original) return;
    original.hidden = true;

    const panel = document.createElement('div');
    panel.id = PANEL_ID;

    const summary = document.createElement('div');
    summary.className = 'oc-overdue-summary';
    const copy = document.createElement('div');
    const heading = document.createElement('strong');
    heading.textContent = `${rows.length} overdue treatment appointment${rows.length === 1 ? '' : 's'}`;
    const description = document.createElement('span');
    description.textContent = 'Past appointments that are not completed, cancelled or marked as no-show.';
    copy.append(heading, description);
    const refresh = createActionButton('↻ Refresh overdue list', 'oc-secondary-button', async () => {
      refresh.disabled = true;
      try {
        await fetchRows(true);
        ensure(true);
      } catch (error) {
        window.alert(error.message || 'Overdue treatments could not be refreshed.');
      } finally {
        refresh.disabled = false;
      }
    });
    summary.append(copy, refresh);
    panel.appendChild(summary);

    if (!rows.length) {
      const empty = document.createElement('div');
      empty.className = 'oc-empty';
      empty.innerHTML = '<span>✓</span><strong>No overdue treatments</strong><p>There are no unfinished appointments before the current time.</p>';
      panel.appendChild(empty);
      original.before(panel);
      return;
    }

    const wrap = document.createElement('div');
    wrap.className = 'oc-table-wrap';
    const table = document.createElement('table');
    table.className = 'oc-table';
    table.innerHTML = '<thead><tr><th>Patient</th><th>Treatment date</th><th>Overdue</th><th>Status</th><th>Actions</th></tr></thead>';
    const body = document.createElement('tbody');

    rows.forEach((item) => {
      const details = patient(item);
      const row = document.createElement('tr');

      const patientCell = document.createElement('td');
      patientCell.dataset.label = 'Patient';
      const patientStrong = document.createElement('strong');
      patientStrong.textContent = details.name || item.patient_name || 'Patient';
      const patientSmall = document.createElement('small');
      patientSmall.textContent = details.phone || item.patient_phone || 'No phone';
      patientCell.append(patientStrong, patientSmall);

      const dateCell = document.createElement('td');
      dateCell.dataset.label = 'Treatment date';
      dateCell.textContent = formatDate(item.appointment_time);
      const notes = document.createElement('small');
      notes.textContent = item.notes || 'No treatment notes';
      dateCell.appendChild(notes);

      const daysCell = document.createElement('td');
      daysCell.dataset.label = 'Overdue';
      daysCell.className = 'oc-overdue-days';
      const days = overdueDays(item.appointment_time);
      daysCell.textContent = `${days} day${days === 1 ? '' : 's'}`;

      const statusCell = document.createElement('td');
      statusCell.dataset.label = 'Status';
      const status = document.createElement('span');
      status.className = `oc-status ${statusClass(item.status)}`;
      status.textContent = String(item.status || 'scheduled').replaceAll('_', ' ');
      statusCell.appendChild(status);

      const actionsCell = document.createElement('td');
      actionsCell.dataset.label = 'Actions';
      const actions = document.createElement('div');
      actions.className = 'oc-row-actions';
      const reminder = reminderUrl(item);
      if (reminder) {
        const link = document.createElement('a');
        link.className = 'oc-overdue-reminder';
        link.href = reminder;
        link.target = '_blank';
        link.rel = 'noreferrer';
        link.textContent = 'WhatsApp reminder';
        actions.appendChild(link);
      }
      actions.append(
        createActionButton('Complete', '', async (event) => {
          event.currentTarget.disabled = true;
          try { await patchStatus(item, 'completed'); }
          catch (error) { window.alert(error.message || 'Appointment could not be completed.'); }
        }),
        createActionButton('Cancel', 'danger', async (event) => {
          event.currentTarget.disabled = true;
          try { await patchStatus(item, 'cancelled'); }
          catch (error) { window.alert(error.message || 'Appointment could not be cancelled.'); }
        })
      );
      actionsCell.appendChild(actions);

      row.append(patientCell, dateCell, daysCell, statusCell, actionsCell);
      body.appendChild(row);
    });

    table.appendChild(body);
    wrap.appendChild(table);
    panel.appendChild(wrap);
    original.before(panel);
  }

  function deactivate(card) {
    active = false;
    const button = document.getElementById(BUTTON_ID);
    button?.classList.remove('active');
    card?.querySelector(`#${PANEL_ID}`)?.remove();
    const original = card?.querySelector('.oc-table-wrap');
    if (original) original.hidden = false;
  }

  async function activate(card, button) {
    active = true;
    card.querySelectorAll('.oc-filter-tabs button').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    const original = card.querySelector('.oc-table-wrap');
    if (original) original.hidden = true;

    let panel = card.querySelector(`#${PANEL_ID}`);
    if (!panel) {
      panel = document.createElement('div');
      panel.id = PANEL_ID;
      panel.innerHTML = '<div class="oc-empty"><span>…</span><strong>Loading overdue treatments</strong><p>Checking past unfinished appointments.</p></div>';
      original?.before(panel);
    }

    try {
      await fetchRows();
      if (active && scheduleCard() === card) renderPanel(card);
      updateButtonLabel(button);
      updateNavigationBadge();
    } catch (error) {
      panel.innerHTML = '';
      const alert = document.createElement('div');
      alert.className = 'oc-alert error';
      alert.textContent = error.message || 'Overdue treatments could not be loaded.';
      panel.appendChild(alert);
    }
  }

  function ensure(forceRender = false) {
    injectStyles();
    const card = scheduleCard();
    if (!card) return;
    const filters = card.querySelector('.oc-filter-tabs');
    if (!filters) return;

    let button = document.getElementById(BUTTON_ID);
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.id = BUTTON_ID;
      updateButtonLabel(button);
      button.addEventListener('click', () => activate(card, button));
      filters.appendChild(button);

      filters.addEventListener('click', (event) => {
        const clicked = event.target.closest('button');
        if (!clicked || clicked.id === BUTTON_ID) return;
        deactivate(card);
      });
    }

    if (active && (forceRender || !card.querySelector(`#${PANEL_ID}`))) renderPanel(card);

    fetchRows()
      .then(() => {
        updateButtonLabel(button);
        updateNavigationBadge();
        if (active && scheduleCard() === card && !card.querySelector(`#${PANEL_ID}`)) renderPanel(card);
      })
      .catch(() => {});
  }

  function init() {
    if (observed) return;
    observed = true;
    ensure();
    const observer = new MutationObserver(() => window.requestAnimationFrame(() => ensure()));
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('focus', () => {
      lastLoadedAt = 0;
      ensure(true);
    });
  }

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();