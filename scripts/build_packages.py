"""Build shareable distribution packages for Chrome/Edge/Brave/Opera, Firefox, Safari, and Userscripts."""

import json
import shutil
import zipfile
from pathlib import Path

EXT_ROOT = Path(__file__).resolve().parent.parent
DIST_DIR = EXT_ROOT / "dist"
SITE_DIR = EXT_ROOT / "site"
DOCS_DIR = EXT_ROOT / "docs"

CORE_INCLUDE_DIRS = ("icons", "src/core", "src/adapters", "src/content", "src/background", "ui")
CORE_INCLUDE_FILES = ("README.md",)

USERSCRIPT_HEADER = """// ==UserScript==
// @name         Connecteur EDN
// @author       Angelo Marcis
// @namespace    https://anki-edn.fr/connecteur-edn
// @version      {version}
// @description  Connecteur Anki EDN et raccourcis clavier QCM pour EDN.fr, Hypocampus, UNESS (LiSA & BNE), Asclepia et Refoua.
// @match        *://*.edn.fr/*
// @match        *://*.hypocampus.fr/*
// @match        *://*.uness.fr/*
// @match        https://*.asclepia.io/*
// @match        https://refoua.fr/*
// @match        https://refoua.vercel.app/*
// @match        https://ficello.github.io/qcm-k7x2/*
// @match        https://c2su.github.io/Anki_EDN/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-end
// ==/UserScript==

"""

FRIEND_GUIDE = """# Installer Connecteur EDN

Extension web officielle Anki EDN par Angelo Marcis. Choisissez la méthode correspondant à votre navigateur.

## 1. Méthode universelle : Safari (Mac / iPhone / iPad) et tout navigateur

Le fichier `connecteur-edn.user.js` fonctionne directement sans signature développeur :

- **Sur Safari (Mac / iPhone / iPad)** :
  1. Installer l'extension gratuite **Userscripts** depuis l'App Store.
  2. Activer **Userscripts** dans Safari > Réglages > Extensions.
  3. Ouvrir le dossier choisi par Userscripts et y copier `connecteur-edn.user.js`.
- **Sur Chrome, Edge, Brave, Opera, Vivaldi ou Firefox** :
  1. Installer **Tampermonkey** ou **Violentmonkey** depuis le store du navigateur.
  2. Glisser-déposer `connecteur-edn.user.js` dans le navigateur (ou l'importer via le tableau de bord de Tampermonkey).

**Configurer ses touches en mode Userscript** : sur n'importe quelle page EDN.fr, Hypocampus, UNESS ou Asclepia, appuyez sur `Alt + Maj + K` (ou passez par le menu de l'extension Userscripts / Tampermonkey > *Configurer QCM Clavier*).

## 2. Chrome, Edge, Brave, Opera, Vivaldi, Arc (archive Chromium)

1. Décompresser `Connecteur-EDN-Chromium.zip` dans un dossier fixe (ne pas le supprimer ensuite).
2. Ouvrir la page des extensions du navigateur :
   - Chrome : `chrome://extensions`
   - Edge : `edge://extensions`
   - Brave : `brave://extensions`
   - Opera : `opera://extensions`
   - Vivaldi : `vivaldi://extensions`
3. Activer le **Mode développeur**.
4. Cliquer sur **Charger l'extension non empaquetée** et sélectionner le dossier décompressé.

## 3. Mozilla Firefox

- **Test immédiat (`about:debugging`)** :
  1. Ouvrir `about:debugging#/runtime/this-firefox`.
  2. Cliquer sur **Charger un module complémentaire temporaire…**.
  3. Sélectionner `Connecteur-EDN-Firefox.xpi` (ou le `manifest.json` après décompression).
  4. Dans `about:addons` > **Connecteur EDN** > **Permissions**, autoriser l'accès aux sites si nécessaire.
- **Installation permanente** : installer la version signée depuis Firefox Add-ons (AMO), ou utiliser `connecteur-edn.user.js`.

## 4. Safari natif sur Mac (avec Xcode)

1. Décompresser `Connecteur-EDN-Safari-Source.zip`.
2. Ouvrir le Terminal dans le dossier extrait et lancer :
   `sh scripts/build_safari_mac.sh`
3. Cliquer sur **Play** (`Cmd + R`) dans Xcode, puis activer **Connecteur EDN** dans Safari > Réglages > Extensions.
"""


def _iter_extension_files(include_safari_script: bool = False):
    for rel_dir in CORE_INCLUDE_DIRS:
        base = EXT_ROOT / rel_dir
        for path in sorted(base.rglob("*")):
            if path.is_file():
                yield path, path.relative_to(EXT_ROOT).as_posix()
    for rel_file in CORE_INCLUDE_FILES:
        path = EXT_ROOT / rel_file
        if path.is_file():
            yield path, rel_file
    if include_safari_script:
        sh_path = EXT_ROOT / "scripts" / "build_safari_mac.sh"
        if sh_path.is_file():
            yield sh_path, "scripts/build_safari_mac.sh"


def _write_archive(dest_path: Path, manifest_data: dict, include_safari_script: bool = False):
    with zipfile.ZipFile(dest_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("manifest.json", json.dumps(manifest_data, indent=2, ensure_ascii=False) + "\n")
        for src_path, arcname in _iter_extension_files(include_safari_script=include_safari_script):
            zf.write(src_path, arcname)


def _build_userscript(dest_path: Path, version: str):
    parts = [
        EXT_ROOT / "src" / "core" / "schema.js",
        EXT_ROOT / "src" / "core" / "storage.js",
        EXT_ROOT / "src" / "core" / "keybind.js",
        EXT_ROOT / "src" / "core" / "dom.js",
        EXT_ROOT / "src" / "core" / "anki_connector.js",
        EXT_ROOT / "src" / "adapters" / "edn.js",
        EXT_ROOT / "src" / "adapters" / "hypocampus.js",
        EXT_ROOT / "src" / "adapters" / "uness.js",
        EXT_ROOT / "src" / "adapters" / "asclepia.js",
        EXT_ROOT / "src" / "adapters" / "refoua.js",
        EXT_ROOT / "src" / "content" / "main.js",
        EXT_ROOT / "src" / "content" / "install_handshake.js",
        EXT_ROOT / "src" / "userscript" / "panel.js",
    ]
    chunks = [USERSCRIPT_HEADER.format(version=version), "(function () {\n  'use strict';\n"]
    for p in parts:
        rel = p.relative_to(EXT_ROOT).as_posix()
        chunks.append(f"\n  /* --- {rel} --- */\n")
        chunks.append(p.read_text(encoding="utf-8").rstrip() + "\n")
    chunks.append("\n})();\n")
    dest_path.write_text("".join(chunks), encoding="utf-8")


SITE_HTML = r"""<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>Connecteur EDN - Installation</title>
  <link rel="icon" type="image/png" href="files/icon128.png">
  <style>
    :root {
      --bg: #f7f7f8;
      --surface: #ffffff;
      --border: #e4e4e7;
      --border-strong: #d4d4d8;
      --text: #18181b;
      --muted: #52525b;
      --accent: #1d4ed8;
      --accent-hover: #1e40af;
      --ok-bg: #ecfdf5;
      --ok-border: #a7f3d0;
      --ok-text: #065f46;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
    }
    main {
      max-width: 640px;
      margin: 0 auto;
      padding: 32px 16px 48px;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 18px;
    }
    .header img {
      width: 48px;
      height: 48px;
      border-radius: 8px;
      flex-shrink: 0;
    }
    h1 {
      margin: 0 0 2px;
      font-size: 22px;
      font-weight: 600;
      letter-spacing: -0.01em;
    }
    .author {
      margin: 0;
      font-size: 12px;
      color: var(--muted);
    }
    .lead {
      margin: 0 0 20px;
      color: var(--muted);
    }
    .tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 16px;
    }
    .tab {
      padding: 8px 12px;
      border: 0;
      border-bottom: 2px solid transparent;
      background: transparent;
      color: var(--muted);
      font: inherit;
      font-weight: 500;
      cursor: pointer;
    }
    .tab.active {
      color: var(--accent);
      border-bottom-color: var(--accent);
      font-weight: 600;
    }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 18px;
    }
    .card + .card {
      margin-top: 14px;
    }
    .card h2 {
      margin: 0 0 8px;
      font-size: 16px;
      font-weight: 600;
    }
    .card p {
      margin: 0 0 14px;
      color: var(--muted);
    }
    .btn {
      display: inline-block;
      padding: 9px 14px;
      border-radius: 6px;
      background: var(--accent);
      color: #ffffff;
      text-decoration: none;
      font-weight: 500;
    }
    .btn:hover { background: var(--accent-hover); }
    .btn-secondary {
      background: var(--surface);
      color: var(--text);
      border: 1px solid var(--border-strong);
      margin-left: 8px;
    }
    .btn-secondary:hover { background: var(--bg); }
    ol {
      margin: 16px 0 0;
      padding-left: 18px;
    }
    li { margin-bottom: 6px; }
    code, kbd {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
      padding: 1px 5px;
      border: 1px solid var(--border-strong);
      border-radius: 4px;
      background: var(--bg);
    }
    .note {
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid var(--border);
      font-size: 13px;
      color: var(--muted);
    }
    .status-line {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      border: 1px solid var(--border);
      background: var(--bg);
      color: var(--muted);
      margin-bottom: 12px;
    }
    .status-line.detected {
      border-color: var(--ok-border);
      background: var(--ok-bg);
      color: var(--ok-text);
    }
  </style>
</head>
<body>
  <main>
    <div class="header">
      <img src="files/icon128.png" alt="Logo Anki EDN" width="48" height="48">
      <div>
        <h1>Connecteur EDN</h1>
        <p class="author">Anki EDN &mdash; par Angelo Marcis</p>
      </div>
    </div>
    <p class="lead">Passerelle directe vers vos cartes Anki EDN et raccourcis clavier QCM sur EDN.fr, Hypocampus, UNESS (LiSA &amp; BNE), Asclepia et Refoua.</p>

    <nav class="tabs" id="tabs" role="tablist">
      <button type="button" class="tab" data-tab="safari">Safari</button>
      <button type="button" class="tab" data-tab="chromium">Chrome / Edge / Brave / Opera</button>
      <button type="button" class="tab" data-tab="firefox">Firefox</button>
      <button type="button" class="tab" data-tab="universal">Script universel</button>
    </nav>

    <section class="card" id="panel"></section>

    <section class="card" id="verify-card">
      <h2>Tester la connexion avec Anki</h2>
      <div id="ext-status" class="status-line">Extension non encore détectée sur cette page</div>
      <p>Une fois l'extension installée, cliquez ci-dessous pour vérifier que votre navigateur ouvre bien Anki EDN et valider l'installation dans l'add-on.</p>
      <a class="btn" id="ping-btn" href="anki-edn://ping?src=install&ext=1.0.0">Tester le lien vers Anki</a>
    </section>
  </main>

  <script>
    (function () {
      const PANELS = {
        safari: {
          title: 'Safari (Mac, iPhone, iPad)',
          desc: 'Installation directe sans signature développeur via l\'extension gratuite Userscripts.',
          primary: { label: 'Télécharger connecteur-edn.user.js', href: 'files/connecteur-edn.user.js' },
          secondary: { label: 'Sources Xcode (Mac)', href: 'files/Connecteur-EDN-Safari-Source.zip' },
          steps: [
            'Installer l\'extension gratuite <strong>Userscripts</strong> depuis l\'App Store et l\'activer dans Safari > Réglages > Extensions.',
            'Télécharger <code>connecteur-edn.user.js</code> et le placer dans le dossier choisi par Userscripts.',
            'Recharger cette page puis cliquer sur <strong>Tester le lien vers Anki</strong> ci-dessous.'
          ]
        },
        chromium: {
          title: 'Chrome, Edge, Brave, Opera, Vivaldi, Arc',
          desc: 'Archive WebExtension prête à charger en un clic.',
          primary: { label: 'Télécharger Connecteur-EDN-Chromium.zip', href: 'files/Connecteur-EDN-Chromium.zip' },
          secondary: { label: 'Version Userscript', href: 'files/connecteur-edn.user.js' },
          steps: [
            'Décompresser <code>Connecteur-EDN-Chromium.zip</code> dans un dossier fixe.',
            'Ouvrir <code>chrome://extensions</code> (ou <code>edge://extensions</code>, <code>brave://extensions</code>) et activer le <strong>Mode développeur</strong>.',
            'Cliquer sur <strong>Charger l\'extension non empaquetée</strong> et sélectionner le dossier décompressé.'
          ]
        },
        firefox: {
          title: 'Mozilla Firefox',
          desc: 'Utilisable via Tampermonkey (permanent) ou en module WebExtension.',
          primary: { label: 'Télécharger connecteur-edn.user.js', href: 'files/connecteur-edn.user.js' },
          secondary: { label: 'Archive .xpi', href: 'files/Connecteur-EDN-Firefox.xpi' },
          steps: [
            '<strong>Méthode permanente recommandée :</strong> installer <strong>Tampermonkey</strong> ou <strong>Violentmonkey</strong>, puis importer <code>connecteur-edn.user.js</code>.',
            '<strong>Sinon (temporaire) :</strong> ouvrir <code>about:debugging#/runtime/this-firefox</code> et charger <code>Connecteur-EDN-Firefox.xpi</code>.',
            'Si Firefox demande l\'accès aux sites, l\'autoriser dans <code>about:addons</code> > Connecteur EDN > Permissions.'
          ]
        },
        universal: {
          title: 'Script universel (tous navigateurs)',
          desc: 'Un seul fichier compatible Safari, Firefox, Chrome, Edge, Brave, Opera et Vivaldi.',
          primary: { label: 'Télécharger connecteur-edn.user.js', href: 'files/connecteur-edn.user.js' },
          steps: [
            'Installer <strong>Userscripts</strong> (Safari) ou <strong>Tampermonkey</strong> / <strong>Violentmonkey</strong> (autres navigateurs).',
            'Importer le fichier <code>connecteur-edn.user.js</code>.',
            'Sur n\'importe quel site QCM, appuyer sur <kbd>Alt</kbd> + <kbd>Maj</kbd> + <kbd>K</kbd> pour personnaliser vos raccourcis.'
          ]
        }
      };

      function detectTab() {
        const ua = navigator.userAgent || '';
        if (/Firefox/i.test(ua)) return 'firefox';
        if (/Safari/i.test(ua) && !/Chrome|Chromium|Edg|OPR|Brave/i.test(ua)) return 'safari';
        if (/Chrome|Chromium|Edg|OPR/i.test(ua)) return 'chromium';
        return 'universal';
      }

      const tabs = document.querySelectorAll('.tab');
      const panel = document.getElementById('panel');

      function render(id) {
        const p = PANELS[id] || PANELS.universal;
        tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === id));
        const secHtml = p.secondary
          ? '<a class="btn btn-secondary" download href="' + p.secondary.href + '">' + p.secondary.label + '</a>'
          : '';
        panel.innerHTML =
          '<h2>' + p.title + '</h2>' +
          '<p>' + p.desc + '</p>' +
          '<div><a class="btn" download href="' + p.primary.href + '">' + p.primary.label + '</a>' + secHtml + '</div>' +
          '<ol>' + p.steps.map((s) => '<li>' + s + '</li>').join('') + '</ol>' +
          '<div class="note">Raccourcis par défaut : chiffres 1-0 (ou rangée AZERTY) pour cocher, Entrée pour valider, flèches pour naviguer/défiler, ù pour drapeau.</div>';
      }

      const extStatus = document.getElementById('ext-status');
      const pingBtn = document.getElementById('ping-btn');

      function updateExtStatus(version) {
        if (!version) return;
        extStatus.textContent = 'Extension détectée (v' + version + ')';
        extStatus.classList.add('detected');
        pingBtn.href = 'anki-edn://ping?src=install&ext=' + encodeURIComponent(version);
      }

      if (document.documentElement.dataset.connecteurEdn) {
        updateExtStatus(document.documentElement.dataset.connecteurEdn);
      }
      window.addEventListener('connecteur-edn:ready', function (ev) {
        const ver = ev && ev.detail && ev.detail.version ? ev.detail.version : '1.0.0';
        updateExtStatus(ver);
      });

      tabs.forEach((t) => t.addEventListener('click', () => render(t.dataset.tab)));
      render(detectTab());
    })();
  </script>
</body>
</html>
"""


def _build_site(artifacts: list[Path]) -> list[Path]:
    outputs = []
    icon_src = EXT_ROOT / "icons" / "icon128.png"
    for target_dir, add_nojekyll in ((SITE_DIR, False), (DOCS_DIR, True)):
        files_dir = target_dir / "files"
        files_dir.mkdir(parents=True, exist_ok=True)

        for src in artifacts:
            if src.suffix in (".zip", ".xpi", ".js"):
                dest = files_dir / src.name
                shutil.copy2(src, dest)
                outputs.append(dest)

        if icon_src.is_file():
            icon_dest = files_dir / "icon128.png"
            shutil.copy2(icon_src, icon_dest)
            outputs.append(icon_dest)

        robots = target_dir / "robots.txt"
        robots.write_text("User-agent: *\nDisallow: /\n", encoding="utf-8")
        outputs.append(robots)

        index_html = target_dir / "index.html"
        index_html.write_text(SITE_HTML, encoding="utf-8")
        outputs.append(index_html)

        if add_nojekyll:
            nojekyll = target_dir / ".nojekyll"
            nojekyll.write_text("", encoding="utf-8")
            outputs.append(nojekyll)

    return outputs


def build_all() -> list[Path]:
    DIST_DIR.mkdir(parents=True, exist_ok=True)
    manifest = json.loads((EXT_ROOT / "manifest.json").read_text(encoding="utf-8"))
    version = manifest.get("version", "1.0.0")

    chromium_manifest = {k: v for k, v in manifest.items() if k != "browser_specific_settings"}
    if "background" in chromium_manifest:
        chromium_manifest["background"] = {"service_worker": "src/background/background.js"}
    chromium_zip = DIST_DIR / "Connecteur-EDN-Chromium.zip"
    _write_archive(chromium_zip, chromium_manifest, include_safari_script=False)

    firefox_xpi = DIST_DIR / "Connecteur-EDN-Firefox.xpi"
    _write_archive(firefox_xpi, manifest, include_safari_script=False)

    safari_zip = DIST_DIR / "Connecteur-EDN-Safari-Source.zip"
    _write_archive(safari_zip, manifest, include_safari_script=True)

    userscript = DIST_DIR / "connecteur-edn.user.js"
    _build_userscript(userscript, version)

    guide = DIST_DIR / "GUIDE_INSTALLATION_AMIS.md"
    guide.write_text(FRIEND_GUIDE, encoding="utf-8")

    dist_outputs = [chromium_zip, firefox_xpi, safari_zip, userscript, guide]
    site_outputs = _build_site(dist_outputs)
    return dist_outputs + site_outputs


if __name__ == "__main__":
    outputs = build_all()
    for out in outputs:
        print(f"Built: {out}")
