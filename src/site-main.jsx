function loadPrivateFileHelper() {
  if (document.querySelector('script[src^="/private-file-signing.js"]')) return;
  const script = document.createElement('script');
  script.src = '/private-file-signing.js?v=4';
  script.defer = true;
  document.body.appendChild(script);
}

if (window.location.hash === '#dms') {
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
