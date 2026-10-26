const test = require('node:test');
const assert = require('node:assert');

global.BWLib = require('../../src/lib.js');
const popup = require('../../src/popup/popup.js');

test('formFromSettings reads normalized values', () => {
  assert.deepEqual(popup.formFromSettings({ theme: 'dark', width: 1200, size: 'l' }), {
    theme: 'dark',
    width: 1200,
    size: 'l',
  });
  assert.deepEqual(popup.formFromSettings(undefined), { theme: 'auto', width: 860, size: 'm' });
});

test('settingsFromForm rejects invalid values', () => {
  assert.deepEqual(popup.settingsFromForm({ theme: 'neon', width: '42', size: 'xl' }), {
    theme: 'auto',
    width: 860,
    size: 'm',
  });
  assert.deepEqual(popup.settingsFromForm({ theme: 'light', width: '970', size: 's' }), {
    theme: 'light',
    width: 970,
    size: 's',
  });
});
