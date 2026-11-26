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
