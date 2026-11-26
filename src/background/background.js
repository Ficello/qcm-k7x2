(function () {
  'use strict';
  const isFirefox = typeof browser !== 'undefined' && Boolean(browser && browser.contextMenus);
  const extApi = isFirefox ? browser : (typeof chrome !== 'undefined' ? chrome : null);
  if (!extApi || !extApi.contextMenus) return;

  const MENU_OPEN_ID = 'qcmk-anki-open';
  const MENU_ERRORS_ID = 'qcmk-anki-errors';
  const MENU_CONTEXTS = ['page', 'selection', 'frame', 'link', 'editable'];
  const UNESS_PATTERNS = ['*://*.uness.fr/*'];

  function createMenus() {
    const ignoreError = () => {
      if (extApi.runtime) void extApi.runtime.lastError;
    };
    try {
      extApi.contextMenus.create({
        id: MENU_OPEN_ID,
        title: 'Ouvrir dans Anki EDN',
        contexts: MENU_CONTEXTS,
      }, ignoreError);
      extApi.contextMenus.create({
        id: MENU_ERRORS_ID,
        title: 'Anki EDN : ouvrir mes erreurs',
        contexts: MENU_CONTEXTS,
        documentUrlPatterns: UNESS_PATTERNS,
      }, ignoreError);
    } catch (_) {}
  }

  function rebuildMenus() {
    try {
      if (isFirefox) {
        extApi.contextMenus.removeAll().then(createMenus, createMenus);
      } else {
        extApi.contextMenus.removeAll(() => {
          if (extApi.runtime) void extApi.runtime.lastError;
          createMenus();
        });
      }
    } catch (_) {
      createMenus();
    }
  }

  if (extApi.runtime && extApi.runtime.onInstalled) {
    extApi.runtime.onInstalled.addListener(rebuildMenus);
  }
  if (extApi.runtime && extApi.runtime.onStartup) {
    extApi.runtime.onStartup.addListener(rebuildMenus);
  }
  createMenus();

  if (extApi.contextMenus.onClicked) {
    extApi.contextMenus.onClicked.addListener((info, tab) => {
      if (!tab || typeof tab.id !== 'number') return;
      if (info.menuItemId !== MENU_OPEN_ID && info.menuItemId !== MENU_ERRORS_ID) return;

      const payload = {
        type: 'qcmk-open-anki',
        mode: info.menuItemId === MENU_ERRORS_ID ? 'errors' : 'active',
        selectionText: info.selectionText || '',
      };

      try {
        if (isFirefox) {
          extApi.tabs.sendMessage(tab.id, payload).catch(() => {});
        } else {
          extApi.tabs.sendMessage(tab.id, payload, () => {
            if (extApi.runtime) void extApi.runtime.lastError;
          });
        }
      } catch (_) {}
    });
  }
})();
