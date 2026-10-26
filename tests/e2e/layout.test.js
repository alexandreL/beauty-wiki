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

async function openArticle(viewport) {
  const ctx = await openFixture(browser, 'article.html', { viewport, content: false });
  await ctx.page.evaluate(() => {
    BWLib.applySettings(document.documentElement, { theme: 'light', width: 860, size: 'm' });
  });
  await ctx.page.addScriptTag({ path: require('node:path').join(__dirname, '../../src/content.js') });
  await ctx.page.evaluate(() => BW.init());
  return ctx;
}

test('article column is 860px by default and grows with the width setting', async () => {
  const { page, close } = await openArticle({ width: 1440, height: 900 });
  try {
    const width = await page.evaluate(() => Math.round(document.querySelector('#mw-content-text').getBoundingClientRect().width));
    assert.ok(Math.abs(width - 860) <= 2, `width ${width}`);

    await page.evaluate(() => document.documentElement.setAttribute('data-bw-width', '1200'));
    await page.setViewportSize({ width: 1700, height: 900 });
    const wide = await page.evaluate(() => Math.round(document.querySelector('#mw-content-text').getBoundingClientRect().width));
    assert.ok(Math.abs(wide - 1200) <= 2, `wide ${wide}`);
  } finally {
    await close();
  }
});

test('table of contents is sticky and the appearance column is gone', async () => {
  const { page, close } = await openArticle({ width: 1440, height: 900 });
  try {
    const styles = await page.evaluate(() => {
      const start = getComputedStyle(document.querySelector('.vector-column-start'));
      const end = getComputedStyle(document.querySelector('.vector-column-end'));
      return {
        position: start.position,
        tocWidth: Math.round(document.querySelector('.vector-toc').getBoundingClientRect().width),
        endDisplay: end.display,
      };
    });
    assert.equal(styles.position, 'sticky');
    assert.ok(Math.abs(styles.tocWidth - 200) <= 24, `toc ${styles.tocWidth}`);
    assert.equal(styles.endDisplay, 'none');
  } finally {
    await close();
  }
});

test('mobile layout has no horizontal overflow', async () => {
  const { page, close } = await openArticle({ width: 390, height: 844 });
  try {
    const metrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      content: Math.round(document.querySelector('#mw-content-text').getBoundingClientRect().width),
    }));
    assert.ok(metrics.scrollWidth <= metrics.innerWidth, `scroll ${metrics.scrollWidth} > ${metrics.innerWidth}`);
    assert.ok(metrics.content <= 390, `content ${metrics.content}`);
  } finally {
    await close();
  }
});

test('contents drawer opens under 1024px', async () => {
  const { page, close } = await openArticle({ width: 900, height: 900 });
  try {
    const toggle = page.locator('.bw-toc-toggle');
    assert.equal(await toggle.isVisible(), true);
    assert.equal(await page.evaluate(() => document.querySelector('.vector-column-start').hasAttribute('inert')), true);
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    await toggle.click();
    assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
    assert.equal(await page.evaluate(() => document.querySelector('.vector-column-start').hasAttribute('inert')), false);
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.bw-toc-veil')).pointerEvents), 'auto');
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('bw-toc-open')), true);
  } finally {
    await close();
  }
});
