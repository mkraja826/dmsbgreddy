import { dmsApi, formatDateTime, roleLabel } from './dmsClient.js';

const REPORTS = {
  Patients: {
    description: 'Patient names, phone numbers, age and registration details.',
    sheet: 'Patients',
    rows: (bundle) => bundle.patients || [],
    columns: [
      ['Patient ID', 'patient_code'],
      ['Patient Name', 'name'],
      ['Phone Number', 'phone'],
      ['Age', 'age'],
      ['Gender', (row) => humanText(row.gender)],
      ['Added On', (row) => displayDate(row.created_at)],
    ],
  },
  Appointments: {
    description: 'Patient schedule, appointment time, doctor, status and notes.',
    sheet: 'Appointments',
    rows: (bundle) => bundle.appointments || [],
    columns: [
      ['Patient Name', 'patient_name'],
      ['Phone Number', 'patient_phone'],
      ['Patient ID', 'patient_code'],
      ['Appointment Date & Time', (row) => displayDate(row.appointment_time)],
      ['Doctor', 'doctor_name'],
      ['Status', (row) => humanText(row.status)],
      ['Notes', 'notes'],
    ],
  },
  Visits: {
    description: 'Treatment visits, main complaint, doctor and next appointment.',
    sheet: 'Visits',
    rows: (bundle) => bundle.visits || [],
    columns: [
      ['Patient Name', 'patient_name'],
      ['Phone Number', 'patient_phone'],
      ['Patient ID', 'patient_code'],
      ['Visit Date', (row) => displayDate(row.visit_date || row.created_at)],
      ['Main Complaint', 'chief_complaint'],
      ['Doctor', 'doctor_name'],
      ['Notes', 'notes'],
      ['Next Appointment', (row) => displayDate(row.next_appointment_date)],
    ],
  },
  Payments: {
    description: 'Patient payment history, amount, payment method and date.',
    sheet: 'Payments',
    rows: (bundle) => bundle.payments || [],
    columns: [
      ['Patient Name', 'patient_name'],
      ['Phone Number', 'patient_phone'],
      ['Patient ID', 'patient_code'],
      ['Amount (₹)', (row) => numeric(row.amount)],
      ['Payment Method', (row) => humanText(row.payment_method)],
      ['Notes', 'notes'],
      ['Payment Date', (row) => displayDate(row.created_at)],
    ],
  },
  Invoices: {
    description: 'Invoice total, amount paid, pending amount and payment status.',
    sheet: 'Invoices',
    rows: (bundle) => bundle.invoices || [],
    columns: [
      ['Patient Name', 'patient_name'],
      ['Phone Number', 'patient_phone'],
      ['Patient ID', 'patient_code'],
      ['Invoice Type', (row) => humanText(row.invoice_type)],
      ['Total Amount (₹)', (row) => numeric(row.total_amount)],
      ['Amount Paid (₹)', (row) => numeric(row.paid_amount)],
      ['Pending Amount (₹)', (row) => numeric(row.due_amount)],
      ['Status', (row) => humanText(row.status)],
      ['Invoice Date', (row) => displayDate(row.created_at)],
    ],
  },
  'Clinical files': {
    description: 'Prescription, X-ray and clinical photo upload details.',
    sheet: 'Clinical Files',
    rows: (bundle) => bundle.gallery || [],
    columns: [
      ['Patient Name', 'patient_name'],
      ['Phone Number', 'patient_phone'],
      ['Patient ID', 'patient_code'],
      ['File Type', (row) => humanText(row.file_type)],
      ['File Name', 'file_name'],
      ['Uploaded By', 'uploaded_by_name'],
      ['Uploader Role', (row) => row.uploaded_by_role ? roleLabel(row.uploaded_by_role) : ''],
      ['Uploaded On', (row) => displayDate(row.created_at)],
      ['File Link', 'file_url'],
    ],
  },
  Staff: {
    description: 'Staff names, contact details, role and account status.',
    sheet: 'Staff',
    rows: (bundle) => bundle.staff || [],
    columns: [
      ['Staff Name', 'name'],
      ['Email Address', 'email'],
      ['Phone Number', 'phone'],
      ['Role', (row) => roleLabel(row.role)],
      ['Account Status', (row) => row.active === false ? 'Inactive' : 'Active'],
      ['Added On', (row) => displayDate(row.created_at)],
    ],
  },
};

const encoder = new TextEncoder();
const CRC_TABLE = new Uint32Array(256);
for (let index = 0; index < 256; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  CRC_TABLE[index] = value >>> 0;
}

function numeric(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function humanText(value) {
  return String(value || '')
    .replaceAll('_', ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function displayDate(value) {
  if (!value) return '';
  try {
    return formatDateTime(value);
  } catch {
    return String(value);
  }
}

function xml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function safeSheetName(value) {
  return String(value || 'Report').replace(/[\\/?*\[\]:]/g, ' ').slice(0, 31) || 'Report';
}

function columnName(index) {
  let value = index + 1;
  let result = '';
  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26);
  }
  return result;
}

function columnValue(record, accessor) {
  return typeof accessor === 'function' ? accessor(record) : record?.[accessor] ?? '';
}

function stringCell(reference, value, style = 4) {
  return `<c r="${reference}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
}

function numberCell(reference, value, style = 5) {
  return `<c r="${reference}" s="${style}"><v>${Number(value) || 0}</v></c>`;
}

function buildSheetXml(title, definition, sourceRows) {
  const records = Array.isArray(sourceRows) ? sourceRows : [];
  const columns = definition.columns;
  const lastColumn = columnName(Math.max(0, columns.length - 1));
  const lastRow = Math.max(5, records.length + 4);
  const widths = columns.map(([heading]) => Math.max(12, Math.min(38, Math.ceil(String(heading).length * 1.3 + 4))));
  const cols = widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join('');
  const titleRow = `<row r="1" ht="26" customHeight="1">${stringCell('A1', title, 1)}</row>`;
  const subtitleRow = `<row r="2">${stringCell('A2', `Exported on ${new Date().toLocaleString('en-IN')}`, 2)}</row>`;
  const headerRow = `<row r="4">${columns.map(([heading], index) => stringCell(`${columnName(index)}4`, heading, 3)).join('')}</row>`;
  const dataRows = records.length
    ? records.map((record, rowIndex) => {
        const rowNumber = rowIndex + 5;
        const cells = columns.map(([, accessor], columnIndex) => {
          const value = columnValue(record, accessor);
          const reference = `${columnName(columnIndex)}${rowNumber}`;
          return typeof value === 'number' && Number.isFinite(value)
            ? numberCell(reference, value)
            : stringCell(reference, value, 4);
        }).join('');
        return `<row r="${rowNumber}">${cells}</row>`;
      }).join('')
    : `<row r="5">${stringCell('A5', 'No records found for this report.', 2)}</row>`;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${lastColumn}${lastRow}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${cols}</cols><sheetData>${titleRow}${subtitleRow}<row r="3"/>${headerRow}${dataRows}</sheetData><autoFilter ref="A4:${lastColumn}${lastRow}"/><mergeCells count="2"><mergeCell ref="A1:${lastColumn}1"/><mergeCell ref="A2:${lastColumn}2"/></mergeCells><pageMargins left="0.4" right="0.4" top="0.6" bottom="0.6" header="0.2" footer="0.2"/></worksheet>`;
}

function summaryDefinition(bundle) {
  const summary = bundle.summary || {};
  return {
    title: 'Sri B.G Reddy Dental Clinic - Summary',
    sheet: 'Clinic Summary',
    columns: [['Clinic Information', 0], ['Value', 1]],
    rows: [
      ["Today's Revenue (₹)", numeric(summary.today_revenue)],
      ['Pending Payments (₹)', numeric(summary.pending_payments)],
      ['Waiting Patients', numeric(summary.waiting_count)],
      ['Completed Today', numeric(summary.completed_count)],
      ['Patients Today', numeric(summary.today_patient_count)],
      ['Total Patients', (bundle.patients || []).length],
      ['Total Appointments', (bundle.appointments || []).length],
      ['Total Visits', (bundle.visits || []).length],
      ['Total Payments', (bundle.payments || []).length],
      ['Clinical Files', (bundle.gallery || []).length],
      ['Staff Accounts', (bundle.staff || []).length],
    ],
  };
}

function workbookFiles(bundle, selectedTitles = null) {
  const selected = selectedTitles || Object.keys(REPORTS);
  const sheets = [];

  if (!selectedTitles) {
    const summary = summaryDefinition(bundle);
    sheets.push({ name: summary.sheet, xml: buildSheetXml(summary.title, summary, summary.rows) });
  }

  selected.forEach((title) => {
    const definition = REPORTS[title];
    if (!definition) return;
    sheets.push({
      name: safeSheetName(definition.sheet),
      xml: buildSheetXml(`Sri B.G Reddy Dental Clinic - ${title}`, definition, definition.rows(bundle)),
    });
  });

  const sheetOverrides = sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('');
  const workbookSheets = sheets.map((sheet, index) => `<sheet name="${xml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join('');
  const workbookRelationships = sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join('');
  const stylesRelationshipId = sheets.length + 1;

  const files = [
    {
      name: '[Content_Types].xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheetOverrides}</Types>`,
    },
    {
      name: '_rels/.rels',
      data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    },
    {
      name: 'xl/workbook.xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets>${workbookSheets}</sheets></workbook>`,
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${workbookRelationships}<Relationship Id="rId${stylesRelationshipId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    },
    {
      name: 'xl/styles.xml',
      data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="16"/><name val="Calibri"/></font><font><b/><color rgb="FF101828"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF155EEF"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEAF1FF"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="thin"><color rgb="FFE4EAF2"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="4" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>',
    },
  ];

  sheets.forEach((sheet, index) => files.push({ name: `xl/worksheets/sheet${index + 1}.xml`, data: sheet.xml }));
  return files;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function littleEndian16(value) {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value, true);
  return bytes;
}

function littleEndian32(value) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value >>> 0, true);
  return bytes;
}

function combine(parts) {
  const size = parts.reduce((total, part) => total + part.length, 0);
  const result = new Uint8Array(size);
  let offset = 0;
  parts.forEach((part) => {
    result.set(part, offset);
    offset += part.length;
  });
  return result;
}

function dosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  return {
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
  };
}

function createZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const stamp = dosDateTime();

  files.forEach((file) => {
    const name = encoder.encode(file.name);
    const data = encoder.encode(file.data);
    const checksum = crc32(data);
    const localHeader = combine([
      littleEndian32(0x04034b50), littleEndian16(20), littleEndian16(0x0800), littleEndian16(0),
      littleEndian16(stamp.time), littleEndian16(stamp.date), littleEndian32(checksum),
      littleEndian32(data.length), littleEndian32(data.length), littleEndian16(name.length), littleEndian16(0), name,
    ]);
    localParts.push(localHeader, data);

    const centralHeader = combine([
      littleEndian32(0x02014b50), littleEndian16(20), littleEndian16(20), littleEndian16(0x0800), littleEndian16(0),
      littleEndian16(stamp.time), littleEndian16(stamp.date), littleEndian32(checksum),
      littleEndian32(data.length), littleEndian32(data.length), littleEndian16(name.length), littleEndian16(0),
      littleEndian16(0), littleEndian16(0), littleEndian16(0), littleEndian32(0), littleEndian32(offset), name,
    ]);
    centralParts.push(centralHeader);
    offset += localHeader.length + data.length;
  });

  const centralDirectory = combine(centralParts);
  const end = combine([
    littleEndian32(0x06054b50), littleEndian16(0), littleEndian16(0),
    littleEndian16(files.length), littleEndian16(files.length), littleEndian32(centralDirectory.length),
    littleEndian32(offset), littleEndian16(0),
  ]);
  return combine([...localParts, centralDirectory, end]);
}

function saveXlsx(files, filename) {
  const blob = new Blob([createZip(files)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function setBusy(button, busy) {
  if (!button) return;
  const isCard = button.classList.contains('oc-report-card');
  button.disabled = busy;
  button.setAttribute('aria-busy', busy ? 'true' : 'false');
  if (isCard) {
    const badge = button.querySelector('b');
    if (badge) badge.textContent = busy ? 'Preparing…' : 'Excel';
  } else {
    if (busy) button.dataset.originalText = button.textContent;
    button.textContent = busy ? 'Preparing Excel file…' : button.dataset.originalText || 'Download complete Excel file';
  }
}

async function exportExcel(selectedTitles = null, button = null) {
  setBusy(button, true);
  try {
    const bundle = await dmsApi.getOwnerExportBundle();
    const date = new Date().toISOString().slice(0, 10);
    const filename = selectedTitles
      ? `bg-reddy-${safeSheetName(selectedTitles[0]).toLowerCase().replaceAll(' ', '-')}-${date}.xlsx`
      : `bg-reddy-clinic-complete-report-${date}.xlsx`;
    saveXlsx(workbookFiles(bundle, selectedTitles), filename);
  } catch (error) {
    window.alert(error?.message || 'The Excel file could not be prepared. Please refresh and try again.');
  } finally {
    setBusy(button, false);
  }
}

function decorateReportsPage() {
  const hero = document.querySelector('.oc-backup-hero');
  if (!hero) return;

  const topTitle = document.querySelector('.oc-topbar-title h1');
  const topText = document.querySelector('.oc-topbar-title p');
  if (topTitle) topTitle.textContent = 'Excel reports';
  if (topText) topText.textContent = 'Download clinic records as easy-to-read Excel files.';

  const navLabel = Array.from(document.querySelectorAll('.oc-nav b'))
    .find((item) => item.textContent.trim().toLowerCase().includes('report'));
  if (navLabel) navLabel.textContent = 'Excel reports';

  const eyebrow = hero.querySelector('.oc-eyebrow');
  const heading = hero.querySelector('h2');
  const paragraph = hero.querySelector('p');
  const primaryButton = hero.querySelector('.oc-primary-button');
  if (eyebrow) eyebrow.textContent = 'Clinic Excel reports';
  if (heading) heading.textContent = 'Download clinic records in Excel';
  if (paragraph) paragraph.textContent = 'Choose one report below, or download all clinic records in one Excel file.';
  if (primaryButton && primaryButton.getAttribute('aria-busy') !== 'true') primaryButton.textContent = 'Download complete Excel file';

  document.querySelectorAll('.oc-report-card').forEach((card) => {
    const title = card.querySelector('strong')?.textContent?.trim();
    const definition = REPORTS[title];
    if (!definition) return;
    const description = card.querySelector('p');
    const badge = card.querySelector('b');
    if (description) description.textContent = definition.description;
    if (badge && card.getAttribute('aria-busy') !== 'true') badge.textContent = 'Excel';
    card.setAttribute('aria-label', `Download ${title} Excel file`);
  });
}

document.addEventListener('click', (event) => {
  const mainButton = event.target.closest('.oc-backup-hero .oc-primary-button');
  if (mainButton) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    exportExcel(null, mainButton);
    return;
  }

  const card = event.target.closest('.oc-report-card');
  if (!card) return;
  const title = card.querySelector('strong')?.textContent?.trim();
  if (!REPORTS[title]) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  exportExcel([title], card);
}, true);

const observer = new MutationObserver(decorateReportsPage);
observer.observe(document.documentElement, { childList: true, subtree: true });
decorateReportsPage();
