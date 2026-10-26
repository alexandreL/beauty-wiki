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
