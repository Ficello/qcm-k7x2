(function () {
  'use strict';
  const root = (globalThis.QCMK = globalThis.QCMK || {});

  const URI_SCHEME = 'anki-edn';
  const MAX_URI_LENGTH = 1536;
  const MAX_OIC_COUNT = 25;
  const MAX_ITEM_COUNT = 10;
  const MAX_SDD_COUNT = 10;
  const MAX_QID_COUNT = 25;
  const MAX_NID_COUNT = 40;
  const MAX_QUERY_TERMS = 6;
  const MAX_NOTE_LENGTH = 240;

  const OIC_REGEX = /^(?:OIC(?:::|[-_]))?(\d{1,3})[-_](\d{1,3})[-_]([ABab])(?:[-_]\d{1,3})?$/;
  const ITEM_REGEX = /^(?:item[-_]?|IC[-_]?)?(\d{1,3})$/i;
  const SDD_REGEX = /^(?:SDD[-_:]?|SD[-_:]?)?(\d{1,3})$/i;
  const RANG_REGEX = /^[ABab]$/;
  const QID_REGEX = /^[a-z0-9_-]{2,16}:[a-z0-9_-]{1,12}:[a-z0-9_-]{1,32}$/;
  const NID_REGEX = /^\d{10,16}$/;
  const TERM_REGEX = /^[A-Za-z0-9\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF_-]{3,40}$/;
  const ALLOWED_ACTIONS = ['lisa', 'qcm', 'item', 'open'];
  const ALLOWED_MODES = ['browse', 'actions', 'unsuspend', 'forget', 'unsuspend_forget', 'error_note'];
  const ALLOWED_SOURCES = ['lisa', 'uness', 'qcm', 'edn', 'hypocampus', 'asclepia'];

  // Liste de mots vides français et vocabulaire docimologique QCM à écarter des requêtes
  const STOPWORDS = new Set([
    'alors', 'apres', 'aucun', 'aucune', 'aussi', 'autre', 'autres', 'avant', 'avec', 'avoir',
    'bilan', 'bonne', 'bonnes', 'cas', 'ceci', 'cela', 'celle', 'celles', 'celui', 'cependant',
    'certain', 'certaine', 'certaines', 'certains', 'cette', 'ceux', 'chaque', 'charge', 'chez',
    'choix', 'clinique', 'cliniques', 'comme', 'comment', 'complémentaire', 'complementaire',
    'complementaires', 'connaitre', 'consulte', 'correct', 'correcte', 'correctes', 'correction',
    'dans', 'depuis', 'devant', 'diagnostic', 'diagnostics', 'doit', 'doivent', 'donc', 'dont',
    'dose', 'doses', 'element', 'elements', 'elle', 'elles', 'encore', 'entre', 'erreur', 'erreurs',
    'etaient', 'etait', 'etant', 'etre', 'exact', 'exacte', 'exactes', 'examen', 'examens',
    'faire', 'fait', 'faite', 'faites', 'fausse', 'fausses', 'faut', 'fois', 'forme', 'formes',
    'generalement', 'heure', 'heures', 'hors', 'indique', 'indiquee', 'indispensable', 'intention',
    'item', 'items', 'jamais', 'jour', 'jours', 'lequel', 'laquelle', 'lesquelles', 'lesquels',
    'leur', 'leurs', 'lors', 'mais', 'maladie', 'maladies', 'mauvaise', 'mauvaises', 'meme', 'memes',
    'moins', 'mois', 'moyen', 'moyens', 'niveau', 'notamment', 'note', 'noter', 'notion', 'notions',
    'nous', 'objectif', 'objectifs', 'parce', 'parfois', 'parmi', 'pathologie', 'pathologies',
    'patient', 'patiente', 'patients', 'pendant', 'permet', 'personne', 'personnes', 'peut',
    'peuvent', 'plus', 'plusieurs', 'point', 'points', 'pour', 'pourquoi', 'premier', 'premiere',
    'pres', 'present', 'presente', 'presentent', 'principal', 'principale', 'principales',
    'principaux', 'prise', 'proposition', 'propositions', 'quand', 'quel', 'quelle', 'quelles',
    'quels', 'question', 'questions', 'quoi', 'rang', 'reponse', 'reponses', 'sans', 'savoir',
    'semaine', 'semaines', 'sera', 'seront', 'seulement', 'signe', 'signes', 'situation',
    'situations', 'soit', 'sont', 'souvent', 'sous', 'stade', 'sujet', 'suivant', 'suivante',
    'suivantes', 'suivants', 'syndrome', 'tandis', 'taux', 'tels', 'telles', 'toujours', 'tous',
    'tout', 'toute', 'toutes', 'toutefois', 'traitement', 'traitements', 'tres', 'trop', 'trouble',
    'troubles', 'type', 'types', 'valeur', 'valeurs', 'voient', 'vont', 'votre', 'vous', 'vraie',
    'vraies', 'vrais', 'annee', 'annees', 'ans', 'age', 'agee', 'chez', 'femme', 'homme', 'enfant',
    'adulte', 'sujets', 'indication', 'indications', 'prise', 'enfin', 'ainsi', 'donnee', 'donnees',
  ]);

  function padNumber(num, size) {
    let s = String(num);
    while (s.length < size) s = '0' + s;
    return s;
  }

  function foldAccents(str) {
    return String(str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function sanitizeNoteText(rawText) {
    if (!rawText || typeof rawText !== 'string') return '';
    let cleaned = rawText
      .replace(/[\x00-\x1f\x7f]+/g, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleaned.length > MAX_NOTE_LENGTH) {
      cleaned = cleaned.slice(0, MAX_NOTE_LENGTH - 3).trim() + '...';
    }
    return cleaned;
  }

  function normalizeOic(rawOic) {
    if (!rawOic || typeof rawOic !== 'string') return null;
    const m = OIC_REGEX.exec(rawOic.trim());
    if (!m) return null;
    const itemNum = parseInt(m[1], 10);
    const objNum = parseInt(m[2], 10);
    const rang = m[3].toUpperCase();
    if (itemNum < 1 || itemNum > 367 || objNum < 1 || objNum > 99) return null;
    return padNumber(itemNum, 3) + '-' + padNumber(objNum, 2) + '-' + rang;
  }

  function normalizeItem(rawItem) {
    if (rawItem === null || rawItem === undefined) return null;
    const m = ITEM_REGEX.exec(String(rawItem).trim());
    if (!m) return null;
    const num = parseInt(m[1], 10);
    if (num < 1 || num > 367) return null;
    return padNumber(num, 3);
  }

  function normalizeSdd(rawSdd) {
    if (rawSdd === null || rawSdd === undefined) return null;
    const m = SDD_REGEX.exec(String(rawSdd).trim());
    if (!m) return null;
    const num = parseInt(m[1], 10);
    if (num < 1 || num > 356) return null;
    return padNumber(num, 3);
  }

  function normalizeQid(rawQid) {
    if (!rawQid || typeof rawQid !== 'string') return null;
    const token = rawQid.trim().toLowerCase();
    return QID_REGEX.test(token) ? token : null;
  }

  function normalizeNid(rawNid) {
    if (rawNid === null || rawNid === undefined) return null;
    const token = String(rawNid).trim();
    return NID_REGEX.test(token) ? token : null;
  }

  function normalizeQueryTerm(rawTerm) {
    if (!rawTerm || typeof rawTerm !== 'string') return null;
    const token = rawTerm.trim();
    if (!TERM_REGEX.test(token)) return null;
    const lowerFolded = foldAccents(token).toLowerCase();
    if (lowerFolded === 'and' || lowerFolded === 'or' || lowerFolded === 'not') return null;
    return token;
  }

  function extractMedicalKeywords(text, maxTerms) {
    const limit = typeof maxTerms === 'number' && maxTerms > 0 ? Math.min(maxTerms, MAX_QUERY_TERMS) : 5;
    if (!text || typeof text !== 'string') return [];
    const plain = text.replace(/<[^>]+>/g, ' ');
    const rawWords = plain.match(/[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF0-9-]{3,40}/g) || [];
    const seen = new Set();
    const scored = [];

    for (let i = 0; i < rawWords.length; i++) {
      const w = rawWords[i].replace(/^-+|-+$/g, '');
      if (!w || w.length < 3 || /^\d+$/.test(w)) continue;
      if (!TERM_REGEX.test(w)) continue;
      const folded = foldAccents(w).toLowerCase();
      if (folded.length < 3 || STOPWORDS.has(folded)) continue;
      if (seen.has(folded)) continue;
      seen.add(folded);
      // Privilégie les termes longs / techniques
      scored.push({ token: w.toLowerCase(), weight: folded.length });
    }

    scored.sort((a, b) => b.weight - a.weight);
    return scored.slice(0, limit).map((item) => item.token);
  }

  function collectValidList(rawInput, normalizer, maxCount) {
    let arr = [];
    if (Array.isArray(rawInput)) {
      arr = rawInput;
    } else if (rawInput !== undefined && rawInput !== null) {
      arr = String(rawInput).split(/[,;|\s]+/);
    }
    const out = [];
    for (let i = 0; i < arr.length && out.length < maxCount; i++) {
      const norm = normalizer(arr[i]);
      if (norm && out.indexOf(norm) === -1) out.push(norm);
    }
    return out;
  }

  function buildAnkiEdnUri(options) {
    if (!options || typeof options !== 'object') return null;

    let action = String(options.action || 'open').toLowerCase();
    if (ALLOWED_ACTIONS.indexOf(action) === -1) action = 'open';

    const validOics = collectValidList(options.oic || options.oics, normalizeOic, MAX_OIC_COUNT);
    const validItems = collectValidList(options.item || options.items, normalizeItem, MAX_ITEM_COUNT);
    const validSdds = collectValidList(options.sdd || options.sdds, normalizeSdd, MAX_SDD_COUNT);
    const validQids = collectValidList(options.qid || options.qids, normalizeQid, MAX_QID_COUNT);
    const validNids = collectValidList(options.nid || options.nids, normalizeNid, MAX_NID_COUNT);
    let validTerms = collectValidList(options.q || options.terms, normalizeQueryTerm, MAX_QUERY_TERMS);

    if (
      validOics.length === 0 &&
      validItems.length === 0 &&
      validSdds.length === 0 &&
      validQids.length === 0 &&
      validNids.length === 0 &&
      validTerms.length === 0
    ) {
      return null;
    }

    const buildQuery = (termsSubset, errVal) => {
      const parts = [];
      if (validOics.length > 0) parts.push('oic=' + encodeURIComponent(validOics.join(',')));
      if (validItems.length > 0) parts.push('item=' + encodeURIComponent(validItems.join(',')));
      if (options.rang && RANG_REGEX.test(String(options.rang).trim())) {
        parts.push('rang=' + encodeURIComponent(String(options.rang).trim().toUpperCase()));
      }
      if (validSdds.length > 0) parts.push('sdd=' + encodeURIComponent(validSdds.join(',')));
      if (validQids.length > 0) parts.push('qid=' + encodeURIComponent(validQids.join(',')));
      if (validNids.length > 0) parts.push('nid=' + encodeURIComponent(validNids.join(',')));
      if (termsSubset.length > 0) parts.push('q=' + encodeURIComponent(termsSubset.join(',')));

      const src = options.src ? String(options.src).trim().toLowerCase() : '';
      if (src && ALLOWED_SOURCES.indexOf(src) !== -1) {
        parts.push('src=' + encodeURIComponent(src));
      }

      const mode = options.mode ? String(options.mode).trim().toLowerCase() : 'browse';
      if (mode !== 'browse' && ALLOWED_MODES.indexOf(mode) !== -1) {
        parts.push('mode=' + encodeURIComponent(mode));
      }

      if (errVal) {
        parts.push('err=' + encodeURIComponent(errVal));
      }

      return URI_SCHEME + '://' + action + '?' + parts.join('&');
    };

    let errText = sanitizeNoteText(options.err || options.note || '');
    let fullUri = buildQuery(validTerms, errText);

    if (fullUri.length > MAX_URI_LENGTH && errText) {
      errText = '';
      fullUri = buildQuery(validTerms, '');
      const budget = MAX_URI_LENGTH - 12 - fullUri.length;
      if (budget > 12) {
        const rawErr = sanitizeNoteText(options.err || options.note || '');
        errText = rawErr.slice(0, Math.min(rawErr.length, Math.floor(budget / 3))).trim();
        if (errText) fullUri = buildQuery(validTerms, errText);
      }
    }

    while (fullUri.length > MAX_URI_LENGTH && validTerms.length > 1) {
      validTerms = validTerms.slice(0, validTerms.length - 1);
      fullUri = buildQuery(validTerms, errText);
    }

    if (fullUri.length > MAX_URI_LENGTH) {
      return fullUri.slice(0, MAX_URI_LENGTH);
    }
    return fullUri;
  }

  function launchAnkiUri(uri, feedbackLabel) {
    if (!uri || uri.indexOf(URI_SCHEME + '://') !== 0 || typeof document === 'undefined') {
      return false;
    }

    let triggered = false;
    if (typeof window !== 'undefined' && window.location && typeof window.location.assign === 'function') {
      try {
        window.location.assign(uri);
        triggered = true;
      } catch (_) {}
    }

    if (!triggered) {
      const a = document.createElement('a');
      a.href = uri;
      a.style.display = 'none';
      (document.body || document.documentElement).appendChild(a);
      a.click();
      a.remove();
    }

    if (root.dom && typeof root.dom.showToast === 'function') {
      root.dom.showToast(feedbackLabel || 'Ouverture dans Anki EDN...');
    }
    return true;
  }

  function ensureStyles() {
    if (!root.dom || typeof root.dom.injectStyle !== 'function') return;
    root.dom.injectStyle(
      'qcmk-anki-connector-css',
      [
        '.qcmk-anki-bar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;margin:10px 0;padding:8px 12px;border:1px solid #d4d4d8;border-radius:6px;background:#ffffff;color:#18181b;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:13px;}',
        '.qcmk-anki-bar-title{font-weight:600;color:#18181b;font-size:13px;}',
        '.qcmk-anki-bar-actions{display:flex;flex-wrap:wrap;align-items:center;gap:6px;}',
        '.qcmk-anki-q-bar{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:8px;padding-top:8px;border-top:1px solid #e4e4e7;}',
        '.qcmk-anki-btn{display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border:1px solid #d4d4d8;border-radius:4px;background:#f4f4f5;color:#18181b;font-size:12px;font-weight:500;line-height:1.2;text-decoration:none;cursor:pointer;}',
        '.qcmk-anki-btn:hover{background:#e4e4e7;border-color:#1b4f9c;color:#18181b;}',
        '.qcmk-anki-btn--primary{background:#1b4f9c;border-color:#1b4f9c;color:#ffffff;}',
        '.qcmk-anki-btn--primary:hover{background:#143c78;border-color:#143c78;color:#ffffff;}',
        '.qcmk-anki-btn--compact{padding:3px 7px;font-size:11.5px;}',
        '.qcmk-anki-btn:disabled,.qcmk-anki-btn[aria-disabled="true"]{opacity:0.45;cursor:not-allowed;pointer-events:none;}',
        '.qcmk-anki-inline-link{display:inline-block;margin-left:5px;padding:1px 5px;border:1px solid #d4d4d8;border-radius:4px;background:#f4f4f5;color:#1b4f9c;font-size:11px;font-weight:600;text-decoration:none;cursor:pointer;vertical-align:middle;}',
        '.qcmk-anki-inline-link:hover{background:#e4e4e7;border-color:#1b4f9c;}',
      ].join('')
    );
  }

  function createAnkiButton(opts) {
    ensureStyles();
    const cfg = opts || {};
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'qcmk-anki-btn'
      + (cfg.primary ? ' qcmk-anki-btn--primary' : '')
      + (cfg.compact ? ' qcmk-anki-btn--compact' : '');
    btn.textContent = cfg.label || 'Ouvrir dans Anki';
    if (cfg.title) btn.title = cfg.title;
    if (cfg.uri) btn.setAttribute('data-anki-uri', cfg.uri);
    if (cfg.disabled) {
      btn.disabled = true;
      btn.setAttribute('aria-disabled', 'true');
    }
    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (btn.disabled) return;
      if (typeof cfg.onClick === 'function') {
        cfg.onClick(ev);
      } else if (cfg.uri) {
        launchAnkiUri(cfg.uri, cfg.toast || cfg.label);
      }
    });
    return btn;
  }

  root.anki = {
    URI_SCHEME,
    MAX_URI_LENGTH,
    normalizeOic,
    normalizeItem,
    normalizeSdd,
    normalizeQid,
    normalizeNid,
    normalizeQueryTerm,
    extractMedicalKeywords,
    buildAnkiEdnUri,
    launchAnkiUri,
    ensureStyles,
    createAnkiButton,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = root.anki;
  }
})();
