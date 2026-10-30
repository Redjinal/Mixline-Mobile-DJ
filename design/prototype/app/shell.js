// <mdj-shell> — the persistent performance shell (Document 03 §1).
//
// Portrait: top status strip (route, recording, flags, ParDay) · screen content ·
// bottom dock (deck selectors for every enabled deck, Play/Cue for the focused pair,
// crossfader, master meter and a Master button).
// Landscape: top strip · content · one slim dock row. Perform screens that draw
// their own transport set dock.landscape = false.
//
// The router sets `shell.ctx` and `shell.content` before appending. Everything shown
// comes from the fixture scenario so the shell and the screen agree.
import { h, icon, button, fmt } from '../components/base.js';
import { navigate } from './router.js';

export class MdjShell extends HTMLElement {
  static get observedAttributes() { return ['dock']; }
  connectedCallback() { this.render(); }
  attributeChangedCallback() { if (this.isConnected) this.render(); }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const s = ctx.session;
    const o = ctx.orientation;
    const dock = this.getAttribute('dock') !== 'off';
    this.className = `shell stage shell--${o} ${dock ? 'shell--dock' : 'shell--nodock'}`;
    this.dataset.component = 'mdj-shell';

    // ---- top status strip ----
    const route = h('mdj-route-chip', { 'route-id': s.route.id, compact: o === 'landscape' ? true : null });
    const rec = recIndicator(s);
    const flags = h('div', { class: 'shell__flags' });
    if (s.network === 'offline') flags.appendChild(h('span', { class: 'flag tone-neutral label' }, [icon('wifi-off', { size: 12 }), 'Offline']));
    if (s.thermal === 'warm') flags.appendChild(h('span', { class: 'flag tone-warning label' }, [icon('thermal', { size: 12 }), 'Warm']));
    if (s.thermal === 'hot') flags.appendChild(h('span', { class: 'flag tone-critical label' }, [icon('thermal', { size: 12 }), 'Hot · optional work paused']));
    if (s.storage?.freeBytes < 1e9) flags.appendChild(h('span', { class: 'flag tone-warning label' }, [icon('storage', { size: 12 }), `${fmt.bytes(s.storage.freeBytes)} free`]));
    const parday = h('mdj-parday-button', { state: s.parday?.state || 'ready', compact: true });
    const top = h('header', { class: 'shell__status', role: 'region', 'aria-label': 'Set status' }, [route, flags, rec, parday]);

    // ---- content ----
    const content = h('div', { class: 'shell__content', role: 'main' });
    if (this.content) content.appendChild(this.content);

    this.replaceChildren(top, content);
    if (dock) this.appendChild(this.renderDock(s, o));

    this.addEventListener('mdj:open-route', () => navigate('route/check', { state: s.route.id }));
    this.addEventListener('mdj:open-parday', () => navigate('parday/perform'));
  }

  renderDock(s, o) {
    const [fa, fb] = s.focus;
    const decks = ['A', 'B', 'C', 'D'].map((l) => s.decks[l]).filter((d) => d.enabled);
    const tabs = h('div', { class: 'shell__decks', role: 'tablist', 'aria-label': 'Decks' });
    for (const d of decks) {
      tabs.appendChild(h('mdj-deck-tab', {
        deck: d.letter, state: d.state, title: d.track ? d.track.title : '', focused: s.focus.includes(d.letter) ? true : null,
        level: Math.max(d.levelL || 0, d.levelR || 0), compact: o === 'landscape' || decks.length > 2 ? true : null,
      }));
    }
    // Landscape dock is one slim row: 48 dp transport (Document 03 minimum), a vertical mini meter
    // and an icon-only Master button so four deck tabs still fit in 892 dp without overlap.
    const landscape = o === 'landscape';
    const size = landscape ? 48 : 56;
    const transportFor = (letter) => {
      const d = s.decks[letter];
      const empty = !d.track || d.state === 'empty' || d.state === 'missing' || d.state === 'loading';
      const cueState = empty ? 'disabled' : d.cueSelected ? 'active' : 'idle';
      const playState = empty ? 'disabled' : d.state === 'playing' ? 'playing' : d.state === 'interrupted' ? 'interrupted' : 'paused';
      return [h('mdj-transport', { kind: 'cue', deck: letter, state: cueState, size, hit: size }), h('mdj-transport', { kind: 'play', deck: letter, state: playState, size, hit: size })];
    };
    const xf = h('mdj-crossfader', { value: s.crossfader, 'assign-a': fa, 'assign-b': fb, compact: true, state: s.route.status === 'lost' ? 'disabled' : 'idle' });
    const transport = h('div', { class: 'shell__transport' }, [
      h('div', { class: `shell__pair deck-${fa.toLowerCase()}` }, transportFor(fa)),
      xf,
      h('div', { class: `shell__pair deck-${fb.toLowerCase()}` }, transportFor(fb)),
    ]);
    const master = h('div', { class: 'shell__master' }, [
      h('mdj-meter', { l: s.master.levelL, r: s.master.levelR, peak: s.master.peakHold ?? null, clip: s.master.clip ? true : null, gr: s.master.limiterGrDb ?? null, label: 'Master', scale: 'compact', orientation: landscape ? 'vertical' : 'horizontal', state: s.master.muted ? 'muted' : (s.master.levelL > 0 ? 'active' : 'idle') }),
      button({ label: 'Master', icon: 'master', iconOnly: landscape, hit: 48, cls: 'btn--secondary shell__master-btn', fr: ['FR-021'], on: { click: () => navigate('perform/master') } }),
    ]);
    return h('footer', { class: 'shell__dock glass', role: 'region', 'aria-label': 'Transport dock', dataset: { decks: String(decks.length) } }, [tabs, transport, master]);
  }
}

function recIndicator(s) {
  const r = s.recording || { state: 'idle' };
  if (r.state === 'recording') {
    return button({ label: `REC ${fmt.time(r.elapsedSec)}`, icon: 'rec', hit: 48, cls: 'rec rec--on', fr: ['FR-031'], on: { click: () => navigate('rec/panel', { state: 'recording' }) }, attrs: { 'aria-label': `Recording, ${fmt.time(r.elapsedSec)} elapsed. Open recording.` } });
  }
  if (r.state === 'stopped-storage') {
    return button({ label: 'REC stopped', icon: 'warning', hit: 48, cls: 'rec rec--stopped', fr: ['FR-031'], on: { click: () => navigate('rec/panel', { state: 'storage-full' }) }, attrs: { 'aria-label': 'Recording stopped: storage low. Open recording.' } });
  }
  return button({ label: 'REC', icon: 'rec', hit: 48, cls: 'rec rec--off', fr: ['FR-031'], on: { click: () => navigate('rec/panel') }, attrs: { 'aria-label': 'Not recording. Open recording.' } });
}

customElements.define('mdj-shell', MdjShell);
