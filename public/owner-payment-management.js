(() => {
  const SESSION_KEY = 'bg_reddy_dms_owner_session_v3';
  const ROOT_ID = 'owner-payment-management';
  const STYLE_ID = 'owner-payment-management-style';
  const METHODS = ['cash', 'upi', 'card', 'bank_transfer', 'other'];

  function config() {
    const runtime = window.DMS_CONFIG || {};
    return {
      url: String(runtime.SUPABASE_URL || runtime.supabaseUrl || '').replace(/\/$/, ''),
      key: String(runtime.SUPABASE_ANON_KEY || runtime.supabaseAnonKey || ''),
    };
  }

  function session() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  }

  function money(value) {
    return `₹${Math.round(Number(value || 0)).toLocaleString('en-IN')}`;
  }

  function dateTime(value) {
    if (!value) return 'Not set';
    return new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  }

  async function rest(path, options = {}) {
    const { url, key } = config();
    const auth = session();
    if (!url || !key || !auth?.access_token) throw new Error('Owner session or DMS configuration is missing.');
    const response = await fetch(`${url}/rest/v1/${path}`, {
      method: options.method || 'GET',
      headers: {
        apikey: key,
        Authorization: `Bearer ${auth.access_token}`,
        'Content-Type': 'application/json',
        Prefer: options.prefer || 'return=representation',
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) throw new Error(data?.message || data?.details || `Payment request failed (${response.status})`);
    return data;
  }

  async function loadContext() {
    const auth = session();
    const userId = auth?.user?.id;
    const profiles = await rest(`profiles?select=id,clinic_id,role&event_id=neq.null&id=eq.${encodeURIComponent(userId)}&limit=1`).catch(() =>
      rest(`profiles?select=id,clinic_id,role&id=eq.${encodeURIComponent(userId)}&limit=1`)
    );
    const profile = profiles?.[0];
    if (!profile?.clinic_id) throw new Error('Clinic owner profile is incomplete.');
    const [patients, invoices, payments] = await Promise.all([
      rest(`patients?select=id,name,phone,patient_code&clinic_id=eq.${profile.clinic_id}&order=name.asc&limit=1000`),
      rest(`invoices?select=*&clinic_id=eq.${profile.clinic_id}&order=created_at.desc&limit=1000`),
      rest(`payments?select=*&clinic_id=eq.${profile.clinic_id}&order=created_at.desc&limit=1000`),
    ]);
    return { profile, patients: patients || [], invoices: invoices || [], payments: payments || [] };
  }

  function invoiceDue(invoice) {
    return Math.max(Number(invoice?.due_amount ?? (Number(invoice?.total_amount || 0) - Number(invoice?.paid_amount || 0))), 0);
  }

  function patientDue(context, patientId) {
    return context.invoices.filter((row) => row.patient_id === patientId).reduce((sum, row) => sum + invoiceDue(row), 0);
  }

  function patientLabel(patient, context) {
    const details = [patient.phone, patient.patient_code].filter(Boolean).join(' • ');
    return `${patient.name || 'Patient'}${details ? ` • ${details}` : ''} • Due ${money(patientDue(context, patient.id))}`;
  }

  function render(root, context) {
    const patientOptions = context.patients.map((patient) => `<option value="${escapeHtml(patient.id)}">${escapeHtml(patientLabel(patient, context))}</option>`).join('');
    const rows = context.payments.slice(0, 100).map((payment) => {
      const patient = context.patients.find((item) => item.id === payment.patient_id) || {};
      return `<tr>
        <td><strong>${escapeHtml(patient.name || 'Patient')}</strong><small>${escapeHtml(patient.phone || patient.patient_code || '')}</small></td>
        <td><strong>${money(payment.amount)}</strong><small>${escapeHtml(String(payment.payment_method || 'Not recorded').replaceAll('_', ' '))}</small></td>
        <td>${dateTime(payment.created_at)}</td>
        <td><small>${escapeHtml(payment.notes || 'No notes')}</small></td>
        <td><button type="button" class="opm-edit" data-payment-id="${escapeHtml(payment.id)}">Correct</button></td>
      </tr>`;
    }).join('');

    root.innerHTML = `
      <section class="opm-card">
        <div class="opm-head"><div><span>Owner payment controls</span><h2>Record or correct a payment</h2><p>Every payment remains linked to an existing patient and invoice.</p></div><button type="button" class="opm-primary" id="opm-new">+ Record payment</button></div>
        <div id="opm-message" class="opm-message" hidden></div>
        <form id="opm-form" class="opm-form" hidden>
          <input type="hidden" name="payment_id" />
          <div class="opm-grid">
            <label>Patient<select name="patient_id" required><option value="">Choose patient</option>${patientOptions}</select></label>
            <label>Invoice<select name="invoice_id"><option value="">Apply without invoice</option></select></label>
            <label>Amount received<input name="amount" type="number" min="0.01" step="0.01" required /></label>
            <label>Payment method<select name="payment_method">${METHODS.map((method) => `<option value="${method}">${method.replaceAll('_', ' ')}</option>`).join('')}</select></label>
            <label>Payment date and time<input name="created_at" type="datetime-local" required /></label>
            <label>Reference number<input name="reference_number" maxlength="100" placeholder="UPI, card or bank reference" /></label>
          </div>
          <label>Notes<textarea name="notes" rows="2" maxlength="500" placeholder="Optional payment note"></textarea></label>
          <label id="opm-reason-wrap" hidden>Correction reason<textarea name="correction_reason" rows="2" maxlength="300" placeholder="Required when correcting a payment"></textarea></label>
          <div class="opm-summary" id="opm-summary">Select a patient to see pending balance.</div>
          <div class="opm-actions"><button class="opm-primary" type="submit">Save payment</button><button type="button" id="opm-cancel">Cancel</button></div>
        </form>
      </section>
      <section class="opm-card">
        <div class="opm-register-head"><div><h3>Payment register</h3><p>${context.payments.length} recorded payments</p></div><input id="opm-search" placeholder="Search patient, phone or payment method" /></div>
        <div class="opm-table-wrap"><table><thead><tr><th>Patient</th><th>Amount</th><th>Date</th><th>Notes</th><th>Action</th></tr></thead><tbody id="opm-rows">${rows || '<tr><td colspan="5">No payments recorded.</td></tr>'}</tbody></table></div>
      </section>`;

    bind(root, context);
  }

  function invoiceOptions(context, patientId, selectedId = '') {
    const invoices = context.invoices.filter((row) => row.patient_id === patientId);
    return `<option value="">Apply without invoice</option>${invoices.map((invoice) => `<option value="${escapeHtml(invoice.id)}" ${invoice.id === selectedId ? 'selected' : ''}>${escapeHtml(invoice.invoice_type || 'Invoice')} • ${money(invoiceDue(invoice))} due • ${dateTime(invoice.created_at)}</option>`).join('')}`;
  }

  function showMessage(root, text, error = false) {
    const box = root.querySelector('#opm-message');
    box.hidden = false;
    box.className = `opm-message ${error ? 'error' : 'success'}`;
    box.textContent = text;
  }

  function openForm(root, context, payment = null) {
    const form = root.querySelector('#opm-form');
    form.hidden = false;
    form.reset();
    form.payment_id.value = payment?.id || '';
    form.patient_id.value = payment?.patient_id || '';
    form.invoice_id.innerHTML = invoiceOptions(context, payment?.patient_id || '', payment?.invoice_id || '');
    form.amount.value = payment?.amount ?? '';
    form.payment_method.value = payment?.payment_method || 'cash';
    const sourceDate = payment?.created_at ? new Date(payment.created_at) : new Date();
    form.created_at.value = new Date(sourceDate.getTime() - sourceDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    form.reference_number.value = payment?.reference_number || '';
    form.notes.value = payment?.notes || '';
    const editing = Boolean(payment);
    root.querySelector('#opm-reason-wrap').hidden = !editing;
    form.correction_reason.required = editing;
    updateSummary(root, context);
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function updateSummary(root, context) {
    const form = root.querySelector('#opm-form');
    const patientId = form.patient_id.value;
    const patient = context.patients.find((item) => item.id === patientId);
    root.querySelector('#opm-summary').textContent = patient ? `${patient.name}: current pending balance ${money(patientDue(context, patientId))}` : 'Select a patient to see pending balance.';
  }

  async function savePayment(root, context, form) {
    const paymentId = form.payment_id.value;
    const old = context.payments.find((row) => row.id === paymentId);
    const amount = Number(form.amount.value);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('Enter a valid amount received.');
    const notes = [form.notes.value.trim(), form.reference_number.value.trim() ? `Reference: ${form.reference_number.value.trim()}` : ''].filter(Boolean).join(' | ');
    const body = {
      clinic_id: context.profile.clinic_id,
      patient_id: form.patient_id.value,
      invoice_id: form.invoice_id.value || null,
      amount,
      payment_method: form.payment_method.value,
      notes,
      created_at: new Date(form.created_at.value).toISOString(),
    };

    if (!paymentId) {
      await rest('payments', { method: 'POST', body });
      if (body.invoice_id) await adjustInvoice(context, body.invoice_id, amount);
      return 'Payment recorded successfully.';
    }

    if (!old) throw new Error('The original payment could not be found.');
    const reason = form.correction_reason.value.trim();
    if (!reason) throw new Error('A correction reason is required.');
    const auditNote = `[OWNER CORRECTION ${new Date().toISOString()}] Original amount ${old.amount}; reason: ${reason}`;
    body.notes = [notes, auditNote].filter(Boolean).join(' | ');
    await rest(`payments?id=eq.${encodeURIComponent(paymentId)}`, { method: 'PATCH', body });

    if (old.invoice_id) await adjustInvoice(context, old.invoice_id, -Number(old.amount || 0));
    if (body.invoice_id) await adjustInvoice(context, body.invoice_id, amount);
    return 'Payment corrected and the original value was preserved in the audit note.';
  }

  async function adjustInvoice(context, invoiceId, delta) {
    const invoice = context.invoices.find((row) => row.id === invoiceId);
    if (!invoice) return;
    const total = Number(invoice.total_amount || 0);
    const paid = Math.max(0, Number(invoice.paid_amount || 0) + Number(delta || 0));
    const due = Math.max(0, total - paid);
    const status = due <= 0 ? 'paid' : paid > 0 ? 'partial' : 'pending';
    await rest(`invoices?id=eq.${encodeURIComponent(invoiceId)}`, { method: 'PATCH', body: { paid_amount: paid, due_amount: due, status } });
  }

  function bind(root, context) {
    const form = root.querySelector('#opm-form');
    root.querySelector('#opm-new').addEventListener('click', () => openForm(root, context));
    root.querySelector('#opm-cancel').addEventListener('click', () => { form.hidden = true; form.reset(); });
    form.patient_id.addEventListener('change', () => {
      form.invoice_id.innerHTML = invoiceOptions(context, form.patient_id.value);
      updateSummary(root, context);
    });
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const submit = form.querySelector('[type="submit"]');
      submit.disabled = true;
      submit.textContent = 'Saving…';
      try {
        const message = await savePayment(root, context, form);
        showMessage(root, message);
        const fresh = await loadContext();
        render(root, fresh);
        window.dispatchEvent(new Event('focus'));
      } catch (error) {
        showMessage(root, error.message || 'Payment could not be saved.', true);
      } finally {
        submit.disabled = false;
        submit.textContent = 'Save payment';
      }
    });
    root.querySelectorAll('.opm-edit').forEach((button) => button.addEventListener('click', () => {
      const payment = context.payments.find((row) => row.id === button.dataset.paymentId);
      openForm(root, context, payment);
    }));
    root.querySelector('#opm-search').addEventListener('input', (event) => {
      const term = event.target.value.trim().toLowerCase();
      root.querySelectorAll('#opm-rows tr').forEach((row) => { row.hidden = term && !row.textContent.toLowerCase().includes(term); });
    });
  }

  async function mount() {
    if (window.location.hash !== '#dms') return;
    const heading = [...document.querySelectorAll('.oc-topbar h1')].find((node) => node.textContent.trim().toLowerCase() === 'billing & dues');
    const content = document.querySelector('.oc-content');
    if (!heading || !content) return;
    if (document.getElementById(ROOT_ID)) return;
    const root = document.createElement('div');
    root.id = ROOT_ID;
    content.prepend(root);
    root.innerHTML = '<section class="opm-card"><p>Loading payment controls…</p></section>';
    try { render(root, await loadContext()); } catch (error) { root.innerHTML = `<section class="opm-card"><div class="opm-message error">${escapeHtml(error.message || 'Payment controls could not load.')}</div></section>`; }
  }

  if (!document.getElementById(STYLE_ID)) {
    const link = document.createElement('link');
    link.id = STYLE_ID;
    link.rel = 'stylesheet';
    link.href = '/owner-payment-management.css?v=1';
    document.head.appendChild(link);
  }

  const observer = new MutationObserver(() => mount());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  mount();
})();
