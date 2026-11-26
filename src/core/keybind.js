(function () {
  'use strict';
  const root = (globalThis.QCMK = globalThis.QCMK || {});

  const IGNORE_MODIFIER_KEYS = new Set([
    'Control',
    'Shift',
    'Alt',
    'Meta',
    'AltGraph',
    'CapsLock',
    'NumLock',
    'ScrollLock',
  ]);

  const DISPLAY_NAMES = {
    Enter: 'Entrée',
    ArrowLeft: '←',
    ArrowRight: '→',
    ArrowUp: '↑',
    ArrowDown: '↓',
    ' ': 'Espace',
    Spacebar: 'Espace',
    Escape: 'Échap',
    Backspace: 'Retour',
    Tab: 'Tab',
    Delete: 'Suppr',
  };

  function normalizeKey(key) {
    if (typeof key !== 'string') return '';
    if (key === 'Spacebar') return ' ';
    if (key.length === 1 && /^[a-zA-Z]$/.test(key)) {
      return key.toLowerCase();
    }
    return key;
  }

  function matchesBinding(event, binding) {
    if (!event || !binding || !binding.key) return false;

    const wantCtrl = Boolean(binding.ctrl);
    const wantAlt = Boolean(binding.alt);
    const wantMeta = Boolean(binding.meta);

    if (Boolean(event.ctrlKey) !== wantCtrl) return false;
    if (Boolean(event.altKey) !== wantAlt) return false;
    if (Boolean(event.metaKey) !== wantMeta) return false;

    if (typeof binding.shift === 'boolean' && Boolean(event.shiftKey) !== binding.shift) {
      return false;
    }

    return normalizeKey(event.key) === normalizeKey(binding.key);
  }

  function matchesAny(event, bindings) {
    if (!Array.isArray(bindings) || bindings.length === 0) return false;
    for (let i = 0; i < bindings.length; i++) {
      if (matchesBinding(event, bindings[i])) return true;
    }
    return false;
  }

  function isTextInputElement(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.isContentEditable) return true;
    const tag = (el.tagName || '').toUpperCase();
    if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (tag === 'INPUT') {
      const type = (el.type || 'text').toLowerCase();
      return !['checkbox', 'radio', 'button', 'submit', 'reset', 'image', 'file', 'range', 'color'].includes(type);
    }
    return false;
  }

  function isTypingTarget(el) {
    if (isTextInputElement(el)) return true;
    if (typeof document !== 'undefined' && document.activeElement && isTextInputElement(document.activeElement)) {
      return true;
    }
    return false;
  }

  function isPrintableKey(event) {
    if (!event || event.ctrlKey || event.altKey || event.metaKey) return false;
    if (typeof event.key !== 'string' || event.key.length !== 1) return false;
    return !/^\s$/.test(event.key);
  }

  function formatBinding(binding) {
    if (!binding || !binding.key) return '';
    const parts = [];
    if (binding.ctrl) parts.push('Ctrl');
    if (binding.alt) parts.push('Alt');
    if (binding.meta) parts.push('Cmd');
    if (binding.shift === true) parts.push('Maj');

    const keyLabel = DISPLAY_NAMES[binding.key] || (
      binding.key.length === 1 && /^[a-z]$/.test(binding.key)
        ? binding.key.toUpperCase()
        : binding.key
    );
    parts.push(keyLabel);
    return parts.join(' + ');
  }

  function bindingSignature(binding) {
    if (!binding || !binding.key) return '';
    return [
      binding.ctrl ? '1' : '0',
      binding.alt ? '1' : '0',
      binding.meta ? '1' : '0',
      typeof binding.shift === 'boolean' ? (binding.shift ? 'S1' : 'S0') : 'S*',
      normalizeKey(binding.key),
    ].join('|');
  }

  function eventToBinding(event) {
    if (!event || !event.key || IGNORE_MODIFIER_KEYS.has(event.key)) return null;
    const binding = { key: event.key === 'Spacebar' ? ' ' : event.key };
    if (event.ctrlKey) binding.ctrl = true;
    if (event.altKey) binding.alt = true;
    if (event.metaKey) binding.meta = true;
    // Only record explicit Shift when paired with another modifier or a non-character key
    if (event.shiftKey && (event.ctrlKey || event.altKey || event.metaKey || binding.key.length > 1)) {
      binding.shift = true;
    }
    return binding;
  }

  root.keybind = {
    normalizeKey,
    matchesBinding,
    matchesAny,
    isTypingTarget,
    isPrintableKey,
    formatBinding,
    bindingSignature,
    eventToBinding,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = root.keybind;
  }
})();
