# Beauty Wiki

Extension Firefox qui redessine les pages Wikipédia pour la lecture, sans compte,
sans IA et sans redirection.

## Objectif

Appliquer localement une mise en page de lecture moderne (couverture, titres serif,
colonne de lecture, thème sombre) directement sur `*.wikipedia.org`, à la volée.

## Installation

### Firefox (temporaire)

1. Ouvrir Firefox → `about:debugging#/runtime/this-firefox`
2. « Charger un module complémentaire temporaire… »
3. Choisir `dist/firefox/manifest.json` (ou `manifest.json` à la racine).

L'extension reste active jusqu'au redémarrage de Firefox.

### Chrome / Edge

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

Les préférences sont stockées dans `storage.local`, rien n'est envoyé sur le réseau.

## Limites connues

- Le layout magazine ne s'applique qu'aux articles (espace de noms principal) et à
  la page d'accueil. `Special:`, historique, diff, édition et discussions ne
  reçoivent que les couleurs et la typographie.
- Le skin Vector 2022 est la cible. Les autres skins ne sont pas supportés.
- En thème sombre, les couleurs codées en dur par les TemplateStyles de Wikipédia
  peuvent rester claires. Les surfaces principales (infobox, tableaux, notes,
  galeries) sont couvertes.
- Firefox uniquement pour l'instant. Le paquet est validé par `web-ext lint` et par une
suite Playwright exécutée dans Chrome ; le rendu n'a pas encore été vérifié dans un
vrai Firefox sur cette machine (Firefox n'y est pas installé).

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
