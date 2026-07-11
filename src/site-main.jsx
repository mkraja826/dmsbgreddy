function loadOwnerScript(src) {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src^="${src.split('?')[0]}"]`)) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    script.onload = resolve;
    script.onerror = resolve;
    document.body.appendChild(script);
  });
}

function prepareOwnerTheme() {
  const root = document.documentElement;
  const values = {
    '--line': '#e4eaf2',
    '--text': '#101828',
    '--muted': '#667085',
    '--blue': '#155eef',
    '--red': '#d92d20',
    '--red-soft': '#fef3f2',
    '--shadow-lg': '0 24px 70px rgba(16, 24, 40, .16)',
  };
  Object.entries(values).forEach(([name, value]) => root.style.setProperty(name, value));
  document.title = 'Clinic Owner Dashboard | BG Reddy Dental Clinic';
}

if (window.location.hash === '#dms') {
  prepareOwnerTheme();
  Promise.all([
    import('./owner-main.jsx'),
    import('./excel-reports.js'),
    loadOwnerScript('/private-file-signing.js?v=4'),
    loadOwnerScript('/overdue-treatment.js?v=1'),
    loadOwnerScript('/human-export-guard.js?v=1'),
  ]);
} else {
  import('./fast-main.jsx');
}
