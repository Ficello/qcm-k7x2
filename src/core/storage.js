(function () {
  'use strict';
  const root = (globalThis.QCMK = globalThis.QCMK || {});
  const schema = root.schema || (typeof require === 'function' ? require('./schema.js') : null);

  const STORAGE_KEY = 'qcmk_settings_v1';

  function cloneBindings(list) {
    if (!Array.isArray(list)) return [];
    return list
      .filter((b) => b && typeof b.key === 'string' && b.key.length > 0)
      .map((b) => {
        const out = { key: b.key };
        if (b.ctrl) out.ctrl = true;
        if (b.alt) out.alt = true;
        if (b.meta) out.meta = true;
        if (typeof b.shift === 'boolean') out.shift = b.shift;
        return out;
      });
  }

  function buildDefaults(presetName) {
    const presetKey = schema.presets[presetName] ? presetName : 'azerty';
    const preset = schema.presets[presetKey];

    const shared = {};
    for (const action of schema.sharedActions) {
      const presetList = preset.shared && preset.shared[action.id];
      shared[action.id] = cloneBindings(presetList || action.default);
    }

    const features = {};
    for (const feat of schema.features) {
      const actions = {};
      const featOverrides = (preset.overrides && preset.overrides[feat.id]) || {};
      for (const act of feat.actions || []) {
        const list = featOverrides[act.id] !== undefined ? featOverrides[act.id] : act.default;
        actions[act.id] = cloneBindings(list);
      }

      const options = {};
      for (const opt of feat.options || []) {
        options[opt.id] = opt.default;
      }

      features[feat.id] = {
        enabled: feat.enabledByDefault !== false,
        actions,
        options,
      };
    }

    return {
      version: schema.version,
      enabled: true,
      preset: presetKey,
      shared,
      features,
    };
  }

  function sanitizeOption(optDef, rawVal) {
    if (optDef.type === 'boolean') {
      return typeof rawVal === 'boolean' ? rawVal : optDef.default;
    }
    if (optDef.type === 'number') {
      const num = Number(rawVal);
      if (!Number.isFinite(num)) return optDef.default;
      const min = typeof optDef.min === 'number' ? optDef.min : -Infinity;
      const max = typeof optDef.max === 'number' ? optDef.max : Infinity;
      return Math.min(max, Math.max(min, Math.round(num)));
    }
    return optDef.default;
  }

  function mergeSettings(raw) {
    const base = buildDefaults((raw && raw.preset) || 'azerty');
    if (!raw || typeof raw !== 'object') return base;

    if (typeof raw.enabled === 'boolean') base.enabled = raw.enabled;

    if (raw.shared && typeof raw.shared === 'object') {
      for (const action of schema.sharedActions) {
        if (Array.isArray(raw.shared[action.id])) {
          base.shared[action.id] = cloneBindings(raw.shared[action.id]);
        }
      }
    }

    if (raw.features && typeof raw.features === 'object') {
      for (const feat of schema.features) {
        const storedFeat = raw.features[feat.id];
        if (!storedFeat || typeof storedFeat !== 'object') continue;
        const target = base.features[feat.id];

        if (typeof storedFeat.enabled === 'boolean') {
          target.enabled = storedFeat.enabled;
        }
        if (storedFeat.actions && typeof storedFeat.actions === 'object') {
          for (const act of feat.actions || []) {
            if (Array.isArray(storedFeat.actions[act.id])) {
              target.actions[act.id] = cloneBindings(storedFeat.actions[act.id]);
            }
          }
        }
        // Migrate legacy Alt+A / Alt+Shift+A / Alt+E / Alt+Shift+E defaults that conflicted with Firefox menus
        if (
          (feat.id === 'uness.anki' || feat.id === 'hypo.anki') &&
          target.actions.openActive &&
          target.actions.openActive.length === 1 &&
          target.actions.openActive[0].key === 'a' &&
          target.actions.openActive[0].alt === true &&
          !target.actions.openActive[0].ctrl &&
          !target.actions.openActive[0].meta
        ) {
          target.actions.openActive = [{ key: 'a' }];
        }
        if (
          feat.id === 'uness.anki' &&
          target.actions.openErrors &&
          target.actions.openErrors.length === 1 &&
          target.actions.openErrors[0].key === 'e' &&
          target.actions.openErrors[0].alt === true &&
          !target.actions.openErrors[0].ctrl &&
          !target.actions.openErrors[0].meta
        ) {
          target.actions.openErrors = [{ key: 'e' }];
        }
        if (storedFeat.options && typeof storedFeat.options === 'object') {
          for (const opt of feat.options || []) {
            if (Object.prototype.hasOwnProperty.call(storedFeat.options, opt.id)) {
              target.options[opt.id] = sanitizeOption(opt, storedFeat.options[opt.id]);
            }
          }
        }
      }
    }

    return base;
  }

  function getExtApi() {
    if (typeof browser !== 'undefined' && browser && browser.storage && browser.storage.local) {
      return browser;
    }
    if (typeof chrome !== 'undefined' && chrome && chrome.storage && chrome.storage.local) {
      return chrome;
    }
    return null;
  }

  function load() {
    const extApi = getExtApi();
    if (extApi) {
      return new Promise((resolve) => {
        let settled = false;
        const done = (res) => {
          if (settled) return;
          settled = true;
          resolve(mergeSettings(res && res[STORAGE_KEY]));
        };
        try {
          const maybePromise = extApi.storage.local.get([STORAGE_KEY], done);
          if (maybePromise && typeof maybePromise.then === 'function') {
            maybePromise.then(done, () => done(null));
          }
        } catch (_) {
          done(null);
        }
      });
    }

    // Userscript (GM_getValue) fallback
    if (typeof GM_getValue === 'function') {
      try {
        const raw = GM_getValue(STORAGE_KEY, null);
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return Promise.resolve(mergeSettings(parsed));
      } catch (_) {
        return Promise.resolve(buildDefaults('azerty'));
      }
    }

    // Page localStorage fallback
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      return Promise.resolve(mergeSettings(raw ? JSON.parse(raw) : null));
    } catch (_) {
      return Promise.resolve(buildDefaults('azerty'));
    }
  }

  function save(settings) {
    const clean = mergeSettings(settings);
    const extApi = getExtApi();
    if (extApi) {
      return new Promise((resolve) => {
        let settled = false;
        const done = () => {
          if (settled) return;
          settled = true;
          resolve(clean);
        };
        try {
          const maybePromise = extApi.storage.local.set({ [STORAGE_KEY]: clean }, done);
          if (maybePromise && typeof maybePromise.then === 'function') {
            maybePromise.then(done, done);
          }
        } catch (_) {
          done();
        }
      });
    }

    if (typeof GM_setValue === 'function') {
      try {
        GM_setValue(STORAGE_KEY, JSON.stringify(clean));
      } catch (_) {}
    } else {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
        }
      } catch (_) {}
    }

    if (typeof window !== 'undefined' && typeof CustomEvent === 'function') {
      window.dispatchEvent(new CustomEvent('qcmk:settings', { detail: clean }));
    }
    return Promise.resolve(clean);
  }

  function reset(presetName) {
    const fresh = buildDefaults(presetName || 'azerty');
    return save(fresh);
  }

  function exportJson(settings) {
    return JSON.stringify(mergeSettings(settings), null, 2);
  }

  function importJson(jsonStr) {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Format JSON invalide.');
    }
    if (!parsed.features && !parsed.shared) {
      throw new Error('Configuration QCM Clavier non reconnue.');
    }
    return mergeSettings(parsed);
  }

  function isFeatureEnabled(settings, featureId) {
    if (!settings || settings.enabled === false) return false;
    const def = schema.byId[featureId];
    if (def && def.linkedTo) {
      return isFeatureEnabled(settings, def.linkedTo);
    }
    const entry = settings.features && settings.features[featureId];
    if (!entry) return def ? def.enabledByDefault !== false : false;
    return entry.enabled !== false;
  }

  function getBindings(settings, featureId, actionId) {
    const entry = settings && settings.features && settings.features[featureId];
    if (entry && entry.actions && Array.isArray(entry.actions[actionId])) {
      return entry.actions[actionId];
    }
    const def = schema.byId[featureId];
    const act = def && (def.actions || []).find((a) => a.id === actionId);
    return act ? act.default : [];
  }

  function getSharedBindings(settings, actionId) {
    if (settings && settings.shared && Array.isArray(settings.shared[actionId])) {
      return settings.shared[actionId];
    }
    const def = schema.sharedActions.find((a) => a.id === actionId);
    return def ? def.default : [];
  }

  function getOption(settings, featureId, optionId) {
    const entry = settings && settings.features && settings.features[featureId];
    if (entry && entry.options && Object.prototype.hasOwnProperty.call(entry.options, optionId)) {
      return entry.options[optionId];
    }
    const def = schema.byId[featureId];
    const opt = def && (def.options || []).find((o) => o.id === optionId);
    return opt ? opt.default : undefined;
  }

  function onChange(cb) {
    const extApi = getExtApi();
    if (extApi && extApi.storage && extApi.storage.onChanged) {
      const listener = (changes, area) => {
        if (area === 'local' && changes[STORAGE_KEY]) {
          cb(mergeSettings(changes[STORAGE_KEY].newValue));
        }
      };
      extApi.storage.onChanged.addListener(listener);
      return () => extApi.storage.onChanged.removeListener(listener);
    }

    if (typeof window !== 'undefined') {
      const localListener = (ev) => {
        if (ev && ev.detail) cb(mergeSettings(ev.detail));
      };
      window.addEventListener('qcmk:settings', localListener);
      return () => window.removeEventListener('qcmk:settings', localListener);
    }
    return function () {};
  }

  root.storage = {
    STORAGE_KEY,
    buildDefaults,
    mergeSettings,
    load,
    save,
    reset,
    exportJson,
    importJson,
    isFeatureEnabled,
    getBindings,
    getSharedBindings,
    getOption,
    onChange,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = root.storage;
  }
})();
