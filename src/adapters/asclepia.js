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
