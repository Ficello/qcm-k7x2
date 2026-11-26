"""Build shareable distribution packages for Chrome/Edge/Brave/Opera, Firefox, Safari, and Userscripts."""

import json
import shutil
import zipfile
from pathlib import Path

EXT_ROOT = Path(__file__).resolve().parent.parent
DIST_DIR = EXT_ROOT / "dist"
SITE_DIR = EXT_ROOT / "site"

CORE_INCLUDE_DIRS = ("icons", "src/core", "src/adapters", "src/content", "ui")
CORE_INCLUDE_FILES = ("README.md",)

USERSCRIPT_HEADER = """// ==UserScript==
// @name         QCM Clavier
// @namespace    https://local.edn/qcm-clavier
// @version      {version}
// @description  Raccourcis clavier personnalisables pour EDN.fr, Hypocampus, UNESS, Asclepia et Refoua.
// @match        *://*.edn.fr/*
// @match        *://*.hypocampus.fr/*
// @match        *://*.uness.fr/*
// @match        https://*.asclepia.io/*
// @match        https://refoua.fr/*
// @match        https://refoua.vercel.app/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-end
// ==/UserScript==

"""

FRIEND_GUIDE = """# Installer QCM Clavier

Choisissez la méthode correspondant à votre navigateur.

## 1. Méthode universelle : Safari (Mac / iPhone / iPad) et tout navigateur

Le fichier `qcm-clavier.user.js` fonctionne directement sans signature développeur :

- **Sur Safari (Mac / iPhone / iPad)** :
  1. Installer l'extension gratuite **Userscripts** depuis l'App Store.
  2. Activer **Userscripts** dans Safari > Réglages > Extensions.
  3. Ouvrir le dossier choisi par Userscripts et y copier `qcm-clavier.user.js`.
- **Sur Chrome, Edge, Brave, Opera, Vivaldi ou Firefox** :
  1. Installer **Tampermonkey** ou **Violentmonkey** depuis le store du navigateur.
  2. Glisser-déposer `qcm-clavier.user.js` dans le navigateur (ou l'importer via le tableau de bord de Tampermonkey).

**Configurer ses touches en mode Userscript** : sur n'importe quelle page EDN.fr, Hypocampus, UNESS ou Asclepia, appuyez sur `Alt + Maj + K` (ou passez par le menu de l'extension Userscripts / Tampermonkey > *Configurer QCM Clavier*).

## 2. Chrome, Edge, Brave, Opera, Vivaldi, Arc (archive Chromium)

1. Décompresser `QCM-Clavier-Chromium.zip` dans un dossier fixe (ne pas le supprimer ensuite).
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
  3. Sélectionner `QCM-Clavier-Firefox.xpi` (ou le `manifest.json` après décompression).
  4. Dans `about:addons` > **QCM Clavier** > **Permissions**, autoriser l'accès aux sites si nécessaire.
- **Installation permanente** : possible sur Firefox Developer Edition / Nightly (`about:config` > `xpinstall.signatures.required = false`, puis installer `QCM-Clavier-Firefox.xpi` depuis `about:addons`), ou avec la méthode universelle `qcm-clavier.user.js`.

## 4. Safari natif sur Mac (avec Xcode)

1. Décompresser `QCM-Clavier-Safari-Source.zip`.
2. Ouvrir le Terminal dans le dossier extrait et lancer :
   `sh scripts/build_safari_mac.sh`
3. Cliquer sur **Play** (`Cmd + R`) dans Xcode, puis activer **QCM Clavier** dans Safari > Réglages > Extensions.
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
        EXT_ROOT / "src" / "adapters" / "edn.js",
        EXT_ROOT / "src" / "adapters" / "hypocampus.js",
        EXT_ROOT / "src" / "adapters" / "uness.js",
        EXT_ROOT / "src" / "adapters" / "asclepia.js",
        EXT_ROOT / "src" / "adapters" / "refoua.js",
        EXT_ROOT / "src" / "content" / "main.js",
        EXT_ROOT / "src" / "userscript" / "panel.js",
    ]
    chunks = [USERSCRIPT_HEADER.format(version=version), "(function () {\n  'use strict';\n"]
    for p in parts:
        rel = p.relative_to(EXT_ROOT).as_posix()
        chunks.append(f"\n  /* --- {rel} --- */\n")
        chunks.append(p.read_text(encoding="utf-8").rstrip() + "\n")
    chunks.append("\n})();\n")
    dest_path.write_text("".join(chunks), encoding="utf-8")


SITE_HTML = """<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>QCM Clavier - Installation</title>
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
    h1 {
      margin: 0 0 6px;
      font-size: 22px;
      font-weight: 600;
      letter-spacing: -0.01em;
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
  </style>
</head>
<body>
  <main>
    <h1>QCM Clavier</h1>
    <p class="lead">Raccourcis clavier personnalisables pour EDN.fr, Hypocampus, UNESS, Asclepia et Refoua.</p>

    <nav class="tabs" id="tabs" role="tablist">
      <button type="button" class="tab" data-tab="safari">Safari</button>
      <button type="button" class="tab" data-tab="chromium">Chrome / Edge / Brave / Opera</button>
      <button type="button" class="tab" data-tab="firefox">Firefox</button>
      <button type="button" class="tab" data-tab="universal">Script universel</button>
    </nav>

    <section class="card" id="panel"></section>
  </main>

  <script>
    (function () {
      const PANELS = {
        safari: {
          title: 'Safari (Mac, iPhone, iPad)',
          desc: 'Installation directe sans signature développeur via l\'extension gratuite Userscripts.',
          primary: { label: 'Télécharger qcm-clavier.user.js', href: 'files/qcm-clavier.user.js' },
          secondary: { label: 'Sources Xcode (Mac)', href: 'files/QCM-Clavier-Safari-Source.zip' },
          steps: [
            'Installer l\'extension gratuite <strong>Userscripts</strong> depuis l\'App Store et l\'activer dans Safari > Réglages > Extensions.',
            'Télécharger <code>qcm-clavier.user.js</code> et le placer dans le dossier choisi par Userscripts.',
            'Ouvrir EDN.fr, Hypocampus, UNESS ou Asclepia et appuyer sur <kbd>Alt</kbd> + <kbd>Maj</kbd> + <kbd>K</kbd> pour régler vos touches.'
          ]
        },
        chromium: {
          title: 'Chrome, Edge, Brave, Opera, Vivaldi, Arc',
          desc: 'Archive WebExtension prête à charger en un clic.',
          primary: { label: 'Télécharger QCM-Clavier-Chromium.zip', href: 'files/QCM-Clavier-Chromium.zip' },
          secondary: { label: 'Version Userscript', href: 'files/qcm-clavier.user.js' },
          steps: [
            'Décompresser <code>QCM-Clavier-Chromium.zip</code> dans un dossier fixe.',
            'Ouvrir <code>chrome://extensions</code> (ou <code>edge://extensions</code>, <code>brave://extensions</code>) et activer le <strong>Mode développeur</strong>.',
            'Cliquer sur <strong>Charger l\'extension non empaquetée</strong> et sélectionner le dossier décompressé.'
          ]
        },
        firefox: {
          title: 'Mozilla Firefox',
          desc: 'Utilisable via Tampermonkey (permanent) ou en module WebExtension.',
          primary: { label: 'Télécharger qcm-clavier.user.js', href: 'files/qcm-clavier.user.js' },
          secondary: { label: 'Archive .xpi', href: 'files/QCM-Clavier-Firefox.xpi' },
          steps: [
            '<strong>Méthode permanente recommandée :</strong> installer <strong>Tampermonkey</strong> ou <strong>Violentmonkey</strong>, puis importer <code>qcm-clavier.user.js</code> (réglages via <kbd>Alt</kbd> + <kbd>Maj</kbd> + <kbd>K</kbd>).',
            '<strong>Sinon (temporaire) :</strong> ouvrir <code>about:debugging#/runtime/this-firefox</code> et charger <code>QCM-Clavier-Firefox.xpi</code>.',
            'Si Firefox demande l\'accès aux sites, l\'autoriser dans <code>about:addons</code> > QCM Clavier > Permissions.'
          ]
        },
        universal: {
          title: 'Script universel (tous navigateurs)',
          desc: 'Un seul fichier compatible Safari, Firefox, Chrome, Edge, Brave, Opera et Vivaldi.',
          primary: { label: 'Télécharger qcm-clavier.user.js', href: 'files/qcm-clavier.user.js' },
          steps: [
            'Installer <strong>Userscripts</strong> (Safari) ou <strong>Tampermonkey</strong> / <strong>Violentmonkey</strong> (autres navigateurs).',
            'Importer le fichier <code>qcm-clavier.user.js</code>.',
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

      tabs.forEach((t) => t.addEventListener('click', () => render(t.dataset.tab)));
      render(detectTab());
    })();
  </script>
</body>
</html>
"""


def _build_site(artifacts: list[Path]) -> list[Path]:
    files_dir = SITE_DIR / "files"
    files_dir.mkdir(parents=True, exist_ok=True)

    site_outputs = []
    for src in artifacts:
        if src.suffix in (".zip", ".xpi", ".js"):
            dest = files_dir / src.name
            shutil.copy2(src, dest)
            site_outputs.append(dest)

    robots = SITE_DIR / "robots.txt"
    robots.write_text("User-agent: *\nDisallow: /\n", encoding="utf-8")
    site_outputs.append(robots)

    index_html = SITE_DIR / "index.html"
    index_html.write_text(SITE_HTML, encoding="utf-8")
    site_outputs.append(index_html)

    return site_outputs


def build_all() -> list[Path]:
    DIST_DIR.mkdir(parents=True, exist_ok=True)
    manifest = json.loads((EXT_ROOT / "manifest.json").read_text(encoding="utf-8"))
    version = manifest.get("version", "1.0.0")

    chromium_manifest = {k: v for k, v in manifest.items() if k != "browser_specific_settings"}
    chromium_zip = DIST_DIR / "QCM-Clavier-Chromium.zip"
    _write_archive(chromium_zip, chromium_manifest, include_safari_script=False)

    firefox_xpi = DIST_DIR / "QCM-Clavier-Firefox.xpi"
    _write_archive(firefox_xpi, manifest, include_safari_script=False)

    safari_zip = DIST_DIR / "QCM-Clavier-Safari-Source.zip"
    _write_archive(safari_zip, manifest, include_safari_script=True)

    userscript = DIST_DIR / "qcm-clavier.user.js"
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
