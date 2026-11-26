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
