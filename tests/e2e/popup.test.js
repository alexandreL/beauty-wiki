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

test('popup saves the selected settings as beautyWiki', async () => {
  const page = await browser.newPage();
  try {
    await page.addInitScript(() => {
      window.__writes = [];
      window.browser = {
        storage: {
          local: {
            get: async () => ({ beautyWiki: { theme: 'auto', width: 860, size: 'm' } }),
            set: async (value) => {
              window.__writes.push(value);
            },
          },
          onChanged: { addListener: () => {} },
        },
      };
    });
    await page.goto('file://' + path.join(ROOT, 'src/popup/popup.html'));
    await page.addScriptTag({ path: path.join(ROOT, 'src/lib.js') });
    await page.addScriptTag({ path: path.join(ROOT, 'src/popup/popup.js') });
    await page.evaluate(() => document.dispatchEvent(new Event('DOMContentLoaded')));

    await page.check('input[name="theme"][value="dark"]');
    await page.check('input[name="width"][value="1200"]');
    await page.check('input[name="size"][value="l"]');
    await page.click('#save');

    const writes = await page.evaluate(() => window.__writes);
    assert.deepEqual(writes.at(-1), { beautyWiki: { theme: 'dark', width: 1200, size: 'l' } });
  } finally {
    await page.close();
  }
});

test('content script applies stored settings on load', async () => {
  const { page, close } = await openFixture(browser, 'article.html', { stored: { theme: 'dark', width: 1200, size: 'l' } });
  try {
    await page.waitForFunction(() => document.documentElement.getAttribute('data-bw-theme') === 'dark');
    const attrs = await page.evaluate(() => ({
      theme: document.documentElement.getAttribute('data-bw-theme'),
      width: document.documentElement.getAttribute('data-bw-width'),
      size: document.documentElement.getAttribute('data-bw-size'),
      bg: getComputedStyle(document.body).backgroundColor,
    }));
    assert.deepEqual(attrs, { theme: 'dark', width: '1200', size: 'l', bg: 'rgb(10, 10, 10)' });
  } finally {
    await close();
  }
});
