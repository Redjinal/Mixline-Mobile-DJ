// system/plugins — the plugin rack (Document 15 §6, Document 03 §7, FR-047, FR-034).
//
// A shell screen: the persistent dock keeps transport, crossfader, route and master reachable while the
// rack is open. The rack prints the master insert chain (mdj-plugin-slot per slot), the plugins found on
// this device with their compatibility, and the selected plugin's declared contract and isolation model.
// No plugin host exists: Load / Bypass / Unload emit mdj:plugin and THIS SCREEN STANDS IN FOR THE HOST,
// moving to the state the fixture says the host reported. Latency, CPU and memory numerals are fixtures
// (the slot component carries the FIXTURE mark). Parameters use mdj-dial; the screen acknowledges each
// release by setting `value` and clearing `state`, labelled as a fixture acknowledgement.
import { register } from '../../app/registry.js';
import { load } from '../../app/fixtures.js';
import { h, button, icon } from '../../components/base.js';
import { setFlash, takeFlash, notice, statusWord } from './index.js';

const SYS = await load('system');
const FX = await load('plugins');
const P = (id) => FX.plugins.find((p) => p.id === id);
const CATALOGUE = ['glassverb', 'brasskeys', 'tidecomp', 'desktop-chorus'];
const CAT_STATUS = {
  compatible: ['ok', 'Compatible'],
  'failed-validation': ['critical', 'Failed validation'],
  'unsupported-format': ['critical', 'Not Android-compatible'],
  unavailable: ['warning', 'Not installed'],
  'latency-change': ['ok', 'Compatible'],
};
const ID = 'system/plugins';

// Per state: what the chain holds, which catalogue item is selected and how its detail is drawn.
const PLAN = {
  'compatible-list': { chain: [], select: 'glassverb', detail: 'compatible' },
  loading: { chain: [['glassverb', 'loading']], select: null },
  loaded: { chain: [['glassverb', 'loaded']], select: null },
  bypass: { chain: [['glassverb', 'bypassed']], select: null },
  parameters: { chain: [['glassverb', 'loaded']], select: null, sheet: true },
  'failed-validation': { chain: [['glassverb', 'loaded']], select: 'tidecomp', detail: 'failed-validation' },
  'unsupported-format': { chain: [['glassverb', 'loaded']], select: 'desktop-chorus', detail: 'unsupported-format' },
  'unavailable-placeholder': { chain: [['glassverb', 'loaded'], ['old-phaser', 'unavailable']], select: null },
  'latency-change-blocked': { chain: [['wideverb', 'latency-change']], select: null },
};

register({
  id: ID, family: 'system', title: 'Plugin rack', order: 1,
  fr: ['FR-047', 'FR-034', 'FR-039'],
  shell: true,
  dock: { portrait: true, landscape: true },
  states: {
    'compatible-list': { label: 'Compatible plugins listed; chain empty', exercised: true, scenario: 'set-ready' },
    loading: { label: 'Loading — sent, waiting for the host', exercised: false, scenario: 'set-ready' },
    loaded: { label: 'Glassverb loaded in slot 1', exercised: true, scenario: 'set-ready', via: { from: 'compatible-list', control: 'Load' } },
    bypass: { label: 'Bypass engaged (latency-compensated)', exercised: true, scenario: 'set-ready', via: { from: 'loaded', control: 'Bypass' } },
    parameters: { label: 'Parameters and presets sheet', exercised: true, scenario: 'set-ready', via: { from: 'loaded', control: 'Parameters' } },
    'failed-validation': { label: 'Plugin failed validation', exercised: false, scenario: 'set-ready' },
    'unsupported-format': { label: 'Desktop VST3 — unsupported format', exercised: false, scenario: 'set-ready' },
    'unavailable-placeholder': { label: 'Restored session — unavailable plugin placeholder', exercised: false, scenario: 'set-ready' },
    'latency-change-blocked': { label: 'Latency changed — rebuild waits (transition running)', exercised: false, scenario: 'transition' },
  },
  defaultState: 'compatible-list',
  render(ctx) {
    const plan = PLAN[ctx.state] || PLAN['compatible-list'];
    const flash = takeFlash(ID, ctx.state);
    let selected = plan.select;
    let detailState = plan.detail || null;

    const root = h('div', { class: 'system-shellpage system-plugins', dataset: { state: ctx.state } });
    const scroll = h('div', { class: 'system-scroll' });
    const live = h('div', { class: 'system-live', 'aria-live': 'polite' });
    const say = (node) => { live.replaceChildren(node); live.scrollIntoView?.({ block: 'nearest' }); };

    // ---- head ----
    const head = h('header', { class: 'system-plugins__head ink-backing' }, [
      h('div', { class: 'system-plugins__titles' }, [
        h('h1', { class: 'title system-plugins__title', text: 'Plugin rack' }),
        h('p', { class: 'label', text: `${SYS.plugins.chainName} · ${SYS.plugins.slots} slots` }),
      ]),
      h('p', { class: 'system-plugins__qualified body' }, [icon('clock', { size: 14 }), h('span', { text: SYS.plugins.qualifiedNote })]),
      h('div', { class: 'system-plugins__legend', role: 'list', 'aria-label': 'Isolation models' }, Object.entries(FX.isolationModels).map(([k, m]) =>
        h('span', { class: `system-plugins__iso system-plugins__iso--${k} label`, role: 'listitem', title: m.detail }, [icon(k === 'process' ? 'lock' : 'unlock', { size: 12 }), h('span', { text: m.label })]))),
    ]);

    // ---- state notices ----
    const notes = h('div', { class: 'system-plugins__notes' });
    if (flash) notes.appendChild(notice({ tone: flash.tone || 'ok', ic: flash.ic || 'check', lead: flash.lead, text: flash.text, role: 'status' }));
    if (ctx.state === 'unsupported-format') notes.appendChild(notice({ tone: 'critical', ic: 'warning', lead: 'Desktop plugin binaries are not Android-compatible.', text: 'DesktopChorus.vst3 is a Windows x86_64 binary. It was not added to the chain and cannot be converted. Look for an Android (AAP) build from the vendor.' }));
    if (ctx.state === 'failed-validation') notes.appendChild(notice({ tone: 'critical', ic: 'x', lead: 'Tide Compressor was not added.', text: 'Validation failed, so it is not offered for loading. The chain is unchanged and Glassverb keeps processing.' }));
    if (ctx.state === 'unavailable-placeholder') notes.appendChild(notice({ tone: 'warning', ic: 'unavailable', lead: 'Plugin unavailable — placeholder kept; not replaced by another effect.', text: 'You restored “Saturday practice”. Phaser Nine is not installed on this phone, so slot 2 keeps its saved state and passes audio through dry. Install it, or remove the slot deliberately.' }));
    if (ctx.state === 'latency-change-blocked') notes.appendChild(notice({ tone: 'warning', ic: 'clock', lead: 'Latency changed — graph rebuild waits for a qualified time.', text: 'A transition is running (A → B, fixture). Wideverb keeps its old 256-frame alignment until the transition ends or you stop it; nothing is rebuilt mid-transition.' }));
    if (ctx.state === 'loading') notes.appendChild(notice({ tone: 'info', ic: 'loader', lead: 'Load sent — waiting for the host.', text: 'No progress figure exists: the host reports ready or failed. The master output is unchanged until it reports ready.' }));
    if (ctx.state === 'bypass') notes.appendChild(notice({ tone: 'neutral', ic: 'slip', lead: 'Glassverb bypassed (host acknowledged · fixture).', text: 'The dry path keeps the 5.3 ms plugin delay, so decks stay aligned when you switch back. Tap Bypassed to return to processing.', role: 'status' }));

    // ---- chain ----
    const chain = h('section', { class: 'system-plugins__chain', 'aria-label': SYS.plugins.chainName });
    chain.appendChild(h('mdj-section-header', { title: 'Chain · master insert', count: String(plan.chain.length), level: '2', note: plan.chain.length ? 'Processed in slot order' : 'Empty — the master output is unprocessed' }));
    for (let i = 0; i < SYS.plugins.slots; i++) {
      const entry = plan.chain[i];
      if (entry) chain.appendChild(h('mdj-plugin-slot', { plugin: entry[0], state: entry[1], slot: String(i + 1), compact: ctx.orientation === 'landscape' ? true : null }));
      else chain.appendChild(h('div', { class: 'system-plugins__empty', role: 'group', 'aria-label': `Slot ${i + 1}, empty` }, [
        h('span', { class: 'system-plugins__empty-num numeral', 'aria-hidden': 'true', text: String(i + 1) }),
        h('span', { class: 'body muted', text: i === plan.chain.length ? 'Empty slot — choose a compatible plugin from the list.' : 'Empty slot' }),
      ]));
    }

    // ---- catalogue + detail ----
    const cat = h('section', { class: 'system-plugins__catalogue', 'aria-label': 'Plugins on this device' });
    const drawCatalogue = () => {
      const inChain = new Set(plan.chain.map((c) => c[0]));
      const list = h('div', { class: 'system-plugins__list', role: 'list' });
      for (const id of CATALOGUE) {
        const p = P(id);
        const [tone, word] = inChain.has(id) ? ['ok', `In chain · slot ${plan.chain.findIndex((c) => c[0] === id) + 1}`] : CAT_STATUS[p.status] || ['neutral', p.status];
        const isSel = selected === id;
        list.appendChild(h('div', { role: 'listitem' }, [h('button', {
          type: 'button', class: `system-plugins__row${isSel ? ' is-selected' : ''}`, dataset: { hit: '48', fr: 'FR-047' }, 'aria-pressed': String(isSel),
          'aria-label': `${p.name}, ${word}${isSel ? ', shown below' : ''}`,
          on: { click: () => { selected = id; detailState = inChain.has(id) ? null : (p.status === 'latency-change' ? 'compatible' : p.status); drawCatalogue(); } },
        }, [
          h('span', { class: `system-plugins__kind${p.kind === 'instrument' ? ' is-instrument' : ''}`, 'aria-hidden': 'true' }, [icon(p.kind === 'instrument' ? 'key' : 'fx', { size: 16 })]),
          h('span', { class: 'system-plugins__row-text' }, [
            h('span', { class: 'title truncate', text: p.name }),
            h('span', { class: 'label truncate', text: `${p.format} · ${p.kind}` }),
          ]),
          statusWord(tone, word),
        ])]));
      }
      const parts = [h('mdj-section-header', { title: 'On this device', count: String(CATALOGUE.length), level: '2', note: 'Only validated Android plugins can be loaded' }), list];
      if (selected && detailState) parts.push(h('mdj-plugin-slot', { plugin: selected, state: detailState, slot: String(Math.min(plan.chain.length + 1, SYS.plugins.slots)) }));
      cat.replaceChildren(...parts);
    };
    drawCatalogue();

    const cols = h('div', { class: 'system-plugins__cols' }, [chain, cat]);
    scroll.append(head, notes, live, cols);
    root.appendChild(scroll);

    // ---- parameters / presets sheet ----
    if (plan.sheet) root.appendChild(parametersSheet(ctx));

    // ---- the screen stands in for the host ----
    root.addEventListener('mdj:plugin', (e) => {
      const { action, pluginId } = e.detail;
      const p = P(pluginId) || { name: pluginId };
      if (action === 'load') {
        if (pluginId === 'glassverb') { setFlash(ID, { state: 'loaded', tone: 'ok', ic: 'check', lead: 'Glassverb loaded in slot 1.', text: 'The host reported ready (fixture acknowledgement). Bypass and Parameters are available; latency 256 frames is compensated on the master.' }); ctx.setState('loaded'); }
        else say(notice({ tone: 'info', ic: 'info', lead: `${p.name} is an instrument.`, text: 'The master insert chain takes effects. Instruments are played from the Sampler; nothing was loaded here.' }));
      } else if (action === 'bypass') ctx.setState('bypass');
      else if (action === 'unbypass') { setFlash(ID, { state: 'loaded', tone: 'ok', ic: 'check', lead: 'Glassverb processing again.', text: 'Bypass off — host acknowledged (fixture).' }); ctx.setState('loaded'); }
      else if (action === 'parameters') ctx.setState('parameters');
      else if (action === 'unload' || action === 'cancel-load') { setFlash(ID, { state: 'compatible-list', tone: 'neutral', ic: 'minus', lead: action === 'unload' ? 'Glassverb unloaded.' : 'Load cancelled.', text: 'Slot 1 is empty; the master output is unprocessed.' }); ctx.setState('compatible-list'); }
      else if (action === 'report') say(notice({ tone: 'critical', ic: 'info', lead: 'Validation report · Tide Compressor 2.0.0', text: p.failure || 'Validation failed.' }));
      else if (action === 'remove') say(notice({ tone: 'neutral', ic: 'trash', lead: `${p.name}: remove from this list?`, text: 'Removing deletes only the plugin file reference, never a session. In this prototype the list is a fixture and stays as it is.' }));
      else if (action === 'formats') say(notice({ tone: 'info', ic: 'info', lead: 'Loadable formats', text: 'Android plugins built for AAP (separate plugin apps, process boundary) or the app-native module interface, arm64-v8a. Desktop VST3 / AU binaries cannot run on Android.' }));
      else if (action === 'install') say(notice({ tone: 'info', ic: 'download', lead: 'Install Phaser Nine from its own app package.', text: 'Plugins arrive as separately installed Android apps, never as downloaded code inside this app. The placeholder stays until the plugin is found.' }));
      else if (action === 'keep') say(notice({ tone: 'ok', ic: 'save', lead: 'Placeholder kept.', text: 'Slot 2 keeps Phaser Nine’s saved state (preset “Slow sweep”) and passes audio through dry.' }));
      else if (action === 'rebuild') say(notice({ tone: 'info', ic: 'clock', lead: 'Rebuild requested — SENT.', text: 'The host rebuilds the graph after the transition ends; until it acknowledges, Wideverb keeps its old alignment.' }));
    });
    return root;
  },
});

function parametersSheet(ctx) {
  const params = SYS.plugins.parameters.glassverb;
  const presets = SYS.plugins.presets.glassverb;
  const body = [];
  const grid = h('div', { class: 'system-plugins__params', role: 'group', 'aria-label': 'Glassverb parameters' });
  for (const prm of params) {
    const d = h('mdj-dial', { kind: 'generic', label: prm.label, value: String(prm.value), min: String(prm.min), max: String(prm.max), unit: prm.unit, default: String(prm.default), size: '56' });
    grid.appendChild(h('div', { class: 'system-plugins__param' }, [d]));
  }
  // Stand in for the host: acknowledge a released dial value (fixture acknowledgement).
  grid.addEventListener('mdj:value', (e) => {
    if (e.detail?.phase !== 'end') return;
    const dial = e.target.closest('mdj-dial');
    if (!dial) return;
    dial.setAttribute('value', String(e.detail.value));
    dial.removeAttribute('pending-value');
    dial.removeAttribute('state');
  });
  grid.addEventListener('mdj:reset', (e) => {
    const dial = e.target.closest('mdj-dial');
    if (dial) { dial.setAttribute('value', String(e.detail.value)); dial.removeAttribute('state'); }
  });
  body.push(h('p', { class: 'body muted system-plugins__sheet-note' }, [
    'Values are the host’s acknowledged parameters (fixture). A released dial shows SENT until the host confirms. ',
    h('mdj-fixture-mark', { for: 'plugin parameters', inline: true }),
  ]));
  body.push(grid);
  const presetList = h('div', { class: 'system-plugins__presets', role: 'group', 'aria-label': 'Presets' }, [h('p', { class: 'label', text: 'Presets · state schema v3' })]);
  const status = h('p', { class: 'body muted system-plugins__preset-status', 'aria-live': 'polite', text: 'Presets hold parameter values only — never code, file or network instructions.' });
  for (const pr of presets) {
    presetList.appendChild(button({
      label: pr.name, hit: 48, cls: `system-plugins__preset${pr.current ? ' is-current' : ''}`, fr: ['FR-047'],
      attrs: { 'aria-pressed': String(!!pr.current) },
      on: { click: (e) => {
        presetList.querySelectorAll('.system-plugins__preset').forEach((b) => { b.setAttribute('aria-pressed', 'false'); b.classList.remove('is-current'); });
        e.currentTarget.setAttribute('aria-pressed', 'true'); e.currentTarget.classList.add('is-current');
        status.textContent = `Preset “${pr.name}” recalled — host acknowledged (fixture). Parameter values above are the saved ones until the host reports new values.`;
      } },
    }));
  }
  presetList.appendChild(status);
  body.push(presetList);
  const sheet = h('mdj-sheet', { variant: 'sheet', title: 'Glassverb · parameters and presets', icon: 'list', 'dismiss-label': 'Close', actions: JSON.stringify([{ id: 'unload', label: 'Unload Glassverb', icon: 'trash' }, { id: 'close', label: 'Back to the rack', primary: true }]) }, body);
  sheet.addEventListener('mdj:sheet-dismiss', () => ctx.setState('loaded'));
  sheet.addEventListener('mdj:sheet-action', (e) => {
    if (e.detail.id === 'unload') { setFlash(ID, { state: 'compatible-list', tone: 'neutral', ic: 'minus', lead: 'Glassverb unloaded.', text: 'Slot 1 is empty; the master output is unprocessed.' }); ctx.setState('compatible-list'); }
    else ctx.setState('loaded');
  });
  return h('div', { class: 'system-overlay' }, [h('div', { class: 'system-overlay__scrim', 'aria-hidden': 'true' }), h('div', { class: 'system-overlay__sheet' }, [sheet])]);
}
