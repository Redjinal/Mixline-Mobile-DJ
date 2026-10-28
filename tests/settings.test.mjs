import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_SETTINGS, normalizeSettings, createSettings, settingsSearch, SETTINGS_SCHEMA} from '../web/js/core/settings.js';

test('normalisation fills defaults, drops unknown keys and rejects invalid values', () => {
  const s = normalizeSettings({theme: 'light', decks: 'violet', glow: 1.4, hapticProfile: 'bogus', junk: 1});
  assert.equal(s.theme, 'light'); assert.equal(s.decks, 'violet'); assert.equal(s.glow, 1.4);
  assert.equal(s.hapticProfile, DEFAULT_SETTINGS.hapticProfile); assert.equal('junk' in s, false);
  assert.equal(normalizeSettings({glow: 9}).glow, 1.6); assert.equal(normalizeSettings({glow: -1}).glow, 0.4);
  assert.deepEqual(normalizeSettings(null), DEFAULT_SETTINGS);
});
test('settings store loads, saves explicitly and reports dirty state', async () => {
  const saved = {}; const store = {async getSetting() { return saved.value; }, async setSetting(k, v) { saved.value = v; return v; }};
  const settings = createSettings({store});
  await settings.load();
  assert.deepEqual(settings.current, DEFAULT_SETTINGS);
  settings.draft.theme = 'light';
  assert.equal(settings.dirty, true);
  assert.deepEqual(settings.current.theme, 'dark');
  await settings.save();
  assert.equal(settings.dirty, false); assert.equal(saved.value.theme, 'light'); assert.equal(settings.current.theme, 'light');
  settings.draft.glow = 1.3; settings.discard(); assert.equal(settings.dirty, false); assert.equal(settings.draft.glow, 1);
  settings.resetDraft(); assert.equal(settings.draft.theme, 'dark'); assert.equal(settings.dirty, true);
});
test('schema search matches labels, help and synonyms across groups', () => {
  const hits = settingsSearch('vibration');
  assert.ok(hits.some(h => h.key === 'haptics'));
  assert.ok(settingsSearch('colour').some(h => h.key === 'decks'));
  assert.equal(settingsSearch('zzz').length, 0);
  assert.ok(SETTINGS_SCHEMA.every(g => g.items.every(i => i.key in DEFAULT_SETTINGS)));
});
