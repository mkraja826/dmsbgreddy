import { dmsApi, formatDateTime, roleLabel } from './dmsClient.js';

const REPORTS = {
  Patients: {
    description: 'Patient names, phone numbers, age and registration details.',
    sheetName: 'Patients',
    columns: [
      ['Patient ID', 'patient_code'],
      ['Patient Name', 'name'],
      ['Phone Number', 'phone'],
      ['Age', 'age'],
      ['Gender', (row) => humanText(row.gender)],
      ['Added On', (row) => displayDate(row.created_at)],
    ],
    rows: (bundle) => bundle.patients || [],
  },
  Appointments: {
    description: 'Patient schedule, appointment time, doctor, status and notes.',
    sheetName: 'Appointments',
    columns: [
      ['Patient Name', 'patient_name'],
      ['Phone Number', 'patient_phone'],
      ['Patient ID', 'patient_code'],
      ['Appointment Date & Time', (row) => displayDate(row.appointment_time)],
      ['Doctor', 'doctor_name'],
      ['Status', (row) => humanText(row.status)],
      ['Notes', 'notes'],
    ],
    rows: (bundle) => bundle.appointments || [],
  },
  Visits: {
    description: 'Treatment visits, main complaint, doctor and next appointment.',
    sheetName: 'Visits',
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
    rows: (bundle) => bundle.visits || [],
  },
  Payments: {
    description: 'Patient payment history, amount, payment method and date.',
    sheetName: 'Payments',
    columns: [
      ['Patient Name', 'patient_name'],
      ['Phone Number', 'patient_phone'],
      ['Patient ID', 'patient_code'],
      ['Amount (₹)', (row) => numberValue(row.amount)],
      ['Payment Method', (row) => humanText(row.payment_method)],
      ['Notes', 'notes'],
      ['Payment Date', (row) => displayDate(row.created_at)],
    ],
    rows: (bundle) => bundle.payments || [],
  },
  Invoices: {
    description: 'Invoice total, amount paid, pending amount and payment status.',
    sheetName: 'Invoices',
    columns: [
      ['Patient Name', 'patient_name'],
      ['Phone Number', 'patient_phone'],
      ['Patient ID', 'patient_code'],
      ['Invoice Type', (row) => humanText(row.invoice_type)],
      ['Total Amount (₹)', (row) => numberValue(row.total_amount)],
      ['Amount Paid (₹)', (row) => numberValue(row.paid_amount)],
      ['Pending Amount (₹)', (row) => numberValue(row.due_amount)],
      ['Status', (row) => humanText(row.status)],
      ['Invoice Date', (row) => displayDate(row.created_at)],
    ],
    rows: (bundle) => bundle.invoices || [],
  },
  'Clinical files': {
    description: 'Prescription, X-ray and clinical photo upload details.',
    sheetName: 'Clinical Files',
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
    rows: (bundle) => bundle.gallery || [],
  },
  Staff: {
    description: 'Staff names, contact details, role and account status.',
    sheetName: 'Staff',
    columns: [
      ['Staff Name', 'name'],
      ['Email Address', 'email'],
      ['Phone Number', 'phone'],
      ['Role', (row) => roleLabel(row.role)],
      ['Account Status', (row) => row.active === false ? 'Inactive' : 'Active'],
      ['Added On', (row) => displayDate(row.created_at)],
    ],
    rows: (bundle) => bundle.staff || [],
  },
};

function numberValue(value) {
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

function xmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function cell(value, style = '') {
  const isNumber = typeof value === 'number' && Number.isFinite(value);
  const type = isNumber ? 'Number' : 'String';
  const styleAttribute = style ? ` ss:StyleID="${style}"` : '';
  return `<Cell${styleAttribute}><Data ss:Type="${type}">${xmlEscape(value)}</Data></Cell>`;
}

function row(cells, style = '') {
  const styleAttribute = style ? ` ss:StyleID="${style}"` : '';
  return `<Row${styleAttribute}>${cells.join('')}</Row>`;
}

function columnValue(record, accessor) {
  if (typeof accessor === 'function') return accessor(record);
  return record?.[accessor] ?? '';
}

function safeSheetName(name) {
  return String(name || 'Report').replace(/[\\/?*\[\]:]/g, ' ').slice(0, 31) || 'Report';
}

function buildWorksheet(title, definition, sourceRows) {
  const columns = definition.columns;
  const records = Array.isArray(sourceRows) ? sourceRows : [];
  const widths = columns.map(([heading]) => Math.max(90, Math.min(220, String(heading).length * 9 + 32)));
  const columnXml = widths.map((width) => `<Column ss:AutoFitWidth="0" ss:Width="${width}"/>`).join('');
  const titleRow = `<Row ss:Height="26"><Cell ss:StyleID="Title" ss:MergeAcross="${Math.max(0, columns.length - 1)}"><Data ss:Type="String">${xmlEscape(title)}</Data></Cell></Row>`;
  const subtitleRow = `<Row><Cell ss:StyleID="Subtle" ss:MergeAcross="${Math.max(0, columns.length - 1)}"><Data ss:Type="String">Exported on ${xmlEscape(new Date().toLocaleString('en-IN'))}</Data></Cell></Row>`;
  const headerRow = row(columns.map(([heading]) => cell(heading, 'Header')));
  const dataRows = records.length
    ? records.map((record) => row(columns.map(([, accessor]) => cell(columnValue(record, accessor), typeof columnValue(record, accessor) === 'number' ? 'Number' : 'Body')))).join('')
    : row([cell('No records found for this report.', 'Subtle')]);

  return `<Worksheet ss:Name="${xmlEscape(safeSheetName(definition.sheetName))}"><Table>${columnXml}${titleRow}${subtitleRow}<Row/>${headerRow}${dataRows}</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>4</SplitHorizontal><TopRowBottomPane>4</TopRowBottomPane><ProtectObjects>False</ProtectObjects><ProtectScenarios>False</ProtectScenarios></WorksheetOptions></Worksheet>`;
}

function buildSummaryWorksheet(bundle) {
  const summary = bundle.summary || {};
  const records = [
    ['Today\'s Revenue (₹)', numberValue(summary.today_revenue)],
    ['Pending Payments (₹)', numberValue(summary.pending_payments)],
    ['Waiting Patients', numberValue(summary.waiting_count)],
    ['Completed Today', numberValue(summary.completed_count)],
    ['Patients Today', numberValue(summary.today_patient_count)],
    ['Total Patients', (bundle.patients || []).length],
    ['Total Appointments', (bundle.appointments || []).length],
    ['Total Visits', (bundle.visits || []).length],
    ['Total Payments', (bundle.payments || []).length],
    ['Clinical Files', (bundle.gallery || []).length],
    ['Staff Accounts', (bundle.staff || []).length],
  ];
  const definition = {
    sheetName: 'Clinic Summary',
    columns: [['Clinic Information', 0], ['Value', 1]],
  };
  return buildWorksheet('Sri B.G Reddy Dental Clinic - Summary', definition, records);
}

function buildWorkbook(bundle, selectedTitles = null) {
  const titles = selectedTitles || Object.keys(REPORTS);
  const worksheets = [];
  if (!selectedTitles) worksheets.push(buildSummaryWorksheet(bundle));
  for (const title of titles) {
    const definition = REPORTS[title];
    if (!definition) continue;
    worksheets.push(buildWorksheet(`Sri B.G Reddy Dental Clinic - ${title}`, definition, definition.rows(bundle)));
  }

  return `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40"><DocumentProperties xmlns="urn:schemas-microsoft-com:office:office"><Author>Sri B.G Reddy Dental Clinic</Author><Created>${new Date().toISOString()}</Created></DocumentProperties><Styles><Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Bottom"/><Borders/><Font ss:FontName="Calibri" ss:Size="11"/><Interior/><NumberFormat/><Protection/></Style><Style ss:ID="Title"><Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#155EEF" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style><Style ss:ID="Header"><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#101828"/><Interior ss:Color="#EAF1FF" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#C7D7FE"/></Borders><Alignment ss:Vertical="Center" ss:WrapText="1"/></Style><Style ss:ID="Body"><Alignment ss:Vertical="Top" ss:WrapText="1"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E4EAF2"/></Borders></Style><Style ss:ID="Number"><Alignment ss:Vertical="Top"/><NumberFormat ss:Format="#,##0.00"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E4EAF2"/></Borders></Style><Style ss:ID="Subtle"><Font ss:FontName="Calibri" ss:Size="10" ss:Color="#667085"/><Alignment ss:WrapText="1"/></Style></Styles>${worksheets.join('')}</Workbook>`;
}

function saveWorkbook(xml, filename) {
  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function exportReports(selectedTitles = null, button = null) {
  const originalText = button?.textContent;
  if (button) {
    button.disabled = true;
    button.textContent = 'Preparing Excel file…';
  }
  try {
    const bundle = await dmsApi.getOwnerExportBundle();
    const date = new Date().toISOString().slice(0, 10);
    const filename = selectedTitles
      ? `bg-reddy-${safeSheetName(selectedTitles[0]).toLowerCase().replaceAll(' ', '-')}-${date}.xls`
      : `bg-reddy-clinic-complete-report-${date}.xls`;
    saveWorkbook(buildWorkbook(bundle, selectedTitles), filename);
  } catch (error) {
    window.alert(error?.message || 'The Excel file could not be prepared. Please refresh and try again.');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = originalText;
    }
  }
}

function decorateReportsPage() {
  const hero = document.querySelector('.oc-backup-hero');
  if (!hero) return;

  const topTitle = document.querySelector('.oc-topbar-title h1');
  const topText = document.querySelector('.oc-topbar-title p');
  if (topTitle) topTitle.textContent = 'Excel reports';
  if (topText) topText.textContent = 'Download clinic records as easy-to-read Excel files.';

  const navLabel = Array.from(document.querySelectorAll('.oc-nav b')).find((item) => item.textContent.trim().toLowerCase().includes('report'));
  if (navLabel) navLabel.textContent = 'Excel reports';

  const eyebrow = hero.querySelector('.oc-eyebrow');
  const heading = hero.querySelector('h2');
  const paragraph = hero.querySelector('p');
  const primaryButton = hero.querySelector('.oc-primary-button');
  if (eyebrow) eyebrow.textContent = 'Clinic Excel reports';
  if (heading) heading.textContent = 'Download clinic records in Excel';
  if (paragraph) paragraph.textContent = 'Choose one report below, or download all clinic records in one Excel file.';
  if (primaryButton) primaryButton.textContent = 'Download complete Excel file';

  document.querySelectorAll('.oc-report-card').forEach((card) => {
    const title = card.querySelector('strong')?.textContent?.trim();
    const definition = REPORTS[title];
    if (!definition) return;
    const description = card.querySelector('p');
    const badge = card.querySelector('b');
    if (description) description.textContent = definition.description;
    if (badge) badge.textContent = 'Excel';
    card.setAttribute('aria-label', `Download ${title} Excel file`);
  });
}

document.addEventListener('click', (event) => {
  const mainButton = event.target.closest('.oc-backup-hero .oc-primary-button');
  if (mainButton) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    exportReports(null, mainButton);
    return;
  }

  const card = event.target.closest('.oc-report-card');
  if (!card) return;
  const title = card.querySelector('strong')?.textContent?.trim();
  if (!REPORTS[title]) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  exportReports([title], card);
}, true);

const observer = new MutationObserver(() => decorateReportsPage());
observer.observe(document.documentElement, { childList: true, subtree: true });
decorateReportsPage();
