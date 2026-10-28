/** Controls bench used by tests/browser/controls.mjs. */
import {MixEngine} from '../js/core/engine.js';
import {DEMO_TRACKS} from '../js/core/demos.js';
import {createKnob} from '../js/ui/controls/knob.js';
import {createFader} from '../js/ui/controls/fader.js';
import {createXYPad} from '../js/ui/controls/xypad.js';
import {createPlatter} from '../js/ui/controls/platter.js';
import {createWaveform} from '../js/ui/controls/waveform.js';
import {createMeter} from '../js/ui/controls/meter.js';
import {haptics} from '../js/ui/haptics.js';

const values = {knob: 50, fader: 0.5, hfader: 0.5, xy: {x: 0, y: 0}, knobChanges: 0};
const engine = new MixEngine();
haptics.configure({enabled: false});
const knob = createKnob(document.getElementById('knob'), {label: 'Level', min: 0, max: 100, value: 50, defaultValue: 50, detent: 50, format: v => `${Math.round(v)}%`, onInput: v => { values.knob = v; }, onChange: v => { values.knob = v; values.knobChanges++; }});
const fader = createFader(document.getElementById('fader'), {orientation: 'vertical', min: 0, max: 1, value: 0.5, onInput: v => { values.fader = v; }});
const hfader = createFader(document.getElementById('hfader'), {orientation: 'horizontal', min: 0, max: 1, value: 0.5, detents: [0.5], onInput: v => { values.hfader = v; }});
const xy = createXYPad(document.getElementById('xy'), {onInput: (x, y) => { values.xy = {x, y}; }, onChange: (x, y) => { values.xy = {x, y}; }});
const platter = createPlatter(document.getElementById('platter'), {engine, deck: 0, mode: () => 'vinyl'});
const wave = createWaveform(document.querySelector('#wave canvas'), {engine, deck: 0, kind: 'detail', getMode: () => 'seek'});
const meter = createMeter(document.querySelector('#meter canvas'), {getLevel: () => engine.meter(0)});
window.Dev = {engine, values, knob, fader, hfader, xy, platter, wave, meter,
  async loadDemo() { await engine.load(0, DEMO_TRACKS[0]); await engine.play(0); return engine.decks[0].duration; }};
