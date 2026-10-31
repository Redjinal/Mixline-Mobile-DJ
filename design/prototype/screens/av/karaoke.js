// av/karaoke — karaoke workspace (Document 03 §7, Document 15 §4, FR-046 / FR-030; AV-005, AV-006).
//
// A shell screen reached through the labelled workspace switcher. Composition: a "now singing" card
// (singer, song / version, key and tempo), the operator's actions, the singer queue (<mdj-singer-row>,
// local stage names, protected active row with Pause / Next singer), then the lyric presentation on the
// program picture (each line printed with its true timing kind) and the microphone routing summary.
// Landscape puts the card, lyrics and mic on the left and the actions and queue on the right.
//
// Honesty: no player, caption parser or microphone exists. Caption timing, key / tempo acknowledgements
// and the paused position are fixtures (fixtures/av.json + fixtures/av-screens.json). Word highlighting
// is printed only where the file has word timing; a line-timed file never gets invented word precision.
// Stage names and notes stay on this phone. The active song is protected: reorder / remove act on waiting
// singers only (the component disables them on the active row and says why).
//
// The screen stands in for the queue / transport in exercised states: Start next singer → active-singer;
// Pause → paused; Return to DJ → return-to-dj; Next singer → missing-captions (DJ Pocket's version has no
// timed text); Move up on a waiting singer → reorder.
import { register } from '../../app/registry.js';
import { load } from '../../app/fixtures.js';
import { h, button, icon } from '../../components/base.js';
import { avLayout, avStatus, avSection, avNote, avDeck, avEl } from './video.js';

const AV = await load('av');
const AVS = await load('av-screens');
const FR = ['FR-046'];
const Q = AV.karaoke.queue;
const byId = (id) => Q.find((q) => q.id === id);

// Prototype view state (no engine): key / tempo per singer, and the order after a reorder.
const view = { key: {}, tempo: {}, order: null, removed: null };

// Queue per state: [id, rowState] in displayed order.
const ORDER = {
  queue: [['s1', 'next'], ['s2', 'waiting'], ['s3', 'waiting'], ['s4', 'waiting'], ['s5', 'skipped']],
  'active-singer': [['s1', 'active'], ['s2', 'next'], ['s3', 'waiting'], ['s4', 'waiting'], ['s5', 'skipped']],
  reorder: [['s1', 'active'], ['s3', 'next'], ['s2', 'waiting'], ['s4', 'waiting'], ['s5', 'skipped']],
  'missing-captions': [['s2', 'active'], ['s3', 'next'], ['s4', 'waiting'], ['s5', 'skipped']],
  'line-timed-only': [['s1', 'active'], ['s2', 'next'], ['s3', 'waiting'], ['s4', 'waiting'], ['s5', 'skipped']],
  paused: [['s1', 'paused'], ['s2', 'next'], ['s3', 'waiting'], ['s4', 'waiting'], ['s5', 'skipped']],
  'return-to-dj': [['s1', 'next'], ['s2', 'waiting'], ['s3', 'waiting'], ['s4', 'waiting'], ['s5', 'skipped']],
};

const STATUS = {
  queue: ['DJ set · karaoke not started', 'neutral', 'music'],
  'active-singer': ['Now singing · Marla V.', 'info', 'mic'],
  reorder: ['Queue changed · active song kept', 'info', 'queue'],
  'missing-captions': ['No captions for this version', 'warning', 'caption'],
  'line-timed-only': ['Line-timed captions only', 'neutral', 'caption'],
  paused: ['Paused · Marla V.', 'warning', 'pause'],
  'return-to-dj': ['Back to DJ · queue kept', 'neutral', 'music'],
};

const keyText = (k) => (k === 0 ? '0' : `${k > 0 ? '+' : '−'}${Math.abs(k)}`);
const activeId = (state) => (ORDER[state] || ORDER.queue).find(([, st]) => st === 'active' || st === 'paused')?.[0] || null;

function orderFor(state) {
  if (state === 'reorder' && view.order) return view.order;
  return ORDER[state] || ORDER.queue;
}

function applyMove(ctx, id, dir) {
  const list = orderFor(ctx.state).map((x) => [...x]);
  const i = list.findIndex(([q]) => q === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  if (['active', 'paused'].includes(list[j][1]) || ['active', 'paused'].includes(list[i][1])) return; // the active song is protected
  [list[i], list[j]] = [list[j], list[i]];
  relabel(list);
  view.order = list; view.removed = null;
  ctx.setState('reorder');
}
function relabel(list) {
  // the first non-active, non-skipped row after the active one is "next"
  let nextGiven = false;
  for (const row of list) {
    if (['active', 'paused', 'skipped'].includes(row[1])) continue;
    row[1] = nextGiven ? 'waiting' : 'next'; nextGiven = true;
  }
}

function queueList(ctx) {
  const list = orderFor(ctx.state);
  const ul = h('div', { class: 'av-queue', role: 'list', 'aria-label': 'Singer queue' });
  list.forEach(([id, st], i) => {
    const q = byId(id);
    const row = h('mdj-singer-row', {
      id, singer: q.stageName, song: q.trackId, version: q.version, key: String(view.key[id] ?? q.keyShift), tempo: String(view.tempo[id] ?? q.tempo),
      position: String(i + 1), total: String(list.length), local: q.local ? true : null, note: q.note || null, state: st,
    });
    ul.appendChild(row);
  });
  ul.addEventListener('mdj:singer-move', (e) => applyMove(ctx, e.detail.id, e.detail.dir));
  ul.addEventListener('mdj:singer-remove', (e) => {
    const cur = orderFor(ctx.state).filter(([q]) => q !== e.detail.id).map((x) => [...x]);
    relabel(cur);
    view.order = cur; view.removed = e.detail.id;
    ctx.setState('reorder');
  });
  ul.addEventListener('mdj:singer-action', (e) => {
    const a = e.detail.action;
    if (a === 'pause') ctx.setState('paused');
    else if (a === 'next') ctx.setState('missing-captions');
    else if (a === 'resume') ctx.setState('active-singer');
    else if (a === 'return-to-dj') ctx.setState('return-to-dj');
    else if (a === 'return') {
      const cur = orderFor(ctx.state).map(([q, st]) => [q, q === e.detail.id ? 'waiting' : st]);
      relabel(cur); view.order = cur; view.removed = null; ctx.setState('reorder');
    }
  });
  const removedNote = ctx.state === 'reorder' && view.removed ? h('div', { class: 'av-row av-removed' }, [
    avNote(`Removed ${byId(view.removed).stageName} from the queue. The active song was not touched.`, 'trash'),
    button({ label: 'Undo remove', icon: 'undo', hit: 48, cls: 'btn--secondary', fr: FR, on: { click: () => { view.order = null; view.removed = null; ctx.setState('active-singer'); } } }),
  ]) : null;
  const sung = ctx.state === 'missing-captions' ? avNote('Marla V. finished AURORA DRIVE and left the queue (kept in this night’s history on the phone).', 'check') : null;
  return avSection(`Singer queue · ${list.length} on this phone`, [
    sung, removedNote, ul,
    h('p', { class: 'av-small muted' }, [icon('lock', { size: 11 }), h('span', { text: ' Stage names and notes stay on this phone. Reorder or remove waiting singers only; the active song is protected.' })]),
  ]);
}

// Key / tempo with a pending → acknowledged readout (the screen stands in for the engine).
function stepper(ctx, { id, kind, value, unit, min, max, step, fmt }) {
  let shown = value;
  const val = h('span', { class: 'av-stepper__value numeral', text: fmt(value) });
  const sent = h('span', { class: 'av-sent label', text: '' });
  const box = h('span', { class: 'av-stepper__readout ink-backing' }, [h('span', { class: 'label', text: kind === 'key' ? 'Key' : 'Tempo · BPM' }), val, sent]);
  const go = (d) => {
    const next = Math.min(max, Math.max(min, Math.round((shown + d) * 10) / 10));
    if (next === shown) return;
    shown = next;
    box.dataset.state = 'pending'; sent.textContent = `SENT ${fmt(next)}`;
    setTimeout(() => {
      if (!box.isConnected) return;
      (kind === 'key' ? view.key : view.tempo)[id] = next;
      val.textContent = fmt(next); sent.textContent = ''; delete box.dataset.state;
    }, AVS.karaoke.keyAckMs);
  };
  const lbl = kind === 'key' ? ['Key down one semitone', 'Key up one semitone'] : ['Tempo down 0.5 BPM', 'Tempo up 0.5 BPM'];
  return h('div', { class: 'av-stepper', role: 'group', 'aria-label': kind === 'key' ? `Key shift (${unit})` : `Tempo (${unit})` }, [
    button({ label: lbl[0], icon: 'minus', iconOnly: true, hit: 48, cls: 'btn--secondary', fr: FR, on: { click: () => go(-step) } }),
    box,
    button({ label: lbl[1], icon: 'plus', iconOnly: true, hit: 48, cls: 'btn--secondary', fr: FR, on: { click: () => go(step) } }),
  ]);
}

// The deck that holds a singer's song in the scenario (A when the song is not on a deck).
function deckOf(ctx, trackId) {
  return ['A', 'B', 'C', 'D'].find((L) => ctx.session.decks[L]?.enabled && ctx.session.decks[L]?.track?.id === trackId) || 'A';
}

function nowCard(ctx, id, state) {
  const q = byId(id);
  const L = deckOf(ctx, q.trackId);
  const t = ctx.fixtures.track(q.trackId);
  const key = view.key[id] ?? q.keyShift;
  const tempo = view.tempo[id] ?? q.tempo;
  const word = state === 'paused' ? 'Paused' : 'Now singing';
  return h('div', { class: `av-now raised av-now--${state}` }, [
    h('div', { class: 'av-now__who' }, [
      h('span', { class: 'av-now__word label' }, [icon(state === 'paused' ? 'pause' : 'mic', { size: 12 }), h('span', { text: word })]),
      h('span', { class: 'av-now__name title wrap-2', text: q.stageName }),
      h('span', { class: 'av-now__local label' }, [icon('lock', { size: 10 }), h('span', { text: 'Local' })]),
    ]),
    h('div', { class: `av-now__song deck-${L.toLowerCase()}` }, [avDeck(L), h('span', { class: 'av-now__title truncate', text: t?.title || q.trackId }), h('span', { class: 'av-now__version label', text: `${q.version} · deck ${L}` })]),
    h('div', { class: 'av-now__steppers' }, [
      stepper(ctx, { id, kind: 'key', value: key, unit: 'semitones', min: -6, max: 6, step: 1, fmt: keyText }),
      stepper(ctx, { id, kind: 'tempo', value: tempo, unit: 'BPM', min: tempo - 8, max: tempo + 8, step: 0.5, fmt: (v) => v.toFixed(1) }),
    ]),
    h('p', { class: 'av-small muted', text: 'Key shift keeps the tempo; tempo follows the deck. The picture and lyrics follow the same media clock.' }),
  ]);
}

function program(ctx, id, { caption = true } = {}) {
  const q = id ? byId(id) : null;
  const lines = AV.karaoke.captions.lines;
  const attrs = { kind: 'program', deck: q ? deckOf(ctx, q.trackId) : 'A', track: q ? q.trackId : 'aurora', mode: 'follow', state: 'playing' };
  if (caption && q && q.trackId === AV.karaoke.captions.trackId) attrs.caption = lines.find((l) => l.active)?.text;
  return h('mdj-video-frame', attrs);
}

function lyrics(ctx, mode, actId) {
  const c = AV.karaoke.captions;
  const pic = program(ctx, actId, { caption: mode !== 'missing' });
  if (mode === 'missing') {
    const q = byId(AVS.karaoke.missingCaptions.singer);
    return avSection('Lyrics on the program output', [
      pic,
      avEl('mdj-caption-line', { state: 'missing', lang: 'en', visibility: 'both', offset: '0' }),
      avNote(AVS.karaoke.missingCaptions.note, 'caption', 'warning'),
      h('div', { class: 'av-row' }, [
        button({ label: 'Attach a timed-text file', icon: 'import', hit: 48, cls: 'btn--secondary', fr: FR, on: { click: () => ctx.navigate('prep/track') } }),
        h('span', { class: 'av-small muted', text: `${q.stageName} can sing from their own lyrics; the program shows the video only.` }),
      ]),
    ], { tone: 'warning' });
  }
  const lineOnly = mode === 'line-only';
  const rows = c.lines.map((l) => {
    const st = l.timing === 'missing' ? 'missing' : l.lateMs ? 'late' : (l.timing === 'word' && !lineOnly ? 'word-timed' : 'line-timed');
    const attrs = { text: l.text || '', state: st, lang: c.language, offset: String(c.offsetMs), visibility: 'both', active: l.active ? true : null };
    if (st === 'word-timed') { attrs.words = JSON.stringify(l.words); attrs.word = String(l.wordIndex); }
    if (st === 'late') attrs.late = String(l.lateMs);
    return avEl('mdj-caption-line', attrs);
  });
  const head = lineOnly
    ? avNote('This file is line-timed: whole lines highlight together. Word highlighting needs word-level timing and is not invented from a line-timed file.', 'caption')
    : avNote(`${c.format}: mostly line-timed; one cue carries word timing, so only that line highlights word by word.`, 'caption');
  const wordToggle = h('button', {
    type: 'button', class: 'btn btn--secondary', dataset: { hit: '48', fr: 'FR-046' }, 'aria-pressed': 'false',
    'aria-label': lineOnly ? 'Word highlighting (unavailable: the file has no word timing)' : 'Word highlighting, where the file has word timing', 'aria-disabled': lineOnly ? 'true' : undefined,
  }, [icon('caption', { size: 20 }), h('span', { class: 'btn-label', text: lineOnly ? 'Word highlight · not in this file' : 'Word highlight · where timed' })]);
  return avSection('Lyrics on the program output', [
    pic,
    head,
    h('div', { class: 'av-lyrics av-fixture-box' }, [...rows, h('mdj-fixture-mark', { for: 'caption timing' })]),
    h('div', { class: 'av-row' }, [
      wordToggle,
      button({ label: 'Caption offset and visibility', icon: 'video', hit: 48, cls: 'btn--secondary', fr: ['FR-045', 'FR-046'], on: { click: () => ctx.navigate('av/video') } }),
    ]),
  ]);
}

function micSummary(ctx, state) {
  const inp = AV.mic.inputs.find((i) => i.id === AVS.mic.armedInput) || AV.mic.inputs[0];
  const live = ['active-singer', 'reorder', 'missing-captions', 'line-timed-only'].includes(state);
  const text = state === 'queue' ? 'Off until a singer starts. Enabling it is your action in Mic.'
    : state === 'paused' ? 'Unchanged while paused — mute it in Mic if the singer steps away.'
      : state === 'return-to-dj' ? 'Unchanged on return to DJ — mute or disable it in Mic.'
        : 'Live · sends to Master and Recording · Broadcast off';
  return avSection('Microphone routing', [
    h('div', { class: 'av-micsum' }, [
      h('span', { class: `av-micsum__icon${live ? ' av-micsum__icon--live' : ''}` }, [icon('mic', { size: 18 })]),
      h('span', { class: 'av-micsum__text' }, [h('span', { class: 'title truncate', text: inp.name }), h('span', { class: 'body muted', text })]),
    ]),
    h('p', { class: 'av-small muted', text: 'The karaoke mic is never sent to ParDay. Microphone permission is separate from where the mic is sent.' }),
    button({ label: 'Open Mic', icon: 'mic', hit: 48, cls: 'btn--secondary', fr: ['FR-030'], on: { click: () => ctx.navigate('av/mic', { state: live ? 'live' : 'off' }) } }),
  ]);
}

function render(ctx) {
  const state = ctx.state in ORDER ? ctx.state : 'queue';
  const [word, tone, ic] = STATUS[state];
  const act = activeId(state);
  let lead, hero, actions = [], main = [], aside = [];
  switch (state) {
    case 'queue': {
      const q = byId('s1');
      lead = 'Your DJ set is playing. The queue is ready; the first singer starts only when you start them.';
      hero = [h('div', { class: 'av-now raised' }, [
        h('span', { class: 'av-now__word label' }, [icon('arrow-up', { size: 12 }), h('span', { text: 'Up next' })]),
        h('span', { class: 'av-now__name title wrap-2', text: q.stageName }),
        h('div', { class: 'av-now__song deck-a' }, [avDeck('A'), h('span', { class: 'av-now__title truncate', text: ctx.fixtures.track(q.trackId)?.title }), h('span', { class: 'av-now__version label', text: `${q.version} · key ${keyText(q.keyShift)}` })]),
      ])];
      actions = [button({ label: 'Start next singer', icon: 'mic', hit: 56, cls: 'btn--primary av-cta', fr: FR, on: { click: () => ctx.setState('active-singer') } })];
      main = [queueList(ctx)];
      aside = [avSection('Program output', [program(ctx, null, { caption: false }), h('p', { class: 'av-small muted', text: 'Your DJ set’s picture. Lyrics appear only when a singer’s song with timed text starts.' })]), micSummary(ctx, state)];
      break;
    }
    case 'paused': {
      lead = AVS.karaoke.returnToDj.note.replace(' The queue is kept on this phone.', '') + ' Resume continues from the same point; nothing is skipped.';
      hero = [h('div', { class: 'av-paused titanium av-fixture-box' }, [
        h('div', { class: 'av-paused__face' }, [h('span', { class: 'av-paused__num numeral', text: AVS.karaoke.returnToDj.pausedAt }), avStatus('Paused', 'warning', 'pause')]),
        h('mdj-fixture-mark', { for: 'paused position' }),
      ]), nowCard(ctx, act, 'paused')];
      actions = [];
      main = [h('p', { class: 'av-small muted', text: 'Resume and Return to DJ are on Marla V.’s row in the queue.' }), queueList(ctx)];
      aside = [lyrics(ctx, 'mixed', act), micSummary(ctx, state)];
      break;
    }
    case 'return-to-dj': {
      lead = 'Karaoke is paused and the DJ set has the floor. Deck A holds Marla V.’s song; deck B is ready — press Play on B in the dock when you want it.';
      hero = [h('div', { class: 'av-now raised' }, [
        h('span', { class: 'av-now__word label' }, [icon('music', { size: 12 }), h('span', { text: 'DJ set' })]),
        h('span', { class: 'av-now__name title', text: 'Back to the DJ set' }),
        h('p', { class: 'body av-fixture-box' }, [AVS.karaoke.returnToDj.note, h('mdj-fixture-mark', { for: 'paused position', inline: true })]),
      ])];
      actions = [button({ label: 'Resume karaoke', icon: 'mic', hit: 56, cls: 'btn--primary av-cta', fr: FR, on: { click: () => ctx.setState('paused') } })];
      main = [queueList(ctx)];
      aside = [micSummary(ctx, state)];
      break;
    }
    default: {
      const missing = state === 'missing-captions';
      lead = missing ? 'DJ Pocket is singing COPPER SKY (instrumental). This version has no timed text, so no lyric line is shown or invented.'
        : state === 'line-timed-only' ? 'Marla V.’s file is line-timed. Lines highlight whole; there is no word-by-word highlight for this song.'
          : state === 'reorder' ? 'You changed the waiting order. Marla V.’s song keeps playing; only waiting singers moved.'
            : 'Marla V. is singing. Lyrics follow the song’s own clock; pause, next singer and return to DJ are always one tap away.';
      hero = [nowCard(ctx, act, 'active')];
      actions = [button({ label: 'Return to DJ', icon: 'music', hit: 48, cls: 'btn--secondary', fr: FR, on: { click: () => ctx.setState('return-to-dj') } })];
      main = [
        h('p', { class: 'av-small muted', text: 'Pause and Next singer are on the active row in the queue.' }),
        queueList(ctx),
      ];
      aside = [lyrics(ctx, missing ? 'missing' : state === 'line-timed-only' ? 'line-only' : 'mixed', act), micSummary(ctx, state)];
    }
  }
  return avLayout(ctx, { screen: 'karaoke', current: 'karaoke', title: 'Karaoke', status: avStatus(word, tone, ic), lead, hero, actions, main, aside });
}

register({
  id: 'av/karaoke',
  family: 'av',
  title: 'Karaoke',
  order: 2,
  fr: ['FR-046', 'FR-030', 'FR-045'],
  shell: true,
  dock: { portrait: true, landscape: true },
  states: {
    queue: { label: 'Singer queue — DJ set playing', exercised: true, scenario: 'a-playing' },
    'active-singer': { label: 'Active singer with lyrics, key and tempo', exercised: true, scenario: 'a-playing', via: { from: 'queue', control: 'Start next singer' } },
    reorder: { label: 'Reorder waiting singers — active row protected', exercised: true, scenario: 'a-playing', via: { from: 'active-singer', control: 'Move up, Theo & Ines' } },
    'missing-captions': { label: 'Next singer — no captions for this version', exercised: true, scenario: 'a-playing', via: { from: 'active-singer', control: 'Next singer' } },
    'line-timed-only': { label: 'Line-timed captions only — no invented word timing', exercised: false, scenario: 'a-playing' },
    paused: { label: 'Paused singer', exercised: true, scenario: 'set-ready', via: { from: 'active-singer', control: 'Pause' } },
    'return-to-dj': { label: 'Return to DJ — queue kept', exercised: true, scenario: 'set-ready', via: { from: 'active-singer', control: 'Return to DJ' } },
  },
  defaultState: 'queue',
  render,
});
