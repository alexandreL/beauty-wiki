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

    // Le skin est porté par <body> sur Wikipédia : on désactive si ce n'est pas Vector 2022.
    if (!document.body.classList.contains('skin-vector-2022')) {
      document.documentElement.removeAttribute('data-bw');
      document.documentElement.removeAttribute('data-bw-kind');
      return;
    }

    if (kind === 'article' || kind === 'main') {
      document.body.classList.add('bw-article');
      run(installSkipLink);
      run(installCover);
      run(installTables);
      run(installTocToggle);
      run(installThemeToggle);
    } else {
      document.body.classList.add('bw-tokens-only');
    }
  }

  function run(fn) {
    try {
      fn();
    } catch (e) {
      console.warn('[Beauty Wiki]', e);
    }
  }

  function loadSettings() {
    if (typeof browser === 'undefined' || !browser.storage || !browser.storage.local) return;

    browser.storage.local.get('beautyWiki')
      .then(function (stored) {
        if (stored && stored.beautyWiki) BWLib.applySettings(document.documentElement, stored.beautyWiki);
        paintThemeToggle(document.querySelector('.bw-theme-toggle'));
      })
      .catch(function () {});

    if (browser.storage.onChanged && browser.storage.onChanged.addListener) {
      browser.storage.onChanged.addListener(function (changes, area) {
        if (area !== 'local' || !changes || !changes.beautyWiki) return;
        BWLib.applySettings(document.documentElement, changes.beautyWiki.newValue);
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

    var lead = parser.querySelector(':scope > section, :scope > p');
    if (lead) parser.insertBefore(figure, lead);
    else parser.prepend(figure);

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
    var host = document.querySelector('.vector-header-end') || document.querySelector('.vector-header');
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
      paintThemeToggle(toggle);
      if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
        browser.storage.local.set({ beautyWiki: settings }).catch(function () {});
      }
    });

    var media = window.matchMedia('(prefers-color-scheme: dark)');
    var repaint = function () { paintThemeToggle(toggle); };
    if (media.addEventListener) media.addEventListener('change', repaint);

    host.appendChild(toggle);
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
