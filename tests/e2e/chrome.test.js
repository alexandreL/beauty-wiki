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

test('editing chrome is hidden but search and languages remain', async () => {
  const { page, close } = await openFixture(browser, 'article.html');
  try {
    const states = await page.evaluate(() => {
      const display = (sel) => getComputedStyle(document.querySelector(sel)).display;
      return {
        views: display('#p-views'),
        cactions: display('#p-cactions'),
        editSection: display('.mw-editsection'),
        user: display('#pt-userpage'),
        notifications: display('#pt-notifications'),
        search: display('#searchform'),
        languages: display('#p-lang-btn'),
        headerPosition: getComputedStyle(document.querySelector('.vector-header')).position,
        headerTop: getComputedStyle(document.querySelector('.vector-header')).top,
        skip: !!document.querySelector('.bw-skip'),
      };
    });
    assert.equal(states.views, 'none');
    assert.equal(states.cactions, 'none');
    assert.equal(states.editSection, 'none');
    assert.equal(states.user, 'none');
    assert.equal(states.notifications, 'none');
    assert.notEqual(states.search, 'none');
    assert.notEqual(states.languages, 'none');
    assert.equal(states.headerPosition, 'sticky');
    assert.equal(states.headerTop, '0px');
    assert.equal(states.skip, true);
  } finally {
    await close();
  }
});

test('edit and special pages only receive tokens', async () => {
  for (const fixture of ['edit.html', 'special.html']) {
    const { page, close } = await openFixture(browser, fixture);
    try {
      const state = await page.evaluate(() => ({
        bodyClass: document.body.className,
        toggles: document.querySelectorAll('.bw-toc-toggle').length,
        grid: getComputedStyle(document.querySelector('.mw-page-container')).display,
        bg: getComputedStyle(document.body).backgroundColor,
      }));
      assert.ok(state.bodyClass.includes('bw-tokens-only'), `${fixture}: ${state.bodyClass}`);
      assert.equal(state.toggles, 0);
      assert.notEqual(state.grid, 'grid');
      assert.equal(state.bg, 'rgb(255, 255, 255)');
    } finally {
      await close();
    }
  }
});

test('tokens-only pages remain readable in dark mode', async () => {
  const { page, close } = await openFixture(browser, 'edit.html', { stored: { theme: 'dark', width: 860, size: 'm' } });
  try {
    await page.waitForFunction(() => document.documentElement.getAttribute('data-bw-theme') === 'dark');
    const s = await page.evaluate(() => ({
      containerBg: getComputedStyle(document.querySelector('.mw-page-container-inner')).backgroundColor,
      bodyColor: getComputedStyle(document.body).color,
      headerBg: getComputedStyle(document.querySelector('.vector-header')).backgroundColor,
    }));
    assert.equal(s.containerBg, 'rgb(10, 10, 10)');
    assert.equal(s.bodyColor, 'rgb(255, 255, 255)');
    assert.equal(s.headerBg, 'rgb(10, 10, 10)');
  } finally {
    await close();
  }
});

test('unknown skins are left untouched', async () => {
  const { page, close } = await openFixture(browser, 'unknown-skin.html');
  try {
    const state = await page.evaluate(() => ({
      dataBw: document.documentElement.hasAttribute('data-bw'),
      bodyClass: document.body.className,
    }));
    assert.equal(state.dataBw, false);
    assert.ok(!state.bodyClass.includes('bw-article'));
  } finally {
    await close();
  }
});

test('search pill and photo captions have no legacy outlines', async () => {
  const { page, close } = await openFixture(browser, 'article.html');
  try {
    const s = await page.evaluate(() => ({
      radius: getComputedStyle(document.querySelector('#searchform')).borderRadius,
      buttonBorder: getComputedStyle(document.querySelector('#searchform button')).borderTopWidth,
      imgBorder: getComputedStyle(document.querySelector('#mw-content-text figure img')).borderTopWidth,
      capPad: getComputedStyle(document.querySelector('#mw-content-text figcaption')).paddingTop,
      capColor: getComputedStyle(document.querySelector('#mw-content-text figcaption')).color,
    }));
    assert.equal(s.radius, '999px');
    assert.equal(s.buttonBorder, '0px');
    assert.equal(s.imgBorder, '0px');
    assert.equal(s.capPad, '8px');
    assert.equal(s.capColor, 'rgb(110, 110, 110)');
  } finally {
    await close();
  }
});

test('header toggle switches theme and persists it', async () => {
  const { page, close } = await openFixture(browser, 'article.html');
  try {
    await page.waitForTimeout(100);
    const toggle = page.locator('.bw-theme-toggle');
    assert.equal(await toggle.count(), 1);
    assert.equal(await toggle.getAttribute('data-bw-state'), 'auto');
    assert.equal(await toggle.getAttribute('aria-pressed'), 'false');

    await page.evaluate(() => {
      window.__set = null;
      window.browser.storage.local.set = async (value) => { window.__set = value; };
    });

    await toggle.click();
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-bw-theme')), 'light');
    assert.equal(await toggle.getAttribute('data-bw-state'), 'light');

    await toggle.click();
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-bw-theme')), 'dark');
    assert.equal(await toggle.getAttribute('aria-pressed'), 'true');
    assert.deepEqual(await page.evaluate(() => window.__set), { beautyWiki: { theme: 'dark', width: 860, size: 'm' } });

    await toggle.click();
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-bw-theme')), 'auto');
    assert.equal(await toggle.getAttribute('data-bw-state'), 'auto');
  } finally {
    await close();
  }
});

test('uses chrome.storage when the browser namespace is absent', async () => {
  const page = await browser.newPage();
  try {
    await page.addInitScript(() => {
      window.chrome = {
        storage: {
          local: {
            get: async () => ({ ok: 1 }),
            set: async () => {},
          },
          onChanged: { addListener: () => {} },
        },
      };
    });
    await page.goto('about:blank');
    await page.addScriptTag({ path: require('node:path').join(__dirname, '../../src/lib.js') });
    const ok = await page.evaluate(async () => {
      const value = await BWApi.storage.local.get('probe');
      return value.ok === 1;
    });
    assert.equal(ok, true);
  } finally {
    await page.close();
  }
});
