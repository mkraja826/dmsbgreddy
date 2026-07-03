const runtimeConfig =
  typeof window !== 'undefined' && window.DMS_CONFIG ? window.DMS_CONFIG : {};

const rawUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  runtimeConfig.SUPABASE_URL ||
  runtimeConfig.supabaseUrl ||
  '';

const rawKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  runtimeConfig.SUPABASE_ANON_KEY ||
  runtimeConfig.supabaseAnonKey ||
  '';

const SUPABASE_URL = String(rawUrl || '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = String(rawKey || '');

const SESSION_KEY = 'bg_reddy_dms_owner_session_v3';

export const configSource = import.meta.env.VITE_SUPABASE_URL
  ? 'Vite .env / hosting environment'
  : runtimeConfig.SUPABASE_URL
    ? 'public/dms-config.js'
    : 'missing';

export const isDmsConfigured = Boolean(
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  !SUPABASE_URL.includes('YOUR-PROJECT') &&
  !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE')
);

export function getConnectionLabel() {
  if (!isDmsConfigured) return 'DMS not configured';
  return `DMS connected through ${configSource}`;
}

function safeJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function readStoredSession() {
  if (typeof window === 'undefined') return null;

  const saved = localStorage.getItem(SESSION_KEY);
  return saved ? safeJson(saved) : null;
}

function saveStoredSession(session) {
  if (typeof window === 'undefined') return;

  if (!session) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function queryPairs(pairs = []) {
  return pairs
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

function cleanSearch(value) {
  return String(value || '')
    .replace(/[%,()*"]/g, '')
    .trim();
}

function compactObject(values = {}) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
}

function numberOrNull(value) {
  if (value === '' || value === undefined || value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isoOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function todayStartIso() {
  const value = new Date();
  value.setHours(0, 0, 0, 0);
  return value.toISOString();
}

function todayEndIso() {
  const value = new Date();
  value.setHours(23, 59, 59, 999);
  return value.toISOString();
}

function normalizeRole(role) {
  if (role === 'owner') return 'head_doctor';
  if (role === 'doctor') return 'working_doctor';
  return role;
}

export function isOwnerRole(role) {
  return normalizeRole(role) === 'head_doctor';
}

export function roleLabel(role) {
  const normalized = normalizeRole(role);

  if (normalized === 'head_doctor') return 'Head Doctor / Owner';
  if (normalized === 'working_doctor') return 'Working Doctor';
  if (normalized === 'receptionist') return 'Receptionist';

  return role || 'Unknown role';
}

export function formatMoney(value) {
  return `₹${Math.round(Number(value || 0)).toLocaleString('en-IN')}`;
}

export function formatDateTime(value) {
  if (!value) return 'Not set';

  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function clinicName(clinic) {
  return clinic?.name || clinic?.clinic_name || clinic?.hospital_name || 'Sri B.G Reddy Dental Clinic';
}

export function clinicPhone(clinic) {
  return clinic?.phone || clinic?.clinic_phone || '';
}

export function clinicEmail(clinic) {
  return clinic?.email || clinic?.clinic_email || '';
}

export function clinicAddress(clinic) {
  return clinic?.address || clinic?.clinic_address || '';
}

export function cleanIndianPhone(phone) {
  const digits = String(phone || '').replace(/[^0-9]/g, '');

  if (!digits) return '';

  if (digits.length === 10) return `91${digits}`;

  return digits;
}

export function whatsappUrl(phone, message) {
  const cleaned = cleanIndianPhone(phone);

  if (!cleaned) return '';

  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}

function sum(rows, key) {
  return (rows || []).reduce((total, row) => total + Number(row?.[key] || 0), 0);
}

function normalizeSummary(row = {}) {
  return {
    today_revenue: Number(row.today_revenue ?? row.todayRevenue ?? 0),
    pending_payments: Number(row.pending_payments ?? row.pendingPayments ?? 0),
    op_fee_revenue_today: Number(row.op_fee_revenue_today ?? 0),
    medication_revenue_today: Number(row.medication_revenue_today ?? 0),
    waiting_count: Number(row.waiting_count ?? 0),
    completed_count: Number(row.completed_count ?? 0),
    today_patient_count: Number(row.today_patient_count ?? row.todayPatients ?? 0),
  };
}

function firstRow(data) {
  if (Array.isArray(data)) return data[0] || null;
  return data || null;
}

export class DmsApi {
  constructor(session = readStoredSession()) {
    this.session = session;
  }

  get token() {
    return this.session?.access_token || '';
  }

  setSession(session) {
    this.session = session;
    saveStoredSession(session);
  }

  clearSession() {
    this.session = null;
    saveStoredSession(null);
  }

  ensureConfigured() {
    if (!isDmsConfigured) {
      throw new Error(
        'DMS is not configured in this build. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, stop dev server, run npm run dev again, or redeploy the website.'
      );
    }
  }

  ensureSession() {
    if (!this.token) {
      throw new Error('Login session missing. Please login again.');
    }
  }

  async authRequest(path, body) {
    this.ensureConfigured();

    const response = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.msg || data?.message || 'Login failed');
    }

    return data;
  }

  async login(email, password) {
    const data = await this.authRequest('token?grant_type=password', {
      email: email.trim().toLowerCase(),
      password,
    });

    this.setSession(data);
    return data;
  }

  async rest(path, options = {}) {
    this.ensureConfigured();

    const { method = 'GET', body, prefer = 'return=representation' } = options;

    const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      method,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${this.token || SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: prefer,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (response.status === 204) return null;

    const text = await response.text();
    const data = text ? safeJson(text) || text : null;

    if (!response.ok) {
      const message =
        data?.message ||
        data?.hint ||
        data?.details ||
        `DMS request failed (${response.status})`;

      throw new Error(message);
    }

    return data;
  }

  async rpc(name, body = {}) {
    return this.rest(`rpc/${name}`, {
      method: 'POST',
      body,
      prefer: 'return=representation',
    });
  }

  async getProfile() {
    this.ensureSession();

    const userId = this.session?.user?.id;

    if (!userId) return null;

    const rows = await this.rest(
      `profiles?${queryPairs([
        ['select', '*'],
        ['id', `eq.${userId}`],
        ['limit', '1'],
      ])}`
    );

    return rows?.[0] || null;
  }

  async getClinic(clinicId) {
    if (!clinicId) return null;

    const rows = await this.rest(
      `clinics?${queryPairs([
        ['select', '*'],
        ['id', `eq.${clinicId}`],
        ['limit', '1'],
      ])}`
    );

    return rows?.[0] || null;
  }

  async getOwnerSummary() {
    try {
      const rows = await this.rpc('get_workflow_dashboard_summary', {});
      return normalizeSummary(firstRow(rows) || {});
    } catch (firstError) {
      try {
        const rows = await this.rpc('get_revenue_summary', {});
        return normalizeSummary(firstRow(rows) || {});
      } catch {
        return this.getManualSummary();
      }
    }
  }

  async getManualSummary() {
    const start = todayStartIso();
    const end = todayEndIso();

    const [payments, invoices, appointments] = await Promise.all([
      this.rest(
        `payments?${queryPairs([
          ['select', 'amount,created_at'],
          ['created_at', `gte.${start}`],
          ['created_at', `lte.${end}`],
          ['limit', '1000'],
        ])}`
      ).catch(() => []),

      this.rest(
        `invoices?${queryPairs([
          ['select', 'due_amount,total_amount,paid_amount,status,created_at'],
          ['limit', '1000'],
        ])}`
      ).catch(() => []),

      this.rest(
        `appointments?${queryPairs([
          ['select', 'patient_id,status,appointment_time'],
          ['appointment_time', `gte.${start}`],
          ['appointment_time', `lte.${end}`],
          ['limit', '1000'],
        ])}`
      ).catch(() => []),
    ]);

    const waitingStatuses = ['scheduled', 'waiting', 'checked_in', 'booked'];
    const completedStatuses = ['completed', 'done'];

    return normalizeSummary({
      today_revenue: sum(payments, 'amount'),
      pending_payments: (invoices || []).reduce(
        (total, invoice) => total + Math.max(Number(invoice.due_amount || 0), 0),
        0
      ),
      waiting_count: (appointments || []).filter((item) =>
        waitingStatuses.includes(String(item.status || '').toLowerCase())
      ).length,
      completed_count: (appointments || []).filter((item) =>
        completedStatuses.includes(String(item.status || '').toLowerCase())
      ).length,
      today_patient_count: new Set((appointments || []).map((item) => item.patient_id).filter(Boolean)).size,
    });
  }

  async getPatients(search = '') {
    const term = cleanSearch(search);

    const pairs = [
      ['select', 'id,clinic_id,patient_code,name,phone,age,gender,created_at'],
      ['order', 'created_at.desc'],
      ['limit', '120'],
    ];

    if (term) {
      pairs.push(['or', `(name.ilike.*${term}*,phone.ilike.*${term}*,patient_code.ilike.*${term}*)`]);
    }

    return this.rest(`patients?${queryPairs(pairs)}`).catch((error) => {
      throw new Error(`Patients not showing from DMS: ${error.message}`);
    });
  }

  async getPatientProfile(patientId) {
    if (!patientId) return null;

    const [patientRows, visits, files, appointments, invoices, payments] = await Promise.all([
      this.rest(
        `patients?${queryPairs([
          ['select', '*'],
          ['id', `eq.${patientId}`],
          ['limit', '1'],
        ])}`
      ).catch(() => []),

      this.rest(
        `patient_visits?${queryPairs([
          ['select', '*'],
          ['patient_id', `eq.${patientId}`],
          ['order', 'created_at.desc'],
          ['limit', '1000'],
        ])}`
      ).catch(() => []),

      this.rest(
        `files?${queryPairs([
          ['select', '*'],
          ['patient_id', `eq.${patientId}`],
          ['order', 'created_at.desc'],
          ['limit', '1000'],
        ])}`
      ).catch(() => []),

      this.rest(
        `appointments?${queryPairs([
          ['select', '*'],
          ['patient_id', `eq.${patientId}`],
          ['order', 'appointment_time.desc'],
          ['limit', '1000'],
        ])}`
      ).catch(() => []),

      this.rest(
        `invoices?${queryPairs([
          ['select', '*'],
          ['patient_id', `eq.${patientId}`],
          ['order', 'created_at.desc'],
          ['limit', '1000'],
        ])}`
      ).catch(() => []),

      this.rest(
        `payments?${queryPairs([
          ['select', '*'],
          ['patient_id', `eq.${patientId}`],
          ['order', 'created_at.desc'],
          ['limit', '1000'],
        ])}`
      ).catch(() => []),
    ]);

    return {
      patient: patientRows?.[0] || null,
      visits: visits || [],
      files: files || [],
      appointments: appointments || [],
      invoices: invoices || [],
      payments: payments || [],
    };
  }

  async createPatient(input, clinicId) {
    const body = compactObject({
      clinic_id: input.clinic_id || clinicId,
      patient_code: input.patient_code,
      name: input.name?.trim(),
      phone: input.phone?.trim(),
      age: numberOrNull(input.age),
      gender: input.gender,
    });

    return this.rest('patients', {
      method: 'POST',
      body,
    });
  }

  async updatePatient(patientId, input) {
    const body = compactObject({
      patient_code: input.patient_code,
      name: input.name?.trim(),
      phone: input.phone?.trim(),
      age: numberOrNull(input.age),
      gender: input.gender,
    });

    return this.rest(`patients?${queryPairs([['id', `eq.${patientId}`]])}`, {
      method: 'PATCH',
      body,
    });
  }

  async deletePatient(patientId) {
    return this.rest(`patients?${queryPairs([['id', `eq.${patientId}`]])}`, {
      method: 'DELETE',
    });
  }

  async getPatientsByIds(ids = []) {
    const cleanIds = [...new Set(ids.filter(Boolean))];

    if (!cleanIds.length) return [];

    return this.rest(
      `patients?${queryPairs([
        ['select', 'id,name,phone,patient_code,age,gender'],
        ['id', `in.(${cleanIds.join(',')})`],
        ['limit', '1000'],
      ])}`
    ).catch(() => []);
  }

  async getAppointments(filter = 'today') {
    const now = new Date();
    const pairs = [
      ['select', 'id,patient_id,appointment_time,status,notes,patients(id,name,phone,patient_code)'],
      ['order', 'appointment_time.asc'],
      ['limit', '120'],
    ];

    if (filter === 'today') {
      pairs.push(['appointment_time', `gte.${todayStartIso()}`]);
      pairs.push(['appointment_time', `lte.${todayEndIso()}`]);
    }

    if (filter === 'upcoming') {
      pairs.push(['appointment_time', `gte.${now.toISOString()}`]);
    }

    if (filter === 'overdue') {
      pairs.push(['appointment_time', `lt.${now.toISOString()}`]);
      pairs.push(['not', 'status.in.(completed,done,cancelled,canceled,no_show)']);
    }

    try {
      return await this.rest(`appointments?${queryPairs(pairs)}`);
    } catch {
      const fallbackPairs = pairs.map(([key, value]) => {
        if (key === 'select') return ['select', 'id,patient_id,appointment_time,status,notes'];
        return [key, value];
      });

      const rows = await this.rest(`appointments?${queryPairs(fallbackPairs)}`).catch(() => []);
      const patients = await this.getPatientsByIds(rows.map((item) => item.patient_id));
      const byId = new Map(patients.map((patient) => [patient.id, patient]));

      return rows.map((item) => ({
        ...item,
        patients: byId.get(item.patient_id) || null,
      }));
    }
  }

  async createAppointment(input, clinicId, doctorId) {
    const body = compactObject({
      clinic_id: input.clinic_id || clinicId,
      patient_id: input.patient_id,
      doctor_id: input.doctor_id || doctorId,
      appointment_time: isoOrNull(input.appointment_time),
      status: input.status || 'scheduled',
      notes: input.notes,
    });

    return this.rest('appointments', {
      method: 'POST',
      body,
    });
  }

  async updateAppointment(appointmentId, input) {
    const body = compactObject({
      appointment_time: isoOrNull(input.appointment_time),
      status: input.status,
      notes: input.notes,
      doctor_id: input.doctor_id,
    });

    return this.rest(`appointments?${queryPairs([['id', `eq.${appointmentId}`]])}`, {
      method: 'PATCH',
      body,
    });
  }

  async deleteAppointment(appointmentId) {
    return this.rest(`appointments?${queryPairs([['id', `eq.${appointmentId}`]])}`, {
      method: 'DELETE',
    });
  }

  async getPendingPayments(search = '') {
    try {
      return await this.rpc('get_pending_payment_patients', {
        p_search: search.trim() || null,
      });
    } catch {
      return this.getPendingPaymentsManual(search);
    }
  }

  async getPendingPaymentsManual(search = '') {
    const term = cleanSearch(search).toLowerCase();

    const invoices = await this.rest(
      `invoices?${queryPairs([
        ['select', 'id,patient_id,due_amount,total_amount,paid_amount,status,created_at'],
        ['due_amount', 'gt.0'],
        ['order', 'created_at.desc'],
        ['limit', '1000'],
      ])}`
    ).catch(() => []);

    const grouped = new Map();

    for (const invoice of invoices || []) {
      if (!invoice.patient_id) continue;

      const current = grouped.get(invoice.patient_id) || {
        patient_id: invoice.patient_id,
        pending_amount: 0,
        invoice_count: 0,
        last_invoice_id: invoice.id,
        last_invoice_date: invoice.created_at,
      };

      current.pending_amount += Math.max(Number(invoice.due_amount || 0), 0);
      current.invoice_count += 1;

      if (!current.last_invoice_date || new Date(invoice.created_at) > new Date(current.last_invoice_date)) {
        current.last_invoice_id = invoice.id;
        current.last_invoice_date = invoice.created_at;
      }

      grouped.set(invoice.patient_id, current);
    }

    const patients = await this.getPatientsByIds([...grouped.keys()]);
    const byId = new Map(patients.map((patient) => [patient.id, patient]));

    return [...grouped.values()]
      .map((item) => {
        const patient = byId.get(item.patient_id) || {};
        return {
          ...item,
          patient_name: patient.name || 'Patient',
          patient_phone: patient.phone || '',
          patient_code: patient.patient_code || '',
        };
      })
      .filter((item) => {
        if (!term) return true;

        return (
          String(item.patient_name || '').toLowerCase().includes(term) ||
          String(item.patient_phone || '').toLowerCase().includes(term) ||
          String(item.patient_code || '').toLowerCase().includes(term)
        );
      });
  }

  async getFollowups(filter = 'today', search = '') {
    try {
      return await this.rpc('get_followup_reminders', {
        p_filter: filter,
        p_search: search.trim() || null,
      });
    } catch {
      return this.getAppointments(filter);
    }
  }

  async getStaff() {
    return this.rest(
      `profiles?${queryPairs([
        ['select', 'id,name,email,phone,role,active,created_at'],
        ['order', 'created_at.desc'],
        ['limit', '120'],
      ])}`
    ).catch(() => []);
  }

  async getInvites() {
    return this.rest(
      `staff_invites?${queryPairs([
        ['select', 'id,name,email,role,invite_code,accepted_at,created_at'],
        ['order', 'created_at.desc'],
        ['limit', '120'],
      ])}`
    ).catch(() => []);
  }

  async createStaffInvite(input) {
    try {
      return await this.rpc('create_staff_invite', {
        invitee_email: input.email,
        invitee_name: input.name,
        invitee_role: input.role,
      });
    } catch {
      return this.rpc('create_staff_invite', {
        staff_email: input.email,
        staff_name: input.name,
        staff_role: input.role,
      });
    }
  }

  async getProfilesByIds(ids = []) {
    const cleanIds = [...new Set(ids.filter(Boolean))];

    if (!cleanIds.length) return [];

    return this.rest(
      `profiles?${queryPairs([
        ['select', 'id,name,email,phone,role,active,created_at'],
        ['id', `in.(${cleanIds.join(',')})`],
        ['limit', '1000'],
      ])}`
    ).catch(() => []);
  }

  async updateProfile(profileId, values) {
    const withPhone = compactObject({
      name: values.name,
      email: values.email,
      phone: values.phone,
    });

    try {
      return await this.rest(`profiles?${queryPairs([['id', `eq.${profileId}`]])}`, {
        method: 'PATCH',
        body: withPhone,
      });
    } catch {
      const fallback = compactObject({
        name: values.name,
        email: values.email,
      });

      return this.rest(`profiles?${queryPairs([['id', `eq.${profileId}`]])}`, {
        method: 'PATCH',
        body: fallback,
      });
    }
  }

  async updateStaffProfile(profileId, values) {
    const withPhone = compactObject({
      name: values.name,
      email: values.email,
      phone: values.phone,
      role: values.role,
      active: values.active,
    });

    try {
      return await this.rest(`profiles?${queryPairs([['id', `eq.${profileId}`]])}`, {
        method: 'PATCH',
        body: withPhone,
      });
    } catch {
      const fallback = compactObject({
        name: values.name,
        email: values.email,
        role: values.role,
        active: values.active,
      });

      return this.rest(`profiles?${queryPairs([['id', `eq.${profileId}`]])}`, {
        method: 'PATCH',
        body: fallback,
      });
    }
  }

  async deleteStaffProfile(profileId) {
    return this.rest(`profiles?${queryPairs([['id', `eq.${profileId}`]])}`, {
      method: 'DELETE',
    });
  }

  async deleteInvite(inviteId) {
    return this.rest(`staff_invites?${queryPairs([['id', `eq.${inviteId}`]])}`, {
      method: 'DELETE',
    });
  }

  async createVisit(input, clinicId, doctorId) {
    const body = compactObject({
      clinic_id: input.clinic_id || clinicId,
      patient_id: input.patient_id,
      doctor_id: input.doctor_id || doctorId,
      visit_date: isoOrNull(input.visit_date) || new Date().toISOString(),
      chief_complaint: input.chief_complaint,
      notes: input.notes,
      next_appointment_date: isoOrNull(input.next_appointment_date),
    });

    return this.rest('patient_visits', {
      method: 'POST',
      body,
    });
  }

  async deleteVisit(visitId) {
    return this.rest(`patient_visits?${queryPairs([['id', `eq.${visitId}`]])}`, {
      method: 'DELETE',
    });
  }

  async deleteFileRecord(fileId) {
    return this.rest(`files?${queryPairs([['id', `eq.${fileId}`]])}`, {
      method: 'DELETE',
    });
  }

  async getVisitAudit(search = '') {
    try {
      return await this.rpc('get_owner_visit_audit', {
        p_search: search.trim() || null,
      });
    } catch {
      return this.getVisitAuditManual(search);
    }
  }

  async getVisitAuditManual(search = '') {
    const term = cleanSearch(search).toLowerCase();

    const visits = await this.rest(
      `patient_visits?${queryPairs([
        ['select', '*'],
        ['order', 'created_at.desc'],
        ['limit', '1000'],
      ])}`
    ).catch(() => []);

    const patients = await this.getPatientsByIds(visits.map((visit) => visit.patient_id));
    const doctors = await this.getProfilesByIds(visits.map((visit) => visit.doctor_id));

    const patientMap = new Map(patients.map((patient) => [patient.id, patient]));
    const doctorMap = new Map(doctors.map((doctor) => [doctor.id, doctor]));

    return (visits || [])
      .map((visit) => {
        const patient = patientMap.get(visit.patient_id) || {};
        const doctor = doctorMap.get(visit.doctor_id) || {};

        return {
          visit_id: visit.id,
          patient_id: visit.patient_id,
          patient_name: patient.name || 'Patient',
          patient_phone: patient.phone || '',
          patient_code: patient.patient_code || '',
          doctor_id: visit.doctor_id || '',
          doctor_name: doctor.name || doctor.email || 'Not recorded',
          doctor_role: doctor.role || '',
          visit_date: visit.visit_date || visit.created_at,
          chief_complaint: visit.chief_complaint || visit.complaint || '',
          diagnosis: visit.diagnosis || '',
          notes: visit.notes || visit.doctor_notes || '',
          treatment: visit.treatment || visit.treatment_plan || '',
          next_appointment_date: visit.next_appointment_date || '',
          created_at: visit.created_at || visit.visit_date,
        };
      })
      .filter((item) => {
        if (!term) return true;

        return (
          String(item.patient_name || '').toLowerCase().includes(term) ||
          String(item.patient_phone || '').toLowerCase().includes(term) ||
          String(item.patient_code || '').toLowerCase().includes(term) ||
          String(item.doctor_name || '').toLowerCase().includes(term) ||
          String(item.chief_complaint || '').toLowerCase().includes(term)
        );
      });
  }

  async getGalleryAudit(search = '') {
    try {
      return await this.rpc('get_owner_gallery_audit', {
        p_search: search.trim() || null,
      });
    } catch {
      return this.getGalleryAuditManual(search);
    }
  }

  async getGalleryAuditManual(search = '') {
    const term = cleanSearch(search).toLowerCase();

    const files = await this.rest(
      `files?${queryPairs([
        ['select', '*'],
        ['order', 'created_at.desc'],
        ['limit', '1000'],
      ])}`
    ).catch(() => []);

    const patients = await this.getPatientsByIds(files.map((file) => file.patient_id));
    const uploaders = await this.getProfilesByIds(files.map((file) => file.uploaded_by));

    const patientMap = new Map(patients.map((patient) => [patient.id, patient]));
    const uploaderMap = new Map(uploaders.map((uploader) => [uploader.id, uploader]));

    return (files || [])
      .map((file) => {
        const patient = patientMap.get(file.patient_id) || {};
        const uploader = uploaderMap.get(file.uploaded_by) || {};

        return {
          file_id: file.id,
          patient_id: file.patient_id,
          patient_name: patient.name || 'Patient',
          patient_phone: patient.phone || '',
          patient_code: patient.patient_code || '',
          file_type: file.file_type || 'other',
          file_name: file.file_name || 'Clinical file',
          file_url: file.file_url || '',
          uploaded_by: file.uploaded_by || '',
          uploaded_by_name: uploader.name || uploader.email || 'Not recorded',
          uploaded_by_role: uploader.role || '',
          created_at: file.created_at,
        };
      })
      .filter((item) => {
        if (!term) return true;

        return (
          String(item.patient_name || '').toLowerCase().includes(term) ||
          String(item.patient_phone || '').toLowerCase().includes(term) ||
          String(item.patient_code || '').toLowerCase().includes(term) ||
          String(item.file_type || '').toLowerCase().includes(term) ||
          String(item.file_name || '').toLowerCase().includes(term) ||
          String(item.uploaded_by_name || '').toLowerCase().includes(term)
        );
      });
  }

  async getPaymentAudit() {
    const [payments, invoices] = await Promise.all([
      this.rest(
        `payments?${queryPairs([
          ['select', '*'],
          ['order', 'created_at.desc'],
          ['limit', '1000'],
        ])}`
      ).catch(() => []),

      this.rest(
        `invoices?${queryPairs([
          ['select', '*'],
          ['order', 'created_at.desc'],
          ['limit', '1000'],
        ])}`
      ).catch(() => []),
    ]);

    const patientIds = [
      ...(payments || []).map((payment) => payment.patient_id),
      ...(invoices || []).map((invoice) => invoice.patient_id),
    ];

    const patients = await this.getPatientsByIds(patientIds);
    const patientMap = new Map(patients.map((patient) => [patient.id, patient]));

    return {
      payments: (payments || []).map((payment) => {
        const patient = patientMap.get(payment.patient_id) || {};

        return {
          payment_id: payment.id,
          patient_id: payment.patient_id,
          patient_name: patient.name || 'Patient',
          patient_phone: patient.phone || '',
          patient_code: patient.patient_code || '',
          invoice_id: payment.invoice_id || '',
          amount: Number(payment.amount || 0),
          payment_method: payment.payment_method || '',
          notes: payment.notes || '',
          created_at: payment.created_at,
        };
      }),

      invoices: (invoices || []).map((invoice) => {
        const patient = patientMap.get(invoice.patient_id) || {};

        return {
          invoice_id: invoice.id,
          patient_id: invoice.patient_id,
          patient_name: patient.name || 'Patient',
          patient_phone: patient.phone || '',
          patient_code: patient.patient_code || '',
          invoice_type: invoice.invoice_type || '',
          total_amount: Number(invoice.total_amount || 0),
          paid_amount: Number(invoice.paid_amount || 0),
          due_amount: Number(invoice.due_amount || 0),
          status: invoice.status || '',
          created_at: invoice.created_at,
        };
      }),
    };
  }

  async getAppointmentsAudit() {
    const appointments = await this.rest(
      `appointments?${queryPairs([
        ['select', '*'],
        ['order', 'appointment_time.desc'],
        ['limit', '1000'],
      ])}`
    ).catch(() => []);

    const patients = await this.getPatientsByIds(appointments.map((item) => item.patient_id));
    const doctors = await this.getProfilesByIds(appointments.map((item) => item.doctor_id));

    const patientMap = new Map(patients.map((patient) => [patient.id, patient]));
    const doctorMap = new Map(doctors.map((doctor) => [doctor.id, doctor]));

    return (appointments || []).map((appointment) => {
      const patient = patientMap.get(appointment.patient_id) || {};
      const doctor = doctorMap.get(appointment.doctor_id) || {};

      return {
        appointment_id: appointment.id,
        patient_id: appointment.patient_id,
        patient_name: patient.name || 'Patient',
        patient_phone: patient.phone || '',
        patient_code: patient.patient_code || '',
        doctor_id: appointment.doctor_id || '',
        doctor_name: doctor.name || doctor.email || '',
        doctor_role: doctor.role || '',
        appointment_time: appointment.appointment_time,
        status: appointment.status || '',
        notes: appointment.notes || '',
        created_at: appointment.created_at,
      };
    });
  }

  async getOwnerExportBundle() {
    const [summary, patients, visits, gallery, pending, staff, appointments, paymentAudit] = await Promise.all([
      this.getOwnerSummary().catch(() => ({})),
      this.getPatients().catch(() => []),
      this.getVisitAudit().catch(() => []),
      this.getGalleryAudit().catch(() => []),
      this.getPendingPayments().catch(() => []),
      this.getStaff().catch(() => []),
      this.getAppointmentsAudit().catch(() => []),
      this.getPaymentAudit().catch(() => ({ payments: [], invoices: [] })),
    ]);

    return {
      exported_at: new Date().toISOString(),
      summary,
      patients,
      visits,
      gallery,
      pending,
      staff,
      appointments,
      payments: paymentAudit.payments || [],
      invoices: paymentAudit.invoices || [],
    };
  }


  async updateClinic(clinicId, values) {
    const standardValues = {
      name: values.name,
      phone: values.phone,
      email: values.email,
      address: values.address,
    };

    try {
      return await this.rest(
        `clinics?${queryPairs([['id', `eq.${clinicId}`]])}`,
        {
          method: 'PATCH',
          body: standardValues,
        }
      );
    } catch {
      const legacyValues = {
        clinic_name: values.name,
        clinic_phone: values.phone,
        clinic_email: values.email,
        clinic_address: values.address,
      };

      return this.rest(
        `clinics?${queryPairs([['id', `eq.${clinicId}`]])}`,
        {
          method: 'PATCH',
          body: legacyValues,
        }
      );
    }
  }
}

export const dmsApi = new DmsApi();
