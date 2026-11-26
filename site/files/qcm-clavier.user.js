// ==UserScript==
// @name         QCM Clavier
// @namespace    https://local.edn/qcm-clavier
// @version      1.0.0
// @description  Raccourcis clavier personnalisables pour EDN.fr, Hypocampus, UNESS, Asclepia et Refoua.
// @match        *://*.edn.fr/*
// @match        *://*.hypocampus.fr/*
// @match        *://*.uness.fr/*
// @match        https://*.asclepia.io/*
// @match        https://refoua.fr/*
// @match        https://refoua.vercel.app/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  /* --- src/core/schema.js --- */
(function () {
  'use strict';
  const root = (globalThis.QCMK = globalThis.QCMK || {});

  const bind = (key, mods) => Object.assign({ key }, mods || {});

  const AZERTY_ROW = ['&', 'é', '"', "'", '(', '-', 'è', '_', 'ç', 'à'];
  const sharedActions = [];
  for (let i = 1; i <= 10; i++) {
    const digit = String(i % 10);
    sharedActions.push({
      id: 'choice.' + i,
      label: 'Proposition ' + i,
      default: [bind(digit), bind(AZERTY_ROW[i - 1])],
    });
  }

  const sites = [
    { id: 'edn', name: 'EDN.fr', hosts: ['edn.fr'] },
    { id: 'hypocampus', name: 'Hypocampus', hosts: ['hypocampus.fr'] },
    { id: 'uness', name: 'UNESS', hosts: ['uness.fr'] },
    { id: 'asclepia', name: 'Asclepia', hosts: ['asclepia.io'] },
    { id: 'refoua', name: 'Refoua', hosts: ['refoua.fr', 'refoua.vercel.app'], hidden: true },
  ];

  const features = [
    // EDN.fr — Général
    {
      id: 'edn.scroll',
      site: 'edn',
      group: 'Général',
      name: 'Défilement au clavier',
      description: 'Fait défiler la zone de questions avec les flèches haut et bas.',
      actions: [
        { id: 'down', label: 'Descendre', default: [bind('ArrowDown')] },
        { id: 'up', label: 'Monter', default: [bind('ArrowUp')] },
      ],
      options: [
        { id: 'step', label: 'Pas de défilement (px)', type: 'number', default: 200, min: 50, max: 1000 },
      ],
    },
    {
      id: 'edn.keyHints',
      site: 'edn',
      group: 'Général',
      name: 'Afficher les touches sur la page',
      description: 'Affiche un repère clavier à côté des propositions et des boutons principaux.',
      enabledByDefault: false,
      actions: [],
    },
    {
      id: 'edn.inlineScores',
      site: 'edn',
      group: 'Général',
      name: 'Scores colorés dans les questions',
      description: 'Colore les scores « X/Y pts » en vert, orange ou rouge dans les questions.',
      actions: [],
    },
    {
      id: 'edn.ancrageCounters',
      site: 'edn',
      group: 'Général',
      name: 'Compteur d\'ancrages par matière',
      description: 'Affiche le nombre de questions à revoir par matière et un bouton de lancement rapide sur la page Ancrage.',
      actions: [],
    },
    {
      id: 'edn.refouaLinks',
      site: 'edn',
      group: 'Général',
      name: 'Rangs A/B/C vers cours LiSA',
      description: 'Rend les objectifs Rang A/B/C cliquables pour ouvrir la fiche correspondante sur Refoua (Ctrl+clic pour un nouvel onglet).',
      actions: [],
    },

    // EDN.fr — Training
    {
      id: 'edn.training.answer',
      site: 'edn',
      group: 'Training',
      name: 'Cocher et valider au clavier',
      description: 'Utilise les touches de propositions (1 à 10) pour cocher et la touche de validation pour soumettre.',
      usesSharedChoices: true,
      actions: [
        { id: 'validate', label: 'Valider', default: [bind('Enter')] },
      ],
    },
    {
      id: 'edn.training.correction',
      site: 'edn',
      group: 'Training',
      name: 'Auto-évaluation en correction',
      description: 'Sélectionne le niveau de maîtrise pendant la correction ou passe à la question suivante.',
      actions: [
        { id: 'sureOrNext', label: 'Je connaissais / question suivante', default: [bind('Enter')] },
        { id: 'unsure', label: 'Je me rappelais un peu', default: [bind('ù')] },
        { id: 'random', label: 'Je ne savais pas / au hasard', default: [bind('!')] },
      ],
    },
    {
      id: 'edn.training.nav',
      site: 'edn',
      group: 'Training',
      name: 'Question précédente / suivante',
      description: 'Navigue entre les questions de la série avec les flèches gauche et droite.',
      actions: [
        { id: 'prev', label: 'Question précédente', default: [bind('ArrowLeft')] },
        { id: 'next', label: 'Question suivante', default: [bind('ArrowRight')] },
      ],
    },
    {
      id: 'edn.training.ancrage',
      site: 'edn',
      group: 'Training',
      name: 'Gestion de l\'ancrage au clavier',
      description: 'Ajoute ou retire la question de l\'ancrage, ou déclenche « Ne plus revoir ».',
      actions: [
        { id: 'toggle', label: 'Ajouter / retirer de l\'ancrage', default: [bind('*')] },
        { id: 'add', label: 'Ajouter à l\'ancrage', default: [] },
        { id: 'remove', label: 'Retirer de l\'ancrage', default: [] },
        { id: 'noReview', label: 'Ne plus revoir', default: [bind('$')] },
      ],
    },
    {
      id: 'edn.training.qroc',
      site: 'edn',
      group: 'Training',
      name: 'QROC autofocus',
      description: 'Place automatiquement le curseur dans le champ QROC dès qu\'une lettre est tapée.',
      actions: [],
    },
    {
      id: 'edn.training.halfscreen',
      site: 'edn',
      group: 'Training',
      name: 'Affichage compact en demi-écran',
      description: 'Compresse l\'en-tête en fenêtre étroite (<= 920 px) pour conserver la question en haut de l\'écran.',
      actions: [],
    },
    {
      id: 'edn.timer',
      site: 'edn',
      group: 'Training',
      name: 'Minuteur au clavier',
      description: 'Met en pause ou relance le minuteur d\'EDN.fr au clavier.',
      actions: [
        { id: 'toggle', label: 'Pause / reprise du minuteur', default: [bind('²')] },
      ],
    },

    // EDN.fr — Examen / Annales
    {
      id: 'edn.exam.answer',
      site: 'edn',
      group: 'Examen / Annales',
      name: 'Cocher et valider au clavier',
      description: 'Coche les propositions de la question centrée à l\'écran et valide avec la touche dédiée.',
      usesSharedChoices: true,
      actions: [
        { id: 'validate', label: 'Valider', default: [bind('Enter')] },
      ],
    },
    {
      id: 'edn.exam.qroc',
      site: 'edn',
      group: 'Examen / Annales',
      name: 'QROC autofocus',
      description: 'Place automatiquement le curseur dans le champ QROC actif dès la première frappe.',
      actions: [],
    },
    {
      id: 'edn.exam.flags',
      site: 'edn',
      group: 'Examen / Annales',
      name: 'Drapeaux sur les questions',
      description: 'Pose ou retire un marqueur visuel sur la question visible et dans la barre latérale (mémorisé par épreuve).',
      actions: [
        { id: 'toggle', label: 'Marquer / démarquer la question visible', default: [bind('ù')] },
        { id: 'clearAll', label: 'Supprimer tous les drapeaux de l\'épreuve', default: [bind('ù', { ctrl: true })] },
      ],
    },
    {
      id: 'edn.sidebarScores',
      site: 'edn',
      group: 'Examen / Annales',
      name: 'Indicateurs de score (barre latérale)',
      description: 'Colore les pastilles de navigation selon le score obtenu et affiche un badge récapitulatif du dossier.',
      actions: [
        { id: 'clearNotes', label: 'Effacer les notes mémorisées de l\'épreuve', default: [bind('$', { ctrl: true })] },
      ],
      options: [
        { id: 'showBadge', label: 'Afficher le badge de note du dossier', type: 'boolean', default: true },
      ],
    },

    // Hypocampus
    {
      id: 'hypo.answer',
      site: 'hypocampus',
      group: 'QCM',
      name: 'Cocher et valider au clavier',
      description: 'Coche les propositions (1 à 10) et clique sur Vérifier ou Continuer.',
      usesSharedChoices: true,
      actions: [
        { id: 'validate', label: 'Vérifier / continuer', default: [bind('Enter')] },
      ],
    },
    {
      id: 'hypo.nav',
      site: 'hypocampus',
      group: 'QCM',
      name: 'Question précédente / suivante',
      description: 'Navigue entre les questions avec les flèches gauche et droite.',
      actions: [
        { id: 'prev', label: 'Précédent', default: [bind('ArrowLeft')] },
        { id: 'next', label: 'Suivant', default: [bind('ArrowRight')] },
      ],
    },
    {
      id: 'hypo.scroll',
      site: 'hypocampus',
      group: 'QCM',
      name: 'Défilement au clavier',
      description: 'Fait défiler la page avec les flèches haut et bas.',
      actions: [
        { id: 'down', label: 'Descendre', default: [bind('ArrowDown')] },
        { id: 'up', label: 'Monter', default: [bind('ArrowUp')] },
      ],
      options: [
        { id: 'step', label: 'Pas de défilement (px)', type: 'number', default: 200, min: 50, max: 1000 },
      ],
    },
    {
      id: 'hypo.autofocus',
      site: 'hypocampus',
      group: 'QCM',
      name: 'QROC autofocus',
      description: 'Place le curseur dans la zone de réponse dès son apparition.',
      actions: [],
    },
    {
      id: 'hypo.exposeDropdown',
      site: 'hypocampus',
      group: 'QCM',
      name: 'Déplier les menus « Choisis les réponses »',
      description: 'Affiche directement les options des menus déroulants sous forme de boutons synchronisés.',
      actions: [],
    },

    // UNESS
    {
      id: 'uness.answer',
      site: 'uness',
      group: 'QCM',
      name: 'Cocher et valider au clavier',
      description: 'Coche la question visible la plus haute. Valider soumet la question ou défile vers la suivante.',
      usesSharedChoices: true,
      actions: [
        { id: 'validate', label: 'Valider / question suivante', default: [bind('Enter')] },
      ],
    },
    {
      id: 'uness.flags',
      site: 'uness',
      group: 'QCM',
      name: 'Marquer la question',
      description: 'Active ou retire le drapeau natif Moodle de la question active.',
      actions: [
        { id: 'toggle', label: 'Marquer / démarquer la question', default: [bind('ù')] },
      ],
    },
    {
      id: 'uness.scroll',
      site: 'uness',
      group: 'QCM',
      name: 'Défilement au clavier',
      description: 'Fait défiler la page avec les flèches haut et bas (appui prolongé fluide).',
      actions: [
        { id: 'down', label: 'Descendre', default: [bind('ArrowDown')] },
        { id: 'up', label: 'Monter', default: [bind('ArrowUp')] },
      ],
      options: [
        { id: 'step', label: 'Pas de défilement (px)', type: 'number', default: 200, min: 50, max: 1000 },
      ],
    },

    // Asclepia
    {
      id: 'asclepia.answer',
      site: 'asclepia',
      group: 'QCM',
      name: 'Cocher et valider au clavier',
      description: 'Coche la question en haut de l\'écran et valide, confirme ou passe à la suivante.',
      usesSharedChoices: true,
      actions: [
        { id: 'validate', label: 'Valider / continuer', default: [bind('Enter')] },
      ],
    },
    {
      id: 'asclepia.chain',
      site: 'asclepia',
      group: 'QCM',
      name: 'Enchaînement des dossiers',
      description: 'Passe automatiquement au sous-dossier suivant après validation de la dernière question.',
      actions: [],
    },
    {
      id: 'asclepia.qroc',
      site: 'asclepia',
      group: 'QCM',
      name: 'QROC autofocus',
      description: 'Place le curseur dans le champ texte dès la première frappe.',
      actions: [],
    },
    {
      id: 'asclepia.compactHeader',
      site: 'asclepia',
      group: 'Affichage',
      name: 'Masquage de la barre supérieure',
      description: 'Masque l\'en-tête pendant les épreuves et ajoute un bouton « Afficher la barre ».',
      actions: [],
    },
    {
      id: 'asclepia.flags',
      site: 'asclepia',
      group: 'QCM',
      name: 'Drapeaux sur les questions',
      description: 'Ajoute un marqueur local sur la question et dans le sommaire latéral.',
      actions: [
        { id: 'toggle', label: 'Marquer / démarquer la question', default: [bind('ù')] },
      ],
    },
    {
      id: 'asclepia.correctionFlags',
      site: 'asclepia',
      group: 'QCM',
      name: 'Drapeaux dans les corrections',
      description: 'Affiche les drapeaux mémorisés dans la vue Correction et le sommaire.',
      actions: [],
    },
    {
      id: 'asclepia.scroll',
      site: 'asclepia',
      group: 'QCM',
      name: 'Défilement au clavier',
      description: 'Fait défiler les questions avec les flèches haut et bas.',
      actions: [
        { id: 'down', label: 'Descendre', default: [bind('ArrowDown')] },
        { id: 'up', label: 'Monter', default: [bind('ArrowUp')] },
      ],
      options: [
        { id: 'step', label: 'Pas de défilement (px)', type: 'number', default: 200, min: 50, max: 1000 },
      ],
    },

    // Refoua (lié à edn.refouaLinks)
    {
      id: 'refoua.autoScroll',
      site: 'refoua',
      group: 'Cours',
      linkedTo: 'edn.refouaLinks',
      hidden: true,
      name: 'Défilement vers l\'objectif LiSA',
      description: 'Défile vers l\'objectif transmis dans l\'URL et le met en évidence.',
      actions: [],
    },
  ];

  const presets = {
    azerty: {
      label: 'AZERTY (PC)',
      shared: Object.fromEntries(sharedActions.map((a) => [a.id, a.default])),
      overrides: {},
    },
    qwerty: {
      label: 'QWERTY',
      shared: Object.fromEntries(
        sharedActions.map((a, idx) => [a.id, [bind(String((idx + 1) % 10))]])
      ),
      overrides: {
        'edn.training.correction': {
          unsure: [bind('u')],
          random: [bind('r')],
        },
        'edn.training.ancrage': {
          toggle: [bind('a')],
          noReview: [bind('n')],
        },
        'edn.timer': { toggle: [bind('t')] },
        'edn.exam.flags': {
          toggle: [bind('f')],
          clearAll: [bind('f', { ctrl: true })],
        },
        'edn.sidebarScores': {
          clearNotes: [bind('n', { ctrl: true })],
        },
        'uness.flags': { toggle: [bind('f')] },
        'asclepia.flags': { toggle: [bind('f')] },
      },
    },
    mac_azerty: {
      label: 'AZERTY (Mac)',
      shared: Object.fromEntries(sharedActions.map((a) => [a.id, a.default])),
      overrides: {
        'edn.timer': { toggle: [bind('@')] },
      },
    },
  };

  const byId = Object.fromEntries(features.map((f) => [f.id, f]));

  root.schema = {
    version: 1,
    sites,
    sharedActions,
    features,
    presets,
    byId,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = root.schema;
  }
})();

  /* --- src/core/storage.js --- */
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

  /* --- src/core/keybind.js --- */
(function () {
  'use strict';
  const root = (globalThis.QCMK = globalThis.QCMK || {});

  const IGNORE_MODIFIER_KEYS = new Set([
    'Control',
    'Shift',
    'Alt',
    'Meta',
    'AltGraph',
    'CapsLock',
    'NumLock',
    'ScrollLock',
  ]);

  const DISPLAY_NAMES = {
    Enter: 'Entrée',
    ArrowLeft: '←',
    ArrowRight: '→',
    ArrowUp: '↑',
    ArrowDown: '↓',
    ' ': 'Espace',
    Spacebar: 'Espace',
    Escape: 'Échap',
    Backspace: 'Retour',
    Tab: 'Tab',
    Delete: 'Suppr',
  };

  function normalizeKey(key) {
    if (typeof key !== 'string') return '';
    if (key === 'Spacebar') return ' ';
    if (key.length === 1 && /^[a-zA-Z]$/.test(key)) {
      return key.toLowerCase();
    }
    return key;
  }

  function matchesBinding(event, binding) {
    if (!event || !binding || !binding.key) return false;

    const wantCtrl = Boolean(binding.ctrl);
    const wantAlt = Boolean(binding.alt);
    const wantMeta = Boolean(binding.meta);

    if (Boolean(event.ctrlKey) !== wantCtrl) return false;
    if (Boolean(event.altKey) !== wantAlt) return false;
    if (Boolean(event.metaKey) !== wantMeta) return false;

    if (typeof binding.shift === 'boolean' && Boolean(event.shiftKey) !== binding.shift) {
      return false;
    }

    return normalizeKey(event.key) === normalizeKey(binding.key);
  }

  function matchesAny(event, bindings) {
    if (!Array.isArray(bindings) || bindings.length === 0) return false;
    for (let i = 0; i < bindings.length; i++) {
      if (matchesBinding(event, bindings[i])) return true;
    }
    return false;
  }

  function isTextInputElement(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.isContentEditable) return true;
    const tag = (el.tagName || '').toUpperCase();
    if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (tag === 'INPUT') {
      const type = (el.type || 'text').toLowerCase();
      return !['checkbox', 'radio', 'button', 'submit', 'reset', 'image', 'file', 'range', 'color'].includes(type);
    }
    return false;
  }

  function isTypingTarget(el) {
    if (isTextInputElement(el)) return true;
    if (typeof document !== 'undefined' && document.activeElement && isTextInputElement(document.activeElement)) {
      return true;
    }
    return false;
  }

  function isPrintableKey(event) {
    if (!event || event.ctrlKey || event.altKey || event.metaKey) return false;
    if (typeof event.key !== 'string' || event.key.length !== 1) return false;
    return !/^\s$/.test(event.key);
  }

  function formatBinding(binding) {
    if (!binding || !binding.key) return '';
    const parts = [];
    if (binding.ctrl) parts.push('Ctrl');
    if (binding.alt) parts.push('Alt');
    if (binding.meta) parts.push('Cmd');
    if (binding.shift === true) parts.push('Maj');

    const keyLabel = DISPLAY_NAMES[binding.key] || (
      binding.key.length === 1 && /^[a-z]$/.test(binding.key)
        ? binding.key.toUpperCase()
        : binding.key
    );
    parts.push(keyLabel);
    return parts.join(' + ');
  }

  function bindingSignature(binding) {
    if (!binding || !binding.key) return '';
    return [
      binding.ctrl ? '1' : '0',
      binding.alt ? '1' : '0',
      binding.meta ? '1' : '0',
      typeof binding.shift === 'boolean' ? (binding.shift ? 'S1' : 'S0') : 'S*',
      normalizeKey(binding.key),
    ].join('|');
  }

  function eventToBinding(event) {
    if (!event || !event.key || IGNORE_MODIFIER_KEYS.has(event.key)) return null;
    const binding = { key: event.key === 'Spacebar' ? ' ' : event.key };
    if (event.ctrlKey) binding.ctrl = true;
    if (event.altKey) binding.alt = true;
    if (event.metaKey) binding.meta = true;
    // Only record explicit Shift when paired with another modifier or a non-character key
    if (event.shiftKey && (event.ctrlKey || event.altKey || event.metaKey || binding.key.length > 1)) {
      binding.shift = true;
    }
    return binding;
  }

  root.keybind = {
    normalizeKey,
    matchesBinding,
    matchesAny,
    isTypingTarget,
    isPrintableKey,
    formatBinding,
    bindingSignature,
    eventToBinding,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = root.keybind;
  }
})();

  /* --- src/core/dom.js --- */
(function () {
  'use strict';
  const root = (globalThis.QCMK = globalThis.QCMK || {});

  function isVisible(el) {
    if (!el || el.nodeType !== 1) return false;
    const style = typeof getComputedStyle === 'function' ? getComputedStyle(el) : null;
    if (style) {
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return false;
      }
    }
    const rect = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    if (!rect) return true;
    return rect.width > 0 && rect.height > 0;
  }

  function normText(str) {
    return String(str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function findButtonByText(rootEl, patterns) {
    const scope = rootEl || document;
    const candidates = scope.querySelectorAll('button, a[role="button"], input[type="submit"], input[type="button"], [role="button"]');
    const list = Array.isArray(patterns) ? patterns : [patterns];

    for (let p = 0; p < list.length; p++) {
      const pat = list[p];
      for (let i = 0; i < candidates.length; i++) {
        const el = candidates[i];
        if (el.disabled || !isVisible(el)) continue;
        const txt = normText(el.value || el.textContent || el.getAttribute('aria-label') || '');
        if (!txt) continue;
        if (pat instanceof RegExp ? pat.test(txt) : txt.includes(normText(pat))) {
          return el;
        }
      }
    }
    return null;
  }

  function findActiveContainer(containers, strategy) {
    const visible = [];
    for (let i = 0; i < containers.length; i++) {
      const el = containers[i];
      if (!isVisible(el)) continue;
      const rect = el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) continue;
      visible.push({ el, rect });
    }
    if (visible.length === 0) return null;

    if (strategy === 'center') {
      const mid = window.innerHeight / 2;
      let best = visible[0];
      let bestDist = Infinity;
      for (const item of visible) {
        const center = (item.rect.top + item.rect.bottom) / 2;
        const dist = Math.abs(center - mid);
        if (dist < bestDist) {
          bestDist = dist;
          best = item;
        }
      }
      return best.el;
    }

    // Default 'top': highest visible container with meaningful viewport presence
    visible.sort((a, b) => {
      const aScore = a.rect.top >= -40 ? a.rect.top : 10000 - a.rect.bottom;
      const bScore = b.rect.top >= -40 ? b.rect.top : 10000 - b.rect.bottom;
      return aScore - bScore;
    });
    return visible[0].el;
  }

  function findScrollContainer(preferredSelectors) {
    if (Array.isArray(preferredSelectors)) {
      for (const sel of preferredSelectors) {
        const el = document.querySelector(sel);
        if (el && isVisible(el) && el.scrollHeight > el.clientHeight + 20) {
          return el;
        }
      }
    }
    const docEl = document.scrollingElement || document.documentElement;
    if (docEl && docEl.scrollHeight > window.innerHeight + 10) {
      return docEl;
    }
    const candidates = document.querySelectorAll('main, [role="main"], .scroll, .overflow-y-auto, .overflow-auto');
    let best = docEl;
    let bestHeight = 0;
    for (let i = 0; i < candidates.length; i++) {
      const el = candidates[i];
      if (!isVisible(el)) continue;
      const style = getComputedStyle(el);
      if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 20) {
        if (el.clientHeight > bestHeight) {
          bestHeight = el.clientHeight;
          best = el;
        }
      }
    }
    return best;
  }

  function scrollByStep(container, deltaY, smooth) {
    const target = container || document.scrollingElement || document.documentElement;
    const behavior = smooth ? 'smooth' : 'auto';
    if (target === document.documentElement || target === document.body) {
      window.scrollBy({ top: deltaY, behavior });
    } else if (target && typeof target.scrollBy === 'function') {
      target.scrollBy({ top: deltaY, behavior });
    } else if (target) {
      target.scrollTop += deltaY;
    }
  }

  function safeClick(el) {
    if (!el) return false;
    try {
      if (typeof el.scrollIntoView === 'function') {
        const rect = el.getBoundingClientRect();
        if (rect.top < 0 || rect.bottom > window.innerHeight) {
          el.scrollIntoView({ block: 'nearest', behavior: 'auto' });
        }
      }
      el.click();
      return true;
    } catch (_) {
      return false;
    }
  }

  let toastTimer = null;
  function showToast(message) {
    if (typeof document === 'undefined' || !document.body) return;
    let el = document.getElementById('qcmk-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'qcmk-toast';
      Object.assign(el.style, {
        position: 'fixed',
        right: '16px',
        bottom: '16px',
        zIndex: '2147483647',
        background: '#18181b',
        color: '#fafafa',
        border: '1px solid #3f3f46',
        borderRadius: '6px',
        padding: '8px 12px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: '13px',
        lineHeight: '1.3',
        pointerEvents: 'none',
        opacity: '0',
        transition: 'opacity 120ms ease',
      });
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.style.opacity = '1';
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      if (el) el.style.opacity = '0';
    }, 1600);
  }

  function injectStyle(id, cssText) {
    if (typeof document === 'undefined') return null;
    let el = document.getElementById(id);
    if (!cssText) {
      if (el) el.remove();
      return null;
    }
    if (!el) {
      el = document.createElement('style');
      el.id = id;
      (document.head || document.documentElement).appendChild(el);
    }
    if (el.textContent !== cssText) el.textContent = cssText;
    return el;
  }

  class FlagStore {
    constructor(namespace) {
      this.prefix = 'qcmk_flags_' + namespace + '_';
    }
    _read(examKey) {
      try {
        const raw = localStorage.getItem(this.prefix + examKey);
        const arr = raw ? JSON.parse(raw) : [];
        return new Set(Array.isArray(arr) ? arr.map(String) : []);
      } catch (_) {
        return new Set();
      }
    }
    _write(examKey, set) {
      try {
        localStorage.setItem(this.prefix + examKey, JSON.stringify(Array.from(set)));
      } catch (_) {}
    }
    getFlags(examKey) {
      return this._read(examKey);
    }
    toggleFlag(examKey, qKey) {
      const set = this._read(examKey);
      const id = String(qKey);
      const added = !set.has(id);
      if (added) set.add(id);
      else set.delete(id);
      this._write(examKey, set);
      return { added, flags: set };
    }
    clearFlags(examKey) {
      try {
        localStorage.removeItem(this.prefix + examKey);
      } catch (_) {}
    }
  }

  function clearKeyHints() {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('.qcmk-hint').forEach((n) => n.remove());
  }

  function renderKeyHints(items) {
    clearKeyHints();
    if (!Array.isArray(items) || items.length === 0) return;

    injectStyle(
      'qcmk-hint-style',
      '.qcmk-hint{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;margin-left:6px;border-radius:4px;border:1px solid #d4d4d8;background:#f4f4f5;color:#18181b;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;font-weight:600;line-height:1;vertical-align:middle;pointer-events:none;}'
    );

    for (const item of items) {
      if (!item || !item.el || !item.label || !isVisible(item.el)) continue;
      if (item.el.querySelector('.qcmk-hint')) continue;
      const kbd = document.createElement('kbd');
      kbd.className = 'qcmk-hint';
      kbd.textContent = item.label;
      if (item.el.tagName === 'INPUT') {
        item.el.insertAdjacentElement('afterend', kbd);
      } else {
        item.el.appendChild(kbd);
      }
    }
  }

  root.dom = {
    isVisible,
    normText,
    findButtonByText,
    findActiveContainer,
    findScrollContainer,
    scrollByStep,
    safeClick,
    showToast,
    injectStyle,
    FlagStore,
    renderKeyHints,
    clearKeyHints,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = root.dom;
  }
})();

  /* --- src/adapters/edn.js --- */
(function () {
  'use strict';
  const root = (globalThis.QCMK = globalThis.QCMK || {});
  const adapters = (root.adapters = root.adapters || {});

  function createEdnAdapter() {
    const dom = root.dom;
    const kb = root.keybind;
    const flagStore = new dom.FlagStore('edn');
    const NOTE_STORE_PREFIX = 'qcmk_edn_notes_';
    let lastCtx = null;
    let resizeHandler = null;

    function detectMode() {
      const path = (location.pathname || '').toLowerCase();
      if (/ancrage/.test(path)) return 'ancrage';
      if (/exam|annale|concours|epreuve/.test(path)) return 'exam';
      if (/training|entrainement/.test(path)) return 'training';
      const qCards = document.querySelectorAll('[data-question-id], .question-card, .question-container, [id^="question-"]');
      if (qCards.length > 1) return 'exam';
      return 'training';
    }

    function getExamKey() {
      return (location.pathname || '/').replace(/\/+$/, '') || 'default';
    }

    function getQuestionContainers() {
      const selectors = [
        '[data-question-id]',
        '[id^="question-"]',
        '.question-card',
        '.question-container',
        'article',
      ];
      for (const sel of selectors) {
        const list = Array.from(document.querySelectorAll(sel)).filter((el) => dom.isVisible(el));
        if (list.length > 0) return list;
      }
      return [document.body];
    }

    function getActiveQuestion(mode) {
      const containers = getQuestionContainers();
      if (containers.length === 1) return containers[0];
      return dom.findActiveContainer(containers, mode === 'exam' ? 'center' : 'top') || document.body;
    }

    function getChoiceTargets(scope) {
      const rootEl = scope || document;
      const inputs = Array.from(rootEl.querySelectorAll('input[type="checkbox"], input[type="radio"]')).filter((el) => {
        if (el.disabled) return false;
        const label = el.closest('label') || el.parentElement;
        return dom.isVisible(el) || (label && dom.isVisible(label));
      });
      if (inputs.length > 0) {
        return inputs.map((input) => input.closest('label') || input);
      }

      const buttons = Array.from(
        rootEl.querySelectorAll('[role="checkbox"], [role="radio"], button[data-choice], .choice-item, .proposition-item, li button')
      ).filter((el) => dom.isVisible(el) && !el.disabled);
      if (buttons.length > 0) return buttons;

      // Fallback: letter-prefixed proposition rows (A., B., C., ...)
      const candidates = Array.from(rootEl.querySelectorAll('label, [role="button"], button, li')).filter((el) => {
        if (!dom.isVisible(el) || el.disabled) return false;
        const txt = (el.textContent || '').trim();
        return /^[A-J][\s.):\-]+/.test(txt);
      });
      return candidates.slice(0, 10);
    }

    function findQrocInput(scope) {
      const rootEl = scope || document;
      const fields = Array.from(rootEl.querySelectorAll('textarea, input[type="text"], input:not([type]), [contenteditable="true"]'))
        .filter((el) => !el.disabled && !el.readOnly && dom.isVisible(el));
      return fields[0] || null;
    }

    function findTimerButton() {
      const candidates = Array.from(document.querySelectorAll('button, [role="button"]')).filter((el) => dom.isVisible(el));
      for (const el of candidates) {
        const txt = (el.textContent || '').trim();
        const aria = dom.normText(el.getAttribute('aria-label') || el.getAttribute('title') || '');
        if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(txt) || /minuteur|chrono|timer|pause/.test(aria)) {
          return el;
        }
      }
      return null;
    }

    function toggleHalfScreenStyle(ctx) {
      const enabled = ctx.isEnabled('edn.training.halfscreen') && detectMode() === 'training' && window.innerWidth <= 920;
      if (!enabled) {
        dom.injectStyle('qcmk-edn-halfscreen', '');
        return;
      }
      dom.injectStyle(
        'qcmk-edn-halfscreen',
        '@media (max-width:920px){header,.training-header,[class*="TrainingHeader"]{padding-top:4px!important;padding-bottom:4px!important;min-height:unset!important;}[class*="progress"],[class*="Progress"]{margin-bottom:4px!important;}}'
      );
    }

    function applyInlineScores(ctx) {
      const enabled = ctx.isEnabled('edn.inlineScores');
      document.querySelectorAll('.qcmk-score-badge').forEach((n) => n.classList.remove('qcmk-score-badge', 'qcmk-score-good', 'qcmk-score-mid', 'qcmk-score-low'));
      if (!enabled) {
        dom.injectStyle('qcmk-edn-scores-css', '');
        return;
      }
      dom.injectStyle(
        'qcmk-edn-scores-css',
        '.qcmk-score-good{color:#15803d!important;font-weight:600!important;}.qcmk-score-mid{color:#b45309!important;font-weight:600!important;}.qcmk-score-low{color:#b91c1c!important;font-weight:600!important;}'
      );

      const nodes = document.querySelectorAll('span, div, p, strong, badge');
      for (let i = 0; i < nodes.length; i++) {
        const el = nodes[i];
        if (el.children.length > 0 || !dom.isVisible(el)) continue;
        const m = (el.textContent || '').trim().match(/^(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)\s*pts?$/i);
        if (!m) continue;
        const got = parseFloat(m[1].replace(',', '.'));
        const max = parseFloat(m[2].replace(',', '.'));
        if (!max) continue;
        const ratio = got / max;
        const cls = ratio >= 0.8 ? 'qcmk-score-good' : ratio >= 0.5 ? 'qcmk-score-mid' : 'qcmk-score-low';
        el.classList.add('qcmk-score-badge', cls);
      }
    }

    function getSidebarItems() {
      return Array.from(
        document.querySelectorAll('aside a, nav a, [class*="sidebar"] button, [class*="Sidebar"] button, [class*="nav"] button')
      ).filter((el) => {
        if (!dom.isVisible(el)) return false;
        const txt = (el.textContent || '').trim();
        return /^Q?\d{1,3}$/.test(txt);
      });
    }

    function applySidebarScores(ctx) {
      const enabled = ctx.isEnabled('edn.sidebarScores');
      const oldBadge = document.getElementById('qcmk-dossier-score');
      if (oldBadge) oldBadge.remove();
      if (!enabled) return;

      const examKey = NOTE_STORE_PREFIX + getExamKey();
      let notes = {};
      try {
        notes = JSON.parse(localStorage.getItem(examKey) || '{}');
      } catch (_) {
        notes = {};
      }

      const containers = getQuestionContainers();
      let totalGot = 0;
      let totalMax = 0;
      containers.forEach((q, idx) => {
        const txt = q.textContent || '';
        const m = txt.match(/(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)\s*pts?/i);
        if (m) {
          const got = parseFloat(m[1].replace(',', '.'));
          const max = parseFloat(m[2].replace(',', '.'));
          if (max > 0) {
            notes[String(idx + 1)] = { got, max };
          }
        }
      });
      try {
        localStorage.setItem(examKey, JSON.stringify(notes));
      } catch (_) {}

      const entries = Object.entries(notes);
      for (const [, v] of entries) {
        totalGot += v.got;
        totalMax += v.max;
      }

      const sidebarItems = getSidebarItems();
      sidebarItems.forEach((item) => {
        const num = (item.textContent || '').replace(/\D/g, '');
        const entry = notes[num];
        if (!entry) return;
        const ratio = entry.got / entry.max;
        item.style.borderColor = ratio >= 0.8 ? '#15803d' : ratio >= 0.5 ? '#b45309' : '#b91c1c';
        item.style.borderWidth = '2px';
        item.style.borderStyle = 'solid';
      });

      if (ctx.option('edn.sidebarScores', 'showBadge') && totalMax > 0 && sidebarItems.length > 0) {
        const parent = sidebarItems[0].closest('aside, nav, [class*="sidebar"], [class*="Sidebar"]');
        if (parent) {
          const badge = document.createElement('div');
          badge.id = 'qcmk-dossier-score';
          Object.assign(badge.style, {
            margin: '8px 0',
            padding: '6px 10px',
            borderRadius: '6px',
            border: '1px solid #d4d4d8',
            background: '#f4f4f5',
            color: '#18181b',
            fontSize: '12px',
            fontWeight: '600',
          });
          const pct = Math.round((totalGot / totalMax) * 100);
          badge.textContent = 'Score dossier : ' + totalGot.toFixed(1).replace(/\.0$/, '') + ' / ' + totalMax.toFixed(1).replace(/\.0$/, '') + ' (' + pct + '%)';
          parent.prepend(badge);
        }
      }
    }

    function renderFlags(ctx) {
      document.querySelectorAll('.qcmk-flag-pill').forEach((n) => n.remove());
      if (!ctx.isEnabled('edn.exam.flags') || detectMode() !== 'exam') return;

      const flags = flagStore.getFlags(getExamKey());
      const containers = getQuestionContainers();
      containers.forEach((q, idx) => {
        const qid = q.getAttribute('data-question-id') || q.id || String(idx + 1);
        if (!flags.has(qid) && !flags.has(String(idx + 1))) return;
        const pill = document.createElement('span');
        pill.className = 'qcmk-flag-pill';
        pill.textContent = 'Drapeau';
        Object.assign(pill.style, {
          display: 'inline-block',
          marginLeft: '8px',
          padding: '2px 7px',
          borderRadius: '4px',
          background: '#fef2f2',
          border: '1px solid #fca5a5',
          color: '#b91c1c',
          fontSize: '11px',
          fontWeight: '600',
        });
        const heading = q.querySelector('h1, h2, h3, h4, .question-title, header') || q;
        heading.appendChild(pill);
      });

      const sidebarItems = getSidebarItems();
      sidebarItems.forEach((item) => {
        const num = (item.textContent || '').replace(/\D/g, '');
        if (flags.has(num)) {
          item.style.outline = '2px solid #b91c1c';
          item.style.outlineOffset = '1px';
        } else {
          item.style.outline = '';
        }
      });
    }

    function applyRefouaLinks(ctx) {
      if (!ctx.isEnabled('edn.refouaLinks')) return;
      const tags = document.querySelectorAll('span, div, a, button, badge');
      for (let i = 0; i < tags.length; i++) {
        const el = tags[i];
        if (el.dataset.qcmkRefouaBound || el.children.length > 0 || !dom.isVisible(el)) continue;
        const txt = (el.textContent || '').trim();
        const match = txt.match(/\b(Rang\s*[ABC]\s*[-:–]?\s*[A-Za-z0-9\-_. ]{2,80})/i) || txt.match(/\b(OIC-\d{3}-\d{2}-[ABC]-\d{2})\b/i);
        if (!match) continue;
        el.dataset.qcmkRefouaBound = '1';
        el.style.cursor = 'pointer';
        el.style.textDecoration = 'underline';
        el.title = 'Ouvrir l\'objectif sur Refoua (Ctrl+clic : nouvel onglet)';
        el.addEventListener('click', (ev) => {
          ev.stopPropagation();
          const query = encodeURIComponent(match[1].trim());
          const url = 'https://refoua.fr/#qcm-lisa=' + query;
          if (ev.ctrlKey || ev.metaKey) {
            window.open(url, '_blank', 'noopener');
          } else {
            window.open(url, 'qcmk_refoua');
          }
        });
      }
    }

    function applyAncrageCounters(ctx) {
      if (!ctx.isEnabled('edn.ancrageCounters') || detectMode() !== 'ancrage') return;
      if (document.getElementById('qcmk-ancrage-summary')) return;

      const rows = Array.from(document.querySelectorAll('[data-matiere], .matiere-card, .ancrage-item, tr')).filter((el) => dom.isVisible(el));
      if (rows.length === 0) return;

      const counts = new Map();
      rows.forEach((row) => {
        const label = row.getAttribute('data-matiere') || (row.querySelector('h3, h4, td, strong') || row).textContent || '';
        const clean = label.trim().split('\n')[0].slice(0, 50);
        if (clean) counts.set(clean, (counts.get(clean) || 0) + 1);
      });
      if (counts.size === 0) return;

      const box = document.createElement('div');
      box.id = 'qcmk-ancrage-summary';
      Object.assign(box.style, {
        margin: '12px 0',
        padding: '10px 14px',
        border: '1px solid #e4e4e7',
        borderRadius: '8px',
        background: '#fafafa',
        color: '#18181b',
        fontSize: '13px',
      });
      const title = document.createElement('div');
      title.style.fontWeight = '600';
      title.style.marginBottom = '6px';
      title.textContent = 'Ancrages détectés par matière';
      box.appendChild(title);

      const list = document.createElement('div');
      list.style.display = 'flex';
      list.style.flexWrap = 'wrap';
      list.style.gap = '6px';
      for (const [mat, count] of counts.entries()) {
        const chip = document.createElement('span');
        chip.textContent = mat + ' : ' + count;
        Object.assign(chip.style, {
          padding: '2px 8px',
          borderRadius: '4px',
          border: '1px solid #d4d4d8',
          background: '#ffffff',
          fontSize: '12px',
        });
        list.appendChild(chip);
      }
      box.appendChild(list);

      const main = document.querySelector('main') || document.body;
      main.prepend(box);
    }

    function applyKeyHints(ctx) {
      if (!ctx.isEnabled('edn.keyHints')) {
        dom.clearKeyHints();
        return;
      }
      const mode = detectMode();
      const scope = getActiveQuestion(mode);
      const items = [];
      const choices = getChoiceTargets(scope);
      choices.slice(0, 10).forEach((el, idx) => {
        const label = ctx.formatFirst(ctx.sharedBindings('choice.' + (idx + 1)));
        if (label) items.push({ el, label });
      });

      const valBtn = dom.findButtonByText(scope, [/^valider$/, /^soumettre$/, /^verifier$/])
        || dom.findButtonByText(document, [/^valider$/, /^soumettre$/]);
      if (valBtn) {
        const fId = mode === 'exam' ? 'edn.exam.answer' : 'edn.training.answer';
        items.push({ el: valBtn, label: ctx.formatFirst(ctx.bindings(fId, 'validate')) });
      }

      if (mode === 'training') {
        const prevBtn = dom.findButtonByText(document, [/precedent/, /^retour$/]);
        const nextBtn = dom.findButtonByText(document, [/suivant/, /continuer/]);
        if (prevBtn) items.push({ el: prevBtn, label: ctx.formatFirst(ctx.bindings('edn.training.nav', 'prev')) });
        if (nextBtn) items.push({ el: nextBtn, label: ctx.formatFirst(ctx.bindings('edn.training.nav', 'next')) });
      }

      const timerBtn = findTimerButton();
      if (timerBtn) {
        items.push({ el: timerBtn, label: ctx.formatFirst(ctx.bindings('edn.timer', 'toggle')) });
      }

      dom.renderKeyHints(items);
    }

    function refresh(ctx) {
      lastCtx = ctx;
      toggleHalfScreenStyle(ctx);
      applyInlineScores(ctx);
      applySidebarScores(ctx);
      renderFlags(ctx);
      applyRefouaLinks(ctx);
      applyAncrageCounters(ctx);
      applyKeyHints(ctx);
    }

    return {
      init(ctx) {
        refresh(ctx);
        resizeHandler = () => {
          if (lastCtx) toggleHalfScreenStyle(lastCtx);
        };
        window.addEventListener('resize', resizeHandler);
      },

      onDomMutate(ctx) {
        refresh(ctx);
      },

      onKeyDown(e, ctx) {
        const mode = detectMode();
        const activeQ = getActiveQuestion(mode);
        const typing = kb.isTypingTarget(e.target);

        // QROC autofocus when user starts typing a printable character
        const qrocEnabled = mode === 'exam' ? ctx.isEnabled('edn.exam.qroc') : ctx.isEnabled('edn.training.qroc');
        if (!typing && qrocEnabled && kb.isPrintableKey(e)) {
          const idx = ctx.matchSharedChoice(e);
          const choices = getChoiceTargets(activeQ);
          // Only autofocus QROC if no choice targets exist in this question
          if (choices.length === 0 || idx === -1) {
            const qroc = findQrocInput(activeQ);
            if (qroc && choices.length === 0) {
              qroc.focus();
              return false;
            }
          }
        }

        if (typing) {
          // Allow Enter inside textarea only with Shift, or allow shortcut validate if single-line input is not multi-line
          return false;
        }

        // Scroll
        if (ctx.isEnabled('edn.scroll')) {
          const step = ctx.option('edn.scroll', 'step') || 200;
          const scroller = dom.findScrollContainer(['main', '[class*="question"]', '.overflow-y-auto']);
          if (ctx.matches(e, 'edn.scroll', 'down')) {
            dom.scrollByStep(scroller, step, false);
            return true;
          }
          if (ctx.matches(e, 'edn.scroll', 'up')) {
            dom.scrollByStep(scroller, -step, false);
            return true;
          }
        }

        // Timer
        if (ctx.isEnabled('edn.timer') && ctx.matches(e, 'edn.timer', 'toggle')) {
          const timerBtn = findTimerButton();
          if (timerBtn && dom.safeClick(timerBtn)) {
            dom.showToast('Minuteur basculé');
            return true;
          }
        }

        // Shared choices 1-10
        const answerFeat = mode === 'exam' ? 'edn.exam.answer' : 'edn.training.answer';
        if (ctx.isEnabled(answerFeat)) {
          const choiceIdx = ctx.matchSharedChoice(e);
          if (choiceIdx !== -1) {
            const choices = getChoiceTargets(activeQ);
            if (choices[choiceIdx]) {
              dom.safeClick(choices[choiceIdx]);
              return true;
            }
          }
          if (ctx.matches(e, answerFeat, 'validate')) {
            const valBtn = dom.findButtonByText(activeQ, [/^valider$/, /^soumettre$/, /^verifier$/, /valider la reponse/])
              || dom.findButtonByText(document, [/^valider$/, /^soumettre$/]);
            if (valBtn) {
              dom.safeClick(valBtn);
              return true;
            }
          }
        }

        // Training correction & navigation & ancrage
        if (mode === 'training') {
          if (ctx.isEnabled('edn.training.correction')) {
            if (ctx.matches(e, 'edn.training.correction', 'unsure')) {
              const btn = dom.findButtonByText(document, [/rappelais un peu/, /un peu/, /hesit/]);
              if (btn) { dom.safeClick(btn); return true; }
            }
            if (ctx.matches(e, 'edn.training.correction', 'random')) {
              const btn = dom.findButtonByText(document, [/savais pas/, /au hasard/, /pas du tout/]);
              if (btn) { dom.safeClick(btn); return true; }
            }
            if (ctx.matches(e, 'edn.training.correction', 'sureOrNext')) {
              const btn = dom.findButtonByText(document, [/connaissais/, /question suivante/, /^suivante?$/, /^continuer$/]);
              if (btn) { dom.safeClick(btn); return true; }
            }
          }

          if (ctx.isEnabled('edn.training.nav')) {
            if (ctx.matches(e, 'edn.training.nav', 'prev')) {
              const btn = dom.findButtonByText(document, [/question precedente/, /^precedent/, /^retour$/]);
              if (btn) { dom.safeClick(btn); return true; }
            }
            if (ctx.matches(e, 'edn.training.nav', 'next')) {
              const btn = dom.findButtonByText(document, [/question suivante/, /^suivant/, /^continuer$/]);
              if (btn) { dom.safeClick(btn); return true; }
            }
          }

          if (ctx.isEnabled('edn.training.ancrage')) {
            if (ctx.matches(e, 'edn.training.ancrage', 'toggle')) {
              const btn = dom.findButtonByText(document, [/ancrage/, /a revoir/]);
              if (btn) { dom.safeClick(btn); dom.showToast('Ancrage mis à jour'); return true; }
            }
            if (ctx.matches(e, 'edn.training.ancrage', 'add')) {
              const btn = dom.findButtonByText(document, [/ajouter.*ancrage/, /ancrer/]);
              if (btn) { dom.safeClick(btn); return true; }
            }
            if (ctx.matches(e, 'edn.training.ancrage', 'remove')) {
              const btn = dom.findButtonByText(document, [/retirer.*ancrage/, /supprimer.*ancrage/]);
              if (btn) { dom.safeClick(btn); return true; }
            }
            if (ctx.matches(e, 'edn.training.ancrage', 'noReview')) {
              const btn = dom.findButtonByText(document, [/ne plus revoir/]);
              if (btn) { dom.safeClick(btn); dom.showToast('Marqué : ne plus revoir'); return true; }
            }
          }
        }

        // Exam flags & sidebar notes clear
        if (mode === 'exam') {
          if (ctx.isEnabled('edn.exam.flags')) {
            if (ctx.matches(e, 'edn.exam.flags', 'clearAll')) {
              flagStore.clearFlags(getExamKey());
              renderFlags(ctx);
              dom.showToast('Tous les drapeaux de l\'épreuve supprimés');
              return true;
            }
            if (ctx.matches(e, 'edn.exam.flags', 'toggle')) {
              const containers = getQuestionContainers();
              const idx = Math.max(0, containers.indexOf(activeQ));
              const qid = activeQ.getAttribute('data-question-id') || activeQ.id || String(idx + 1);
              const res = flagStore.toggleFlag(getExamKey(), qid);
              renderFlags(ctx);
              dom.showToast(res.added ? 'Drapeau ajouté' : 'Drapeau retiré');
              return true;
            }
          }

          if (ctx.isEnabled('edn.sidebarScores') && ctx.matches(e, 'edn.sidebarScores', 'clearNotes')) {
            try {
              localStorage.removeItem(NOTE_STORE_PREFIX + getExamKey());
            } catch (_) {}
            applySidebarScores(ctx);
            dom.showToast('Notes mémorisées effacées');
            return true;
          }
        }

        return false;
      },

      destroy() {
        dom.injectStyle('qcmk-edn-halfscreen', '');
        dom.injectStyle('qcmk-edn-scores-css', '');
        dom.clearKeyHints();
        if (resizeHandler) {
          window.removeEventListener('resize', resizeHandler);
          resizeHandler = null;
        }
      },
    };
  }

  adapters.edn = createEdnAdapter();
})();

  /* --- src/adapters/hypocampus.js --- */
(function () {
  'use strict';
  const root = (globalThis.QCMK = globalThis.QCMK || {});
  const adapters = (root.adapters = root.adapters || {});

  function createHypocampusAdapter() {
    const dom = root.dom;
    const kb = root.keybind;

    function getChoiceTargets() {
      const inputs = Array.from(document.querySelectorAll('input[type="checkbox"], input[type="radio"]')).filter((el) => {
        if (el.disabled) return false;
        const lbl = el.closest('label') || el.parentElement;
        return dom.isVisible(el) || (lbl && dom.isVisible(lbl));
      });
      if (inputs.length > 0) {
        return inputs.map((el) => el.closest('label') || el);
      }

      const exposed = Array.from(document.querySelectorAll('.qcmk-exposed-choice')).filter((el) => dom.isVisible(el));
      if (exposed.length > 0) return exposed;

      return Array.from(document.querySelectorAll('.answer-option, .choice, [role="checkbox"], [role="radio"]'))
        .filter((el) => dom.isVisible(el) && !el.disabled)
        .slice(0, 10);
    }

    function autofocusQroc(ctx) {
      if (!ctx.isEnabled('hypo.autofocus')) return;
      if (kb.isTypingTarget(document.activeElement)) return;
      const field = Array.from(document.querySelectorAll('textarea, input[type="text"], input:not([type])'))
        .find((el) => !el.disabled && !el.readOnly && dom.isVisible(el));
      if (field && field.dataset.qcmkFocused !== '1') {
        field.dataset.qcmkFocused = '1';
        field.focus();
      }
    }

    function exposeDropdowns(ctx) {
      if (!ctx.isEnabled('hypo.exposeDropdown')) return;
      const selects = Array.from(document.querySelectorAll('select')).filter((s) => dom.isVisible(s) && !s.dataset.qcmkExposed);
      for (const select of selects) {
        select.dataset.qcmkExposed = '1';
        const wrap = document.createElement('div');
        wrap.className = 'qcmk-exposed-group';
        Object.assign(wrap.style, {
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          marginTop: '8px',
        });

        Array.from(select.options).forEach((opt) => {
          if (!opt.value && /choisis|selection/i.test(dom.normText(opt.textContent))) return;
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'qcmk-exposed-choice';
          btn.textContent = opt.textContent.trim();
          const syncStyle = () => {
            const active = select.multiple ? opt.selected : select.value === opt.value;
            Object.assign(btn.style, {
              textAlign: 'left',
              padding: '7px 10px',
              borderRadius: '6px',
              border: active ? '1px solid #1d4ed8' : '1px solid #d4d4d8',
              background: active ? '#eff6ff' : '#ffffff',
              color: '#18181b',
              fontSize: '13px',
              cursor: 'pointer',
            });
          };
          syncStyle();
          btn.addEventListener('click', () => {
            if (select.multiple) {
              opt.selected = !opt.selected;
            } else {
              select.value = opt.value;
            }
            select.dispatchEvent(new Event('change', { bubbles: true }));
            wrap.querySelectorAll('.qcmk-exposed-choice').forEach((b, i) => {
              const o = select.options[i + (select.options[0] && !select.options[0].value ? 1 : 0)];
              if (!o) return;
              const active = select.multiple ? o.selected : select.value === o.value;
              b.style.border = active ? '1px solid #1d4ed8' : '1px solid #d4d4d8';
              b.style.background = active ? '#eff6ff' : '#ffffff';
            });
          });
          wrap.appendChild(btn);
        });
        select.insertAdjacentElement('afterend', wrap);
      }
    }

    return {
      init(ctx) {
        autofocusQroc(ctx);
        exposeDropdowns(ctx);
      },

      onDomMutate(ctx) {
        autofocusQroc(ctx);
        exposeDropdowns(ctx);
      },

      onKeyDown(e, ctx) {
        if (kb.isTypingTarget(e.target)) return false;

        if (ctx.isEnabled('hypo.scroll')) {
          const step = ctx.option('hypo.scroll', 'step') || 200;
          const scroller = dom.findScrollContainer(['main', '.question-wrapper']);
          if (ctx.matches(e, 'hypo.scroll', 'down')) {
            dom.scrollByStep(scroller, step, false);
            return true;
          }
          if (ctx.matches(e, 'hypo.scroll', 'up')) {
            dom.scrollByStep(scroller, -step, false);
            return true;
          }
        }

        if (ctx.isEnabled('hypo.answer')) {
          const idx = ctx.matchSharedChoice(e);
          if (idx !== -1) {
            const choices = getChoiceTargets();
            if (choices[idx]) {
              dom.safeClick(choices[idx]);
              return true;
            }
          }
          if (ctx.matches(e, 'hypo.answer', 'validate')) {
            const btn = dom.findButtonByText(document, [/^verifier$/, /^valider$/, /^continuer$/, /question suivante/]);
            if (btn) {
              dom.safeClick(btn);
              return true;
            }
          }
        }

        if (ctx.isEnabled('hypo.nav')) {
          if (ctx.matches(e, 'hypo.nav', 'prev')) {
            const btn = dom.findButtonByText(document, [/^precedent/, /question precedente/, /^retour$/]);
            if (btn) { dom.safeClick(btn); return true; }
          }
          if (ctx.matches(e, 'hypo.nav', 'next')) {
            const btn = dom.findButtonByText(document, [/^suivant/, /question suivante/, /^continuer$/]);
            if (btn) { dom.safeClick(btn); return true; }
          }
        }

        return false;
      },

      destroy() {},
    };
  }

  adapters.hypocampus = createHypocampusAdapter();
})();

  /* --- src/adapters/uness.js --- */
(function () {
  'use strict';
  const root = (globalThis.QCMK = globalThis.QCMK || {});
  const adapters = (root.adapters = root.adapters || {});

  function createUnessAdapter() {
    const dom = root.dom;
    const kb = root.keybind;

    function getQuestions() {
      return Array.from(document.querySelectorAll('.que')).filter((el) => dom.isVisible(el));
    }

    function getActiveQuestion() {
      const list = getQuestions();
      if (list.length === 0) return document.body;
      return dom.findActiveContainer(list, 'top') || list[0];
    }

    function getChoiceTargets(qEl) {
      const inputs = Array.from(qEl.querySelectorAll('.answer input[type="checkbox"], .answer input[type="radio"]'))
        .filter((el) => !el.disabled);
      return inputs.map((el) => el.closest('label') || el.closest('.r0, .r1, div, p') || el);
    }

    return {
      init() {},
      onDomMutate() {},

      onKeyDown(e, ctx) {
        if (kb.isTypingTarget(e.target)) return false;

        if (ctx.isEnabled('uness.scroll')) {
          const step = ctx.option('uness.scroll', 'step') || 200;
          const scroller = dom.findScrollContainer(['#region-main', 'main']);
          if (ctx.matches(e, 'uness.scroll', 'down')) {
            dom.scrollByStep(scroller, step, false);
            return true;
          }
          if (ctx.matches(e, 'uness.scroll', 'up')) {
            dom.scrollByStep(scroller, -step, false);
            return true;
          }
        }

        const activeQ = getActiveQuestion();

        if (ctx.isEnabled('uness.flags') && ctx.matches(e, 'uness.flags', 'toggle')) {
          const flagToggle = activeQ.querySelector('.questionflag input[type="image"], .questionflag a, .questionflag button, [aria-label*="drapeau" i], [title*="marquer" i]')
            || dom.findButtonByText(activeQ, [/marquer la question/, /drapeau/]);
          if (flagToggle && dom.safeClick(flagToggle)) {
            dom.showToast('Drapeau mis à jour');
            return true;
          }
        }

        if (ctx.isEnabled('uness.answer')) {
          const idx = ctx.matchSharedChoice(e);
          if (idx !== -1) {
            const choices = getChoiceTargets(activeQ);
            if (choices[idx]) {
              dom.safeClick(choices[idx]);
              return true;
            }
          }

          if (ctx.matches(e, 'uness.answer', 'validate')) {
            const submitInQ = activeQ.querySelector('input[type="submit"], button[type="submit"]')
              || dom.findButtonByText(activeQ, [/^verifier$/, /^valider$/, /^enregistrer$/]);
            if (submitInQ && dom.isVisible(submitInQ)) {
              dom.safeClick(submitInQ);
              return true;
            }
            const list = getQuestions();
            const currentIdx = list.indexOf(activeQ);
            if (currentIdx !== -1 && currentIdx + 1 < list.length) {
              list[currentIdx + 1].scrollIntoView({ behavior: 'smooth', block: 'start' });
              return true;
            }
            const nextPage = dom.findButtonByText(document, [/page suivante/, /suivant/, /terminer le test/]);
            if (nextPage) {
              dom.safeClick(nextPage);
              return true;
            }
          }
        }

        return false;
      },

      destroy() {},
    };
  }

  adapters.uness = createUnessAdapter();
})();

  /* --- src/adapters/asclepia.js --- */
(function () {
  'use strict';
  const root = (globalThis.QCMK = globalThis.QCMK || {});
  const adapters = (root.adapters = root.adapters || {});

  function createAsclepiaAdapter() {
    const dom = root.dom;
    const kb = root.keybind;
    const flagStore = new dom.FlagStore('asclepia');
    let headerCollapsed = true;

    function getExamKey() {
      return (location.pathname || '/').replace(/\/(corrections?|results?)\/?$/i, '') || 'default';
    }

    function isCorrectionView() {
      return /correction/i.test(location.pathname || '');
    }

    function getQuestions() {
      const selectors = ['[data-question-id]', '[id^="question-"]', '.question-card', 'article'];
      for (const sel of selectors) {
        const list = Array.from(document.querySelectorAll(sel)).filter((el) => dom.isVisible(el));
        if (list.length > 0) return list;
      }
      return [document.body];
    }

    function getActiveQuestion() {
      const list = getQuestions();
      if (list.length === 1) return list[0];
      return dom.findActiveContainer(list, 'top') || list[0];
    }

    function getChoiceTargets(scope) {
      const inputs = Array.from(scope.querySelectorAll('input[type="checkbox"], input[type="radio"]'))
        .filter((el) => !el.disabled);
      if (inputs.length > 0) {
        return inputs.map((el) => el.closest('label') || el);
      }
      return Array.from(scope.querySelectorAll('[role="checkbox"], [role="radio"], button[data-choice], .choice-button'))
        .filter((el) => dom.isVisible(el) && !el.disabled)
        .slice(0, 10);
    }

    function applyCompactHeader(ctx) {
      const oldBtn = document.getElementById('qcmk-asclepia-header-btn');
      if (!ctx.isEnabled('asclepia.compactHeader') || isCorrectionView()) {
        if (oldBtn) oldBtn.remove();
        dom.injectStyle('qcmk-asclepia-header-css', '');
        return;
      }

      if (headerCollapsed) {
        dom.injectStyle(
          'qcmk-asclepia-header-css',
          'header, [data-testid="exam-header"], .exam-header { display: none !important; }'
        );
      } else {
        dom.injectStyle('qcmk-asclepia-header-css', '');
      }

      if (!oldBtn && document.body) {
        const btn = document.createElement('button');
        btn.id = 'qcmk-asclepia-header-btn';
        btn.type = 'button';
        btn.textContent = headerCollapsed ? 'Afficher la barre' : 'Masquer la barre';
        Object.assign(btn.style, {
          position: 'fixed',
          top: '8px',
          right: '12px',
          zIndex: '2147483646',
          padding: '5px 10px',
          borderRadius: '6px',
          border: '1px solid #d4d4d8',
          background: '#ffffff',
          color: '#18181b',
          fontSize: '12px',
          fontWeight: '600',
          cursor: 'pointer',
        });
        btn.addEventListener('click', () => {
          headerCollapsed = !headerCollapsed;
          btn.textContent = headerCollapsed ? 'Afficher la barre' : 'Masquer la barre';
          applyCompactHeader(ctx);
        });
        document.body.appendChild(btn);
      }
    }

    function renderFlags(ctx) {
      document.querySelectorAll('.qcmk-asclepia-flag').forEach((n) => n.remove());
      const showHere = isCorrectionView() ? ctx.isEnabled('asclepia.correctionFlags') : ctx.isEnabled('asclepia.flags');
      if (!showHere) return;

      const flags = flagStore.getFlags(getExamKey());
      const questions = getQuestions();
      questions.forEach((q, idx) => {
        const qid = q.getAttribute('data-question-id') || q.id || String(idx + 1);
        if (!flags.has(qid) && !flags.has(String(idx + 1))) return;
        const badge = document.createElement('span');
        badge.className = 'qcmk-asclepia-flag';
        badge.textContent = 'Drapeau';
        Object.assign(badge.style, {
          display: 'inline-block',
          marginLeft: '8px',
          padding: '2px 7px',
          borderRadius: '4px',
          background: '#fef2f2',
          border: '1px solid #fca5a5',
          color: '#b91c1c',
          fontSize: '11px',
          fontWeight: '600',
        });
        const target = q.querySelector('h1, h2, h3, h4, header') || q;
        target.appendChild(badge);
      });
    }

    function tryChainNextSubfolder(ctx) {
      if (!ctx.isEnabled('asclepia.chain')) return;
      setTimeout(() => {
        const nextFolderBtn = dom.findButtonByText(document, [/dossier suivant/, /sous-dossier suivant/, /epreuve suivante/]);
        if (nextFolderBtn) dom.safeClick(nextFolderBtn);
      }, 300);
    }

    return {
      init(ctx) {
        applyCompactHeader(ctx);
        renderFlags(ctx);
      },

      onDomMutate(ctx) {
        applyCompactHeader(ctx);
        renderFlags(ctx);
      },

      onKeyDown(e, ctx) {
        const activeQ = getActiveQuestion();
        const typing = kb.isTypingTarget(e.target);

        if (!typing && ctx.isEnabled('asclepia.qroc') && kb.isPrintableKey(e)) {
          const choices = getChoiceTargets(activeQ);
          if (choices.length === 0) {
            const field = activeQ.querySelector('textarea, input[type="text"], input:not([type])');
            if (field && !field.disabled && dom.isVisible(field)) {
              field.focus();
              return false;
            }
          }
        }

        if (typing) return false;

        if (ctx.isEnabled('asclepia.scroll')) {
          const step = ctx.option('asclepia.scroll', 'step') || 200;
          const scroller = dom.findScrollContainer(['main', '.overflow-y-auto']);
          if (ctx.matches(e, 'asclepia.scroll', 'down')) {
            dom.scrollByStep(scroller, step, false);
            return true;
          }
          if (ctx.matches(e, 'asclepia.scroll', 'up')) {
            dom.scrollByStep(scroller, -step, false);
            return true;
          }
        }

        if (ctx.isEnabled('asclepia.flags') && ctx.matches(e, 'asclepia.flags', 'toggle')) {
          const list = getQuestions();
          const idx = Math.max(0, list.indexOf(activeQ));
          const qid = activeQ.getAttribute('data-question-id') || activeQ.id || String(idx + 1);
          const res = flagStore.toggleFlag(getExamKey(), qid);
          renderFlags(ctx);
          dom.showToast(res.added ? 'Drapeau ajouté' : 'Drapeau retiré');
          return true;
        }

        if (ctx.isEnabled('asclepia.answer')) {
          const idx = ctx.matchSharedChoice(e);
          if (idx !== -1) {
            const choices = getChoiceTargets(activeQ);
            if (choices[idx]) {
              dom.safeClick(choices[idx]);
              return true;
            }
          }

          if (ctx.matches(e, 'asclepia.answer', 'validate')) {
            const btn = dom.findButtonByText(activeQ, [/^valider$/, /^ok$/, /afficher la correction/, /^continuer$/, /^suivant$/])
              || dom.findButtonByText(document, [/^ok$/, /^valider$/, /afficher la correction/, /^continuer$/]);
            if (btn) {
              dom.safeClick(btn);
              tryChainNextSubfolder(ctx);
              return true;
            }
            const list = getQuestions();
            const cur = list.indexOf(activeQ);
            if (cur !== -1 && cur + 1 < list.length) {
              list[cur + 1].scrollIntoView({ behavior: 'smooth', block: 'start' });
              return true;
            }
          }
        }

        return false;
      },

      destroy() {
        const oldBtn = document.getElementById('qcmk-asclepia-header-btn');
        if (oldBtn) oldBtn.remove();
        dom.injectStyle('qcmk-asclepia-header-css', '');
      },
    };
  }

  adapters.asclepia = createAsclepiaAdapter();
})();

  /* --- src/adapters/refoua.js --- */
(function () {
  'use strict';
  const root = (globalThis.QCMK = globalThis.QCMK || {});
  const adapters = (root.adapters = root.adapters || {});

  function createRefouaAdapter() {
    const dom = root.dom;
    let appliedHash = '';

    function scrollToObjective(ctx) {
      if (!ctx.isEnabled('refoua.autoScroll')) return;
      const hash = location.hash || '';
      const prefix = '#qcm-lisa=';
      if (!hash.startsWith(prefix) || hash === appliedHash) return;

      const raw = decodeURIComponent(hash.slice(prefix.length)).trim();
      if (!raw) return;

      const targetNorm = dom.normText(raw);
      const nodes = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, p, li, strong, td'))
        .filter((el) => dom.isVisible(el));

      const match = nodes.find((el) => dom.normText(el.textContent).includes(targetNorm));
      if (!match) return;

      appliedHash = hash;
      match.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const prevBg = match.style.backgroundColor;
      const prevOutline = match.style.outline;
      match.style.backgroundColor = '#fef9c3';
      match.style.outline = '2px solid #1d4ed8';
      setTimeout(() => {
        match.style.backgroundColor = prevBg;
        match.style.outline = prevOutline;
      }, 2600);
    }

    return {
      init(ctx) {
        scrollToObjective(ctx);
      },
      onDomMutate(ctx) {
        scrollToObjective(ctx);
      },
      onKeyDown() {
        return false;
      },
      destroy() {},
    };
  }

  adapters.refoua = createRefouaAdapter();
})();

  /* --- src/content/main.js --- */
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

  /* --- src/userscript/panel.js --- */
(function () {
  'use strict';
  const root = globalThis.QCMK;
  if (!root || !root.schema || !root.storage || !root.keybind) return;

  const { schema, storage, keybind } = root;
  const PANEL_ID = 'qcmk-userscript-panel';
  let currentSettings = null;
  let recording = null;

  function detectSiteId() {
    const host = (location.hostname || '').toLowerCase();
    for (const s of schema.sites) {
      if (s.hidden) continue;
      if (s.hosts.some((h) => host === h || host.endsWith('.' + h))) return s.id;
    }
    return 'edn';
  }

  function ensureStyles() {
    if (document.getElementById('qcmk-us-style')) return;
    const style = document.createElement('style');
    style.id = 'qcmk-us-style';
    style.textContent = [
      '#' + PANEL_ID + '{position:fixed;inset:0;z-index:2147483647;background:rgba(24,24,27,0.45);display:flex;align-items:center;justify-content:center;padding:16px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:13px;color:#18181b;}',
      '#' + PANEL_ID + ' .qcmk-dialog{width:min(760px,100%);max-height:86vh;display:flex;flex-direction:column;background:#ffffff;border:1px solid #d4d4d8;border-radius:8px;overflow:hidden;}',
      '#' + PANEL_ID + ' .qcmk-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid #e4e4e7;background:#f7f7f8;}',
      '#' + PANEL_ID + ' .qcmk-head h2{margin:0;font-size:15px;font-weight:600;}',
      '#' + PANEL_ID + ' .qcmk-controls{display:flex;flex-wrap:wrap;align-items:center;gap:8px;}',
      '#' + PANEL_ID + ' .qcmk-body{padding:14px 16px;overflow-y:auto;display:flex;flex-direction:column;gap:12px;}',
      '#' + PANEL_ID + ' .qcmk-tabs{display:flex;flex-wrap:wrap;gap:4px;border-bottom:1px solid #e4e4e7;padding:0 16px;}',
      '#' + PANEL_ID + ' .qcmk-tab{padding:8px 12px;border:0;border-bottom:2px solid transparent;background:transparent;color:#52525b;font-weight:500;cursor:pointer;}',
      '#' + PANEL_ID + ' .qcmk-tab.active{color:#1d4ed8;border-bottom-color:#1d4ed8;font-weight:600;}',
      '#' + PANEL_ID + ' .qcmk-card{border:1px solid #e4e4e7;border-radius:8px;background:#ffffff;}',
      '#' + PANEL_ID + ' .qcmk-row{padding:11px 14px;border-bottom:1px solid #e4e4e7;}',
      '#' + PANEL_ID + ' .qcmk-row:last-child{border-bottom:0;}',
      '#' + PANEL_ID + ' .qcmk-row-top{display:flex;align-items:center;justify-content:space-between;gap:12px;}',
      '#' + PANEL_ID + ' .qcmk-title{font-weight:600;color:#18181b;}',
      '#' + PANEL_ID + ' .qcmk-desc{font-size:12px;color:#52525b;margin-top:2px;}',
      '#' + PANEL_ID + ' .qcmk-act{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;margin-top:8px;padding:6px 9px;border:1px solid #e4e4e7;border-radius:6px;background:#f7f7f8;}',
      '#' + PANEL_ID + ' .qcmk-keys{display:flex;flex-wrap:wrap;align-items:center;gap:6px;}',
      '#' + PANEL_ID + ' kbd.qcmk-kbd{display:inline-flex;align-items:center;gap:4px;padding:2px 6px;border:1px solid #d4d4d8;border-radius:4px;background:#ffffff;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;font-weight:600;}',
      '#' + PANEL_ID + ' .qcmk-btn{padding:5px 10px;border:1px solid #d4d4d8;border-radius:6px;background:#ffffff;color:#18181b;font-size:12px;font-weight:500;cursor:pointer;}',
      '#' + PANEL_ID + ' .qcmk-btn.primary{background:#1d4ed8;border-color:#1d4ed8;color:#ffffff;}',
      '#' + PANEL_ID + ' .qcmk-btn.rec{border-color:#1d4ed8;background:#eff6ff;color:#1d4ed8;}',
      '#' + PANEL_ID + ' .qcmk-del{border:0;background:transparent;color:#52525b;cursor:pointer;padding:0 2px;font-size:13px;}',
      '#' + PANEL_ID + ' select{padding:5px 8px;border:1px solid #d4d4d8;border-radius:6px;background:#ffffff;color:#18181b;font-size:12px;}',
    ].join('\n');
    (document.head || document.documentElement).appendChild(style);
  }

  function closePanel() {
    recording = null;
    const el = document.getElementById(PANEL_ID);
    if (el) el.remove();
  }

  function openPanel() {
    if (document.getElementById(PANEL_ID)) {
      closePanel();
      return;
    }
    ensureStyles();

    storage.load().then((loaded) => {
      currentSettings = loaded;
      let activeTab = detectSiteId();

      const overlay = document.createElement('div');
      overlay.id = PANEL_ID;
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closePanel();
      });

      const dialog = document.createElement('div');
      dialog.className = 'qcmk-dialog';

      const head = document.createElement('div');
      head.className = 'qcmk-head';
      const title = document.createElement('h2');
      title.textContent = 'QCM Clavier (Alt + Maj + K)';

      const controls = document.createElement('div');
      controls.className = 'qcmk-controls';

      const globalLabel = document.createElement('label');
      globalLabel.style.display = 'inline-flex';
      globalLabel.style.alignItems = 'center';
      globalLabel.style.gap = '6px';
      const globalCb = document.createElement('input');
      globalCb.type = 'checkbox';
      globalCb.checked = currentSettings.enabled !== false;
      globalCb.addEventListener('change', () => {
        currentSettings.enabled = globalCb.checked;
        storage.save(currentSettings).then((s) => { currentSettings = s; });
      });
      globalLabel.append(globalCb, document.createTextNode('Actif'));

      const presetSel = document.createElement('select');
      for (const [key, def] of Object.entries(schema.presets)) {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = def.label;
        presetSel.appendChild(opt);
      }
      presetSel.value = currentSettings.preset || 'azerty';
      presetSel.addEventListener('change', () => {
        const fresh = storage.buildDefaults(presetSel.value);
        fresh.enabled = currentSettings.enabled;
        storage.save(fresh).then((s) => {
          currentSettings = s;
          renderBody();
        });
      });

      const resetBtn = document.createElement('button');
      resetBtn.type = 'button';
      resetBtn.className = 'qcmk-btn';
      resetBtn.textContent = 'Réinitialiser';
      resetBtn.addEventListener('click', () => {
        storage.reset(presetSel.value).then((s) => {
          currentSettings = s;
          renderBody();
        });
      });

      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'qcmk-btn primary';
      closeBtn.textContent = 'Fermer';
      closeBtn.addEventListener('click', closePanel);

      controls.append(globalLabel, presetSel, resetBtn, closeBtn);
      head.append(title, controls);

      const tabsEl = document.createElement('div');
      tabsEl.className = 'qcmk-tabs';
      const bodyEl = document.createElement('div');
      bodyEl.className = 'qcmk-body';

      const tabs = [
        { id: 'shared', label: 'Propositions (1–10)' },
        ...schema.sites.filter((s) => !s.hidden).map((s) => ({ id: s.id, label: s.name })),
      ];

      function renderTabs() {
        tabsEl.innerHTML = '';
        for (const t of tabs) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'qcmk-tab' + (t.id === activeTab ? ' active' : '');
          btn.textContent = t.label;
          btn.addEventListener('click', () => {
            recording = null;
            activeTab = t.id;
            renderTabs();
            renderBody();
          });
          tabsEl.appendChild(btn);
        }
      }

      function renderBindings(list, onRecord, onRemove) {
        const wrap = document.createElement('div');
        wrap.className = 'qcmk-keys';
        list.forEach((b, idx) => {
          const kbd = document.createElement('kbd');
          kbd.className = 'qcmk-kbd';
          kbd.appendChild(document.createTextNode(keybind.formatBinding(b)));
          const del = document.createElement('button');
          del.type = 'button';
          del.className = 'qcmk-del';
          del.textContent = '×';
          del.addEventListener('click', () => onRemove(idx));
          kbd.appendChild(del);
          wrap.appendChild(kbd);
        });
        const add = document.createElement('button');
        add.type = 'button';
        add.className = 'qcmk-btn';
        add.textContent = '+ Ajouter';
        add.addEventListener('click', () => onRecord(add));
        wrap.appendChild(add);
        return wrap;
      }

      function renderBody() {
        bodyEl.innerHTML = '';
        const card = document.createElement('div');
        card.className = 'qcmk-card';

        if (activeTab === 'shared') {
          for (const sa of schema.sharedActions) {
            const row = document.createElement('div');
            row.className = 'qcmk-row';
            const act = document.createElement('div');
            act.className = 'qcmk-act';
            act.style.marginTop = '0';
            const lbl = document.createElement('span');
            lbl.textContent = sa.label;
            const controlsWrap = renderBindings(
              currentSettings.shared[sa.id] || [],
              (btn) => {
                recording = { kind: 'shared', actionId: sa.id, btn };
                btn.classList.add('rec');
                btn.textContent = 'Appuyez sur une touche…';
              },
              (idx) => {
                currentSettings.shared[sa.id].splice(idx, 1);
                storage.save(currentSettings).then((s) => { currentSettings = s; renderBody(); });
              }
            );
            act.append(lbl, controlsWrap);
            row.appendChild(act);
            card.appendChild(row);
          }
          bodyEl.appendChild(card);
          return;
        }

        const feats = schema.features.filter((f) => f.site === activeTab && !f.hidden);
        for (const feat of feats) {
          const row = document.createElement('div');
          row.className = 'qcmk-row';

          const top = document.createElement('div');
          top.className = 'qcmk-row-top';
          const info = document.createElement('div');
          const nameEl = document.createElement('div');
          nameEl.className = 'qcmk-title';
          nameEl.textContent = feat.name;
          const descEl = document.createElement('div');
          descEl.className = 'qcmk-desc';
          descEl.textContent = feat.description;
          info.append(nameEl, descEl);

          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.checked = currentSettings.features[feat.id]?.enabled !== false;
          cb.addEventListener('change', () => {
            currentSettings.features[feat.id].enabled = cb.checked;
            storage.save(currentSettings).then((s) => { currentSettings = s; });
          });
          top.append(info, cb);
          row.appendChild(top);

          for (const act of feat.actions || []) {
            const actRow = document.createElement('div');
            actRow.className = 'qcmk-act';
            const lbl = document.createElement('span');
            lbl.textContent = act.label;
            const ctrl = renderBindings(
              currentSettings.features[feat.id].actions[act.id] || [],
              (btn) => {
                recording = { kind: 'feature', featureId: feat.id, actionId: act.id, btn };
                btn.classList.add('rec');
                btn.textContent = 'Appuyez sur une touche…';
              },
              (idx) => {
                currentSettings.features[feat.id].actions[act.id].splice(idx, 1);
                storage.save(currentSettings).then((s) => { currentSettings = s; renderBody(); });
              }
            );
            actRow.append(lbl, ctrl);
            row.appendChild(actRow);
          }

          card.appendChild(row);
        }
        bodyEl.appendChild(card);
      }

      renderTabs();
      renderBody();
      dialog.append(head, tabsEl, bodyEl);
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      overlay._refreshBody = renderBody;
    });
  }

  window.addEventListener('keydown', (e) => {
    if (recording) {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') {
        recording = null;
        const panel = document.getElementById(PANEL_ID);
        if (panel && panel._refreshBody) panel._refreshBody();
        return;
      }
      const binding = keybind.eventToBinding(e);
      if (!binding) return;
      const list = recording.kind === 'shared'
        ? currentSettings.shared[recording.actionId]
        : currentSettings.features[recording.featureId].actions[recording.actionId];
      const sig = keybind.bindingSignature(binding);
      if (!list.some((b) => keybind.bindingSignature(b) === sig)) {
        list.push(binding);
      }
      recording = null;
      storage.save(currentSettings).then((s) => {
        currentSettings = s;
        const panel = document.getElementById(PANEL_ID);
        if (panel && panel._refreshBody) panel._refreshBody();
      });
      return;
    }

    if (e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey && (e.key === 'K' || e.key === 'k')) {
      e.preventDefault();
      e.stopPropagation();
      openPanel();
    }
  }, true);

  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand('Configurer QCM Clavier', openPanel);
  }
})();

})();
