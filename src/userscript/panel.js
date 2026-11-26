(function () {
  'use strict';
  const root = globalThis.QCMK;
  if (!root || !root.schema || !root.storage || !root.keybind) return;

  const { schema, storage, keybind } = root;
  const PANEL_ID = 'qcmk-userscript-panel';
  let currentSettings = null;
  let recording = null;

  function detectSiteId() {
    const host = (location.hostname || '').toLowerCase();
    for (const s of schema.sites) {
      if (s.hidden) continue;
      if (s.hosts.some((h) => host === h || host.endsWith('.' + h))) return s.id;
    }
    return 'edn';
  }

  function ensureStyles() {
    if (document.getElementById('qcmk-us-style')) return;
    const style = document.createElement('style');
    style.id = 'qcmk-us-style';
    style.textContent = [
      '#' + PANEL_ID + '{position:fixed;inset:0;z-index:2147483647;background:rgba(24,24,27,0.45);display:flex;align-items:center;justify-content:center;padding:16px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:13px;color:#18181b;}',
      '#' + PANEL_ID + ' .qcmk-dialog{width:min(760px,100%);max-height:86vh;display:flex;flex-direction:column;background:#ffffff;border:1px solid #d4d4d8;border-radius:8px;overflow:hidden;}',
      '#' + PANEL_ID + ' .qcmk-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid #e4e4e7;background:#f7f7f8;}',
      '#' + PANEL_ID + ' .qcmk-head h2{margin:0;font-size:15px;font-weight:600;}',
      '#' + PANEL_ID + ' .qcmk-controls{display:flex;flex-wrap:wrap;align-items:center;gap:8px;}',
      '#' + PANEL_ID + ' .qcmk-body{padding:14px 16px;overflow-y:auto;display:flex;flex-direction:column;gap:12px;}',
      '#' + PANEL_ID + ' .qcmk-tabs{display:flex;flex-wrap:wrap;gap:4px;border-bottom:1px solid #e4e4e7;padding:0 16px;}',
      '#' + PANEL_ID + ' .qcmk-tab{padding:8px 12px;border:0;border-bottom:2px solid transparent;background:transparent;color:#52525b;font-weight:500;cursor:pointer;}',
      '#' + PANEL_ID + ' .qcmk-tab.active{color:#1d4ed8;border-bottom-color:#1d4ed8;font-weight:600;}',
      '#' + PANEL_ID + ' .qcmk-card{border:1px solid #e4e4e7;border-radius:8px;background:#ffffff;}',
      '#' + PANEL_ID + ' .qcmk-row{padding:11px 14px;border-bottom:1px solid #e4e4e7;}',
      '#' + PANEL_ID + ' .qcmk-row:last-child{border-bottom:0;}',
      '#' + PANEL_ID + ' .qcmk-row-top{display:flex;align-items:center;justify-content:space-between;gap:12px;}',
      '#' + PANEL_ID + ' .qcmk-title{font-weight:600;color:#18181b;}',
      '#' + PANEL_ID + ' .qcmk-desc{font-size:12px;color:#52525b;margin-top:2px;}',
      '#' + PANEL_ID + ' .qcmk-act{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;margin-top:8px;padding:6px 9px;border:1px solid #e4e4e7;border-radius:6px;background:#f7f7f8;}',
      '#' + PANEL_ID + ' .qcmk-keys{display:flex;flex-wrap:wrap;align-items:center;gap:6px;}',
      '#' + PANEL_ID + ' kbd.qcmk-kbd{display:inline-flex;align-items:center;gap:4px;padding:2px 6px;border:1px solid #d4d4d8;border-radius:4px;background:#ffffff;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;font-weight:600;}',
      '#' + PANEL_ID + ' .qcmk-btn{padding:5px 10px;border:1px solid #d4d4d8;border-radius:6px;background:#ffffff;color:#18181b;font-size:12px;font-weight:500;cursor:pointer;}',
      '#' + PANEL_ID + ' .qcmk-btn.primary{background:#1d4ed8;border-color:#1d4ed8;color:#ffffff;}',
      '#' + PANEL_ID + ' .qcmk-btn.rec{border-color:#1d4ed8;background:#eff6ff;color:#1d4ed8;}',
      '#' + PANEL_ID + ' .qcmk-del{border:0;background:transparent;color:#52525b;cursor:pointer;padding:0 2px;font-size:13px;}',
      '#' + PANEL_ID + ' select{padding:5px 8px;border:1px solid #d4d4d8;border-radius:6px;background:#ffffff;color:#18181b;font-size:12px;}',
    ].join('\n');
    (document.head || document.documentElement).appendChild(style);
  }

  function closePanel() {
    recording = null;
    const el = document.getElementById(PANEL_ID);
    if (el) el.remove();
  }

  function openPanel() {
    if (document.getElementById(PANEL_ID)) {
      closePanel();
      return;
    }
    ensureStyles();

    storage.load().then((loaded) => {
      currentSettings = loaded;
      let activeTab = detectSiteId();

      const overlay = document.createElement('div');
      overlay.id = PANEL_ID;
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closePanel();
      });

      const dialog = document.createElement('div');
      dialog.className = 'qcmk-dialog';

      const head = document.createElement('div');
      head.className = 'qcmk-head';
      const title = document.createElement('h2');
      title.textContent = 'QCM Clavier (Alt + Maj + K)';

      const controls = document.createElement('div');
      controls.className = 'qcmk-controls';

      const globalLabel = document.createElement('label');
      globalLabel.style.display = 'inline-flex';
      globalLabel.style.alignItems = 'center';
      globalLabel.style.gap = '6px';
      const globalCb = document.createElement('input');
      globalCb.type = 'checkbox';
      globalCb.checked = currentSettings.enabled !== false;
      globalCb.addEventListener('change', () => {
        currentSettings.enabled = globalCb.checked;
        storage.save(currentSettings).then((s) => { currentSettings = s; });
      });
      globalLabel.append(globalCb, document.createTextNode('Actif'));

      const presetSel = document.createElement('select');
      for (const [key, def] of Object.entries(schema.presets)) {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = def.label;
        presetSel.appendChild(opt);
      }
      presetSel.value = currentSettings.preset || 'azerty';
      presetSel.addEventListener('change', () => {
        const fresh = storage.buildDefaults(presetSel.value);
        fresh.enabled = currentSettings.enabled;
        storage.save(fresh).then((s) => {
          currentSettings = s;
          renderBody();
        });
      });

      const resetBtn = document.createElement('button');
      resetBtn.type = 'button';
      resetBtn.className = 'qcmk-btn';
      resetBtn.textContent = 'Réinitialiser';
      resetBtn.addEventListener('click', () => {
        storage.reset(presetSel.value).then((s) => {
          currentSettings = s;
          renderBody();
        });
      });

      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'qcmk-btn primary';
      closeBtn.textContent = 'Fermer';
      closeBtn.addEventListener('click', closePanel);

      controls.append(globalLabel, presetSel, resetBtn, closeBtn);
      head.append(title, controls);

      const tabsEl = document.createElement('div');
      tabsEl.className = 'qcmk-tabs';
      const bodyEl = document.createElement('div');
      bodyEl.className = 'qcmk-body';

      const tabs = [
        { id: 'shared', label: 'Propositions (1–10)' },
        ...schema.sites.filter((s) => !s.hidden).map((s) => ({ id: s.id, label: s.name })),
      ];

      function renderTabs() {
        tabsEl.innerHTML = '';
        for (const t of tabs) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'qcmk-tab' + (t.id === activeTab ? ' active' : '');
          btn.textContent = t.label;
          btn.addEventListener('click', () => {
            recording = null;
            activeTab = t.id;
            renderTabs();
            renderBody();
          });
          tabsEl.appendChild(btn);
        }
      }

      function renderBindings(list, onRecord, onRemove) {
        const wrap = document.createElement('div');
        wrap.className = 'qcmk-keys';
        list.forEach((b, idx) => {
          const kbd = document.createElement('kbd');
          kbd.className = 'qcmk-kbd';
          kbd.appendChild(document.createTextNode(keybind.formatBinding(b)));
          const del = document.createElement('button');
          del.type = 'button';
          del.className = 'qcmk-del';
          del.textContent = '×';
          del.addEventListener('click', () => onRemove(idx));
          kbd.appendChild(del);
          wrap.appendChild(kbd);
        });
        const add = document.createElement('button');
        add.type = 'button';
        add.className = 'qcmk-btn';
        add.textContent = '+ Ajouter';
        add.addEventListener('click', () => onRecord(add));
        wrap.appendChild(add);
        return wrap;
      }

      function renderBody() {
        bodyEl.innerHTML = '';
        const card = document.createElement('div');
        card.className = 'qcmk-card';

        if (activeTab === 'shared') {
          for (const sa of schema.sharedActions) {
            const row = document.createElement('div');
            row.className = 'qcmk-row';
            const act = document.createElement('div');
            act.className = 'qcmk-act';
            act.style.marginTop = '0';
            const lbl = document.createElement('span');
            lbl.textContent = sa.label;
            const controlsWrap = renderBindings(
              currentSettings.shared[sa.id] || [],
              (btn) => {
                recording = { kind: 'shared', actionId: sa.id, btn };
                btn.classList.add('rec');
                btn.textContent = 'Appuyez sur une touche…';
              },
              (idx) => {
                currentSettings.shared[sa.id].splice(idx, 1);
                storage.save(currentSettings).then((s) => { currentSettings = s; renderBody(); });
              }
            );
            act.append(lbl, controlsWrap);
            row.appendChild(act);
            card.appendChild(row);
          }
          bodyEl.appendChild(card);
          return;
        }

        const feats = schema.features.filter((f) => f.site === activeTab && !f.hidden);
        for (const feat of feats) {
          const row = document.createElement('div');
          row.className = 'qcmk-row';

          const top = document.createElement('div');
          top.className = 'qcmk-row-top';
          const info = document.createElement('div');
          const nameEl = document.createElement('div');
          nameEl.className = 'qcmk-title';
          nameEl.textContent = feat.name;
          const descEl = document.createElement('div');
          descEl.className = 'qcmk-desc';
          descEl.textContent = feat.description;
          info.append(nameEl, descEl);

          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.checked = currentSettings.features[feat.id]?.enabled !== false;
          cb.addEventListener('change', () => {
            currentSettings.features[feat.id].enabled = cb.checked;
            storage.save(currentSettings).then((s) => { currentSettings = s; });
          });
          top.append(info, cb);
          row.appendChild(top);

          for (const act of feat.actions || []) {
            const actRow = document.createElement('div');
            actRow.className = 'qcmk-act';
            const lbl = document.createElement('span');
            lbl.textContent = act.label;
            const ctrl = renderBindings(
              currentSettings.features[feat.id].actions[act.id] || [],
              (btn) => {
                recording = { kind: 'feature', featureId: feat.id, actionId: act.id, btn };
                btn.classList.add('rec');
                btn.textContent = 'Appuyez sur une touche…';
              },
              (idx) => {
                currentSettings.features[feat.id].actions[act.id].splice(idx, 1);
                storage.save(currentSettings).then((s) => { currentSettings = s; renderBody(); });
              }
            );
            actRow.append(lbl, ctrl);
            row.appendChild(actRow);
          }

          card.appendChild(row);
        }
        bodyEl.appendChild(card);
      }

      renderTabs();
      renderBody();
      dialog.append(head, tabsEl, bodyEl);
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      overlay._refreshBody = renderBody;
    });
  }

  window.addEventListener('keydown', (e) => {
    if (recording) {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') {
        recording = null;
        const panel = document.getElementById(PANEL_ID);
        if (panel && panel._refreshBody) panel._refreshBody();
        return;
      }
      const binding = keybind.eventToBinding(e);
      if (!binding) return;
      const list = recording.kind === 'shared'
        ? currentSettings.shared[recording.actionId]
        : currentSettings.features[recording.featureId].actions[recording.actionId];
      const sig = keybind.bindingSignature(binding);
      if (!list.some((b) => keybind.bindingSignature(b) === sig)) {
        list.push(binding);
      }
      recording = null;
      storage.save(currentSettings).then((s) => {
        currentSettings = s;
        const panel = document.getElementById(PANEL_ID);
        if (panel && panel._refreshBody) panel._refreshBody();
      });
      return;
    }

    if (e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey && (e.key === 'K' || e.key === 'k')) {
      e.preventDefault();
      e.stopPropagation();
      openPanel();
    }
  }, true);

  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand('Configurer QCM Clavier', openPanel);
  }
})();
