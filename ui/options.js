(function () {
  'use strict';
  const { schema, storage, keybind } = globalThis.QCMK;

  const tabsEl = document.getElementById('tabs');
  const contentEl = document.getElementById('content');
  const globalToggle = document.getElementById('global-enabled');
  const presetSelect = document.getElementById('preset-select');
  const applyPresetBtn = document.getElementById('apply-preset');
  const exportBtn = document.getElementById('export-btn');
  const importBtn = document.getElementById('import-btn');
  const importFile = document.getElementById('import-file');
  const resetBtn = document.getElementById('reset-btn');
  const statusBanner = document.getElementById('status-banner');

  const TABS = [
    { id: 'shared', label: 'Propositions (1–10)' },
    ...schema.sites.filter((s) => !s.hidden).map((s) => ({ id: s.id, label: s.name })),
  ];

  let activeTab = TABS[0].id;
  let settings = null;
  let recordingTarget = null; // { kind: 'shared' | 'feature', featureId?, actionId, button }

  function showStatus(msg, isError) {
    statusBanner.textContent = msg;
    statusBanner.classList.toggle('error', Boolean(isError));
    statusBanner.classList.add('visible');
    clearTimeout(showStatus._t);
    showStatus._t = setTimeout(() => {
      statusBanner.classList.remove('visible');
    }, 3200);
  }

  function commitSave(message) {
    return storage.save(settings).then((saved) => {
      settings = saved;
      if (message) showStatus(message, false);
      renderContent();
    });
  }

  function findDuplicatesForSite(siteId) {
    const sigMap = new Map();
    const sharedGroup = schema.sharedActions;
    const siteFeatures = schema.features.filter((f) => f.site === siteId && !f.hidden);

    function register(sig, label) {
      if (!sig) return;
      if (!sigMap.has(sig)) sigMap.set(sig, []);
      sigMap.get(sig).push(label);
    }

    for (const sa of sharedGroup) {
      for (const b of settings.shared[sa.id] || []) {
        register(keybind.bindingSignature(b), sa.label);
      }
    }
    for (const feat of siteFeatures) {
      if (settings.features[feat.id]?.enabled === false) continue;
      for (const act of feat.actions || []) {
        const list = settings.features[feat.id]?.actions[act.id] || [];
        for (const b of list) {
          register(keybind.bindingSignature(b), feat.name + ' : ' + act.label);
        }
      }
    }
    return sigMap;
  }

  function renderTabs() {
    tabsEl.innerHTML = '';
    for (const tab of TABS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tab-btn' + (tab.id === activeTab ? ' active' : '');
      btn.textContent = tab.label;
      btn.addEventListener('click', () => {
        stopRecording();
        activeTab = tab.id;
        renderTabs();
        renderContent();
      });
      tabsEl.appendChild(btn);
    }
  }

  function stopRecording() {
    if (!recordingTarget) return;
    recordingTarget = null;
    renderContent();
  }

  function createActionControl(bindings, duplicateMap, onAdd, onRemove) {
    const row = document.createElement('div');
    row.className = 'bindings-wrap';

    bindings.forEach((b, idx) => {
      const kbd = document.createElement('kbd');
      kbd.className = 'keycap';
      kbd.appendChild(document.createTextNode(keybind.formatBinding(b)));

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'keycap-remove';
      del.title = 'Supprimer ce raccourci';
      del.textContent = '×';
      del.addEventListener('click', () => onRemove(idx));

      kbd.appendChild(del);
      row.appendChild(kbd);
    });

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn btn-sm';
    addBtn.textContent = '+ Ajouter';
    addBtn.addEventListener('click', () => onAdd(addBtn));
    row.appendChild(addBtn);

    if (duplicateMap) {
      const conflicts = [];
      for (const b of bindings) {
        const hits = duplicateMap.get(keybind.bindingSignature(b)) || [];
        if (hits.length > 1) {
          conflicts.push(keybind.formatBinding(b) + ' utilisé aussi pour ' + hits.join(' / '));
        }
      }
      if (conflicts.length > 0) {
        const note = document.createElement('div');
        note.className = 'conflict-note';
        note.textContent = 'Doublon détecté : ' + conflicts[0];
        row.appendChild(note);
      }
    }

    return row;
  }

  function startRecording(target) {
    recordingTarget = target;
    target.button.classList.add('btn-recording');
    target.button.textContent = 'Appuyez sur une touche… (Échap pour annuler)';
  }

  function renderSharedTab() {
    const section = document.createElement('section');
    section.className = 'section-block';

    const title = document.createElement('h2');
    title.className = 'section-title';
    title.textContent = 'Touches partagées pour cocher les propositions (1 à 10)';
    section.appendChild(title);

    const table = document.createElement('div');
    table.className = 'feature-table';

    const introRow = document.createElement('div');
    introRow.className = 'feature-row';
    introRow.innerHTML = '<div class="feature-name">Propositions 1 à 10</div><div class="feature-desc">Ces touches s\'appliquent à toutes les plateformes actives (EDN.fr, Hypocampus, UNESS, Asclepia).</div>';

    const list = document.createElement('div');
    list.className = 'actions-list';

    for (const sa of schema.sharedActions) {
      const actRow = document.createElement('div');
      actRow.className = 'action-row';

      const lbl = document.createElement('span');
      lbl.className = 'action-label';
      lbl.textContent = sa.label;

      const bindings = settings.shared[sa.id] || [];
      const controls = createActionControl(
        bindings,
        null,
        (btn) => startRecording({ kind: 'shared', actionId: sa.id, button: btn }),
        (idx) => {
          settings.shared[sa.id].splice(idx, 1);
          commitSave('Raccourci supprimé.');
        }
      );

      actRow.append(lbl, controls);
      list.appendChild(actRow);
    }

    introRow.appendChild(list);
    table.appendChild(introRow);
    section.appendChild(table);
    contentEl.appendChild(section);
  }

  function renderSiteTab(siteId) {
    const siteFeatures = schema.features.filter((f) => f.site === siteId && !f.hidden);
    const dupMap = findDuplicatesForSite(siteId);
    const groups = new Map();

    for (const feat of siteFeatures) {
      const g = feat.group || 'Général';
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(feat);
    }

    for (const [groupName, feats] of groups.entries()) {
      const section = document.createElement('section');
      section.className = 'section-block';

      const title = document.createElement('h2');
      title.className = 'section-title';
      title.textContent = groupName;
      section.appendChild(title);

      const table = document.createElement('div');
      table.className = 'feature-table';

      for (const feat of feats) {
        const row = document.createElement('div');
        row.className = 'feature-row';

        const head = document.createElement('div');
        head.className = 'feature-head';

        const textWrap = document.createElement('div');
        const nameEl = document.createElement('div');
        nameEl.className = 'feature-name';
        nameEl.textContent = feat.name;
        const descEl = document.createElement('div');
        descEl.className = 'feature-desc';
        descEl.textContent = feat.description;
        textWrap.append(nameEl, descEl);

        const sw = document.createElement('label');
        sw.className = 'switch';
        const swInput = document.createElement('input');
        swInput.type = 'checkbox';
        swInput.checked = settings.features[feat.id]?.enabled !== false;
        swInput.addEventListener('change', () => {
          settings.features[feat.id].enabled = swInput.checked;
          commitSave('Réglage enregistré.');
        });
        const swTrack = document.createElement('span');
        swTrack.className = 'switch-track';
        sw.append(swInput, swTrack);

        head.append(textWrap, sw);
        row.appendChild(head);

        if (feat.actions && feat.actions.length > 0) {
          const actionsList = document.createElement('div');
          actionsList.className = 'actions-list';

          for (const act of feat.actions) {
            const actRow = document.createElement('div');
            actRow.className = 'action-row';

            const actLbl = document.createElement('span');
            actLbl.className = 'action-label';
            actLbl.textContent = act.label;

            const bindings = settings.features[feat.id].actions[act.id] || [];
            const controls = createActionControl(
              bindings,
              dupMap,
              (btn) => startRecording({ kind: 'feature', featureId: feat.id, actionId: act.id, button: btn }),
              (idx) => {
                settings.features[feat.id].actions[act.id].splice(idx, 1);
                commitSave('Raccourci supprimé.');
              }
            );

            actRow.append(actLbl, controls);
            actionsList.appendChild(actRow);
          }

          row.appendChild(actionsList);
        }

        if (feat.options && feat.options.length > 0) {
          const optsList = document.createElement('div');
          optsList.className = 'options-list';

          for (const opt of feat.options) {
            const label = document.createElement('label');
            label.className = 'option-item';
            const currentVal = settings.features[feat.id].options[opt.id];

            if (opt.type === 'boolean') {
              const cb = document.createElement('input');
              cb.type = 'checkbox';
              cb.checked = Boolean(currentVal);
              cb.addEventListener('change', () => {
                settings.features[feat.id].options[opt.id] = cb.checked;
                commitSave('Option enregistrée.');
              });
              label.append(cb, document.createTextNode(opt.label));
            } else if (opt.type === 'number') {
              const num = document.createElement('input');
              num.type = 'number';
              num.className = 'option-number';
              num.min = String(opt.min ?? 0);
              num.max = String(opt.max ?? 9999);
              num.value = String(currentVal);
              num.addEventListener('change', () => {
                settings.features[feat.id].options[opt.id] = Number(num.value);
                commitSave('Option enregistrée.');
              });
              label.append(document.createTextNode(opt.label + ' : '), num);
            }

            optsList.appendChild(label);
          }

          row.appendChild(optsList);
        }

        table.appendChild(row);
      }

      section.appendChild(table);
      contentEl.appendChild(section);
    }
  }

  function renderContent() {
    if (!settings) return;
    globalToggle.checked = settings.enabled !== false;
    presetSelect.value = settings.preset || 'azerty';
    contentEl.innerHTML = '';

    if (activeTab === 'shared') {
      renderSharedTab();
    } else {
      renderSiteTab(activeTab);
    }
  }

  window.addEventListener('keydown', (e) => {
    if (!recordingTarget) return;
    e.preventDefault();
    e.stopPropagation();

    if (e.key === 'Escape') {
      stopRecording();
      return;
    }

    const binding = keybind.eventToBinding(e);
    if (!binding) return;

    const sig = keybind.bindingSignature(binding);
    const list = recordingTarget.kind === 'shared'
      ? settings.shared[recordingTarget.actionId]
      : settings.features[recordingTarget.featureId].actions[recordingTarget.actionId];

    if (!list.some((b) => keybind.bindingSignature(b) === sig)) {
      list.push(binding);
    }

    recordingTarget = null;
    commitSave('Raccourci ajouté : ' + keybind.formatBinding(binding));
  }, true);

  globalToggle.addEventListener('change', () => {
    settings.enabled = globalToggle.checked;
    commitSave(globalToggle.checked ? 'Extension activée.' : 'Extension mise en pause.');
  });

  applyPresetBtn.addEventListener('click', () => {
    const chosen = presetSelect.value;
    const fresh = storage.buildDefaults(chosen);
    fresh.enabled = settings.enabled;
    settings = fresh;
    commitSave('Préréglage appliqué : ' + (schema.presets[chosen]?.label || chosen));
  });

  exportBtn.addEventListener('click', () => {
    const json = storage.exportJson(settings);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'qcm-clavier-config.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showStatus('Configuration exportée.', false);
  });

  importBtn.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', () => {
    const file = importFile.files && importFile.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        settings = storage.importJson(String(reader.result || ''));
        commitSave('Configuration importée avec succès.');
      } catch (err) {
        showStatus(err.message || 'Échec de l\'import JSON.', true);
      }
      importFile.value = '';
    };
    reader.readAsText(file);
  });

  resetBtn.addEventListener('click', () => {
    storage.reset(presetSelect.value).then((fresh) => {
      settings = fresh;
      renderContent();
      showStatus('Raccourcis réinitialisés par défaut.', false);
    });
  });

  const initialHash = (location.hash || '').replace(/^#/, '');
  if (TABS.some((t) => t.id === initialHash)) {
    activeTab = initialHash;
  }

  storage.load().then((loaded) => {
    settings = loaded;
    renderTabs();
    renderContent();
  });
})();
