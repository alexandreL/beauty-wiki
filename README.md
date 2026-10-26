# Beauty Wiki

Extension Firefox qui redessine les pages Wikipédia pour la lecture, sans compte,
sans IA et sans redirection.

## Objectif

Appliquer localement la direction visuelle de Wikiwand (couverture, titres serif,
colonne de lecture, thème sombre) directement sur `*.wikipedia.org`, à la volée.

## Installation temporaire

1. Ouvrir Firefox → `about:debugging#/runtime/this-firefox`
2. « Charger un module complémentaire temporaire… »
3. Choisir `manifest.json` à la racine du projet.

L'extension reste active jusqu'au redémarrage de Firefox.

## Réglages

Le popup de la barre d'outils propose :

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
- Firefox uniquement pour l'instant ; Chromium n'est pas testé.

## Polices

IBM Plex Serif est embarquée sous licence SIL Open Font License 1.1
(`fonts/OFL.txt`). Aucune police propriétaire n'est utilisée.

## Tests

```bash
npm install
npm test        # unitaires + intégration (Chrome via Playwright)
npm run lint    # web-ext lint
```

## Licence

Code sous MIT. Les contenus Wikipédia restent sous CC BY-SA.
