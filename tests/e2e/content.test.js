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

function contrast(rgbA, rgbB) {
  const parse = (s) => s.match(/\d+/g).slice(0, 3).map(Number);
  const lum = (rgb) => {
    const [r, g, b] = rgb.map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [a, b] = [lum(parse(rgbA)), lum(parse(rgbB))];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

test('infobox, tables and quotes follow the reading style', async () => {
  const { page, close } = await openFixture(browser, 'article.html');
  try {
    const s = await page.evaluate(() => {
      const infobox = getComputedStyle(document.querySelector('.infobox'));
      const cell = getComputedStyle(document.querySelector('.wikitable td'));
      const table = getComputedStyle(document.querySelector('.wikitable'));
      const quote = getComputedStyle(document.querySelector('blockquote'));
      return {
        float: infobox.float,
        infoboxWidth: infobox.width,
        infoboxBg: infobox.backgroundColor,
        infoboxRadius: infobox.borderRadius,
        infoboxPadding: infobox.padding,
        collapse: table.borderCollapse,
        cellBorder: cell.borderTopColor,
        cellPadding: cell.padding,
        quoteBorder: quote.borderLeftWidth + ' ' + quote.borderLeftColor,
      };
    });
    assert.equal(s.float, 'right');
    assert.equal(s.infoboxWidth, '320px');
    assert.equal(s.infoboxBg, 'rgb(247, 247, 247)');
    assert.equal(s.infoboxRadius, '16px');
    assert.equal(s.infoboxPadding, '16px');
    assert.equal(s.collapse, 'collapse');
    assert.equal(s.cellBorder, 'rgb(225, 225, 225)');
    assert.equal(s.cellPadding, '8px 12px');
    assert.equal(s.quoteBorder, '3px rgb(225, 225, 225)');
  } finally {
    await close();
  }
});

test('dark mode repaints surfaces with accessible contrast', async () => {
  const { page, close } = await openFixture(browser, 'article.html');
  try {
    await page.evaluate(() => {
      BWLib.applySettings(document.documentElement, { theme: 'dark', width: 860, size: 'm' });
    });
    const s = await page.evaluate(() => ({
      infoboxBg: getComputedStyle(document.querySelector('.infobox')).backgroundColor,
      tableText: getComputedStyle(document.querySelector('.wikitable td')).color,
      tableBg: getComputedStyle(document.querySelector('.wikitable')).backgroundColor,
      link: getComputedStyle(document.querySelector('#mw-content-text a')).color,
      bodyBg: getComputedStyle(document.body).backgroundColor,
    }));
    assert.equal(s.infoboxBg, 'rgb(37, 37, 37)');
    assert.notEqual(s.tableBg, 'rgba(0, 0, 0, 0)');
    assert.equal(s.tableBg, 'rgb(10, 10, 10)');
    assert.ok(contrast(s.tableText, s.bodyBg) >= 4.5, `table contrast ${contrast(s.tableText, s.bodyBg)}`);
    assert.ok(contrast(s.link, s.bodyBg) >= 4.5, `link contrast ${contrast(s.link, s.bodyBg)}`);
  } finally {
    await close();
  }
});

test('wide tables scroll instead of overflowing on mobile', async () => {
  const { page, close } = await openFixture(browser, 'article.html', { viewport: { width: 390, height: 844 } });
  try {
    const s = await page.evaluate(() => {
      const table = document.querySelector('.wikitable');
      const parent = table.parentElement;
      return {
        wrapped: parent.classList.contains('bw-table-scroll'),
        overflowX: getComputedStyle(parent).overflowX,
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      };
    });
    assert.equal(s.wrapped, true);
    assert.equal(s.overflowX, 'auto');
    assert.ok(s.scrollWidth <= s.innerWidth, `${s.scrollWidth} > ${s.innerWidth}`);
  } finally {
    await close();
  }
});
