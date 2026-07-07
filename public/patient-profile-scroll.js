// Frontend-only UX fix: when clinic owner opens a patient profile,
// bring the patient profile card into view instead of leaving it down the page.
(() => {
  let pendingProfileScroll = false;
  let lastProfileTitle = '';

  function profilePanel() {
    return document.querySelector('.patient-profile-panel');
  }

  function profileTitle(panel) {
    const title = panel?.querySelector('.profile-heading h3')?.textContent?.trim() || '';
    const emptyTitle = panel?.querySelector('.empty b')?.textContent?.trim() || '';
    return title || emptyTitle;
  }

  function scrollToProfilePanel() {
    const panel = profilePanel();
    if (!panel) return false;

    panel.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
    panel.classList.add('profile-focus-pulse');
    window.setTimeout(() => panel.classList.remove('profile-focus-pulse'), 1100);
    return true;
  }

  function requestProfileScroll() {
    pendingProfileScroll = true;

    window.setTimeout(scrollToProfilePanel, 80);
    window.setTimeout(scrollToProfilePanel, 320);
    window.setTimeout(scrollToProfilePanel, 750);
  }

  document.addEventListener('click', (event) => {
    const button = event.target?.closest?.('button');
    if (!button) return;

    const label = button.textContent?.trim().toLowerCase() || '';
    const row = button.closest('.patient-row');

    if (row && label === 'profile') requestProfileScroll();
  }, true);

  const observer = new MutationObserver(() => {
    const panel = profilePanel();
    const title = profileTitle(panel);

    if (!panel || !title || title === 'No profile selected') return;

    if (pendingProfileScroll || title !== lastProfileTitle) {
      pendingProfileScroll = false;
      lastProfileTitle = title;
      window.setTimeout(scrollToProfilePanel, 120);
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
})();
