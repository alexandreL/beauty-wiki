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
      installTocToggle();
    } else {
      document.body.classList.add('bw-tokens-only');
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
