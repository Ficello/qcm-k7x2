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
