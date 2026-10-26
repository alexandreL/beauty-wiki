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

async function openMobile(opts = {}) {
  return openFixture(browser, 'minerva.html', {
    viewport: opts.viewport || { width: 390, height: 844 },
    colorScheme: opts.colorScheme,
    stored: opts.stored,
  });
}

test('Minerva articles get the reading layout', async () => {
  const { page, close } = await openMobile();
  try {
    const state = await page.evaluate(() => {
      const cover = document.querySelector('figure.bw-cover');
      const heading = document.querySelector('.page-heading');
      const facts = document.querySelector('.bw-facts');
      return {
        bw: document.documentElement.hasAttribute('data-bw'),
        skin: document.documentElement.getAttribute('data-bw-skin'),
        kind: document.documentElement.getAttribute('data-bw-kind'),
        cover: !!cover,
        coverBeforeTitle: !!(cover && heading && (cover.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING)),
        source: document.querySelector('.bw-source')?.textContent,
        facts: !!facts,
        factsOpen: facts && facts.open,
        hint: document.querySelector('.bw-facts__hint')?.textContent,
        tocInSheet: !!document.querySelector('.bw-toc-sheet #toc'),
        themeToggle: !!document.querySelector('.minerva-header .bw-theme-toggle'),
        collapsedVisible: getComputedStyle(document.querySelector('#Histoire-collapsible-content')).display,
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
      };
    });

    assert.equal(state.bw, true);
    assert.equal(state.skin, 'minerva');
    assert.equal(state.kind, 'article');
    assert.equal(state.cover, true);
    assert.equal(state.coverBeforeTitle, true);
    assert.equal(state.source, 'De Wikipédia, l’encyclopédie libre');
    assert.equal(state.facts, true);
    assert.equal(state.factsOpen, false);
    assert.equal(state.hint, 'Pays, Région, Département');
    assert.equal(state.tocInSheet, true);
    assert.equal(state.themeToggle, true);
    assert.equal(state.collapsedVisible, 'block');
    assert.equal(state.scrollW, state.clientW);
  } finally {
    await close();
  }
});

test('Minerva article has no horizontal overflow from 320 to 430px', async () => {
  for (const width of [320, 360, 390, 430]) {
    const { page, close } = await openMobile({ viewport: { width, height: 800 } });
    try {
      const state = await page.evaluate(() => ({
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
        headerW: Math.round(document.querySelector('.minerva-header').getBoundingClientRect().width),
        searchW: Math.round(document.querySelector('.minerva-search-form').getBoundingClientRect().width),
      }));
      assert.equal(state.scrollW, state.clientW, `overflow at ${width}px`);
      assert.ok(state.searchW <= 48, `search field took ${state.searchW}px at ${width}px`);
    } finally {
      await close();
    }
  }
});

test('Minerva quick facts card expands and keeps the infobox inside', async () => {
  const { page, close } = await openMobile();
  try {
    await page.click('.bw-facts > summary');
    const state = await page.evaluate(() => {
      const facts = document.querySelector('.bw-facts');
      const infobox = facts.querySelector('.infobox');
      const card = facts.getBoundingClientRect();
      const box = infobox.getBoundingClientRect();
      return {
        open: facts.open,
        inside: box.left >= card.left - 1 && box.right <= card.right + 1,
        bg: getComputedStyle(facts.querySelector('.infobox th, .infobox td')).backgroundColor,
      };
    });
    assert.equal(state.open, true);
    assert.equal(state.inside, true);
    assert.equal(state.bg, 'rgba(0, 0, 0, 0)');
  } finally {
    await close();
  }
});

test('Minerva contents sheet opens, lists sections and closes', async () => {
  const { page, close } = await openMobile();
  try {
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(100);
    await page.evaluate(() => window.scrollBy(0, -200));
    await page.waitForTimeout(300);

    await page.click('.bw-toc-toggle');
    let state = await page.evaluate(() => ({
      open: document.documentElement.classList.contains('bw-toc-open'),
      items: [...document.querySelectorAll('.bw-toc-sheet #toc a')].map((a) => a.textContent.trim()),
      expanded: document.querySelector('.bw-toc-toggle').getAttribute('aria-expanded'),
      hidden: document.querySelector('.bw-toc-toggle').classList.contains('bw-toc-toggle--hidden'),
    }));
    assert.equal(state.open, true);
    assert.equal(state.expanded, 'true');
    assert.ok(state.items.length >= 4, state.items.join('|'));
    assert.ok(state.items.some((item) => item.includes('Géographie')));

    await page.click('.bw-toc-close');
    state = await page.evaluate(() => ({
      open: document.documentElement.classList.contains('bw-toc-open'),
      overflow: document.body.style.overflow,
    }));
    assert.equal(state.open, false);
    assert.equal(state.overflow, '');
  } finally {
    await close();
  }
});

test('Minerva dark theme paints native surfaces with the reading tokens', async () => {
  const { page, close } = await openMobile({ colorScheme: 'dark' });
  try {
    const state = await page.evaluate(() => ({
      theme: document.documentElement.getAttribute('data-bw-theme'),
      night: document.documentElement.classList.contains('skin-theme-clientpref-night'),
      body: getComputedStyle(document.body).backgroundColor,
      header: getComputedStyle(document.querySelector('.header-container')).backgroundColor,
      sheet: getComputedStyle(document.querySelector('.bw-toc-sheet')).backgroundColor,
    }));
    assert.equal(state.theme, 'auto');
    assert.equal(state.night, true);
    assert.equal(state.body, 'rgb(10, 10, 10)');
    assert.equal(state.sheet, 'rgb(10, 10, 10)');
    assert.equal(state.header, 'rgba(10, 10, 10, 0.85)');
  } finally {
    await close();
  }
});
