# QCM Clavier

Extension Chrome personnelle (Manifest V3) offrant des raccourcis clavier entièrement personnalisables pour les plateformes d'entraînement médical.

## Plateformes prises en charge

- **EDN.fr** : sélection des propositions (1 à 10), validation, auto-évaluation en correction, navigation précédente/suivante, gestion des ancrages, minuteur au clavier, autofocus QROC, affichage compact en demi-écran, drapeaux par épreuve, coloration des scores, compteurs d'ancrages par matière, repères clavier sur la page et liens directs vers les objectifs LiSA sur Refoua.
- **Hypocampus** : sélection des propositions (1 à 10), validation/continuation, navigation précédente/suivante, défilement au clavier, autofocus QROC et déploiement des menus déroulants en boutons cliquables.
- **UNESS** : sélection des propositions de la question la plus haute, validation ou passage à la question suivante, drapeau natif Moodle au clavier et défilement.
- **Asclepia** : sélection des propositions, validation/confirmation/correction, enchaînement automatique des sous-dossiers, autofocus QROC, masquage de la barre supérieure, drapeaux mémorisés en composition et en correction, défilement.
- **Refoua** : défilement automatique et mise en surbrillance de l'objectif LiSA transmis depuis EDN.fr.

## Partager avec des amis (tous navigateurs)

Exécuter le script d'empaquetage pour générer les fichiers prêts à envoyer dans `dist/` :

```sh
python scripts/build_packages.py
```

Fichiers générés dans `dist/` :

- `qcm-clavier.user.js` : script universel compatible **Safari (macOS/iOS via Userscripts)**, **Firefox**, **Chrome**, **Edge**, **Brave**, **Opera** et **Vivaldi** (via Tampermonkey / Violentmonkey), sans signature développeur. Panneau de configuration intégré accessible via `Alt + Maj + K`.
- `QCM-Clavier-Chromium.zip` : archive prête pour **Chrome**, **Edge**, **Brave**, **Opera**, **Vivaldi** et **Arc** (décompresser puis charger en mode développeur).
- `QCM-Clavier-Firefox.xpi` : archive WebExtension dédiée à **Mozilla Firefox**.
- `QCM-Clavier-Safari-Source.zip` : sources prêtes pour conversion en extension native **Safari macOS** via `sh scripts/build_safari_mac.sh` (nécessite Xcode).
- `GUIDE_INSTALLATION_AMIS.md` : notice d'installation pas-à-pas à joindre lors du partage.

## Installation dans Safari (macOS / iOS)

- **Sans compilation (recommandé pour vos amis)** : installer l'extension gratuite **Userscripts** depuis l'App Store, l'activer dans Safari > Réglages > Extensions, puis copier `dist/qcm-clavier.user.js` dans son dossier de scripts.
- **Extension native macOS (avec Xcode)** : exécuter `sh scripts/build_safari_mac.sh` puis compiler dans Xcode (`Cmd + R`).

## Installation dans Mozilla Firefox

### Chargement immédiat (temporaire)

1. Ouvrir `about:debugging#/runtime/this-firefox` dans Firefox.
2. Cliquer sur **Charger un module complémentaire temporaire…**.
3. Sélectionner le fichier `manifest.json` dans `qcm_clavier_extension`.
4. Dans `about:addons` > **QCM Clavier** > onglet **Permissions**, vérifier que l'accès aux domaines (`edn.fr`, `hypocampus.fr`, `uness.fr`, `asclepia.io`, `refoua.fr`) est bien autorisé.

### Installation permanente

- **Firefox Developer Edition / Nightly** : ouvrir `about:config`, passer `xpinstall.signatures.required` à `false`, compresser le contenu de `qcm_clavier_extension` en `.zip` (avec `manifest.json` à la racine) puis l'installer depuis `about:addons` (*Installer un module depuis un fichier…*).
- **Firefox standard (Release)** : empaqueter le contenu du dossier en `.zip` et le faire signer gratuitement en distribution privée (« self-distribution ») sur Mozilla Add-ons (`addons.mozilla.org`).

## Installation dans Google Chrome

1. Ouvrir `chrome://extensions` dans Google Chrome.
2. Activer le **Mode développeur** (en haut à droite).
3. Cliquer sur **Charger l'extension non empaquetée**.
4. Sélectionner le dossier `qcm_clavier_extension`.

## Personnalisation des raccourcis

1. Cliquer sur l'icône **QCM Clavier** dans la barre Chrome puis sur **Configurer mes raccourcis** (ou passer par les options de l'extension).
2. Choisir l'onglet **Propositions (1–10)** ou celui de la plateforme souhaitée.
3. Cliquer sur **+ Ajouter** à côté d'une action puis appuyer sur la touche ou combinaison voulue (`Ctrl`, `Alt`, `Maj`, touche simple).
4. Les préréglages **AZERTY (PC)**, **AZERTY (Mac)** et **QWERTY** permettent de réadapter rapidement toutes les touches, et la configuration peut être exportée ou importée en JSON.
