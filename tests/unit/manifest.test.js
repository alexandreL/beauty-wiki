const test = require('node:test');
const assert = require('node:assert');
const manifest = require('../../manifest.json');

test('manifest is a valid Firefox MV3 extension', () => {
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.name, 'Beauty Wiki');
  assert.deepEqual(manifest.permissions, ['storage']);
  assert.deepEqual(manifest.host_permissions, ['*://*.wikipedia.org/*']);
  assert.equal(manifest.content_scripts[0].matches[0], '*://*.wikipedia.org/*');
  assert.ok(manifest.browser_specific_settings.gecko.id);
  assert.ok(manifest.content_scripts[0].css.length >= 1);
  assert.ok(manifest.content_scripts[0].css.includes('src/css/minerva.css'));
});
