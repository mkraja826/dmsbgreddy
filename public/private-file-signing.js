(() => {
  const CONFIG = window.DMS_CONFIG || {};
  const SUPABASE_URL = String(CONFIG.SUPABASE_URL || CONFIG.supabaseUrl || '').replace(/\/$/, '');
  const SUPABASE_ANON_KEY = String(CONFIG.SUPABASE_ANON_KEY || CONFIG.supabaseAnonKey || '');
  const SESSION_KEY = 'bg_reddy_dms_owner_session_v3';
  const URL_CACHE = new Map();

  function readSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    } catch {
      return null;
    }
  }

  function token() {
    return readSession()?.access_token || SUPABASE_ANON_KEY;
  }

  function toAbsoluteUrl(value) {
    if (!value) return '';
    if (value.startsWith('http://') || value.startsWith('https://')) return value;
    if (value.startsWith('/')) return `${SUPABASE_URL}${value}`;
    return value;
  }

  function decodePath(value) {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  function extractStorageRef(rawUrl) {
    if (!SUPABASE_URL || !rawUrl) return null;

    let url;
    try {
      url = new URL(toAbsoluteUrl(rawUrl), window.location.origin);
    } catch {
      return null;
    }

    if (!url.href.includes('/storage/v1/object/')) return null;

    const marker = '/storage/v1/object/';
    const afterMarker = url.pathname.slice(url.pathname.indexOf(marker) + marker.length);
    const parts = afterMarker.split('/').filter(Boolean);

    if (parts.length < 2) return null;

    const visibilitySegments = new Set(['public', 'sign', 'authenticated', 'render']);
    const startsWithVisibility = visibilitySegments.has(parts[0]);
    const bucket = startsWithVisibility ? parts[1] : parts[0];
    const objectParts = startsWithVisibility ? parts.slice(2) : parts.slice(1);
    const path = decodePath(objectParts.join('/'));

    if (!bucket || !path) return null;

    return { bucket, path, cacheKey: `${bucket}/${path}` };
  }

  async function createSignedUrl(storageRef) {
    if (!storageRef || !SUPABASE_URL || !SUPABASE_ANON_KEY) return '';

    if (URL_CACHE.has(storageRef.cacheKey)) return URL_CACHE.get(storageRef.cacheKey);

    const endpoint = `${SUPABASE_URL}/storage/v1/object/sign/${encodeURIComponent(storageRef.bucket)}/${storageRef.path
      .split('/')
      .map(encodeURIComponent)
      .join('/')}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expiresIn: 3600 }),
    });

    if (!response.ok) return '';

    const data = await response.json().catch(() => null);
    const signed = data?.signedURL || data?.signedUrl || data?.signed_url || '';
    const absolute = toAbsoluteUrl(signed);

    if (absolute) URL_CACHE.set(storageRef.cacheKey, absolute);

    return absolute;
  }

  async function signElementAttribute(element, attribute) {
    const currentUrl = element.getAttribute(attribute);
    if (!currentUrl || element.dataset?.dmsPrivateSigned === currentUrl) return;

    const storageRef = extractStorageRef(currentUrl);
    if (!storageRef) return;

    element.dataset.dmsPrivateSigned = currentUrl;

    try {
      const signedUrl = await createSignedUrl(storageRef);
      if (signedUrl) element.setAttribute(attribute, signedUrl);
    } catch {
      delete element.dataset.dmsPrivateSigned;
    }
  }

  function signVisibleStorageUrls(root = document) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;

    root.querySelectorAll?.('img[src]').forEach((img) => signElementAttribute(img, 'src'));
    root.querySelectorAll?.('a[href]').forEach((link) => signElementAttribute(link, 'href'));
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1) signVisibleStorageUrls(node);
      }
    }
  });

  window.addEventListener('load', () => {
    signVisibleStorageUrls();
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
