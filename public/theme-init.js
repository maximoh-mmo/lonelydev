// Apply preference before the app and stylesheet render. Storage can be unavailable.
(function () {
  let preference = 'system';
  try { preference = localStorage.getItem('theme-preference') || 'system'; } catch { /* Use system. */ }
  if (!['system', 'light', 'dark'].includes(preference)) preference = 'system';
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.dataset.theme = preference === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : preference;
  document.documentElement.lang = /^\/de(?:\/|$)/.test(location.pathname) ? 'de' : 'en';
})();
