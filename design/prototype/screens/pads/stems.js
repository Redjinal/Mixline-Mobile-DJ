// pads/stems — prepared stems per deck with readiness (Document 06 AE-06: unavailable / preparing /
// ready / failed, full-mix fallback keeps the source and cue metadata, separation artefacts are not
// studio stems; FR-028 prepared stems, FR-029 live separation conditional on source permission, model
// licence and measured device capacity, FR-036 source capability gates stems).
//
// Composition: workspace row, a lead that names the state and the next action in words, then one
// <mdj-stem-strip> per deck of the focused pair (portrait: stacked, the deck the state is about first;
// landscape: side by side, each column scrolls). Each strip carries its own readiness line, progress
// (FIXTURE) and Cancel / Retry / Prepare action. The full-mix-fallback state adds the deck's stem pad
// bank in the unavailable state so the effect on pads is visible too.
//
// No engine and no separation model exist. The screen stands in for the engine: Mute vocals (ready) →
// vocals-muted, Unmute → ready, Cancel (preparing) → full-mix-fallback (job stopped, full mix kept).
// Retry and Prepare print SENT and stay unacknowledged. Readiness, progress and gains are fixtures.
import { register } from '../../app/registry.js';
import { h, button, icon } from '../../components/base.js';
import { padsNav, statusNote, fixtureLine, padsData, withTrack } from './pads.js';

register({
  id: 'pads/stems', family: 'pads', title: 'Stems', order: 4,
  fr: ['FR-028', 'FR-029', 'FR-036'],
  shell: true,
  dock: { portrait: true, landscape: true },
  states: {
    ready: { label: 'Ready — AURORA DRIVE prepared stems (deck A)', exercised: true, scenario: 'a-playing', via: { from: 'vocals-muted', control: 'Mute vocals, deck A' } },
    'vocals-muted': { label: 'Vocals muted on deck A', exercised: true, scenario: 'a-playing', via: { from: 'ready', control: 'Mute vocals, deck A' } },
    preparing: { label: 'Preparing — GLASSWORK, fixture progress, Cancel', exercised: false, scenario: 'a-playing' },
    'unavailable-source-restricted': { label: 'Source does not permit separation — SODA LIGHTS', exercised: false, scenario: 'a-playing' },
    'live-refused-capacity': { label: 'Live separation refused: device capacity; prepared stems still work', exercised: false, scenario: 'hot' },
    failed: { label: 'Preparation failed — integrity check, Retry', exercised: false, scenario: 'a-playing' },
    'full-mix-fallback': { label: 'Full-mix fallback — preparation cancelled, original mix plays', exercised: true, scenario: 'a-playing', via: { from: 'preparing', control: 'Cancel stem preparation, deck B' } },
  },
  defaultState: 'ready',
  render(ctx) {
    const state = ctx.state;
    const land = ctx.orientation === 'landscape';
    const stems = padsData().stems;
    const { note, say } = statusNote();

    // World per state: deck B carries the track the state is about (fresh session object per render).
    if (state === 'preparing' || state === 'full-mix-fallback') withTrack(ctx, 'B', 'glasswork');
    if (state === 'unavailable-source-restricted') withTrack(ctx, 'B', 'soda-radio');
    if (state === 'failed') withTrack(ctx, 'B', 'calypso', { positionSec: 56.5 });
    const A = ctx.session.decks.A, B = ctx.session.decks.B;

    const stripFor = (deck) => {
      const L = deck.letter;
      const t = deck.track;
      const rec = (t && stems[t.id]) || { state: 'unavailable' };
      let st = rec.state;
      let reason = rec.reason || '';
      let list = rec.stems ? rec.stems.map((s) => ({ ...s })) : null;
      let progress = rec.progress;
      if (state === 'live-refused-capacity' && L === 'B') { st = 'live-denied'; reason = 'thermal headroom too low; prepared stems still work'; }
      if (state === 'full-mix-fallback' && L === 'B') { st = 'unavailable'; progress = null; }
      if (state === 'vocals-muted' && L === 'A' && list) list = list.map((s) => (s.id === 'vocals' ? { ...s, mute: true } : s));
      const strip = h('mdj-stem-strip', {
        deck: L, track: t ? t.title : '', model: rec.model || 'v2', state: st,
        reason: reason || null, stems: list ? JSON.stringify(list) : null, progress: st === 'preparing' && progress != null ? String(progress) : null,
      });
      strip.addEventListener('mdj:stem-toggle', (e) => {
        const { stem, kind, value } = e.detail;
        if (L === 'A' && stem === 'vocals' && kind === 'mute') {
          if (value && state === 'ready') return ctx.setState('vocals-muted');
          if (!value && state === 'vocals-muted') return ctx.setState('ready');
        }
        // acknowledged locally: the screen stands in for the engine for mute / solo
        const cur = JSON.parse(strip.getAttribute('stems') || '[]');
        const next = ['vocals', 'drums', 'bass', 'other'].map((id) => ({ id, gain: 0, ...(cur.find((x) => x.id === id) || {}) }));
        next.find((x) => x.id === stem)[kind] = value;
        strip.setAttribute('stems', JSON.stringify(next));
        say(`${kind === 'mute' ? 'Mute' : 'Solo'} ${stem}, deck ${L}: ${value ? 'on' : 'off'} (acknowledged by the prototype standing in for the engine).`);
      });
      strip.addEventListener('mdj:stem-gain', (e) => {
        const cur = JSON.parse(strip.getAttribute('stems') || '[]');
        const next = ['vocals', 'drums', 'bass', 'other'].map((id) => ({ id, gain: 0, ...(cur.find((x) => x.id === id) || {}) }));
        next.find((x) => x.id === e.detail.stem).gain = Math.max(-24, Math.min(6, e.detail.gain));
        strip.setAttribute('stems', JSON.stringify(next));
      });
      strip.addEventListener('mdj:stem-action', (e) => {
        const a = e.detail.action;
        if (a === 'cancel' && state === 'preparing') return ctx.setState('full-mix-fallback');
        if (a === 'retry') return say(`Retry stem preparation for ${t.title}: queued. Not acknowledged — no separation job runs in this prototype; the full mix keeps playing.`);
        if (a === 'prepare') return say(`Prepare stems for ${t ? t.title : 'this track'}: queued behind current work. Progress will read "unknown" until the job reports work units. Not acknowledged — no separation job runs in this prototype.`);
      });
      const col = h('section', { class: `pads-stemcol deck-${L.toLowerCase()}`, 'aria-label': `Stems, deck ${L}` }, [strip]);
      if (st === 'preparing' && rec.progressNote) col.appendChild(fixtureLine(rec.progressNote));
      if (state === 'full-mix-fallback' && L === 'B') col.appendChild(fallbackPads(ctx, deck));
      return col;
    };

    const lead = leadFor(ctx, state, A, B);
    const order = ['ready', 'vocals-muted'].includes(state) ? [A, B] : [B, A];
    const root = h('div', { class: `pads-screen pads-stems pads-stems--${land ? 'landscape' : 'portrait'}`, dataset: { state } });
    if (land) {
      root.append(padsNav(ctx, 'pads/stems'), h('div', { class: 'pads-stems__cols' }, [
        h('div', { class: 'pads-stems__col pads-stems__col--lead' }, [lead, note]),
        ...order.map((d) => h('div', { class: 'pads-stems__col' }, [stripFor(d)])),
      ]));
    } else {
      root.append(padsNav(ctx, 'pads/stems'), lead, note, ...order.map(stripFor));
    }
    return root;
  },
});

function fallbackPads(ctx, deck) {
  const bank = h('mdj-pad-bank', { deck: deck.letter, mode: 'stem', bank: '1', layout: '2x4', unavailable: 'No stems' });
  bank.addEventListener('mdj:pad-mode', () => ctx.navigate('pads/pads'));
  return h('div', { class: 'pads-panel raised pads-fallbackpads' }, [
    h('h3', { class: 'label', text: `Stem pads · deck ${deck.letter}` }),
    h('p', { class: 'body', text: 'Stem pads say "No stems" and do nothing; hot cues and loops keep working on the full mix.' }),
    bank,
  ]);
}

function leadFor(ctx, state, A, B) {
  const L = (tone, shape, eyebrow, title, body, extra = []) => h('section', { class: `pads-lead raised pads-lead--${tone}`, 'aria-labelledby': 'pads-stems-lead' }, [
    h('p', { class: 'pads-eyebrow label' }, [h('span', { class: `pads-shape pads-shape--${shape}`, 'aria-hidden': 'true' }), h('span', { text: eyebrow })]),
    h('h2', { id: 'pads-stems-lead', class: 'pads-lead__title title', text: title }),
    ...body.map((b) => h('p', { class: 'body', text: b })),
    ...extra,
  ]);
  const b = B.track ? B.track.title : 'deck B';
  switch (state) {
    case 'vocals-muted': return L('ok', 'half', 'Vocals muted', `Deck A plays ${A.track.title} without vocals.`, ['Drums, bass and other keep playing from the prepared stem set. Unmute brings the vocals back.']);
    case 'preparing': return L('info', 'ring', 'Preparing', `Separating stems for ${b} on deck B.`, ['The full mix plays unchanged while the job runs. Stem controls on deck B wake up only after the set passes its integrity check. Cancel keeps the full mix.'], [h('div', { class: 'pads-lead__row' }, [button({ label: 'Cancel preparation', icon: 'x', fr: ['FR-028'], cls: 'btn--secondary', attrs: { 'aria-label': 'Cancel stem preparation, deck B' }, on: { click: () => ctx.setState('full-mix-fallback') } })])]);
    case 'failed': return L('critical', 'cross', 'Failed', `Stem preparation failed for ${b}.`, ['The stem set did not pass its integrity check, so it is not used. Deck B plays the full mix and keeps its cue points. Retry runs the preparation again.']);
    case 'unavailable-source-restricted': return L('warning', 'question', 'Restricted', 'Source does not permit separation.', [`${b} comes from a source whose terms do not allow stem separation. Deck B plays the full mix; stem controls stay off. This is enforced below the UI, not just hidden here.`]);
    case 'live-refused-capacity': return L('warning', 'half', 'Live refused', 'Live separation refused: device capacity; prepared stems still work.', ['The phone is hot, so live separation on deck B (COPPER SKY) was refused before it started. Deck A keeps its prepared stems. Already playing full-mix audio is not interrupted.', 'Prepare stems for COPPER SKY ahead of time, or let the phone cool and try again.']);
    case 'full-mix-fallback': return L('neutral', 'full', 'Full mix', `Preparation cancelled — deck B plays the full mix of ${b}.`, ['The original source, cue points and loops are untouched. Prepare stems later from here or from track preparation.']);
    default: return L('ok', 'full', 'Ready', `Prepared stems ready on deck A: ${A.track.title}.`, [`Mute, solo and gain act on aligned vocals, drums, bass and other. Deck B (${b}) has no stem set yet: Prepare stems runs ahead of time, not live.`]);
  }
}
