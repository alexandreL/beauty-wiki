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
