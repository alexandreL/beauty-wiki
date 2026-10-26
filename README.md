# Beauty Wiki

Extension Firefox qui redessine les pages Wikipédia pour la lecture, sans compte,
sans IA et sans redirection. Sur ordinateur comme sur téléphone.

## Objectif

Appliquer localement une mise en page de lecture moderne (couverture, titres serif,
colonne de lecture, thème sombre) directement sur `*.wikipedia.org`, à la volée.

Deux peaux sont prises en charge :

- **Vector 2022** (bureau) : grille magazine, sommaire latéral collant, colonne de
  lecture réglable.
- **Minerva** (mobile, celui que Firefox sur Android reçoit réellement) : couverture
  avant le titre, carte « Faits en bref » repliable à la place de l'infobox,
  sommaire en feuille coulissante, texte aéré et images pleine largeur.

## Installation

### Firefox (temporaire)

1. Ouvrir Firefox → `about:debugging#/runtime/this-firefox`
2. « Charger un module complémentaire temporaire… »
3. Choisir `dist/firefox/manifest.json` (ou `manifest.json` à la racine).

L'extension reste active jusqu'au redémarrage de Firefox.

### Firefox pour Android

L'extension cible le skin mobile de Wikipédia, donc Firefox sur Android est la cible
principale. Une fois le paquet publié sur addons.mozilla.org (ou chargé via une
collection), l'installation se fait normalement depuis le gestionnaire de modules.
Le rendu mobile est vérifié sur le DOM Minerva réel (Playwright, profil iPhone) et
sur un fixture Minerva pour les tests.

### Chrome / Edge

Chrome Android n'accepte pas les extensions ; la version Chrome vise le bureau et
les fenêtres étroites.

1. Ouvrir `chrome://extensions` et activer le mode développeur.
2. « Charger l'extension non empaquetée ».
3. Choisir le dossier `dist/chrome/`.

### Paquets

```bash
npm run build           # Firefox + Chrome dans artifacts/
npm run build:firefox
npm run build:chrome
```

## Réglages

Le bouton dans l'en-tête cycle **auto (suit le réglage du système) → clair → sombre** ;
le choix est mémorisé. Le popup de la barre d'outils propose :

- **Thème** : auto (suit l'OS), clair, sombre.
- **Largeur** : 680, 860 (défaut), 970, 1200 px.
- **Taille du texte** : S, M (défaut), L.

Sur mobile, le bouton de thème prend place dans la barre Minerva, à côté de la
recherche. Les préférences sont stockées dans `storage.local`, rien n'est envoyé sur
le réseau.

## Vue mobile

- La couverture ouvre la page, avant le titre, avec un cadrage 4/3 sur téléphone.
- L'infobox devient une carte **Faits en bref** repliée, qui affiche les premières
  rubriques (Pays, Région, …) et se déplie au toucher.
- Les sections ne sont pas des accordéons : l'article se lit d'un seul tenant.
- Un bouton **Sommaire** apparaît après le premier défilement et ouvre une feuille
  avec la hiérarchie complète ; il s'efface à la descente pour ne pas masquer le texte.
- Les tableaux larges défilent horizontalement, les images et légendes ne débordent
  jamais, et les fonds colorés des TemplateStyles sont neutralisés.

## Limites connues

- Le layout magazine s'applique aux articles (espace de noms principal) et à la page
  d'accueil. `Special:`, historique, diff, édition et discussions ne reçoivent que les
  couleurs et la typographie.
- Vector 2022 et Minerva sont les cibles ; les autres skins ne sont pas supportés.
- En thème sombre, les couleurs codées en dur par les TemplateStyles de Wikipédia
  peuvent rester claires. Les surfaces principales (infobox, tableaux, notes,
  galeries) sont couvertes, et le mode nuit natif de Minerva est activé en même temps
  que le thème sombre.
- Le rendu Firefox n'est pas exécuté dans la CI ; la suite Playwright tourne dans
  Chromium avec le DOM Minerva réel et des fixtures.

## Polices

IBM Plex Serif est embarquée sous licence SIL Open Font License 1.1
(`fonts/OFL.txt`). Aucune police propriétaire n'est utilisée.

## Tests

```bash
npm install
npm test        # unitaires + intégration navigateur (Playwright)
npm run lint    # web-ext lint (manifest Firefox)
npm run build   # zips Firefox + Chrome dans artifacts/
```

En CI, les tests tournent avec Chromium (`BW_CHANNEL=chromium`).

## Licence

Code sous MIT. Les contenus Wikipédia restent sous CC BY-SA.
