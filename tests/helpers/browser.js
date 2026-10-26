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
  'rtl.html': 'https://ar.wikipedia.org/wiki/%D8%A8%D8%A7%D8%B1%D9%8A%D8%B3',
};

const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

async function launch() {
  return chromium.launch({ channel: 'chrome', headless: true });
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

  await page.route('https://upload.wikimedia.org/**', (route) => route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL }));

  await page.route('https://*.wikipedia.org/**', async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.pathname.startsWith('/img/')) {
      return route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL });
    }
    return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
  });

  await page.addInitScript(() => {
    window.browser = {
      storage: {
        local: {
          get: async () => ({}),
          set: async () => {},
        },
        onChanged: { addListener: () => {} },
      },
    };
  });

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
