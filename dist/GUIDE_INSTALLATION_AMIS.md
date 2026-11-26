# Installer Connecteur EDN

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
