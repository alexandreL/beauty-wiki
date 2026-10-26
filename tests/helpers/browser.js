'use strict';

const path = require('node:path');
const { chromium } = require('playwright');
const { startServer } = require('./server');

const ROOT = path.resolve(__dirname, '../..');
const CSS = ['tokens', 'base', 'layout', 'chrome', 'content', 'responsive'];

const FIXTURE_URLS = {
  'article.html': 'https://fr.wikipedia.org/wiki/Paris',
  'article-noimage.html': 'https://fr.wikipedia.org/wiki/Lyon',
  'special.html': 'https://fr.wikipedia.org/wiki/Sp%C3%A9cial:Recherche',
  'edit.html': 'https://fr.wikipedia.org/w/index.php?title=Paris&action=edit',
  'unknown-skin.html': 'https://fr.wikipedia.org/wiki/Paris',
  'rtl.html': 'https://ar.wikipedia.org/wiki/%D8%A8%D8%A7%D8%B1%D9%8A%D8%B3',
};

const zlib = require('node:zlib');

function makePng(width, height) {
  const rowBytes = width * 3 + 1;
  const raw = Buffer.alloc(rowBytes * height, 200);
  for (let y = 0; y < height; y++) raw[y * rowBytes] = 0;
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const tag = Buffer.from(type);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(Buffer.concat([tag, data])) >>> 0);
    return Buffer.concat([len, tag, data, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const PIXEL = makePng(400, 250);

async function launch() {
  const channel = process.env.BW_CHANNEL || 'chrome';
  const options = { headless: true };
  if (channel !== 'chromium') options.channel = channel;
  return chromium.launch(options);
}

async function openFixture(browser, fixture, opts = {}) {
  const server = await startServer(ROOT);
  const context = await browser.newContext({
    viewport: opts.viewport || { width: 1440, height: 900 },
    colorScheme: opts.colorScheme,
    locale: 'fr-FR',
  });
  const page = await context.newPage();

  const html = require('node:fs').readFileSync(path.join(ROOT, 'tests/fixtures', fixture), 'utf8');
  const target = opts.url || FIXTURE_URLS[fixture] || 'https://fr.wikipedia.org/wiki/Paris';

  await page.route('https://thumb.wikimedia.org/**', (route) => route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL }));

  await page.route('https://*.wikipedia.org/**', async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.pathname.startsWith('/img/')) {
      return route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL });
    }
    return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
  });

  await page.route('**/fonts/*.woff2', (route) => {
    const name = path.basename(new URL(route.request().url()).pathname);
    return route.fulfill({
      status: 200,
      contentType: 'font/woff2',
      body: require('node:fs').readFileSync(path.join(ROOT, 'fonts', name)),
    });
  });

  await page.addInitScript((stored) => {
    window.browser = {
      storage: {
        local: {
          get: async () => (stored ? { beautyWiki: stored } : {}),
          set: async () => {},
        },
        onChanged: { addListener: () => {} },
      },
    };
  }, opts.stored || null);

  await page.goto(target, { waitUntil: 'domcontentloaded' });

  for (const name of CSS) {
    await page.addStyleTag({ path: path.join(ROOT, 'src/css', `${name}.css`) });
  }
  await page.addScriptTag({ path: path.join(ROOT, 'src/lib.js') });

  if (opts.content !== false) {
    await page.addScriptTag({ path: path.join(ROOT, 'src/content.js') });
    await page.evaluate(() => {
      if (window.BW && typeof window.BW.init === 'function') return window.BW.init();
    });
    await page.waitForTimeout(50);
  }

  const close = async () => {
    await context.close();
    await server.close();
  };

  return { page, server, close };
}

module.exports = { launch, openFixture, ROOT };
