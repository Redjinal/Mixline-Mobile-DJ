// Component manifest. Foundation components first, then one manifest per family.
// Agents: add your components to components/families/<family>.js, never here.
import './mdj-fixture-mark.js';
import './mdj-transport.js';
import './mdj-crossfader.js';
import './mdj-meter.js';
import './mdj-deck-tab.js';
import './mdj-parday-button.js';
import './mdj-route-chip.js';

// Each family loads on its own so one broken or half-written module degrades only that family's
// components instead of failing the whole import graph (and with it every screen). The failure is
// still reported loudly on the console, which the smoke run treats as an error.
export const FAMILIES = ['controls', 'transport-pads', 'waveform', 'data', 'parday', 'routing-av'];
export const familyLoadErrors = {};
await Promise.all(FAMILIES.map((f) => import(`./families/${f}.js`).catch((e) => {
  familyLoadErrors[f] = e;
  console.error(`component family "${f}" failed to load`, e);
})));
