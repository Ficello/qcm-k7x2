(function () {
  'use strict';
  const root = (globalThis.QCMK = globalThis.QCMK || {});
  const adapters = (root.adapters = root.adapters || {});

  function createHypocampusAdapter() {
    const dom = root.dom;
    const kb = root.keybind;
    const flagStore = new dom.FlagStore('hypocampus');

    function getAnki() {
      return root.anki || null;
    }

    function getSessionKey() {
      const m = (location.search || '').match(/sessionId=([^&]+)/i);
      if (m) return 'session_' + m[1].slice(0, 32);
      return (location.pathname || '/').replace(/\/+$/, '') || 'default';
    }

    function getQuestions() {
      const cur = document.getElementById('currentQuestion');
      if (cur && dom.isVisible(cur)) return [cur];
      const list = Array.from(document.querySelectorAll('[data-question-id], .question-wrapper, .cortexio-question')).filter((el) => dom.isVisible(el));
      return list.length > 0 ? list : [document.body];
    }

    function getActiveQuestion() {
      const list = getQuestions();
      if (list.length === 1) return list[0];
      return dom.findActiveContainer(list, 'top') || list[0];
    }

    function getCurrentQuestionKey(qEl, idx) {
      const posM = (location.search || '').match(/pos=(\d+)/i);
      if (posM) return 'pos_' + posM[1];
      return qEl.getAttribute('data-question-id') || qEl.id || String(idx + 1);
    }

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

    function applyInlineScores(ctx) {
      document.querySelectorAll('.qcmk-hypo-score').forEach((n) => n.classList.remove('qcmk-hypo-score', 'qcmk-score-good', 'qcmk-score-mid', 'qcmk-score-low'));
      if (!ctx.isEnabled('hypo.inlineScores')) {
        dom.injectStyle('qcmk-hypo-scores-css', '');
        return;
      }
      dom.injectStyle(
        'qcmk-hypo-scores-css',
        '.qcmk-score-good{color:#15803d!important;font-weight:600!important;}.qcmk-score-mid{color:#b45309!important;font-weight:600!important;}.qcmk-score-low{color:#b91c1c!important;font-weight:600!important;}'
      );
      const candidates = document.querySelectorAll('div.bg-badge-midnight-light, span, div');
      for (let i = 0; i < candidates.length; i++) {
        const el = candidates[i];
        if (el.children.length > 0 || !dom.isVisible(el)) continue;
        const m = (el.textContent || '').trim().match(/^(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)\s*points?$/i);
        if (!m) continue;
        const got = parseFloat(m[1].replace(',', '.'));
        const max = parseFloat(m[2].replace(',', '.'));
        if (!max) continue;
        const ratio = got / max;
        const cls = ratio >= 0.8 ? 'qcmk-score-good' : ratio >= 0.5 ? 'qcmk-score-mid' : 'qcmk-score-low';
        el.classList.add('qcmk-hypo-score', cls);
      }
    }

    function renderFlags(ctx) {
      document.querySelectorAll('.qcmk-hypo-flag').forEach((n) => n.remove());
      if (!ctx.isEnabled('hypo.flags')) return;
      const flags = flagStore.getFlags(getSessionKey());
      const questions = getQuestions();
      questions.forEach((q, idx) => {
        const qKey = getCurrentQuestionKey(q, idx);
        if (!flags.has(qKey)) return;
        const badge = document.createElement('span');
        badge.className = 'qcmk-hypo-flag';
        badge.textContent = 'Drapeau';
        Object.assign(badge.style, {
          display: 'inline-block',
          marginLeft: '8px',
          padding: '2px 7px',
          borderRadius: '4px',
          background: '#fef2f2',
          border: '1px solid #fca5a5',
          color: '#b91c1c',
          fontSize: '11px',
          fontWeight: '600',
        });
        const target = q.querySelector('h1, h2, h3, p.cortexio-question-text, header') || q;
        target.appendChild(badge);
      });
    }

    function applyKeyHints(ctx) {
      if (!ctx.isEnabled('hypo.keyHints')) {
        dom.clearKeyHints();
        return;
      }
      const items = [];
      const choices = getChoiceTargets();
      choices.slice(0, 10).forEach((el, idx) => {
        const label = ctx.formatFirst(ctx.sharedBindings('choice.' + (idx + 1)));
        if (label) items.push({ el, label });
      });
      const valBtn = dom.findButtonByText(document, [/^verifier$/, /^valider$/, /^continuer$/, /question suivante/]);
      if (valBtn) {
        items.push({ el: valBtn, label: ctx.formatFirst(ctx.bindings('hypo.answer', 'validate')) });
      }
      dom.renderKeyHints(items);
    }

    // -------------------------------------------------------------------------
    // Connecteur Anki EDN sur Hypocampus (Cours & Corrections)
    // -------------------------------------------------------------------------

    function extractHypoItemNumber() {
      const selectors = [
        '.hypo-box-blue.simplebox .chapter-name',
        'h1.tw-chapter-headline',
        'ol.flex.items-center',
        'a.hypo-anchor-link',
        'h1, h2',
      ];
      for (const sel of selectors) {
        const nodes = document.querySelectorAll(sel);
        for (let i = 0; i < nodes.length; i++) {
          const m = (nodes[i].textContent || '').match(/\bItem\s*[-:n°]*\s*(\d{1,3})\b/i);
          if (m) return m[1];
        }
      }
      return null;
    }

    function extractHypoRank(scope) {
      const rootEl = scope || document;
      const badge = rootEl.querySelector('div.bg-badge-blue-light, [class*="bg-badge-blue"]');
      const txt = badge ? (badge.textContent || '') : '';
      const m = txt.match(/\bRang\s*([AB])\b/i);
      return m ? m[1].toUpperCase() : undefined;
    }

    function inspectHypoCorrection(qEl) {
      const anki = getAnki();
      if (!qEl) return null;

      const lessonM = (location.pathname || '').match(/\/lessons\/(\d+)/i);
      const posM = (location.search || '').match(/pos=(\d+)/i);
      const qid = lessonM ? 'hypo:q:' + lessonM[1] + (posM ? '_' + posM[1] : '') : null;
      const item = extractHypoItemNumber();
      const rang = extractHypoRank(qEl);

      let scoreHasError = false;
      const scoreEl = qEl.querySelector('div.bg-badge-midnight-light, [class*="bg-badge-midnight"]');
      if (scoreEl) {
        const m = (scoreEl.textContent || '').match(/(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)/);
        if (m) {
          const got = parseFloat(m[1].replace(',', '.'));
          const max = parseFloat(m[2].replace(',', '.'));
          if (Number.isFinite(got) && Number.isFinite(max) && max > 0 && got < max) {
            scoreHasError = true;
          }
        }
      }

      const propErrors = [];
      const expectedTrueTexts = [];
      const rows = Array.from(qEl.querySelectorAll('div.flex')).filter(
        (r) => r.querySelector('svg[data-icon="circle-check"], svg[data-icon="circle-xmark"], .border-correct, .border-incorrect')
      );

      rows.forEach((row, idx) => {
        const isCommission = Boolean(row.querySelector('svg[data-icon="circle-xmark"], .border-incorrect, .bg-incorrect'));
        const hasCheck = Boolean(row.querySelector('svg[data-icon="circle-check"]'));
        const isCheckedCorrect = Boolean(row.querySelector('.bg-correct'));
        const isOmission = hasCheck && !isCheckedCorrect;
        const txt = (row.textContent || '').replace(/\s+/g, ' ').trim();
        if (hasCheck && txt) expectedTrueTexts.push(txt);
        if (isCommission || isOmission) {
          propErrors.push({ letter: String.fromCharCode(65 + idx), kind: isCommission ? 'cochee a tort' : 'non cochee', text: txt });
        }
      });

      const hasError = scoreHasError || propErrors.length > 0;
      const stemEl = qEl.querySelector('p.cortexio-question-text, .cortexio-question-text');
      const corrEl = qEl.querySelector('.cortexio-question-answer, .v-html-content');
      const allText = [stemEl ? stemEl.textContent : '', expectedTrueTexts.join(' '), corrEl ? corrEl.textContent : ''].join(' ');
      const allKeywords = anki ? anki.extractMedicalKeywords(allText, 5) : [];

      const errText = propErrors.length > 0
        ? propErrors.map((e) => e.text).join(' ') + ' ' + (corrEl ? corrEl.textContent : '')
        : allText;
      const errKeywords = anki ? anki.extractMedicalKeywords(errText, 5) : [];

      let errNote = '';
      if (propErrors.length > 0) {
        const top = propErrors[0];
        errNote = ('Prop ' + top.letter + ' ' + top.kind + ' : ' + top.text).slice(0, 220);
      } else if (hasError) {
        errNote = 'Question echouee sur Hypocampus';
      }

      return { qid, item, rang, hasError, allKeywords, errKeywords, errNote };
    }

    function getCleanTextExcludingScripts(el) {
      if (!el) return '';
      const clone = el.cloneNode(true);
      clone.querySelectorAll('script, style, noscript').forEach((n) => n.remove());
      return (clone.textContent || '').replace(/\s+/g, ' ').trim();
    }

    function extractHypocampusContext() {
      const anki = getAnki();
      const qEl = document.getElementById('currentQuestion')
        || document.querySelector('[data-question-id], .question-wrapper, .cortexio-question')
        || document.querySelector('main')
        || document.body;

      const text = getCleanTextExcludingScripts(qEl);
      const qidAttr = qEl && (qEl.getAttribute('data-question-id') || (qEl.id && qEl.id !== 'currentQuestion' ? qEl.id : ''));
      const lessonM = (location.pathname || '').match(/\/lessons\/(\d+)/i);
      const posM = (location.search || '').match(/pos=(\d+)/i);
      const qid = qidAttr
        ? 'hypo:q:' + qidAttr.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24).toLowerCase()
        : (lessonM ? 'hypo:q:' + lessonM[1] + (posM ? '_' + posM[1] : '') : null);

      const items = [];
      const itemFromPage = extractHypoItemNumber();
      if (itemFromPage) items.push(itemFromPage);
      const itemMatches = text.match(/\bItem\s*[-:n°]*\s*(\d{1,3})\b/gi) || [];
      itemMatches.forEach((mStr) => {
        const m = mStr.match(/(\d{1,3})/);
        if (m && anki) {
          const norm = anki.normalizeItem(m[1]);
          if (norm && items.indexOf(norm) === -1) items.push(norm);
        }
      });

      const oics = [];
      const oicMatches = text.match(/\bOIC[-_]\d{1,3}[-_]\d{1,2}[-_][AB](?:[-_]\d{1,2})?\b/gi) || [];
      oicMatches.forEach((o) => {
        const norm = anki ? anki.normalizeOic(o) : null;
        if (norm && oics.indexOf(norm) === -1) oics.push(norm);
      });

      let rang = extractHypoRank(qEl);
      if (!rang) {
        const rM = text.match(/\bRang\s*([AB])\b/i);
        if (rM) rang = rM[1].toUpperCase();
      }

      const corrInfo = qEl ? inspectHypoCorrection(qEl) : null;
      const keywords = anki ? anki.extractMedicalKeywords(text, 5) : [];
      const errKeywords = corrInfo && corrInfo.errKeywords.length > 0 ? corrInfo.errKeywords : keywords;
      const errNote = corrInfo ? corrInfo.errNote : '';
      const hasError = Boolean(corrInfo && corrInfo.hasError);
      const hasContext = Boolean(qid || items.length > 0 || oics.length > 0 || keywords.length > 0);

      return {
        el: qEl,
        hasContext,
        qid,
        items,
        oics,
        rang,
        keywords,
        errKeywords,
        errNote,
        hasError,
      };
    }

    function clearHypoAnkiUi() {
      const bar = document.getElementById('qcmk-hypo-anki-bar');
      if (bar) bar.remove();
      const cBar = document.getElementById('qcmk-hypo-cours-anki');
      if (cBar) cBar.remove();
      document.querySelectorAll('.qcmk-hypo-sec-anki').forEach((n) => n.remove());
    }

    function applyHypoAnkiConnector(ctx) {
      const anki = getAnki();
      if (!anki || !ctx.isEnabled('hypo.anki') || ctx.option('hypo.anki', 'showButtons') === false) {
        clearHypoAnkiUi();
        return;
      }

      const curQ = document.getElementById('currentQuestion') || document.querySelector('.question-wrapper[data-question-id]');
      const infoCtx = extractHypocampusContext();
      const isCorrection = Boolean(
        curQ && (
          curQ.querySelector('.cortexio-question-answer, svg[data-icon="circle-check"], svg[data-icon="circle-xmark"], .border-correct, .border-incorrect')
          || curQ.classList.contains('question-wrapper')
        )
      );

      if (isCorrection && infoCtx.hasContext) {
        const oldBar = document.getElementById('qcmk-hypo-anki-bar');
        const sig = (infoCtx.qid || '') + '|' + (infoCtx.items.join(',')) + '|' + String(infoCtx.hasError);
        if (oldBar && oldBar.dataset.qcmkSig === sig) return;
        if (oldBar) oldBar.remove();

        const bar = document.createElement('div');
        bar.id = 'qcmk-hypo-anki-bar';
        bar.className = 'qcmk-anki-bar';
        bar.dataset.qcmkSig = sig;

        const title = document.createElement('span');
        title.className = 'qcmk-anki-bar-title';
        title.textContent = infoCtx.items.length > 0
          ? 'Anki EDN — Item ' + infoCtx.items[0].padStart(3, '0')
          : 'Anki EDN — Hypocampus';

        const actions = document.createElement('div');
        actions.className = 'qcmk-anki-bar-actions';

        const allUri = anki.buildAnkiEdnUri({
          action: 'qcm',
          src: 'hypocampus',
          qid: infoCtx.qid ? [infoCtx.qid] : [],
          oic: infoCtx.oics,
          item: infoCtx.items,
          rang: infoCtx.rang,
          q: infoCtx.keywords,
        });
        if (allUri) actions.appendChild(anki.createAnkiButton({ label: 'Anki : cette question', uri: allUri }));

        if (infoCtx.hasError) {
          const errUri = anki.buildAnkiEdnUri({
            action: 'qcm',
            src: 'hypocampus',
            qid: infoCtx.qid ? [infoCtx.qid] : [],
            oic: infoCtx.oics,
            item: infoCtx.items,
            rang: infoCtx.rang,
            q: infoCtx.errKeywords,
            err: infoCtx.errNote,
          });
          if (errUri) actions.appendChild(anki.createAnkiButton({ label: 'Anki : mes erreurs', primary: true, uri: errUri }));
        }

        if (actions.children.length > 0) {
          bar.append(title, actions);
          curQ.appendChild(bar);
        }
        return;
      }

      // Mode Cours / Fiche (/read/ ou .hypo-box-blue.simplebox)
      const headline = document.querySelector('h1.tw-chapter-headline, h1');
      const itemNum = extractHypoItemNumber();
      if (headline && itemNum && !document.getElementById('qcmk-hypo-cours-anki')) {
        const bar = document.createElement('div');
        bar.id = 'qcmk-hypo-cours-anki';
        bar.className = 'qcmk-anki-bar';

        const title = document.createElement('span');
        title.className = 'qcmk-anki-bar-title';
        title.textContent = 'Anki EDN — Item ' + itemNum.padStart(3, '0');

        const actions = document.createElement('div');
        actions.className = 'qcmk-anki-bar-actions';
        const allUri = anki.buildAnkiEdnUri({ action: 'lisa', src: 'hypocampus', item: itemNum });
        const rAUri = anki.buildAnkiEdnUri({ action: 'lisa', src: 'hypocampus', item: itemNum, rang: 'A' });
        const rBUri = anki.buildAnkiEdnUri({ action: 'lisa', src: 'hypocampus', item: itemNum, rang: 'B' });
        if (allUri) actions.appendChild(anki.createAnkiButton({ label: "Tout l'item " + itemNum, primary: true, uri: allUri }));
        if (rAUri) actions.appendChild(anki.createAnkiButton({ label: 'Rang A', uri: rAUri }));
        if (rBUri) actions.appendChild(anki.createAnkiButton({ label: 'Rang B', uri: rBUri }));
        bar.append(title, actions);
        headline.insertAdjacentElement('afterend', bar);
      }

      const secHeads = document.querySelectorAll('section.js-section h2.js-bookstyle-section-headline-container-h2');
      secHeads.forEach((h2) => {
        if (h2.querySelector('.qcmk-hypo-sec-anki')) return;
        const secText = (h2.textContent || '').trim();
        const uri = anki.buildAnkiEdnUri({
          action: 'lisa',
          src: 'hypocampus',
          item: itemNum,
          q: anki.extractMedicalKeywords(secText, 4),
        });
        if (!uri) return;
        const btn = anki.createAnkiButton({ label: 'Anki', compact: true, uri });
        btn.classList.add('qcmk-hypo-sec-anki');
        btn.style.marginLeft = '8px';
        h2.appendChild(btn);
      });
    }

    function refresh(ctx) {
      autofocusQroc(ctx);
      exposeDropdowns(ctx);
      applyInlineScores(ctx);
      renderFlags(ctx);
      applyHypoAnkiConnector(ctx);
      applyKeyHints(ctx);
    }

    return {
      init(ctx) {
        refresh(ctx);
      },

      onDomMutate(ctx) {
        refresh(ctx);
      },

      onKeyDown(e, ctx) {
        if (kb.isTypingTarget(e.target)) return false;

        if (ctx.isEnabled('hypo.anki')) {
          const anki = getAnki();
          const curQ = document.getElementById('currentQuestion');
          if (ctx.matches(e, 'hypo.anki', 'openActive') && anki) {
            if (curQ) {
              const info = inspectHypoCorrection(curQ);
              if (info) {
                const u = anki.buildAnkiEdnUri({
                  action: 'qcm',
                  src: 'hypocampus',
                  qid: info.qid ? [info.qid] : [],
                  item: info.item ? [info.item] : [],
                  rang: info.rang,
                  q: info.allKeywords,
                });
                if (u) return anki.launchAnkiUri(u, 'Ouverture dans Anki...');
              }
            } else {
              const item = extractHypoItemNumber();
              if (item) {
                const u = anki.buildAnkiEdnUri({ action: 'lisa', src: 'hypocampus', item });
                if (u) return anki.launchAnkiUri(u, 'Ouverture Item ' + item + ' dans Anki...');
              }
            }
          }
          if (ctx.matches(e, 'hypo.anki', 'openErrors') && anki && curQ) {
            const info = inspectHypoCorrection(curQ);
            if (info && info.hasError) {
              const u = anki.buildAnkiEdnUri({
                action: 'qcm',
                src: 'hypocampus',
                qid: info.qid ? [info.qid] : [],
                item: info.item ? [info.item] : [],
                rang: info.rang,
                q: info.errKeywords,
                err: info.errNote,
              });
              if (u) return anki.launchAnkiUri(u, 'Ouverture des erreurs dans Anki...');
            }
            dom.showToast('Aucune erreur sur la question active.');
            return true;
          }
        }

        if (ctx.isEnabled('hypo.courseLink') && ctx.matches(e, 'hypo.courseLink', 'open')) {
          const link = document.querySelector('.cortexio-question-answer a.hypo-anchor-link, a.hypo-anchor-link');
          if (link && dom.safeClick(link)) {
            dom.showToast('Ouverture du lien de cours');
            return true;
          }
        }

        if (ctx.isEnabled('hypo.flags')) {
          const sk = getSessionKey();
          const activeQ = getActiveQuestion();
          const list = getQuestions();
          const idx = Math.max(0, list.indexOf(activeQ));
          if (ctx.matches(e, 'hypo.flags', 'clearAll')) {
            flagStore.clearFlags(sk);
            renderFlags(ctx);
            dom.showToast('Drapeaux supprimés');
            return true;
          }
          if (ctx.matches(e, 'hypo.flags', 'toggle')) {
            const res = flagStore.toggleFlag(sk, getCurrentQuestionKey(activeQ, idx));
            renderFlags(ctx);
            dom.showToast(res.added ? 'Drapeau ajouté' : 'Drapeau retiré');
            return true;
          }
          if (ctx.matches(e, 'hypo.flags', 'nextFlag')) {
            const flags = flagStore.getFlags(sk);
            const flagged = list.filter((q, i) => flags.has(getCurrentQuestionKey(q, i)));
            if (flagged.length === 0) {
              dom.showToast('Aucune question marquée');
              return false;
            }
            const nextEl = flagged[(flagged.indexOf(activeQ) + 1) % flagged.length];
            nextEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return true;
          }
        }

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

      onContextMenuAnki(msg) {
        const anki = getAnki();
        if (!anki) return { ok: false };
        const sel = msg && msg.selectionText ? String(msg.selectionText).trim() : '';
        const infoCtx = extractHypocampusContext();
        const errorsOnly = msg && msg.mode === 'errors';

        const selOics = (sel.match(/\bOIC[-_]\d{1,3}[-_]\d{1,2}[-_][AB](?:[-_]\d{1,2})?\b/gi) || [])
          .map((o) => anki.normalizeOic(o))
          .filter(Boolean);
        const selKw = sel ? anki.extractMedicalKeywords(sel, 5) : [];

        const uri = anki.buildAnkiEdnUri({
          action: 'qcm',
          src: 'hypocampus',
          qid: infoCtx.qid ? [infoCtx.qid] : [],
          oic: selOics.length > 0 ? selOics : infoCtx.oics,
          item: infoCtx.items,
          rang: infoCtx.rang,
          q: selKw.length > 0 ? selKw : (errorsOnly ? infoCtx.errKeywords : infoCtx.keywords),
          err: errorsOnly ? infoCtx.errNote : '',
        });
        if (!uri) return { ok: false };
        const ok = anki.launchAnkiUri(uri, 'Ouverture dans Anki EDN...');
        return { ok: Boolean(ok), uri };
      },

      destroy() {
        dom.injectStyle('qcmk-hypo-scores-css', '');
        dom.clearKeyHints();
        clearHypoAnkiUi();
        document.querySelectorAll('.qcmk-hypo-flag').forEach((n) => n.remove());
      },

      _testHooks: {
        extractHypoItemNumber,
        extractHypocampusContext,
        inspectHypoCorrection,
        applyHypoAnkiConnector,
        renderAnkiUi: applyHypoAnkiConnector,
      },
    };
  }

  adapters.hypocampus = createHypocampusAdapter();
})();
