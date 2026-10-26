const test = require('node:test');
const assert = require('node:assert');
const { launch, openFixture } = require('../helpers/browser');

let browser;
test.before(async () => {
  browser = await launch();
});
test.after(async () => {
  await browser.close();
});

test('cover is inserted between the title and the lead paragraph', async () => {
  const { page, close } = await openFixture(browser, 'article.html');
  try {
    const state = await page.evaluate(() => {
      const cover = document.querySelector('figure.bw-cover');
      const img = cover && cover.querySelector('img');
      const h1 = document.querySelector('#firstHeading');
      const firstP = document.querySelector('.mw-parser-output p');
      const rect = cover && cover.getBoundingClientRect();
      return {
        exists: !!cover,
        src: img && img.src,
        inContent: !!(cover && cover.closest('#mw-content-text > .mw-parser-output')),
        visible: !!(cover && cover.offsetParent !== null),
        widthAttr: img && img.getAttribute('width'),
        afterTitle: !!(cover && h1 && (h1.compareDocumentPosition(cover) & Node.DOCUMENT_POSITION_FOLLOWING)),
        beforeLead: !!(cover && firstP && (cover.compareDocumentPosition(firstP) & Node.DOCUMENT_POSITION_FOLLOWING)),
        width: rect && Math.round(rect.width),
        height: rect && Math.round(rect.height),
        infoboxImgHidden: getComputedStyle(document.querySelector('.infobox img')).display,
      };
    });
    assert.equal(state.exists, true);
    assert.ok(state.src.includes('/1280px-'), state.src);
    assert.ok(state.src.endsWith('?utm_source=test'), state.src);
    assert.equal(state.inContent, true);
    assert.equal(state.visible, true);
    assert.equal(state.widthAttr, '1200');
    assert.equal(state.afterTitle, true);
    assert.equal(state.beforeLead, true);
    assert.equal(state.width, 860);
    assert.ok(Math.abs(state.height - state.width / 2.4) <= 2, `height ${state.height}`);
    assert.equal(state.infoboxImgHidden, 'none');
  } finally {
    await close();
  }
});

test('no cover and no empty box when the article has no image', async () => {
  const { page, close } = await openFixture(browser, 'article-noimage.html');
  try {
    const state = await page.evaluate(() => ({
      covers: document.querySelectorAll('figure.bw-cover').length,
      pick: BWLib.pickCoverImage(document, location.href),
    }));
    assert.equal(state.covers, 0);
    assert.equal(state.pick, null);
  } finally {
    await close();
  }
});
