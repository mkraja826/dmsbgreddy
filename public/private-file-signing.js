(() => {
  const CONFIG = window.DMS_CONFIG || {};
  const SUPABASE_URL = String(CONFIG.SUPABASE_URL || CONFIG.supabaseUrl || '').replace(/\/$/, '');
  const SUPABASE_ANON_KEY = String(CONFIG.SUPABASE_ANON_KEY || CONFIG.supabaseAnonKey || '');
  const SESSION_KEY = 'bg_reddy_dms_owner_session_v3';
  const URL_CACHE = new Map();
  const SIGNING_MARK = 'dmsPrivateSigningSource';

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
    if (value.startsWith('/storage/')) return `${SUPABASE_URL}${value}`;
    if (value.startsWith('/object/')) return `${SUPABASE_URL}/storage/v1${value}`;
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

  function cleanObjectPath(value) {
    return decodePath(String(value || ''))
      .split('?')[0]
      .split('#')[0]
      .replace(/^\/+/, '')
      .trim();
  }

  function extractStorageRef(rawUrl) {
    if (!SUPABASE_URL || !rawUrl) return null;

    let url;
    try {
      url = new URL(toAbsoluteUrl(rawUrl), window.location.origin);
    } catch {
      return null;
    }

    const marker = '/storage/v1/';
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex === -1) return null;

    const afterMarker = url.pathname.slice(markerIndex + marker.length);
    const parts = afterMarker.split('/').filter(Boolean);

    if (!parts.length) return null;

    if (parts[0] === 'object') parts.shift();
    if (parts[0] === 'render' && parts[1] === 'image') parts.splice(0, 2);

    const visibilitySegments = new Set(['public', 'sign', 'authenticated']);
    if (visibilitySegments.has(parts[0])) parts.shift();

    const bucket = parts.shift();
    const path = cleanObjectPath(parts.join('/'));

    if (!bucket || !path || path === bucket) return null;

    return { bucket, path, cacheKey: `${bucket}/${path}` };
  }

  function getSignedUrlFromResponse(data) {
    const row = Array.isArray(data)
      ? data[0]
      : data?.signedUrls?.[0] || data?.signedURLs?.[0] || data;

    return row?.signedUrl || row?.signedURL || row?.signed_url || '';
  }

  async function createSignedUrl(storageRef) {
    if (!storageRef || !SUPABASE_URL || !SUPABASE_ANON_KEY) return '';

    if (URL_CACHE.has(storageRef.cacheKey)) return URL_CACHE.get(storageRef.cacheKey);

    const batchEndpoint = `${SUPABASE_URL}/storage/v1/object/sign/${encodeURIComponent(storageRef.bucket)}`;
    const headers = {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
    };

    let response = await fetch(batchEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ expiresIn: 3600, paths: [storageRef.path] }),
    });

    let data = await response.json().catch(() => null);
    let signed = response.ok ? getSignedUrlFromResponse(data) : '';

    if (!signed) {
      const pathEndpoint = `${SUPABASE_URL}/storage/v1/object/sign/${encodeURIComponent(storageRef.bucket)}/${storageRef.path
        .split('/')
        .map(encodeURIComponent)
        .join('/')}`;

      response = await fetch(pathEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ expiresIn: 3600 }),
      });

      data = await response.json().catch(() => null);
      signed = response.ok ? getSignedUrlFromResponse(data) : '';
    }

    const absolute = toAbsoluteUrl(signed);

    if (absolute) URL_CACHE.set(storageRef.cacheKey, absolute);

    return absolute;
  }

  async function signElementAttribute(element, attribute) {
    const currentUrl = element.getAttribute(attribute);
    if (!currentUrl) return;

    if (element.dataset?.[SIGNING_MARK] === currentUrl) return;

    const storageRef = extractStorageRef(currentUrl);
    if (!storageRef) return;

    element.dataset[SIGNING_MARK] = currentUrl;

    try {
      const signedUrl = await createSignedUrl(storageRef);
      if (signedUrl) {
        element.setAttribute(attribute, signedUrl);
        element.dataset[SIGNING_MARK] = signedUrl;
      }
    } catch {
      delete element.dataset[SIGNING_MARK];
    }
  }

  function signVisibleStorageUrls(root = document) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;

    if (root.matches?.('img[src]')) signElementAttribute(root, 'src');
    if (root.matches?.('a[href]')) signElementAttribute(root, 'href');

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
