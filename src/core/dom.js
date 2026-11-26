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
