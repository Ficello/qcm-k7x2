(function () {
  'use strict';
  const { schema, storage } = globalThis.QCMK;
  const extApi = typeof browser !== 'undefined' ? browser : (typeof chrome !== 'undefined' ? chrome : null);

  const globalToggle = document.getElementById('global-enabled');
  const siteStatus = document.getElementById('site-status');
  const ankiActions = document.getElementById('anki-actions');
  const ankiFeedback = document.getElementById('anki-feedback');
  const featureList = document.getElementById('feature-list');
  const openOptionsBtn = document.getElementById('open-options');

  let currentSettings = null;
  let activeSite = null;
  let activeTabId = null;

  function detectSiteFromUrl(url) {
    if (!url) return null;
    try {
      const host = new URL(url).hostname.toLowerCase();
      for (const site of schema.sites) {
        if (site.hidden) continue;
        if (site.hosts.some((h) => host === h || host.endsWith('.' + h))) {
          return site;
        }
      }
    } catch (_) {}
    return null;
  }

  function sendAnkiTrigger(mode) {
    if (!extApi || !extApi.tabs || typeof activeTabId !== 'number') return;
    ankiFeedback.hidden = true;
    ankiFeedback.textContent = '';
    const payload = { type: 'qcmk-open-anki', mode: mode || 'active', selectionText: '' };
    const showPermissionErr = () => {
      ankiFeedback.textContent = 'Extension non active sur cet onglet : autorisez l’accès au site dans about:addons > QCM Clavier > Permissions puis rechargez la page.';
      ankiFeedback.hidden = false;
    };
    const handleResponse = (resp) => {
      if (!resp || resp.ok !== true) {
        ankiFeedback.textContent = (resp && resp.message) || 'Aucune notion QCM détectée sur cette page.';
        ankiFeedback.hidden = false;
        return;
      }
      setTimeout(() => window.close(), 120);
    };
    try {
      const isFx = typeof browser !== 'undefined' && Boolean(browser && browser.tabs);
      if (isFx) {
        browser.tabs.sendMessage(activeTabId, payload).then(handleResponse, showPermissionErr);
      } else {
        extApi.tabs.sendMessage(activeTabId, payload, (resp) => {
          if (extApi.runtime && extApi.runtime.lastError) {
            showPermissionErr();
            return;
          }
          handleResponse(resp);
        });
      }
    } catch (_) {
      showPermissionErr();
    }
  }

  function renderAnkiActions() {
    ankiActions.innerHTML = '';
    ankiFeedback.hidden = true;
    if (!activeSite || typeof activeTabId !== 'number') {
      ankiActions.hidden = true;
      return;
    }

    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.className = 'btn btn-primary btn-sm';
    openBtn.textContent = 'Ouvrir dans Anki EDN';
    openBtn.addEventListener('click', () => sendAnkiTrigger('active'));
    ankiActions.appendChild(openBtn);

    if (activeSite.id === 'uness') {
      const errBtn = document.createElement('button');
      errBtn.type = 'button';
      errBtn.className = 'btn btn-sm';
      errBtn.textContent = 'Anki : mes erreurs';
      errBtn.addEventListener('click', () => sendAnkiTrigger('errors'));
      ankiActions.appendChild(errBtn);
    }

    ankiActions.hidden = false;
  }

  function render() {
    if (!currentSettings) return;
    globalToggle.checked = currentSettings.enabled !== false;
    renderAnkiActions();

    if (!activeSite) {
      siteStatus.textContent = 'Onglet actuel hors plateforme QCM prise en charge (EDN.fr, Hypocampus, UNESS, Asclepia).';
      featureList.innerHTML = '<div class="popup-empty">Ouvrez la configuration complète pour personnaliser vos touches et vos options par plateforme.</div>';
      return;
    }

    siteStatus.innerHTML = '';
    const prefix = document.createTextNode('Plateforme détectée : ');
    const strong = document.createElement('strong');
    strong.textContent = activeSite.name;
    siteStatus.append(prefix, strong);

    const siteFeatures = schema.features.filter((f) => f.site === activeSite.id && !f.hidden);
    const listWrap = document.createElement('div');
    listWrap.className = 'popup-list';

    for (const feat of siteFeatures) {
      const row = document.createElement('div');
      row.className = 'popup-row';

      const info = document.createElement('div');
      const title = document.createElement('div');
      title.className = 'popup-row-title';
      title.textContent = feat.name;
      const sub = document.createElement('div');
      sub.className = 'popup-row-sub';
      sub.textContent = feat.group;
      info.append(title, sub);

      const label = document.createElement('label');
      label.className = 'switch';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = currentSettings.features[feat.id]?.enabled !== false;
      input.addEventListener('change', () => {
        currentSettings.features[feat.id].enabled = input.checked;
        storage.save(currentSettings).then((saved) => {
          currentSettings = saved;
        });
      });
      const track = document.createElement('span');
      track.className = 'switch-track';
      label.append(input, track);

      row.append(info, label);
      listWrap.appendChild(row);
    }

    featureList.innerHTML = '';
    featureList.appendChild(listWrap);
  }

  globalToggle.addEventListener('change', () => {
    if (!currentSettings) return;
    currentSettings.enabled = globalToggle.checked;
    storage.save(currentSettings).then((saved) => {
      currentSettings = saved;
    });
  });

  openOptionsBtn.addEventListener('click', () => {
    if (!extApi || !extApi.runtime) return;
    const hash = activeSite ? '#' + activeSite.id : '';
    const url = extApi.runtime.getURL('ui/options.html' + hash);
    if (extApi.tabs && extApi.tabs.create) {
      const res = extApi.tabs.create({ url });
      if (res && typeof res.then === 'function') {
        res.then(() => window.close(), () => extApi.runtime.openOptionsPage && extApi.runtime.openOptionsPage());
      } else {
        window.close();
      }
    } else if (extApi.runtime.openOptionsPage) {
      extApi.runtime.openOptionsPage();
      window.close();
    }
  });

  function queryActiveTab() {
    if (!extApi || !extApi.tabs || !extApi.tabs.query) {
      return Promise.resolve({ id: null, url: '' });
    }
    return new Promise((resolve) => {
      let settled = false;
      const done = (tabs) => {
        if (settled) return;
        settled = true;
        const tab = tabs && tabs[0] ? tabs[0] : null;
        resolve({ id: tab && typeof tab.id === 'number' ? tab.id : null, url: tab && tab.url ? tab.url : '' });
      };
      try {
        const maybePromise = extApi.tabs.query({ active: true, currentWindow: true }, done);
        if (maybePromise && typeof maybePromise.then === 'function') {
          maybePromise.then(done, () => done([]));
        }
      } catch (_) {
        done([]);
      }
    });
  }

  Promise.all([storage.load(), queryActiveTab()]).then(([settings, tabInfo]) => {
    currentSettings = settings;
    activeTabId = tabInfo.id;
    activeSite = detectSiteFromUrl(tabInfo.url);
    render();
  });
})();
