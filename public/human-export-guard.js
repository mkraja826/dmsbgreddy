// Keeps owner exports human-readable by removing database UUID/internal reference fields
// from CSV and JSON downloads created in the clinic dashboard.
(() => {
  const NativeBlob = window.Blob;

  const blockedExact = new Set([
    'id',
    'clinic_id',
    'patient_id',
    'doctor_id',
    'visit_id',
    'file_id',
    'invoice_id',
    'payment_id',
    'appointment_id',
    'profile_id',
    'staff_id',
    'owner_id',
    'uploaded_by',
    'collected_by',
    'created_by',
    'updated_by',
    'deleted_by',
  ]);

  const blockedPatterns = [
    /(^|_)uuid$/i,
    /(^|_)token$/i,
    /(^|_)session$/i,
    /(^|_)access_token$/i,
    /(^|_)refresh_token$/i,
    /(^|_)password$/i,
    /(^|_)clinic_ref$/i,
  ];

  const headerLabels = {
    patient_code: 'Patient ID',
    patient_name: 'Patient Name',
    patient_phone: 'Phone Number',
    name: 'Name',
    phone: 'Phone Number',
    age: 'Age',
    gender: 'Gender',
    email: 'Email',
    visit_date: 'Visit Date',
    chief_complaint: 'Chief Complaint',
    diagnosis: 'Diagnosis',
    notes: 'Notes',
    treatment: 'Treatment',
    next_appointment_date: 'Next Follow-up',
    doctor_name: 'Doctor',
    doctor_role: 'Doctor Role',
    uploaded_by_name: 'Uploaded By',
    uploaded_by_role: 'Uploader Role',
    file_type: 'File Type',
    file_name: 'File Name',
    file_url: 'File Link',
    amount: 'Amount',
    payment_method: 'Payment Method',
    payment_category: 'Payment Category',
    total_amount: 'Total Amount',
    paid_amount: 'Paid Amount',
    due_amount: 'Due Amount',
    invoice_type: 'Invoice Type',
    status: 'Status',
    appointment_time: 'Appointment Time',
    role: 'Role',
    active: 'Active',
    invite_code: 'Invite Code',
    accepted_at: 'Accepted At',
    created_at: 'Created At',
    updated_at: 'Updated At',
    exported_at: 'Exported At',
  };

  function isBlockedKey(key) {
    const normalized = String(key || '').trim();
    const lower = normalized.toLowerCase();

    if (lower === 'patient_code') return false;
    if (blockedExact.has(lower)) return true;
    if (/^[a-z_]*id$/i.test(lower) && lower !== 'patient_id_display' && lower !== 'patient_code') return true;

    return blockedPatterns.some((pattern) => pattern.test(lower));
  }

  function looksLikeUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim());
  }

  function labelHeader(key) {
    const lower = String(key || '').trim().toLowerCase();
    if (headerLabels[lower]) return headerLabels[lower];
    return String(key || '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function parseCsvLine(line) {
    const cells = [];
    let current = '';
    let quoted = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      const next = line[i + 1];

      if (char === '"' && quoted && next === '"') {
        current += '"';
        i += 1;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === ',' && !quoted) {
        cells.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    cells.push(current);
    return cells;
  }

  function csvEscape(value) {
    const text = String(value ?? '').replace(/\r?\n|\r/g, ' ').trim();
    if (/[",]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  }

  function sanitizeCsv(text) {
    const rows = String(text || '').split(/\r?\n/).filter(Boolean);
    if (rows.length < 2) return text;

    const headers = parseCsvLine(rows[0]);
    const keepIndexes = headers
      .map((header, index) => ({ header, index }))
      .filter(({ header }) => !isBlockedKey(header))
      .map(({ index }) => index);

    if (!keepIndexes.length || keepIndexes.length === headers.length) return text;

    const nextRows = [keepIndexes.map((index) => csvEscape(labelHeader(headers[index]))).join(',')];

    for (const row of rows.slice(1)) {
      const cells = parseCsvLine(row);
      nextRows.push(keepIndexes.map((index) => {
        const value = cells[index] ?? '';
        return csvEscape(looksLikeUuid(value) ? '' : value);
      }).join(','));
    }

    return nextRows.join('\n');
  }

  function sanitizeJsonValue(value) {
    if (Array.isArray(value)) return value.map(sanitizeJsonValue);
    if (!value || typeof value !== 'object') return looksLikeUuid(value) ? '' : value;

    const output = {};
    for (const [key, child] of Object.entries(value)) {
      if (isBlockedKey(key)) continue;
      const cleanKey = headerLabels[key.toLowerCase()] || key;
      output[cleanKey] = sanitizeJsonValue(child);
    }
    return output;
  }

  function sanitizeJson(text) {
    try {
      return JSON.stringify(sanitizeJsonValue(JSON.parse(text)), null, 2);
    } catch {
      return text;
    }
  }

  window.Blob = function HumanReadableExportBlob(parts = [], options = {}) {
    const type = String(options?.type || '').toLowerCase();

    if (parts.length === 1 && typeof parts[0] === 'string') {
      if (type.includes('text/csv')) return new NativeBlob([sanitizeCsv(parts[0])], options);
      if (type.includes('application/json')) return new NativeBlob([sanitizeJson(parts[0])], options);
    }

    return new NativeBlob(parts, options);
  };

  window.Blob.prototype = NativeBlob.prototype;
})();
