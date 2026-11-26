(function () {
  'use strict';
  const root = (globalThis.QCMK = globalThis.QCMK || {});
  const adapters = (root.adapters = root.adapters || {});

  function createAsclepiaAdapter() {
    const dom = root.dom;
    const kb = root.keybind;
    const flagStore = new dom.FlagStore('asclepia');
    let headerCollapsed = true;

    function getAnki() {
      return root.anki || null;
    }

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

    function applyInlineScores(ctx) {
      document.querySelectorAll('.qcmk-asclepia-score').forEach((n) => n.classList.remove('qcmk-asclepia-score', 'qcmk-score-good', 'qcmk-score-mid', 'qcmk-score-low'));
      if (!ctx.isEnabled('asclepia.inlineScores')) {
        dom.injectStyle('qcmk-asclepia-scores-css', '');
        return;
      }
      dom.injectStyle(
        'qcmk-asclepia-scores-css',
        '.qcmk-score-good{color:#15803d!important;font-weight:600!important;}.qcmk-score-mid{color:#b45309!important;font-weight:600!important;}.qcmk-score-low{color:#b91c1c!important;font-weight:600!important;}'
      );
      const nodes = document.querySelectorAll('span, div, p, strong');
      for (let i = 0; i < nodes.length; i++) {
        const el = nodes[i];
        if (el.children.length > 0 || !dom.isVisible(el)) continue;
        const m = (el.textContent || '').trim().match(/^(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)(?:\s*pts?)?$/i);
        if (!m) continue;
        const got = parseFloat(m[1].replace(',', '.'));
        const max = parseFloat(m[2].replace(',', '.'));
        if (!max) continue;
        const ratio = got / max;
        const cls = ratio >= 0.8 ? 'qcmk-score-good' : ratio >= 0.5 ? 'qcmk-score-mid' : 'qcmk-score-low';
        el.classList.add('qcmk-asclepia-score', cls);
      }
    }

    function applyKeyHints(ctx) {
      if (!ctx.isEnabled('asclepia.keyHints')) {
        dom.clearKeyHints();
        return;
      }
      const activeQ = getActiveQuestion();
      const items = [];
      getChoiceTargets(activeQ).slice(0, 10).forEach((el, idx) => {
        const label = ctx.formatFirst(ctx.sharedBindings('choice.' + (idx + 1)));
        if (label) items.push({ el, label });
      });
      const valBtn = dom.findButtonByText(activeQ, [/^valider$/, /^ok$/, /afficher la correction/, /^continuer$/]);
      if (valBtn) {
        items.push({ el: valBtn, label: ctx.formatFirst(ctx.bindings('asclepia.answer', 'validate')) });
      }
      dom.renderKeyHints(items);
    }

    // -------------------------------------------------------------------------
    // Connecteur Anki EDN sur Asclepia (/dashboard/item/<num> & /correction)
    // -------------------------------------------------------------------------

    function extractAsclepiaItemNumber() {
      const mPath = (location.pathname || '').match(/\/dashboard\/item\/(\d{1,3})\b/i);
      if (mPath) return mPath[1];
      const h1 = document.querySelector('#scrollable-container h1, h1, h2');
      const mTxt = h1 ? (h1.textContent || '').match(/\bItem\s*[-:n°]*\s*(\d{1,3})\b/i) : null;
      return mTxt ? mTxt[1] : null;
    }

    function clearAsclepiaAnkiUi() {
      const bar = document.getElementById('qcmk-asclepia-anki-bar');
      if (bar) bar.remove();
      document.querySelectorAll('.qcmk-asclepia-know-anki, .qcmk-anki-q-bar').forEach((n) => n.remove());
    }

    function applyAsclepiaAnkiConnector(ctx) {
      const anki = getAnki();
      if (!anki || !ctx.isEnabled('asclepia.anki') || ctx.option('asclepia.anki', 'showButtons') === false) {
        clearAsclepiaAnkiUi();
        return;
      }

      const itemNum = extractAsclepiaItemNumber();
      const knowNodes = Array.from(document.querySelectorAll('[class*="KnowledgeRankFromId__Container"]'));

      if (itemNum && !document.getElementById('qcmk-asclepia-anki-bar')) {
        const container = document.getElementById('scrollable-container') || document.querySelector('main') || document.body;
        const bar = document.createElement('div');
        bar.id = 'qcmk-asclepia-anki-bar';
        bar.className = 'qcmk-anki-bar';

        const title = document.createElement('span');
        title.className = 'qcmk-anki-bar-title';
        title.textContent = 'Anki EDN — Item ' + itemNum.padStart(3, '0');

        const actions = document.createElement('div');
        actions.className = 'qcmk-anki-bar-actions';
        const allUri = anki.buildAnkiEdnUri({ action: 'lisa', src: 'asclepia', item: itemNum });
        const rAUri = anki.buildAnkiEdnUri({ action: 'lisa', src: 'asclepia', item: itemNum, rang: 'A' });
        const rBUri = anki.buildAnkiEdnUri({ action: 'lisa', src: 'asclepia', item: itemNum, rang: 'B' });
        if (allUri) actions.appendChild(anki.createAnkiButton({ label: "Tout l'item " + itemNum, primary: true, uri: allUri }));
        if (rAUri) actions.appendChild(anki.createAnkiButton({ label: 'Rang A', uri: rAUri }));
        if (rBUri) actions.appendChild(anki.createAnkiButton({ label: 'Rang B', uri: rBUri }));
        bar.append(title, actions);
        container.prepend(bar);
      }

      knowNodes.forEach((kn) => {
        const card = kn.closest('div[class*="sc-"]') || kn.parentElement;
        if (!card || card.querySelector('.qcmk-asclepia-know-anki')) return;
        const rankEl = kn.querySelector('[class*="RankLetter"]') || kn;
        const rMatch = (rankEl.textContent || '').trim().match(/\b([AB])\b/i);
        const rang = rMatch ? rMatch[1].toUpperCase() : undefined;
        const oicM = (card.textContent || '').match(/\bOIC[-_](\d{1,3})[-_](\d{1,2})[-_]([AB])(?:[-_]\d{1,2})?\b/i);
        const uri = anki.buildAnkiEdnUri({
          action: 'lisa',
          src: 'asclepia',
          oic: oicM ? oicM[0] : undefined,
          item: itemNum,
          rang,
          q: anki.extractMedicalKeywords(card.textContent || '', 4),
        });
        if (!uri) return;
        const btn = anki.createAnkiButton({ label: 'Anki', compact: true, uri });
        btn.classList.add('qcmk-asclepia-know-anki');
        btn.style.marginLeft = '8px';
        kn.appendChild(btn);
      });

      if (isCorrectionView()) {
        getQuestions().filter((q) => q !== document.body).forEach((q) => {
          if (q.querySelector('.qcmk-anki-q-bar')) return;
          const qidAttr = q.getAttribute('data-question-id') || (q.id && q.id.replace(/^question-/i, ''));
          const qid = qidAttr ? 'asclepia:q:' + qidAttr.slice(0, 24).toLowerCase() : null;
          const rankEl = q.querySelector('[class*="RankLetter"]');
          const rM = rankEl ? (rankEl.textContent || '').match(/\b([AB])\b/i) : null;
          const uri = anki.buildAnkiEdnUri({
            action: 'qcm',
            src: 'asclepia',
            qid: qid ? [qid] : [],
            item: itemNum ? [itemNum] : [],
            rang: rM ? rM[1].toUpperCase() : undefined,
            q: anki.extractMedicalKeywords(q.textContent || '', 5),
          });
          if (!uri) return;
          const qBar = document.createElement('div');
          qBar.className = 'qcmk-anki-q-bar';
          qBar.appendChild(anki.createAnkiButton({ label: 'Anki : cette question', compact: true, uri }));
          q.appendChild(qBar);
        });
      }
    }

    function tryChainNextSubfolder(ctx) {
      if (!ctx.isEnabled('asclepia.chain')) return;
      setTimeout(() => {
        const nextFolderBtn = dom.findButtonByText(document, [/dossier suivant/, /sous-dossier suivant/, /epreuve suivante/]);
        if (nextFolderBtn) dom.safeClick(nextFolderBtn);
      }, 300);
    }

    function refresh(ctx) {
      applyCompactHeader(ctx);
      renderFlags(ctx);
      applyInlineScores(ctx);
      applyAsclepiaAnkiConnector(ctx);
      applyKeyHints(ctx);
    }

    return {
      init(ctx) {
        refresh(ctx);
      },

      onDomMutate(ctx) {
        refresh(ctx);
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

        if (ctx.isEnabled('asclepia.anki')) {
          const anki = getAnki();
          const itemNum = extractAsclepiaItemNumber();
          if (ctx.matches(e, 'asclepia.anki', 'openActive') && anki) {
            const uri = anki.buildAnkiEdnUri({
              action: isCorrectionView() ? 'qcm' : 'lisa',
              src: 'asclepia',
              item: itemNum ? [itemNum] : [],
              q: activeQ && activeQ !== document.body ? anki.extractMedicalKeywords(activeQ.textContent || '', 5) : [],
            });
            if (uri) return anki.launchAnkiUri(uri, 'Ouverture dans Anki...');
          }
          if (ctx.matches(e, 'asclepia.anki', 'openErrors') && anki && isCorrectionView()) {
            const uri = anki.buildAnkiEdnUri({
              action: 'qcm',
              src: 'asclepia',
              item: itemNum ? [itemNum] : [],
              q: activeQ && activeQ !== document.body ? anki.extractMedicalKeywords(activeQ.textContent || '', 5) : [],
              err: 'Erreur Asclepia',
            });
            if (uri) return anki.launchAnkiUri(uri, 'Ouverture des erreurs dans Anki...');
          }
        }

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

        if (ctx.isEnabled('asclepia.nav')) {
          const list = getQuestions();
          const cur = list.indexOf(activeQ);
          if (ctx.matches(e, 'asclepia.nav', 'prev')) {
            if (cur > 0) {
              list[cur - 1].scrollIntoView({ behavior: 'smooth', block: 'start' });
              return true;
            }
            const prevBtn = dom.findButtonByText(document, [/^precedent/, /question precedente/, /^retour$/]);
            if (prevBtn) { dom.safeClick(prevBtn); return true; }
          }
          if (ctx.matches(e, 'asclepia.nav', 'next')) {
            if (cur !== -1 && cur + 1 < list.length) {
              list[cur + 1].scrollIntoView({ behavior: 'smooth', block: 'start' });
              return true;
            }
            const nextBtn = dom.findButtonByText(document, [/^suivant/, /question suivante/, /^continuer$/]);
            if (nextBtn) { dom.safeClick(nextBtn); return true; }
          }
        }

        if (ctx.isEnabled('asclepia.flags')) {
          const list = getQuestions();
          if (ctx.matches(e, 'asclepia.flags', 'nextFlag')) {
            const flags = flagStore.getFlags(getExamKey());
            const flagged = list.filter((q, i) => {
              const qid = q.getAttribute('data-question-id') || q.id || String(i + 1);
              return flags.has(qid) || flags.has(String(i + 1));
            });
            if (flagged.length === 0) {
              dom.showToast('Aucune question marquée');
              return false;
            }
            const nextEl = flagged[(flagged.indexOf(activeQ) + 1) % flagged.length];
            nextEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return true;
          }
          if (ctx.matches(e, 'asclepia.flags', 'toggle')) {
            const idx = Math.max(0, list.indexOf(activeQ));
            const qid = activeQ.getAttribute('data-question-id') || activeQ.id || String(idx + 1);
            const res = flagStore.toggleFlag(getExamKey(), qid);
            renderFlags(ctx);
            dom.showToast(res.added ? 'Drapeau ajouté' : 'Drapeau retiré');
            return true;
          }
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
        dom.injectStyle('qcmk-asclepia-scores-css', '');
        dom.clearKeyHints();
        clearAsclepiaAnkiUi();
      },

      _testHooks: {
        extractAsclepiaItemNumber,
        applyAsclepiaAnkiConnector,
      },
    };
  }

  adapters.asclepia = createAsclepiaAdapter();
})();
