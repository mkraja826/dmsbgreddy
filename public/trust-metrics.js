(() => {
  if (window.location.hash === '#dms') return;

  const metrics = [
    {
      value: '15+',
      label: 'Years of experience',
      detail: 'Long-standing local practice',
      className: 'experience',
      ariaLabel: 'More than 15 years of dental experience',
    },
    {
      value: '5,000+',
      label: 'Patients treated',
      detail: 'Care built over the years',
      className: 'patients',
      ariaLabel: 'More than 5,000 patients treated',
    },
  ];

  function applyTrustMetrics() {
    const grid = document.querySelector('.trust-grid');
    if (!grid || grid.dataset.clinicMetricsApplied === 'true' || grid.children.length < 4) return false;

    metrics.forEach((metric, index) => {
      const card = grid.children[index + 2];
      card.className = `trust-proof ${metric.className}`;
      card.setAttribute('aria-label', metric.ariaLabel);
      card.innerHTML = `<strong>${metric.value}</strong><span>${metric.label}</span><small>${metric.detail}</small>`;
    });

    grid.dataset.clinicMetricsApplied = 'true';
    return true;
  }

  if (applyTrustMetrics()) return;

  const observer = new MutationObserver(() => {
    if (applyTrustMetrics()) observer.disconnect();
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.setTimeout(() => observer.disconnect(), 15000);
})();