import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './owner-dashboard-v2.css';
import {
  dmsApi,
  clinicAddress,
  clinicEmail,
  clinicName,
  clinicPhone,
  formatDateTime,
  formatMoney,
  isDmsConfigured,
  isOwnerRole,
  roleLabel,
  whatsappUrl,
} from './dmsClient.js';

const NAV_ITEMS = [
  ['overview', 'Overview', '⌂'],
  ['patients', 'Patients', '👥'],
  ['appointments', 'Appointments', '▣'],
  ['billing', 'Billing & dues', '₹'],
  ['files', 'Clinical files', '▧'],
  ['visits', 'Visit audit', '🦷'],
  ['staff', 'Staff & access', '♟'],
  ['reports', 'Reports', '⇩'],
  ['clinic', 'Clinic settings', '⚙'],
];

const SECTION_COPY = {
  overview: ['Clinic overview', 'Today’s workload, revenue and operational signals.'],
  patients: ['Patient directory', 'Create, search, edit and open complete patient records.'],
  appointments: ['Appointments', 'Manage the clinic schedule and appointment status.'],
  billing: ['Billing & dues', 'Review collections, invoices and patients with pending amounts.'],
  files: ['Clinical files', 'Review prescriptions, X-rays and patient photo uploads.'],
  visits: ['Visit audit', 'See visit activity and the doctor who recorded each entry.'],
  staff: ['Staff & access', 'Invite staff and manage roles and account status.'],
  reports: ['Reports & backup', 'Export clinic data in human-readable CSV or JSON formats.'],
  clinic: ['Clinic settings', 'Update clinic and owner contact information.'],
};

const EMPTY_STATE = {
  summary: {},
  patients: [],
  appointments: [],
  pending: [],
  followups: [],
  visits: [],
  files: [],
  staff: [],
  invites: [],
  payments: [],
  invoices: [],
};

function asDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function currentMonthTotal(payments) {
  const now = new Date();
  return payments.reduce((total, payment) => {
    const date = asDate(payment.created_at);
    if (!date || date.getFullYear() !== now.getFullYear() || date.getMonth() !== now.getMonth()) return total;
    return total + Number(payment.amount || 0);
  }, 0);
}

function currentMonthPayments(payments) {
  const now = new Date();
  return payments.filter((payment) => {
    const date = asDate(payment.created_at);
    return date && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  });
}

function appointmentPatient(item) {
  return Array.isArray(item?.patients) ? item.patients[0] : item?.patients;
}

function appointmentId(item) {
  return item?.id || item?.appointment_id || '';
}

function patientName(item) {
  return appointmentPatient(item)?.name || item?.patient_name || 'Patient';
}

function patientPhone(item) {
  return appointmentPatient(item)?.phone || item?.patient_phone || '';
}

function downloadFile(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  if (value && typeof value === 'object') value = JSON.stringify(value);
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function downloadCsv(name, rows) {
  if (!rows?.length) return;
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const csv = [columns.map(csvCell).join(','), ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(','))].join('\n');
  downloadFile(`${name}-${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv;charset=utf-8');
}

function LogoMark({ large = false }) {
  return <img className={large ? 'oc-logo large' : 'oc-logo'} src="/assets/logo-icon.png" alt="BG Reddy Dental Clinic" />;
}

function IconButton({ children, onClick, title, className = '' }) {
  return <button type="button" className={`oc-icon-button ${className}`} onClick={onClick} title={title}>{children}</button>;
}

function Empty({ title, text }) {
  return <div className="oc-empty"><span>—</span><strong>{title}</strong><p>{text}</p></div>;
}

function Card({ title, subtitle, action, children, className = '' }) {
  return (
    <section className={`oc-card ${className}`}>
      {(title || action) && <div className="oc-card-head"><div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>{action}</div>}
      {children}
    </section>
  );
}

function StatCard({ label, value, meta, icon, tone = 'blue' }) {
  return (
    <article className={`oc-stat ${tone}`}>
      <div className="oc-stat-icon">{icon}</div>
      <small>{label}</small>
      <strong>{value}</strong>
      <p>{meta}</p>
    </article>
  );
}

function Status({ value }) {
  const normalized = String(value || 'scheduled').toLowerCase();
  const tone = ['completed', 'done', 'paid', 'active'].includes(normalized)
    ? 'green'
    : ['cancelled', 'canceled', 'inactive'].includes(normalized)
      ? 'red'
      : ['waiting', 'checked_in', 'pending', 'open'].includes(normalized)
        ? 'amber'
        : 'blue';
  return <span className={`oc-status ${tone}`}>{String(value || 'scheduled').replaceAll('_', ' ')}</span>;
}

function LoginScreen({ onSuccess }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function login(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await dmsApi.login(form.email, form.password);
      const profile = await dmsApi.getProfile();
      if (!profile || !isOwnerRole(profile.role)) {
        dmsApi.clearSession();
        throw new Error('This dashboard is available only to the clinic owner/head doctor.');
      }
      const clinic = await dmsApi.getClinic(profile.clinic_id);
      onSuccess({ profile, clinic });
    } catch (reason) {
      setError(reason?.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  function backToWebsite() {
    history.replaceState('', document.title, `${window.location.pathname}${window.location.search}`);
    window.location.reload();
  }

  return (
    <main className="oc-login-page">
      <button className="oc-back-link" type="button" onClick={backToWebsite}>← Back to clinic website</button>
      <section className="oc-login-shell">
        <div className="oc-login-brand">
          <LogoMark large />
          <span>Private clinic workspace</span>
          <h1>Sri B.G Reddy Dental Clinic</h1>
          <p>A focused owner command center for patients, schedules, revenue, staff and clinical records.</p>
          <div className="oc-login-points"><div>Single-clinic control</div><div>Owner-only access</div><div>Live DMS records</div><div>Secure Supabase session</div></div>
        </div>
        <form className="oc-login-form" onSubmit={login}>
          <div><span className="oc-eyebrow">Owner portal</span><h2>Welcome back</h2><p>Sign in with the head doctor or clinic owner account.</p></div>
          {!isDmsConfigured && <div className="oc-alert error">DMS configuration is missing in this deployment.</div>}
          {error && <div className="oc-alert error">{error}</div>}
          <label>Email<input type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
          <label>Password<input type="password" autoComplete="current-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></label>
          <button className="oc-primary-button" disabled={busy || !isDmsConfigured}>{busy ? 'Signing in…' : 'Open owner dashboard'}</button>
        </form>
      </section>
    </main>
  );
}

function Dashboard({ profile, clinic: initialClinic, onLogout }) {
  const [section, setSection] = useState('overview');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [ownerProfile, setOwnerProfile] = useState(profile);
  const [clinic, setClinic] = useState(initialClinic);
  const [data, setData] = useState(EMPTY_STATE);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientBundle, setPatientBundle] = useState(null);
  const [patientBusy, setPatientBusy] = useState(false);

  async function loadAll(soft = false) {
    soft ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const [summary, patients, appointments, pending, followups, visits, files, staff, invites, paymentAudit] = await Promise.all([
        dmsApi.getOwnerSummary().catch(() => ({})),
        dmsApi.getPatients().catch(() => []),
        dmsApi.getAppointments('all').catch(() => []),
        dmsApi.getPendingPayments().catch(() => []),
        dmsApi.getFollowups('today').catch(() => []),
        dmsApi.getVisitAudit().catch(() => []),
        dmsApi.getGalleryAudit().catch(() => []),
        dmsApi.getStaff().catch(() => []),
        dmsApi.getInvites().catch(() => []),
        dmsApi.getPaymentAudit().catch(() => ({ payments: [], invoices: [] })),
      ]);
      setData({ summary, patients, appointments, pending, followups, visits, files, staff, invites, payments: paymentAudit.payments || [], invoices: paymentAudit.invoices || [] });
      setLastUpdated(new Date());
    } catch (reason) {
      setError(reason?.message || 'Dashboard data could not be loaded.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  const monthPayments = useMemo(() => currentMonthPayments(data.payments), [data.payments]);
  const monthRevenue = useMemo(() => currentMonthTotal(data.payments), [data.payments]);
  const title = SECTION_COPY[section] || SECTION_COPY.overview;
  const clinicId = clinic?.id || ownerProfile?.clinic_id;

  function navigate(next) {
    setSection(next);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function openPatient(patient) {
    setSelectedPatient(patient);
    setPatientBusy(true);
    try {
      setPatientBundle(await dmsApi.getPatientProfile(patient.id));
    } catch (reason) {
      setError(reason?.message || 'Patient profile could not be loaded.');
    } finally {
      setPatientBusy(false);
    }
  }

  async function refreshPatient() {
    if (!selectedPatient) return;
    await openPatient(selectedPatient);
    await loadAll(true);
  }

  return (
    <div className="oc-shell">
      <aside className={mobileOpen ? 'oc-sidebar open' : 'oc-sidebar'}>
        <div className="oc-brand"><LogoMark /><div><strong>{clinicName(clinic)}</strong><span>Owner control panel</span></div><IconButton className="oc-mobile-close" onClick={() => setMobileOpen(false)}>×</IconButton></div>
        <div className="oc-clinic-pill"><span className="oc-live-dot" /><div><strong>Clinic connected</strong><small>{clinicPhone(clinic) || 'Single-clinic workspace'}</small></div></div>
        <nav className="oc-nav">
          <p>Clinic workspace</p>
          {NAV_ITEMS.map(([key, label, icon]) => <button type="button" key={key} className={section === key ? 'active' : ''} onClick={() => navigate(key)}><span>{icon}</span><b>{label}</b>{key === 'billing' && data.pending.length ? <em>{data.pending.length}</em> : null}</button>)}
        </nav>
        <div className="oc-sidebar-footer"><div><span className="oc-live-dot" /><strong>Data status</strong></div><small>{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Connecting…'}</small><button type="button" onClick={onLogout}>↪ Sign out</button></div>
      </aside>

      {mobileOpen && <button className="oc-sidebar-backdrop" type="button" aria-label="Close menu" onClick={() => setMobileOpen(false)} />}

      <div className="oc-workspace">
        <header className="oc-topbar">
          <div className="oc-topbar-title"><IconButton className="oc-menu-button" onClick={() => setMobileOpen(true)}>☰</IconButton><div><span>Single clinic owner dashboard</span><h1>{title[0]}</h1><p>{title[1]}</p></div></div>
          <div className="oc-topbar-actions"><button type="button" className="oc-secondary-button" onClick={() => loadAll(true)} disabled={refreshing}>{refreshing ? 'Refreshing…' : '↻ Refresh'}</button><div className="oc-owner-chip"><div>{String(ownerProfile?.name || ownerProfile?.email || 'O').slice(0, 1).toUpperCase()}</div><span><strong>{ownerProfile?.name || 'Clinic Owner'}</strong><small>{roleLabel(ownerProfile?.role)}</small></span></div></div>
        </header>

        <main className="oc-content">
          {error && <div className="oc-alert error"><strong>Dashboard issue</strong><span>{error}</span></div>}
          {loading ? <LoadingState /> : (
            <>
              {section === 'overview' && <Overview data={data} monthRevenue={monthRevenue} monthPayments={monthPayments} onNavigate={navigate} />}
              {section === 'patients' && <PatientsView data={data} clinicId={clinicId} onReload={() => loadAll(true)} onOpenPatient={openPatient} />}
              {section === 'appointments' && <AppointmentsView data={data} clinicId={clinicId} ownerId={ownerProfile?.id} onReload={() => loadAll(true)} />}
              {section === 'billing' && <BillingView data={data} />}
              {section === 'files' && <FilesView data={data} onReload={() => loadAll(true)} />}
              {section === 'visits' && <VisitsView data={data} />}
              {section === 'staff' && <StaffView data={data} onReload={() => loadAll(true)} />}
              {section === 'reports' && <ReportsView data={data} />}
              {section === 'clinic' && <ClinicView clinic={clinic} owner={ownerProfile} onClinic={setClinic} onOwner={setOwnerProfile} />}
            </>
          )}
        </main>
      </div>

      {selectedPatient && <PatientDrawer patient={selectedPatient} bundle={patientBundle} busy={patientBusy} clinicId={clinicId} ownerId={ownerProfile?.id} onClose={() => { setSelectedPatient(null); setPatientBundle(null); }} onRefresh={refreshPatient} />}
    </div>
  );
}

function LoadingState() {
  return <div className="oc-loading-grid">{Array.from({ length: 8 }).map((_, index) => <div className="oc-skeleton" key={index}><span /><strong /><i /></div>)}</div>;
}

function Overview({ data, monthRevenue, monthPayments, onNavigate }) {
  const summary = data.summary || {};
  const todayRevenue = Number(summary.today_revenue || 0);
  const pendingAmount = Number(summary.pending_payments || 0);
  const waiting = Number(summary.waiting_count || 0);
  const completed = Number(summary.completed_count || 0);
  const todayPatients = Number(summary.today_patient_count || 0);
  const now = new Date();
  const bestDay = useMemo(() => {
    const totals = new Map();
    monthPayments.forEach((payment) => {
      const date = asDate(payment.created_at);
      if (!date) return;
      const key = date.toISOString().slice(0, 10);
      totals.set(key, (totals.get(key) || 0) + Number(payment.amount || 0));
    });
    return Math.max(0, ...totals.values());
  }, [monthPayments]);

  return (
    <>
      <section className="oc-welcome">
        <div><span className="oc-eyebrow">Owner command center</span><h2>Good {now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening'}.</h2><p>Here is what is happening at the clinic today.</p></div>
        <div className="oc-welcome-actions"><button onClick={() => onNavigate('patients')}>+ Add patient</button><button onClick={() => onNavigate('appointments')}>Open schedule</button></div>
      </section>

      <div className="oc-stat-grid">
        <StatCard label="Today’s revenue" value={formatMoney(todayRevenue)} meta="Collected today" icon="₹" tone="green" />
        <StatCard label="Pending amount" value={formatMoney(pendingAmount)} meta={`${data.pending.length} patient records`} icon="!" tone="amber" />
        <StatCard label="Waiting queue" value={waiting} meta={`${completed} completed today`} icon="◷" tone="violet" />
        <StatCard label="Patients today" value={todayPatients} meta={`${data.patients.length} total patients`} icon="👥" tone="blue" />
      </div>

      <section className="oc-revenue-panel">
        <div><span>Monthly collection</span><h3>{now.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}</h3><p>Live total calculated from this clinic’s payment records.</p></div>
        <div className="oc-revenue-total"><strong>{formatMoney(monthRevenue)}</strong><span>{monthPayments.length} payments this month</span></div>
        <div className="oc-revenue-metrics"><div><small>Average / day</small><b>{formatMoney(monthRevenue / Math.max(1, now.getDate()))}</b></div><div><small>Best collection day</small><b>{formatMoney(bestDay)}</b></div><div><small>Visits recorded</small><b>{data.visits.length}</b></div><div><small>Clinical uploads</small><b>{data.files.length}</b></div></div>
      </section>

      <div className="oc-two-column">
        <Card title="Today’s appointments" subtitle={`${data.appointments.length} schedule records`} action={<button className="oc-text-button" onClick={() => onNavigate('appointments')}>View schedule →</button>}>
          <AppointmentRows items={data.appointments.slice(0, 6)} compact />
        </Card>
        <Card title="Pending dues" subtitle={`${data.pending.length} patients need follow-up`} action={<button className="oc-text-button" onClick={() => onNavigate('billing')}>Open billing →</button>}>
          <DueRows items={data.pending.slice(0, 6)} compact />
        </Card>
      </div>

      <div className="oc-two-column">
        <Card title="Recent visits" subtitle="Doctor activity"><VisitRows items={data.visits.slice(0, 6)} /></Card>
        <Card title="Recent clinical files" subtitle="Prescription, X-ray and photo uploads"><FileRows items={data.files.slice(0, 6)} /></Card>
      </div>
    </>
  );
}

function PatientsView({ data, clinicId, onReload, onOpenPatient }) {
  const empty = { id: '', name: '', phone: '', patient_code: '', age: '', gender: '' };
  const [form, setForm] = useState(empty);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(0);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.patients.filter((patient) => !term || [patient.name, patient.phone, patient.patient_code].join(' ').toLowerCase().includes(term));
  }, [data.patients, search]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / 10));
  const rows = filtered.slice(page * 10, page * 10 + 10);

  useEffect(() => { setPage(0); }, [search, data.patients.length]);

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    try {
      if (form.id) await dmsApi.updatePatient(form.id, form);
      else await dmsApi.createPatient(form, clinicId);
      setForm(empty);
      await onReload();
    } finally { setBusy(false); }
  }

  async function remove(patient) {
    if (!window.confirm(`Delete ${patient.name || 'this patient'}? Linked visits or invoices may prevent deletion.`)) return;
    setBusy(true);
    try { await dmsApi.deletePatient(patient.id); await onReload(); } finally { setBusy(false); }
  }

  return (
    <div className="oc-section-grid">
      <Card title={form.id ? 'Edit patient' : 'Add new patient'} subtitle="Keep the patient directory clean and searchable." className="oc-form-card">
        <form className="oc-form" onSubmit={save}>
          <label>Patient name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
          <label>Phone number<input inputMode="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
          <div className="oc-form-split"><label>Patient ID<input value={form.patient_code} onChange={(event) => setForm({ ...form, patient_code: event.target.value })} /></label><label>Age<input inputMode="numeric" value={form.age} onChange={(event) => setForm({ ...form, age: event.target.value })} /></label></div>
          <label>Gender<select value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value })}><option value="">Select gender</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></label>
          <div className="oc-form-actions"><button className="oc-primary-button" disabled={busy}>{busy ? 'Saving…' : form.id ? 'Save changes' : 'Add patient'}</button>{form.id && <button type="button" className="oc-secondary-button" onClick={() => setForm(empty)}>Cancel</button>}</div>
        </form>
      </Card>

      <Card title="Patient directory" subtitle={`${filtered.length} matching records`} className="oc-table-card" action={<button className="oc-secondary-button" onClick={() => downloadCsv('patients', filtered)}>⇩ Export</button>}>
        <div className="oc-toolbar"><label>⌕<input placeholder="Search name, phone or patient ID" value={search} onChange={(event) => setSearch(event.target.value)} /></label></div>
        <div className="oc-table-wrap"><table className="oc-table"><thead><tr><th>Patient</th><th>Age</th><th>Added</th><th>Actions</th></tr></thead><tbody>{rows.map((patient) => <tr key={patient.id}><td data-label="Patient"><strong>{patient.name || 'Patient'}</strong><small>{patient.phone || 'No phone'}{patient.patient_code ? ` • ${patient.patient_code}` : ''}</small></td><td data-label="Age">{patient.age || '—'}{patient.gender ? <small>{patient.gender}</small> : null}</td><td data-label="Added">{formatDateTime(patient.created_at)}</td><td data-label="Actions"><div className="oc-row-actions"><button onClick={() => onOpenPatient(patient)}>Open</button><button onClick={() => setForm({ ...empty, ...patient, age: patient.age ?? '' })}>Edit</button><button className="danger" disabled={busy} onClick={() => remove(patient)}>Delete</button></div></td></tr>)}</tbody></table>{!rows.length && <Empty title="No patients found" text="Try another search or add a new patient." />}</div>
        <div className="oc-pagination"><span>Page {page + 1} of {pageCount}</span><div><button disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>Previous</button><button disabled={page >= pageCount - 1} onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}>Next</button></div></div>
      </Card>
    </div>
  );
}

function AppointmentsView({ data, clinicId, ownerId, onReload }) {
  const [form, setForm] = useState({ patient_id: '', appointment_time: '', status: 'scheduled', notes: '' });
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('all');
  const rows = useMemo(() => data.appointments.filter((item) => filter === 'all' || String(item.status || '').toLowerCase() === filter), [data.appointments, filter]);

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    try { await dmsApi.createAppointment(form, clinicId, ownerId); setForm({ patient_id: '', appointment_time: '', status: 'scheduled', notes: '' }); await onReload(); } finally { setBusy(false); }
  }

  async function update(item, status) {
    setBusy(true);
    try { await dmsApi.updateAppointment(appointmentId(item), { status }); await onReload(); } finally { setBusy(false); }
  }

  async function remove(item) {
    if (!window.confirm('Delete this appointment?')) return;
    setBusy(true);
    try { await dmsApi.deleteAppointment(appointmentId(item)); await onReload(); } finally { setBusy(false); }
  }

  return (
    <div className="oc-section-grid">
      <Card title="Book appointment" subtitle="Create a new appointment for an existing patient." className="oc-form-card"><form className="oc-form" onSubmit={save}><label>Patient<select required value={form.patient_id} onChange={(event) => setForm({ ...form, patient_id: event.target.value })}><option value="">Choose patient</option>{data.patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name} {patient.phone ? `• ${patient.phone}` : ''}</option>)}</select></label><label>Date and time<input type="datetime-local" required value={form.appointment_time} onChange={(event) => setForm({ ...form, appointment_time: event.target.value })} /></label><label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="scheduled">Scheduled</option><option value="waiting">Waiting</option><option value="completed">Completed</option></select></label><label>Notes<textarea rows="3" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label><button className="oc-primary-button" disabled={busy}>{busy ? 'Saving…' : 'Book appointment'}</button></form></Card>
      <Card title="Schedule board" subtitle={`${rows.length} appointments`} className="oc-table-card"><div className="oc-filter-tabs">{['all', 'scheduled', 'waiting', 'completed', 'cancelled'].map((value) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{value}</button>)}</div><div className="oc-table-wrap"><table className="oc-table"><thead><tr><th>Patient</th><th>Appointment</th><th>Status</th><th>Actions</th></tr></thead><tbody>{rows.map((item) => <tr key={appointmentId(item)}><td data-label="Patient"><strong>{patientName(item)}</strong><small>{patientPhone(item) || 'No phone'}</small></td><td data-label="Appointment">{formatDateTime(item.appointment_time)}<small>{item.notes || 'No notes'}</small></td><td data-label="Status"><Status value={item.status} /></td><td data-label="Actions"><div className="oc-row-actions"><button disabled={busy} onClick={() => update(item, 'completed')}>Complete</button><button disabled={busy} onClick={() => update(item, 'cancelled')}>Cancel</button><button className="danger" disabled={busy} onClick={() => remove(item)}>Delete</button></div></td></tr>)}</tbody></table>{!rows.length && <Empty title="No appointments" text="No appointments match this filter." />}</div></Card>
    </div>
  );
}

function BillingView({ data }) {
  const totalCollected = data.payments.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const totalDue = data.pending.reduce((sum, row) => sum + Number(row.pending_amount || 0), 0);
  return <><div className="oc-stat-grid compact"><StatCard label="Total collections" value={formatMoney(totalCollected)} meta={`${data.payments.length} payments`} icon="₹" tone="green" /><StatCard label="Pending dues" value={formatMoney(totalDue)} meta={`${data.pending.length} patients`} icon="!" tone="amber" /><StatCard label="Invoices" value={data.invoices.length} meta="Clinic invoice records" icon="▤" tone="blue" /><StatCard label="This month" value={formatMoney(currentMonthTotal(data.payments))} meta="Month-to-date collection" icon="↗" tone="violet" /></div><div className="oc-two-column"><Card title="Patients with pending dues" subtitle="Use WhatsApp for payment follow-up"><DueRows items={data.pending} /></Card><Card title="Recent payments" subtitle="Latest collection activity"><PaymentRows items={data.payments.slice(0, 20)} /></Card></div><Card title="Invoice register" subtitle={`${data.invoices.length} invoices`} className="oc-table-card"><InvoiceRows items={data.invoices} /></Card></>;
}

function FilesView({ data, onReload }) {
  const [search, setSearch] = useState('');
  const rows = useMemo(() => { const term = search.trim().toLowerCase(); return data.files.filter((item) => !term || [item.patient_name, item.patient_phone, item.file_type, item.file_name, item.uploaded_by_name].join(' ').toLowerCase().includes(term)); }, [data.files, search]);
  async function remove(item) { if (!window.confirm('Delete this file record? The storage object may need separate removal.')) return; await dmsApi.deleteFileRecord(item.file_id); await onReload(); }
  return <Card title="Clinical file audit" subtitle={`${rows.length} uploads`} className="oc-table-card" action={<button className="oc-secondary-button" onClick={() => downloadCsv('clinical-files', rows)}>⇩ Export</button>}><div className="oc-toolbar"><label>⌕<input placeholder="Search patient, file type or uploader" value={search} onChange={(event) => setSearch(event.target.value)} /></label></div><div className="oc-file-grid">{rows.map((item) => <article className="oc-file-card" key={item.file_id}><a className="oc-file-preview" href={item.file_url || '#'} target="_blank" rel="noreferrer">{item.file_url ? <img src={item.file_url} alt={item.file_name || 'Clinical file'} /> : <span>FILE</span>}</a><div><Status value={item.file_type || 'file'} /><h3>{item.patient_name || 'Patient'}</h3><p>{item.file_name || 'Clinical file'}</p><small>Uploaded by {item.uploaded_by_name || 'Not recorded'} • {formatDateTime(item.created_at)}</small></div><div className="oc-row-actions">{item.file_url && <a href={item.file_url} target="_blank" rel="noreferrer">View</a>}<button className="danger" onClick={() => remove(item)}>Delete record</button></div></article>)}{!rows.length && <Empty title="No clinical files" text="No uploads match this search." />}</div></Card>;
}

function VisitsView({ data }) {
  const [search, setSearch] = useState('');
  const rows = useMemo(() => { const term = search.trim().toLowerCase(); return data.visits.filter((item) => !term || [item.patient_name, item.patient_phone, item.patient_code, item.doctor_name, item.chief_complaint].join(' ').toLowerCase().includes(term)); }, [data.visits, search]);
  return <Card title="Visit activity" subtitle={`${rows.length} records`} className="oc-table-card" action={<button className="oc-secondary-button" onClick={() => downloadCsv('visit-audit', rows)}>⇩ Export</button>}><div className="oc-toolbar"><label>⌕<input placeholder="Search patient, doctor or complaint" value={search} onChange={(event) => setSearch(event.target.value)} /></label></div><div className="oc-table-wrap"><table className="oc-table"><thead><tr><th>Patient</th><th>Visit</th><th>Doctor</th><th>Follow-up</th></tr></thead><tbody>{rows.map((item) => <tr key={item.visit_id || `${item.patient_id}-${item.created_at}`}><td data-label="Patient"><strong>{item.patient_name || 'Patient'}</strong><small>{item.patient_phone || 'No phone'}{item.patient_code ? ` • ${item.patient_code}` : ''}</small></td><td data-label="Visit"><strong>{item.chief_complaint || 'Visit'}</strong><small>{formatDateTime(item.visit_date || item.created_at)}{item.notes ? ` • ${item.notes}` : ''}</small></td><td data-label="Doctor">{item.doctor_name || 'Not recorded'}<small>{roleLabel(item.doctor_role)}</small></td><td data-label="Follow-up">{item.next_appointment_date ? formatDateTime(item.next_appointment_date) : 'Not set'}</td></tr>)}</tbody></table>{!rows.length && <Empty title="No visits" text="No visit records match this search." />}</div></Card>;
}

function StaffView({ data, onReload }) {
  const empty = { id: '', name: '', email: '', phone: '', role: 'receptionist', active: true };
  const [invite, setInvite] = useState({ name: '', email: '', role: 'receptionist' });
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  async function createInvite(event) { event.preventDefault(); setBusy(true); try { await dmsApi.createStaffInvite(invite); setInvite({ name: '', email: '', role: 'receptionist' }); await onReload(); } finally { setBusy(false); } }
  async function save(event) { event.preventDefault(); if (!form.id) return; setBusy(true); try { await dmsApi.updateStaffProfile(form.id, form); setForm(empty); await onReload(); } finally { setBusy(false); } }
  async function deactivate(member) { setBusy(true); try { await dmsApi.updateStaffProfile(member.id, { ...member, active: false }); await onReload(); } finally { setBusy(false); } }
  async function remove(member) { if (!window.confirm(`Delete ${member.name || member.email || 'this staff profile'}?`)) return; setBusy(true); try { await dmsApi.deleteStaffProfile(member.id); await onReload(); } finally { setBusy(false); } }
  async function removeInvite(item) { if (!window.confirm('Delete this invite?')) return; setBusy(true); try { await dmsApi.deleteInvite(item.id); await onReload(); } finally { setBusy(false); } }
  return <div className="oc-section-grid"><div className="oc-stack"><Card title="Invite staff" subtitle="Create access for a doctor or receptionist."><form className="oc-form" onSubmit={createInvite}><label>Name<input required value={invite.name} onChange={(event) => setInvite({ ...invite, name: event.target.value })} /></label><label>Email<input type="email" required value={invite.email} onChange={(event) => setInvite({ ...invite, email: event.target.value })} /></label><label>Role<select value={invite.role} onChange={(event) => setInvite({ ...invite, role: event.target.value })}><option value="receptionist">Receptionist</option><option value="working_doctor">Working Doctor</option><option value="head_doctor">Head Doctor / Owner</option></select></label><button className="oc-primary-button" disabled={busy}>{busy ? 'Creating…' : 'Create invite'}</button></form></Card><Card title="Edit staff" subtitle="Choose a staff member from the directory."><form className="oc-form" onSubmit={save}><label>Name<input disabled={!form.id} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>Email<input disabled={!form.id} type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label>Phone<input disabled={!form.id} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label><label>Role<select disabled={!form.id} value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="receptionist">Receptionist</option><option value="working_doctor">Working Doctor</option><option value="head_doctor">Head Doctor / Owner</option></select></label><label className="oc-check"><input type="checkbox" disabled={!form.id} checked={form.active !== false} onChange={(event) => setForm({ ...form, active: event.target.checked })} /> Active account</label><div className="oc-form-actions"><button className="oc-primary-button" disabled={busy || !form.id}>Save staff</button>{form.id && <button type="button" className="oc-secondary-button" onClick={() => setForm(empty)}>Cancel</button>}</div></form></Card></div><Card title="Staff directory" subtitle={`${data.staff.length} staff • ${data.invites.length} invites`} className="oc-table-card"><div className="oc-table-wrap"><table className="oc-table"><thead><tr><th>Staff</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody>{data.staff.map((member) => <tr key={member.id}><td data-label="Staff"><strong>{member.name || member.email}</strong><small>{member.email || 'No email'}{member.phone ? ` • ${member.phone}` : ''}</small></td><td data-label="Role">{roleLabel(member.role)}</td><td data-label="Status"><Status value={member.active === false ? 'inactive' : 'active'} /></td><td data-label="Actions"><div className="oc-row-actions"><button onClick={() => setForm({ ...empty, ...member, active: member.active !== false })}>Edit</button><button onClick={() => deactivate(member)}>Deactivate</button><button className="danger" onClick={() => remove(member)}>Delete</button></div></td></tr>)}</tbody></table></div><h4 className="oc-subheading">Pending and previous invites</h4><div className="oc-list">{data.invites.map((item) => <div className="oc-list-row" key={item.id}><div><strong>{item.name || item.email}</strong><small>{item.email} • {roleLabel(item.role)} • {item.accepted_at ? 'Accepted' : `Code ${item.invite_code || '—'}`}</small></div><button className="oc-danger-link" onClick={() => removeInvite(item)}>Delete</button></div>)}{!data.invites.length && <Empty title="No invites" text="No staff invitations found." />}</div></Card></div>;
}

function ReportsView({ data }) {
  const reportCards = [
    ['Patients', 'Patient names, phone numbers and profile details.', () => downloadCsv('patients', data.patients)],
    ['Appointments', 'Schedule, status, patient and appointment notes.', () => downloadCsv('appointments', data.appointments)],
    ['Visits', 'Visit history, complaints, doctors and follow-ups.', () => downloadCsv('visits', data.visits)],
    ['Payments', 'Collection history and payment methods.', () => downloadCsv('payments', data.payments)],
    ['Invoices', 'Invoice totals, paid amounts and pending dues.', () => downloadCsv('invoices', data.invoices)],
    ['Clinical files', 'File type, patient and uploader audit.', () => downloadCsv('clinical-files', data.files)],
    ['Staff', 'Staff roles, email and active status.', () => downloadCsv('staff', data.staff)],
  ];
  async function fullBackup() { const bundle = await dmsApi.getOwnerExportBundle(); downloadFile(`clinic-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(bundle, null, 2), 'application/json'); }
  return <><section className="oc-backup-hero"><div><span className="oc-eyebrow">Clinic data backup</span><h2>Export only what the owner needs.</h2><p>Every download is generated from the logged-in clinic account and current RLS permissions.</p></div><button className="oc-primary-button" onClick={fullBackup}>Download complete JSON backup</button></section><div className="oc-report-grid">{reportCards.map(([title, text, action]) => <button key={title} className="oc-report-card" onClick={action}><span>⇩</span><div><strong>{title}</strong><p>{text}</p></div><b>CSV</b></button>)}</div></>;
}

function ClinicView({ clinic, owner, onClinic, onOwner }) {
  const [clinicForm, setClinicForm] = useState({ name: clinicName(clinic), phone: clinicPhone(clinic), email: clinicEmail(clinic), address: clinicAddress(clinic) });
  const [ownerForm, setOwnerForm] = useState({ name: owner?.name || '', email: owner?.email || '', phone: owner?.phone || '' });
  const [busy, setBusy] = useState('');
  async function saveClinic(event) { event.preventDefault(); setBusy('clinic'); try { const rows = await dmsApi.updateClinic(clinic.id, clinicForm); onClinic(rows?.[0] || { ...clinic, ...clinicForm }); } finally { setBusy(''); } }
  async function saveOwner(event) { event.preventDefault(); setBusy('owner'); try { const rows = await dmsApi.updateProfile(owner.id, ownerForm); onOwner(rows?.[0] || { ...owner, ...ownerForm }); } finally { setBusy(''); } }
  return <div className="oc-two-column"><Card title="Clinic information" subtitle="Shown across the owner portal and clinic records."><form className="oc-form" onSubmit={saveClinic}><label>Clinic name<input required value={clinicForm.name} onChange={(event) => setClinicForm({ ...clinicForm, name: event.target.value })} /></label><label>Phone<input value={clinicForm.phone} onChange={(event) => setClinicForm({ ...clinicForm, phone: event.target.value })} /></label><label>Email<input type="email" value={clinicForm.email} onChange={(event) => setClinicForm({ ...clinicForm, email: event.target.value })} /></label><label>Address<textarea rows="4" value={clinicForm.address} onChange={(event) => setClinicForm({ ...clinicForm, address: event.target.value })} /></label><button className="oc-primary-button" disabled={busy === 'clinic'}>{busy === 'clinic' ? 'Saving…' : 'Save clinic details'}</button></form></Card><Card title="Owner profile" subtitle="Head doctor contact and dashboard identity."><form className="oc-form" onSubmit={saveOwner}><label>Owner name<input value={ownerForm.name} onChange={(event) => setOwnerForm({ ...ownerForm, name: event.target.value })} /></label><label>Email<input type="email" value={ownerForm.email} onChange={(event) => setOwnerForm({ ...ownerForm, email: event.target.value })} /></label><label>Phone<input value={ownerForm.phone} onChange={(event) => setOwnerForm({ ...ownerForm, phone: event.target.value })} /></label><div className="oc-owner-summary"><LogoMark large /><div><strong>{ownerForm.name || 'Clinic owner'}</strong><span>{roleLabel(owner.role)}</span><small>{clinicName(clinic)}</small></div></div><button className="oc-primary-button" disabled={busy === 'owner'}>{busy === 'owner' ? 'Saving…' : 'Save owner profile'}</button></form></Card></div>;
}

function PatientDrawer({ patient, bundle, busy, clinicId, ownerId, onClose, onRefresh }) {
  const [tab, setTab] = useState('summary');
  const [saving, setSaving] = useState(false);
  const [appointment, setAppointment] = useState({ appointment_time: '', status: 'scheduled', notes: '' });
  const [visit, setVisit] = useState({ visit_date: new Date().toISOString().slice(0, 16), chief_complaint: '', notes: '', next_appointment_date: '' });
  const details = bundle || { patient, visits: [], files: [], appointments: [], invoices: [], payments: [] };
  const due = details.invoices.reduce((sum, item) => sum + Number(item.due_amount || 0), 0);
  const paid = details.payments.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  async function addAppointment(event) { event.preventDefault(); setSaving(true); try { await dmsApi.createAppointment({ ...appointment, patient_id: patient.id }, clinicId, ownerId); setAppointment({ appointment_time: '', status: 'scheduled', notes: '' }); await onRefresh(); } finally { setSaving(false); } }
  async function addVisit(event) { event.preventDefault(); setSaving(true); try { await dmsApi.createVisit({ ...visit, patient_id: patient.id }, clinicId, ownerId); setVisit({ visit_date: new Date().toISOString().slice(0, 16), chief_complaint: '', notes: '', next_appointment_date: '' }); await onRefresh(); } finally { setSaving(false); } }
  return <div className="oc-drawer-backdrop" onClick={onClose}><aside className="oc-drawer" onClick={(event) => event.stopPropagation()}><div className="oc-drawer-head"><div><span className="oc-eyebrow">Patient profile</span><h2>{patient.name || 'Patient'}</h2><p>{patient.phone || 'No phone'}{patient.patient_code ? ` • ${patient.patient_code}` : ''}{patient.age ? ` • ${patient.age} yrs` : ''}</p></div><IconButton onClick={onClose}>×</IconButton></div>{busy ? <div className="oc-drawer-loading">Loading patient record…</div> : <><div className="oc-profile-stats"><div><small>Visits</small><strong>{details.visits.length}</strong></div><div><small>Files</small><strong>{details.files.length}</strong></div><div><small>Paid</small><strong>{formatMoney(paid)}</strong></div><div><small>Due</small><strong>{formatMoney(due)}</strong></div></div><div className="oc-drawer-tabs">{['summary', 'appointment', 'visit'].map((value) => <button key={value} className={tab === value ? 'active' : ''} onClick={() => setTab(value)}>{value}</button>)}</div>{tab === 'summary' && <div className="oc-drawer-content"><Card title="Appointments"><AppointmentRows items={details.appointments} /></Card><Card title="Visits"><VisitRows items={details.visits.map((item) => ({ ...item, patient_name: patient.name }))} /></Card><Card title="Files"><div className="oc-list">{details.files.map((item) => <a className="oc-list-row" href={item.file_url || '#'} target="_blank" rel="noreferrer" key={item.id}><div><strong>{item.file_type || 'Clinical file'}</strong><small>{item.file_name || 'File'} • {formatDateTime(item.created_at)}</small></div><span>View</span></a>)}{!details.files.length && <Empty title="No files" text="No clinical files found for this patient." />}</div></Card></div>}{tab === 'appointment' && <form className="oc-form oc-drawer-form" onSubmit={addAppointment}><h3>Add appointment</h3><label>Date and time<input type="datetime-local" required value={appointment.appointment_time} onChange={(event) => setAppointment({ ...appointment, appointment_time: event.target.value })} /></label><label>Status<select value={appointment.status} onChange={(event) => setAppointment({ ...appointment, status: event.target.value })}><option value="scheduled">Scheduled</option><option value="waiting">Waiting</option></select></label><label>Notes<textarea rows="3" value={appointment.notes} onChange={(event) => setAppointment({ ...appointment, notes: event.target.value })} /></label><button className="oc-primary-button" disabled={saving}>{saving ? 'Saving…' : 'Add appointment'}</button></form>}{tab === 'visit' && <form className="oc-form oc-drawer-form" onSubmit={addVisit}><h3>Add visit note</h3><label>Visit date<input type="datetime-local" value={visit.visit_date} onChange={(event) => setVisit({ ...visit, visit_date: event.target.value })} /></label><label>Chief complaint<input required value={visit.chief_complaint} onChange={(event) => setVisit({ ...visit, chief_complaint: event.target.value })} /></label><label>Notes<textarea rows="3" value={visit.notes} onChange={(event) => setVisit({ ...visit, notes: event.target.value })} /></label><label>Next appointment<input type="datetime-local" value={visit.next_appointment_date} onChange={(event) => setVisit({ ...visit, next_appointment_date: event.target.value })} /></label><button className="oc-primary-button" disabled={saving}>{saving ? 'Saving…' : 'Add visit'}</button></form>}</>}</aside></div>;
}

function AppointmentRows({ items = [], compact = false }) {
  if (!items.length) return <Empty title="No appointments" text="No appointment records found." />;
  return <div className="oc-list">{items.map((item) => <div className="oc-list-row" key={appointmentId(item) || item.appointment_time}><div><strong>{patientName(item)}</strong><small>{formatDateTime(item.appointment_time)}{!compact && item.notes ? ` • ${item.notes}` : ''}</small></div><Status value={item.status} /></div>)}</div>;
}

function DueRows({ items = [], compact = false }) {
  if (!items.length) return <Empty title="No pending dues" text="There are no outstanding patient dues." />;
  return <div className="oc-list">{items.map((item) => { const message = `Hello ${item.patient_name || 'Patient'}, this is a payment reminder from Sri B.G Reddy Dental Clinic. Pending amount: ${formatMoney(item.pending_amount)}. Please contact reception. Thank you.`; const url = whatsappUrl(item.patient_phone, message); return <div className="oc-list-row" key={item.patient_id || item.last_invoice_id}><div><strong>{item.patient_name || 'Patient'}</strong><small>{item.patient_phone || 'No phone'}{!compact ? ` • ${item.invoice_count || 0} invoice(s)` : ''}</small></div><div className="oc-list-end"><b>{formatMoney(item.pending_amount)}</b>{url && !compact ? <a href={url} target="_blank" rel="noreferrer">WhatsApp</a> : null}</div></div>; })}</div>;
}

function VisitRows({ items = [] }) {
  if (!items.length) return <Empty title="No recent visits" text="Visit activity will appear here." />;
  return <div className="oc-list">{items.map((item, index) => <div className="oc-list-row" key={item.visit_id || item.id || index}><div><strong>{item.patient_name || item.chief_complaint || 'Patient visit'}</strong><small>{item.chief_complaint || 'Visit'} • {formatDateTime(item.visit_date || item.created_at)}</small></div><span>{item.doctor_name || 'Doctor'}</span></div>)}</div>;
}

function FileRows({ items = [] }) {
  if (!items.length) return <Empty title="No recent files" text="Clinical uploads will appear here." />;
  return <div className="oc-list">{items.map((item, index) => <a className="oc-list-row" href={item.file_url || '#'} target="_blank" rel="noreferrer" key={item.file_id || item.id || index}><div><strong>{item.patient_name || 'Patient'}</strong><small>{item.file_type || 'File'} • {item.file_name || 'Clinical upload'}</small></div><span>{formatDateTime(item.created_at)}</span></a>)}</div>;
}

function PaymentRows({ items = [] }) {
  if (!items.length) return <Empty title="No payments" text="Payment records will appear here." />;
  return <div className="oc-list">{items.map((item) => <div className="oc-list-row" key={item.payment_id || item.id}><div><strong>{item.patient_name || 'Patient'}</strong><small>{item.payment_method || 'Payment'} • {formatDateTime(item.created_at)}</small></div><b>{formatMoney(item.amount)}</b></div>)}</div>;
}

function InvoiceRows({ items = [] }) {
  if (!items.length) return <Empty title="No invoices" text="Invoice records will appear here." />;
  return <div className="oc-table-wrap"><table className="oc-table"><thead><tr><th>Patient</th><th>Total</th><th>Paid</th><th>Due</th><th>Status</th></tr></thead><tbody>{items.map((item) => <tr key={item.invoice_id || item.id}><td data-label="Patient"><strong>{item.patient_name || 'Patient'}</strong><small>{item.invoice_type || 'Invoice'}</small></td><td data-label="Total">{formatMoney(item.total_amount)}</td><td data-label="Paid">{formatMoney(item.paid_amount)}</td><td data-label="Due"><strong>{formatMoney(item.due_amount)}</strong></td><td data-label="Status"><Status value={item.status || (Number(item.due_amount) > 0 ? 'open' : 'paid')} /></td></tr>)}</tbody></table></div>;
}

function OwnerApp() {
  const [booting, setBooting] = useState(true);
  const [session, setSession] = useState({ profile: null, clinic: null });

  useEffect(() => {
    async function boot() {
      if (!dmsApi.token) { setBooting(false); return; }
      try {
        const profile = await dmsApi.getProfile();
        if (!profile || !isOwnerRole(profile.role)) throw new Error('Owner access required');
        const clinic = await dmsApi.getClinic(profile.clinic_id);
        setSession({ profile, clinic });
      } catch {
        dmsApi.clearSession();
      } finally { setBooting(false); }
    }
    boot();
  }, []);

  function logout() {
    dmsApi.clearSession();
    history.replaceState('', document.title, `${window.location.pathname}${window.location.search}`);
    window.location.reload();
  }

  if (booting) return <main className="oc-boot"><LogoMark large /><strong>Opening clinic owner dashboard…</strong></main>;
  if (!session.profile) return <LoginScreen onSuccess={setSession} />;
  return <Dashboard profile={session.profile} clinic={session.clinic} onLogout={logout} />;
}

createRoot(document.getElementById('root')).render(<OwnerApp />);
