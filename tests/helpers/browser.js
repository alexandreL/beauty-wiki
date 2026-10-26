'use strict';

const path = require('node:path');
const { chromium } = require('playwright');
const { startServer } = require('./server');

const ROOT = path.resolve(__dirname, '../..');
const CSS = ['tokens', 'base', 'layout', 'chrome', 'content', 'responsive'];

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

  await page.goto(`${server.url}/tests/fixtures/${fixture}`, { waitUntil: 'domcontentloaded' });

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
