(function () {
  'use strict';
  const root = (globalThis.QCMK = globalThis.QCMK || {});
  const adapters = (root.adapters = root.adapters || {});

  function createUnessAdapter() {
    const dom = root.dom;
    const kb = root.keybind;

    function getAnki() {
      return root.anki || null;
    }

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

    function findQrocInput(qEl) {
      const scope = qEl || document;
      const fields = Array.from(scope.querySelectorAll('textarea, input[type="text"], input:not([type])'))
        .filter((el) => !el.disabled && !el.readOnly && dom.isVisible(el));
      return fields[0] || null;
    }

    function applyKeyHints(ctx) {
      if (!ctx.isEnabled('uness.keyHints')) {
        dom.clearKeyHints();
        return;
      }
      const activeQ = getActiveQuestion();
      const items = [];
      getChoiceTargets(activeQ).slice(0, 10).forEach((el, idx) => {
        const label = ctx.formatFirst(ctx.sharedBindings('choice.' + (idx + 1)));
        if (label) items.push({ el, label });
      });
      const submitInQ = activeQ.querySelector('input[type="submit"], button[type="submit"]')
        || dom.findButtonByText(activeQ, [/^verifier$/, /^valider$/, /^enregistrer$/]);
      if (submitInQ) {
        items.push({ el: submitInQ, label: ctx.formatFirst(ctx.bindings('uness.answer', 'validate')) });
      }
      dom.renderKeyHints(items);
    }

    // -------------------------------------------------------------------------
    // Détection et extraction DOM — entrainement-edn.uness.fr (corrections)
    // -------------------------------------------------------------------------

    function isTrainingCorrectionPage() {
      if (/page=correction/i.test(location.search || '')) return true;
      return Boolean(
        document.querySelector(
          '.container-correction-type-wrong, .container-correction-type-partially-correct, .answer-type-right, .answer-type-wrong'
        )
      );
    }

    function extractTrainingItemNumber() {
      const tipIcons = document.querySelectorAll('.plugin-body-header-container i[data-toggle="tooltip"], .plugin-body-header-container [data-original-title]');
      for (let i = 0; i < tipIcons.length; i++) {
        const raw = tipIcons[i].getAttribute('data-original-title') || tipIcons[i].getAttribute('title') || '';
        const m = raw.match(/N°\s*(\d{1,3})/i) || raw.match(/Item\s*[-:]?\s*(\d{1,3})/i);
        if (m) return m[1];
      }
      const fallbacks = document.querySelectorAll('.plugin-body-header-container, h1, h2, .breadcrumb');
      for (let i = 0; i < fallbacks.length; i++) {
        const txt = fallbacks[i].textContent || '';
        const m = txt.match(/(?:N°|Item|IC)\s*[-:]?\s*(\d{1,3})\b/i);
        if (m) return m[1];
      }
      return null;
    }

    function extractQuestionId(qEl) {
      const flagOrStats = qEl.querySelector('[data-question], [data-element]');
      const rawId = (flagOrStats && (flagOrStats.getAttribute('data-question') || flagOrStats.getAttribute('data-element')))
        || (qEl.id && qEl.id.replace(/^q/i, ''))
        || '';
      const clean = rawId.trim().replace(/[^a-zA-Z0-9_-]/g, '');
      return clean ? 'uness:q:' + clean : null;
    }

    function parseQuestionScoreHasError(qEl) {
      const scoreEl = qEl.querySelector('.info.text-right > span, .info > span');
      if (!scoreEl) return null;
      const m = (scoreEl.textContent || '').trim().match(/(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)/);
      if (!m) return null;
      const got = parseFloat(m[1].replace(',', '.'));
      const max = parseFloat(m[2].replace(',', '.'));
      if (!Number.isFinite(got) || !Number.isFinite(max) || max <= 0) return null;
      return got < max;
    }

    function inspectCorrectionQuestion(qEl, fallbackItem) {
      const anki = getAnki();
      if (!qEl || qEl.classList.contains('description') || qEl.querySelector('.container-correction-type-statement')) {
        return null;
      }

      const qid = extractQuestionId(qEl);
      const qNoEl = qEl.querySelector('.qno, h3, .info');
      const qLabel = qNoEl ? (qNoEl.textContent || '').trim().split('\n')[0].slice(0, 32) : '';

      const containerHasError = Boolean(
        qEl.querySelector(
          '.container-correction-type-wrong, .container-correction-type-partially-correct, .container-correction-type-abandoned'
        )
      );
      const scoreHasError = parseQuestionScoreHasError(qEl);

      const propRows = Array.from(qEl.querySelectorAll('.ablock > .answer > div, .answer > div'));
      const propErrors = [];
      const expectedTrueTexts = [];

      for (let i = 0; i < propRows.length; i++) {
        const row = propRows[i];
        const input = row.querySelector('input[type="checkbox"], input[type="radio"]');
        const isChecked = Boolean(input && (input.checked || input.hasAttribute('checked')));
        const isExpectedTrue =
          row.classList.contains('answer-type-right') ||
          Boolean(row.querySelector('.correction-type-correct, .correction-type-essential'));
        const isWrongChecked =
          row.classList.contains('answer-type-wrong') &&
          (row.classList.contains('active') || isChecked);
        const isMissedTrue = isExpectedTrue && !isChecked;
        const isEssential = Boolean(row.querySelector('.correction-type-essential'));

        const cleanRowText = (row.textContent || '').replace(/\s+/g, ' ').trim();
        if (isExpectedTrue && cleanRowText) {
          expectedTrueTexts.push(cleanRowText);
        }

        if (isWrongChecked || isMissedTrue) {
          propErrors.push({
            index: i + 1,
            letter: String.fromCharCode(65 + i),
            kind: isWrongChecked ? 'cochee a tort' : 'non cochee',
            essential: isEssential,
            text: cleanRowText,
          });
        }
      }

      // Tri : prioriser les PMZ / indispensables dans les mots-clés et le motif d'erreur
      propErrors.sort((a, b) => Number(b.essential) - Number(a.essential));

      const hasError = containerHasError || scoreHasError === true || propErrors.length > 0;
      const feedbackText = Array.from(qEl.querySelectorAll('.feedback .generalfeedback, .generalfeedback'))
        .map((n) => n.textContent || '')
        .join(' ');
      const stemEl = qEl.querySelector('.qtext') || qEl.querySelector('.formulation');
      const stemText = stemEl ? (stemEl.textContent || '') : '';

      const combinedAllText = [stemText, expectedTrueTexts.join(' '), feedbackText].join(' ');
      const allKeywords = anki ? anki.extractMedicalKeywords(combinedAllText, 5) : [];

      const errSourceText = propErrors.length > 0
        ? propErrors.map((pe) => pe.text).join(' ') + ' ' + feedbackText
        : combinedAllText;
      const errKeywords = anki ? anki.extractMedicalKeywords(errSourceText, 5) : [];

      const oicMatches = (combinedAllText.match(/\bOIC[-_]\d{1,3}[-_]\d{1,2}[-_][AB](?:[-_]\d{1,2})?\b/gi) || []);
      const sddMatches = (combinedAllText.match(/\bSDD[-_]\d{1,3}\b/gi) || []);

      let errNote = '';
      if (propErrors.length > 0) {
        const topErr = propErrors[0];
        const prefix = qLabel ? qLabel + ' ' : '';
        const pmzTag = topErr.essential ? ' (indispensable)' : '';
        errNote = (prefix + 'Prop ' + topErr.letter + ' ' + topErr.kind + pmzTag + ' : ' + topErr.text).slice(0, 220);
      } else if (hasError) {
        errNote = (qLabel ? qLabel + ' : ' : '') + 'Question echouee sur UNESS';
      }

      return {
        el: qEl,
        qid,
        item: fallbackItem,
        hasError,
        oics: oicMatches,
        sdds: sddMatches,
        allKeywords,
        errKeywords,
        errNote,
      };
    }

    function buildQuestionUri(info, errorsOnly) {
      const anki = getAnki();
      if (!anki || !info) return null;
      return anki.buildAnkiEdnUri({
        action: 'qcm',
        src: 'uness',
        qid: info.qid ? [info.qid] : [],
        oic: info.oics,
        sdd: info.sdds,
        item: info.item ? [info.item] : [],
        q: errorsOnly ? info.errKeywords : info.allKeywords,
        err: errorsOnly ? info.errNote : '',
      });
    }

    function buildSummaryUri(inspectedList, fallbackItem, errorsOnly) {
      const anki = getAnki();
      if (!anki) return null;
      const subset = errorsOnly ? inspectedList.filter((x) => x.hasError) : inspectedList;
      if (subset.length === 0) return null;

      const qids = [];
      const oics = [];
      const sdds = [];
      const kw = [];
      const errs = [];

      for (const itemInfo of subset) {
        if (itemInfo.qid && qids.indexOf(itemInfo.qid) === -1) qids.push(itemInfo.qid);
        for (const o of itemInfo.oics) if (oics.indexOf(o) === -1) oics.push(o);
        for (const s of itemInfo.sdds) if (sdds.indexOf(s) === -1) sdds.push(s);
        const kwList = errorsOnly ? itemInfo.errKeywords : itemInfo.allKeywords;
        for (const k of kwList) if (kw.indexOf(k) === -1 && kw.length < 6) kw.push(k);
        if (errorsOnly && itemInfo.errNote && errs.length < 2) errs.push(itemInfo.errNote);
      }

      return anki.buildAnkiEdnUri({
        action: 'qcm',
        src: 'uness',
        qid: qids,
        oic: oics,
        sdd: sdds,
        item: fallbackItem ? [fallbackItem] : [],
        q: kw,
        err: errs.join(' | '),
      });
    }

    function clearUnessTrainingAnkiUi() {
      const topBar = document.getElementById('qcmk-uness-anki-bar');
      if (topBar) topBar.remove();
      document.querySelectorAll('.qcmk-anki-q-bar').forEach((n) => n.remove());
      document.querySelectorAll('[data-qcmk-anki-bound]').forEach((n) => n.removeAttribute('data-qcmk-anki-bound'));
    }

    function renderTrainingCorrectionAnkiUi(ctx) {
      const anki = getAnki();
      if (!anki || !ctx.isEnabled('uness.anki') || ctx.option('uness.anki', 'showButtons') === false) {
        clearUnessTrainingAnkiUi();
        return;
      }

      const questions = getQuestions();
      if (questions.length === 0) return;

      const itemNum = extractTrainingItemNumber();
      const inspected = questions.map((q) => inspectCorrectionQuestion(q, itemNum)).filter(Boolean);
      if (inspected.length === 0) return;

      const errCount = inspected.filter((x) => x.hasError).length;
      const allUri = buildSummaryUri(inspected, itemNum, false);
      const errUri = buildSummaryUri(inspected, itemNum, true);

      // Barre globale en haut de la correction
      if (!document.getElementById('qcmk-uness-anki-bar')) {
        const bar = document.createElement('div');
        bar.id = 'qcmk-uness-anki-bar';
        bar.className = 'qcmk-anki-bar';

        const title = document.createElement('span');
        title.className = 'qcmk-anki-bar-title';
        title.textContent = itemNum ? 'Anki EDN — Item ' + itemNum.padStart(3, '0') : 'Anki EDN — Correction UNESS';

        const actions = document.createElement('div');
        actions.className = 'qcmk-anki-bar-actions';

        if (allUri) {
          actions.appendChild(
            anki.createAnkiButton({
              label: 'Anki : toutes les notions',
              title: 'Ouvrir les cartes Anki EDN correspondant a cette correction',
              uri: allUri,
            })
          );
        }

        actions.appendChild(
          anki.createAnkiButton({
            label: 'Anki : mes erreurs (' + errCount + ')',
            title: errCount > 0
              ? 'Ouvrir uniquement les cartes liees aux questions ou propositions echouees'
              : 'Aucune erreur detectee sur cette correction',
            primary: errCount > 0,
            disabled: errCount === 0 || !errUri,
            uri: errUri || '',
          })
        );

        bar.append(title, actions);
        const qDiv = document.getElementById('questionsDiv');
        const headerContainer = document.querySelector('.plugin-body-header-container');
        if (qDiv && qDiv.parentNode) {
          qDiv.parentNode.insertBefore(bar, qDiv);
        } else if (headerContainer) {
          headerContainer.appendChild(bar);
        } else if (document.body) {
          document.body.prepend(bar);
        }
      }

      // Boutons par question
      for (const info of inspected) {
        if (info.el.querySelector('.qcmk-anki-q-bar')) continue;
        const qAllUri = buildQuestionUri(info, false);
        const qErrUri = info.hasError ? buildQuestionUri(info, true) : null;
        if (!qAllUri && !qErrUri) continue;

        const qBar = document.createElement('div');
        qBar.className = 'qcmk-anki-q-bar';

        if (qAllUri) {
          qBar.appendChild(
            anki.createAnkiButton({
              label: 'Anki : cette question',
              compact: true,
              uri: qAllUri,
            })
          );
        }
        if (qErrUri) {
          qBar.appendChild(
            anki.createAnkiButton({
              label: 'Anki : mes erreurs',
              compact: true,
              primary: true,
              uri: qErrUri,
            })
          );
        }

        const target = info.el.querySelector('.content') || info.el;
        target.appendChild(qBar);
      }
    }

    // -------------------------------------------------------------------------
    // Détection et extraction DOM — livret.uness.fr/lisa/ (MediaWiki LiSA)
    // -------------------------------------------------------------------------

    function isLisaPage() {
      const host = (location.hostname || '').toLowerCase();
      const path = (location.pathname || '').toLowerCase();
      return host.indexOf('livret.uness.fr') !== -1 || path.indexOf('/lisa/') !== -1;
    }

    function extractLisaContext() {
      const anki = getAnki();
      if (!anki) return null;
      const path = decodeURIComponent(location.pathname || '');

      let singleOic = null;
      const oicPathMatch = path.match(/OIC[-_](\d{1,3})[-_](\d{1,2})[-_]([AB])/i);
      if (oicPathMatch) {
        singleOic = anki.normalizeOic(oicPathMatch[0]);
      }

      let singleSdd = null;
      const sddPathMatch = path.match(/(?:_|\b)SDD[-_](\d{1,3})\b/i);
      if (sddPathMatch) {
        singleSdd = anki.normalizeSdd(sddPathMatch[1]);
      }

      let itemNum = null;
      const catLinks = document.querySelectorAll('#mw-normal-catlinks a');
      for (let i = 0; i < catLinks.length; i++) {
        const m = (catLinks[i].textContent || '').match(/OIC[-_](\d{1,3})\b/i);
        if (m) {
          itemNum = anki.normalizeItem(m[1]);
          break;
        }
      }

      if (!itemNum) {
        const ths = document.querySelectorAll('table th');
        for (let i = 0; i < ths.length; i++) {
          if (/^\s*Item\s*$/i.test(ths[i].textContent || '')) {
            const td = ths[i].nextElementSibling;
            const m = td ? (td.textContent || '').match(/\b(\d{1,3})\b/) : null;
            if (m) {
              itemNum = anki.normalizeItem(m[1]);
              break;
            }
          }
        }
      }

      if (!itemNum && singleOic) {
        itemNum = anki.normalizeItem(singleOic.split('-')[0]);
      }

      const sdds = [];
      if (singleSdd) sdds.push(singleSdd);
      const sddLinks = document.querySelectorAll('a[href*="_SDD-"], a[href*="_SD-"]');
      for (let i = 0; i < sddLinks.length && sdds.length < 5; i++) {
        const href = decodeURIComponent(sddLinks[i].getAttribute('href') || '');
        const m = href.match(/(?:_|\b)(?:SDD|SD)[-_](\d{1,3})\b/i);
        const norm = m ? anki.normalizeSdd(m[1]) : null;
        if (norm && sdds.indexOf(norm) === -1) sdds.push(norm);
      }

      const headingEl = document.querySelector('h1#firstHeading, h1.firstHeading, h1');
      const headingText = headingEl ? (headingEl.textContent || '').trim() : '';

      return {
        itemNum,
        singleOic,
        singleSdd,
        sdds,
        headingText,
        headingEl,
      };
    }

    function clearLisaAnkiUi() {
      const bar = document.getElementById('qcmk-lisa-anki-bar');
      if (bar) bar.remove();
      document.querySelectorAll('.qcmk-lisa-oic-btn-wrap, .qcmk-anki-inline-link').forEach((n) => n.remove());
      document.querySelectorAll('[data-qcmk-lisa-bound]').forEach((n) => n.removeAttribute('data-qcmk-lisa-bound'));
    }

    function renderLisaAnkiUi(ctx) {
      const anki = getAnki();
      if (!anki || !ctx.isEnabled('uness.anki') || ctx.option('uness.anki', 'showButtons') === false) {
        clearLisaAnkiUi();
        return;
      }

      const lisa = extractLisaContext();
      if (!lisa) return;

      // 1. Barre d'en-tête sous h1#firstHeading
      if (lisa.headingEl && !document.getElementById('qcmk-lisa-anki-bar')) {
        const bar = document.createElement('div');
        bar.id = 'qcmk-lisa-anki-bar';
        bar.className = 'qcmk-anki-bar';

        const title = document.createElement('span');
        title.className = 'qcmk-anki-bar-title';
        title.textContent = lisa.itemNum ? 'Anki EDN — Fiche LiSA Item ' + lisa.itemNum : 'Anki EDN — Fiche LiSA';

        const actions = document.createElement('div');
        actions.className = 'qcmk-anki-bar-actions';

        if (lisa.singleOic) {
          const kw = anki.extractMedicalKeywords(lisa.headingText, 4);
          const uri = anki.buildAnkiEdnUri({
            action: 'lisa',
            src: 'lisa',
            oic: lisa.singleOic,
            item: lisa.itemNum,
            q: kw,
          });
          if (uri) {
            actions.appendChild(
              anki.createAnkiButton({
                label: 'Ouvrir dans Anki (OIC::' + lisa.singleOic + ')',
                primary: true,
                uri,
              })
            );
          }
        } else if (lisa.singleSdd) {
          const uri = anki.buildAnkiEdnUri({
            action: 'lisa',
            src: 'lisa',
            sdd: lisa.singleSdd,
            q: anki.extractMedicalKeywords(lisa.headingText, 4),
          });
          if (uri) {
            actions.appendChild(
              anki.createAnkiButton({
                label: 'Ouvrir dans Anki (SDD-' + lisa.singleSdd + ')',
                primary: true,
                uri,
              })
            );
          }
        } else if (lisa.itemNum) {
          const allUri = anki.buildAnkiEdnUri({ action: 'lisa', src: 'lisa', item: lisa.itemNum });
          const rangAUri = anki.buildAnkiEdnUri({ action: 'lisa', src: 'lisa', item: lisa.itemNum, rang: 'A' });
          const rangBUri = anki.buildAnkiEdnUri({ action: 'lisa', src: 'lisa', item: lisa.itemNum, rang: 'B' });
          if (allUri) actions.appendChild(anki.createAnkiButton({ label: "Tout l'item " + lisa.itemNum, primary: true, uri: allUri }));
          if (rangAUri) actions.appendChild(anki.createAnkiButton({ label: 'Rang A', uri: rangAUri }));
          if (rangBUri) actions.appendChild(anki.createAnkiButton({ label: 'Rang B', uri: rangBUri }));
          if (lisa.sdds.length > 0) {
            const sddUri = anki.buildAnkiEdnUri({ action: 'lisa', src: 'lisa', sdd: lisa.sdds, item: lisa.itemNum });
            if (sddUri) actions.appendChild(anki.createAnkiButton({ label: 'SDD liees (' + lisa.sdds.length + ')', uri: sddUri }));
          }
        }

        if (actions.children.length > 0) {
          bar.append(title, actions);
          lisa.headingEl.insertAdjacentElement('afterend', bar);
        }
      }

      // 2. Cartes OIC sur Fiche_LiSA:... (div.navbox.modele-oic > table.wikitable)
      const oicBoxes = document.querySelectorAll('div.navbox.modele-oic');
      for (let i = 0; i < oicBoxes.length; i++) {
        const box = oicBoxes[i];
        if (box.getAttribute('data-qcmk-lisa-bound') === '1') continue;
        const rows = box.querySelectorAll('table.wikitable tr');
        let rawOic = '';
        let oicTitle = '';
        let targetCell = null;

        for (let r = 0; r < rows.length; r++) {
          const th = rows[r].querySelector('th');
          const td = rows[r].querySelector('td');
          if (!th || !td) continue;
          const label = (th.textContent || '').trim().toLowerCase();
          if (label.indexOf('identifiant') !== -1) {
            rawOic = (td.textContent || '').trim();
            targetCell = td;
          } else if (label.indexOf('intitul') !== -1) {
            oicTitle = (td.textContent || '').trim();
          }
        }

        const normOic = anki.normalizeOic(rawOic);
        if (!normOic || !targetCell) continue;

        box.setAttribute('data-qcmk-lisa-bound', '1');
        const wrap = document.createElement('span');
        wrap.className = 'qcmk-lisa-oic-btn-wrap';
        wrap.style.marginLeft = '8px';

        const uri = anki.buildAnkiEdnUri({
          action: 'lisa',
          src: 'lisa',
          oic: normOic,
          item: lisa.itemNum,
          q: anki.extractMedicalKeywords(oicTitle, 4),
        });
        if (uri) {
          wrap.appendChild(
            anki.createAnkiButton({
              label: 'Ouvrir dans Anki',
              compact: true,
              uri,
            })
          );
          targetCell.appendChild(wrap);
        }
      }

      // 3. Liens OIC en ligne sur les pages d'item (.mw-parser-output a[href*="_OIC-"])
      const oicLinks = document.querySelectorAll('.mw-parser-output a[href*="_OIC-"]');
      for (let i = 0; i < oicLinks.length; i++) {
        const link = oicLinks[i];
        if (link.closest('div.navbox.modele-oic') || link.closest('#qcmk-lisa-anki-bar')) continue;
        if (link.getAttribute('data-qcmk-lisa-bound') === '1') continue;

        const href = decodeURIComponent(link.getAttribute('href') || '');
        const m = href.match(/OIC[-_](\d{1,3})[-_](\d{1,2})[-_]([AB])/i);
        const normOic = m ? anki.normalizeOic(m[0]) : null;
        if (!normOic) continue;

        link.setAttribute('data-qcmk-lisa-bound', '1');
        const uri = anki.buildAnkiEdnUri({
          action: 'lisa',
          src: 'lisa',
          oic: normOic,
          item: lisa.itemNum,
          q: anki.extractMedicalKeywords(link.textContent || '', 4),
        });
        if (!uri) continue;

        const inlineBtn = document.createElement('a');
        inlineBtn.href = uri;
        inlineBtn.className = 'qcmk-anki-inline-link';
        inlineBtn.textContent = 'Anki';
        inlineBtn.title = 'Ouvrir OIC::' + normOic + ' dans Anki EDN';
        inlineBtn.addEventListener('click', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          anki.launchAnkiUri(uri, 'OIC::' + normOic);
        });
        link.insertAdjacentElement('afterend', inlineBtn);
      }
    }

    function refreshAnkiUi(ctx) {
      if (isLisaPage()) {
        renderLisaAnkiUi(ctx);
      } else if (isTrainingCorrectionPage()) {
        renderTrainingCorrectionAnkiUi(ctx);
      }
      applyKeyHints(ctx);
    }

    function extractCleanElementText(el) {
      if (!el) return '';
      if (typeof el.innerText === 'string' && el.innerText.trim()) {
        return el.innerText;
      }
      const clone = el.cloneNode(true);
      const ignored = clone.querySelectorAll('script, style, noscript, svg');
      for (let i = 0; i < ignored.length; i++) ignored[i].remove();
      return clone.textContent || '';
    }

    function buildFallbackPageUri() {
      const anki = getAnki();
      if (!anki) return null;
      const activeQ = getActiveQuestion();
      const regionMain = document.querySelector('#region-main, main, [role="main"], article');
      const rawBodyText = (activeQ && activeQ !== document.body && extractCleanElementText(activeQ))
        || (regionMain && extractCleanElementText(regionMain))
        || extractCleanElementText(document.body)
        || '';
      const fallbackText = (rawBodyText + ' ' + (document.title || '')).trim();
      const itemNum = extractTrainingItemNumber();
      const oics = fallbackText.match(/\bOIC[-_]\d{1,3}[-_]\d{1,2}[-_][AB](?:[-_]\d{1,2})?\b/gi) || [];
      const sdds = fallbackText.match(/\bSDD[-_]\d{1,3}\b/gi) || [];
      const kw = anki.extractMedicalKeywords(fallbackText, 5);
      const qid = activeQ && activeQ !== document.body ? extractQuestionId(activeQ) : null;
      return anki.buildAnkiEdnUri({
        action: 'qcm',
        src: 'uness',
        qid: qid ? [qid] : [],
        oic: oics,
        sdd: sdds,
        item: itemNum ? [itemNum] : [],
        q: kw,
      });
    }

    function triggerShortcutOpen(errorsOnly) {
      const anki = getAnki();
      if (!anki) return false;

      if (isLisaPage()) {
        const lisa = extractLisaContext();
        if (lisa) {
          const uri = lisa.singleOic
            ? anki.buildAnkiEdnUri({
                action: 'lisa',
                src: 'lisa',
                oic: lisa.singleOic,
                item: lisa.itemNum,
                q: anki.extractMedicalKeywords(lisa.headingText, 4),
              })
            : lisa.singleSdd
            ? anki.buildAnkiEdnUri({ action: 'lisa', src: 'lisa', sdd: lisa.singleSdd })
            : lisa.itemNum
            ? anki.buildAnkiEdnUri({ action: 'lisa', src: 'lisa', item: lisa.itemNum })
            : anki.buildAnkiEdnUri({
                action: 'lisa',
                src: 'lisa',
                q: anki.extractMedicalKeywords(lisa.headingText || document.title || '', 5),
              });
          if (uri) return anki.launchAnkiUri(uri, 'Ouverture fiche LiSA dans Anki...');
        }
      }

      if (isTrainingCorrectionPage()) {
        const itemNum = extractTrainingItemNumber();
        const activeQ = getActiveQuestion();
        const activeInfo = activeQ && activeQ !== document.body ? inspectCorrectionQuestion(activeQ, itemNum) : null;

        if (!errorsOnly) {
          const uri = activeInfo
            ? buildQuestionUri(activeInfo, false)
            : buildSummaryUri(getQuestions().map((q) => inspectCorrectionQuestion(q, itemNum)).filter(Boolean), itemNum, false);
          if (uri) return anki.launchAnkiUri(uri, 'Ouverture de la question dans Anki...');
        } else {
          if (activeInfo && activeInfo.hasError) {
            const errUri = buildQuestionUri(activeInfo, true);
            if (errUri) return anki.launchAnkiUri(errUri, 'Ouverture des erreurs de la question...');
          }

          const allInspected = getQuestions().map((q) => inspectCorrectionQuestion(q, itemNum)).filter(Boolean);
          const allErrUri = buildSummaryUri(allInspected, itemNum, true);
          if (allErrUri) return anki.launchAnkiUri(allErrUri, 'Ouverture des erreurs dans Anki...');
          dom.showToast('Aucune erreur detectee sur cette correction.');
          return true;
        }
      }

      if (errorsOnly) {
        dom.showToast('Aucune erreur de correction détectée sur cette page UNESS.');
        return false;
      }

      const fbUri = buildFallbackPageUri();
      if (fbUri) return anki.launchAnkiUri(fbUri, 'Ouverture dans Anki EDN...');

      return false;
    }

    return {
      init(ctx) {
        refreshAnkiUi(ctx);
      },

      onDomMutate(ctx) {
        refreshAnkiUi(ctx);
      },

      onKeyDown(e, ctx) {
        const activeQ = getActiveQuestion();
        const typing = kb.isTypingTarget(e.target);

        if (!typing && ctx.isEnabled('uness.qroc') && kb.isPrintableKey(e)) {
          const choices = getChoiceTargets(activeQ);
          if (choices.length === 0) {
            const qroc = findQrocInput(activeQ);
            if (qroc) {
              qroc.focus();
              return false;
            }
          }
        }

        if (typing) return false;

        if (ctx.isEnabled('uness.anki')) {
          if (ctx.matches(e, 'uness.anki', 'openActive')) {
            if (triggerShortcutOpen(false)) return true;
          }
          if (ctx.matches(e, 'uness.anki', 'openErrors')) {
            if (triggerShortcutOpen(true)) return true;
          }
        }

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

        if (ctx.isEnabled('uness.nav')) {
          const list = getQuestions();
          const cur = list.indexOf(activeQ);
          if (ctx.matches(e, 'uness.nav', 'prev')) {
            if (cur > 0) {
              list[cur - 1].scrollIntoView({ behavior: 'smooth', block: 'start' });
              return true;
            }
            const prevPage = dom.findButtonByText(document, [/page precedente/, /^precedent/]);
            if (prevPage) { dom.safeClick(prevPage); return true; }
          }
          if (ctx.matches(e, 'uness.nav', 'next')) {
            if (cur !== -1 && cur + 1 < list.length) {
              list[cur + 1].scrollIntoView({ behavior: 'smooth', block: 'start' });
              return true;
            }
            const nextPage = dom.findButtonByText(document, [/page suivante/, /suivant/]);
            if (nextPage) { dom.safeClick(nextPage); return true; }
          }
        }

        if (ctx.isEnabled('uness.favorite') && ctx.matches(e, 'uness.favorite', 'toggle')) {
          const favBtn = activeQ.querySelector('#action_update_favorite, [id*="favorite"], [aria-label*="favori" i], [title*="favori" i]');
          if (favBtn && dom.safeClick(favBtn)) {
            dom.showToast('Favori mis à jour');
            return true;
          }
        }

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

      destroy() {
        clearUnessTrainingAnkiUi();
        clearLisaAnkiUi();
        dom.clearKeyHints();
      },

      onContextMenuAnki(msg) {
        const anki = getAnki();
        if (!anki) return { ok: false, uri: '' };
        if (msg && msg.mode === 'errors') {
          const ok = triggerShortcutOpen(true);
          return ok
            ? { ok: true, uri: '' }
            : { ok: false, uri: '', message: 'Aucune erreur de correction détectée sur cette page UNESS.' };
        }
        const sel = msg && msg.selectionText ? String(msg.selectionText).trim() : '';
        if (sel) {
          const oics = sel.match(/\bOIC[-_]\d{1,3}[-_]\d{1,2}[-_][AB](?:[-_]\d{1,2})?\b/gi) || [];
          const sdds = sel.match(/\bSDD[-_]\d{1,3}\b/gi) || [];
          const fallbackItem = isTrainingCorrectionPage()
            ? extractTrainingItemNumber()
            : (isLisaPage() ? (extractLisaContext() || {}).itemNum : null);
          const selItems = [];
          const itemRe = /(?:Item|IC|N°)\s*[-:]?\s*(\d{1,3})\b/gi;
          let m;
          while ((m = itemRe.exec(sel)) !== null && selItems.length < 3) {
            if (selItems.indexOf(m[1]) === -1) selItems.push(m[1]);
          }
          const kw = anki.extractMedicalKeywords(sel, 5);
          const uri = anki.buildAnkiEdnUri({
            action: isLisaPage() ? 'lisa' : 'qcm',
            src: isLisaPage() ? 'lisa' : 'uness',
            oic: oics,
            sdd: sdds,
            item: selItems.length > 0 ? selItems : (fallbackItem ? [fallbackItem] : []),
            q: kw,
          });
          if (uri) {
            anki.launchAnkiUri(uri, 'Ouverture dans Anki EDN...');
            return { ok: true, uri };
          }
        }
        if (triggerShortcutOpen(false)) return { ok: true, uri: 'shortcut' };
        dom.showToast('Aucune notion détectée sur cette page UNESS.');
        return { ok: false, uri: '' };
      },

      // Exposés pour les tests unitaires
      _testHooks: {
        isTrainingCorrectionPage,
        extractTrainingItemNumber,
        inspectCorrectionQuestion,
        buildQuestionUri,
        buildSummaryUri,
        isLisaPage,
        extractLisaContext,
        renderLisaAnkiUi,
        refreshAnkiUi,
      },
    };
  }

  adapters.uness = createUnessAdapter();
})();
