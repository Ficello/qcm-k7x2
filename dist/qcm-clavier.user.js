// ==UserScript==
// @name         QCM Clavier
// @namespace    https://local.edn/qcm-clavier
// @version      1.0.0
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

(function () {
  'use strict';

  /* --- src/core/schema.js --- */
(function () {
  'use strict';
  const root = (globalThis.QCMK = globalThis.QCMK || {});

  const bind = (key, mods) => Object.assign({ key }, mods || {});

  const AZERTY_ROW = ['&', 'é', '"', "'", '(', '-', 'è', '_', 'ç', 'à'];
  const sharedActions = [];
  for (let i = 1; i <= 10; i++) {
    const digit = String(i % 10);
    sharedActions.push({
      id: 'choice.' + i,
      label: 'Proposition ' + i,
      default: [bind(digit), bind(AZERTY_ROW[i - 1])],
    });
  }

  const sites = [
    { id: 'edn', name: 'EDN.fr', hosts: ['edn.fr'] },
    { id: 'hypocampus', name: 'Hypocampus', hosts: ['hypocampus.fr'] },
    { id: 'uness', name: 'UNESS', hosts: ['uness.fr'] },
    { id: 'asclepia', name: 'Asclepia', hosts: ['asclepia.io'] },
    { id: 'refoua', name: 'Refoua', hosts: ['refoua.fr', 'refoua.vercel.app'], hidden: true },
  ];

  const features = [
    // EDN.fr — Général
    {
      id: 'edn.scroll',
      site: 'edn',
      group: 'Général',
      name: 'Défilement au clavier',
      description: 'Fait défiler la zone de questions avec les flèches haut et bas.',
      actions: [
        { id: 'down', label: 'Descendre', default: [bind('ArrowDown')] },
        { id: 'up', label: 'Monter', default: [bind('ArrowUp')] },
      ],
      options: [
        { id: 'step', label: 'Pas de défilement (px)', type: 'number', default: 200, min: 50, max: 1000 },
      ],
    },
    {
      id: 'uness.qroc',
      site: 'uness',
      group: 'QCM',
      name: 'QROC autofocus',
      description: 'Place automatiquement le curseur dans le champ texte de la question active dès la première frappe.',
      actions: [],
    },
    {
      id: 'uness.nav',
      site: 'uness',
      group: 'QCM',
      name: 'Question précédente / suivante',
      description: 'Navigue entre les questions visibles ou change de page avec les flèches gauche et droite.',
      actions: [
        { id: 'prev', label: 'Question / page précédente', default: [bind('ArrowLeft')] },
        { id: 'next', label: 'Question / page suivante', default: [bind('ArrowRight')] },
      ],
    },
    {
      id: 'uness.keyHints',
      site: 'uness',
      group: 'QCM',
      name: 'Afficher les touches sur la page',
      description: 'Affiche un repère clavier à côté des propositions de la question active.',
      enabledByDefault: false,
      actions: [],
    },
    {
      id: 'uness.favorite',
      site: 'uness',
      group: 'QCM',
      name: 'Mettre la question en favori',
      description: 'Active ou retire le favori UNESS sur la question active au clavier.',
      actions: [
        { id: 'toggle', label: 'Ajouter / retirer des favoris', default: [bind('*')] },
      ],
    },
    {
      id: 'edn.keyHints',
      site: 'edn',
      group: 'Général',
      name: 'Afficher les touches sur la page',
      description: 'Affiche un repère clavier à côté des propositions et des boutons principaux.',
      enabledByDefault: false,
      actions: [],
    },
    {
      id: 'edn.inlineScores',
      site: 'edn',
      group: 'Général',
      name: 'Scores colorés dans les questions',
      description: 'Colore les scores « X/Y pts » en vert, orange ou rouge dans les questions.',
      actions: [],
    },
    {
      id: 'edn.ancrageCounters',
      site: 'edn',
      group: 'Général',
      name: 'Tri par objectif / rang et filtres Ancrage',
      description: 'Ajoute le tri et le filtrage par objectif, rang (A/B/C), progression et matière ainsi que le lancement rapide sur Ancrage, Items et Notions.',
      actions: [],
    },
    {
      id: 'edn.refouaLinks',
      site: 'edn',
      group: 'Général',
      name: 'Rangs A/B/C vers cours LiSA',
      description: 'Rend les objectifs Rang A/B/C cliquables pour ouvrir la fiche correspondante sur Refoua (Ctrl+clic pour un nouvel onglet).',
      actions: [],
    },
    {
      id: 'edn.pin',
      site: 'edn',
      group: 'Général',
      name: 'Épingler la question au clavier',
      description: 'Ajoute ou retire l\'épingle sur la question active en training ou en correction.',
      actions: [
        { id: 'toggle', label: 'Épingler / désépingler la question active', default: [bind('p', { alt: true })] },
      ],
    },
    {
      id: 'edn.anki',
      site: 'edn',
      group: 'Connecteur Anki EDN',
      name: 'Connecteur Anki EDN (Fiches, Notions & QCM)',
      description: 'Ajoute des boutons et raccourcis pour ouvrir les cartes Anki EDN depuis les fiches de cours, les notions et les corrections (toutes notions ou erreurs uniquement).',
      actions: [
        { id: 'openActive', label: 'Ouvrir la question / fiche active dans Anki', default: [bind('a', { alt: true })] },
        { id: 'openErrors', label: 'Ouvrir uniquement les erreurs dans Anki', default: [bind('e', { alt: true })] },
      ],
      options: [
        { id: 'showButtons', label: 'Afficher les boutons Anki sur la page', type: 'boolean', default: true },
      ],
    },

    // EDN.fr — Training
    {
      id: 'edn.training.answer',
      site: 'edn',
      group: 'Training',
      name: 'Cocher et valider au clavier',
      description: 'Utilise les touches de propositions (1 à 10) pour cocher et la touche de validation pour soumettre.',
      usesSharedChoices: true,
      actions: [
        { id: 'validate', label: 'Valider', default: [bind('Enter')] },
      ],
    },
    {
      id: 'edn.training.correction',
      site: 'edn',
      group: 'Training',
      name: 'Auto-évaluation en correction',
      description: 'Sélectionne le niveau de maîtrise pendant la correction ou passe à la question suivante.',
      actions: [
        { id: 'sureOrNext', label: 'Je connaissais / question suivante', default: [bind('Enter')] },
        { id: 'unsure', label: 'Je me rappelais un peu', default: [bind('ù')] },
        { id: 'random', label: 'Je ne savais pas / au hasard', default: [bind('!')] },
      ],
    },
    {
      id: 'edn.training.nav',
      site: 'edn',
      group: 'Training',
      name: 'Question précédente / suivante',
      description: 'Navigue entre les questions de la série avec les flèches gauche et droite.',
      actions: [
        { id: 'prev', label: 'Question précédente', default: [bind('ArrowLeft')] },
        { id: 'next', label: 'Question suivante', default: [bind('ArrowRight')] },
      ],
    },
    {
      id: 'edn.training.ancrage',
      site: 'edn',
      group: 'Training',
      name: 'Gestion de l\'ancrage au clavier',
      description: 'Ajoute ou retire la question de l\'ancrage, ou déclenche « Ne plus revoir ».',
      actions: [
        { id: 'toggle', label: 'Ajouter / retirer de l\'ancrage', default: [bind('*')] },
        { id: 'add', label: 'Ajouter à l\'ancrage', default: [] },
        { id: 'remove', label: 'Retirer de l\'ancrage', default: [] },
        { id: 'noReview', label: 'Ne plus revoir', default: [bind('$')] },
      ],
    },
    {
      id: 'edn.training.qroc',
      site: 'edn',
      group: 'Training',
      name: 'QROC autofocus',
      description: 'Place automatiquement le curseur dans le champ QROC dès qu\'une lettre est tapée.',
      actions: [],
    },
    {
      id: 'edn.training.halfscreen',
      site: 'edn',
      group: 'Training',
      name: 'Affichage compact en demi-écran',
      description: 'Compresse l\'en-tête en fenêtre étroite (<= 920 px) pour conserver la question en haut de l\'écran.',
      actions: [],
    },
    {
      id: 'edn.timer',
      site: 'edn',
      group: 'Training',
      name: 'Minuteur au clavier',
      description: 'Met en pause ou relance le minuteur d\'EDN.fr au clavier.',
      actions: [
        { id: 'toggle', label: 'Pause / reprise du minuteur', default: [bind('²')] },
      ],
    },

    // EDN.fr — Examen / Annales
    {
      id: 'edn.exam.answer',
      site: 'edn',
      group: 'Examen / Annales',
      name: 'Cocher et valider au clavier',
      description: 'Coche les propositions de la question centrée à l\'écran et valide avec la touche dédiée.',
      usesSharedChoices: true,
      actions: [
        { id: 'validate', label: 'Valider', default: [bind('Enter')] },
      ],
    },
    {
      id: 'edn.exam.qroc',
      site: 'edn',
      group: 'Examen / Annales',
      name: 'QROC autofocus',
      description: 'Place automatiquement le curseur dans le champ QROC actif dès la première frappe.',
      actions: [],
    },
    {
      id: 'edn.exam.flags',
      site: 'edn',
      group: 'Examen / Annales',
      name: 'Drapeaux sur les questions',
      description: 'Pose ou retire un marqueur visuel sur la question visible et dans la barre latérale (mémorisé par épreuve).',
      actions: [
        { id: 'toggle', label: 'Marquer / démarquer la question visible', default: [bind('ù')] },
        { id: 'nextFlag', label: 'Aller à la prochaine question marquée', default: [bind('ù', { shift: true })] },
        { id: 'clearAll', label: 'Supprimer tous les drapeaux de l\'épreuve', default: [bind('ù', { ctrl: true })] },
      ],
    },
    {
      id: 'edn.sidebarScores',
      site: 'edn',
      group: 'Examen / Annales',
      name: 'Indicateurs de score (barre latérale)',
      description: 'Colore les pastilles de navigation selon le score obtenu et affiche un badge récapitulatif du dossier.',
      actions: [
        { id: 'clearNotes', label: 'Effacer les notes mémorisées de l\'épreuve', default: [bind('$', { ctrl: true })] },
      ],
      options: [
        { id: 'showBadge', label: 'Afficher le badge de note du dossier', type: 'boolean', default: true },
      ],
    },

    // Hypocampus
    {
      id: 'hypo.answer',
      site: 'hypocampus',
      group: 'QCM',
      name: 'Cocher et valider au clavier',
      description: 'Coche les propositions (1 à 10) et clique sur Vérifier ou Continuer.',
      usesSharedChoices: true,
      actions: [
        { id: 'validate', label: 'Vérifier / continuer', default: [bind('Enter')] },
      ],
    },
    {
      id: 'hypo.nav',
      site: 'hypocampus',
      group: 'QCM',
      name: 'Question précédente / suivante',
      description: 'Navigue entre les questions avec les flèches gauche et droite.',
      actions: [
        { id: 'prev', label: 'Précédent', default: [bind('ArrowLeft')] },
        { id: 'next', label: 'Suivant', default: [bind('ArrowRight')] },
      ],
    },
    {
      id: 'hypo.scroll',
      site: 'hypocampus',
      group: 'QCM',
      name: 'Défilement au clavier',
      description: 'Fait défiler la page avec les flèches haut et bas.',
      actions: [
        { id: 'down', label: 'Descendre', default: [bind('ArrowDown')] },
        { id: 'up', label: 'Monter', default: [bind('ArrowUp')] },
      ],
      options: [
        { id: 'step', label: 'Pas de défilement (px)', type: 'number', default: 200, min: 50, max: 1000 },
      ],
    },
    {
      id: 'uness.qroc',
      site: 'uness',
      group: 'QCM',
      name: 'QROC autofocus',
      description: 'Place automatiquement le curseur dans le champ texte de la question active dès la première frappe.',
      actions: [],
    },
    {
      id: 'uness.nav',
      site: 'uness',
      group: 'QCM',
      name: 'Question précédente / suivante',
      description: 'Navigue entre les questions visibles ou change de page avec les flèches gauche et droite.',
      actions: [
        { id: 'prev', label: 'Question / page précédente', default: [bind('ArrowLeft')] },
        { id: 'next', label: 'Question / page suivante', default: [bind('ArrowRight')] },
      ],
    },
    {
      id: 'uness.keyHints',
      site: 'uness',
      group: 'QCM',
      name: 'Afficher les touches sur la page',
      description: 'Affiche un repère clavier à côté des propositions de la question active.',
      enabledByDefault: false,
      actions: [],
    },
    {
      id: 'uness.favorite',
      site: 'uness',
      group: 'QCM',
      name: 'Mettre la question en favori',
      description: 'Active ou retire le favori UNESS sur la question active au clavier.',
      actions: [
        { id: 'toggle', label: 'Ajouter / retirer des favoris', default: [bind('*')] },
      ],
    },
    {
      id: 'hypo.autofocus',
      site: 'hypocampus',
      group: 'QCM',
      name: 'QROC autofocus',
      description: 'Place le curseur dans la zone de réponse dès son apparition.',
      actions: [],
    },
    {
      id: 'hypo.exposeDropdown',
      site: 'hypocampus',
      group: 'QCM',
      name: 'Déplier les menus « Choisis les réponses »',
      description: 'Affiche directement les options des menus déroulants sous forme de boutons synchronisés.',
      actions: [],
    },
    {
      id: 'hypo.flags',
      site: 'hypocampus',
      group: 'QCM',
      name: 'Drapeaux sur les questions',
      description: 'Pose ou retire un marqueur local sur la question active (mémorisé par session).',
      actions: [
        { id: 'toggle', label: 'Marquer / démarquer la question', default: [bind('ù')] },
        { id: 'nextFlag', label: 'Question marquée suivante', default: [bind('ù', { shift: true })] },
        { id: 'clearAll', label: 'Supprimer tous les drapeaux', default: [bind('ù', { ctrl: true })] },
      ],
    },
    {
      id: 'hypo.keyHints',
      site: 'hypocampus',
      group: 'QCM',
      name: 'Afficher les touches sur la page',
      description: 'Affiche un repère clavier à côté des propositions et boutons principaux.',
      enabledByDefault: false,
      actions: [],
    },
    {
      id: 'hypo.inlineScores',
      site: 'hypocampus',
      group: 'QCM',
      name: 'Scores colorés dans les questions',
      description: 'Colore les pastilles de score « X/Y points » en vert, orange ou rouge.',
      actions: [],
    },
    {
      id: 'hypo.courseLink',
      site: 'hypocampus',
      group: 'QCM',
      name: 'Ouvrir le lien de cours de la correction',
      description: 'Ouvre le premier renvoi vers le cours ou la fiche cité dans la correction.',
      actions: [
        { id: 'open', label: 'Ouvrir le lien de cours associé', default: [bind('c', { alt: true })] },
      ],
    },
    {
      id: 'hypo.anki',
      site: 'hypocampus',
      group: 'Connecteur Anki EDN',
      name: 'Connecteur Anki EDN (Cours & Corrections)',
      description: 'Ajoute des boutons et raccourcis pour ouvrir les cartes Anki EDN depuis les cours et corrections Hypocampus.',
      actions: [
        { id: 'openActive', label: 'Ouvrir la question / fiche active dans Anki', default: [bind('a', { alt: true })] },
        { id: 'openErrors', label: 'Ouvrir uniquement les erreurs dans Anki', default: [bind('e', { alt: true })] },
      ],
      options: [
        { id: 'showButtons', label: 'Afficher les boutons Anki sur la page', type: 'boolean', default: true },
      ],
    },
    {
      id: 'hypo.anki',
      site: 'hypocampus',
      group: 'Connecteur Anki EDN',
      name: 'Connecteur Anki EDN',
      description: 'Ajoute un bouton et un raccourci pour ouvrir les cartes Anki EDN correspondant au QCM Hypocampus.',
      actions: [
        { id: 'openActive', label: 'Ouvrir la question active dans Anki', default: [bind('a')] },
      ],
      options: [
        { id: 'showButtons', label: 'Afficher le bouton Anki sur la page', type: 'boolean', default: true },
      ],
    },

    // UNESS
    {
      id: 'uness.answer',
      site: 'uness',
      group: 'QCM',
      name: 'Cocher et valider au clavier',
      description: 'Coche la question visible la plus haute. Valider soumet la question ou défile vers la suivante.',
      usesSharedChoices: true,
      actions: [
        { id: 'validate', label: 'Valider / question suivante', default: [bind('Enter')] },
      ],
    },
    {
      id: 'uness.flags',
      site: 'uness',
      group: 'QCM',
      name: 'Marquer la question',
      description: 'Active ou retire le drapeau natif Moodle de la question active.',
      actions: [
        { id: 'toggle', label: 'Marquer / démarquer la question', default: [bind('ù')] },
      ],
    },
    {
      id: 'uness.scroll',
      site: 'uness',
      group: 'QCM',
      name: 'Défilement au clavier',
      description: 'Fait défiler la page avec les flèches haut et bas (appui prolongé fluide).',
      actions: [
        { id: 'down', label: 'Descendre', default: [bind('ArrowDown')] },
        { id: 'up', label: 'Monter', default: [bind('ArrowUp')] },
      ],
      options: [
        { id: 'step', label: 'Pas de défilement (px)', type: 'number', default: 200, min: 50, max: 1000 },
      ],
    },
    {
      id: 'uness.qroc',
      site: 'uness',
      group: 'QCM',
      name: 'QROC autofocus',
      description: 'Place automatiquement le curseur dans le champ texte de la question active dès la première frappe.',
      actions: [],
    },
    {
      id: 'uness.nav',
      site: 'uness',
      group: 'QCM',
      name: 'Question précédente / suivante',
      description: 'Navigue entre les questions visibles ou change de page avec les flèches gauche et droite.',
      actions: [
        { id: 'prev', label: 'Question / page précédente', default: [bind('ArrowLeft')] },
        { id: 'next', label: 'Question / page suivante', default: [bind('ArrowRight')] },
      ],
    },
    {
      id: 'uness.keyHints',
      site: 'uness',
      group: 'QCM',
      name: 'Afficher les touches sur la page',
      description: 'Affiche un repère clavier à côté des propositions de la question active.',
      enabledByDefault: false,
      actions: [],
    },
    {
      id: 'uness.favorite',
      site: 'uness',
      group: 'QCM',
      name: 'Mettre la question en favori',
      description: 'Active ou retire le favori UNESS sur la question active au clavier.',
      actions: [
        { id: 'toggle', label: 'Ajouter / retirer des favoris', default: [bind('*')] },
      ],
    },
    {
      id: 'uness.anki',
      site: 'uness',
      group: 'Connecteur Anki EDN',
      name: 'Connecteur Anki EDN (LiSA & QCM)',
      description: 'Ajoute des boutons et raccourcis pour ouvrir les cartes Anki EDN depuis les fiches LiSA et les corrections UNESS (toutes notions ou erreurs uniquement).',
      actions: [
        { id: 'openActive', label: 'Ouvrir la question / fiche active dans Anki', default: [bind('a')] },
        { id: 'openErrors', label: 'Ouvrir uniquement les erreurs dans Anki', default: [bind('e')] },
      ],
      options: [
        { id: 'showButtons', label: 'Afficher les boutons Anki sur la page', type: 'boolean', default: true },
      ],
    },

    // Asclepia
    {
      id: 'asclepia.answer',
      site: 'asclepia',
      group: 'QCM',
      name: 'Cocher et valider au clavier',
      description: 'Coche la question en haut de l\'écran et valide, confirme ou passe à la suivante.',
      usesSharedChoices: true,
      actions: [
        { id: 'validate', label: 'Valider / continuer', default: [bind('Enter')] },
      ],
    },
    {
      id: 'asclepia.chain',
      site: 'asclepia',
      group: 'QCM',
      name: 'Enchaînement des dossiers',
      description: 'Passe automatiquement au sous-dossier suivant après validation de la dernière question.',
      actions: [],
    },
    {
      id: 'asclepia.qroc',
      site: 'asclepia',
      group: 'QCM',
      name: 'QROC autofocus',
      description: 'Place le curseur dans le champ texte dès la première frappe.',
      actions: [],
    },
    {
      id: 'asclepia.compactHeader',
      site: 'asclepia',
      group: 'Affichage',
      name: 'Masquage de la barre supérieure',
      description: 'Masque l\'en-tête pendant les épreuves et ajoute un bouton « Afficher la barre ».',
      actions: [],
    },
    {
      id: 'asclepia.flags',
      site: 'asclepia',
      group: 'QCM',
      name: 'Drapeaux sur les questions',
      description: 'Ajoute un marqueur local sur la question et dans le sommaire latéral.',
      actions: [
        { id: 'toggle', label: 'Marquer / démarquer la question', default: [bind('ù')] },
        { id: 'nextFlag', label: 'Question marquée suivante', default: [bind('ù', { shift: true })] },
      ],
    },
    {
      id: 'asclepia.correctionFlags',
      site: 'asclepia',
      group: 'QCM',
      name: 'Drapeaux dans les corrections',
      description: 'Affiche les drapeaux mémorisés dans la vue Correction et le sommaire.',
      actions: [],
    },
    {
      id: 'asclepia.nav',
      site: 'asclepia',
      group: 'QCM',
      name: 'Question précédente / suivante',
      description: 'Navigue entre les questions de la page avec les flèches gauche et droite.',
      actions: [
        { id: 'prev', label: 'Question précédente', default: [bind('ArrowLeft')] },
        { id: 'next', label: 'Question suivante', default: [bind('ArrowRight')] },
      ],
    },
    {
      id: 'asclepia.keyHints',
      site: 'asclepia',
      group: 'QCM',
      name: 'Afficher les touches sur la page',
      description: 'Affiche un repère clavier à côté des propositions et boutons principaux.',
      enabledByDefault: false,
      actions: [],
    },
    {
      id: 'asclepia.inlineScores',
      site: 'asclepia',
      group: 'QCM',
      name: 'Scores colorés dans les questions',
      description: 'Colore les scores « X/Y » en vert, orange ou rouge.',
      actions: [],
    },
    {
      id: 'asclepia.scroll',
      site: 'asclepia',
      group: 'QCM',
      name: 'Défilement au clavier',
      description: 'Fait défiler les questions avec les flèches haut et bas.',
      actions: [
        { id: 'down', label: 'Descendre', default: [bind('ArrowDown')] },
        { id: 'up', label: 'Monter', default: [bind('ArrowUp')] },
      ],
      options: [
        { id: 'step', label: 'Pas de défilement (px)', type: 'number', default: 200, min: 50, max: 1000 },
      ],
    },
    {
      id: 'asclepia.anki',
      site: 'asclepia',
      group: 'Connecteur Anki EDN',
      name: 'Connecteur Anki EDN (Items & Corrections)',
      description: 'Ajoute des boutons et raccourcis pour ouvrir les cartes Anki EDN depuis les fiches item et corrections Asclepia.',
      actions: [
        { id: 'openActive', label: 'Ouvrir la question / fiche active dans Anki', default: [bind('a', { alt: true })] },
        { id: 'openErrors', label: 'Ouvrir uniquement les erreurs dans Anki', default: [bind('e', { alt: true })] },
      ],
      options: [
        { id: 'showButtons', label: 'Afficher les boutons Anki sur la page', type: 'boolean', default: true },
      ],
    },
    {
      id: 'uness.qroc',
      site: 'uness',
      group: 'QCM',
      name: 'QROC autofocus',
      description: 'Place automatiquement le curseur dans le champ texte de la question active dès la première frappe.',
      actions: [],
    },
    {
      id: 'uness.nav',
      site: 'uness',
      group: 'QCM',
      name: 'Question précédente / suivante',
      description: 'Navigue entre les questions visibles ou change de page avec les flèches gauche et droite.',
      actions: [
        { id: 'prev', label: 'Question / page précédente', default: [bind('ArrowLeft')] },
        { id: 'next', label: 'Question / page suivante', default: [bind('ArrowRight')] },
      ],
    },
    {
      id: 'uness.keyHints',
      site: 'uness',
      group: 'QCM',
      name: 'Afficher les touches sur la page',
      description: 'Affiche un repère clavier à côté des propositions de la question active.',
      enabledByDefault: false,
      actions: [],
    },
    {
      id: 'uness.favorite',
      site: 'uness',
      group: 'QCM',
      name: 'Mettre la question en favori',
      description: 'Active ou retire le favori UNESS sur la question active au clavier.',
      actions: [
        { id: 'toggle', label: 'Ajouter / retirer des favoris', default: [bind('*')] },
      ],
    },

    // Refoua (lié à edn.refouaLinks)
    {
      id: 'refoua.autoScroll',
      site: 'refoua',
      group: 'Cours',
      linkedTo: 'edn.refouaLinks',
      hidden: true,
      name: 'Défilement vers l\'objectif LiSA',
      description: 'Défile vers l\'objectif transmis dans l\'URL et le met en évidence.',
      actions: [],
    },
  ];

  const presets = {
    azerty: {
      label: 'AZERTY (PC)',
      shared: Object.fromEntries(sharedActions.map((a) => [a.id, a.default])),
      overrides: {},
    },
    qwerty: {
      label: 'QWERTY',
      shared: Object.fromEntries(
        sharedActions.map((a, idx) => [a.id, [bind(String((idx + 1) % 10))]])
      ),
      overrides: {
        'edn.training.correction': {
          unsure: [bind('u')],
          random: [bind('r')],
        },
        'edn.training.ancrage': {
          toggle: [bind('a')],
          noReview: [bind('n')],
        },
        'edn.timer': { toggle: [bind('t')] },
        'edn.exam.flags': {
          toggle: [bind('f')],
          nextFlag: [bind('f', { shift: true })],
          clearAll: [bind('f', { ctrl: true })],
        },
        'edn.sidebarScores': {
          clearNotes: [bind('n', { ctrl: true })],
        },
        'hypo.flags': {
          toggle: [bind('f')],
          nextFlag: [bind('f', { shift: true })],
          clearAll: [bind('f', { ctrl: true })],
        },
        'uness.flags': { toggle: [bind('f')] },
        'asclepia.flags': {
          toggle: [bind('f')],
          nextFlag: [bind('f', { shift: true })],
        },
      },
    },
    mac_azerty: {
      label: 'AZERTY (Mac)',
      shared: Object.fromEntries(sharedActions.map((a) => [a.id, a.default])),
      overrides: {
        'edn.timer': { toggle: [bind('@')] },
      },
    },
  };

  const byId = Object.fromEntries(features.map((f) => [f.id, f]));

  root.schema = {
    version: 1,
    sites,
    sharedActions,
    features,
    presets,
    byId,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = root.schema;
  }
})();

  /* --- src/core/storage.js --- */
(function () {
  'use strict';
  const root = (globalThis.QCMK = globalThis.QCMK || {});
  const schema = root.schema || (typeof require === 'function' ? require('./schema.js') : null);

  const STORAGE_KEY = 'qcmk_settings_v1';

  function cloneBindings(list) {
    if (!Array.isArray(list)) return [];
    return list
      .filter((b) => b && typeof b.key === 'string' && b.key.length > 0)
      .map((b) => {
        const out = { key: b.key };
        if (b.ctrl) out.ctrl = true;
        if (b.alt) out.alt = true;
        if (b.meta) out.meta = true;
        if (typeof b.shift === 'boolean') out.shift = b.shift;
        return out;
      });
  }

  function buildDefaults(presetName) {
    const presetKey = schema.presets[presetName] ? presetName : 'azerty';
    const preset = schema.presets[presetKey];

    const shared = {};
    for (const action of schema.sharedActions) {
      const presetList = preset.shared && preset.shared[action.id];
      shared[action.id] = cloneBindings(presetList || action.default);
    }

    const features = {};
    for (const feat of schema.features) {
      const actions = {};
      const featOverrides = (preset.overrides && preset.overrides[feat.id]) || {};
      for (const act of feat.actions || []) {
        const list = featOverrides[act.id] !== undefined ? featOverrides[act.id] : act.default;
        actions[act.id] = cloneBindings(list);
      }

      const options = {};
      for (const opt of feat.options || []) {
        options[opt.id] = opt.default;
      }

      features[feat.id] = {
        enabled: feat.enabledByDefault !== false,
        actions,
        options,
      };
    }

    return {
      version: schema.version,
      enabled: true,
      preset: presetKey,
      shared,
      features,
    };
  }

  function sanitizeOption(optDef, rawVal) {
    if (optDef.type === 'boolean') {
      return typeof rawVal === 'boolean' ? rawVal : optDef.default;
    }
    if (optDef.type === 'number') {
      const num = Number(rawVal);
      if (!Number.isFinite(num)) return optDef.default;
      const min = typeof optDef.min === 'number' ? optDef.min : -Infinity;
      const max = typeof optDef.max === 'number' ? optDef.max : Infinity;
      return Math.min(max, Math.max(min, Math.round(num)));
    }
    return optDef.default;
  }

  function mergeSettings(raw) {
    const base = buildDefaults((raw && raw.preset) || 'azerty');
    if (!raw || typeof raw !== 'object') return base;

    if (typeof raw.enabled === 'boolean') base.enabled = raw.enabled;

    if (raw.shared && typeof raw.shared === 'object') {
      for (const action of schema.sharedActions) {
        if (Array.isArray(raw.shared[action.id])) {
          base.shared[action.id] = cloneBindings(raw.shared[action.id]);
        }
      }
    }

    if (raw.features && typeof raw.features === 'object') {
      for (const feat of schema.features) {
        const storedFeat = raw.features[feat.id];
        if (!storedFeat || typeof storedFeat !== 'object') continue;
        const target = base.features[feat.id];

        if (typeof storedFeat.enabled === 'boolean') {
          target.enabled = storedFeat.enabled;
        }
        if (storedFeat.actions && typeof storedFeat.actions === 'object') {
          for (const act of feat.actions || []) {
            if (Array.isArray(storedFeat.actions[act.id])) {
              target.actions[act.id] = cloneBindings(storedFeat.actions[act.id]);
            }
          }
        }
        // Migrate legacy Alt+A / Alt+Shift+A / Alt+E / Alt+Shift+E defaults that conflicted with Firefox menus
        if (
          (feat.id === 'uness.anki' || feat.id === 'hypo.anki') &&
          target.actions.openActive &&
          target.actions.openActive.length === 1 &&
          target.actions.openActive[0].key === 'a' &&
          target.actions.openActive[0].alt === true &&
          !target.actions.openActive[0].ctrl &&
          !target.actions.openActive[0].meta
        ) {
          target.actions.openActive = [{ key: 'a' }];
        }
        if (
          feat.id === 'uness.anki' &&
          target.actions.openErrors &&
          target.actions.openErrors.length === 1 &&
          target.actions.openErrors[0].key === 'e' &&
          target.actions.openErrors[0].alt === true &&
          !target.actions.openErrors[0].ctrl &&
          !target.actions.openErrors[0].meta
        ) {
          target.actions.openErrors = [{ key: 'e' }];
        }
        if (storedFeat.options && typeof storedFeat.options === 'object') {
          for (const opt of feat.options || []) {
            if (Object.prototype.hasOwnProperty.call(storedFeat.options, opt.id)) {
              target.options[opt.id] = sanitizeOption(opt, storedFeat.options[opt.id]);
            }
          }
        }
      }
    }

    return base;
  }

  function getExtApi() {
    if (typeof browser !== 'undefined' && browser && browser.storage && browser.storage.local) {
      return browser;
    }
    if (typeof chrome !== 'undefined' && chrome && chrome.storage && chrome.storage.local) {
      return chrome;
    }
    return null;
  }

  function load() {
    const extApi = getExtApi();
    if (extApi) {
      return new Promise((resolve) => {
        let settled = false;
        const done = (res) => {
          if (settled) return;
          settled = true;
          resolve(mergeSettings(res && res[STORAGE_KEY]));
        };
        try {
          const maybePromise = extApi.storage.local.get([STORAGE_KEY], done);
          if (maybePromise && typeof maybePromise.then === 'function') {
            maybePromise.then(done, () => done(null));
          }
        } catch (_) {
          done(null);
        }
      });
    }

    // Userscript (GM_getValue) fallback
    if (typeof GM_getValue === 'function') {
      try {
        const raw = GM_getValue(STORAGE_KEY, null);
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return Promise.resolve(mergeSettings(parsed));
      } catch (_) {
        return Promise.resolve(buildDefaults('azerty'));
      }
    }

    // Page localStorage fallback
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      return Promise.resolve(mergeSettings(raw ? JSON.parse(raw) : null));
    } catch (_) {
      return Promise.resolve(buildDefaults('azerty'));
    }
  }

  function save(settings) {
    const clean = mergeSettings(settings);
    const extApi = getExtApi();
    if (extApi) {
      return new Promise((resolve) => {
        let settled = false;
        const done = () => {
          if (settled) return;
          settled = true;
          resolve(clean);
        };
        try {
          const maybePromise = extApi.storage.local.set({ [STORAGE_KEY]: clean }, done);
          if (maybePromise && typeof maybePromise.then === 'function') {
            maybePromise.then(done, done);
          }
        } catch (_) {
          done();
        }
      });
    }

    if (typeof GM_setValue === 'function') {
      try {
        GM_setValue(STORAGE_KEY, JSON.stringify(clean));
      } catch (_) {}
    } else {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
        }
      } catch (_) {}
    }

    if (typeof window !== 'undefined' && typeof CustomEvent === 'function') {
      window.dispatchEvent(new CustomEvent('qcmk:settings', { detail: clean }));
    }
    return Promise.resolve(clean);
  }

  function reset(presetName) {
    const fresh = buildDefaults(presetName || 'azerty');
    return save(fresh);
  }

  function exportJson(settings) {
    return JSON.stringify(mergeSettings(settings), null, 2);
  }

  function importJson(jsonStr) {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Format JSON invalide.');
    }
    if (!parsed.features && !parsed.shared) {
      throw new Error('Configuration QCM Clavier non reconnue.');
    }
    return mergeSettings(parsed);
  }

  function isFeatureEnabled(settings, featureId) {
    if (!settings || settings.enabled === false) return false;
    const def = schema.byId[featureId];
    if (def && def.linkedTo) {
      return isFeatureEnabled(settings, def.linkedTo);
    }
    const entry = settings.features && settings.features[featureId];
    if (!entry) return def ? def.enabledByDefault !== false : false;
    return entry.enabled !== false;
  }

  function getBindings(settings, featureId, actionId) {
    const entry = settings && settings.features && settings.features[featureId];
    if (entry && entry.actions && Array.isArray(entry.actions[actionId])) {
      return entry.actions[actionId];
    }
    const def = schema.byId[featureId];
    const act = def && (def.actions || []).find((a) => a.id === actionId);
    return act ? act.default : [];
  }

  function getSharedBindings(settings, actionId) {
    if (settings && settings.shared && Array.isArray(settings.shared[actionId])) {
      return settings.shared[actionId];
    }
    const def = schema.sharedActions.find((a) => a.id === actionId);
    return def ? def.default : [];
  }

  function getOption(settings, featureId, optionId) {
    const entry = settings && settings.features && settings.features[featureId];
    if (entry && entry.options && Object.prototype.hasOwnProperty.call(entry.options, optionId)) {
      return entry.options[optionId];
    }
    const def = schema.byId[featureId];
    const opt = def && (def.options || []).find((o) => o.id === optionId);
    return opt ? opt.default : undefined;
  }

  function onChange(cb) {
    const extApi = getExtApi();
    if (extApi && extApi.storage && extApi.storage.onChanged) {
      const listener = (changes, area) => {
        if (area === 'local' && changes[STORAGE_KEY]) {
          cb(mergeSettings(changes[STORAGE_KEY].newValue));
        }
      };
      extApi.storage.onChanged.addListener(listener);
      return () => extApi.storage.onChanged.removeListener(listener);
    }

    if (typeof window !== 'undefined') {
      const localListener = (ev) => {
        if (ev && ev.detail) cb(mergeSettings(ev.detail));
      };
      window.addEventListener('qcmk:settings', localListener);
      return () => window.removeEventListener('qcmk:settings', localListener);
    }
    return function () {};
  }

  root.storage = {
    STORAGE_KEY,
    buildDefaults,
    mergeSettings,
    load,
    save,
    reset,
    exportJson,
    importJson,
    isFeatureEnabled,
    getBindings,
    getSharedBindings,
    getOption,
    onChange,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = root.storage;
  }
})();

  /* --- src/core/keybind.js --- */
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

  /* --- src/core/dom.js --- */
(function () {
  'use strict';
  const root = (globalThis.QCMK = globalThis.QCMK || {});

  function isVisible(el) {
    if (!el || el.nodeType !== 1) return false;
    const style = typeof getComputedStyle === 'function' ? getComputedStyle(el) : null;
    if (style) {
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return false;
      }
    }
    const rect = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    if (!rect) return true;
    return rect.width > 0 && rect.height > 0;
  }

  function normText(str) {
    return String(str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function findButtonByText(rootEl, patterns) {
    const scope = rootEl || document;
    const candidates = scope.querySelectorAll('button, a[role="button"], input[type="submit"], input[type="button"], [role="button"]');
    const list = Array.isArray(patterns) ? patterns : [patterns];

    for (let p = 0; p < list.length; p++) {
      const pat = list[p];
      for (let i = 0; i < candidates.length; i++) {
        const el = candidates[i];
        if (el.disabled || !isVisible(el)) continue;
        const txt = normText(el.value || el.textContent || el.getAttribute('aria-label') || '');
        if (!txt) continue;
        if (pat instanceof RegExp ? pat.test(txt) : txt.includes(normText(pat))) {
          return el;
        }
      }
    }
    return null;
  }

  function findActiveContainer(containers, strategy) {
    const visible = [];
    for (let i = 0; i < containers.length; i++) {
      const el = containers[i];
      if (!isVisible(el)) continue;
      const rect = el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) continue;
      visible.push({ el, rect });
    }
    if (visible.length === 0) return null;

    if (strategy === 'center') {
      const mid = window.innerHeight / 2;
      let best = visible[0];
      let bestDist = Infinity;
      for (const item of visible) {
        const center = (item.rect.top + item.rect.bottom) / 2;
        const dist = Math.abs(center - mid);
        if (dist < bestDist) {
          bestDist = dist;
          best = item;
        }
      }
      return best.el;
    }

    // Default 'top': highest visible container with meaningful viewport presence
    visible.sort((a, b) => {
      const aScore = a.rect.top >= -40 ? a.rect.top : 10000 - a.rect.bottom;
      const bScore = b.rect.top >= -40 ? b.rect.top : 10000 - b.rect.bottom;
      return aScore - bScore;
    });
    return visible[0].el;
  }

  function findScrollContainer(preferredSelectors) {
    if (Array.isArray(preferredSelectors)) {
      for (const sel of preferredSelectors) {
        const el = document.querySelector(sel);
        if (el && isVisible(el) && el.scrollHeight > el.clientHeight + 20) {
          return el;
        }
      }
    }
    const docEl = document.scrollingElement || document.documentElement;
    if (docEl && docEl.scrollHeight > window.innerHeight + 10) {
      return docEl;
    }
    const candidates = document.querySelectorAll('main, [role="main"], .scroll, .overflow-y-auto, .overflow-auto');
    let best = docEl;
    let bestHeight = 0;
    for (let i = 0; i < candidates.length; i++) {
      const el = candidates[i];
      if (!isVisible(el)) continue;
      const style = getComputedStyle(el);
      if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 20) {
        if (el.clientHeight > bestHeight) {
          bestHeight = el.clientHeight;
          best = el;
        }
      }
    }
    return best;
  }

  function scrollByStep(container, deltaY, smooth) {
    const target = container || document.scrollingElement || document.documentElement;
    const behavior = smooth ? 'smooth' : 'auto';
    if (target === document.documentElement || target === document.body) {
      window.scrollBy({ top: deltaY, behavior });
    } else if (target && typeof target.scrollBy === 'function') {
      target.scrollBy({ top: deltaY, behavior });
    } else if (target) {
      target.scrollTop += deltaY;
    }
  }

  function safeClick(el) {
    if (!el) return false;
    try {
      if (typeof el.scrollIntoView === 'function') {
        const rect = el.getBoundingClientRect();
        if (rect.top < 0 || rect.bottom > window.innerHeight) {
          el.scrollIntoView({ block: 'nearest', behavior: 'auto' });
        }
      }
      el.click();
      return true;
    } catch (_) {
      return false;
    }
  }

  let toastTimer = null;
  function showToast(message) {
    if (typeof document === 'undefined' || !document.body) return;
    let el = document.getElementById('qcmk-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'qcmk-toast';
      Object.assign(el.style, {
        position: 'fixed',
        right: '16px',
        bottom: '16px',
        zIndex: '2147483647',
        background: '#18181b',
        color: '#fafafa',
        border: '1px solid #3f3f46',
        borderRadius: '6px',
        padding: '8px 12px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: '13px',
        lineHeight: '1.3',
        pointerEvents: 'none',
        opacity: '0',
        transition: 'opacity 120ms ease',
      });
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.style.opacity = '1';
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      if (el) el.style.opacity = '0';
    }, 1600);
  }

  function injectStyle(id, cssText) {
    if (typeof document === 'undefined') return null;
    let el = document.getElementById(id);
    if (!cssText) {
      if (el) el.remove();
      return null;
    }
    if (!el) {
      el = document.createElement('style');
      el.id = id;
      (document.head || document.documentElement).appendChild(el);
    }
    if (el.textContent !== cssText) el.textContent = cssText;
    return el;
  }

  class FlagStore {
    constructor(namespace) {
      this.prefix = 'qcmk_flags_' + namespace + '_';
    }
    _read(examKey) {
      try {
        const raw = localStorage.getItem(this.prefix + examKey);
        const arr = raw ? JSON.parse(raw) : [];
        return new Set(Array.isArray(arr) ? arr.map(String) : []);
      } catch (_) {
        return new Set();
      }
    }
    _write(examKey, set) {
      try {
        localStorage.setItem(this.prefix + examKey, JSON.stringify(Array.from(set)));
      } catch (_) {}
    }
    getFlags(examKey) {
      return this._read(examKey);
    }
    toggleFlag(examKey, qKey) {
      const set = this._read(examKey);
      const id = String(qKey);
      const added = !set.has(id);
      if (added) set.add(id);
      else set.delete(id);
      this._write(examKey, set);
      return { added, flags: set };
    }
    clearFlags(examKey) {
      try {
        localStorage.removeItem(this.prefix + examKey);
      } catch (_) {}
    }
  }

  function clearKeyHints() {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('.qcmk-hint').forEach((n) => n.remove());
  }

  function renderKeyHints(items) {
    clearKeyHints();
    if (!Array.isArray(items) || items.length === 0) return;

    injectStyle(
      'qcmk-hint-style',
      '.qcmk-hint{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;margin-left:6px;border-radius:4px;border:1px solid #d4d4d8;background:#f4f4f5;color:#18181b;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;font-weight:600;line-height:1;vertical-align:middle;pointer-events:none;}'
    );

    for (const item of items) {
      if (!item || !item.el || !item.label || !isVisible(item.el)) continue;
      if (item.el.querySelector('.qcmk-hint')) continue;
      const kbd = document.createElement('kbd');
      kbd.className = 'qcmk-hint';
      kbd.textContent = item.label;
      if (item.el.tagName === 'INPUT') {
        item.el.insertAdjacentElement('afterend', kbd);
      } else {
        item.el.appendChild(kbd);
      }
    }
  }

  root.dom = {
    isVisible,
    normText,
    findButtonByText,
    findActiveContainer,
    findScrollContainer,
    scrollByStep,
    safeClick,
    showToast,
    injectStyle,
    FlagStore,
    renderKeyHints,
    clearKeyHints,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = root.dom;
  }
})();

  /* --- src/core/anki_connector.js --- */
(function () {
  'use strict';
  const root = (globalThis.QCMK = globalThis.QCMK || {});

  const URI_SCHEME = 'anki-edn';
  const MAX_URI_LENGTH = 1536;
  const MAX_OIC_COUNT = 25;
  const MAX_ITEM_COUNT = 10;
  const MAX_SDD_COUNT = 10;
  const MAX_QID_COUNT = 25;
  const MAX_NID_COUNT = 40;
  const MAX_QUERY_TERMS = 6;
  const MAX_NOTE_LENGTH = 240;

  const OIC_REGEX = /^(?:OIC(?:::|[-_]))?(\d{1,3})[-_](\d{1,3})[-_]([ABab])(?:[-_]\d{1,3})?$/;
  const ITEM_REGEX = /^(?:item[-_]?|IC[-_]?)?(\d{1,3})$/i;
  const SDD_REGEX = /^(?:SDD[-_:]?|SD[-_:]?)?(\d{1,3})$/i;
  const RANG_REGEX = /^[ABab]$/;
  const QID_REGEX = /^[a-z0-9_-]{2,16}:[a-z0-9_-]{1,12}:[a-z0-9_-]{1,32}$/;
  const NID_REGEX = /^\d{10,16}$/;
  const TERM_REGEX = /^[A-Za-z0-9\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF_-]{3,40}$/;
  const ALLOWED_ACTIONS = ['lisa', 'qcm', 'item', 'open'];
  const ALLOWED_MODES = ['browse', 'actions', 'unsuspend', 'forget', 'unsuspend_forget', 'error_note'];
  const ALLOWED_SOURCES = ['lisa', 'uness', 'qcm', 'edn', 'hypocampus', 'asclepia'];

  // Liste de mots vides français et vocabulaire docimologique QCM à écarter des requêtes
  const STOPWORDS = new Set([
    'alors', 'apres', 'aucun', 'aucune', 'aussi', 'autre', 'autres', 'avant', 'avec', 'avoir',
    'bilan', 'bonne', 'bonnes', 'cas', 'ceci', 'cela', 'celle', 'celles', 'celui', 'cependant',
    'certain', 'certaine', 'certaines', 'certains', 'cette', 'ceux', 'chaque', 'charge', 'chez',
    'choix', 'clinique', 'cliniques', 'comme', 'comment', 'complémentaire', 'complementaire',
    'complementaires', 'connaitre', 'consulte', 'correct', 'correcte', 'correctes', 'correction',
    'dans', 'depuis', 'devant', 'diagnostic', 'diagnostics', 'doit', 'doivent', 'donc', 'dont',
    'dose', 'doses', 'element', 'elements', 'elle', 'elles', 'encore', 'entre', 'erreur', 'erreurs',
    'etaient', 'etait', 'etant', 'etre', 'exact', 'exacte', 'exactes', 'examen', 'examens',
    'faire', 'fait', 'faite', 'faites', 'fausse', 'fausses', 'faut', 'fois', 'forme', 'formes',
    'generalement', 'heure', 'heures', 'hors', 'indique', 'indiquee', 'indispensable', 'intention',
    'item', 'items', 'jamais', 'jour', 'jours', 'lequel', 'laquelle', 'lesquelles', 'lesquels',
    'leur', 'leurs', 'lors', 'mais', 'maladie', 'maladies', 'mauvaise', 'mauvaises', 'meme', 'memes',
    'moins', 'mois', 'moyen', 'moyens', 'niveau', 'notamment', 'note', 'noter', 'notion', 'notions',
    'nous', 'objectif', 'objectifs', 'parce', 'parfois', 'parmi', 'pathologie', 'pathologies',
    'patient', 'patiente', 'patients', 'pendant', 'permet', 'personne', 'personnes', 'peut',
    'peuvent', 'plus', 'plusieurs', 'point', 'points', 'pour', 'pourquoi', 'premier', 'premiere',
    'pres', 'present', 'presente', 'presentent', 'principal', 'principale', 'principales',
    'principaux', 'prise', 'proposition', 'propositions', 'quand', 'quel', 'quelle', 'quelles',
    'quels', 'question', 'questions', 'quoi', 'rang', 'reponse', 'reponses', 'sans', 'savoir',
    'semaine', 'semaines', 'sera', 'seront', 'seulement', 'signe', 'signes', 'situation',
    'situations', 'soit', 'sont', 'souvent', 'sous', 'stade', 'sujet', 'suivant', 'suivante',
    'suivantes', 'suivants', 'syndrome', 'tandis', 'taux', 'tels', 'telles', 'toujours', 'tous',
    'tout', 'toute', 'toutes', 'toutefois', 'traitement', 'traitements', 'tres', 'trop', 'trouble',
    'troubles', 'type', 'types', 'valeur', 'valeurs', 'voient', 'vont', 'votre', 'vous', 'vraie',
    'vraies', 'vrais', 'annee', 'annees', 'ans', 'age', 'agee', 'chez', 'femme', 'homme', 'enfant',
    'adulte', 'sujets', 'indication', 'indications', 'prise', 'enfin', 'ainsi', 'donnee', 'donnees',
  ]);

  function padNumber(num, size) {
    let s = String(num);
    while (s.length < size) s = '0' + s;
    return s;
  }

  function foldAccents(str) {
    return String(str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function sanitizeNoteText(rawText) {
    if (!rawText || typeof rawText !== 'string') return '';
    let cleaned = rawText
      .replace(/[\x00-\x1f\x7f]+/g, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleaned.length > MAX_NOTE_LENGTH) {
      cleaned = cleaned.slice(0, MAX_NOTE_LENGTH - 3).trim() + '...';
    }
    return cleaned;
  }

  function normalizeOic(rawOic) {
    if (!rawOic || typeof rawOic !== 'string') return null;
    const m = OIC_REGEX.exec(rawOic.trim());
    if (!m) return null;
    const itemNum = parseInt(m[1], 10);
    const objNum = parseInt(m[2], 10);
    const rang = m[3].toUpperCase();
    if (itemNum < 1 || itemNum > 367 || objNum < 1 || objNum > 99) return null;
    return padNumber(itemNum, 3) + '-' + padNumber(objNum, 2) + '-' + rang;
  }

  function normalizeItem(rawItem) {
    if (rawItem === null || rawItem === undefined) return null;
    const m = ITEM_REGEX.exec(String(rawItem).trim());
    if (!m) return null;
    const num = parseInt(m[1], 10);
    if (num < 1 || num > 367) return null;
    return padNumber(num, 3);
  }

  function normalizeSdd(rawSdd) {
    if (rawSdd === null || rawSdd === undefined) return null;
    const m = SDD_REGEX.exec(String(rawSdd).trim());
    if (!m) return null;
    const num = parseInt(m[1], 10);
    if (num < 1 || num > 356) return null;
    return padNumber(num, 3);
  }

  function normalizeQid(rawQid) {
    if (!rawQid || typeof rawQid !== 'string') return null;
    const token = rawQid.trim().toLowerCase();
    return QID_REGEX.test(token) ? token : null;
  }

  function normalizeNid(rawNid) {
    if (rawNid === null || rawNid === undefined) return null;
    const token = String(rawNid).trim();
    return NID_REGEX.test(token) ? token : null;
  }

  function normalizeQueryTerm(rawTerm) {
    if (!rawTerm || typeof rawTerm !== 'string') return null;
    const token = rawTerm.trim();
    if (!TERM_REGEX.test(token)) return null;
    const lowerFolded = foldAccents(token).toLowerCase();
    if (lowerFolded === 'and' || lowerFolded === 'or' || lowerFolded === 'not') return null;
    return token;
  }

  function extractMedicalKeywords(text, maxTerms) {
    const limit = typeof maxTerms === 'number' && maxTerms > 0 ? Math.min(maxTerms, MAX_QUERY_TERMS) : 5;
    if (!text || typeof text !== 'string') return [];
    const plain = text.replace(/<[^>]+>/g, ' ');
    const rawWords = plain.match(/[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF0-9-]{3,40}/g) || [];
    const seen = new Set();
    const scored = [];

    for (let i = 0; i < rawWords.length; i++) {
      const w = rawWords[i].replace(/^-+|-+$/g, '');
      if (!w || w.length < 3 || /^\d+$/.test(w)) continue;
      if (!TERM_REGEX.test(w)) continue;
      const folded = foldAccents(w).toLowerCase();
      if (folded.length < 3 || STOPWORDS.has(folded)) continue;
      if (seen.has(folded)) continue;
      seen.add(folded);
      // Privilégie les termes longs / techniques
      scored.push({ token: w.toLowerCase(), weight: folded.length });
    }

    scored.sort((a, b) => b.weight - a.weight);
    return scored.slice(0, limit).map((item) => item.token);
  }

  function collectValidList(rawInput, normalizer, maxCount) {
    let arr = [];
    if (Array.isArray(rawInput)) {
      arr = rawInput;
    } else if (rawInput !== undefined && rawInput !== null) {
      arr = String(rawInput).split(/[,;|\s]+/);
    }
    const out = [];
    for (let i = 0; i < arr.length && out.length < maxCount; i++) {
      const norm = normalizer(arr[i]);
      if (norm && out.indexOf(norm) === -1) out.push(norm);
    }
    return out;
  }

  function buildAnkiEdnUri(options) {
    if (!options || typeof options !== 'object') return null;

    let action = String(options.action || 'open').toLowerCase();
    if (ALLOWED_ACTIONS.indexOf(action) === -1) action = 'open';

    const validOics = collectValidList(options.oic || options.oics, normalizeOic, MAX_OIC_COUNT);
    const validItems = collectValidList(options.item || options.items, normalizeItem, MAX_ITEM_COUNT);
    const validSdds = collectValidList(options.sdd || options.sdds, normalizeSdd, MAX_SDD_COUNT);
    const validQids = collectValidList(options.qid || options.qids, normalizeQid, MAX_QID_COUNT);
    const validNids = collectValidList(options.nid || options.nids, normalizeNid, MAX_NID_COUNT);
    let validTerms = collectValidList(options.q || options.terms, normalizeQueryTerm, MAX_QUERY_TERMS);

    if (
      validOics.length === 0 &&
      validItems.length === 0 &&
      validSdds.length === 0 &&
      validQids.length === 0 &&
      validNids.length === 0 &&
      validTerms.length === 0
    ) {
      return null;
    }

    const buildQuery = (termsSubset, errVal) => {
      const parts = [];
      if (validOics.length > 0) parts.push('oic=' + encodeURIComponent(validOics.join(',')));
      if (validItems.length > 0) parts.push('item=' + encodeURIComponent(validItems.join(',')));
      if (options.rang && RANG_REGEX.test(String(options.rang).trim())) {
        parts.push('rang=' + encodeURIComponent(String(options.rang).trim().toUpperCase()));
      }
      if (validSdds.length > 0) parts.push('sdd=' + encodeURIComponent(validSdds.join(',')));
      if (validQids.length > 0) parts.push('qid=' + encodeURIComponent(validQids.join(',')));
      if (validNids.length > 0) parts.push('nid=' + encodeURIComponent(validNids.join(',')));
      if (termsSubset.length > 0) parts.push('q=' + encodeURIComponent(termsSubset.join(',')));

      const src = options.src ? String(options.src).trim().toLowerCase() : '';
      if (src && ALLOWED_SOURCES.indexOf(src) !== -1) {
        parts.push('src=' + encodeURIComponent(src));
      }

      const mode = options.mode ? String(options.mode).trim().toLowerCase() : 'browse';
      if (mode !== 'browse' && ALLOWED_MODES.indexOf(mode) !== -1) {
        parts.push('mode=' + encodeURIComponent(mode));
      }

      if (errVal) {
        parts.push('err=' + encodeURIComponent(errVal));
      }

      return URI_SCHEME + '://' + action + '?' + parts.join('&');
    };

    let errText = sanitizeNoteText(options.err || options.note || '');
    let fullUri = buildQuery(validTerms, errText);

    if (fullUri.length > MAX_URI_LENGTH && errText) {
      errText = '';
      fullUri = buildQuery(validTerms, '');
      const budget = MAX_URI_LENGTH - 12 - fullUri.length;
      if (budget > 12) {
        const rawErr = sanitizeNoteText(options.err || options.note || '');
        errText = rawErr.slice(0, Math.min(rawErr.length, Math.floor(budget / 3))).trim();
        if (errText) fullUri = buildQuery(validTerms, errText);
      }
    }

    while (fullUri.length > MAX_URI_LENGTH && validTerms.length > 1) {
      validTerms = validTerms.slice(0, validTerms.length - 1);
      fullUri = buildQuery(validTerms, errText);
    }

    if (fullUri.length > MAX_URI_LENGTH) {
      return fullUri.slice(0, MAX_URI_LENGTH);
    }
    return fullUri;
  }

  function launchAnkiUri(uri, feedbackLabel) {
    if (!uri || uri.indexOf(URI_SCHEME + '://') !== 0 || typeof document === 'undefined') {
      return false;
    }

    let triggered = false;
    if (typeof window !== 'undefined' && window.location && typeof window.location.assign === 'function') {
      try {
        window.location.assign(uri);
        triggered = true;
      } catch (_) {}
    }

    if (!triggered) {
      const a = document.createElement('a');
      a.href = uri;
      a.style.display = 'none';
      (document.body || document.documentElement).appendChild(a);
      a.click();
      a.remove();
    }

    if (root.dom && typeof root.dom.showToast === 'function') {
      root.dom.showToast(feedbackLabel || 'Ouverture dans Anki EDN...');
    }
    return true;
  }

  function ensureStyles() {
    if (!root.dom || typeof root.dom.injectStyle !== 'function') return;
    root.dom.injectStyle(
      'qcmk-anki-connector-css',
      [
        '.qcmk-anki-bar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;margin:10px 0;padding:8px 12px;border:1px solid #d4d4d8;border-radius:6px;background:#ffffff;color:#18181b;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:13px;}',
        '.qcmk-anki-bar-title{font-weight:600;color:#18181b;font-size:13px;}',
        '.qcmk-anki-bar-actions{display:flex;flex-wrap:wrap;align-items:center;gap:6px;}',
        '.qcmk-anki-q-bar{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:8px;padding-top:8px;border-top:1px solid #e4e4e7;}',
        '.qcmk-anki-btn{display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border:1px solid #d4d4d8;border-radius:4px;background:#f4f4f5;color:#18181b;font-size:12px;font-weight:500;line-height:1.2;text-decoration:none;cursor:pointer;}',
        '.qcmk-anki-btn:hover{background:#e4e4e7;border-color:#1b4f9c;color:#18181b;}',
        '.qcmk-anki-btn--primary{background:#1b4f9c;border-color:#1b4f9c;color:#ffffff;}',
        '.qcmk-anki-btn--primary:hover{background:#143c78;border-color:#143c78;color:#ffffff;}',
        '.qcmk-anki-btn--compact{padding:3px 7px;font-size:11.5px;}',
        '.qcmk-anki-btn:disabled,.qcmk-anki-btn[aria-disabled="true"]{opacity:0.45;cursor:not-allowed;pointer-events:none;}',
        '.qcmk-anki-inline-link{display:inline-block;margin-left:5px;padding:1px 5px;border:1px solid #d4d4d8;border-radius:4px;background:#f4f4f5;color:#1b4f9c;font-size:11px;font-weight:600;text-decoration:none;cursor:pointer;vertical-align:middle;}',
        '.qcmk-anki-inline-link:hover{background:#e4e4e7;border-color:#1b4f9c;}',
      ].join('')
    );
  }

  function createAnkiButton(opts) {
    ensureStyles();
    const cfg = opts || {};
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'qcmk-anki-btn'
      + (cfg.primary ? ' qcmk-anki-btn--primary' : '')
      + (cfg.compact ? ' qcmk-anki-btn--compact' : '');
    btn.textContent = cfg.label || 'Ouvrir dans Anki';
    if (cfg.title) btn.title = cfg.title;
    if (cfg.uri) btn.setAttribute('data-anki-uri', cfg.uri);
    if (cfg.disabled) {
      btn.disabled = true;
      btn.setAttribute('aria-disabled', 'true');
    }
    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (btn.disabled) return;
      if (typeof cfg.onClick === 'function') {
        cfg.onClick(ev);
      } else if (cfg.uri) {
        launchAnkiUri(cfg.uri, cfg.toast || cfg.label);
      }
    });
    return btn;
  }

  root.anki = {
    URI_SCHEME,
    MAX_URI_LENGTH,
    normalizeOic,
    normalizeItem,
    normalizeSdd,
    normalizeQid,
    normalizeNid,
    normalizeQueryTerm,
    extractMedicalKeywords,
    buildAnkiEdnUri,
    launchAnkiUri,
    ensureStyles,
    createAnkiButton,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = root.anki;
  }
})();

  /* --- src/adapters/edn.js --- */
(function () {
  'use strict';
  const root = (globalThis.QCMK = globalThis.QCMK || {});
  const adapters = (root.adapters = root.adapters || {});

  function createEdnAdapter() {
    const dom = root.dom;
    const kb = root.keybind;
    const flagStore = new dom.FlagStore('edn');
    const NOTE_STORE_PREFIX = 'qcmk_edn_notes_';
    let lastCtx = null;
    let resizeHandler = null;
    let activeMatiereFilter = '';
    let activeRankFilter = 'ALL';
    let activeSortMode = 'orig';

    function getAnki() {
      return root.anki || null;
    }

    function detectMode() {
      const path = (location.pathname || '').toLowerCase();
      if (/ancrage/.test(path) || document.querySelector('app-knowledge-anchoring')) return 'ancrage';
      if (/notions/.test(path) || document.querySelector('app-training-knowledge-review')) return 'notions';
      if (/\/fiche\b/.test(path) || document.querySelector('app-course-record')) return 'fiche';
      if (/exam|annale|concours|epreuve/.test(path) || document.querySelector('app-exam-content-correction, app-exam-detail')) return 'exam';
      if (/training|entrainement/.test(path)) return 'training';
      const qCards = document.querySelectorAll('app-question-header, app-question-header-legacy, [data-question-id], .question-card, .question-container, [id^="question-"]');
      if (qCards.length > 1) return 'exam';
      return 'training';
    }

    function getExamKey() {
      return (location.pathname || '/').replace(/\/+$/, '') || 'default';
    }

    function getQuestionContainers() {
      const formNodes = Array.from(document.querySelectorAll('app-question-correction-form, app-question-correction-form-legacy, app-question-header, app-question-header-legacy'))
        .filter((el) => dom.isVisible(el));
      if (formNodes.length > 0) {
        const wrappers = [];
        const seen = new Set();
        for (const fn of formNodes) {
          const wrap = fn.closest('[data-question-id], [id^="question-"], .question-card, .question-container, app-question, div.mb-6, div.rounded-lg, section, article') || fn.parentElement;
          if (wrap && !seen.has(wrap)) {
            seen.add(wrap);
            wrappers.push(wrap);
          }
        }
        if (wrappers.length > 0) return wrappers;
      }

      const selectors = [
        '[data-question-id]',
        '[id^="question-"]',
        '.question-card',
        '.question-container',
        'article',
      ];
      for (const sel of selectors) {
        const list = Array.from(document.querySelectorAll(sel)).filter((el) => dom.isVisible(el));
        if (list.length > 0) return list;
      }
      return [document.body];
    }

    function getActiveQuestion(mode) {
      const containers = getQuestionContainers();
      if (containers.length === 1) return containers[0];
      return dom.findActiveContainer(containers, mode === 'exam' ? 'center' : 'top') || document.body;
    }

    function getChoiceTargets(scope) {
      const rootEl = scope || document;
      const inputs = Array.from(rootEl.querySelectorAll('input[type="checkbox"], input[type="radio"]')).filter((el) => {
        if (el.disabled) return false;
        const label = el.closest('label') || el.parentElement;
        return dom.isVisible(el) || (label && dom.isVisible(label));
      });
      if (inputs.length > 0) {
        return inputs.map((input) => input.closest('label') || input);
      }

      const buttons = Array.from(
        rootEl.querySelectorAll('[role="checkbox"], [role="radio"], button[data-choice], .choice-item, .proposition-item, li button')
      ).filter((el) => dom.isVisible(el) && !el.disabled);
      if (buttons.length > 0) return buttons;

      const candidates = Array.from(rootEl.querySelectorAll('label, [role="button"], button, li')).filter((el) => {
        if (!dom.isVisible(el) || el.disabled) return false;
        const txt = (el.textContent || '').trim();
        return /^[A-J][\s.):\-]+/.test(txt);
      });
      return candidates.slice(0, 10);
    }

    function findQrocInput(scope) {
      const rootEl = scope || document;
      const fields = Array.from(rootEl.querySelectorAll('textarea, input[type="text"], input:not([type]), [contenteditable="true"]'))
        .filter((el) => !el.disabled && !el.readOnly && dom.isVisible(el));
      return fields[0] || null;
    }

    function findTimerButton() {
      const candidates = Array.from(document.querySelectorAll('button, [role="button"]')).filter((el) => dom.isVisible(el));
      for (const el of candidates) {
        const txt = (el.textContent || '').trim();
        const aria = dom.normText(el.getAttribute('aria-label') || el.getAttribute('title') || '');
        if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(txt) || /minuteur|chrono|timer|pause/.test(aria)) {
          return el;
        }
      }
      return null;
    }

    function toggleHalfScreenStyle(ctx) {
      const enabled = ctx.isEnabled('edn.training.halfscreen') && detectMode() === 'training' && window.innerWidth <= 920;
      if (!enabled) {
        dom.injectStyle('qcmk-edn-halfscreen', '');
        return;
      }
      dom.injectStyle(
        'qcmk-edn-halfscreen',
        '@media (max-width:920px){header,.training-header,[class*="TrainingHeader"]{padding-top:4px!important;padding-bottom:4px!important;min-height:unset!important;}[class*="progress"],[class*="Progress"]{margin-bottom:4px!important;}}'
      );
    }

    function applyInlineScores(ctx) {
      const enabled = ctx.isEnabled('edn.inlineScores');
      document.querySelectorAll('.qcmk-score-badge').forEach((n) => n.classList.remove('qcmk-score-badge', 'qcmk-score-good', 'qcmk-score-mid', 'qcmk-score-low'));
      if (!enabled) {
        dom.injectStyle('qcmk-edn-scores-css', '');
        return;
      }
      dom.injectStyle(
        'qcmk-edn-scores-css',
        '.qcmk-score-good{color:#15803d!important;font-weight:600!important;}.qcmk-score-mid{color:#b45309!important;font-weight:600!important;}.qcmk-score-low{color:#b91c1c!important;font-weight:600!important;}'
      );

      const nodes = document.querySelectorAll('span, div, p, strong, badge');
      for (let i = 0; i < nodes.length; i++) {
        const el = nodes[i];
        if (el.children.length > 0 || !dom.isVisible(el)) continue;
        const m = (el.textContent || '').trim().match(/^(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)\s*pts?$/i);
        if (!m) continue;
        const got = parseFloat(m[1].replace(',', '.'));
        const max = parseFloat(m[2].replace(',', '.'));
        if (!max) continue;
        const ratio = got / max;
        const cls = ratio >= 0.8 ? 'qcmk-score-good' : ratio >= 0.5 ? 'qcmk-score-mid' : 'qcmk-score-low';
        el.classList.add('qcmk-score-badge', cls);
      }
    }

    function getSidebarItems() {
      return Array.from(
        document.querySelectorAll('aside a, nav a, [class*="sidebar"] button, [class*="Sidebar"] button, [class*="nav"] button')
      ).filter((el) => {
        if (!dom.isVisible(el)) return false;
        const txt = (el.textContent || '').trim();
        return /^Q?\d{1,3}$/.test(txt);
      });
    }

    function applySidebarScores(ctx) {
      const enabled = ctx.isEnabled('edn.sidebarScores');
      const oldBadge = document.getElementById('qcmk-dossier-score');
      if (oldBadge) oldBadge.remove();
      if (!enabled) return;

      const examKey = NOTE_STORE_PREFIX + getExamKey();
      let notes = {};
      try {
        notes = JSON.parse(localStorage.getItem(examKey) || '{}');
      } catch (_) {
        notes = {};
      }

      const containers = getQuestionContainers();
      let totalGot = 0;
      let totalMax = 0;
      containers.forEach((q, idx) => {
        const txt = q.textContent || '';
        const m = txt.match(/(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)\s*pts?/i);
        if (m) {
          const got = parseFloat(m[1].replace(',', '.'));
          const max = parseFloat(m[2].replace(',', '.'));
          if (max > 0) {
            notes[String(idx + 1)] = { got, max };
          }
        }
      });
      try {
        localStorage.setItem(examKey, JSON.stringify(notes));
      } catch (_) {}

      const entries = Object.entries(notes);
      for (const [, v] of entries) {
        totalGot += v.got;
        totalMax += v.max;
      }

      const sidebarItems = getSidebarItems();
      sidebarItems.forEach((item) => {
        const num = (item.textContent || '').replace(/\D/g, '');
        const entry = notes[num];
        if (!entry) return;
        const ratio = entry.got / entry.max;
        item.style.borderColor = ratio >= 0.8 ? '#15803d' : ratio >= 0.5 ? '#b45309' : '#b91c1c';
        item.style.borderWidth = '2px';
        item.style.borderStyle = 'solid';
      });

      if (ctx.option('edn.sidebarScores', 'showBadge') && totalMax > 0 && sidebarItems.length > 0) {
        const parent = sidebarItems[0].closest('aside, nav, [class*="sidebar"], [class*="Sidebar"]');
        if (parent) {
          const badge = document.createElement('div');
          badge.id = 'qcmk-dossier-score';
          Object.assign(badge.style, {
            margin: '8px 0',
            padding: '6px 10px',
            borderRadius: '6px',
            border: '1px solid #d4d4d8',
            background: '#f4f4f5',
            color: '#18181b',
            fontSize: '12px',
            fontWeight: '600',
          });
          const pct = Math.round((totalGot / totalMax) * 100);
          badge.textContent = 'Score dossier : ' + totalGot.toFixed(1).replace(/\.0$/, '') + ' / ' + totalMax.toFixed(1).replace(/\.0$/, '') + ' (' + pct + '%)';
          parent.prepend(badge);
        }
      }
    }

    function renderFlags(ctx) {
      document.querySelectorAll('.qcmk-flag-pill').forEach((n) => n.remove());
      if (!ctx.isEnabled('edn.exam.flags') || detectMode() !== 'exam') return;

      const flags = flagStore.getFlags(getExamKey());
      const containers = getQuestionContainers();
      containers.forEach((q, idx) => {
        const qid = q.getAttribute('data-question-id') || q.id || String(idx + 1);
        if (!flags.has(qid) && !flags.has(String(idx + 1))) return;
        const pill = document.createElement('span');
        pill.className = 'qcmk-flag-pill';
        pill.textContent = 'Drapeau';
        Object.assign(pill.style, {
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
        const heading = q.querySelector('h1, h2, h3, h4, app-question-header, app-question-header-legacy, .question-title, header') || q;
        heading.appendChild(pill);
      });

      const sidebarItems = getSidebarItems();
      sidebarItems.forEach((item) => {
        const num = (item.textContent || '').replace(/\D/g, '');
        if (flags.has(num)) {
          item.style.outline = '2px solid #b91c1c';
          item.style.outlineOffset = '1px';
        } else {
          item.style.outline = '';
        }
      });
    }

    function jumpToNextFlag(activeQ) {
      const flags = flagStore.getFlags(getExamKey());
      const containers = getQuestionContainers();
      const flagged = containers.filter((q, idx) => {
        const qid = q.getAttribute('data-question-id') || q.id || String(idx + 1);
        return flags.has(qid) || flags.has(String(idx + 1));
      });
      if (flagged.length === 0) {
        dom.showToast('Aucune question marquée');
        return false;
      }
      const curIdx = flagged.indexOf(activeQ);
      const nextEl = flagged[(curIdx + 1) % flagged.length];
      nextEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      dom.showToast('Question marquée suivante');
      return true;
    }

    function applyRefouaLinks(ctx) {
      if (!ctx.isEnabled('edn.refouaLinks')) return;
      const tags = document.querySelectorAll('span, div, a, button, badge');
      for (let i = 0; i < tags.length; i++) {
        const el = tags[i];
        if (el.dataset.qcmkRefouaBound || el.children.length > 0 || !dom.isVisible(el)) continue;
        const txt = (el.textContent || '').trim();
        const match = txt.match(/\b(Rang\s*[ABC]\s*[-:–]?\s*[A-Za-z0-9\-_. ]{2,80})/i) || txt.match(/\b(OIC-\d{3}-\d{2}-[ABC]-\d{2})\b/i);
        if (!match) continue;
        el.dataset.qcmkRefouaBound = '1';
        el.style.cursor = 'pointer';
        el.style.textDecoration = 'underline';
        el.title = 'Ouvrir l\'objectif sur Refoua (Ctrl+clic : nouvel onglet)';
        el.addEventListener('click', (ev) => {
          ev.stopPropagation();
          const query = encodeURIComponent(match[1].trim());
          const url = 'https://refoua.fr/#qcm-lisa=' + query;
          if (ev.ctrlKey || ev.metaKey) {
            window.open(url, '_blank', 'noopener');
          } else {
            window.open(url, 'qcmk_refoua');
          }
        });
      }
    }

    // -------------------------------------------------------------------------
    // Extraction Item / Rang / Objectifs & Tri/Filtre (Notions, Ancrage, Items)
    // -------------------------------------------------------------------------

    function extractEdnItemNumber() {
      const candidates = document.querySelectorAll(
        'app-card-title-badge[size="small"], app-training-detail-header, app-exam-preview-courses a, h1, h2'
      );
      for (let i = 0; i < candidates.length; i++) {
        const txt = (candidates[i].textContent || '').trim();
        const m = txt.match(/\bItem\s*[-:n°]*\s*(\d{1,3})\b/i);
        if (m) return m[1];
      }
      return null;
    }

    function extractRowRank(row) {
      const rankEl = row.querySelector('app-notion-rank');
      const raw = rankEl ? (rankEl.textContent || '').trim() : '';
      const m1 = raw.match(/\b([ABC])\b/i);
      if (m1) return m1[1].toUpperCase();
      const m2 = (row.textContent || '').match(/\bRang\s*([ABC])\b/i);
      return m2 ? m2[1].toUpperCase() : '';
    }

    function extractRowProgress(row) {
      const m = (row.textContent || '').match(/(\d+(?:[.,]\d+)?)\s*%/);
      return m ? parseFloat(m[1].replace(',', '.')) : 999;
    }

    function extractRowObjectiveText(row) {
      const titleNode = row.querySelector('h3, h4, strong, [class*="title" i], [class*="name" i], span');
      const raw = titleNode ? (titleNode.textContent || '') : (row.textContent || '');
      return raw.replace(/\s+/g, ' ').trim();
    }

    function applyNotionsSortAndFilter(container, rows) {
      for (const row of rows) {
        const r = extractRowRank(row);
        const visible = activeRankFilter === 'ALL' || r === activeRankFilter;
        row.style.display = visible ? '' : 'none';
      }

      const sorted = rows.slice().sort((a, b) => {
        if (activeSortMode === 'orig') {
          return Number(a.dataset.qcmkOrigIdx || 0) - Number(b.dataset.qcmkOrigIdx || 0);
        }
        if (activeSortMode === 'rank') {
          const order = { A: 1, B: 2, C: 3, '': 9 };
          return (order[extractRowRank(a)] || 9) - (order[extractRowRank(b)] || 9);
        }
        if (activeSortMode === 'progress') {
          return extractRowProgress(a) - extractRowProgress(b);
        }
        return extractRowObjectiveText(a).localeCompare(extractRowObjectiveText(b), 'fr');
      });

      for (const row of sorted) {
        container.appendChild(row);
      }
    }

    function applyNotionsToolbar(ctx) {
      const reviewEl = document.querySelector('app-training-knowledge-review');
      if (!ctx.isEnabled('edn.ancrageCounters') || !reviewEl) {
        const oldTb = document.getElementById('qcmk-edn-notions-toolbar');
        if (oldTb) oldTb.remove();
        return;
      }

      const anki = getAnki();
      if (anki) anki.ensureStyles();

      const rankBadges = Array.from(reviewEl.querySelectorAll('app-notion-rank'));
      if (rankBadges.length === 0) return;

      // Identifier les lignes sœurs portant les objectifs
      const firstRow = rankBadges[0].closest('div.border, div.rounded, li, tr, mat-card, a') || rankBadges[0].parentElement;
      const listContainer = firstRow ? firstRow.parentElement : null;
      if (!listContainer) return;

      const rows = Array.from(listContainer.children).filter(
        (el) => el.id !== 'qcmk-edn-notions-toolbar' && el.querySelector('app-notion-rank')
      );
      if (rows.length === 0) return;

      rows.forEach((row, idx) => {
        if (!row.dataset.qcmkOrigIdx) row.dataset.qcmkOrigIdx = String(idx);
      });

      // Injecter un bouton Anki sur chaque ligne d'objectif si activé
      if (anki && ctx.isEnabled('edn.anki') && ctx.option('edn.anki', 'showButtons') !== false) {
        const itemNum = extractEdnItemNumber();
        rows.forEach((row) => {
          if (row.querySelector('.qcmk-edn-notion-anki')) return;
          const r = extractRowRank(row);
          const objTitle = extractRowObjectiveText(row);
          const uri = anki.buildAnkiEdnUri({
            action: 'lisa',
            src: 'edn',
            item: itemNum,
            rang: r === 'A' || r === 'B' ? r : undefined,
            q: anki.extractMedicalKeywords(objTitle, 4),
          });
          if (!uri) return;
          const btn = anki.createAnkiButton({ label: 'Anki', compact: true, uri });
          btn.classList.add('qcmk-edn-notion-anki');
          btn.style.marginLeft = '8px';
          row.appendChild(btn);
        });
      }

      if (document.getElementById('qcmk-edn-notions-toolbar')) {
        applyNotionsSortAndFilter(listContainer, rows);
        return;
      }

      const bar = document.createElement('div');
      bar.id = 'qcmk-edn-notions-toolbar';
      bar.className = 'qcmk-anki-bar';

      const title = document.createElement('span');
      title.className = 'qcmk-anki-bar-title';
      title.textContent = 'Objectifs (' + rows.length + ')';

      const controls = document.createElement('div');
      controls.className = 'qcmk-anki-bar-actions';

      ['ALL', 'A', 'B', 'C'].forEach((rankVal) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'qcmk-anki-btn qcmk-anki-btn--compact' + (activeRankFilter === rankVal ? ' qcmk-anki-btn--primary' : '');
        btn.textContent = rankVal === 'ALL' ? 'Tous' : 'Rang ' + rankVal;
        btn.dataset.qcmkRankBtn = rankVal;
        btn.addEventListener('click', () => {
          activeRankFilter = rankVal;
          bar.querySelectorAll('[data-qcmk-rank-btn]').forEach((b) => {
            b.classList.toggle('qcmk-anki-btn--primary', b.dataset.qcmkRankBtn === activeRankFilter);
          });
          applyNotionsSortAndFilter(listContainer, rows);
        });
        controls.appendChild(btn);
      });

      const sortSelect = document.createElement('select');
      sortSelect.className = 'qcmk-anki-btn qcmk-anki-btn--compact';
      [
        { id: 'orig', label: 'Tri : Ordre EDN' },
        { id: 'alpha', label: 'Tri : Objectif (A-Z)' },
        { id: 'rank', label: 'Tri : Rang (A -> C)' },
        { id: 'progress', label: 'Tri : Progression croissante' },
      ].forEach((opt) => {
        const o = document.createElement('option');
        o.value = opt.id;
        o.textContent = opt.label;
        sortSelect.appendChild(o);
      });
      sortSelect.value = activeSortMode;
      sortSelect.addEventListener('change', () => {
        activeSortMode = sortSelect.value;
        applyNotionsSortAndFilter(listContainer, rows);
      });
      controls.appendChild(sortSelect);

      bar.append(title, controls);
      listContainer.parentElement.insertBefore(bar, listContainer);
      applyNotionsSortAndFilter(listContainer, rows);
    }

    function applyAncrageCounters(ctx) {
      const mode = detectMode();
      if (mode === 'notions') {
        applyNotionsToolbar(ctx);
        return;
      }

      if (!ctx.isEnabled('edn.ancrageCounters') || (mode !== 'ancrage' && !document.querySelector('app-items-list'))) {
        const oldBox = document.getElementById('qcmk-ancrage-summary');
        if (oldBox) oldBox.remove();
        return;
      }
      if (document.getElementById('qcmk-ancrage-summary')) return;

      const anki = getAnki();
      if (anki) anki.ensureStyles();

      const rows = Array.from(
        document.querySelectorAll('app-training-item-card, [data-matiere], .matiere-card, .ancrage-item, tr')
      ).filter((el) => dom.isVisible(el));
      if (rows.length === 0) return;

      const counts = new Map();
      const rowMeta = [];
      rows.forEach((row, idx) => {
        const label = row.getAttribute('data-matiere') || (row.querySelector('h3, h4, td, strong, span') || row).textContent || '';
        const clean = label.trim().split('\n')[0].slice(0, 48);
        const rank = extractRowRank(row);
        if (clean) counts.set(clean, (counts.get(clean) || 0) + 1);
        row.dataset.qcmkOrigIdx = String(idx);
        rowMeta.push({ row, mat: clean, rank });
      });
      if (counts.size === 0) return;

      const box = document.createElement('div');
      box.id = 'qcmk-ancrage-summary';
      box.className = 'qcmk-anki-bar';
      box.style.flexDirection = 'column';
      box.style.alignItems = 'stretch';

      const head = document.createElement('div');
      head.style.display = 'flex';
      head.style.flexWrap = 'wrap';
      head.style.alignItems = 'center';
      head.style.justifyContent = 'space-between';
      head.style.gap = '8px';

      const title = document.createElement('span');
      title.className = 'qcmk-anki-bar-title';
      title.textContent = mode === 'ancrage' ? 'Ancrages et révisions (' + rows.length + ')' : 'Items filtrables (' + rows.length + ')';

      const headActions = document.createElement('div');
      headActions.className = 'qcmk-anki-bar-actions';

      const hasRanks = rowMeta.some((m) => m.rank !== '');
      const refreshFilters = () => {
        rowMeta.forEach((m) => {
          const okMat = !activeMatiereFilter || m.mat === activeMatiereFilter;
          const okRank = activeRankFilter === 'ALL' || m.rank === activeRankFilter;
          m.row.style.display = okMat && okRank ? '' : 'none';
        });
      };

      if (hasRanks) {
        ['ALL', 'A', 'B', 'C'].forEach((r) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'qcmk-anki-btn qcmk-anki-btn--compact' + (activeRankFilter === r ? ' qcmk-anki-btn--primary' : '');
          btn.textContent = r === 'ALL' ? 'Tous rangs' : 'Rang ' + r;
          btn.addEventListener('click', () => {
            activeRankFilter = r;
            refreshFilters();
          });
          headActions.appendChild(btn);
        });
      }

      const launchBtn = document.createElement('button');
      launchBtn.type = 'button';
      launchBtn.className = 'qcmk-anki-btn qcmk-anki-btn--primary qcmk-anki-btn--compact';
      launchBtn.textContent = 'Lancer une session';
      launchBtn.addEventListener('click', () => {
        const nativeBtn = dom.findButtonByText(document, [/nouvelle session/, /lancer/, /reviser/, /commencer/]);
        if (nativeBtn) {
          dom.safeClick(nativeBtn);
          return;
        }
        const firstCardLink = rows
          .filter((r) => r.style.display !== 'none')
          .map((r) => r.querySelector('a[href]') || (r.tagName === 'A' ? r : null))
          .find(Boolean);
        if (firstCardLink) dom.safeClick(firstCardLink);
      });
      headActions.appendChild(launchBtn);
      head.append(title, headActions);
      box.appendChild(head);

      const list = document.createElement('div');
      list.style.display = 'flex';
      list.style.flexWrap = 'wrap';
      list.style.gap = '6px';

      const allChip = document.createElement('button');
      allChip.type = 'button';
      allChip.className = 'qcmk-anki-btn qcmk-anki-btn--compact' + (!activeMatiereFilter ? ' qcmk-anki-btn--primary' : '');
      allChip.textContent = 'Tout afficher';
      allChip.addEventListener('click', () => {
        activeMatiereFilter = '';
        list.querySelectorAll('button').forEach((b) => b.classList.remove('qcmk-anki-btn--primary'));
        allChip.classList.add('qcmk-anki-btn--primary');
        refreshFilters();
      });
      list.appendChild(allChip);

      for (const [mat, count] of counts.entries()) {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'qcmk-anki-btn qcmk-anki-btn--compact';
        chip.textContent = mat + ' : ' + count;
        chip.addEventListener('click', () => {
          activeMatiereFilter = activeMatiereFilter === mat ? '' : mat;
          list.querySelectorAll('button').forEach((b) => b.classList.remove('qcmk-anki-btn--primary'));
          (activeMatiereFilter ? chip : allChip).classList.add('qcmk-anki-btn--primary');
          refreshFilters();
        });
        list.appendChild(chip);
      }
      box.appendChild(list);

      const main = document.querySelector('#listContainer, app-knowledge-anchoring, main') || document.body;
      main.prepend(box);
    }

    // -------------------------------------------------------------------------
    // Connecteur Anki EDN sur EDN.fr (Fiches de cours + Corrections QCM/DP)
    // -------------------------------------------------------------------------

    function isCorrectionView() {
      if (/correction/i.test(location.pathname || '')) return true;
      return Boolean(document.querySelector('app-training-correction, app-exam-content-correction, app-question-correction-form, app-question-correction-form-legacy'));
    }

    function inspectEdnCorrectionQuestion(qEl, fallbackItem) {
      const anki = getAnki();
      if (!qEl) return null;

      const ulidInput = qEl.querySelector('input[name^="chekbox-many-"], input[name^="radio-one-"], input[name^="input-match-"]');
      const rawName = ulidInput ? (ulidInput.getAttribute('name') || '') : '';
      const ulidMatch = rawName.match(/(?:chekbox-many-|radio-one-|input-match-)([A-Za-z0-9]+)/);
      const qid = ulidMatch ? 'edn:q:' + ulidMatch[1].slice(0, 25).toLowerCase() : null;

      const rank = extractRowRank(qEl);
      let scoreHasError = false;
      const scoreMatch = (qEl.textContent || '').match(/(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)\s*pts?/i);
      if (scoreMatch) {
        const got = parseFloat(scoreMatch[1].replace(',', '.'));
        const max = parseFloat(scoreMatch[2].replace(',', '.'));
        if (Number.isFinite(got) && Number.isFinite(max) && max > 0 && got < max) {
          scoreHasError = true;
        }
      }

      const propErrors = [];
      const expectedTrueTexts = [];

      // QRM checkboxes
      const checkboxes = Array.from(qEl.querySelectorAll('mat-checkbox'));
      checkboxes.forEach((cb, idx) => {
        const isChecked = cb.classList.contains('mat-mdc-checkbox-checked') || Boolean(cb.querySelector('input:checked'));
        const isOmission = cb.classList.contains('question-many-should') && !isChecked;
        const isCommission = cb.classList.contains('question-many-should-not') && isChecked;
        const isWin = cb.classList.contains('question-many-win') || cb.classList.contains('question-many-should');
        const txt = (cb.textContent || '').replace(/\s+/g, ' ').trim();
        if (isWin && txt) expectedTrueTexts.push(txt);
        if (isOmission || isCommission) {
          propErrors.push({ letter: String.fromCharCode(65 + idx), kind: isCommission ? 'cochee a tort' : 'non cochee', text: txt });
        }
      });

      // QRU radios
      const radios = Array.from(qEl.querySelectorAll('mat-radio-button'));
      radios.forEach((rb, idx) => {
        const isChecked = rb.classList.contains('mat-mdc-radio-checked') || Boolean(rb.querySelector('input:checked'));
        const isOmission = rb.classList.contains('question-one-should') && !isChecked;
        const isCommission = rb.classList.contains('question-one-should-not') && isChecked;
        const txt = (rb.textContent || '').replace(/\s+/g, ' ').trim();
        if (rb.classList.contains('question-one-should') && txt) expectedTrueTexts.push(txt);
        if (isOmission || isCommission) {
          propErrors.push({ letter: String.fromCharCode(65 + idx), kind: isCommission ? 'cochee a tort' : 'non cochee', text: txt });
        }
      });

      // QROC
      const qrocField = qEl.querySelector('mat-form-field');
      const qrocError = Boolean(qrocField && !qrocField.classList.contains('question-match-success') && scoreHasError);

      const hasError = scoreHasError || propErrors.length > 0 || qrocError;
      const contentEl = qEl.querySelector('app-question-content') || qEl;
      const corrForm = qEl.querySelector('app-question-correction-form, app-question-correction-form-legacy') || qEl;
      const allText = [contentEl.textContent || '', expectedTrueTexts.join(' '), corrForm.textContent || ''].join(' ');
      const allKeywords = anki ? anki.extractMedicalKeywords(allText, 5) : [];

      const errText = propErrors.length > 0
        ? propErrors.map((e) => e.text).join(' ') + ' ' + (contentEl.textContent || '')
        : allText;
      const errKeywords = anki ? anki.extractMedicalKeywords(errText, 5) : [];

      let errNote = '';
      if (propErrors.length > 0) {
        const top = propErrors[0];
        errNote = ('Prop ' + top.letter + ' ' + top.kind + ' : ' + top.text).slice(0, 220);
      } else if (hasError) {
        errNote = 'Question echouee sur EDN.fr';
      }

      return {
        el: qEl,
        qid,
        item: fallbackItem,
        rang: rank === 'A' || rank === 'B' ? rank : undefined,
        hasError,
        allKeywords,
        errKeywords,
        errNote,
      };
    }

    function clearEdnAnkiUi() {
      const topBar = document.getElementById('qcmk-edn-anki-bar');
      if (topBar) topBar.remove();
      const ficheBar = document.getElementById('qcmk-edn-fiche-anki');
      if (ficheBar) ficheBar.remove();
      document.querySelectorAll('.qcmk-anki-q-bar, .qcmk-edn-fiche-obj-anki').forEach((n) => n.remove());
    }

    function applyEdnAnkiConnector(ctx) {
      const anki = getAnki();
      if (!anki || !ctx.isEnabled('edn.anki') || ctx.option('edn.anki', 'showButtons') === false) {
        clearEdnAnkiUi();
        return;
      }

      const itemNum = extractEdnItemNumber();

      // 1. Fiche de cours (/app/courses/course/.../fiche)
      const courseRecord = document.querySelector('app-course-record');
      if (courseRecord) {
        if (itemNum && !document.getElementById('qcmk-edn-fiche-anki')) {
          const bar = document.createElement('div');
          bar.id = 'qcmk-edn-fiche-anki';
          bar.className = 'qcmk-anki-bar';

          const title = document.createElement('span');
          title.className = 'qcmk-anki-bar-title';
          title.textContent = 'Anki EDN — Item ' + itemNum.padStart(3, '0');

          const actions = document.createElement('div');
          actions.className = 'qcmk-anki-bar-actions';
          const allUri = anki.buildAnkiEdnUri({ action: 'lisa', src: 'edn', item: itemNum });
          const rAUri = anki.buildAnkiEdnUri({ action: 'lisa', src: 'edn', item: itemNum, rang: 'A' });
          const rBUri = anki.buildAnkiEdnUri({ action: 'lisa', src: 'edn', item: itemNum, rang: 'B' });
          if (allUri) actions.appendChild(anki.createAnkiButton({ label: "Tout l'item " + itemNum, primary: true, uri: allUri }));
          if (rAUri) actions.appendChild(anki.createAnkiButton({ label: 'Rang A', uri: rAUri }));
          if (rBUri) actions.appendChild(anki.createAnkiButton({ label: 'Rang B', uri: rBUri }));
          bar.append(title, actions);
          courseRecord.prepend(bar);
        }

        const panels = courseRecord.querySelectorAll('mat-accordion mat-expansion-panel');
        panels.forEach((panel) => {
          const header = panel.querySelector('mat-expansion-panel-header');
          if (!header || header.querySelector('.qcmk-edn-fiche-obj-anki')) return;
          const r = extractRowRank(panel) || extractRowRank(header);
          const objTitle = (header.textContent || '').replace(/\s+/g, ' ').trim();
          const uri = anki.buildAnkiEdnUri({
            action: 'lisa',
            src: 'edn',
            item: itemNum,
            rang: r === 'A' || r === 'B' ? r : undefined,
            q: anki.extractMedicalKeywords(objTitle, 4),
          });
          if (!uri) return;
          const btn = anki.createAnkiButton({ label: 'Anki', compact: true, uri });
          btn.classList.add('qcmk-edn-fiche-obj-anki');
          btn.style.marginLeft = '8px';
          header.appendChild(btn);
        });
        return;
      }

      // 2. Vue Correction Training / Exam
      if (!isCorrectionView()) return;
      const containers = getQuestionContainers().filter((c) => c !== document.body);
      if (containers.length === 0) return;

      const inspected = containers.map((c) => inspectEdnCorrectionQuestion(c, itemNum)).filter(Boolean);
      if (inspected.length === 0) return;

      const errList = inspected.filter((x) => x.hasError);
      const buildBatchUri = (subset) => {
        if (subset.length === 0) return null;
        const qids = [];
        const kw = [];
        const errs = [];
        for (const q of subset) {
          if (q.qid && qids.indexOf(q.qid) === -1) qids.push(q.qid);
          const srcKw = subset === errList ? q.errKeywords : q.allKeywords;
          for (const k of srcKw) if (kw.indexOf(k) === -1 && kw.length < 6) kw.push(k);
          if (subset === errList && q.errNote && errs.length < 2) errs.push(q.errNote);
        }
        return anki.buildAnkiEdnUri({
          action: 'qcm',
          src: 'edn',
          qid: qids,
          item: itemNum ? [itemNum] : [],
          q: kw,
          err: errs.join(' | '),
        });
      };

      if (!document.getElementById('qcmk-edn-anki-bar')) {
        const bar = document.createElement('div');
        bar.id = 'qcmk-edn-anki-bar';
        bar.className = 'qcmk-anki-bar';

        const title = document.createElement('span');
        title.className = 'qcmk-anki-bar-title';
        title.textContent = itemNum ? 'Anki EDN — Item ' + itemNum.padStart(3, '0') : 'Anki EDN — Correction EDN.fr';

        const actions = document.createElement('div');
        actions.className = 'qcmk-anki-bar-actions';

        const allUri = buildBatchUri(inspected);
        const errUri = buildBatchUri(errList);
        if (allUri) actions.appendChild(anki.createAnkiButton({ label: 'Anki : toutes les notions', uri: allUri }));
        actions.appendChild(
          anki.createAnkiButton({
            label: 'Anki : mes erreurs (' + errList.length + ')',
            primary: errList.length > 0,
            disabled: errList.length === 0 || !errUri,
            uri: errUri || '',
          })
        );

        bar.append(title, actions);
        const anchor = document.querySelector('#mobile-session-questions-container, app-training-correction, app-exam-content-correction, main') || document.body;
        anchor.prepend(bar);
      }

      inspected.forEach((info) => {
        if (info.el.querySelector('.qcmk-anki-q-bar')) return;
        const qAllUri = anki.buildAnkiEdnUri({
          action: 'qcm',
          src: 'edn',
          qid: info.qid ? [info.qid] : [],
          item: info.item ? [info.item] : [],
          rang: info.rang,
          q: info.allKeywords,
        });
        const qErrUri = info.hasError
          ? anki.buildAnkiEdnUri({
              action: 'qcm',
              src: 'edn',
              qid: info.qid ? [info.qid] : [],
              item: info.item ? [info.item] : [],
              rang: info.rang,
              q: info.errKeywords,
              err: info.errNote,
            })
          : null;
        if (!qAllUri && !qErrUri) return;

        const qBar = document.createElement('div');
        qBar.className = 'qcmk-anki-q-bar';
        if (qAllUri) qBar.appendChild(anki.createAnkiButton({ label: 'Anki : cette question', compact: true, uri: qAllUri }));
        if (qErrUri) qBar.appendChild(anki.createAnkiButton({ label: 'Anki : mes erreurs', compact: true, primary: true, uri: qErrUri }));
        info.el.appendChild(qBar);
      });
    }

    function applyKeyHints(ctx) {
      if (!ctx.isEnabled('edn.keyHints')) {
        dom.clearKeyHints();
        return;
      }
      const mode = detectMode();
      const scope = getActiveQuestion(mode);
      const items = [];
      const choices = getChoiceTargets(scope);
      choices.slice(0, 10).forEach((el, idx) => {
        const label = ctx.formatFirst(ctx.sharedBindings('choice.' + (idx + 1)));
        if (label) items.push({ el, label });
      });

      const valBtn = dom.findButtonByText(scope, [/^valider$/, /^soumettre$/, /^verifier$/])
        || dom.findButtonByText(document, [/^valider$/, /^soumettre$/]);
      if (valBtn) {
        const fId = mode === 'exam' ? 'edn.exam.answer' : 'edn.training.answer';
        items.push({ el: valBtn, label: ctx.formatFirst(ctx.bindings(fId, 'validate')) });
      }

      if (mode === 'training') {
        const prevBtn = dom.findButtonByText(document, [/precedent/, /^retour$/]);
        const nextBtn = dom.findButtonByText(document, [/suivant/, /continuer/]);
        if (prevBtn) items.push({ el: prevBtn, label: ctx.formatFirst(ctx.bindings('edn.training.nav', 'prev')) });
        if (nextBtn) items.push({ el: nextBtn, label: ctx.formatFirst(ctx.bindings('edn.training.nav', 'next')) });
      }

      const timerBtn = findTimerButton();
      if (timerBtn) {
        items.push({ el: timerBtn, label: ctx.formatFirst(ctx.bindings('edn.timer', 'toggle')) });
      }

      dom.renderKeyHints(items);
    }

    function refresh(ctx) {
      lastCtx = ctx;
      toggleHalfScreenStyle(ctx);
      applyInlineScores(ctx);
      applySidebarScores(ctx);
      renderFlags(ctx);
      applyRefouaLinks(ctx);
      applyAncrageCounters(ctx);
      applyEdnAnkiConnector(ctx);
      applyKeyHints(ctx);
    }

    return {
      init(ctx) {
        refresh(ctx);
        resizeHandler = () => {
          if (lastCtx) toggleHalfScreenStyle(lastCtx);
        };
        window.addEventListener('resize', resizeHandler);
      },

      onDomMutate(ctx) {
        refresh(ctx);
      },

      onKeyDown(e, ctx) {
        const mode = detectMode();
        const activeQ = getActiveQuestion(mode);
        const typing = kb.isTypingTarget(e.target);

        const qrocEnabled = mode === 'exam' ? ctx.isEnabled('edn.exam.qroc') : ctx.isEnabled('edn.training.qroc');
        if (!typing && qrocEnabled && kb.isPrintableKey(e)) {
          const idx = ctx.matchSharedChoice(e);
          const choices = getChoiceTargets(activeQ);
          if (choices.length === 0 || idx === -1) {
            const qroc = findQrocInput(activeQ);
            if (qroc && choices.length === 0) {
              qroc.focus();
              return false;
            }
          }
        }

        if (typing) {
          return false;
        }

        // Anki EDN shortcuts
        if (ctx.isEnabled('edn.anki')) {
          const anki = getAnki();
          const itemNum = extractEdnItemNumber();
          if (ctx.matches(e, 'edn.anki', 'openActive') && anki) {
            if (mode === 'fiche' && itemNum) {
              const u = anki.buildAnkiEdnUri({ action: 'lisa', src: 'edn', item: itemNum });
              if (u) return anki.launchAnkiUri(u, 'Ouverture Item ' + itemNum + ' dans Anki...');
            } else if (isCorrectionView() && activeQ && activeQ !== document.body) {
              const info = inspectEdnCorrectionQuestion(activeQ, itemNum);
              if (info) {
                const u = anki.buildAnkiEdnUri({
                  action: 'qcm',
                  src: 'edn',
                  qid: info.qid ? [info.qid] : [],
                  item: info.item ? [info.item] : [],
                  rang: info.rang,
                  q: info.allKeywords,
                });
                if (u) return anki.launchAnkiUri(u, 'Ouverture de la question dans Anki...');
              }
            }
          }
          if (ctx.matches(e, 'edn.anki', 'openErrors') && anki && isCorrectionView()) {
            const info = activeQ && activeQ !== document.body ? inspectEdnCorrectionQuestion(activeQ, itemNum) : null;
            if (info && info.hasError) {
              const u = anki.buildAnkiEdnUri({
                action: 'qcm',
                src: 'edn',
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

        // Pin shortcut
        if (ctx.isEnabled('edn.pin') && ctx.matches(e, 'edn.pin', 'toggle')) {
          const pinBtn = activeQ.querySelector('app-student-question-pin button, app-student-question-pin');
          if (pinBtn && dom.safeClick(pinBtn)) {
            dom.showToast('Épingle mise à jour');
            return true;
          }
        }

        // Scroll
        if (ctx.isEnabled('edn.scroll')) {
          const step = ctx.option('edn.scroll', 'step') || 200;
          const scroller = dom.findScrollContainer(['main', '[class*="question"]', '.overflow-y-auto']);
          if (ctx.matches(e, 'edn.scroll', 'down')) {
            dom.scrollByStep(scroller, step, false);
            return true;
          }
          if (ctx.matches(e, 'edn.scroll', 'up')) {
            dom.scrollByStep(scroller, -step, false);
            return true;
          }
        }

        // Timer
        if (ctx.isEnabled('edn.timer') && ctx.matches(e, 'edn.timer', 'toggle')) {
          const timerBtn = findTimerButton();
          if (timerBtn && dom.safeClick(timerBtn)) {
            dom.showToast('Minuteur basculé');
            return true;
          }
        }

        // Shared choices 1-10
        const answerFeat = mode === 'exam' ? 'edn.exam.answer' : 'edn.training.answer';
        if (ctx.isEnabled(answerFeat)) {
          const choiceIdx = ctx.matchSharedChoice(e);
          if (choiceIdx !== -1) {
            const choices = getChoiceTargets(activeQ);
            if (choices[choiceIdx]) {
              dom.safeClick(choices[choiceIdx]);
              return true;
            }
          }
          if (ctx.matches(e, answerFeat, 'validate')) {
            const valBtn = dom.findButtonByText(activeQ, [/^valider$/, /^soumettre$/, /^verifier$/, /valider la reponse/])
              || dom.findButtonByText(document, [/^valider$/, /^soumettre$/]);
            if (valBtn) {
              dom.safeClick(valBtn);
              return true;
            }
          }
        }

        // Training correction & navigation & ancrage
        if (mode === 'training') {
          if (ctx.isEnabled('edn.training.correction')) {
            if (ctx.matches(e, 'edn.training.correction', 'unsure')) {
              const btn = dom.findButtonByText(document, [/rappelais un peu/, /un peu/, /hesit/]);
              if (btn) { dom.safeClick(btn); return true; }
            }
            if (ctx.matches(e, 'edn.training.correction', 'random')) {
              const btn = dom.findButtonByText(document, [/savais pas/, /au hasard/, /pas du tout/]);
              if (btn) { dom.safeClick(btn); return true; }
            }
            if (ctx.matches(e, 'edn.training.correction', 'sureOrNext')) {
              const btn = dom.findButtonByText(document, [/connaissais/, /question suivante/, /^suivante?$/, /^continuer$/]);
              if (btn) { dom.safeClick(btn); return true; }
            }
          }

          if (ctx.isEnabled('edn.training.nav')) {
            if (ctx.matches(e, 'edn.training.nav', 'prev')) {
              const btn = dom.findButtonByText(document, [/question precedente/, /^precedent/, /^retour$/]);
              if (btn) { dom.safeClick(btn); return true; }
            }
            if (ctx.matches(e, 'edn.training.nav', 'next')) {
              const btn = dom.findButtonByText(document, [/question suivante/, /^suivant/, /^continuer$/]);
              if (btn) { dom.safeClick(btn); return true; }
            }
          }

          if (ctx.isEnabled('edn.training.ancrage')) {
            if (ctx.matches(e, 'edn.training.ancrage', 'toggle')) {
              const btn = dom.findButtonByText(document, [/ancrage/, /a revoir/]);
              if (btn) { dom.safeClick(btn); dom.showToast('Ancrage mis à jour'); return true; }
            }
            if (ctx.matches(e, 'edn.training.ancrage', 'add')) {
              const btn = dom.findButtonByText(document, [/ajouter.*ancrage/, /ancrer/]);
              if (btn) { dom.safeClick(btn); return true; }
            }
            if (ctx.matches(e, 'edn.training.ancrage', 'remove')) {
              const btn = dom.findButtonByText(document, [/retirer.*ancrage/, /supprimer.*ancrage/]);
              if (btn) { dom.safeClick(btn); return true; }
            }
            if (ctx.matches(e, 'edn.training.ancrage', 'noReview')) {
              const btn = dom.findButtonByText(document, [/ne plus revoir/]);
              if (btn) { dom.safeClick(btn); dom.showToast('Marqué : ne plus revoir'); return true; }
            }
          }
        }

        // Exam flags & sidebar notes clear
        if (mode === 'exam') {
          if (ctx.isEnabled('edn.exam.flags')) {
            if (ctx.matches(e, 'edn.exam.flags', 'clearAll')) {
              flagStore.clearFlags(getExamKey());
              renderFlags(ctx);
              dom.showToast('Tous les drapeaux de l\'épreuve supprimés');
              return true;
            }
            if (ctx.matches(e, 'edn.exam.flags', 'nextFlag')) {
              return jumpToNextFlag(activeQ);
            }
            if (ctx.matches(e, 'edn.exam.flags', 'toggle')) {
              const containers = getQuestionContainers();
              const idx = Math.max(0, containers.indexOf(activeQ));
              const qid = activeQ.getAttribute('data-question-id') || activeQ.id || String(idx + 1);
              const res = flagStore.toggleFlag(getExamKey(), qid);
              renderFlags(ctx);
              dom.showToast(res.added ? 'Drapeau ajouté' : 'Drapeau retiré');
              return true;
            }
          }

          if (ctx.isEnabled('edn.sidebarScores') && ctx.matches(e, 'edn.sidebarScores', 'clearNotes')) {
            try {
              localStorage.removeItem(NOTE_STORE_PREFIX + getExamKey());
            } catch (_) {}
            applySidebarScores(ctx);
            dom.showToast('Notes mémorisées effacées');
            return true;
          }
        }

        return false;
      },

      destroy() {
        dom.injectStyle('qcmk-edn-halfscreen', '');
        dom.injectStyle('qcmk-edn-scores-css', '');
        dom.clearKeyHints();
        clearEdnAnkiUi();
        const tb = document.getElementById('qcmk-edn-notions-toolbar');
        if (tb) tb.remove();
        const box = document.getElementById('qcmk-ancrage-summary');
        if (box) box.remove();
        if (resizeHandler) {
          window.removeEventListener('resize', resizeHandler);
          resizeHandler = null;
        }
      },

      _testHooks: {
        detectMode,
        extractEdnItemNumber,
        inspectEdnCorrectionQuestion,
        applyNotionsToolbar,
        applyEdnAnkiConnector,
      },
    };
  }

  adapters.edn = createEdnAdapter();
})();

  /* --- src/adapters/hypocampus.js --- */
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

  /* --- src/adapters/uness.js --- */
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

  /* --- src/adapters/asclepia.js --- */
(function () {
  'use strict';
  const root = (globalThis.QCMK = globalThis.QCMK || {});
  const adapters = (root.adapters = root.adapters || {});

  function createAsclepiaAdapter() {
    const dom = root.dom;
    const kb = root.keybind;
    const flagStore = new dom.FlagStore('asclepia');
    let headerCollapsed = true;

    function getAnki() {
      return root.anki || null;
    }

    function getExamKey() {
      return (location.pathname || '/').replace(/\/(corrections?|results?)\/?$/i, '') || 'default';
    }

    function isCorrectionView() {
      return /correction/i.test(location.pathname || '');
    }

    function getQuestions() {
      const selectors = ['[data-question-id]', '[id^="question-"]', '.question-card', 'article'];
      for (const sel of selectors) {
        const list = Array.from(document.querySelectorAll(sel)).filter((el) => dom.isVisible(el));
        if (list.length > 0) return list;
      }
      return [document.body];
    }

    function getActiveQuestion() {
      const list = getQuestions();
      if (list.length === 1) return list[0];
      return dom.findActiveContainer(list, 'top') || list[0];
    }

    function getChoiceTargets(scope) {
      const inputs = Array.from(scope.querySelectorAll('input[type="checkbox"], input[type="radio"]'))
        .filter((el) => !el.disabled);
      if (inputs.length > 0) {
        return inputs.map((el) => el.closest('label') || el);
      }
      return Array.from(scope.querySelectorAll('[role="checkbox"], [role="radio"], button[data-choice], .choice-button'))
        .filter((el) => dom.isVisible(el) && !el.disabled)
        .slice(0, 10);
    }

    function applyCompactHeader(ctx) {
      const oldBtn = document.getElementById('qcmk-asclepia-header-btn');
      if (!ctx.isEnabled('asclepia.compactHeader') || isCorrectionView()) {
        if (oldBtn) oldBtn.remove();
        dom.injectStyle('qcmk-asclepia-header-css', '');
        return;
      }

      if (headerCollapsed) {
        dom.injectStyle(
          'qcmk-asclepia-header-css',
          'header, [data-testid="exam-header"], .exam-header { display: none !important; }'
        );
      } else {
        dom.injectStyle('qcmk-asclepia-header-css', '');
      }

      if (!oldBtn && document.body) {
        const btn = document.createElement('button');
        btn.id = 'qcmk-asclepia-header-btn';
        btn.type = 'button';
        btn.textContent = headerCollapsed ? 'Afficher la barre' : 'Masquer la barre';
        Object.assign(btn.style, {
          position: 'fixed',
          top: '8px',
          right: '12px',
          zIndex: '2147483646',
          padding: '5px 10px',
          borderRadius: '6px',
          border: '1px solid #d4d4d8',
          background: '#ffffff',
          color: '#18181b',
          fontSize: '12px',
          fontWeight: '600',
          cursor: 'pointer',
        });
        btn.addEventListener('click', () => {
          headerCollapsed = !headerCollapsed;
          btn.textContent = headerCollapsed ? 'Afficher la barre' : 'Masquer la barre';
          applyCompactHeader(ctx);
        });
        document.body.appendChild(btn);
      }
    }

    function renderFlags(ctx) {
      document.querySelectorAll('.qcmk-asclepia-flag').forEach((n) => n.remove());
      const showHere = isCorrectionView() ? ctx.isEnabled('asclepia.correctionFlags') : ctx.isEnabled('asclepia.flags');
      if (!showHere) return;

      const flags = flagStore.getFlags(getExamKey());
      const questions = getQuestions();
      questions.forEach((q, idx) => {
        const qid = q.getAttribute('data-question-id') || q.id || String(idx + 1);
        if (!flags.has(qid) && !flags.has(String(idx + 1))) return;
        const badge = document.createElement('span');
        badge.className = 'qcmk-asclepia-flag';
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
        const target = q.querySelector('h1, h2, h3, h4, header') || q;
        target.appendChild(badge);
      });
    }

    function applyInlineScores(ctx) {
      document.querySelectorAll('.qcmk-asclepia-score').forEach((n) => n.classList.remove('qcmk-asclepia-score', 'qcmk-score-good', 'qcmk-score-mid', 'qcmk-score-low'));
      if (!ctx.isEnabled('asclepia.inlineScores')) {
        dom.injectStyle('qcmk-asclepia-scores-css', '');
        return;
      }
      dom.injectStyle(
        'qcmk-asclepia-scores-css',
        '.qcmk-score-good{color:#15803d!important;font-weight:600!important;}.qcmk-score-mid{color:#b45309!important;font-weight:600!important;}.qcmk-score-low{color:#b91c1c!important;font-weight:600!important;}'
      );
      const nodes = document.querySelectorAll('span, div, p, strong');
      for (let i = 0; i < nodes.length; i++) {
        const el = nodes[i];
        if (el.children.length > 0 || !dom.isVisible(el)) continue;
        const m = (el.textContent || '').trim().match(/^(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)(?:\s*pts?)?$/i);
        if (!m) continue;
        const got = parseFloat(m[1].replace(',', '.'));
        const max = parseFloat(m[2].replace(',', '.'));
        if (!max) continue;
        const ratio = got / max;
        const cls = ratio >= 0.8 ? 'qcmk-score-good' : ratio >= 0.5 ? 'qcmk-score-mid' : 'qcmk-score-low';
        el.classList.add('qcmk-asclepia-score', cls);
      }
    }

    function applyKeyHints(ctx) {
      if (!ctx.isEnabled('asclepia.keyHints')) {
        dom.clearKeyHints();
        return;
      }
      const activeQ = getActiveQuestion();
      const items = [];
      getChoiceTargets(activeQ).slice(0, 10).forEach((el, idx) => {
        const label = ctx.formatFirst(ctx.sharedBindings('choice.' + (idx + 1)));
        if (label) items.push({ el, label });
      });
      const valBtn = dom.findButtonByText(activeQ, [/^valider$/, /^ok$/, /afficher la correction/, /^continuer$/]);
      if (valBtn) {
        items.push({ el: valBtn, label: ctx.formatFirst(ctx.bindings('asclepia.answer', 'validate')) });
      }
      dom.renderKeyHints(items);
    }

    // -------------------------------------------------------------------------
    // Connecteur Anki EDN sur Asclepia (/dashboard/item/<num> & /correction)
    // -------------------------------------------------------------------------

    function extractAsclepiaItemNumber() {
      const mPath = (location.pathname || '').match(/\/dashboard\/item\/(\d{1,3})\b/i);
      if (mPath) return mPath[1];
      const h1 = document.querySelector('#scrollable-container h1, h1, h2');
      const mTxt = h1 ? (h1.textContent || '').match(/\bItem\s*[-:n°]*\s*(\d{1,3})\b/i) : null;
      return mTxt ? mTxt[1] : null;
    }

    function clearAsclepiaAnkiUi() {
      const bar = document.getElementById('qcmk-asclepia-anki-bar');
      if (bar) bar.remove();
      document.querySelectorAll('.qcmk-asclepia-know-anki, .qcmk-anki-q-bar').forEach((n) => n.remove());
    }

    function applyAsclepiaAnkiConnector(ctx) {
      const anki = getAnki();
      if (!anki || !ctx.isEnabled('asclepia.anki') || ctx.option('asclepia.anki', 'showButtons') === false) {
        clearAsclepiaAnkiUi();
        return;
      }

      const itemNum = extractAsclepiaItemNumber();
      const knowNodes = Array.from(document.querySelectorAll('[class*="KnowledgeRankFromId__Container"]'));

      if (itemNum && !document.getElementById('qcmk-asclepia-anki-bar')) {
        const container = document.getElementById('scrollable-container') || document.querySelector('main') || document.body;
        const bar = document.createElement('div');
        bar.id = 'qcmk-asclepia-anki-bar';
        bar.className = 'qcmk-anki-bar';

        const title = document.createElement('span');
        title.className = 'qcmk-anki-bar-title';
        title.textContent = 'Anki EDN — Item ' + itemNum.padStart(3, '0');

        const actions = document.createElement('div');
        actions.className = 'qcmk-anki-bar-actions';
        const allUri = anki.buildAnkiEdnUri({ action: 'lisa', src: 'asclepia', item: itemNum });
        const rAUri = anki.buildAnkiEdnUri({ action: 'lisa', src: 'asclepia', item: itemNum, rang: 'A' });
        const rBUri = anki.buildAnkiEdnUri({ action: 'lisa', src: 'asclepia', item: itemNum, rang: 'B' });
        if (allUri) actions.appendChild(anki.createAnkiButton({ label: "Tout l'item " + itemNum, primary: true, uri: allUri }));
        if (rAUri) actions.appendChild(anki.createAnkiButton({ label: 'Rang A', uri: rAUri }));
        if (rBUri) actions.appendChild(anki.createAnkiButton({ label: 'Rang B', uri: rBUri }));
        bar.append(title, actions);
        container.prepend(bar);
      }

      knowNodes.forEach((kn) => {
        const card = kn.closest('div[class*="sc-"]') || kn.parentElement;
        if (!card || card.querySelector('.qcmk-asclepia-know-anki')) return;
        const rankEl = kn.querySelector('[class*="RankLetter"]') || kn;
        const rMatch = (rankEl.textContent || '').trim().match(/\b([AB])\b/i);
        const rang = rMatch ? rMatch[1].toUpperCase() : undefined;
        const oicM = (card.textContent || '').match(/\bOIC[-_](\d{1,3})[-_](\d{1,2})[-_]([AB])(?:[-_]\d{1,2})?\b/i);
        const uri = anki.buildAnkiEdnUri({
          action: 'lisa',
          src: 'asclepia',
          oic: oicM ? oicM[0] : undefined,
          item: itemNum,
          rang,
          q: anki.extractMedicalKeywords(card.textContent || '', 4),
        });
        if (!uri) return;
        const btn = anki.createAnkiButton({ label: 'Anki', compact: true, uri });
        btn.classList.add('qcmk-asclepia-know-anki');
        btn.style.marginLeft = '8px';
        kn.appendChild(btn);
      });

      if (isCorrectionView()) {
        getQuestions().filter((q) => q !== document.body).forEach((q) => {
          if (q.querySelector('.qcmk-anki-q-bar')) return;
          const qidAttr = q.getAttribute('data-question-id') || (q.id && q.id.replace(/^question-/i, ''));
          const qid = qidAttr ? 'asclepia:q:' + qidAttr.slice(0, 24).toLowerCase() : null;
          const rankEl = q.querySelector('[class*="RankLetter"]');
          const rM = rankEl ? (rankEl.textContent || '').match(/\b([AB])\b/i) : null;
          const uri = anki.buildAnkiEdnUri({
            action: 'qcm',
            src: 'asclepia',
            qid: qid ? [qid] : [],
            item: itemNum ? [itemNum] : [],
            rang: rM ? rM[1].toUpperCase() : undefined,
            q: anki.extractMedicalKeywords(q.textContent || '', 5),
          });
          if (!uri) return;
          const qBar = document.createElement('div');
          qBar.className = 'qcmk-anki-q-bar';
          qBar.appendChild(anki.createAnkiButton({ label: 'Anki : cette question', compact: true, uri }));
          q.appendChild(qBar);
        });
      }
    }

    function tryChainNextSubfolder(ctx) {
      if (!ctx.isEnabled('asclepia.chain')) return;
      setTimeout(() => {
        const nextFolderBtn = dom.findButtonByText(document, [/dossier suivant/, /sous-dossier suivant/, /epreuve suivante/]);
        if (nextFolderBtn) dom.safeClick(nextFolderBtn);
      }, 300);
    }

    function refresh(ctx) {
      applyCompactHeader(ctx);
      renderFlags(ctx);
      applyInlineScores(ctx);
      applyAsclepiaAnkiConnector(ctx);
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
        const activeQ = getActiveQuestion();
        const typing = kb.isTypingTarget(e.target);

        if (!typing && ctx.isEnabled('asclepia.qroc') && kb.isPrintableKey(e)) {
          const choices = getChoiceTargets(activeQ);
          if (choices.length === 0) {
            const field = activeQ.querySelector('textarea, input[type="text"], input:not([type])');
            if (field && !field.disabled && dom.isVisible(field)) {
              field.focus();
              return false;
            }
          }
        }

        if (typing) return false;

        if (ctx.isEnabled('asclepia.anki')) {
          const anki = getAnki();
          const itemNum = extractAsclepiaItemNumber();
          if (ctx.matches(e, 'asclepia.anki', 'openActive') && anki) {
            const uri = anki.buildAnkiEdnUri({
              action: isCorrectionView() ? 'qcm' : 'lisa',
              src: 'asclepia',
              item: itemNum ? [itemNum] : [],
              q: activeQ && activeQ !== document.body ? anki.extractMedicalKeywords(activeQ.textContent || '', 5) : [],
            });
            if (uri) return anki.launchAnkiUri(uri, 'Ouverture dans Anki...');
          }
          if (ctx.matches(e, 'asclepia.anki', 'openErrors') && anki && isCorrectionView()) {
            const uri = anki.buildAnkiEdnUri({
              action: 'qcm',
              src: 'asclepia',
              item: itemNum ? [itemNum] : [],
              q: activeQ && activeQ !== document.body ? anki.extractMedicalKeywords(activeQ.textContent || '', 5) : [],
              err: 'Erreur Asclepia',
            });
            if (uri) return anki.launchAnkiUri(uri, 'Ouverture des erreurs dans Anki...');
          }
        }

        if (ctx.isEnabled('asclepia.scroll')) {
          const step = ctx.option('asclepia.scroll', 'step') || 200;
          const scroller = dom.findScrollContainer(['main', '.overflow-y-auto']);
          if (ctx.matches(e, 'asclepia.scroll', 'down')) {
            dom.scrollByStep(scroller, step, false);
            return true;
          }
          if (ctx.matches(e, 'asclepia.scroll', 'up')) {
            dom.scrollByStep(scroller, -step, false);
            return true;
          }
        }

        if (ctx.isEnabled('asclepia.nav')) {
          const list = getQuestions();
          const cur = list.indexOf(activeQ);
          if (ctx.matches(e, 'asclepia.nav', 'prev')) {
            if (cur > 0) {
              list[cur - 1].scrollIntoView({ behavior: 'smooth', block: 'start' });
              return true;
            }
            const prevBtn = dom.findButtonByText(document, [/^precedent/, /question precedente/, /^retour$/]);
            if (prevBtn) { dom.safeClick(prevBtn); return true; }
          }
          if (ctx.matches(e, 'asclepia.nav', 'next')) {
            if (cur !== -1 && cur + 1 < list.length) {
              list[cur + 1].scrollIntoView({ behavior: 'smooth', block: 'start' });
              return true;
            }
            const nextBtn = dom.findButtonByText(document, [/^suivant/, /question suivante/, /^continuer$/]);
            if (nextBtn) { dom.safeClick(nextBtn); return true; }
          }
        }

        if (ctx.isEnabled('asclepia.flags')) {
          const list = getQuestions();
          if (ctx.matches(e, 'asclepia.flags', 'nextFlag')) {
            const flags = flagStore.getFlags(getExamKey());
            const flagged = list.filter((q, i) => {
              const qid = q.getAttribute('data-question-id') || q.id || String(i + 1);
              return flags.has(qid) || flags.has(String(i + 1));
            });
            if (flagged.length === 0) {
              dom.showToast('Aucune question marquée');
              return false;
            }
            const nextEl = flagged[(flagged.indexOf(activeQ) + 1) % flagged.length];
            nextEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return true;
          }
          if (ctx.matches(e, 'asclepia.flags', 'toggle')) {
            const idx = Math.max(0, list.indexOf(activeQ));
            const qid = activeQ.getAttribute('data-question-id') || activeQ.id || String(idx + 1);
            const res = flagStore.toggleFlag(getExamKey(), qid);
            renderFlags(ctx);
            dom.showToast(res.added ? 'Drapeau ajouté' : 'Drapeau retiré');
            return true;
          }
        }

        if (ctx.isEnabled('asclepia.answer')) {
          const idx = ctx.matchSharedChoice(e);
          if (idx !== -1) {
            const choices = getChoiceTargets(activeQ);
            if (choices[idx]) {
              dom.safeClick(choices[idx]);
              return true;
            }
          }

          if (ctx.matches(e, 'asclepia.answer', 'validate')) {
            const btn = dom.findButtonByText(activeQ, [/^valider$/, /^ok$/, /afficher la correction/, /^continuer$/, /^suivant$/])
              || dom.findButtonByText(document, [/^ok$/, /^valider$/, /afficher la correction/, /^continuer$/]);
            if (btn) {
              dom.safeClick(btn);
              tryChainNextSubfolder(ctx);
              return true;
            }
            const list = getQuestions();
            const cur = list.indexOf(activeQ);
            if (cur !== -1 && cur + 1 < list.length) {
              list[cur + 1].scrollIntoView({ behavior: 'smooth', block: 'start' });
              return true;
            }
          }
        }

        return false;
      },

      destroy() {
        const oldBtn = document.getElementById('qcmk-asclepia-header-btn');
        if (oldBtn) oldBtn.remove();
        dom.injectStyle('qcmk-asclepia-header-css', '');
        dom.injectStyle('qcmk-asclepia-scores-css', '');
        dom.clearKeyHints();
        clearAsclepiaAnkiUi();
      },

      _testHooks: {
        extractAsclepiaItemNumber,
        applyAsclepiaAnkiConnector,
      },
    };
  }

  adapters.asclepia = createAsclepiaAdapter();
})();

  /* --- src/adapters/refoua.js --- */
(function () {
  'use strict';
  const root = (globalThis.QCMK = globalThis.QCMK || {});
  const adapters = (root.adapters = root.adapters || {});

  function createRefouaAdapter() {
    const dom = root.dom;
    let appliedHash = '';

    function injectAnkiButtonNear(targetEl, rawObjective) {
      const anki = root.anki;
      if (!anki || !targetEl || targetEl.querySelector('.qcmk-refoua-anki')) return;
      const oicMatch = String(rawObjective || targetEl.textContent || '').match(/\bOIC[-_]\d{1,3}[-_]\d{1,2}[-_][AB](?:[-_]\d{1,2})?\b/i);
      const itemMatch = (location.pathname || '').match(/item[-_]?(\d{1,3})/i) || (document.title || '').match(/\bItem\s*(\d{1,3})\b/i);
      const uri = anki.buildAnkiEdnUri({
        action: 'lisa',
        src: 'lisa',
        oic: oicMatch ? oicMatch[0] : undefined,
        item: itemMatch ? itemMatch[1] : undefined,
        q: anki.extractMedicalKeywords(rawObjective || targetEl.textContent || '', 4),
      });
      if (!uri) return;
      const btn = anki.createAnkiButton({ label: 'Anki', compact: true, uri });
      btn.classList.add('qcmk-refoua-anki');
      btn.style.marginLeft = '8px';
      targetEl.appendChild(btn);
    }

    function scrollToObjective(ctx) {
      if (!ctx.isEnabled('refoua.autoScroll')) return;
      const hash = location.hash || '';
      const prefix = '#qcm-lisa=';
      if (!hash.startsWith(prefix) || hash === appliedHash) return;

      const raw = decodeURIComponent(hash.slice(prefix.length)).trim();
      if (!raw) return;

      const targetNorm = dom.normText(raw);
      const nodes = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, p, li, strong, td'))
        .filter((el) => dom.isVisible(el));

      const match = nodes.find((el) => dom.normText(el.textContent).includes(targetNorm));
      if (!match) return;

      appliedHash = hash;
      match.scrollIntoView({ behavior: 'smooth', block: 'center' });
      injectAnkiButtonNear(match, raw);
      const prevBg = match.style.backgroundColor;
      const prevOutline = match.style.outline;
      match.style.backgroundColor = '#fef9c3';
      match.style.outline = '2px solid #1d4ed8';
      setTimeout(() => {
        match.style.backgroundColor = prevBg;
        match.style.outline = prevOutline;
      }, 2600);
    }

    return {
      init(ctx) {
        scrollToObjective(ctx);
      },
      onDomMutate(ctx) {
        scrollToObjective(ctx);
      },
      onKeyDown() {
        return false;
      },
      destroy() {
        document.querySelectorAll('.qcmk-refoua-anki').forEach((n) => n.remove());
      },
    };
  }

  adapters.refoua = createRefouaAdapter();
})();

  /* --- src/content/main.js --- */
(function () {
  'use strict';
  const root = globalThis.QCMK;
  if (!root || !root.schema || !root.storage || !root.keybind || !root.dom) return;

  function detectSite(hostname) {
    const host = (hostname || '').toLowerCase();
    for (const site of root.schema.sites) {
      for (const domain of site.hosts) {
        if (host === domain || host.endsWith('.' + domain)) {
          return site.id;
        }
      }
    }
    return null;
  }

  const siteId = detectSite(location.hostname);
  const adapter = siteId && root.adapters ? root.adapters[siteId] : null;
  if (!adapter) return;

  let currentSettings = null;
  let observer = null;
  let mutateTimer = null;

  function createContext(settings) {
    return {
      settings,
      siteId,
      isEnabled(featureId) {
        return root.storage.isFeatureEnabled(settings, featureId);
      },
      bindings(featureId, actionId) {
        return root.storage.getBindings(settings, featureId, actionId);
      },
      sharedBindings(actionId) {
        return root.storage.getSharedBindings(settings, actionId);
      },
      matches(event, featureId, actionId) {
        return root.keybind.matchesAny(event, this.bindings(featureId, actionId));
      },
      matchSharedChoice(event) {
        for (let i = 0; i < 10; i++) {
          const list = this.sharedBindings('choice.' + (i + 1));
          if (root.keybind.matchesAny(event, list)) return i;
        }
        return -1;
      },
      option(featureId, optionId) {
        return root.storage.getOption(settings, featureId, optionId);
      },
      formatFirst(bindings) {
        if (!Array.isArray(bindings) || bindings.length === 0) return '';
        return root.keybind.formatBinding(bindings[0]);
      },
    };
  }

  let ctx = null;

  function handleKeyDown(e) {
    if (!ctx || !currentSettings || currentSettings.enabled === false) return;
    if (e.defaultPrevented) return;
    const handled = adapter.onKeyDown(e, ctx);
    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  function handleKeyUp(e) {
    if (!ctx || !currentSettings || currentSettings.enabled === false) return;
    if (typeof adapter.onKeyUp === 'function') {
      adapter.onKeyUp(e, ctx);
    }
  }

  function startObserver() {
    if (observer || !document.body) return;
    observer = new MutationObserver(() => {
      if (mutateTimer) clearTimeout(mutateTimer);
      mutateTimer = setTimeout(() => {
        if (ctx && currentSettings && currentSettings.enabled !== false && typeof adapter.onDomMutate === 'function') {
          adapter.onDomMutate(ctx);
        }
      }, 150);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  root.storage.load().then((settings) => {
    currentSettings = settings;
    ctx = createContext(settings);
    if (currentSettings.enabled !== false) {
      adapter.init(ctx);
    }
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    startObserver();
  });

  root.storage.onChange((newSettings) => {
    currentSettings = newSettings;
    ctx = createContext(newSettings);
    if (newSettings.enabled === false) {
      if (typeof adapter.destroy === 'function') adapter.destroy();
    } else {
      adapter.init(ctx);
    }
  });

  function fallbackContextMenuAnki(msg) {
    const anki = root.anki;
    if (!anki) return { ok: false, uri: '' };
    const rawText = (msg && msg.selectionText) || (document.body ? document.body.innerText || document.body.textContent || '' : '');
    const oics = rawText.match(/\bOIC[-_]\d{1,3}[-_]\d{1,2}[-_][AB](?:[-_]\d{1,2})?\b/gi) || [];
    const sdds = rawText.match(/\bSDD[-_]\d{1,3}\b/gi) || [];
    const items = [];
    const itemRe = /(?:Item|IC|N°)\s*[-:]?\s*(\d{1,3})\b/gi;
    let m;
    while ((m = itemRe.exec(rawText)) !== null && items.length < 3) {
      if (items.indexOf(m[1]) === -1) items.push(m[1]);
    }
    const keywords = anki.extractMedicalKeywords(rawText, 5);
    const uri = anki.buildAnkiEdnUri({
      action: 'qcm',
      src: siteId,
      oic: oics,
      sdd: sdds,
      item: items,
      q: keywords,
    });
    if (uri) {
      anki.launchAnkiUri(uri, 'Ouverture dans Anki EDN...');
      return { ok: true, uri };
    }
    root.dom.showToast('Aucune notion détectée pour Anki EDN.');
    return { ok: false, uri: '' };
  }

  const isFirefox = typeof browser !== 'undefined' && Boolean(browser && browser.runtime);
  const extApi = isFirefox ? browser : (typeof chrome !== 'undefined' ? chrome : null);
  if (extApi && extApi.runtime && extApi.runtime.onMessage) {
    extApi.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (!msg || msg.type !== 'qcmk-open-anki') return;
      const rawRes = typeof adapter.onContextMenuAnki === 'function'
        ? adapter.onContextMenuAnki(msg, ctx)
        : fallbackContextMenuAnki(msg);
      const result = rawRes && typeof rawRes === 'object'
        ? rawRes
        : { ok: Boolean(rawRes), uri: '' };
      if (isFirefox) {
        return Promise.resolve(result);
      }
      if (typeof sendResponse === 'function') {
        sendResponse(result);
      }
    });
  }
})();

  /* --- src/userscript/panel.js --- */
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

})();
