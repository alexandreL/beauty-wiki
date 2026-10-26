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

test('IBM Plex Serif is bundled and no remote font is requested', async () => {
  const { page, close } = await openFixture(browser, 'article.html');
  try {
    const external = [];
    page.on('request', (req) => {
      const url = req.url();
      if (/(fonts\.googleapis\.com|fonts\.gstatic\.com|use\.typekit)/.test(url)) external.push(url);
    });

    await page.waitForTimeout(300);
    const loaded = await page.evaluate(async () => {
      await document.fonts.ready;
      return {
        check: document.fonts.check('600 44px "IBM Plex Serif"'),
        faces: [...document.fonts].filter((f) => f.family.includes('IBM Plex Serif')).length,
      };
    });

    assert.equal(loaded.check, true);
    assert.ok(loaded.faces >= 1, `faces ${loaded.faces}`);
    assert.deepEqual(external, []);
  } finally {
    await close();
  }
});
