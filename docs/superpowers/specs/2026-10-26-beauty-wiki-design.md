# Beauty Wiki — design

Date : 2026-10-26
Statut : proposition, en attente de validation

## 1. Intention et pourquoi

WikiWand est passé en « login first » : son design n'est plus accessible sans compte.
Beauty Wiki applique la même direction visuelle **localement**, à la volée, sur les pages
Wikipédia, sans compte, sans serveur, sans IA, sans redirection.

L'utilisateur veut lire Wikipédia dans une mise en page de magazine : titres serif,
image de couverture, colonne de lecture confortable, thème clair/sombre, et **rien
d'autre**. La page reste Wikipédia : même contenu, mêmes liens, même langue.

## 2. Objectifs

- Restyler n'importe quel article Wikipédia, toutes langues, à l'ouverture.
- Reproduire la direction visuelle mesurée sur Wikiwand (cf. `wikiwand-design/`) :
  layout trois zones, cover pleine largeur, duo serif/sans, palette neutralisée.
- Mode clair, sombre, et auto (suit l'OS).
- Réglages : largeur de lecture, taille de texte, thème (persistés).
- Zéro réseau, zéro compte, zéro télémétrie. Tout tient dans le paquet signé.
- Ne pas casser Wikipédia : liens, notes, références, langues et recherche restent
  fonctionnels.

## 3. Non-objectifs

- Pas d'IA, pas de panneau conversationnel, pas de résumé.
- Pas de redirection vers un autre site.
- Pas de réécriture du contenu ni de l'API Wikipédia.
- Pas de support des autres projets Wikimedia (Wiktionnaire, Commons…) en v1.
- Pas de Chromium/Chrome en v1 (l'extension est d'abord Firefox ; le code reste
  compatible pour un portage trivial).

## 4. Anti-objectifs (échec même si « ça marche »)

- Flash de page non stylée (FOUC) ou saut de mise en page à l'ouverture.
- Page illisible sans CSS de Wikipédia (si l'extension casse, la page doit rester
  utilisable) : tout le style est additif et scopé.
- Contraste insuffisant ou animations non respectueuses de `prefers-reduced-motion`.
- Toute requête sortante ou permission superflue.

## 5. Contraintes

- **Firefox, Manifest V3**, `content_scripts` (CSS + JS) + `storage` + `action` popup.
  Pas de background/service worker nécessaire.
- Injection uniquement sur `*://*.wikipedia.org/*`.
- Aucune ressource distante : polices et icônes embarquées.
- Ne pas copier le CSS de Wikiwand ni utiliser Google Sans (propriétaire). On
  reconstruit les tokens ; IBM Plex Serif est sous OFL et peut être embarqué.
- La page doit rester fonctionnelle si le JS de l'extension échoue : le CSS seul
  doit déjà produire 90 % du rendu.

## 6. Décisions de design (mesurées, à reproduire)

### 6.1 Tokens

| Token | Clair | Sombre |
|---|---|---|
| `--bw-bg` | `#fff` | `#0a0a0a` |
| `--bw-fg` | `#000` | `#fff` |
| `--bw-ash` (surfaces) | `#f7f7f7` | `#252525` |
| `--bw-border` | `#e1e1e1` | `#3a3a3a` |
| `--bw-mid` | `#858585` | `#9f9f9f` |
| `--bw-link` | `#3e69c5` | `#8498ff` |
| `--bw-accent` | `#161FFF` | `#8498ff` |
| `--bw-error` | `#db3434` | `#e06565` |

Rayons 4/8/12/16/24 px, élévations `0 0 10px rgba(0,0,0,.1)` et
`2px 3px 16px rgba(0,0,0,.2)`, base d'espacement 16 px (échelle 4→64).

### 6.2 Typographie

- Titres : IBM Plex Serif (embarquée, woff2, sous-ensemble latin + latin-ext).
  h1 44 px/600/1.2 — h2 28 px/600/1.3 — h3 24 px/500/1.3.
- Corps : pile système sans-serif (SF/Segoe/Roboto), 16 px, interligne 1.5.
- Liens : soulignés au survol uniquement, couleur `--bw-link`.
- Taille de texte réglable : S 15 px / M 16 px / L 18 px (`html[data-bw-size]`).

### 6.3 Layout (desktop ≥ 1024 px)

- Sommaire : colonne gauche 200 px, sticky, réutilise le TOC Wikipédia existant
  (`.vector-toc`) pour conserver le suivi de section active.
- Article : colonne centrée, largeur par défaut **860 px**, réglable 680/860/970/1200.
- Infobox : conservée, restylée, flottante à droite dans la colonne article.
- Cover : première image pertinente de l'article, clonée dans une `<figure
  class="bw-cover">` pleine largeur de colonne, coins 24 px, insérée avant le corps.
- Chrome : en-tête minimal sticky (logo, recherche, langues), onglets d'édition,
  historique, « modifier », portlets et bandeaux masqués. **Lecture pure.**
- Pas de rail d'icônes ni de panneau : les réglages vivent dans le popup de l'extension.

### 6.4 Thèmes

`data-bw-theme` sur `<html>` : `light`, `dark`, `auto` (défaut). `auto` suit
`prefers-color-scheme` via `@media`. Les images bénéficient de `color-scheme` pour
les contrôles natifs.

### 6.5 Responsive

- ≥ 1024 px : trois zones (TOC | article | marge).
- 768–1023 px : TOC replié en bouton, article pleine largeur.
- < 768 px : une colonne, cover bord à bord, réglages identiques.

## 7. Architecture

```
beauty-wiki/
  manifest.json
  src/beauty.css        # tokens, thèmes, layout, composants, media queries
  src/content.js        # cover, préférences, TOC replié, garde-fous
  src/popup.html|css|js # thème, largeur, taille
  fonts/*.woff2         # IBM Plex Serif (OFL) + licence
  icons/*.png|svg
  README.md
```

- CSS injecté en premier (`run_at: document_start` pour éviter le FOUC sur le fond,
  le reste au chargement).
- JS : lit `storage.local`, pose les attributs `data-bw-*`, extrait la cover, ajoute
  le bouton de repli du TOC, nettoie les éléments de chrome.
- Sélecteurs ciblés sur `body.skin-vector-2022` (skin par défaut) ; repli générique
  pour `skin-vector` legacy. Si le skin n'est pas reconnu : aucune modification.
- Préférences : `{theme, width, size}` dans `storage.local`, appliquées avant le
  premier paint via un script `document_start` (attributs sur `<html>`).

## 8. Heuristique de cover

Ordre de préférence de l'image : `table.infobox img` (la plus grande) →
`figure img` dans le contenu → première `img` de `#mw-content-text` de largeur
≥ 300 px. On clone l'URL (pas le nœud) dans la cover, on ignore les icônes, drapeaux
et SVG. Si aucune image : pas de cover, le h1 remonte simplement.

## 9. Ce qui est laissé au builder

- Choix exact de la pile sans-serif et sous-ensembles de polices.
- Structure du popup et style des contrôles.
- Stratégie précise de masquage du chrome Wikipédia selon les skins.
- Détail de l'animation d'apparition de la cover.
- Nom des classes préfixées `bw-` et organisation du CSS.

## 10. Critères de réussite

- Sur `fr.wikipedia.org/wiki/Paris`, `en.wikipedia.org/wiki/Paris` et un article
  sans image : rendu propre, aucun élément de chrome d'édition visible, thème
  clair/sombre fonctionnel, réglages persistants après rechargement.
- Aucune requête réseau hors domaines Wikipédia ; `web-ext lint` sans erreur.
- La page reste lisible et cliquable si le JS de l'extension est désactivé.

## 11. Décisions prises après revue (appels du builder)

1. **En-tête conservé et restylé en place.** Logo, recherche (formulaire native) et
   sélecteur de langues restent fonctionnels ; menu utilisateur, notifications,
   watchlist, onglets Article/Discussion et actions d'édition masqués. Aucun composant
   natif n'est reconstruit en JS : robustesse et « CSS seul = 90 % » préservés.
2. **Portée des pages** : espace de noms principal (articles + page d'accueil) reçoit
   le layout magazine ; `Special:*`, `action=edit|history|diff`, résultats de recherche
   et pages de discussion reçoivent seulement les tokens (fond, texte, liens, thème),
   jamais la colonne article.
3. **TOC restylé sur place** (nœud natif `.vector-toc` conservé, colonne 200 px,
   sticky), donc le suivi de section de Wikipédia continue de fonctionner. Sous
   1024 px, le TOC devient un tiroir superposé ouvert par un bouton `bw-toc-toggle`.
4. **Cover** : ratio fixe 2.4:1, `object-fit: cover`, hauteur max 420 px, insérée
   entre le `h1` et le chapô ; si l'image de l'infobox est la même, elle y est
   masquée pour éviter le doublon. Boîte réservée dès le CSS pour éviter le CLS.
5. **Flash de préférences** : toléré au pire une frame (pas de cache dans le
   `localStorage` de Wikipédia, pour rester sans trace). `theme=auto` est appliqué
   en CSS pur via `prefers-color-scheme`, donc sans flash.
6. **Mode sombre** : meilleur effort + overrides ciblés (infobox, wikitable, navbox,
   hatnotes/ambox, galeries, `math`, `code`, vignettes). Les couleurs codées en dur
   par TemplateStyles restent une limite documentée dans le README, pas un critère
   d'échec. Si le gadget sombre natif de Wikipédia est actif, l'extension le laisse
   gagner.
7. **Non-latin** : IBM Plex Serif est embarquée pour latin/latin-ext/cyrillique/grec ;
   les autres écritures retombent sur la serif système de la plateforme. Le layout
   magazine reste garanti, la police non.
8. **Cover haute résolution** : l'URL de vignette Wikimedia est réécrite vers ~1200 px
   quand le motif est reconnu, sinon l'URL d'origine est utilisée. Aucune requête
   hors domaines Wikimedia.

## 12. Hors périmètre v1 (backlog)

- Portage Chrome/Edge.
- Autres skins (Monobook, Timeless).
- Export du thème vers d'autres sites.
- Sync des préférences entre appareils (`storage.sync`).
