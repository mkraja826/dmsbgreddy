function loadPrivateFileHelper() {
  if (document.querySelector('script[src^="/private-file-signing.js"]')) return;
  const script = document.createElement('script');
  script.src = '/private-file-signing.js?v=4';
  script.defer = true;
  document.body.appendChild(script);
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
  import('./owner-main.jsx').then(loadPrivateFileHelper);
} else {
  const portalLabels = new Set(['clinic login', 'owner login', 'login']);
  document.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button || !portalLabels.has(button.textContent.trim().toLowerCase())) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    window.location.hash = 'dms';
    window.location.reload();
  }, true);
  import('./fast-main.jsx');
}
