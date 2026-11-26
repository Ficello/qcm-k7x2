(function () {
  'use strict';
  const VERSION = '1.0.0';
  try {
    document.documentElement.dataset.connecteurEdn = VERSION;
    window.dispatchEvent(new CustomEvent('connecteur-edn:ready', { detail: { version: VERSION } }));
  } catch (e) {
    // Ignore DOM errors on restricted pages
  }
})();
