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
