var BW = (function () {
  'use strict';

  var started = false;
  var DEFAULT_SETTINGS = { theme: 'auto', width: 860, size: 'm' };

  var LABELS = {
    fr: 'Sommaire',
    en: 'Contents',
    de: 'Inhaltsverzeichnis',
    es: 'Índice',
    it: 'Indice',
    pt: 'Conteúdo',
    nl: 'Inhoud',
    pl: 'Spis treści',
    ru: 'Содержание',
    ar: 'المحتويات',
    he: 'תוכן העניינים',
    ja: '目次',
    zh: '目录'
  };

  function lang() {
    return (document.documentElement.lang || 'en').split('-')[0];
  }

  function init() {
    if (started) return;
    started = true;

    try {
      var root = document.documentElement;
      var kind = BWLib.pageKind(location.href);
      if (kind === 'other') return;

      // Activation synchrone : les couleurs et la grille s'appliquent dès document_start.
      BWLib.applySettings(root, DEFAULT_SETTINGS);
      setKind(kind);
      syncNativeTheme();
      loadSettings();

      if (document.body) {
        enhance(kind);
        refineKind();
      } else {
        document.addEventListener('DOMContentLoaded', function () {
          enhance(kind);
          refineKind();
        }, { once: true });
      }
    } catch (e) {
      console.warn('[Beauty Wiki]', e);
    }
  }

  function setKind(kind) {
    var layout = kind === 'article' || kind === 'main' ? 'article' : 'tokens';
    document.documentElement.setAttribute('data-bw-kind', layout);
    return layout;
  }

  function refineKind() {
    try {
      if (!window.mw || typeof window.mw.config !== 'function') return;
      var ns = window.mw.config.get('wgNamespaceNumber');
      var special = window.mw.config.get('wgCanonicalSpecialPageName');
      var action = window.mw.config.get('wgAction');
      var veaction = window.mw.config.get('veaction');
      var kind;

      if (special || ns === -1) kind = 'special';
      else if (action === 'edit' || action === 'submit' || veaction) kind = 'edit';
      else if (action === 'history') kind = 'history';
      else if (typeof ns === 'number' && ns !== 0) kind = ns % 2 === 1 ? 'talk' : 'other';
      else kind = 'article';

      var layout = setKind(kind);
      if (document.body) {
        document.body.classList.toggle('bw-article', layout === 'article');
        document.body.classList.toggle('bw-tokens-only', layout !== 'article');
      }
    } catch (e) {
      /* mw.config absent : la classification par URL reste en place. */
    }
  }

  function enhance(kind) {
    if (!document.body) return;

    // Le skin est porté par <body> sur Wikipédia. Vector 2022 (bureau) et
    // Minerva (mobile, celui que reçoit Firefox sur téléphone) sont supportés.
    var skin = detectSkin();
    if (!skin) {
      document.documentElement.removeAttribute('data-bw');
      document.documentElement.removeAttribute('data-bw-kind');
      document.documentElement.removeAttribute('data-bw-skin');
      return;
    }

    document.documentElement.setAttribute('data-bw-skin', skin);

    if (kind === 'article' || kind === 'main') {
      document.body.classList.add('bw-article');
      run(installSkipLink);
      run(installCover);
      run(installTables);
      if (skin === 'minerva') {
        run(installSourceLine);
        run(installFactsCard);
        run(installMobileToc);
      } else {
        run(installTocToggle);
      }
      run(installThemeToggle);
      run(shortenSearchPlaceholder);
    } else {
      document.body.classList.add('bw-tokens-only');
      run(installThemeToggle);
    }
  }

  function detectSkin() {
    if (!document.body) return null;
    if (document.body.classList.contains('skin-minerva')) return 'minerva';
    if (document.body.classList.contains('skin-vector-2022')) return 'vector';
    return null;
  }

  function syncNativeTheme() {
    var root = document.documentElement;
    var dark = effectiveTheme() === 'dark';
    root.classList.toggle('skin-theme-clientpref-night', dark);
    root.classList.toggle('skin-theme-clientpref-day', !dark);
  }

  function run(fn) {
    try {
      fn();
    } catch (e) {
      console.warn('[Beauty Wiki]', e);
    }
  }

  function loadSettings() {
    if (!BWApi || !BWApi.storage || !BWApi.storage.local) return;

    BWApi.storage.local.get('beautyWiki')
      .then(function (stored) {
        if (stored && stored.beautyWiki) BWLib.applySettings(document.documentElement, stored.beautyWiki);
        syncNativeTheme();
        paintThemeToggle(document.querySelector('.bw-theme-toggle'));
      })
      .catch(function () {});

    if (BWApi.storage.onChanged && BWApi.storage.onChanged.addListener) {
      BWApi.storage.onChanged.addListener(function (changes, area) {
        if (area !== 'local' || !changes || !changes.beautyWiki) return;
        BWLib.applySettings(document.documentElement, changes.beautyWiki.newValue);
        syncNativeTheme();
        paintThemeToggle(document.querySelector('.bw-theme-toggle'));
      });
    }
  }

  function installSkipLink() {
    if (document.querySelector('.bw-skip')) return;

    var link = document.createElement('a');
    link.className = 'bw-skip';
    link.href = '#mw-content-text';
    link.textContent = lang() === 'fr' ? 'Aller au contenu' : 'Skip to content';
    document.body.prepend(link);
  }

  function normalizeThumb(url) {
    try {
      var parsed = new URL(url);
      return parsed.origin + parsed.pathname.replace(/\/\d+px-(?=[^/]+$)/, '/');
    } catch (e) {
      return String(url || '');
    }
  }

  function articleParser() {
    return document.querySelector('#mw-content-text > .mw-parser-output') ||
      document.querySelector('#mw-content-text .mw-parser-output');
  }

  function installCover() {
    if (document.querySelector('figure.bw-cover')) return;

    var parser = articleParser();
    if (!parser) return;

    var pick = BWLib.pickCoverImage(document, location.href);
    if (!pick) return;

    var figure = document.createElement('figure');
    figure.className = 'bw-cover';

    var img = document.createElement('img');
    img.className = 'bw-cover-img';
    img.src = pick.src;
    img.alt = pick.alt;
    img.width = 1200;
    img.height = 500;
    img.loading = 'eager';
    img.decoding = 'async';

    figure.appendChild(img);

    // Sur Minerva, la couverture ouvre la page, avant le titre.
    var preContent = document.documentElement.getAttribute('data-bw-skin') === 'minerva'
      ? document.querySelector('.pre-content')
      : null;
    var heading = preContent && preContent.querySelector('.page-heading');

    if (preContent && heading) preContent.insertBefore(figure, heading);
    else {
      var lead = parser.querySelector(':scope > section, :scope > p');
      if (lead) parser.insertBefore(figure, lead);
      else parser.prepend(figure);
    }

    var infoboxImg = document.querySelector('.infobox img');
    if (figure.offsetParent !== null && infoboxImg && normalizeThumb(infoboxImg.src) === normalizeThumb(pick.src)) {
      infoboxImg.classList.add('bw-duplicate');
    }
  }

  function installTables() {
    var tables = document.querySelectorAll('#mw-content-text table');
    for (var i = 0; i < tables.length; i++) {
      var table = tables[i];
      if (table.dataset.bwWrapped === '1') continue;
      if (table.classList.contains('infobox') || table.classList.contains('navbox')) continue;
      if (table.closest('.infobox, .navbox')) continue;

      var wrapper = document.createElement('div');
      wrapper.className = 'bw-table-scroll';
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
      table.dataset.bwWrapped = '1';
    }
  }

  function installSourceLine() {
    if (document.querySelector('.bw-source')) return;
    var heading = document.querySelector('.page-heading');
    if (!heading) return;

    var text = {
      fr: 'De Wikipédia, l’encyclopédie libre',
      en: 'From Wikipedia, the free encyclopedia'
    }[lang()];
    if (!text) return;

    var line = document.createElement('p');
    line.className = 'bw-source';
    line.textContent = text;
    heading.appendChild(line);
  }

  function installFactsCard() {
    var infobox = document.querySelector('#mw-content-text .infobox');
    if (!infobox || infobox.closest('.bw-facts')) return;

    var details = document.createElement('details');
    details.className = 'bw-facts';

    var summary = document.createElement('summary');
    var label = document.createElement('span');
    label.className = 'bw-facts__label';
    label.textContent = lang() === 'fr' ? 'Faits en bref' : 'Quick facts';

    var hint = document.createElement('span');
    hint.className = 'bw-facts__hint';
    hint.textContent = factsHint(infobox);

    var chevron = document.createElement('span');
    chevron.className = 'bw-facts__chevron';
    chevron.setAttribute('aria-hidden', 'true');

    summary.append(label, hint, chevron);

    var body = document.createElement('div');
    body.className = 'bw-facts__body';

    infobox.parentNode.insertBefore(details, infobox);
    body.appendChild(infobox);
    details.append(summary, body);

    var mq = window.matchMedia('(min-width: 1024px)');
    var sync = function () {
      if (mq.matches) details.open = true;
    };
    sync();
    if (mq.addEventListener) mq.addEventListener('change', sync);
  }

  // Résumé lisible des premières rubriques de l'infobox (« Pays, Région… »).
  function factsHint(infobox) {
    var values = [];
    var cells = infobox.querySelectorAll('tr > th');
    for (var i = 0; i < cells.length && values.length < 3; i++) {
      var cell = cells[i];
      if (cell.colSpan > 1) continue;
      var text = (cell.textContent || '').trim().replace(/\s+/g, ' ');
      if (!text || text.length > 26) continue;
      if (values.indexOf(text) !== -1) continue;
      values.push(text);
    }
    return values.join(', ');
  }

  function installMobileToc() {
    if (document.querySelector('.bw-toc-sheet')) return;

    var toc = document.getElementById('toc');
    if (!toc) return;

    var veil = document.createElement('div');
    veil.className = 'bw-toc-veil';

    var sheet = document.createElement('aside');
    sheet.className = 'bw-toc-sheet';
    sheet.id = 'bw-toc-sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-labelledby', 'bw-toc-sheet-title');

    var head = document.createElement('div');
    head.className = 'bw-toc-sheet__head';

    var title = document.createElement('span');
    title.className = 'bw-toc-sheet__title';
    title.id = 'bw-toc-sheet-title';
    title.textContent = tocLabel();

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'bw-toc-close';
    close.textContent = '×';
    close.setAttribute('aria-label', lang() === 'fr' ? 'Fermer le sommaire' : 'Close contents');

    var body = document.createElement('div');
    body.className = 'bw-toc-sheet__body';
    body.appendChild(toc);

    head.append(title, close);
    sheet.append(head, body);

    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'bw-toc-toggle';
    toggle.setAttribute('aria-controls', 'bw-toc-sheet');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.textContent = tocLabel();

    function isOpen() {
      return document.documentElement.classList.contains('bw-toc-open');
    }

    function setOpen(open) {
      document.documentElement.classList.toggle('bw-toc-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      sheet.setAttribute('aria-hidden', open ? 'false' : 'true');
      document.body.style.overflow = open ? 'hidden' : '';

      if (open) {
        sheet.removeAttribute('inert');
        close.focus({ preventScroll: true });
      } else {
        sheet.setAttribute('inert', '');
        toggle.classList.remove('bw-toc-toggle--hidden');
        toggle.focus({ preventScroll: true });
      }
    }

    toggle.addEventListener('click', function () {
      setOpen(!isOpen());
    });

    veil.addEventListener('click', function () {
      setOpen(false);
    });

    close.addEventListener('click', function () {
      setOpen(false);
    });

    body.addEventListener('click', function (event) {
      var link = event.target.closest ? event.target.closest('a[href^="#"]') : null;
      if (link) setOpen(false);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && isOpen()) setOpen(false);
    });

    sheet.setAttribute('aria-hidden', 'true');
    sheet.setAttribute('inert', '');
    document.body.append(veil, sheet, toggle);

    watchTocScroll(toggle, isOpen);
  }

  // Le bouton flottant s'efface à la descente et revient à la remontée,
  // pour ne jamais masquer le texte pendant la lecture.
  function watchTocScroll(toggle, isOpen) {
    var lastY = window.scrollY || 0;
    var ticking = false;
    var minerva = document.documentElement.getAttribute('data-bw-skin') === 'minerva';

    // Sur Minerva le bouton n'apparaît qu'après un premier défilement ; sur
    // Vector il reste visible en haut de page, puis s'efface à la descente.
    if (minerva) toggle.classList.add('bw-toc-toggle--hidden');

    function update() {
      ticking = false;
      var y = window.scrollY || 0;
      var scrolledDown = y > lastY && y > 320;
      var tooHigh = minerva && y < 320;
      toggle.classList.toggle('bw-toc-toggle--hidden', !isOpen() && (tooHigh || scrolledDown));
      lastY = y;
    }

    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }, { passive: true });
  }


  function currentTheme() {
    return document.documentElement.getAttribute('data-bw-theme') || 'auto';
  }

  function effectiveTheme() {
    var theme = currentTheme();
    if (theme !== 'auto') return theme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function currentSettings(theme) {
    return {
      theme: theme || currentTheme(),
      width: Number(document.documentElement.getAttribute('data-bw-width')) || 860,
      size: document.documentElement.getAttribute('data-bw-size') || 'm'
    };
  }

  function paintThemeToggle(toggle) {
    if (!toggle) return;
    var theme = currentTheme();
    var french = lang() === 'fr';
    var dark = effectiveTheme() === 'dark';

    toggle.classList.toggle('bw-theme-toggle--auto', theme === 'auto');
    toggle.classList.toggle('bw-theme-toggle--dark', theme === 'dark');
    toggle.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    toggle.setAttribute('data-bw-state', theme);

    var labels = {
      auto: french ? 'Thème automatique, suit le système' : 'Automatic theme, follows the system',
      light: french ? 'Thème clair' : 'Light theme',
      dark: french ? 'Thème sombre' : 'Dark theme'
    };
    toggle.setAttribute('aria-label', labels[theme] || labels.auto);
    toggle.setAttribute('title', labels[theme] || labels.auto);
    toggle.setAttribute('aria-live', 'polite');
    if (theme === 'auto') toggle.setAttribute('data-bw-effective', dark ? 'dark' : 'light');
    else toggle.removeAttribute('data-bw-effective');
  }

  function installThemeToggle() {
    var minerva = document.body.classList.contains('skin-minerva');
    var host = minerva ? document.querySelector('.minerva-header')
      : (document.querySelector('.vector-header-end') || document.querySelector('.vector-header'));
    if (!host || document.querySelector('.bw-theme-toggle')) return;

    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'bw-theme-toggle';
    paintThemeToggle(toggle);

    toggle.addEventListener('click', function () {
      var order = ['auto', 'light', 'dark'];
      var next = order[(order.indexOf(currentTheme()) + 1) % order.length];
      var settings = currentSettings(next);
      BWLib.applySettings(document.documentElement, settings);
      syncNativeTheme();
      paintThemeToggle(toggle);
      if (BWApi && BWApi.storage && BWApi.storage.local) {
        BWApi.storage.local.set({ beautyWiki: settings }).catch(function () {});
      }
    });

    var media = window.matchMedia('(prefers-color-scheme: dark)');
    var repaint = function () {
      syncNativeTheme();
      paintThemeToggle(toggle);
    };
    if (media.addEventListener) media.addEventListener('change', repaint);

    if (minerva) {
      var userNav = host.querySelector('.minerva-user-navigation');
      if (userNav) host.insertBefore(toggle, userNav);
      else host.appendChild(toggle);
    } else {
      host.appendChild(toggle);
    }
  }

  function shortenSearchPlaceholder() {
    if (document.documentElement.getAttribute('data-bw-skin') !== 'vector') return;
    var input = document.querySelector('#searchform input[name="search"], #searchform #searchInput');
    if (!input || input.dataset.bwPlaceholder === '1') return;

    var full = input.getAttribute('placeholder') || '';
    if (!full) return;

    input.dataset.bwPlaceholder = '1';
    input.dataset.bwPlaceholderFull = full;

    var mq = window.matchMedia('(max-width: 767px)');
    var apply = function () {
      input.setAttribute('placeholder', mq.matches ? 'Rechercher' : full);
    };
    apply();
    if (mq.addEventListener) mq.addEventListener('change', apply);
  }

  function tocLabel() {
    return LABELS[lang()] || LABELS.en;
  }

  function installTocToggle() {
    if (document.querySelector('.bw-toc-toggle')) return;

    var toc = document.querySelector('.vector-toc');
    if (!toc) return;

    var drawer = document.querySelector('.vector-column-start') || toc;
    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'bw-toc-toggle';
    toggle.setAttribute('aria-controls', 'vector-toc');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.textContent = tocLabel();

    var veil = document.createElement('div');
    veil.className = 'bw-toc-veil';

    var mq = window.matchMedia('(max-width: 1023px)');

    function isOpen() {
      return document.documentElement.classList.contains('bw-toc-open');
    }

    function syncClosedState() {
      if (mq.matches) {
        drawer.setAttribute('inert', '');
        drawer.setAttribute('aria-hidden', 'true');
      } else {
        drawer.removeAttribute('inert');
        drawer.removeAttribute('aria-hidden');
      }
    }

    function setOpen(open) {
      document.documentElement.classList.toggle('bw-toc-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open && mq.matches ? 'hidden' : '';

      if (mq.matches) {
        if (open) {
          drawer.removeAttribute('inert');
          drawer.removeAttribute('aria-hidden');
          var first = drawer.querySelector('a, button');
          if (first) first.focus({ preventScroll: true });
        } else {
          syncClosedState();
          toggle.classList.remove('bw-toc-toggle--hidden');
          toggle.focus({ preventScroll: true });
        }
      }
    }

    toggle.addEventListener('click', function () {
      setOpen(!isOpen());
    });

    veil.addEventListener('click', function () {
      setOpen(false);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && isOpen()) setOpen(false);
    });

    mq.addEventListener('change', function () {
      setOpen(false);
      syncClosedState();
    });

    document.body.append(veil, toggle);
    syncClosedState();
    watchTocScroll(toggle, isOpen);
  }

  return { init: init, _paintThemeToggle: paintThemeToggle };
})();

if (typeof module !== 'undefined') module.exports = BW;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', BW.init, { once: true });
  BW.init();
} else {
  BW.init();
}
