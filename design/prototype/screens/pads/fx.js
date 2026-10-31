// pads/fx — the per-deck FX chain (Document 03 §4 "XY pad": names both axes, units, wet/dry and
// Momentary/Latch; starting-point policy explicit; momentary release follows the preset envelope; Latch
// stays clearly active; independent sliders, Engage and Bypass as the accessible alternative;
// FR-024 / FR-025).
//
// Composition: workspace row; a state lead when the state needs words; the chain header (deck line and
// the assignment radios Deck A / Deck B / Master); three slot rows (slot number disc, effect selector of
// the eight FR-024 effects, Engage/Bypass, Tempo/Free rate with its value, wet/dry dial); the
// <mdj-xy-pad> on slot 1; the macro (one dial with its printed parameter mapping and Reset). Landscape:
// chain + macro on the left, XY pad on the right, each column scrolls independently.
//
// The screen stands in for the engine: Latch (idle) → latch-armed, a touch on the surface or "Latch XY
// now" → latched, Bypass (latched) → bypassed, Engage (bypassed) → latch-armed, Momentary → idle. In
// momentary mode a finger on the surface shows held while down and releases on pointer-up/cancel (local,
// drawn). Dial / slider moves are acknowledged by the screen; other commands print SENT. No audio exists:
// "tail ringing" is a fixture description, never a meter.
import { register } from '../../app/registry.js';
import { h, button, icon } from '../../components/base.js';
import { padsNav, statusNote, fixtureLine, padsData } from './pads.js';

const XY_FOR = {
  idle: { mode: 'momentary', state: 'idle' },
  'latch-armed': { mode: 'latch', state: 'idle' },
  latched: { mode: 'latch', state: 'latched' },
  'momentary-held': { mode: 'momentary', state: 'held' },
  bypassed: { mode: 'latch', state: 'bypassed' },
  tails: { mode: 'latch', state: 'bypassed' },
  'unavailable-effect': { mode: 'momentary', state: 'idle' },
  macro: { mode: 'momentary', state: 'idle' },
};

register({
  id: 'pads/fx', family: 'pads', title: 'FX chain and XY pad', order: 3,
  fr: ['FR-024', 'FR-025'],
  shell: true,
  dock: { portrait: true, landscape: true },
  states: {
    idle: { label: 'Idle — momentary XY on Echo, slot 1', exercised: true, scenario: 'a-playing', via: { from: 'latch-armed', control: 'Momentary mode, Echo on deck A' } },
    'latch-armed': { label: 'Latch chosen — touch the pad to latch', exercised: true, scenario: 'a-playing', via: { from: 'idle', control: 'Latch mode, Echo on deck A' } },
    latched: { label: 'Latched — stays active until Bypass', exercised: true, scenario: 'a-playing', via: { from: 'latch-armed', control: 'Latch XY now, Echo on deck A' } },
    'momentary-held': { label: 'Momentary — finger held on the XY surface', exercised: false, scenario: 'a-playing' },
    bypassed: { label: 'Bypassed — last values kept, dimmed', exercised: true, scenario: 'a-playing', via: { from: 'latched', control: 'Bypass Echo on deck A' } },
    'unavailable-effect': { label: 'Effect unavailable on this device profile (slot 3)', exercised: false, scenario: 'a-playing' },
    macro: { label: 'Macro open — parameter mapping and Reset', exercised: true, scenario: 'a-playing', via: { from: 'idle', control: 'Open macro, deck A FX' } },
    tails: { label: 'Bypass keeps the echo tail — documented', exercised: true, scenario: 'a-playing', via: { from: 'bypassed', control: 'Tail behaviour' } },
  },
  defaultState: 'idle',
  render(ctx) {
    const state = ctx.state;
    const land = ctx.orientation === 'landscape';
    const fx = padsData().fx;
    const deck = ctx.session.decks.A;
    const { note, say } = statusNote();
    const root = h('div', { class: `pads-screen pads-fx pads-fx--${land ? 'landscape' : 'portrait'}`, dataset: { state } });

    // ---- slots (state-adjusted copy of the fixture) ----
    const slots = fx.slots.map((s) => ({ ...s }));
    if (state === 'bypassed' || state === 'tails') slots[0].engaged = false;
    if (state === 'unavailable-effect') { slots[2].effect = 'Bitcrush'; slots[2].engaged = false; }

    const chain = h('section', { class: 'pads-panel raised pads-chain', 'aria-labelledby': 'pads-chain-title' }, [
      h('div', { class: 'pads-chain__head' }, [
        h('h2', { id: 'pads-chain-title', class: 'label', text: 'FX chain · deck A · 3 slots' }),
        assignment(say),
      ]),
      h('p', { class: 'pads-chain__track body' }, [h('span', { class: 'muted', text: 'On deck A: ' }), h('strong', { class: 'wrap-2', text: deck.track ? deck.track.title : 'no track' })]),
      h('ol', { class: 'pads-slots', role: 'list' }, slots.map((s) => slotRow(ctx, s, fx, state, say))),
    ]);

    // ---- XY pad on slot 1 ----
    const x = fx.xy;
    const xyCfg = XY_FOR[state] || XY_FOR.idle;
    const xy = h('mdj-xy-pad', {
      effect: x.effect, deck: 'A', x: String(x.x), y: String(x.y), 'x-label': x.xLabel, 'y-label': x.yLabel, 'x-unit': x.xUnit, 'y-unit': x.yUnit,
      'x-min': String(x.xMin), 'x-max': String(x.xMax), 'y-min': String(x.yMin), 'y-max': String(x.yMax), wet: String(x.wet), mode: xyCfg.mode, 'release-ms': String(x.releaseMs), state: xyCfg.state,
    });
    if (state === 'momentary-held') { xy.setAttribute('x', '0.31'); xy.setAttribute('y', '0.66'); }
    xy.addEventListener('mdj:xy-mode', (e) => {
      const m = e.detail.mode;
      if (m === 'latch' && (state === 'idle' || state === 'momentary-held' || state === 'macro' || state === 'unavailable-effect')) return ctx.setState('latch-armed');
      if (m === 'momentary' && state !== 'idle') return ctx.setState('idle');
    });
    xy.addEventListener('mdj:xy-engage', (e) => {
      if (!e.detail.engage && (state === 'latched' || state === 'latch-armed' || state === 'idle')) return ctx.setState('bypassed');
      if (e.detail.engage) return ctx.setState('latch-armed');
    });
    xy.addEventListener('mdj:xy-step', (e) => {
      const { param, delta } = e.detail;
      const cur = Number(xy.getAttribute(param)) || 0;
      xy.setAttribute(param, String(Math.min(1, Math.max(0, cur + delta / 100))));
      // acknowledged by the screen standing in for the engine
    });
    // Surface touch: momentary shows held while the finger is down; latch-armed latches; latched unlatches.
    xy.addEventListener('pointerdown', (e) => {
      if (!e.target.closest('.xy-pad__surface')) return;
      if (state === 'latch-armed') { ctx.setState('latched'); return; }
      if (state === 'latched') { ctx.setState('latch-armed'); return; }
      if (xyCfg.mode === 'momentary' && xyCfg.state === 'idle') {
        xy.setAttribute('state', 'held');
        const release = () => { xy.setAttribute('state', 'idle'); window.removeEventListener('pointerup', release); window.removeEventListener('pointercancel', release); };
        window.addEventListener('pointerup', release); window.addEventListener('pointercancel', release);
      }
    });
    const xyBox = h('section', { class: 'pads-xy', 'aria-label': 'XY pad, slot 1 Echo, deck A' }, [xy]);
    if (state === 'latch-armed') {
      xyBox.appendChild(h('div', { class: 'pads-xy__arm raised' }, [
        h('p', { class: 'body', text: 'Latch is chosen. Touch the pad to latch Echo at the current values (no jump), or use the button.' }),
        button({ label: 'Latch XY now', icon: 'latch', fr: ['FR-025'], cls: 'btn--primary', attrs: { 'aria-label': 'Latch XY now, Echo on deck A' }, on: { click: () => ctx.setState('latched') } }),
      ]));
    }

    // ---- macro ----
    const macro = macroPanel(ctx, fx.macro, state === 'macro', say);

    // ---- lead ----
    const lead = leadFor(ctx, state, fx);

    if (land) {
      root.append(padsNav(ctx, 'pads/fx'), h('div', { class: 'pads-fx__cols' }, [
        h('div', { class: 'pads-fx__col' }, [lead, note, chain, macro].filter(Boolean)),
        h('div', { class: 'pads-fx__col' }, [xyBox]),
      ]));
    } else {
      root.append(...[padsNav(ctx, 'pads/fx'), lead, note, state === 'macro' ? macro : null, chain, xyBox, state === 'macro' ? null : macro].filter(Boolean));
    }
    return root;
  },
});

function assignment(say) {
  const opts = [['A', 'Deck A'], ['B', 'Deck B'], ['M', 'Master']];
  return h('div', { class: 'pads-assign', role: 'radiogroup', 'aria-label': 'FX chain assignment' }, opts.map(([id, text]) => h('button', {
    type: 'button', role: 'radio', class: 'pads-assign__opt', dataset: { hit: '48', fr: 'FR-024' }, 'aria-checked': String(id === 'A'),
    'aria-label': `Assign FX chain to ${text.toLowerCase()}`,
    on: { click: () => { if (id !== 'A') say(`Assign the chain to ${text}: sent. Not acknowledged — no engine exists in this prototype; the chain stays on deck A.`); } },
  }, [h('span', { class: 'label', text })])));
}

function slotRow(ctx, s, fx, state, say) {
  const unavailable = fx.unavailableOnProfile[s.effect];
  const where = `slot ${s.n}, ${s.effect}, deck A`;
  const sel = h('select', { class: 'pads-slot__select', dataset: { hit: '48', fr: 'FR-024' }, 'aria-label': `Effect, slot ${s.n}, deck A` },
    fx.effects.map((e) => h('option', { value: e, selected: e === s.effect ? '' : null, text: fx.unavailableOnProfile[e] ? `${e} (unavailable here)` : e })));
  sel.addEventListener('change', () => say(`Effect change on slot ${s.n} to ${sel.value}: sent. The slot keeps ${s.effect} until the engine acknowledges (no engine in this prototype).`));
  const tail = fx.tails[s.effect];
  const statusWord = unavailable ? 'Unavailable' : s.engaged ? 'Engaged' : (state === 'tails' && s.n === 1 ? 'Bypassed · tail' : 'Bypassed');
  const engage = h('button', {
    type: 'button', class: `btn ${s.engaged ? 'btn--secondary' : 'btn--primary'} pads-slot__engage`, dataset: { hit: '48', fr: 'FR-024' },
    'aria-pressed': String(!!s.engaged), 'aria-disabled': unavailable ? 'true' : null,
    'aria-label': `${s.engaged ? 'Bypass' : 'Engage'} ${where}${unavailable ? ' (unavailable on this device profile)' : ''}`,
    on: { click: () => { if (unavailable) return; if (s.n === 1 && s.engaged && (state === 'latched' || state === 'latch-armed' || state === 'idle')) return ctx.setState('bypassed'); if (s.n === 1 && !s.engaged) return ctx.setState('latch-armed'); say(`${s.engaged ? 'Bypass' : 'Engage'} ${where}: sent. Not acknowledged — no engine exists in this prototype.`); } },
  }, [icon(s.engaged ? 'x' : 'fx', { size: 16 }), h('span', { class: 'btn-label', text: s.engaged ? 'Bypass' : 'Engage' })]);

  const rate = h('div', { class: 'pads-rate', role: 'radiogroup', 'aria-label': `Rate, ${where}` }, [['tempo', 'Tempo'], ['free', 'Free']].map(([id, text]) => h('button', {
    type: 'button', role: 'radio', class: 'pads-rate__opt', dataset: { hit: '48', fr: 'FR-024' }, 'aria-checked': String(s.rateMode === id), 'aria-disabled': unavailable ? 'true' : null,
    'aria-label': `${text} rate, ${where}`, on: { click: () => { if (!unavailable && s.rateMode !== id) say(`${text} rate on slot ${s.n}: sent. Not acknowledged — no engine exists in this prototype.`); } },
  }, [h('span', { class: 'label', text })])));
  const rateVal = h('span', { class: 'pads-slot__rateval numeral', text: s.rateMode === 'tempo' ? s.rate : s.freeRate });

  const wet = h('mdj-dial', { kind: 'generic', deck: 'A', value: String(s.wet), min: '0', max: '100', unit: '%', size: '48', label: `Wet slot ${s.n}`, state: unavailable ? 'disabled' : null });
  wet.addEventListener('mdj:value', (e) => { if (e.detail.phase === 'end') { wet.setAttribute('value', String(e.detail.value)); wet.removeAttribute('state'); wet.removeAttribute('pending-value'); } });
  wet.addEventListener('mdj:inspect', () => say(`Wet / dry, slot ${s.n}: ${wet.getAttribute('value')} % wet. Use the arrow keys or drag to change it.`));

  const status = h('span', { class: `pads-slot__status label ${unavailable ? 'tone-warning' : s.engaged ? 'tone-ok' : ''}`.trim() }, [
    h('span', { class: `pads-shape pads-shape--${unavailable ? 'question' : s.engaged ? 'full' : 'ring'}`, 'aria-hidden': 'true' }), h('span', { text: statusWord }),
  ]);
  return h('li', { class: `pads-slot${s.engaged ? '' : ' pads-slot--off'}${unavailable ? ' pads-slot--unavailable' : ''}` }, [
    h('span', { class: 'pads-slot__n brass-rim', 'aria-hidden': 'true' }, [h('span', { class: 'pads-slot__nface titanium-radial numeral', text: String(s.n) })]),
    h('label', { class: 'pads-slot__pick' }, [h('span', { class: 'label', text: `Slot ${s.n}` }), sel]),
    engage,
    h('div', { class: 'pads-slot__wet' }, [wet]),
    rate,
    h('div', { class: 'pads-slot__info' }, [rateVal, status, h('span', { class: 'pads-slot__tailword label', text: tail ? 'Tail on bypass' : 'Cuts on bypass' })]),
    unavailable ? h('p', { class: 'pads-slot__why body' }, [icon('unavailable', { size: 14 }), h('span', { text: unavailable }), h('span', { text: ' Choose another effect in the selector; the slot stays bypassed.' })]) : null,
  ]);
}

function macroPanel(ctx, m, open, say) {
  const value = open ? 65 : m.value;
  const now = open ? ['59 %', '780 Hz', '26 %'] : ['44 %', '480 Hz', '16 %'];
  const dial = h('mdj-dial', { kind: 'generic', deck: 'A', value: String(value), min: '0', max: '100', unit: '%', size: open ? '64' : '48', label: 'Macro' });
  dial.addEventListener('mdj:value', (e) => { if (e.detail.phase === 'end') { dial.setAttribute('value', String(e.detail.value)); dial.removeAttribute('state'); dial.removeAttribute('pending-value'); } });
  dial.addEventListener('mdj:inspect', () => say(`Macro ${m.name}: ${dial.getAttribute('value')} %.`));
  const head = h('div', { class: 'pads-panel__head' }, [
    h('h3', { class: 'label', id: 'pads-macro-title', text: `Macro · ${m.name}` }),
    open ? null : button({ label: 'Open macro', icon: 'chevron-down', fr: ['FR-025'], cls: 'btn--secondary', attrs: { 'aria-label': 'Open macro, deck A FX' }, on: { click: () => ctx.setState('macro') } }),
  ]);
  const map = h('table', { class: 'pads-macro__map' }, [
    h('thead', {}, [h('tr', {}, ['Target', 'From', 'To', 'Now'].map((t) => h('th', { class: 'label', scope: 'col', text: t })))]),
    h('tbody', {}, m.targets.map((t, i) => h('tr', {}, [
      h('th', { scope: 'row', class: 'body', text: `${t.slot} · ${t.param}` }),
      h('td', { class: 'numeral', text: t.from }), h('td', { class: 'numeral', text: t.to }), h('td', { class: 'numeral pads-macro__now', text: now[i] }),
    ]))),
  ]);
  return h('section', { class: `pads-panel raised pads-macro${open ? ' pads-macro--open' : ''}`, 'aria-labelledby': 'pads-macro-title' }, [
    head,
    h('div', { class: 'pads-macro__body' }, [dial, open ? map : h('p', { class: 'body pads-macro__summary', text: `Moves ${m.targets.length} parameters across slots 1–3. Open to see the mapping.` })]),
    open ? h('p', { class: 'body muted pads-macro__reset', text: m.reset }) : null,
    open ? h('div', { class: 'pads-lead__row' }, [
      button({ label: 'Reset macro', icon: 'undo', fr: ['FR-025'], cls: 'btn--secondary', attrs: { 'aria-label': 'Reset macro, deck A FX' }, on: { click: () => say('Reset macro: sent. Every target returns to its slot value; no hidden wet gain remains. Not acknowledged — no engine exists in this prototype.') } }),
      button({ label: 'Close macro', icon: 'chevron-up', fr: ['FR-025'], cls: 'btn--ghost', attrs: { 'aria-label': 'Close macro, deck A FX' }, on: { click: () => ctx.setState('idle') } }),
    ]) : null,
  ].filter(Boolean));
}

function leadFor(ctx, state, fx) {
  const L = (tone, shape, eyebrow, title, body, extra = []) => h('section', { class: `pads-lead raised pads-lead--${tone}`, 'aria-labelledby': 'pads-fx-lead' }, [
    h('p', { class: 'pads-eyebrow label' }, [h('span', { class: `pads-shape pads-shape--${shape}`, 'aria-hidden': 'true' }), h('span', { text: eyebrow })]),
    h('h2', { id: 'pads-fx-lead', class: 'pads-lead__title title', text: title }),
    ...body.map((b) => h('p', { class: 'body', text: b })),
    ...extra,
  ]);
  switch (state) {
    case 'latched': return L('ok', 'full', 'Latched', 'Echo XY is latched on deck A.', ['It stays active after you lift your finger, until Bypass or a second touch.']);
    case 'momentary-held': return L('info', 'half', 'Held · momentary', 'Finger down on the XY pad.', ['Lifting releases Echo through the preset envelope (240 ms). Pointer cancel, rotation or route loss release it the same way.']);
    case 'bypassed': return L('neutral', 'ring', 'Bypassed', 'Echo is bypassed on slot 1.', ['The last XY values stay visible, dimmed. Engage brings them back.'], [h('div', { class: 'pads-lead__row' }, [button({ label: 'Tail behaviour', icon: 'info', fr: ['FR-024'], cls: 'btn--secondary', on: { click: () => ctx.setState('tails') } })])]);
    case 'tails': return L('info', 'half', 'Tail ringing', 'Bypass keeps the echo tail — documented.', ['Bypassing Echo stops new input; repeats already in the buffer fade out at the current feedback. Effects marked "Cuts on bypass" stop at once.'], [tailTable(fx), fixtureLine('Tail state is a fixture description: no audio and no tail meter exist.')]);
    case 'unavailable-effect': return L('warning', 'question', 'Unavailable', 'Effect unavailable on this device profile.', ['Bitcrush is not in the Essential DSP profile on this phone. Slot 3 stays bypassed and the rest of the chain keeps running.']);
    case 'macro': return null;
    case 'latch-armed': return null;
    default: return null;
  }
}

function tailTable(fx) {
  return h('ul', { class: 'pads-tails', role: 'list' }, fx.effects.map((e) => h('li', { class: 'pads-tails__item' }, [
    h('span', { class: `pads-shape pads-shape--${fx.tails[e] ? 'half' : 'cross'}`, 'aria-hidden': 'true' }),
    h('span', { class: 'body', text: `${e}: ${fx.tails[e] ? 'tail kept' : 'cuts'}` }),
  ])));
}
