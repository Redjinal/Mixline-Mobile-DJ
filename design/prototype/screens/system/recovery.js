// system/recovery — the recovery states of the first-mix journey (Document 19 §3 step 6; Document 06
// AE-07 route-loss table; Document 03 §5; FR-022, FR-023, FR-034, FR-037, FR-039, FR-031, FR-032).
//
// A shell screen: transport, crossfader, route chip and master stay where they always are. Each state
// says what happened, what music remains available and the actual next action. Nothing resumes audibly
// by itself: Resume is a deliberate action that is only offered once a route is verified. No engine
// exists; deck positions, the checkpoint and the recording segments are fixtures and say so.
import { register } from '../../app/registry.js';
import { load } from '../../app/fixtures.js';
import { h, button, icon, fmt } from '../../components/base.js';
import { notice, panel, kv, bullets, statusWord } from './index.js';

const SYS = await load('system');
const R = SYS.recovery;
const ID = 'system/recovery';

register({
  id: ID, family: 'system', title: 'Recovery', order: 5,
  fr: ['FR-022', 'FR-023', 'FR-034', 'FR-037', 'FR-039', 'FR-031', 'FR-032'],
  shell: true,
  dock: { portrait: true, landscape: true },
  states: {
    'route-lost': { label: 'Output lost — decks paused and muted', exercised: true, scenario: 'route-lost' },
    'route-verifying': { label: 'Device found — verifying channels', exercised: true, scenario: 'route-lost', via: { from: 'route-lost', control: 'Check the output again' } },
    'interrupted-session': { label: 'Interrupted session — restored, paused', exercised: false, scenario: 'set-ready' },
    'pointer-cancel': { label: 'Held scratch released by the system', exercised: false, scenario: 'a-playing' },
    rotation: { label: 'Rotation kept engine state', exercised: false, scenario: 'a-playing' },
    'low-storage': { label: 'Recording stopped — storage full; playback continues', exercised: false, scenario: 'low-storage' },
    'missing-next': { label: 'Next queued track missing', exercised: false, scenario: 'a-playing' },
  },
  defaultState: 'route-lost',
  render(ctx) {
    const st = ctx.state;
    const root = h('div', { class: 'system-shellpage system-recovery', dataset: { state: st } });
    const scroll = h('div', { class: 'system-scroll' });
    const live = h('div', { class: 'system-live', 'aria-live': 'polite' });
    const say = (n) => live.replaceChildren(n);
    const build = { 'route-lost': routeLost, 'route-verifying': routeVerifying, 'interrupted-session': interrupted, 'pointer-cancel': pointerCancel, rotation, 'low-storage': lowStorage, 'missing-next': missingNext }[st] || routeLost;
    const { lead, side } = build(ctx, say);
    scroll.append(h('div', { class: 'system-recovery__cols' }, [h('div', { class: 'system-stack' }, [...lead, live]), h('div', { class: 'system-stack' }, side)]));
    root.appendChild(scroll);
    return root;
  },
});

// Compact deck summaries from the scenario (acknowledged state only).
function decks(ctx, { muted = false, letters = null } = {}) {
  const s = ctx.session;
  const list = Object.values(s.decks).filter((d) => d.enabled && d.track && (!letters || letters.includes(d.letter)));
  return panel({ title: muted ? 'Decks — paused and muted' : 'Decks', ic: 'deck-focus', fixture: 'deck snapshot', children: list.map((d) => h('div', { class: 'system-recovery__deck' }, [
    h('mdj-deck-summary', { deck: d.letter, track: d.track.id, size: 'compact', position: String(d.positionSec), state: d.state }),
    muted ? h('p', { class: 'label system-recovery__muted' }, [icon('mute', { size: 12 }), h('span', { text: `Deck ${d.letter} muted · position kept` })]) : null,
  ])) });
}

function head(ic, tone, title, text) {
  return h('div', { class: `system-recovery__head system-recovery__head--${tone} ink-backing`, role: tone === 'critical' || tone === 'warning' ? 'alert' : 'status' }, [
    h('span', { class: `system-recovery__badge tone-${tone}`, 'aria-hidden': 'true' }, [icon(ic, { size: 24 })]),
    h('div', {}, [h('h1', { class: 'title system-recovery__title', text: title }), text ? h('p', { class: 'body', text }) : null]),
  ]);
}

function steps(items) {
  return h('ol', { class: 'system-steps' }, items.map(([s, t, word]) => h('li', { class: `system-steps__item is-${s}` }, [
    h('span', { class: 'system-steps__mark', 'aria-hidden': 'true' }, [icon(s === 'done' ? 'check' : s === 'current' ? 'loader' : s === 'blocked' ? 'lock' : 'minus', { size: 14 })]),
    h('span', { class: 'body', text: t }),
    h('span', { class: 'label system-steps__word', text: word }),
  ])));
}

function resumeDisabled(why) {
  return h('button', { type: 'button', class: 'btn btn--secondary', dataset: { hit: '48', fr: 'FR-022 FR-037' }, 'aria-disabled': 'true', 'aria-label': `Resume (unavailable: ${why})` }, [icon('play', { size: 16 }), h('span', { class: 'btn-label', text: 'Resume' })]);
}

function routeLost(ctx, say) {
  return {
    lead: [
      head('route-lost', 'critical', 'Output lost. Decks paused and muted.', 'Cue was not sent to the speaker. The USB interface — Quadra 4 (fixture) disappeared at 21:40; nothing was rerouted.'),
      h('div', { class: 'system-actions system-recovery__actions' }, [
        button({ label: 'Check the output again', icon: 'refresh', hit: 48, cls: 'btn--primary', fr: ['FR-023'], on: { click: () => ctx.setState('route-verifying') } }),
        button({ label: 'Choose another route', icon: 'route', hit: 48, cls: 'btn--secondary', fr: ['FR-022', 'FR-023'], on: { click: () => ctx.navigate('route/check') } }),
        resumeDisabled('no verified route yet'),
      ]),
      panel({ title: 'Get sound back', ic: 'route', children: [
        steps([
          ['current', 'Reconnect the USB interface (or another output)', 'Not detected'],
          ['todo', 'Verify its channels — a matching name alone is not enough', 'After reconnect'],
          ['blocked', 'Resume deliberately — nothing plays by itself', 'After verify'],
        ]),
      ] }),
    ],
    side: [
      decks(ctx, { muted: true }),
      panel({ title: 'Still available', ic: 'check', children: [bullets(['Library, preparation and queue editing', 'Cues, loops and the session — kept at 21:40', 'ParDay proposals (local); nothing is armed'], 'check')] }),
    ],
  };
}

function routeVerifying(ctx, say) {
  return {
    lead: [
      head('usb', 'info', 'Device found — verifying channels.', 'USB interface — Quadra 4 (fixture) reconnected. Decks stay paused and muted until the channel map is verified.'),
      h('div', { class: 'system-actions system-recovery__actions' }, [
        button({ label: 'Cancel check', icon: 'x', hit: 48, cls: 'btn--secondary', fr: ['FR-023'], on: { click: () => ctx.setState('route-lost') } }),
        button({ label: 'Choose another route', icon: 'route', hit: 48, cls: 'btn--secondary', fr: ['FR-022', 'FR-023'], on: { click: () => ctx.navigate('route/check') } }),
        resumeDisabled('channel check not confirmed yet'),
      ]),
      panel({ title: 'Get sound back', ic: 'route', children: [
        steps([
          ['done', 'USB interface reconnected', 'Found'],
          ['current', 'Verifying 4 channels: master 1–2, cue 3–4', 'SENT · waiting'],
          ['blocked', 'Resume deliberately — nothing plays by itself', 'After verify'],
        ]),
        h('p', { class: 'body muted', text: 'The engine reopens the stream off the audio thread and confirms the channel map. In this prototype no engine answers, so the check stays sent.' }),
      ] }),
    ],
    side: [decks(ctx, { muted: true })],
  };
}

function interrupted(ctx, say) {
  const c = R.checkpoint;
  const t = (id) => ctx.fixtures.track(id);
  return {
    lead: [
      head('recover', 'warning', `The app stopped. Restored from the ${c.time} checkpoint.`, `“${c.session}” was interrupted when the app process ended. Audio stopped with it; nothing autoplays now.`),
      panel({ title: 'Needs from you', ic: 'play', children: [
        h('p', { class: 'body', text: 'A deliberate Play. Decks are paused at their checkpoint positions. Check the output first if anything changed while the app was closed.' }),
        h('div', { class: 'system-actions' }, [
          button({ label: 'Open set — paused', icon: 'resume', hit: 48, cls: 'btn--primary', fr: ['FR-034', 'FR-037'], on: { click: () => ctx.navigate('perform/ab') } }),
          button({ label: 'Check output', icon: 'route', hit: 48, cls: 'btn--secondary', fr: ['FR-023'], on: { click: () => ctx.navigate('route/check') } }),
          button({ label: 'Start a new set', hit: 48, cls: 'btn--ghost', on: { click: () => ctx.navigate('launch/open') } }),
        ]),
      ] }),
    ],
    side: [
      panel({ title: `Preserved at ${c.time}`, ic: 'save', fixture: 'checkpoint', children: [kv([
        ...c.decks.map(([l, id, pos]) => [`Deck ${l}`, `${t(id)?.title || id} · paused at ${fmt.time(pos)}`]),
        ['Cues', `${c.cues} cue points and loops`],
        ['Queue', `${c.queue.length}: ${c.queue.map((id) => t(id)?.title || id).join(', ')}`],
        ['Route', 'Phone speaker — check before playing'],
      ])] }),
    ],
  };
}

function pointerCancel(ctx, say) {
  const p = R.pointerCancel;
  return {
    lead: [
      head('hand', 'info', 'Touch released safely.', `${p.cause} at ${p.time} while you held a scratch on deck ${p.deck}. The hold was released for you — no stuck hold.`),
      panel({ title: 'What happened to deck A', ic: 'slip', fixture: 'slip position', children: [kv([
        ['Scratch hold', 'Released by the system (pointer cancelled)'],
        ['Playback', `Continued from the slip position ${fmt.time(p.slipSec)}`],
        ['Jog A', 'Idle · nothing held'],
        ['Other decks', 'Unchanged'],
      ]), h('div', { class: 'system-actions' }, [
        button({ label: 'Back to Perform', icon: 'chevron-left', hit: 48, cls: 'btn--primary', fr: ['FR-039'], on: { click: () => ctx.navigate('perform/ab') } }),
      ])] }),
    ],
    side: [decks(ctx, { letters: ['A'] }), panel({ title: 'Why this can happen', ic: 'info', children: [h('p', { class: 'body', text: 'Android can take a touch for a system gesture, a call or a notification shade. A cancelled touch never leaves a deck held or scratching, and never moves a control to where your finger was.' })] })],
  };
}

function rotation(ctx, say) {
  const s = ctx.session;
  const o = ctx.orientation === 'landscape' ? 'Landscape' : 'Portrait';
  return {
    lead: [
      head('display', 'ok', `Now ${o} — nothing moved.`, 'The orientation changed and the engine state was kept. Only the layout changed; any held touch was released safely during the rotation.'),
      panel({ title: 'Engine state after rotating', ic: 'check', fixture: 'engine snapshot', children: [kv([
        ['Orientation', `${o} (current)`],
        ...Object.values(s.decks).filter((d) => d.enabled && d.track).map((d) => [`Deck ${d.letter}`, `${d.track.title} · ${d.state} at ${fmt.time(d.positionSec)}`]),
        ['Crossfader', `${Math.round(s.crossfader * 100)} % toward B — unchanged`],
        ['Focus', `${s.focus.join(' / ')} — unchanged`],
        ['Held touches', 'None'],
      ])] }),
    ],
    side: [panel({ title: 'Next', ic: 'deck-focus', children: [
      h('p', { class: 'body', text: 'Controls are where this orientation puts them; deck letters and names stay the same.' }),
      h('div', { class: 'system-actions' }, [button({ label: 'Back to Perform', icon: 'chevron-left', hit: 48, cls: 'btn--primary', fr: ['FR-039'], on: { click: () => ctx.navigate('perform/ab') } })]),
    ] })],
  };
}

function lowStorage(ctx, say) {
  const r = ctx.session.recording || {};
  return {
    lead: [
      head('storage', 'critical', 'Recording stopped: storage full. Playback continues.', `${fmt.bytes(ctx.session.storage.freeBytes)} free. The recording was finalised safely; the set keeps playing.`),
      panel({ title: 'Recording kept', ic: 'segment', fixture: 'recording segments', children: [kv([
        ['Length', `${fmt.time(r.elapsedSec || 0)} recorded`],
        ['Format', r.format || 'unknown'],
        ['Saved', `${r.recoveredSegments ?? 'unknown'} recoverable segments · ${fmt.bytes(r.bytes)}`],
        ['Status', 'Incomplete — stopped by full storage'],
      ]), h('div', { class: 'system-actions' }, [
        button({ label: 'Open recording', icon: 'rec', hit: 48, cls: 'btn--primary', fr: ['FR-031'], on: { click: () => ctx.navigate('rec/panel') } }),
        button({ label: 'Free space', icon: 'storage', hit: 48, cls: 'btn--secondary', fr: ['FR-042'], on: { click: () => ctx.navigate('system/diagnostics', { state: 'fault-storage' }) } }),
      ])] }),
    ],
    side: [decks(ctx), notice({ tone: 'info', ic: 'info', lead: 'Recording will not restart by itself.', text: 'Start a new recording from the REC panel once there is room above the 2 GB safety margin.' })],
  };
}

function missingNext(ctx, say) {
  const m = R.missingNext;
  const t = (id) => ctx.fixtures.track(id);
  const a = ctx.session.decks.A;
  const missing = t(m.track);
  return {
    lead: [
      head('missing', 'warning', `Next track missing: ${missing?.title || m.track}.`, `The file was moved or deleted. Deck A keeps playing ${a.track?.title} — ${fmt.time(a.remainingSec)} left (fixture).`),
      panel({ title: 'Pick another, or skip', ic: 'queue', children: [
        h('ul', { class: 'system-recovery__alts' }, m.alternatives.map((id) => h('li', {}, [button({
          label: `Use ${t(id)?.title || id} as next`, icon: 'queue', hit: 48, cls: 'btn--secondary system-recovery__alt', fr: ['FR-032'],
          on: { click: () => say(notice({ tone: 'ok', ic: 'check', lead: `${t(id)?.title} is next.`, text: 'The queue store confirmed the change (fixture acknowledgement). Nothing loads onto a deck until you or an armed transition does it.', role: 'status' })) },
        })]))),
        h('div', { class: 'system-actions' }, [
          button({ label: 'Pick another track', icon: 'library', hit: 48, cls: 'btn--primary', fr: ['FR-032'], on: { click: () => ctx.navigate('launch/library') } }),
          button({ label: `Skip ${missing?.title || 'missing track'}`, icon: 'chevron-right', hit: 48, cls: 'btn--secondary', fr: ['FR-032'], on: { click: () => say(notice({ tone: 'neutral', ic: 'check', lead: `${missing?.title} skipped.`, text: 'It stays in the queue history marked missing, so you can locate it later.', role: 'status' })) } }),
          button({ label: 'Locate file', icon: 'folder', hit: 48, cls: 'btn--ghost', on: { click: () => say(notice({ tone: 'info', ic: 'folder', lead: 'Locate file', text: 'Opens the Android file picker to re-link BRASS CANYON. Cues and grid are kept with the track and re-attach when found.', role: 'status' })) } }),
        ]),
      ] }),
    ],
    side: [decks(ctx, { letters: ['A'] })],
  };
}
