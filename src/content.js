var BW = (function () {
  'use strict';

  var started = false;

  function init() {
    if (started) return;
    started = true;

    try {
      var root = document.documentElement;
      var kind = BWLib.pageKind(location.href);
      if (kind === 'other') return;

      BWLib.applySettings(root, { theme: 'light', width: 860, size: 'm' });
      loadSettings();
      enableFor(kind);
    } catch (e) {
      console.warn('[Beauty Wiki]', e);
    }
  }

  function enableFor(kind) {
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', function () {
        enableFor(kind);
      }, { once: true });
      return;
    }

    if (kind === 'article' || kind === 'main') {
      document.body.classList.add('bw-article');
      installSkipLink();
      installCover();
      installTables();
      installTocToggle();
    } else {
      document.body.classList.add('bw-tokens-only');
    }
  }

  function loadSettings() {
    if (typeof browser === 'undefined' || !browser.storage || !browser.storage.local) return;

    browser.storage.local.get('beautyWiki')
      .then(function (stored) {
        if (stored && stored.beautyWiki) BWLib.applySettings(document.documentElement, stored.beautyWiki);
      })
      .catch(function () {});

    if (browser.storage.onChanged && browser.storage.onChanged.addListener) {
      browser.storage.onChanged.addListener(function (changes, area) {
        if (area !== 'local' || !changes || !changes.beautyWiki) return;
        BWLib.applySettings(document.documentElement, changes.beautyWiki.newValue);
      });
    }
  }

  function installSkipLink() {
    if (document.querySelector('.bw-skip')) return;

    var link = document.createElement('a');
    link.className = 'bw-skip';
    link.href = '#mw-content-text';
    link.textContent = (document.documentElement.lang || 'en').split('-')[0] === 'fr'
      ? 'Aller au contenu'
      : 'Skip to content';
    document.body.prepend(link);
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

  function normalizeThumb(url) {
    return String(url || '').replace(/\/\d+px-(?=[^/]+$)/, '/');
  }

  function installCover() {
    if (document.querySelector('figure.bw-cover')) return;

    var parser = document.querySelector('.mw-parser-output') || document.querySelector('#mw-content-text');
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

    var lead = parser.querySelector('p');
    if (lead) parser.insertBefore(figure, lead);
    else parser.prepend(figure);

    var infoboxImg = document.querySelector('.infobox img');
    if (infoboxImg && normalizeThumb(infoboxImg.src) === normalizeThumb(pick.src)) {
      infoboxImg.classList.add('bw-duplicate');
    }
  }

  function tocLabel() {
    var lang = (document.documentElement.lang || 'en').split('-')[0];
    return lang === 'fr' ? 'Sommaire' : 'Contents';
  }

  function installTocToggle() {
    if (document.querySelector('.bw-toc-toggle')) return;
    if (!document.querySelector('.vector-toc')) return;

    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'bw-toc-toggle';
    toggle.setAttribute('aria-controls', 'vector-toc');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.textContent = tocLabel();

    var veil = document.createElement('div');
    veil.className = 'bw-toc-veil';

    function setOpen(open) {
      document.documentElement.classList.toggle('bw-toc-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    toggle.addEventListener('click', function () {
      setOpen(!document.documentElement.classList.contains('bw-toc-open'));
    });

    veil.addEventListener('click', function () {
      setOpen(false);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') setOpen(false);
    });

    document.body.append(veil, toggle);
  }

  return { init: init };
})();

if (typeof module !== 'undefined') module.exports = BW;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', BW.init, { once: true });
} else {
  BW.init();
}
