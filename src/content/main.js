(function () {
  'use strict';
  const root = globalThis.QCMK;
  if (!root || !root.schema || !root.storage || !root.keybind || !root.dom) return;

  function detectSite(hostname) {
    const host = (hostname || '').toLowerCase();
    for (const site of root.schema.sites) {
      for (const domain of site.hosts) {
        if (host === domain || host.endsWith('.' + domain)) {
          return site.id;
        }
      }
    }
    return null;
  }

  const siteId = detectSite(location.hostname);
  const adapter = siteId && root.adapters ? root.adapters[siteId] : null;
  if (!adapter) return;

  let currentSettings = null;
  let observer = null;
  let mutateTimer = null;

  function createContext(settings) {
    return {
      settings,
      siteId,
      isEnabled(featureId) {
        return root.storage.isFeatureEnabled(settings, featureId);
      },
      bindings(featureId, actionId) {
        return root.storage.getBindings(settings, featureId, actionId);
      },
      sharedBindings(actionId) {
        return root.storage.getSharedBindings(settings, actionId);
      },
      matches(event, featureId, actionId) {
        return root.keybind.matchesAny(event, this.bindings(featureId, actionId));
      },
      matchSharedChoice(event) {
        for (let i = 0; i < 10; i++) {
          const list = this.sharedBindings('choice.' + (i + 1));
          if (root.keybind.matchesAny(event, list)) return i;
        }
        return -1;
      },
      option(featureId, optionId) {
        return root.storage.getOption(settings, featureId, optionId);
      },
      formatFirst(bindings) {
        if (!Array.isArray(bindings) || bindings.length === 0) return '';
        return root.keybind.formatBinding(bindings[0]);
      },
    };
  }

  let ctx = null;

  function handleKeyDown(e) {
    if (!ctx || !currentSettings || currentSettings.enabled === false) return;
    if (e.defaultPrevented) return;
    const handled = adapter.onKeyDown(e, ctx);
    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  function handleKeyUp(e) {
    if (!ctx || !currentSettings || currentSettings.enabled === false) return;
    if (typeof adapter.onKeyUp === 'function') {
      adapter.onKeyUp(e, ctx);
    }
  }

  function startObserver() {
    if (observer || !document.body) return;
    observer = new MutationObserver(() => {
      if (mutateTimer) clearTimeout(mutateTimer);
      mutateTimer = setTimeout(() => {
        if (ctx && currentSettings && currentSettings.enabled !== false && typeof adapter.onDomMutate === 'function') {
          adapter.onDomMutate(ctx);
        }
      }, 150);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  root.storage.load().then((settings) => {
    currentSettings = settings;
    ctx = createContext(settings);
    if (currentSettings.enabled !== false) {
      adapter.init(ctx);
    }
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    startObserver();
  });

  root.storage.onChange((newSettings) => {
    currentSettings = newSettings;
    ctx = createContext(newSettings);
    if (newSettings.enabled === false) {
      if (typeof adapter.destroy === 'function') adapter.destroy();
    } else {
      adapter.init(ctx);
    }
  });
})();
