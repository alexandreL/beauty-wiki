/* API WebExtension : Firefox expose `browser`, Chrome expose `chrome`. */
var BWApi = (typeof browser !== 'undefined' && browser && browser.storage) ? browser
  : (typeof chrome !== 'undefined' && chrome && chrome.storage ? chrome : null);

var BWLib = (function () {
  'use strict';

  var DEFAULTS = { theme: 'auto', width: 860, size: 'm' };
  var THEMES = ['auto', 'light', 'dark'];
  var WIDTHS = [680, 860, 970, 1200];
  var SIZES = ['s', 'm', 'l'];
  var MAIN_PAGES = ['accueil', 'main page', 'wikipédia:accueil principal'];

  function normalizeSettings(raw) {
    var out = { theme: DEFAULTS.theme, width: DEFAULTS.width, size: DEFAULTS.size };
    if (!raw || typeof raw !== 'object') return out;

    if (THEMES.indexOf(raw.theme) !== -1) out.theme = raw.theme;

    var width = Number(raw.width);
    if (WIDTHS.indexOf(width) !== -1) out.width = width;

    if (SIZES.indexOf(raw.size) !== -1) out.size = raw.size;

    return out;
  }

  function pageKind(urlString) {
    var url;
    try {
      url = new URL(urlString);
    } catch (e) {
      return 'other';
    }

    var host = url.hostname.toLowerCase();
    if (host !== 'wikipedia.org' && !/\.wikipedia\.org$/.test(host)) return 'other';

    var params = url.searchParams;
    if (params.get('diff') !== null && params.get('diff') !== '') return 'diff';

    var action = (params.get('action') || '').toLowerCase();
    if (action === 'edit' || action === 'submit') return 'edit';
    if (action === 'history') return 'history';
    if (params.get('search') !== null) return 'search';

    var title = '';
    var wikiMatch = /^\/wiki\/(.+)$/.exec(url.pathname);
    if (wikiMatch) {
      try {
        title = decodeURIComponent(wikiMatch[1]).replace(/_/g, ' ');
      } catch (e) {
        title = wikiMatch[1].replace(/_/g, ' ');
      }
    } else if (/^\/w\/index\.php$/.test(url.pathname)) {
      title = (params.get('title') || '').replace(/_/g, ' ');
    } else {
      return 'other';
    }

    var lower = title.toLowerCase();
    if (/^(special|spécial):/.test(lower)) return 'special';
    if (/^(discussion|talk):/.test(lower)) return 'talk';
    if (MAIN_PAGES.indexOf(lower) !== -1) return 'main';

    return 'article';
  }

  function upscaleThumbUrl(url, targetWidth) {
    if (typeof url !== 'string') return url;
    try {
      var parsed = new URL(url);
      if (parsed.pathname.indexOf('/thumb/') === -1) return url;
      var match = /^(.*\/thumb\/.*\/)(\d+)px-([^/]+)$/.exec(parsed.pathname);
      if (!match) return url;
      if (Number(match[2]) >= targetWidth) return url;
      parsed.pathname = match[1] + targetWidth + 'px-' + match[3];
      return parsed.href;
    } catch (e) {
      return url;
    }
  }

  function applySettings(root, settings) {
    var normalized = normalizeSettings(settings);
    root.setAttribute('data-bw', '');
    root.setAttribute('data-bw-theme', normalized.theme);
    root.setAttribute('data-bw-width', String(normalized.width));
    root.setAttribute('data-bw-size', normalized.size);
  }

  var ICON_HINT = /(^|[-_ ])(icon|flag|logo|symbol|seal|coat|arms)([-_ ]|$)/i;

  function imageWidth(img) {
    var declared = Number(img.getAttribute('width')) || 0;
    var natural = img.naturalWidth || 0;
    return Math.max(declared, natural);
  }

  function isUnusableSource(img, src) {
    if (!src || /\.svg(\?|$)/i.test(src)) return true;
    if (/^https?:\/\/maps\.wikimedia\.org\//i.test(src)) return true;
    if (/map|kartographer/i.test(src)) return true;
    if (img.closest('.mw-indicators, .mw-kartographer, .mapframe')) return true;
    var alt = img.getAttribute('alt') || '';
    if (/carte|map/i.test(alt)) return true;
    return false;
  }

  function isUsableImage(img) {
    var src = img.getAttribute('src') || '';
    if (isUnusableSource(img, src)) return false;

    var width = imageWidth(img);
    if (width && width < 300) return false;

    var context = ((img.className || '') + ' ' + (img.parentElement && img.parentElement.className) || '');
    if (ICON_HINT.test(context)) return false;
    return true;
  }

  function pickCoverImage(doc, pageUrl) {
    var groups = [
      '#mw-content-text .infobox img',
      '.infobox img',
      '#mw-content-text > .mw-parser-output figure img',
      '#mw-content-text img'
    ];

    for (var g = 0; g < groups.length; g++) {
      var images = doc.querySelectorAll(groups[g]);
      var best = null;
      for (var i = 0; i < images.length; i++) {
        var img = images[i];
        if (!isUsableImage(img)) continue;
        if (!best || imageWidth(img) > imageWidth(best)) best = img;
      }
      if (best) {
        var absolute = new URL(best.getAttribute('src'), pageUrl || doc.baseURI).href;
        return {
          src: upscaleThumbUrl(absolute, 1200),
          alt: best.getAttribute('alt') || ''
        };
      }
    }

    return null;
  }

  return {
    normalizeSettings: normalizeSettings,
    pageKind: pageKind,
    upscaleThumbUrl: upscaleThumbUrl,
    applySettings: applySettings,
    pickCoverImage: pickCoverImage
  };
})();

if (typeof module !== 'undefined') module.exports = BWLib;
