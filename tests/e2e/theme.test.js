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

test('light theme applies reading tokens', async () => {
  const { page, close } = await openFixture(browser, 'article.html', { content: false });
  try {
    await page.evaluate(() => {
      BWLib.applySettings(document.documentElement, { theme: 'light', width: 860, size: 'm' });
    });
    const styles = await page.evaluate(() => {
      const body = getComputedStyle(document.body);
      const h1 = getComputedStyle(document.querySelector('#firstHeading'));
      const p = getComputedStyle(document.querySelector('#mw-content-text p'));
      return {
        bg: body.backgroundColor,
        color: body.color,
        h1Font: h1.fontFamily,
        pSize: p.fontSize,
        pLine: p.lineHeight,
      };
    });
    assert.equal(styles.bg, 'rgb(255, 255, 255)');
    assert.equal(styles.color, 'rgb(0, 0, 0)');
    assert.ok(styles.h1Font.includes('IBM Plex Serif'), styles.h1Font);
    assert.equal(styles.pSize, '16px');
    assert.equal(styles.pLine, '24px');
  } finally {
    await close();
  }
});

test('dark theme switches surfaces and text', async () => {
  const { page, close } = await openFixture(browser, 'article.html', { content: false });
  try {
    await page.evaluate(() => {
      BWLib.applySettings(document.documentElement, { theme: 'dark', width: 860, size: 'm' });
    });
    const styles = await page.evaluate(() => ({
      bg: getComputedStyle(document.body).backgroundColor,
      color: getComputedStyle(document.body).color,
    }));
    assert.equal(styles.bg, 'rgb(10, 10, 10)');
    assert.equal(styles.color, 'rgb(255, 255, 255)');
  } finally {
    await close();
  }
});

test('auto theme follows prefers-color-scheme without flash', async () => {
  const { page, close } = await openFixture(browser, 'article.html', { content: false, colorScheme: 'dark' });
  try {
    await page.evaluate(() => {
      BWLib.applySettings(document.documentElement, { theme: 'auto', width: 860, size: 'm' });
    });
    assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(10, 10, 10)');
  } finally {
    await close();
  }
});

test('text size setting scales the reading font', async () => {
  const { page, close } = await openFixture(browser, 'article.html', { content: false });
  try {
    await page.evaluate(() => {
      BWLib.applySettings(document.documentElement, { theme: 'light', width: 860, size: 'l' });
    });
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#mw-content-text p')).fontSize), '18px');
  } finally {
    await close();
  }
});
