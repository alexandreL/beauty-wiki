(function () {
  'use strict';

  var started = false;

  function normalize(settings) {
    if (typeof BWLib !== 'undefined' && BWLib.normalizeSettings) return BWLib.normalizeSettings(settings);
    return settings;
  }

  function formFromSettings(settings) {
    return normalize(settings);
  }

  function settingsFromForm(values) {
    return normalize({
      theme: values.theme,
      width: Number(values.width),
      size: values.size
    });
  }

  function fill(settings) {
    ['theme', 'width', 'size'].forEach(function (name) {
      var input = document.querySelector('input[name="' + name + '"][value="' + settings[name] + '"]');
      if (input) input.checked = true;
    });
  }

  function read() {
    var values = {};
    ['theme', 'width', 'size'].forEach(function (name) {
      var input = document.querySelector('input[name="' + name + '"]:checked');
      values[name] = input ? input.value : undefined;
    });
    return values;
  }

  async function init() {
    if (started) return;
    started = true;
    if (typeof browser === 'undefined' || !browser.storage || !browser.storage.local) return;

    var status = document.getElementById('status');

    try {
      var stored = await browser.storage.local.get('beautyWiki');
      fill(formFromSettings(stored && stored.beautyWiki));
    } catch (e) {
      console.warn('[Beauty Wiki]', e);
    }

    document.getElementById('save').addEventListener('click', async function () {
      var settings = settingsFromForm(read());
      try {
        await browser.storage.local.set({ beautyWiki: settings });
        status.textContent = 'Enregistré';
        setTimeout(function () { window.close(); }, 600);
      } catch (e) {
        status.textContent = 'Échec de l’enregistrement';
      }
    });
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }

  if (typeof module !== 'undefined') {
    module.exports = { formFromSettings: formFromSettings, settingsFromForm: settingsFromForm };
  }
})();
