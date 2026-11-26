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
    let activeMatiereFilter = '';
    let activeRankFilter = 'ALL';
    let activeSortMode = 'orig';

    function getAnki() {
      return root.anki || null;
    }

    function detectMode() {
      const path = (location.pathname || '').toLowerCase();
      if (/ancrage/.test(path) || document.querySelector('app-knowledge-anchoring')) return 'ancrage';
      if (/notions/.test(path) || document.querySelector('app-training-knowledge-review')) return 'notions';
      if (/\/fiche\b/.test(path) || document.querySelector('app-course-record')) return 'fiche';
      if (/exam|annale|concours|epreuve/.test(path) || document.querySelector('app-exam-content-correction, app-exam-detail')) return 'exam';
      if (/training|entrainement/.test(path)) return 'training';
      const qCards = document.querySelectorAll('app-question-header, app-question-header-legacy, [data-question-id], .question-card, .question-container, [id^="question-"]');
      if (qCards.length > 1) return 'exam';
      return 'training';
    }

    function getExamKey() {
      return (location.pathname || '/').replace(/\/+$/, '') || 'default';
    }

    function getQuestionContainers() {
      const formNodes = Array.from(document.querySelectorAll('app-question-correction-form, app-question-correction-form-legacy, app-question-header, app-question-header-legacy'))
        .filter((el) => dom.isVisible(el));
      if (formNodes.length > 0) {
        const wrappers = [];
        const seen = new Set();
        for (const fn of formNodes) {
          const wrap = fn.closest('[data-question-id], [id^="question-"], .question-card, .question-container, app-question, div.mb-6, div.rounded-lg, section, article') || fn.parentElement;
          if (wrap && !seen.has(wrap)) {
            seen.add(wrap);
            wrappers.push(wrap);
          }
        }
        if (wrappers.length > 0) return wrappers;
      }

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
        const heading = q.querySelector('h1, h2, h3, h4, app-question-header, app-question-header-legacy, .question-title, header') || q;
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

    function jumpToNextFlag(activeQ) {
      const flags = flagStore.getFlags(getExamKey());
      const containers = getQuestionContainers();
      const flagged = containers.filter((q, idx) => {
        const qid = q.getAttribute('data-question-id') || q.id || String(idx + 1);
        return flags.has(qid) || flags.has(String(idx + 1));
      });
      if (flagged.length === 0) {
        dom.showToast('Aucune question marquée');
        return false;
      }
      const curIdx = flagged.indexOf(activeQ);
      const nextEl = flagged[(curIdx + 1) % flagged.length];
      nextEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      dom.showToast('Question marquée suivante');
      return true;
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

    // -------------------------------------------------------------------------
    // Extraction Item / Rang / Objectifs & Tri/Filtre (Notions, Ancrage, Items)
    // -------------------------------------------------------------------------

    function extractEdnItemNumber() {
      const candidates = document.querySelectorAll(
        'app-card-title-badge[size="small"], app-training-detail-header, app-exam-preview-courses a, h1, h2'
      );
      for (let i = 0; i < candidates.length; i++) {
        const txt = (candidates[i].textContent || '').trim();
        const m = txt.match(/\bItem\s*[-:n°]*\s*(\d{1,3})\b/i);
        if (m) return m[1];
      }
      return null;
    }

    function extractRowRank(row) {
      const rankEl = row.querySelector('app-notion-rank');
      const raw = rankEl ? (rankEl.textContent || '').trim() : '';
      const m1 = raw.match(/\b([ABC])\b/i);
      if (m1) return m1[1].toUpperCase();
      const m2 = (row.textContent || '').match(/\bRang\s*([ABC])\b/i);
      return m2 ? m2[1].toUpperCase() : '';
    }

    function extractRowProgress(row) {
      const m = (row.textContent || '').match(/(\d+(?:[.,]\d+)?)\s*%/);
      return m ? parseFloat(m[1].replace(',', '.')) : 999;
    }

    function extractRowObjectiveText(row) {
      const titleNode = row.querySelector('h3, h4, strong, [class*="title" i], [class*="name" i], span');
      const raw = titleNode ? (titleNode.textContent || '') : (row.textContent || '');
      return raw.replace(/\s+/g, ' ').trim();
    }

    function applyNotionsSortAndFilter(container, rows) {
      for (const row of rows) {
        const r = extractRowRank(row);
        const visible = activeRankFilter === 'ALL' || r === activeRankFilter;
        row.style.display = visible ? '' : 'none';
      }

      const sorted = rows.slice().sort((a, b) => {
        if (activeSortMode === 'orig') {
          return Number(a.dataset.qcmkOrigIdx || 0) - Number(b.dataset.qcmkOrigIdx || 0);
        }
        if (activeSortMode === 'rank') {
          const order = { A: 1, B: 2, C: 3, '': 9 };
          return (order[extractRowRank(a)] || 9) - (order[extractRowRank(b)] || 9);
        }
        if (activeSortMode === 'progress') {
          return extractRowProgress(a) - extractRowProgress(b);
        }
        return extractRowObjectiveText(a).localeCompare(extractRowObjectiveText(b), 'fr');
      });

      for (const row of sorted) {
        container.appendChild(row);
      }
    }

    function applyNotionsToolbar(ctx) {
      const reviewEl = document.querySelector('app-training-knowledge-review');
      if (!ctx.isEnabled('edn.ancrageCounters') || !reviewEl) {
        const oldTb = document.getElementById('qcmk-edn-notions-toolbar');
        if (oldTb) oldTb.remove();
        return;
      }

      const anki = getAnki();
      if (anki) anki.ensureStyles();

      const rankBadges = Array.from(reviewEl.querySelectorAll('app-notion-rank'));
      if (rankBadges.length === 0) return;

      // Identifier les lignes sœurs portant les objectifs
      const firstRow = rankBadges[0].closest('div.border, div.rounded, li, tr, mat-card, a') || rankBadges[0].parentElement;
      const listContainer = firstRow ? firstRow.parentElement : null;
      if (!listContainer) return;

      const rows = Array.from(listContainer.children).filter(
        (el) => el.id !== 'qcmk-edn-notions-toolbar' && el.querySelector('app-notion-rank')
      );
      if (rows.length === 0) return;

      rows.forEach((row, idx) => {
        if (!row.dataset.qcmkOrigIdx) row.dataset.qcmkOrigIdx = String(idx);
      });

      // Injecter un bouton Anki sur chaque ligne d'objectif si activé
      if (anki && ctx.isEnabled('edn.anki') && ctx.option('edn.anki', 'showButtons') !== false) {
        const itemNum = extractEdnItemNumber();
        rows.forEach((row) => {
          if (row.querySelector('.qcmk-edn-notion-anki')) return;
          const r = extractRowRank(row);
          const objTitle = extractRowObjectiveText(row);
          const uri = anki.buildAnkiEdnUri({
            action: 'lisa',
            src: 'edn',
            item: itemNum,
            rang: r === 'A' || r === 'B' ? r : undefined,
            q: anki.extractMedicalKeywords(objTitle, 4),
          });
          if (!uri) return;
          const btn = anki.createAnkiButton({ label: 'Anki', compact: true, uri });
          btn.classList.add('qcmk-edn-notion-anki');
          btn.style.marginLeft = '8px';
          row.appendChild(btn);
        });
      }

      if (document.getElementById('qcmk-edn-notions-toolbar')) {
        applyNotionsSortAndFilter(listContainer, rows);
        return;
      }

      const bar = document.createElement('div');
      bar.id = 'qcmk-edn-notions-toolbar';
      bar.className = 'qcmk-anki-bar';

      const title = document.createElement('span');
      title.className = 'qcmk-anki-bar-title';
      title.textContent = 'Objectifs (' + rows.length + ')';

      const controls = document.createElement('div');
      controls.className = 'qcmk-anki-bar-actions';

      ['ALL', 'A', 'B', 'C'].forEach((rankVal) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'qcmk-anki-btn qcmk-anki-btn--compact' + (activeRankFilter === rankVal ? ' qcmk-anki-btn--primary' : '');
        btn.textContent = rankVal === 'ALL' ? 'Tous' : 'Rang ' + rankVal;
        btn.dataset.qcmkRankBtn = rankVal;
        btn.addEventListener('click', () => {
          activeRankFilter = rankVal;
          bar.querySelectorAll('[data-qcmk-rank-btn]').forEach((b) => {
            b.classList.toggle('qcmk-anki-btn--primary', b.dataset.qcmkRankBtn === activeRankFilter);
          });
          applyNotionsSortAndFilter(listContainer, rows);
        });
        controls.appendChild(btn);
      });

      const sortSelect = document.createElement('select');
      sortSelect.className = 'qcmk-anki-btn qcmk-anki-btn--compact';
      [
        { id: 'orig', label: 'Tri : Ordre EDN' },
        { id: 'alpha', label: 'Tri : Objectif (A-Z)' },
        { id: 'rank', label: 'Tri : Rang (A -> C)' },
        { id: 'progress', label: 'Tri : Progression croissante' },
      ].forEach((opt) => {
        const o = document.createElement('option');
        o.value = opt.id;
        o.textContent = opt.label;
        sortSelect.appendChild(o);
      });
      sortSelect.value = activeSortMode;
      sortSelect.addEventListener('change', () => {
        activeSortMode = sortSelect.value;
        applyNotionsSortAndFilter(listContainer, rows);
      });
      controls.appendChild(sortSelect);

      bar.append(title, controls);
      listContainer.parentElement.insertBefore(bar, listContainer);
      applyNotionsSortAndFilter(listContainer, rows);
    }

    function applyAncrageCounters(ctx) {
      const mode = detectMode();
      if (mode === 'notions') {
        applyNotionsToolbar(ctx);
        return;
      }

      if (!ctx.isEnabled('edn.ancrageCounters') || (mode !== 'ancrage' && !document.querySelector('app-items-list'))) {
        const oldBox = document.getElementById('qcmk-ancrage-summary');
        if (oldBox) oldBox.remove();
        return;
      }
      if (document.getElementById('qcmk-ancrage-summary')) return;

      const anki = getAnki();
      if (anki) anki.ensureStyles();

      const rows = Array.from(
        document.querySelectorAll('app-training-item-card, [data-matiere], .matiere-card, .ancrage-item, tr')
      ).filter((el) => dom.isVisible(el));
      if (rows.length === 0) return;

      const counts = new Map();
      const rowMeta = [];
      rows.forEach((row, idx) => {
        const label = row.getAttribute('data-matiere') || (row.querySelector('h3, h4, td, strong, span') || row).textContent || '';
        const clean = label.trim().split('\n')[0].slice(0, 48);
        const rank = extractRowRank(row);
        if (clean) counts.set(clean, (counts.get(clean) || 0) + 1);
        row.dataset.qcmkOrigIdx = String(idx);
        rowMeta.push({ row, mat: clean, rank });
      });
      if (counts.size === 0) return;

      const box = document.createElement('div');
      box.id = 'qcmk-ancrage-summary';
      box.className = 'qcmk-anki-bar';
      box.style.flexDirection = 'column';
      box.style.alignItems = 'stretch';

      const head = document.createElement('div');
      head.style.display = 'flex';
      head.style.flexWrap = 'wrap';
      head.style.alignItems = 'center';
      head.style.justifyContent = 'space-between';
      head.style.gap = '8px';

      const title = document.createElement('span');
      title.className = 'qcmk-anki-bar-title';
      title.textContent = mode === 'ancrage' ? 'Ancrages et révisions (' + rows.length + ')' : 'Items filtrables (' + rows.length + ')';

      const headActions = document.createElement('div');
      headActions.className = 'qcmk-anki-bar-actions';

      const hasRanks = rowMeta.some((m) => m.rank !== '');
      const refreshFilters = () => {
        rowMeta.forEach((m) => {
          const okMat = !activeMatiereFilter || m.mat === activeMatiereFilter;
          const okRank = activeRankFilter === 'ALL' || m.rank === activeRankFilter;
          m.row.style.display = okMat && okRank ? '' : 'none';
        });
      };

      if (hasRanks) {
        ['ALL', 'A', 'B', 'C'].forEach((r) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'qcmk-anki-btn qcmk-anki-btn--compact' + (activeRankFilter === r ? ' qcmk-anki-btn--primary' : '');
          btn.textContent = r === 'ALL' ? 'Tous rangs' : 'Rang ' + r;
          btn.addEventListener('click', () => {
            activeRankFilter = r;
            refreshFilters();
          });
          headActions.appendChild(btn);
        });
      }

      const launchBtn = document.createElement('button');
      launchBtn.type = 'button';
      launchBtn.className = 'qcmk-anki-btn qcmk-anki-btn--primary qcmk-anki-btn--compact';
      launchBtn.textContent = 'Lancer une session';
      launchBtn.addEventListener('click', () => {
        const nativeBtn = dom.findButtonByText(document, [/nouvelle session/, /lancer/, /reviser/, /commencer/]);
        if (nativeBtn) {
          dom.safeClick(nativeBtn);
          return;
        }
        const firstCardLink = rows
          .filter((r) => r.style.display !== 'none')
          .map((r) => r.querySelector('a[href]') || (r.tagName === 'A' ? r : null))
          .find(Boolean);
        if (firstCardLink) dom.safeClick(firstCardLink);
      });
      headActions.appendChild(launchBtn);
      head.append(title, headActions);
      box.appendChild(head);

      const list = document.createElement('div');
      list.style.display = 'flex';
      list.style.flexWrap = 'wrap';
      list.style.gap = '6px';

      const allChip = document.createElement('button');
      allChip.type = 'button';
      allChip.className = 'qcmk-anki-btn qcmk-anki-btn--compact' + (!activeMatiereFilter ? ' qcmk-anki-btn--primary' : '');
      allChip.textContent = 'Tout afficher';
      allChip.addEventListener('click', () => {
        activeMatiereFilter = '';
        list.querySelectorAll('button').forEach((b) => b.classList.remove('qcmk-anki-btn--primary'));
        allChip.classList.add('qcmk-anki-btn--primary');
        refreshFilters();
      });
      list.appendChild(allChip);

      for (const [mat, count] of counts.entries()) {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'qcmk-anki-btn qcmk-anki-btn--compact';
        chip.textContent = mat + ' : ' + count;
        chip.addEventListener('click', () => {
          activeMatiereFilter = activeMatiereFilter === mat ? '' : mat;
          list.querySelectorAll('button').forEach((b) => b.classList.remove('qcmk-anki-btn--primary'));
          (activeMatiereFilter ? chip : allChip).classList.add('qcmk-anki-btn--primary');
          refreshFilters();
        });
        list.appendChild(chip);
      }
      box.appendChild(list);

      const main = document.querySelector('#listContainer, app-knowledge-anchoring, main') || document.body;
      main.prepend(box);
    }

    // -------------------------------------------------------------------------
    // Connecteur Anki EDN sur EDN.fr (Fiches de cours + Corrections QCM/DP)
    // -------------------------------------------------------------------------

    function isCorrectionView() {
      if (/correction/i.test(location.pathname || '')) return true;
      return Boolean(document.querySelector('app-training-correction, app-exam-content-correction, app-question-correction-form, app-question-correction-form-legacy'));
    }

    function inspectEdnCorrectionQuestion(qEl, fallbackItem) {
      const anki = getAnki();
      if (!qEl) return null;

      const ulidInput = qEl.querySelector('input[name^="chekbox-many-"], input[name^="radio-one-"], input[name^="input-match-"]');
      const rawName = ulidInput ? (ulidInput.getAttribute('name') || '') : '';
      const ulidMatch = rawName.match(/(?:chekbox-many-|radio-one-|input-match-)([A-Za-z0-9]+)/);
      const qid = ulidMatch ? 'edn:q:' + ulidMatch[1].slice(0, 25).toLowerCase() : null;

      const rank = extractRowRank(qEl);
      let scoreHasError = false;
      const scoreMatch = (qEl.textContent || '').match(/(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)\s*pts?/i);
      if (scoreMatch) {
        const got = parseFloat(scoreMatch[1].replace(',', '.'));
        const max = parseFloat(scoreMatch[2].replace(',', '.'));
        if (Number.isFinite(got) && Number.isFinite(max) && max > 0 && got < max) {
          scoreHasError = true;
        }
      }

      const propErrors = [];
      const expectedTrueTexts = [];

      // QRM checkboxes
      const checkboxes = Array.from(qEl.querySelectorAll('mat-checkbox'));
      checkboxes.forEach((cb, idx) => {
        const isChecked = cb.classList.contains('mat-mdc-checkbox-checked') || Boolean(cb.querySelector('input:checked'));
        const isOmission = cb.classList.contains('question-many-should') && !isChecked;
        const isCommission = cb.classList.contains('question-many-should-not') && isChecked;
        const isWin = cb.classList.contains('question-many-win') || cb.classList.contains('question-many-should');
        const txt = (cb.textContent || '').replace(/\s+/g, ' ').trim();
        if (isWin && txt) expectedTrueTexts.push(txt);
        if (isOmission || isCommission) {
          propErrors.push({ letter: String.fromCharCode(65 + idx), kind: isCommission ? 'cochee a tort' : 'non cochee', text: txt });
        }
      });

      // QRU radios
      const radios = Array.from(qEl.querySelectorAll('mat-radio-button'));
      radios.forEach((rb, idx) => {
        const isChecked = rb.classList.contains('mat-mdc-radio-checked') || Boolean(rb.querySelector('input:checked'));
        const isOmission = rb.classList.contains('question-one-should') && !isChecked;
        const isCommission = rb.classList.contains('question-one-should-not') && isChecked;
        const txt = (rb.textContent || '').replace(/\s+/g, ' ').trim();
        if (rb.classList.contains('question-one-should') && txt) expectedTrueTexts.push(txt);
        if (isOmission || isCommission) {
          propErrors.push({ letter: String.fromCharCode(65 + idx), kind: isCommission ? 'cochee a tort' : 'non cochee', text: txt });
        }
      });

      // QROC
      const qrocField = qEl.querySelector('mat-form-field');
      const qrocError = Boolean(qrocField && !qrocField.classList.contains('question-match-success') && scoreHasError);

      const hasError = scoreHasError || propErrors.length > 0 || qrocError;
      const contentEl = qEl.querySelector('app-question-content') || qEl;
      const corrForm = qEl.querySelector('app-question-correction-form, app-question-correction-form-legacy') || qEl;
      const allText = [contentEl.textContent || '', expectedTrueTexts.join(' '), corrForm.textContent || ''].join(' ');
      const allKeywords = anki ? anki.extractMedicalKeywords(allText, 5) : [];

      const errText = propErrors.length > 0
        ? propErrors.map((e) => e.text).join(' ') + ' ' + (contentEl.textContent || '')
        : allText;
      const errKeywords = anki ? anki.extractMedicalKeywords(errText, 5) : [];

      let errNote = '';
      if (propErrors.length > 0) {
        const top = propErrors[0];
        errNote = ('Prop ' + top.letter + ' ' + top.kind + ' : ' + top.text).slice(0, 220);
      } else if (hasError) {
        errNote = 'Question echouee sur EDN.fr';
      }

      return {
        el: qEl,
        qid,
        item: fallbackItem,
        rang: rank === 'A' || rank === 'B' ? rank : undefined,
        hasError,
        allKeywords,
        errKeywords,
        errNote,
      };
    }

    function clearEdnAnkiUi() {
      const topBar = document.getElementById('qcmk-edn-anki-bar');
      if (topBar) topBar.remove();
      const ficheBar = document.getElementById('qcmk-edn-fiche-anki');
      if (ficheBar) ficheBar.remove();
      document.querySelectorAll('.qcmk-anki-q-bar, .qcmk-edn-fiche-obj-anki').forEach((n) => n.remove());
    }

    function applyEdnAnkiConnector(ctx) {
      const anki = getAnki();
      if (!anki || !ctx.isEnabled('edn.anki') || ctx.option('edn.anki', 'showButtons') === false) {
        clearEdnAnkiUi();
        return;
      }

      const itemNum = extractEdnItemNumber();

      // 1. Fiche de cours (/app/courses/course/.../fiche)
      const courseRecord = document.querySelector('app-course-record');
      if (courseRecord) {
        if (itemNum && !document.getElementById('qcmk-edn-fiche-anki')) {
          const bar = document.createElement('div');
          bar.id = 'qcmk-edn-fiche-anki';
          bar.className = 'qcmk-anki-bar';

          const title = document.createElement('span');
          title.className = 'qcmk-anki-bar-title';
          title.textContent = 'Anki EDN — Item ' + itemNum.padStart(3, '0');

          const actions = document.createElement('div');
          actions.className = 'qcmk-anki-bar-actions';
          const allUri = anki.buildAnkiEdnUri({ action: 'lisa', src: 'edn', item: itemNum });
          const rAUri = anki.buildAnkiEdnUri({ action: 'lisa', src: 'edn', item: itemNum, rang: 'A' });
          const rBUri = anki.buildAnkiEdnUri({ action: 'lisa', src: 'edn', item: itemNum, rang: 'B' });
          if (allUri) actions.appendChild(anki.createAnkiButton({ label: "Tout l'item " + itemNum, primary: true, uri: allUri }));
          if (rAUri) actions.appendChild(anki.createAnkiButton({ label: 'Rang A', uri: rAUri }));
          if (rBUri) actions.appendChild(anki.createAnkiButton({ label: 'Rang B', uri: rBUri }));
          bar.append(title, actions);
          courseRecord.prepend(bar);
        }

        const panels = courseRecord.querySelectorAll('mat-accordion mat-expansion-panel');
        panels.forEach((panel) => {
          const header = panel.querySelector('mat-expansion-panel-header');
          if (!header || header.querySelector('.qcmk-edn-fiche-obj-anki')) return;
          const r = extractRowRank(panel) || extractRowRank(header);
          const objTitle = (header.textContent || '').replace(/\s+/g, ' ').trim();
          const uri = anki.buildAnkiEdnUri({
            action: 'lisa',
            src: 'edn',
            item: itemNum,
            rang: r === 'A' || r === 'B' ? r : undefined,
            q: anki.extractMedicalKeywords(objTitle, 4),
          });
          if (!uri) return;
          const btn = anki.createAnkiButton({ label: 'Anki', compact: true, uri });
          btn.classList.add('qcmk-edn-fiche-obj-anki');
          btn.style.marginLeft = '8px';
          header.appendChild(btn);
        });
        return;
      }

      // 2. Vue Correction Training / Exam
      if (!isCorrectionView()) return;
      const containers = getQuestionContainers().filter((c) => c !== document.body);
      if (containers.length === 0) return;

      const inspected = containers.map((c) => inspectEdnCorrectionQuestion(c, itemNum)).filter(Boolean);
      if (inspected.length === 0) return;

      const errList = inspected.filter((x) => x.hasError);
      const buildBatchUri = (subset) => {
        if (subset.length === 0) return null;
        const qids = [];
        const kw = [];
        const errs = [];
        for (const q of subset) {
          if (q.qid && qids.indexOf(q.qid) === -1) qids.push(q.qid);
          const srcKw = subset === errList ? q.errKeywords : q.allKeywords;
          for (const k of srcKw) if (kw.indexOf(k) === -1 && kw.length < 6) kw.push(k);
          if (subset === errList && q.errNote && errs.length < 2) errs.push(q.errNote);
        }
        return anki.buildAnkiEdnUri({
          action: 'qcm',
          src: 'edn',
          qid: qids,
          item: itemNum ? [itemNum] : [],
          q: kw,
          err: errs.join(' | '),
        });
      };

      if (!document.getElementById('qcmk-edn-anki-bar')) {
        const bar = document.createElement('div');
        bar.id = 'qcmk-edn-anki-bar';
        bar.className = 'qcmk-anki-bar';

        const title = document.createElement('span');
        title.className = 'qcmk-anki-bar-title';
        title.textContent = itemNum ? 'Anki EDN — Item ' + itemNum.padStart(3, '0') : 'Anki EDN — Correction EDN.fr';

        const actions = document.createElement('div');
        actions.className = 'qcmk-anki-bar-actions';

        const allUri = buildBatchUri(inspected);
        const errUri = buildBatchUri(errList);
        if (allUri) actions.appendChild(anki.createAnkiButton({ label: 'Anki : toutes les notions', uri: allUri }));
        actions.appendChild(
          anki.createAnkiButton({
            label: 'Anki : mes erreurs (' + errList.length + ')',
            primary: errList.length > 0,
            disabled: errList.length === 0 || !errUri,
            uri: errUri || '',
          })
        );

        bar.append(title, actions);
        const anchor = document.querySelector('#mobile-session-questions-container, app-training-correction, app-exam-content-correction, main') || document.body;
        anchor.prepend(bar);
      }

      inspected.forEach((info) => {
        if (info.el.querySelector('.qcmk-anki-q-bar')) return;
        const qAllUri = anki.buildAnkiEdnUri({
          action: 'qcm',
          src: 'edn',
          qid: info.qid ? [info.qid] : [],
          item: info.item ? [info.item] : [],
          rang: info.rang,
          q: info.allKeywords,
        });
        const qErrUri = info.hasError
          ? anki.buildAnkiEdnUri({
              action: 'qcm',
              src: 'edn',
              qid: info.qid ? [info.qid] : [],
              item: info.item ? [info.item] : [],
              rang: info.rang,
              q: info.errKeywords,
              err: info.errNote,
            })
          : null;
        if (!qAllUri && !qErrUri) return;

        const qBar = document.createElement('div');
        qBar.className = 'qcmk-anki-q-bar';
        if (qAllUri) qBar.appendChild(anki.createAnkiButton({ label: 'Anki : cette question', compact: true, uri: qAllUri }));
        if (qErrUri) qBar.appendChild(anki.createAnkiButton({ label: 'Anki : mes erreurs', compact: true, primary: true, uri: qErrUri }));
        info.el.appendChild(qBar);
      });
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
      applyEdnAnkiConnector(ctx);
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

        const qrocEnabled = mode === 'exam' ? ctx.isEnabled('edn.exam.qroc') : ctx.isEnabled('edn.training.qroc');
        if (!typing && qrocEnabled && kb.isPrintableKey(e)) {
          const idx = ctx.matchSharedChoice(e);
          const choices = getChoiceTargets(activeQ);
          if (choices.length === 0 || idx === -1) {
            const qroc = findQrocInput(activeQ);
            if (qroc && choices.length === 0) {
              qroc.focus();
              return false;
            }
          }
        }

        if (typing) {
          return false;
        }

        // Anki EDN shortcuts
        if (ctx.isEnabled('edn.anki')) {
          const anki = getAnki();
          const itemNum = extractEdnItemNumber();
          if (ctx.matches(e, 'edn.anki', 'openActive') && anki) {
            if (mode === 'fiche' && itemNum) {
              const u = anki.buildAnkiEdnUri({ action: 'lisa', src: 'edn', item: itemNum });
              if (u) return anki.launchAnkiUri(u, 'Ouverture Item ' + itemNum + ' dans Anki...');
            } else if (isCorrectionView() && activeQ && activeQ !== document.body) {
              const info = inspectEdnCorrectionQuestion(activeQ, itemNum);
              if (info) {
                const u = anki.buildAnkiEdnUri({
                  action: 'qcm',
                  src: 'edn',
                  qid: info.qid ? [info.qid] : [],
                  item: info.item ? [info.item] : [],
                  rang: info.rang,
                  q: info.allKeywords,
                });
                if (u) return anki.launchAnkiUri(u, 'Ouverture de la question dans Anki...');
              }
            }
          }
          if (ctx.matches(e, 'edn.anki', 'openErrors') && anki && isCorrectionView()) {
            const info = activeQ && activeQ !== document.body ? inspectEdnCorrectionQuestion(activeQ, itemNum) : null;
            if (info && info.hasError) {
              const u = anki.buildAnkiEdnUri({
                action: 'qcm',
                src: 'edn',
                qid: info.qid ? [info.qid] : [],
                item: info.item ? [info.item] : [],
                rang: info.rang,
                q: info.errKeywords,
                err: info.errNote,
              });
              if (u) return anki.launchAnkiUri(u, 'Ouverture des erreurs dans Anki...');
            }
            dom.showToast('Aucune erreur sur la question active.');
            return true;
          }
        }

        // Pin shortcut
        if (ctx.isEnabled('edn.pin') && ctx.matches(e, 'edn.pin', 'toggle')) {
          const pinBtn = activeQ.querySelector('app-student-question-pin button, app-student-question-pin');
          if (pinBtn && dom.safeClick(pinBtn)) {
            dom.showToast('Épingle mise à jour');
            return true;
          }
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
            if (ctx.matches(e, 'edn.exam.flags', 'nextFlag')) {
              return jumpToNextFlag(activeQ);
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
        clearEdnAnkiUi();
        const tb = document.getElementById('qcmk-edn-notions-toolbar');
        if (tb) tb.remove();
        const box = document.getElementById('qcmk-ancrage-summary');
        if (box) box.remove();
        if (resizeHandler) {
          window.removeEventListener('resize', resizeHandler);
          resizeHandler = null;
        }
      },

      _testHooks: {
        detectMode,
        extractEdnItemNumber,
        inspectEdnCorrectionQuestion,
        applyNotionsToolbar,
        applyEdnAnkiConnector,
      },
    };
  }

  adapters.edn = createEdnAdapter();
})();
