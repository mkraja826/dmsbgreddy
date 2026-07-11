(() => {
  if (window.location.hash === '#dms') return;

  const PROFILE_URL = 'https://lh3.googleusercontent.com/gps-cs-s/AHRPTWlZTYs0alwy9mrLzKveSmN2De3iw_B45q80FDdCZTrdKNPNMO15uWQ5Zo6RTy-spEqTjCnQ1zyyYMSDMJfmy78ZhOlWx4exUxUflSKDNmYE6AFUJ8sVMDxKEMFqSE3Ykldaw3pT=s680-w680-h510-rw';
  const FALLBACK_URL = '/assets/logo-icon.png';
  const SELECTOR = '.doctor-visual > img';

  function applyProfilePhoto() {
    const image = document.querySelector(SELECTOR);
    if (!image || image.dataset.doctorProfileApplied === 'true') return false;

    image.dataset.doctorProfileApplied = 'true';
    image.alt = 'Dr. Rajashekar Reddy at Sri B.G Reddy Dental Clinic';
    image.referrerPolicy = 'no-referrer';
    image.loading = 'eager';
    image.decoding = 'async';
    image.style.objectFit = 'cover';
    image.style.objectPosition = 'center 24%';
    image.src = PROFILE_URL;

    image.addEventListener('error', () => {
      if (image.src.endsWith(FALLBACK_URL)) return;
      image.src = FALLBACK_URL;
      image.style.objectFit = 'contain';
      image.style.objectPosition = 'center';
      image.style.padding = '64px';
      image.style.background = 'linear-gradient(145deg, #edf5ff, #ffffff)';
    }, { once: true });

    return true;
  }

  if (applyProfilePhoto()) return;

  const observer = new MutationObserver(() => {
    if (applyProfilePhoto()) observer.disconnect();
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.setTimeout(() => observer.disconnect(), 15000);
})();
