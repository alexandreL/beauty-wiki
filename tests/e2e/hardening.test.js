const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { launch, openFixture, ROOT } = require('../helpers/browser');

let browser;
test.before(async () => {
  browser = await launch();
});
test.after(async () => {
  await browser.close();
});

test('CSS alone keeps the page readable when the content script never runs', async () => {
  const { page, close } = await openFixture(browser, 'article.html', { content: false });
  try {
    const state = await page.evaluate(() => {
      BWLib.applySettings(document.documentElement, { theme: 'light', width: 860, size: 'm' });
      document.body.classList.add('bw-article');
      return {
        bg: getComputedStyle(document.body).backgroundColor,
        font: getComputedStyle(document.querySelector('#mw-content-text p')).fontSize,
        cover: document.querySelectorAll('.bw-cover').length,
      };
    });
    assert.equal(state.bg, 'rgb(255, 255, 255)');
    assert.equal(state.font, '16px');
    assert.equal(state.cover, 0);
  } finally {
    await close();
  }
});

test('a failing storage read does not break the page', async () => {
  const page = await browser.newPage();
  try {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() => {
      window.browser = {
        storage: {
          local: { get: async () => { throw new Error('denied'); }, set: async () => {} },
          onChanged: { addListener: () => {} },
        },
      };
    });
    await page.goto('https://fr.wikipedia.org/wiki/Paris');
    // route everything to the fixture
    await page.route('https://*.wikipedia.org/**', (r) => r.fulfill({
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: require('node:fs').readFileSync(path.join(ROOT, 'tests/fixtures/article.html'), 'utf8'),
    }));
    await page.reload();
    await page.addStyleTag({ path: path.join(ROOT, 'src/css/tokens.css') });
    await page.addStyleTag({ path: path.join(ROOT, 'src/css/base.css') });
    await page.addScriptTag({ path: path.join(ROOT, 'src/lib.js') });
    await page.addScriptTag({ path: path.join(ROOT, 'src/content.js') });
    await page.waitForTimeout(150);

    const state = await page.evaluate(() => ({
      dataBw: document.documentElement.hasAttribute('data-bw'),
      font: getComputedStyle(document.querySelector('#mw-content-text p')).fontSize,
    }));
    assert.equal(state.dataBw, true);
    assert.equal(state.font, '16px');
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test('double init keeps a single cover and a single toggle', async () => {
  const { page, close } = await openFixture(browser, 'article.html');
  try {
    const counts = await page.evaluate(() => {
      BW.init();
      BW.init();
      return {
        covers: document.querySelectorAll('figure.bw-cover').length,
        toggles: document.querySelectorAll('.bw-toc-toggle').length,
        skips: document.querySelectorAll('.bw-skip').length,
      };
    });
    assert.deepEqual(counts, { covers: 1, toggles: 1, skips: 1 });
  } finally {
    await close();
  }
});

test('RTL articles keep the reading column and put the TOC on the right', async () => {
  const { page, close } = await openFixture(browser, 'rtl.html');
  try {
    const state = await page.evaluate(() => {
      const content = document.querySelector('#mw-content-text').getBoundingClientRect();
      const toc = document.querySelector('.vector-column-start').getBoundingClientRect();
      return {
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        contentWidth: Math.round(content.width),
        tocX: Math.round(toc.x),
        tocWidth: Math.round(toc.width),
        centerX: window.innerWidth / 2,
      };
    });
    assert.ok(state.scrollWidth <= state.innerWidth, `${state.scrollWidth} > ${state.innerWidth}`);
    assert.ok(Math.abs(state.contentWidth - 860) <= 2, `content ${state.contentWidth}`);
    assert.ok(state.tocX > state.centerX, `toc ${state.tocX} <= ${state.centerX}`);
    assert.ok(Math.abs(state.tocWidth - 200) <= 2, `toc width ${state.tocWidth}`);
  } finally {
    await close();
  }
});
