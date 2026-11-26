(function () {
  'use strict';
  const root = (globalThis.QCMK = globalThis.QCMK || {});
  const adapters = (root.adapters = root.adapters || {});

  function createRefouaAdapter() {
    const dom = root.dom;
    let appliedHash = '';

    function injectAnkiButtonNear(targetEl, rawObjective) {
      const anki = root.anki;
      if (!anki || !targetEl || targetEl.querySelector('.qcmk-refoua-anki')) return;
      const oicMatch = String(rawObjective || targetEl.textContent || '').match(/\bOIC[-_]\d{1,3}[-_]\d{1,2}[-_][AB](?:[-_]\d{1,2})?\b/i);
      const itemMatch = (location.pathname || '').match(/item[-_]?(\d{1,3})/i) || (document.title || '').match(/\bItem\s*(\d{1,3})\b/i);
      const uri = anki.buildAnkiEdnUri({
        action: 'lisa',
        src: 'lisa',
        oic: oicMatch ? oicMatch[0] : undefined,
        item: itemMatch ? itemMatch[1] : undefined,
        q: anki.extractMedicalKeywords(rawObjective || targetEl.textContent || '', 4),
      });
      if (!uri) return;
      const btn = anki.createAnkiButton({ label: 'Anki', compact: true, uri });
      btn.classList.add('qcmk-refoua-anki');
      btn.style.marginLeft = '8px';
      targetEl.appendChild(btn);
    }

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
      injectAnkiButtonNear(match, raw);
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
      destroy() {
        document.querySelectorAll('.qcmk-refoua-anki').forEach((n) => n.remove());
      },
    };
  }

  adapters.refoua = createRefouaAdapter();
})();
