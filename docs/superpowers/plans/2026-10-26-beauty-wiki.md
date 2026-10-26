# Beauty Wiki Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Une extension Firefox qui restyle les pages Wikipédia à la volée avec la direction visuelle de Wikiwand, sans compte, sans IA, sans redirection.

**Architecture:** MV3, aucun build. CSS injecté par `content_scripts` (six feuilles ordonnées), un script classique `src/lib.js` (fonctions pures testables), un `src/content.js` qui applique les préférences, insère la cover et câble le TOC. Popup de réglages sur `storage.local`. Les tests unitaires tournent sous `node --test` ; les tests d'intégration chargent des fixtures HTML Vector 2022 dans Chrome via Playwright et injectent les mêmes fichiers que l'extension.

**Tech Stack:** JavaScript ES2022 (scripts classiques), CSS, Node 26 `node:test`, Playwright (devDependency, `channel: "chrome"`), `web-ext` pour le lint.

**Spec:** `docs/superpowers/specs/2026-10-26-beauty-wiki-design.md`

## Global Constraints

- Manifest V3, Firefox ≥ 115, `browser_specific_settings.gecko.id` obligatoire.
- Permissions : `storage` uniquement. `host_permissions` : `*://*.wikipedia.org/*`.
- Injection limitée à `*://*.wikipedia.org/*` ; aucune autre origine.
- Aucune requête réseau émise par l'extension ; polices et icônes locales.
- Aucune copie du CSS Wikiwand ; Google Sans interdit ; IBM Plex Serif (OFL) embarquée.
- Préfixe `bw-` pour toutes les classes et attributs injectés (`data-bw-*`).
- La page doit rester lisible et cliquable si `src/content.js` échoue : tout le layout vient du CSS.
- Aucun `!important` en dehors des neutralisations de chrome Wikipédia et des règles d'accessibilité (mouvement réduit), chacune commentée.
- `prefers-reduced-motion` respecté ; contraste texte ≥ 4.5:1.

## Review Focus

- **Article sans image de lead** : pas de cover, pas de boîte vide, pas de saut de mise en page.
- **Pages hors espace principal** (`Special:`, `action=edit|history|diff`, discussion) : tokens seuls, jamais la colonne magazine.
- **Thème sombre stocké** : pas de flash blanc durable ; `auto` ne flashe pas du tout.
- **Contenu large** (infobox, `wikitable`, galerie) : aucun débordement horizontal à 390 px.
- **RTL** (`ar.wikipedia.org`, `he.wikipedia.org`) : texte et sommaire restent lisibles, pas de miroir cassé.

---

## File Structure

```
beauty-wiki/
  manifest.json
  package.json
  README.md
  .gitignore
  src/
    lib.js              # fonctions pures + sélection de cover (testable)
    content.js          # bootstrap, DOM, storage, TOC
    css/tokens.css      # variables clair/sombre, polices, reset scopé
    css/base.css        # typographie de lecture, liens, titres
    css/layout.css      # grille TOC | article | marge, largeurs, responsive
    css/chrome.css      # header restylé, masquage édition/discussion/compte
    css/content.css     # infobox, tableaux, galeries, citations, notes
    css/responsive.css  # <1024 px, <768 px, tiroir TOC, RTL
    popup/popup.html
    popup/popup.css
    popup/popup.js
  fonts/ibm-plex-serif-latin-{400,500,600}-normal.woff2
  fonts/OFL.txt
  icons/icon.svg
  tests/
    fixtures/{article,article-noimage,special,edit,rtl}.html
    helpers/server.js
    unit/lib.test.js
    e2e/{layout,theme,cover,chrome,popup}.test.js
```

---

## Task 1: Squelette, manifest et harnais de test

**Files:**
- Create: `manifest.json`, `package.json`, `.gitignore`, `README.md`
- Create: `src/lib.js`, `src/content.js` (stubs), `icons/icon.svg`
- Create: `tests/fixtures/article.html`, `tests/helpers/server.js`
- Create: `tests/unit/manifest.test.js`

**Interfaces:**
- Produces: un projet chargeable par Firefox (`web-ext lint` sans erreur) et un serveur de fixtures `startServer(root) -> {url, close}` sur `tests/helpers/server.js`.

- [ ] **Step 1: Écrire le test qui échoue**

`tests/unit/manifest.test.js` :

```js
const test = require('node:test');
const assert = require('node:assert');
const manifest = require('../../manifest.json');

test('manifest is a valid Firefox MV3 extension', () => {
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.name, 'Beauty Wiki');
  assert.deepEqual(manifest.permissions, ['storage']);
  assert.deepEqual(manifest.host_permissions, ['*://*.wikipedia.org/*']);
  assert.equal(manifest.content_scripts[0].matches[0], '*://*.wikipedia.org/*');
  assert.ok(manifest.browser_specific_settings.gecko.id);
  assert.ok(manifest.content_scripts[0].css.length >= 1);
});
```

- [ ] **Step 2: Lancer le test pour vérifier l'échec**

Run: `node --test tests/unit/manifest.test.js`
Expected: FAIL `Cannot find module '../../manifest.json'`

- [ ] **Step 3: Écrire `manifest.json`**

```json
{
  "manifest_version": 3,
  "name": "Beauty Wiki",
  "version": "0.1.0",
  "description": "Redesign de lecture pour Wikipédia, sans compte ni IA.",
  "browser_specific_settings": { "gecko": { "id": "beauty-wiki@local", "strict_min_version": "115.0" } },
  "permissions": ["storage"],
  "host_permissions": ["*://*.wikipedia.org/*"],
  "content_scripts": [{
    "matches": ["*://*.wikipedia.org/*"],
    "css": ["src/css/tokens.css", "src/css/base.css", "src/css/layout.css", "src/css/chrome.css", "src/css/content.css", "src/css/responsive.css"],
    "js": ["src/lib.js", "src/content.js"],
    "run_at": "document_start"
  }],
  "action": { "default_popup": "src/popup/popup.html", "default_title": "Beauty Wiki", "default_icon": { "48": "icons/icon.svg" } },
  "icons": { "48": "icons/icon.svg", "96": "icons/icon.svg" }
}
```

- [ ] **Step 4: Créer `package.json`, `.gitignore`, les feuilles CSS vides, le README**

`package.json` : `"private": true`, scripts `test` = `node --test tests/unit/*.test.js tests/e2e/*.test.js`, `lint` = `web-ext lint --source-dir . --ignore-files "tests/**" "docs/**" "node_modules/**"`, devDependency `playwright` et `web-ext`.
`.gitignore` : `node_modules/`, `web-ext-artifacts/`, `*.zip`.
Feuilles CSS : chacune avec un en-tête `/* Beauty Wiki — <rôle> */` seulement.
Stubs : `src/lib.js` = `var BWLib = {};` + `if (typeof module !== 'undefined') module.exports = BWLib;` ; `src/content.js` = `(() => {})();` ; `icons/icon.svg` = carré arrondi `#161FFF` avec un « B » blanc en IBM Plex Serif (fallback Georgia).
README : objectif, installation temporaire (`about:debugging`), limites connues (TemplateStyles).

- [ ] **Step 5: Écrire la fixture `tests/fixtures/article.html`**

Reproduire la structure Vector 2022 minimale : `html.skin-vector-2022`, `.vector-header` (formulaire de recherche, bouton langues, menu utilisateur), `.mw-page-container > .vector-column-start > .vector-toc`, `.mw-content-container` avec `.mw-body-header` (`h1#firstHeading`, `#p-views` onglets Article/Discussion, `#p-cactions`), `#mw-content-text > .mw-parser-output` contenant un `.infobox` avec `<img src="/img/paris-320.jpg">`, deux paragraphes, un `.hatnote`, un `table.wikitable`, une `figure`, `.mw-editsection`, et `.vector-column-end` avec le panneau Apparence. Ajouter un `footer`.

- [ ] **Step 6: Écrire `tests/helpers/server.js`**

`startServer(root)` : `node:http` qui sert les fichiers sous `root` (MIME html/css/js/woff2/png), écoute sur `127.0.0.1:0`, retourne `{url, close}`. Les images de fixture sont des PNG 1×1 générés en mémoire par le serveur sous `/img/*.jpg` pour éviter de committer des binaires.

- [ ] **Step 7: Lancer test + lint**

Run: `node --test tests/unit/manifest.test.js && npx web-ext lint --source-dir . --ignore-files "tests/**" "docs/**" "node_modules/**"`
Expected: PASS, puis `Validation Summary: errors 0, warnings 0, notices 0` (un warning de version mineure est acceptable).

- [ ] **Step 8: Commit**

```bash
git init
git add manifest.json package.json .gitignore README.md src tests docs
git commit -m "chore: scaffold Beauty Wiki extension and test harness"
```

---

## Task 2: Bibliothèque pure (réglages, type de page, URL de vignette)

**Files:**
- Create: `src/lib.js`
- Test: `tests/unit/lib.test.js`

**Interfaces:**
- Produces (`var BWLib`, aussi `module.exports` quand présent) :
  - `normalizeSettings(raw: object) -> {theme: 'auto'|'light'|'dark', width: 680|860|970|1200, size: 's'|'m'|'l'}`
  - `pageKind(urlString: string) -> 'article'|'main'|'special'|'edit'|'history'|'diff'|'search'|'talk'|'other'`
  - `upscaleThumbUrl(url: string, targetWidth: number) -> string`
  - `applySettings(root: Element, settings: object) -> void` (pose `data-bw-theme`, `data-bw-width`, `data-bw-size`)

- [ ] **Step 1: Écrire les tests qui échouent**

```js
const test = require('node:test');
const assert = require('node:assert');
const BW = require('../../src/lib.js');

test('normalizeSettings falls back to defaults', () => {
  assert.deepEqual(BW.normalizeSettings(undefined), { theme: 'auto', width: 860, size: 'm' });
  assert.deepEqual(BW.normalizeSettings({ theme: 'dark', width: 1200, size: 'l' }), { theme: 'dark', width: 1200, size: 'l' });
  assert.deepEqual(BW.normalizeSettings({ theme: 'neon', width: 42, size: 'xl' }), { theme: 'auto', width: 860, size: 'm' });
});

test('pageKind classifies Wikipedia URLs', () => {
  assert.equal(BW.pageKind('https://fr.wikipedia.org/wiki/Paris'), 'article');
  assert.equal(BW.pageKind('https://fr.wikipedia.org/wiki/Accueil'), 'main');
  assert.equal(BW.pageKind('https://fr.wikipedia.org/wiki/Main_Page'), 'main');
  assert.equal(BW.pageKind('https://fr.wikipedia.org/w/index.php?title=Paris&action=edit'), 'edit');
  assert.equal(BW.pageKind('https://fr.wikipedia.org/w/index.php?title=Paris&action=history'), 'history');
  assert.equal(BW.pageKind('https://fr.wikipedia.org/w/index.php?title=Paris&diff=123'), 'diff');
  assert.equal(BW.pageKind('https://fr.wikipedia.org/w/index.php?search=paris'), 'search');
  assert.equal(BW.pageKind('https://fr.wikipedia.org/wiki/Sp%C3%A9cial:Recherche'), 'special');
  assert.equal(BW.pageKind('https://fr.wikipedia.org/wiki/Special:Random'), 'special');
  assert.equal(BW.pageKind('https://fr.wikipedia.org/wiki/Discussion:Paris'), 'talk');
  assert.equal(BW.pageKind('https://example.com/wiki/Paris'), 'other');
});

test('upscaleThumbUrl rewrites Wikimedia thumbnails only', () => {
  const u = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Paris.jpg/320px-Paris.jpg';
  assert.equal(BW.upscaleThumbUrl(u, 1200), 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Paris.jpg/1200px-Paris.jpg');
  const original = 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Paris.jpg';
  assert.equal(BW.upscaleThumbUrl(original, 1200), original);
});
```

- [ ] **Step 2: Lancer et vérifier l'échec**

Run: `node --test tests/unit/lib.test.js`
Expected: FAIL `Cannot find module '../../src/lib.js'`

- [ ] **Step 3: Implémenter `src/lib.js`**

Script classique en IIFE, `module.exports` conditionnel. Détails figés :
`normalizeSettings` valide strictement les trois enums, ignore le reste.
`pageKind` : parse l'URL ; `special` si le chemin commence par `/wiki/Special:` ou `/wiki/Spécial:` (insensible à la casse) ; `talk` si le titre commence par `Discussion:`/`Talk:` ou namespace impair ; `main` si titre ∈ {`Accueil`, `Main_Page`, `Wikipédia:Accueil_principal`} ; `other` hors `*.wikipedia.org`.
`upscaleThumbUrl` : regex `/(\d+)px-([^/]+)$` sur un chemin contenant `/thumb/` ; remplace la largeur, garde le reste ; retourne l'entrée sinon.
`applySettings` : `setAttribute` sur l'élément racine.

- [ ] **Step 4: Lancer et vérifier le succès**

Run: `node --test tests/unit/lib.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib.js tests/unit/lib.test.js
git commit -m "feat: add settings, page classification and thumb URL helpers"
```

---

## Task 3: Tokens, thèmes et typographie de lecture

**Files:**
- Create: `src/css/tokens.css`, `src/css/base.css`
- Test: `tests/e2e/theme.test.js`

**Interfaces:**
- Consumes: `BWLib.applySettings`.
- Produces: `html[data-bw-theme=light|dark]`, `html[data-bw-theme=auto]` effectif via `@media (prefers-color-scheme: dark)`, variables `--bw-bg`, `--bw-fg`, `--bw-ash`, `--bw-border`, `--bw-mid`, `--bw-link`, `--bw-accent`, `--bw-error`, `--bw-serif`, `--bw-sans`.

- [ ] **Step 1: Écrire le test qui échoue**

`tests/e2e/theme.test.js` : lance Chrome (`channel: 'chrome'`), ouvre `article.html` via le helper serveur, injecte les 6 CSS + `lib.js` + un stub `window.browser`, appelle `BWLib.applySettings(document.documentElement, {theme:'light',width:860,size:'m'})`, puis vérifie :

```js
assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(255, 255, 255)');
assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#firstHeading')).fontFamily.includes('IBM Plex Serif')), true);
assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#mw-content-text p')).fontSize), '16px');
```

Puis `theme: 'dark'` → `rgb(10, 10, 10)` et `--bw-fg` blanc. Puis `theme: 'auto'` avec `page.emulateMedia({colorScheme:'dark'})` → `rgb(10, 10, 10)`.
Le test doit aussi vérifier que `#mw-content-text p` a `lineHeight` = `24px` et `maxWidth` ≤ `1200px`.

- [ ] **Step 2: Lancer et vérifier l'échec**

Run: `node --test tests/e2e/theme.test.js`
Expected: FAIL, fond `rgb(255, 255, 255)` mais `fontFamily` sans IBM Plex Serif (ou `--bw-bg` absent).

- [ ] **Step 3: Écrire `tokens.css`**

`:root` avec les valeurs du spec §6.1, `[data-bw-theme='dark']` avec la colonne sombre, `@media (prefers-color-scheme: dark) { :root[data-bw-theme='auto'] { … } }`, `color-scheme: light dark`, `--bw-serif: 'IBM Plex Serif', 'Noto Serif', Georgia, serif`, `--bw-sans: -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`. Rayons `--bw-radius-*` et élévations `--bw-elevation-*`. Sélecteurs scopés sous `html[data-bw]` (attribut posé par `content.js`), pour ne rien toucher avant activation.

- [ ] **Step 4: Écrire `base.css`**

Scopé `html[data-bw] body` : fond, couleur, `font-family: var(--bw-sans)`, `font-size` 16 px (15/18 selon `[data-bw-size]`), `line-height: 1.5`. `h1,h2,h3,h4` en `var(--bw-serif)` avec les tailles du spec. Liens `--bw-link`, soulignés seulement au survol/focus. `prefers-reduced-motion: reduce` → aucune transition. Neutraliser les `font-family` inline de Wikipédia sur les titres et paragraphes avec `!important` commenté (une seule règle groupée).

- [ ] **Step 5: Lancer et vérifier le succès**

Run: `node --test tests/e2e/theme.test.js`
Expected: PASS (clair, sombre, auto, typographie)

- [ ] **Step 6: Commit**

```bash
git add src/css/tokens.css src/css/base.css tests/e2e/theme.test.js
git commit -m "feat: add design tokens, themes and reading typography"
```

---

## Task 4: Layout magazine et responsive

**Files:**
- Create: `src/css/layout.css`, `src/css/responsive.css`
- Create: `src/content.js` (bootstrap + TOC)
- Test: `tests/e2e/layout.test.js`

**Interfaces:**
- Consumes: `html[data-bw-width]` (680/860/970/1200).
- Produces: classes `bw-article` sur `<body>`, `bw-toc-toggle` (bouton injecté), `bw-toc-open` sur `<html>`.

- [ ] **Step 1: Écrire le test qui échoue**

À 1440×900 sur `article.html` :
- `#mw-content-text` largeur du bloc texte = 860 px (±2) par défaut ;
- `data-bw-width=1200` → 1200 px ;
- `.vector-toc` `position` = `sticky`, largeur 200 px ;
- `.vector-column-end` (`display: none`) ;
- à 390×844 : `document.documentElement.scrollWidth <= 390` (pas de débordement) et `#mw-content-text` largeur ≤ 390 ;
- `.bw-toc-toggle` visible sous 1024 px, `aria-expanded="false"`, clic → `html` porte `bw-toc-open`.

- [ ] **Step 2: Lancer et vérifier l'échec**

Run: `node --test tests/e2e/layout.test.js`
Expected: FAIL (largeur de contenu ≠ 860 px, TOC non sticky).

- [ ] **Step 3: Écrire `layout.css`**

`body.bw-article .mw-page-container` en grille `200px minmax(0, var(--bw-article-width)) 1fr` avec `column-gap: 48px`, `max-width: 1400px`, `margin-inline: auto`. `--bw-article-width: 860px` par défaut et surchargé par `[data-bw-width='680|970|1200']`. `.vector-column-start` sticky `top: 16px`, hauteur `calc(100vh - 32px)`, overflow auto avec masque. `.mw-content-container` `min-width: 0`. Masquer `.vector-column-end`, `.mw-body-header .vector-tabs`, `.mw-indicators`. Forcer `img, table { max-width: 100% }` et `overflow-wrap: anywhere` sur le contenu.

- [ ] **Step 4: Écrire `responsive.css`**

`@media (max-width: 1023px)` : grille une colonne, `.vector-column-start` en `position: fixed` hors écran, `.bw-toc-toggle` fixe en bas à gauche (44 px, fond `--bw-ash`, bordure, `z-index: 60`), `html.bw-toc-open` fait glisser le TOC (translate + voile). `@media (max-width: 767px)` : cover bord à bord (marges négatives), `h1` 34 px, `padding-inline: 16px`, infobox pleine largeur non flottante. `@media (prefers-reduced-motion: reduce)` : pas de transition sur le tiroir. RTL : `[dir='rtl']` inverse `grid-template-columns` et les marges logiques uniquement.

- [ ] **Step 5: Câbler le bouton TOC dans `content.js`**

`BW.tocToggle()` crée `<button class="bw-toc-toggle" aria-controls="vector-toc" aria-expanded="false">Sommaire</button>` (libellé selon `document.documentElement.lang` : `fr` → Sommaire, sinon Contents), bascule `html.bw-toc-open` et `aria-expanded`. Le bouton n'est créé que sur `pageKind === 'article'`. Fermeture au clic sur le voile et sur `Escape`.

- [ ] **Step 6: Lancer et vérifier le succès**

Run: `node --test tests/e2e/layout.test.js`
Expected: PASS (largeurs, sticky, mobile sans débordement, tiroir)

- [ ] **Step 7: Commit**

```bash
git add src/css/layout.css src/css/responsive.css src/content.js tests/e2e/layout.test.js
git commit -m "feat: add magazine layout, responsive breakpoints and TOC drawer"
```

---

## Task 5: Chrome Wikipédia — header épuré et lecture pure

**Files:**
- Create: `src/css/chrome.css`
- Modify: `src/content.js` (classification de page, classe `bw-article`)
- Test: `tests/e2e/chrome.test.js`

**Interfaces:**
- Consumes: `BWLib.pageKind`.
- Produces: `document.body.classList` contient `bw-article` uniquement pour `article|main` ; `bw-tokens-only` pour les autres pages Wikipédia.

- [ ] **Step 1: Écrire le test qui échoue**

Sur `article.html` : `#p-views`, `#p-cactions`, `.mw-editsection`, `#pt-userpage`, `#pt-notifications` ont `display: none` ; `#searchform` et `#p-lang-btn` sont visibles (`display != none`) et le champ de recherche est focusable. `.vector-header` a `position: sticky` et `top: 0`.
Sur `edit.html` (`action=edit`) et `special.html` : `body.bw-tokens-only`, pas de `bw-toc-toggle`, `.mw-page-container` n'a pas `display: grid`.

- [ ] **Step 2: Lancer et vérifier l'échec**

Run: `node --test tests/e2e/chrome.test.js`
Expected: FAIL (onglets visibles).

- [ ] **Step 3: Écrire `chrome.css`**

Masquer (une règle par groupe, chacune commentée) : `#p-views`, `#p-cactions`, `#p-associated-pages`, `.mw-editsection`, `#pt-userpage`, `#pt-notifications`, `#pt-watchlist`, `#p-personal`, `.mw-indicators`, `.mw-body-header .mw-editsection`, `.vector-page-toolbar`, `.mw-jump-link` (remplacé par un lien d'évitement `bw-skip`), les bandeaux `.mw-message-box`, `.centralnotice` et `.frbanner`. Restyler `.vector-header` : hauteur 64 px, fond `--bw-bg`, bordure basse 1 px, sticky, padding 16/24, recherche en pilule `--bw-ash` (bordure `--bw-border`, radius 999 px, largeur max 420 px). Cacher le logo textuel de Wikipédia et le remplacer par un `bw-logo` inline (texte `Wikipedia` en serif 18 px) injecté par `content.js`. `bw-skip` : lien visible au focus clavier uniquement.

- [ ] **Step 4: Appliquer la classification dans `content.js`**

Au chargement : `document.documentElement.setAttribute('data-bw','')` ; `const kind = BWLib.pageKind(location.href)` ; `body.classList.add(kind === 'article' || kind === 'main' ? 'bw-article' : 'bw-tokens-only')`. Si `kind === 'other'`, retirer `data-bw` et ne rien faire. `bw-article` seul déclenche layout, cover, TOC et toggle.

- [ ] **Step 5: Lancer et vérifier le succès**

Run: `node --test tests/e2e/chrome.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/css/chrome.css src/content.js tests/e2e/chrome.test.js
git commit -m "feat: hide editing chrome and restyle header, scope by page kind"
```

---

## Task 6: Cover d'article

**Files:**
- Modify: `src/lib.js` (ajout `pickCoverImage`), `src/content.js` (insertion)
- Modify: `src/css/content.css`
- Test: `tests/e2e/cover.test.js`, `tests/unit/lib.test.js`

**Interfaces:**
- Produces: `BWLib.pickCoverImage(doc: Document, pageUrl: string) -> {src: string, alt: string}|null` ; `figure.bw-cover > img.bw-cover-img`.

- [ ] **Step 1: Écrire les tests qui échouent**

Unitaire (fixture DOM lue via `document` Playwright, pas jsdom) : `pickCoverImage` retourne l'image de `.infobox` quand elle existe (URL réécrite en 1200 px), sinon la première `figure img` ≥ 300 px, sinon `null` pour `article-noimage.html` ; ignore les SVG et les images < 300 px.
E2E : `article.html` → `figure.bw-cover` présente entre `#firstHeading` et le premier paragraphe, `img.src` contient `1200px-`, `width` = largeur de colonne, ratio 2.4:1 (`height ≈ width / 2.4`, ±2 px), l'image d'origine de l'infobox a `display: none` ; `article-noimage.html` → aucune `figure.bw-cover` et `#firstHeading` n'a pas de marge supérieure anormale.

- [ ] **Step 2: Lancer et vérifier l'échec**

Run: `node --test tests/unit/lib.test.js tests/e2e/cover.test.js`
Expected: FAIL `pickCoverImage is not a function`

- [ ] **Step 3: Implémenter `pickCoverImage`**

Ordre : `table.infobox img`, `.infobox img` (prendre la plus grande via `naturalWidth`/attribut `width`), puis `#mw-content-text figure img`, puis `#mw-content-text img`. Filtrer : `src` non vide, pas de `.svg`, largeur déclarée ≥ 300 ou `naturalWidth` ≥ 300, exclure les classes d'icônes (`icon`, `flag`, `logo`). Retourner `{src: upscaleThumbUrl(src, 1200), alt: img.alt || ''}`.

- [ ] **Step 4: Insérer la cover dans `content.js` + styles**

`BW.cover()` : si `bw-article` et `pickCoverImage` non nul, créer `figure.bw-cover` avec `img` (`loading='eager'`, `decoding='async'`, `width/height` réservés 1200×500), insérer avant le premier `p` de `.mw-parser-output`. Si l'image source est dans l'infobox, ajouter `bw-duplicate` (masquée en CSS). `content.css` : `.bw-cover { aspect-ratio: 2.4 / 1; max-height: 420px; border-radius: 24px; overflow: hidden; margin-block: 16px 32px }`, `img { width: 100%; height: 100%; object-fit: cover }`, pas d'animation si `prefers-reduced-motion`. Réserver la hauteur via `aspect-ratio` (pas de CLS).

- [ ] **Step 5: Lancer et vérifier le succès**

Run: `node --test tests/unit/lib.test.js tests/e2e/cover.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib.js src/content.js src/css/content.css tests/unit/lib.test.js tests/e2e/cover.test.js
git commit -m "feat: add article cover with Wikimedia thumbnail upscaling"
```

---

## Task 7: Contenu — infobox, tableaux, citations, mode sombre

**Files:**
- Modify: `src/css/content.css`, `src/css/tokens.css`
- Test: `tests/e2e/content.test.js`

**Interfaces:**
- Consumes: variables de thème.
- Produces: styles `.infobox`, `.wikitable`, `.thumb`, `blockquote`, `.hatnote`, `.navbox`, `.references`, `code`, `math`.

- [ ] **Step 1: Écrire le test qui échoue**

Sur `article.html` en clair : `.infobox` flotte à droite (`float: right`), largeur 320 px, fond `--bw-ash`, radius 16 px, padding 16 px. `.wikitable` a `border-collapse: collapse`, cellules avec bordure `--bw-border` et padding `8px 12px`. `blockquote` a une bordure gauche 3 px `--bw-border` et un retrait 16 px.
En sombre : `.infobox` et `.wikitable` fond `rgb(37, 37, 37)`, texte blanc, contraste calculé ≥ 4.5:1 sur le texte principal et les liens.
À 390 px : `.wikitable` ne dépasse pas la largeur (`scrollWidth <= clientWidth`) ; sinon l'élément est dans un conteneur `overflow-x: auto` (vérifier `getComputedStyle(parent).overflowX === 'auto'`).

- [ ] **Step 2: Lancer et vérifier l'échec**

Run: `node --test tests/e2e/content.test.js`
Expected: FAIL (infobox non flottante / couleurs Wikipédia)

- [ ] **Step 3: Écrire les styles**

`content.css` : infobox flottante 320 px (100 % sous 768 px), `table` enveloppés par `content.js` dans `div.bw-table-scroll` (`overflow-x: auto`) ; `.thumb`, `.thumbinner` sans bordures grises ; `.gallery` en grille `repeat(auto-fill, minmax(180px, 1fr))` ; `blockquote`, `.hatnote`, `.ambox`, `.navbox`, `.references`, `code`, `pre`, `math` avec les tokens. Overrides sombres sous `[data-bw-theme='dark']` **et** le bloc `auto` : images avec `background: #fff` quand `.logo`/`.flag`, `filter: invert(1)` interdit sur les photos.
`tokens.css` : ajouter `--bw-code-bg`, `--bw-quote-border`, `--bw-table-stripe`.

- [ ] **Step 4: Envelopper les tableaux dans `content.js`**

`BW.tables()` : pour chaque `table` dans `#mw-content-text` sans parent `.bw-table-scroll`, créer le wrapper et déplacer la table dedans. Idempotent (garde `data-bw-wrapped`).

- [ ] **Step 5: Lancer et vérifier le succès**

Run: `node --test tests/e2e/content.test.js`
Expected: PASS (clair, sombre, mobile, contraste)

- [ ] **Step 6: Commit**

```bash
git add src/css/content.css src/css/tokens.css src/content.js tests/e2e/content.test.js
git commit -m "feat: style article content and dark mode surfaces"
```

---

## Task 8: Popup de réglages et persistance

**Files:**
- Create: `src/popup/popup.html`, `src/popup/popup.css`, `src/popup/popup.js`
- Modify: `src/content.js`
- Test: `tests/e2e/popup.test.js`, `tests/unit/popup.test.js`

**Interfaces:**
- Consumes: `BWLib.normalizeSettings`.
- Produces: clé de stockage `beautyWiki` = `{theme, width, size}` ; événement `browser.storage.onChanged` réapplique les attributs.

- [ ] **Step 1: Écrire les tests qui échouent**

Unitaire : `popup.js` expose `formFromSettings(settings) -> {theme, width, size}` et `settingsFromForm(formData) -> settings` (fonctions pures, `module.exports` conditionnel) ; valeurs invalides → défauts.
E2E : charger `popup.html` avec un stub `browser.storage.local` ; sélectionner `dark` + `1200` + `l`, cliquer « Enregistrer » → `storage.local.set` appelé avec `{beautyWiki:{theme:'dark',width:1200,size:'l'}}`. Puis sur `article.html`, simuler `storage.onChanged` → `html` porte `data-bw-theme=dark`, `data-bw-width=1200`, `data-bw-size=l`.

- [ ] **Step 2: Lancer et vérifier l'échec**

Run: `node --test tests/unit/popup.test.js tests/e2e/popup.test.js`
Expected: FAIL (fichiers absents)

- [ ] **Step 3: Écrire le popup**

`popup.html` : trois groupes de radios (`Thème` auto/clair/sombre, `Largeur` 680/860/970/1200, `Taille` S/M/L), bouton « Enregistrer », statut `aria-live`. `popup.css` : 280 px, tokens clair/sombre via `prefers-color-scheme`, contrôles natifs. `popup.js` : lit `storage.local`, remplit le formulaire, écrit au submit, ferme après 600 ms.

- [ ] **Step 4: Câbler `content.js`**

`BW.settings()` : `await browser.storage.local.get('beautyWiki')`, `normalizeSettings`, `applySettings`. `browser.storage.onChanged.addListener` → réappliquer si la clé change. Appel avant `BW.cover()` pour éviter un premier rendu à la mauvaise largeur.

- [ ] **Step 5: Lancer et vérifier le succès**

Run: `node --test tests/unit/popup.test.js tests/e2e/popup.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/popup src/content.js tests/unit/popup.test.js tests/e2e/popup.test.js
git commit -m "feat: add settings popup with persisted theme, width and size"
```

---

## Task 9: Polices embarquées et licence

**Files:**
- Create: `fonts/ibm-plex-serif-latin-{400,500,600}-normal.woff2`, `fonts/OFL.txt`
- Modify: `src/css/tokens.css`
- Test: `tests/e2e/fonts.test.js`

**Interfaces:**
- Produces: `@font-face` `IBM Plex Serif` poids 400/500/600, `font-display: swap`, `unicode-range` latin + latin-ext.

- [ ] **Step 1: Écrire le test qui échoue**

`fonts.test.js` : sur `article.html`, `document.fonts.check('600 44px "IBM Plex Serif"')` est `true` après `document.fonts.ready` ; le réseau n'a chargé que des URLs sous le serveur de fixtures (écouter `request` et asserter `new URL(u).host === '127.0.0.1'`) ; `document.querySelectorAll('link[href^="http"]').length === 0`.

- [ ] **Step 2: Lancer et vérifier l'échec**

Run: `node --test tests/e2e/fonts.test.js`
Expected: FAIL (`document.fonts.check` false)

- [ ] **Step 3: Récupérer et embarquer les polices**

```bash
npm pack @fontsource/ibm-plex-serif
tar -xzf fontsource-ibm-plex-serif-*.tgz
cp package/files/ibm-plex-serif-latin-400-normal.woff2 fonts/
cp package/files/ibm-plex-serif-latin-500-normal.woff2 fonts/
cp package/files/ibm-plex-serif-latin-600-normal.woff2 fonts/
cp package/LICENSE fonts/OFL.txt
rm -rf package fontsource-ibm-plex-serif-*.tgz
```

- [ ] **Step 4: Ajouter les `@font-face`**

Dans `tokens.css`, trois blocs `@font-face` avec `src: url('../../fonts/…woff2') format('woff2')`, `font-weight` correspondant, `font-display: swap`, `unicode-range` latin + latin-ext (U+0000-00FF, U+0100-024F, U+1E00-1EFF, U+2000-206F, U+20AC, U+2122).

- [ ] **Step 5: Lancer et vérifier le succès**

Run: `node --test tests/e2e/fonts.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add fonts src/css/tokens.css tests/e2e/fonts.test.js
git commit -m "feat: bundle IBM Plex Serif with its OFL licence"
```

---

## Task 10: Durcissement — FOUC, panne JS, pages hors périmètre, RTL

**Files:**
- Modify: `src/content.js`, `src/css/tokens.css`
- Create: `tests/fixtures/rtl.html`
- Test: `tests/e2e/hardening.test.js`

**Interfaces:**
- Consumes: tout ce qui précède.
- Produces: `BW.init()` idempotent, enveloppé dans `try/catch` ; en cas d'erreur, `data-bw` reste posé (CSS seul) et aucune exception ne remonte.

- [ ] **Step 1: Écrire les tests qui échouent**

1. Sans `content.js`, en injectant seulement les CSS : fond, typo et layout toujours appliqués → la page reste utilisable (vérifier `getComputedStyle` et absence de `bw-cover`).
2. `content.js` avec `browser.storage.local.get` qui rejette : `data-bw` posé, aucune exception dans la console, page rendue.
3. Double appel `BW.init()` : une seule `figure.bw-cover`, un seul `.bw-toc-toggle`.
4. `rtl.html` (`dir="rtl"`, `lang="ar"`) à 1440 px : `scrollWidth <= innerWidth`, `#mw-content-text` largeur 860, pas de `margin-left` négatif hérité, TOC à droite (`x > center`).

- [ ] **Step 2: Lancer et vérifier l'échec**

Run: `node --test tests/e2e/hardening.test.js`
Expected: FAIL (cover dupliquée ou exception)

- [ ] **Step 3: Durcir `content.js`**

`BW.init()` : garde `if (window.__bwInit) return; window.__bwInit = true`, `try { … } catch (e) { console.warn('[Beauty Wiki]', e) }`. Poser `data-bw` en tout premier, avant tout `await`. Ne jamais supprimer de nœud Wikipédia : seulement masquer/cloner.

- [ ] **Step 4: Compléter RTL et reduced motion**

`responsive.css` : `[dir='rtl'] .mw-page-container { grid-template-columns: 1fr minmax(0, var(--bw-article-width)) 200px }`, marges logiques (`margin-inline`, `padding-inline`) partout, `text-align: start`. `@media (prefers-reduced-motion: reduce)` : `* { animation: none !important; transition: none !important }` scopé `html[data-bw]`.

- [ ] **Step 5: Lancer et vérifier le succès**

Run: `node --test tests/e2e/hardening.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/content.js src/css/responsive.css tests/fixtures/rtl.html tests/e2e/hardening.test.js
git commit -m "fix: harden init, add RTL layout and reduced-motion support"
```

---

## Task 11: QA finale, lint, paquet et documentation

**Files:**
- Modify: `README.md`
- Create: `icons/icon.svg` (si absent)
- Test: suite complète

**Interfaces:**
- Produces: `web-ext-artifacts/beauty_wiki-0.1.0.zip` chargeable dans Firefox.

- [ ] **Step 1: Exécuter toute la suite**

Run: `npm test`
Expected: PASS, 0 échec.

- [ ] **Step 2: Lint WebExtension**

Run: `npm run lint`
Expected: `Validation Summary: errors 0`. Corriger toute erreur ; les avertissements de taille de paquet sont acceptables.

- [ ] **Step 3: Construire le paquet**

Run: `npx web-ext build --source-dir . --artifacts-dir web-ext-artifacts --overwrite-dest --ignore-files "tests/**" "docs/**" "node_modules/**" "package*.json"`
Expected: `web-ext-artifacts/beauty_wiki-0.1.0.zip`

- [ ] **Step 4: Vérification manuelle dans Firefox**

Run: `npx web-ext run --source-dir .`
Puis : charger `https://fr.wikipedia.org/wiki/Paris`, vérifier cover, TOC sticky, thème sombre via le popup, largeur 1200, puis `https://fr.wikipedia.org/w/index.php?title=Paris&action=history` (pas de layout magazine) et `https://ar.wikipedia.org/wiki/باريس` (RTL). Consigner les écarts dans le README.

- [ ] **Step 5: Compléter le README**

Sections : installation temporaire, réglages, limites connues (TemplateStyles en sombre, autres skins non supportés, Chrome non testé), licence des polices, absence totale de réseau.

- [ ] **Step 6: Commit et tag**

```bash
git add README.md icons package.json
git commit -m "docs: document installation, limits and packaging"
git tag v0.1.0
```
