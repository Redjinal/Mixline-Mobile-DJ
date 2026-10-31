// sampler/banks — the sampler's sixteen slots over two banks (Document 03 §2 "Pads, loops and sampler":
// empty slot, edit mode, playing loop, missing sample, stop samples; Document 06 AE-06 "The sampler is
// separate from the four music decks … one-shot/loop/gate modes, quantized trigger, velocity/level
// behaviour, choke groups and voice-stealing order … Rights and provenance travel with sample packs";
// FR-027). Shell screen, dock on in both orientations: the decks' Play / Cue, crossfader, route and master
// stay reachable — a slot tap never changes deck focus.
//
// Composition: a lead that names what the sampler is doing in plain words (brass index bar), the
// <mdj-sample-bank> (eight 56 dp slots of the selected bank, bank tabs, choke legend, voice count), a rail
// with the 56 dp "Stop all samples" (immediate) and Edit, the bank's slot list in words (trigger mode, choke
// group, level — so nothing is colour or icon alone), the proposed voice-stealing order and the sample-pack
// rights note. Landscape: bank left, rail + words right, each column scrolls on its own above the dock.
//
// Honesty: no engine and no sample files exist. "Playing" and "Choked" are acknowledged FIXTURE states the
// screen stands in for (a slot tap moves to the acknowledged state; the voice count carries the bank's
// FIXTURE mark). Levels are user settings, not meters. Assignments are saved to the bank only as a fixture
// acknowledgement. The empty slot's own button is inert in <mdj-sample-slot> (aria-disabled), so each empty
// slot also gets a labelled "Assign slot N" button next to the bank.
//
// States (scenario a-playing: Deck A audible, so "the sampler never interrupts a music deck" is visible)
//   bank-a        Bank 1 (slots 1–8) loaded, nothing sounding
//   bank-b        Bank 2 (slots 9–16), four empty slots
//   empty-slot    Slot 12 tapped → Assign sheet (pack samples, import from Files)
//   playing       Kick + Horn one-shots sounding, Riser loop sounding (3 of 8 voices)
//   choked        Clap (choke group 1) stopped Kick; voice-stealing order shown
//   missing-sample  Slot 8 "Crash" file missing — slot kept, Locate / Replace / Clear
//   edit          Explicit edit mode: slot 5 selected; rename, trigger mode, choke group, level
import { register } from '../../app/registry.js';
import { load } from '../../app/fixtures.js';
import { h, button, icon } from '../../components/base.js';

const data = await load('sampler'); // fixtures/sampler.json (main.js awaits screen modules)

const FR = ['FR-027'];
const TRIG_WORD = { 'one-shot': 'One-shot', loop: 'Loop', gate: 'Gate — hold' };

const STATES = {
  'bank-a': { label: 'Bank 1 — slots 1–8, nothing sounding', exercised: true, scenario: 'a-playing', via: { from: 'bank-b', control: 'Bank 1, slots 1 to 8' } },
  'bank-b': { label: 'Bank 2 — slots 9–16, four empty', exercised: true, scenario: 'a-playing', via: { from: 'bank-a', control: 'Bank 2, slots 9 to 16' } },
  'empty-slot': { label: 'Empty slot 12 — assign sheet', exercised: true, scenario: 'a-playing', via: { from: 'bank-b', control: 'Assign slot 12' } },
  playing: { label: 'Two one-shots and one loop sounding', exercised: true, scenario: 'a-playing', via: { from: 'bank-a', control: "Sample 1 'Kick', bank 1, one-shot, choke group 1, level 90 %, loaded" } },
  choked: { label: 'Choke group stopped a voice', exercised: true, scenario: 'a-playing', via: { from: 'playing', control: "Sample 2 'Clap', bank 1, one-shot, choke group 1, level 80 %, loaded" } },
  'missing-sample': { label: 'Sample file missing — slot kept', exercised: false, scenario: 'a-playing' },
  edit: { label: 'Edit — assign, rename, trigger mode, choke', exercised: true, scenario: 'a-playing', via: { from: 'bank-a', control: 'Edit' } },
};

// Per-state world: which bank is shown and which slots differ from the saved bank.
const SETUP = {
  'bank-a': { bank: 1, slots: {} },
  'bank-b': { bank: 2, slots: {} },
  'empty-slot': { bank: 2, slots: {}, sheet: 12 },
  playing: { bank: 1, slots: { 1: 'playing', 4: 'playing', 7: 'playing' } },
  choked: { bank: 1, slots: { 1: 'choked', 2: 'playing', 4: 'playing', 7: 'playing' } },
  'missing-sample': { bank: 1, slots: { 8: { state: 'missing', reason: 'File moved' } } },
  edit: { bank: 1, slots: {}, selected: 5 },
};

register({
  id: 'sampler/banks',
  family: 'sampler',
  title: 'Sampler — banks',
  order: 1,
  fr: FR,
  shell: true,
  dock: { portrait: true, landscape: true },
  states: STATES,
  defaultState: 'bank-a',
  render(ctx) {
    const root = h('div', { class: `sampler-banks sampler-banks--${ctx.state} sampler-banks--${ctx.orientation}`, dataset: { state: ctx.state } });
    mount(ctx, root);
    return root;
  },
});

function mount(ctx, root) {
  const state = ctx.state;
  const setup = SETUP[state] || SETUP['bank-a'];
  const landscape = ctx.orientation === 'landscape';
  const deckA = ctx.session.decks.A;
  const slots = data.slots.map((sl) => {
    const over = setup.slots[sl.n];
    return { ...sl, ...(typeof over === 'string' ? { state: over } : over || {}) };
  });
  const view = { bank: setup.bank, selected: setup.selected || 0, sheet: setup.sheet || 0, confirmClear: 0 };
  const edit = state === 'edit';
  const draft = edit ? { ...slots[view.selected - 1] } : null;

  const live = h('p', { class: 'sampler-note body', role: 'status', 'aria-live': 'polite' });
  const say = (text, tone = 'info') => { live.textContent = text; live.hidden = !text; live.dataset.tone = tone; };
  say('');

  const voices = () => slots.filter((sl) => sl.state === 'playing').length;

  // ---------------------------------------------------------------- lead
  const lead = buildLead();
  function buildLead() {
    const playingNames = () => slots.filter((sl) => sl.state === 'playing').map((sl) => `${sl.n} ${sl.name}`);
    const copy = {
      'bank-a': { eyebrow: 'Ready · nothing sounding', shape: 'ring', title: 'Bank 1 — eight slots loaded, nothing sounding.', body: ['Tap a slot to trigger it: one-shots play once, loops toggle, gates play while held. A tap never changes deck focus.'] },
      'bank-b': { eyebrow: 'Ready · 4 empty slots', shape: 'ring', title: 'Bank 2 — slots 9–16. Four slots are empty.', body: ['Tap an empty slot, or use Assign slot below the bank, to choose a sample from the pack or import one from Files.'] },
      'empty-slot': { eyebrow: 'Assign · slot 12', shape: 'ring', title: 'Slot 12 is empty — choose a sample for it.', body: ['Pick a sample from Harbour Kit 01 or import a file. The slot starts as a one-shot with no choke group; change both in Edit.'] },
      playing: { eyebrow: 'Sounding · 3 of 8 voices', shape: 'full', title: 'Kick and Horn one-shots sounding; Riser loop on.', body: [`Acknowledged voices (fixture): ${playingNames().join(', ')}. Tap the Riser loop again to stop it, or Stop all samples to stop every voice at once.`] },
      choked: { eyebrow: 'Choked · group 1 Drums', shape: 'half', title: 'Clap stopped Kick — they share choke group 1.', body: ['Only one voice of a choke group sounds at a time: the new Clap trigger stopped the sounding Kick (engine order, not a timer). Horn and Riser are in other groups and keep sounding.'] },
      'missing-sample': { eyebrow: 'Missing · slot 8', shape: 'question', title: 'Sample file missing — slot kept.', body: ['Slot 8 "Crash" points to crash_wide.wav, which was moved or deleted. Its name, trigger mode, level and place in patterns are kept; it cannot sound until the file is found or replaced.'] },
      edit: { eyebrow: 'Edit · bank 1', shape: 'dotted', title: 'Edit mode — slots do not trigger.', body: ['Tap a slot to select it, then rename it, set its trigger mode, choke group and level. Assign and Clear are in the bar below the bank. Done returns to playing slots.'] },
    }[state];
    return h('section', { class: `sampler-lead raised sampler-lead--${state}`, 'aria-labelledby': 'sampler-banks-lead' }, [
      h('p', { class: 'sampler-eyebrow label' }, [h('span', { class: `sampler-shape sampler-shape--${copy.shape}`, 'aria-hidden': 'true' }), h('span', { text: copy.eyebrow })]),
      h('h2', { id: 'sampler-banks-lead', class: 'sampler-lead__title title', text: copy.title }),
      ...copy.body.map((t) => h('p', { class: 'sampler-lead__body body', text: t })),
      state === 'missing-sample' ? missingActions() : null,
    ]);
  }

  // Rewrite the lead after a local, fixture-acknowledged change so it never contradicts the bank.
  function relead(eyebrow, title, body) {
    lead.querySelector('.sampler-eyebrow span:last-child').textContent = eyebrow;
    lead.querySelector('.sampler-lead__title').textContent = title;
    lead.querySelectorAll('.sampler-lead__body, .sampler-actions').forEach((n, i) => { if (i === 0 && n.classList.contains('sampler-lead__body')) n.textContent = body; else n.remove(); });
  }

  function missingActions() {
    return h('div', { class: 'sampler-actions', role: 'group', 'aria-label': 'Fix slot 8' }, [
      button({ label: 'Locate crash_wide.wav', icon: 'search', cls: 'btn--primary', fr: FR, on: { click: () => say('Files opened to locate crash_wide.wav (fixture: no file picker in this prototype). The slot stays missing until a file is chosen and checked.') } }),
      button({ label: 'Replace sample in slot 8', icon: 'import', cls: 'btn--secondary', fr: FR, on: { click: () => { view.sheet = 8; paintOverlay(); } } }),
      button({ label: 'Clear slot 8', icon: 'trash', cls: 'btn--danger', fr: FR, on: { click: () => { view.confirmClear = 8; paintOverlay(); } } }),
    ]);
  }

  // ---------------------------------------------------------------- bank
  const bankEl = h('mdj-sample-bank', { layout: '2x4', size: '56', quantized: '1 beat', 'max-voices': String(data.maxVoices), state: edit ? 'edit' : 'normal' });
  const bankWrap = h('section', { class: 'sampler-bank raised', 'aria-label': 'Sampler bank' }, [bankEl]);
  const emptyRow = h('div', { class: 'sampler-empties' });
  bankWrap.appendChild(emptyRow);

  function paintBank() {
    bankEl.setAttribute('bank', String(view.bank));
    bankEl.setAttribute('voices', String(voices()));
    bankEl.setAttribute('slots-json', JSON.stringify(slots.map(({ n, name, trigger, choke, level, state: st, reason }) => ({ n, name, trigger, choke, level, state: st, reason }))));
    if (edit && view.selected) bankEl.setAttribute('selected', String(view.selected)); else bankEl.removeAttribute('selected');
    const first = (view.bank - 1) * 8 + 1;
    const empties = slots.slice(first - 1, first + 7).filter((sl) => sl.state === 'empty');
    emptyRow.replaceChildren(...(empties.length ? [
      h('span', { class: 'label sampler-empties__label', text: `Empty in bank ${view.bank}` }),
      ...empties.map((sl) => button({ label: `Assign slot ${sl.n}`, icon: 'plus', cls: 'btn--secondary', fr: FR, on: { click: () => openAssign(sl.n) } })),
    ] : []));
    emptyRow.hidden = !empties.length;
  }

  // ---------------------------------------------------------------- rail: Stop all + Edit
  const stopAll = h('button', {
    type: 'button', class: 'btn btn--danger sampler-stopall', dataset: { hit: '56', fr: FR.join(' ') }, 'aria-label': 'Stop all samples now',
    on: { click: () => {
      const n = voices() + slots.filter((sl) => sl.state === 'choked').length;
      if (!voices()) { say('Nothing is sounding. Stop all samples stops every sampler voice at once; music decks are not affected.'); return; }
      slots.forEach((sl) => { if (sl.state === 'playing' || sl.state === 'choked') sl.state = 'loaded'; });
      paintBank(); paintList();
      say(`Stop all acknowledged (fixture): ${n === 1 ? 'one sampler voice' : `${n} sampler voices`} stopped immediately. Deck audio was not touched.`);
    } },
  }, [icon('stop', { size: 22 }), h('span', { class: 'btn-label', text: 'Stop all samples' }), h('span', { class: 'sampler-stopall__sub', text: 'immediate' })]);
  const editBtn = edit ? null : button({ label: 'Edit', icon: 'edit', cls: 'btn--secondary', fr: FR, on: { click: () => ctx.setState('edit') } });
  // Portrait: the rail sits below the scroll area (outside it), so Stop all is always one tap away.
  const rail = h('div', { class: 'sampler-rail', role: 'group', 'aria-label': 'Sampler actions' }, [stopAll, editBtn].filter(Boolean));

  // ---------------------------------------------------------------- editor (edit state)
  const editor = edit ? h('section', { class: 'sampler-editor raised', 'aria-labelledby': 'sampler-editor-title' }) : null;
  function paintEditor() {
    if (!editor) return;
    const sl = slots[view.selected - 1];
    if (!sl || sl.state === 'empty') {
      editor.replaceChildren(
        h('h3', { id: 'sampler-editor-title', class: 'label sampler-panel__title', text: `Slot ${view.selected || '—'}` }),
        h('p', { class: 'body', text: 'Empty slot: use Assign in the bar above to choose a sample first.' }),
      );
      return;
    }
    const nameInput = h('input', { class: 'sampler-input', id: 'sampler-name', type: 'text', value: draft.name, maxlength: '12', dataset: { hit: '48', fr: 'FR-027' }, on: { input: (e) => { draft.name = e.target.value; } } });
    const radio = (group, options, current, key) => h('div', { class: 'sampler-seg', role: 'radiogroup', 'aria-label': group }, options.map(([val, text]) => h('button', {
      type: 'button', role: 'radio', class: 'sampler-seg__btn', 'aria-checked': String(String(current) === String(val)), dataset: { hit: '48', fr: 'FR-027' }, 'aria-label': `${group} ${text}`,
      on: { click: () => { draft[key] = val; paintEditor(); } },
    }, [h('span', { text })])));
    const lvl = Math.round(draft.level * 100);
    editor.replaceChildren(
      h('div', { class: 'sampler-editor__head' }, [
        h('h3', { id: 'sampler-editor-title', class: 'label sampler-panel__title', text: `Slot ${sl.n} · ${sl.file || 'no file'}` }),
        h('span', { class: 'sampler-tag label', text: 'Unsaved changes stay here until Save' }),
      ]),
      h('label', { class: 'sampler-field', for: 'sampler-name' }, [h('span', { class: 'label', text: 'Slot name' })]), nameInput,
      h('p', { class: 'label sampler-field', text: 'Trigger mode' }),
      radio('Trigger mode', [['one-shot', 'One-shot'], ['loop', 'Loop'], ['gate', 'Gate']], draft.trigger, 'trigger'),
      h('p', { class: 'body muted sampler-hint', text: { 'one-shot': 'Plays to the end once per tap.', loop: 'Tap starts, tap again stops; loops on the bar.', gate: 'Sounds only while your finger is down.' }[draft.trigger] }),
      h('p', { class: 'label sampler-field', text: 'Choke group' }),
      radio('Choke group', [['none', 'None'], [1, '1 Drums'], [2, '2 Vox'], [3, '3 FX'], [4, '4 Perc']], draft.choke, 'choke'),
      h('p', { class: 'label sampler-field', text: 'Level (slot gain, a setting — not a meter)' }),
      h('div', { class: 'sampler-level', role: 'group', 'aria-label': `Level ${lvl} %` }, [
        button({ label: 'Level down', icon: 'minus', iconOnly: true, cls: 'btn--secondary', fr: FR, on: { click: () => { draft.level = Math.max(0, Math.round((draft.level - 0.05) * 100) / 100); paintEditor(); } } }),
        h('span', { class: 'numeral sampler-level__val', text: `${lvl} %` }),
        button({ label: 'Level up', icon: 'plus', iconOnly: true, cls: 'btn--secondary', fr: FR, on: { click: () => { draft.level = Math.min(1, Math.round((draft.level + 0.05) * 100) / 100); paintEditor(); } } }),
      ]),
      h('div', { class: 'sampler-actions' }, [
        button({ label: `Save slot ${sl.n}`, icon: 'save', cls: 'btn--primary', fr: FR, on: { click: () => { Object.assign(sl, { name: draft.name.trim() || sl.name, trigger: draft.trigger, choke: draft.choke, level: draft.level }); paintBank(); paintList(); say(`Slot ${sl.n} saved to bank ${view.bank} (fixture acknowledgement): ${sl.name}, ${TRIG_WORD[sl.trigger].toLowerCase()}, ${sl.choke === 'none' ? 'no choke group' : `choke group ${sl.choke}`}, level ${Math.round(sl.level * 100)} %.`); } } }),
        button({ label: 'Discard changes', icon: 'discard', cls: 'btn--ghost', fr: FR, on: { click: () => { Object.assign(draft, slots[view.selected - 1]); paintEditor(); say('Changes discarded; the slot is as saved.'); } } }),
      ]),
    );
  }

  // ---------------------------------------------------------------- slot list in words
  const list = h('section', { class: 'sampler-list raised', 'aria-labelledby': 'sampler-list-title' });
  function paintList() {
    const first = (view.bank - 1) * 8 + 1;
    const rows = slots.slice(first - 1, first + 7).map((sl) => {
      const word = { empty: 'Empty', loaded: 'Ready', playing: 'Sounding', choked: 'Choked', missing: 'File missing', pending: 'Waiting for beat' }[sl.state] || sl.state;
      return h('li', { class: `sampler-list__row sampler-list__row--${sl.state}` }, [
        h('span', { class: 'numeral sampler-list__n', text: String(sl.n) }),
        h('span', { class: 'sampler-list__name title truncate', text: sl.name ? sl.name : '—' }),
        h('span', { class: 'sampler-list__meta body muted', text: sl.state === 'empty' ? 'No sample assigned' : `${TRIG_WORD[sl.trigger]} · ${sl.choke === 'none' ? 'no choke' : `CH${sl.choke} ${data.chokeGroups[sl.choke]}`} · ${Math.round(sl.level * 100)} %` }),
        h('span', { class: `sampler-list__state label sampler-word--${sl.state}`, text: word }),
      ]);
    });
    list.replaceChildren(
      h('h3', { id: 'sampler-list-title', class: 'label sampler-panel__title', text: `Bank ${view.bank} · slots ${first}–${first + 7} in words` }),
      h('ul', { class: 'sampler-list__rows' }, rows),
      h('p', { class: 'body muted sampler-hint', text: 'Level is each slot’s gain setting, not a meter. Sounding / Choked come from the engine snapshot — here a fixture.' }),
    );
  }

  // ---------------------------------------------------------------- voices + rights
  const voicePanel = h('section', { class: `sampler-voices raised${state === 'choked' ? ' sampler-voices--lead' : ''}`, 'aria-labelledby': 'sampler-voices-title' }, [
    h('h3', { id: 'sampler-voices-title', class: 'label sampler-panel__title', text: `Voices · ${data.maxVoices} in the proposed certified profile` }),
    h('p', { class: 'body', text: deckA?.state === 'playing' ? `Deck A keeps playing ${deckA.track?.title || 'its track'}: sampler voices use their own bus and reserved capacity, so a slot never interrupts a music deck.` : 'The sampler has its own bus; music decks keep their reserved capacity.' }),
    h('ol', { class: 'sampler-voices__list' }, data.voiceStealing.map((t, i) => h('li', { class: 'body' }, [h('span', { class: 'numeral sampler-voices__n', 'aria-hidden': 'true', text: String(i + 1) }), h('span', { text: t })]))),
    h('p', { class: 'body muted sampler-hint', text: 'Proposed stealing order (Document 06 AE-06); limits are acceptance decisions, not measured on a device.' }),
  ]);
  const p = data.pack;
  const rights = h('section', { class: 'sampler-rights raised', tabindex: '-1', 'aria-labelledby': 'sampler-rights-title' }, [
    h('h3', { id: 'sampler-rights-title', class: 'label sampler-panel__title' }, [icon('provenance-user', { size: 14 }), h('span', { text: ` Sample pack · ${p.name}` })]),
    h('dl', { class: 'sampler-dl' }, [
      dlRow('Slots', p.slots), dlRow('Licence', p.licence), dlRow('Source', p.provenance),
    ]),
    h('p', { class: 'body sampler-hint', text: p.rightsNote }),
  ]);

  // ---------------------------------------------------------------- overlay: assign sheet / clear confirm
  const overlay = h('div', { class: 'sampler-overlay' });
  function openAssign(n) {
    if (n === 12 && state === 'bank-b') { ctx.setState('empty-slot'); return; }
    view.sheet = n; paintOverlay();
  }
  function closeSheet() {
    if (state === 'empty-slot') { ctx.setState('bank-b'); return; }
    view.sheet = 0; view.confirmClear = 0; paintOverlay();
  }
  function paintOverlay() {
    const out = [];
    if (view.sheet) {
      const n = view.sheet;
      const sheet = h('mdj-sheet', {
        variant: 'sheet', title: `Assign slot ${n}`, icon: 'sampler', 'dismiss-label': 'Close',
        actions: JSON.stringify([{ id: 'cancel', label: 'Cancel' }, { id: 'import', label: 'Import from Files', icon: 'import', primary: true }]),
      }, [
        h('p', { class: 'body', text: n === 8 ? 'Replace the missing crash_wide.wav. The slot keeps its name, trigger mode, level and place in patterns.' : `Slot ${n} is empty. Choose a sample from ${p.name} (rights travel with the pack) or import a file you have the rights to use.` }),
        h('ul', { class: 'sampler-cands', 'aria-label': `Samples in ${p.name}` }, data.assignCandidates.map((c) => h('li', {}, [
          h('button', { type: 'button', class: 'sampler-cand raised', dataset: { hit: '48', fr: 'FR-027' }, 'aria-label': `Assign ${c.name} to slot ${n}`, on: { click: () => assign(n, c) } }, [
            icon(c.trigger === 'loop' ? 'loop' : 'play', { size: 18 }),
            h('span', { class: 'sampler-cand__name title', text: c.name }),
            h('span', { class: 'sampler-cand__meta numeral', text: `${c.file} · ${c.length}` }),
          ]),
        ]))),
      ]);
      sheet.addEventListener('mdj:sheet-action', (e) => {
        if (e.detail.id === 'import') say(`Files opened to import a sample into slot ${n} (fixture: no file picker in this prototype). You confirm the rights to the file before it is added.`);
        else closeSheet();
      });
      sheet.addEventListener('mdj:sheet-dismiss', closeSheet);
      out.push(h('div', { class: 'sampler-scrim', 'aria-hidden': 'true' }), h('div', { class: 'sampler-sheetwrap' }, [sheet]));
    } else if (view.confirmClear) {
      const n = view.confirmClear;
      const dlg = h('mdj-sheet', {
        variant: 'confirm', icon: 'trash', title: `Clear slot ${n}?`, 'dismiss-label': 'Close',
        actions: JSON.stringify([{ id: 'cancel', label: 'Keep slot', primary: true }, { id: 'clear', label: `Clear slot ${n}`, tone: 'danger', icon: 'trash' }]),
      }, [h('p', { class: 'body', text: `Slot ${n} "${slots[n - 1].name}" and its settings are removed from the bank. Patterns that use it keep the step but play nothing until a sample is assigned.` })]);
      dlg.addEventListener('mdj:sheet-action', (e) => {
        if (e.detail.id === 'clear') { Object.assign(slots[n - 1], { name: '', state: 'empty', choke: 'none', trigger: 'one-shot', level: 1, file: '' }); view.confirmClear = 0; paintBank(); paintList(); paintOverlay(); say(`Slot ${n} cleared (fixture acknowledgement). Assign slot ${n} puts a sample back.`); if (state === 'missing-sample' && n === 8) relead('Cleared · slot 8', 'Slot 8 cleared — it is empty now.', 'Patterns that used slot 8 keep their steps and play nothing there until a sample is assigned.'); }
        else closeSheet();
      });
      dlg.addEventListener('mdj:sheet-dismiss', closeSheet);
      out.push(h('div', { class: 'sampler-scrim', 'aria-hidden': 'true' }), h('div', { class: 'sampler-sheetwrap' }, [dlg]));
    }
    overlay.replaceChildren(...out);
  }
  function assign(n, c) {
    Object.assign(slots[n - 1], { name: c.name, file: c.file, trigger: c.trigger, choke: 'none', level: 1, state: 'loaded', reason: '' });
    view.sheet = 0;
    paintBank(); paintList(); paintOverlay();
    if ((state === 'empty-slot' && n === 12) || (state === 'missing-sample' && n === 8)) relead(`Assigned · slot ${n}`, `Slot ${n} now holds ${c.name}.`, `Saved with bank ${view.bank} (fixture acknowledgement). Tap the slot to play it; change its trigger mode or choke group in Edit.`);
    say(`Slot ${n} now holds ${c.name} (${c.file}) — saved with bank ${view.bank} as a fixture acknowledgement. ${TRIG_WORD[c.trigger]}, no choke group: change both in Edit.`);
  }

  // ---------------------------------------------------------------- events from the bank
  bankEl.addEventListener('mdj:sample-bank', (e) => {
    const b = e.detail.bank;
    if (state === 'bank-a' && b === 2) { ctx.setState('bank-b'); return; }
    if (state === 'bank-b' && b === 1) { ctx.setState('bank-a'); return; }
    view.bank = b; paintBank(); paintList();
  });
  bankEl.addEventListener('mdj:sample', (e) => {
    const { n } = e.detail;
    if (edit) { view.selected = n; Object.assign(draft, slots[n - 1]); paintBank(); paintEditor(); say(`Slot ${n} selected for editing.`); return; }
    if (state === 'bank-a' && n === 1) { ctx.setState('playing'); return; }
    if (state === 'playing' && n === 2) { ctx.setState('choked'); return; }
    trigger(n);
  });
  // Empty slots are inert buttons inside <mdj-sample-slot>; a pointer tap still reaches us here.
  bankEl.addEventListener('click', (e) => {
    const host = e.target.closest?.('mdj-sample-slot');
    if (!host || edit) return;
    if (host.getAttribute('state') === 'empty') openAssign(Number(host.getAttribute('n')));
    else if (host.getAttribute('state') === 'missing') say(`Slot ${host.getAttribute('n')}: sample file missing — slot kept. Locate or replace the file to play it.`);
  });
  bankEl.addEventListener('mdj:sample-edit', (e) => {
    const { action, n } = e.detail;
    if (action === 'done') { ctx.setState('bank-a'); return; }
    if (action === 'assign') { view.sheet = n; paintOverlay(); return; }
    if (action === 'clear') { view.confirmClear = n; paintOverlay(); return; }
    if (action === 'trigger' || action === 'choke') {
      const target = editor?.querySelector(`.sampler-seg[aria-label='${action === 'trigger' ? 'Trigger mode' : 'Choke group'}'] [aria-checked='true']`);
      target?.scrollIntoView({ block: 'nearest' }); target?.focus();
    }
  });

  // Stand-in for the engine outside the canonical paths: the acknowledged result of a trigger.
  function trigger(n) {
    const sl = slots[n - 1];
    if (!sl || sl.state === 'empty' || sl.state === 'missing') return;
    if (sl.state === 'playing' && sl.trigger !== 'one-shot') { sl.state = 'loaded'; paintBank(); paintList(); say(`Slot ${n} ${sl.name} stopped (acknowledged fixture).`); return; }
    let choked = null;
    if (sl.choke !== 'none') for (const o of slots) if (o !== sl && String(o.choke) === String(sl.choke) && o.state === 'playing') { o.state = 'choked'; choked = o; }
    if (voices() >= data.maxVoices) {
      const victim = slots.find((o) => o.state === 'playing' && o.trigger === 'one-shot');
      if (victim) victim.state = 'loaded';
    }
    sl.state = 'playing';
    paintBank(); paintList();
    say(`Slot ${n} ${sl.name} sounding (acknowledged fixture)${choked ? `; it stopped ${choked.name} in choke group ${sl.choke}` : ''}. ${voices()} of ${data.maxVoices} voices.`);
  }

  paintBank(); paintList(); paintEditor(); paintOverlay();
  const left = [lead, bankWrap, editor].filter(Boolean);
  if (landscape) {
    root.append(
      h('div', { class: 'sampler-col sampler-col--main' }, [bankWrap]),
      h('div', { class: 'sampler-col sampler-col--side' }, (edit ? [editor, live, rail, lead, list, voicePanel, rights] : [lead, rail, live, list, voicePanel, rights]).filter(Boolean)),
      overlay,
    );
  } else {
    const order = state === 'choked' ? [lead, bankWrap, live, voicePanel, list, rights] : [...left, live, list, voicePanel, rights];
    root.append(h('div', { class: 'sampler-scroll' }, order), rail, overlay);
  }
}

function dlRow(term, text) {
  return h('div', { class: 'sampler-dl__row' }, [h('dt', { class: 'label', text: term }), h('dd', { class: 'body', text })]);
}
