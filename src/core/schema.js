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
      name: 'Compteur d\'ancrages par matière',
      description: 'Affiche le nombre de questions à revoir par matière et un bouton de lancement rapide sur la page Ancrage.',
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
          clearAll: [bind('f', { ctrl: true })],
        },
        'edn.sidebarScores': {
          clearNotes: [bind('n', { ctrl: true })],
        },
        'uness.flags': { toggle: [bind('f')] },
        'asclepia.flags': { toggle: [bind('f')] },
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
