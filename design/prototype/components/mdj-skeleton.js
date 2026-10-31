// <mdj-skeleton kind="row|art|text|panel" width="100%" height="120" lines="3" label="Loading artwork"
//               continue-label="Continue without analysis" state="loading|stalled">
//
// A region-sized placeholder for GENUINELY asynchronous data only (Document 04 §4 "Loading"; Document 03
// §5): library artwork, a crate's rows while the index answers, a panel waiting for the preparation store.
// A playing deck never becomes a skeleton because analysis is refreshing; playing controls stay active.
// Engine binding: none. Units / range: width / height in dp (or any CSS length; defaults by kind: row
// 100 % × 56, art 56 × 56, text 100 % × `lines` lines, panel 100 % × 120). Gesture: none while loading.
//   loading — bones pulse only under full motion (reduced motion: static); aria-busy on the region
//   stalled — the data did not arrive within the owning screen's timeout: the bones stop, the region
//             prints "Still loading — no response yet" and offers Retry (48 dp, mdj:retry) and, when
//             `continue-label` is set, a Continue-without button (mdj:continue). No fake percentage, no
//             spinner that implies progress.
// Pending vs acknowledged: the owning screen replaces the skeleton with content when the data arrives;
// the skeleton never turns itself into content. Cancellation: Retry / Continue are the exits.
// Accessible: role=status "Loading artwork" (aria-busy); stalled "Still loading artwork — no response yet".
import { MdjElement, define, h, icon } from './base.js';

const KINDS = ['row', 'art', 'text', 'panel'];
const len = (v, def) => (v === null || v === undefined || v === '' ? def : /^\d+(\.\d+)?$/.test(String(v)) ? `${v}px` : String(v));

export class MdjSkeleton extends MdjElement {
  static tag = 'mdj-skeleton';
  static states = ['loading', 'stalled'];
  static fr = ['FR-006', 'FR-033'];
  static hit = 0;
  static fixture = false;
  static observed = ['kind', 'width', 'height', 'lines', 'label', 'continue-label'];
  static samples = {
    default: { kind: 'row', label: 'Loading crate rows', style: 'width:100%' },
    variants: [{ kind: 'row' }, { kind: 'art', width: 56, label: 'Loading artwork', style: 'width:auto' }, { kind: 'text', lines: 3, label: 'Loading track notes' }, { kind: 'panel', height: 96, label: 'Loading preparation panel' }],
    stalled: { 'continue-label': 'Continue without analysis' },
  };

  render() {
    const kindAttr = this.attr('kind', 'row');
    const kind = KINDS.includes(kindAttr) ? kindAttr : 'row';
    const lines = Math.max(1, Math.min(8, Math.round(this.num('lines', 3))));
    const label = this.attr('label', 'Loading');
    const contLabel = this.attr('continue-label', '');
    const state = this.state;
    const stalled = state === 'stalled';
    this.className = `skeleton skeleton--${kind} skeleton--${state}`;
    this.setAttribute('role', 'status');
    this.setAttribute('aria-live', 'polite');
    this.setAttribute('aria-label', stalled ? `Still ${label.toLowerCase()} — no response yet` : label);
    if (stalled) this.removeAttribute('aria-busy'); else this.setAttribute('aria-busy', 'true');
    const w = len(this.getAttribute('width'), kind === 'art' ? '56px' : '100%');
    const hgt = len(this.getAttribute('height'), kind === 'art' ? w : kind === 'panel' ? '120px' : null);
    this.style.width = w;
    this.style.setProperty('--sk-w', w);
    if (hgt && kind !== 'text' && kind !== 'row') this.style.setProperty('--sk-h', hgt);
    else this.style.removeProperty('--sk-h');

    const bone = (cls, style = {}) => h('span', { class: `skeleton__bone sunken ${cls}`.trim(), 'aria-hidden': 'true', style });
    const bones = h('div', { class: 'skeleton__bones', 'aria-hidden': 'true' });
    if (kind === 'row') {
      bones.append(bone('skeleton__bone--art'), h('span', { class: 'skeleton__lines' }, [bone('skeleton__bone--line', { width: '62%' }), bone('skeleton__bone--line skeleton__bone--thin', { width: '40%' })]), bone('skeleton__bone--nums'));
    } else if (kind === 'art') {
      bones.append(bone('skeleton__bone--square'));
    } else if (kind === 'text') {
      const widths = ['92%', '78%', '60%', '85%', '70%', '50%', '88%', '66%'];
      for (let i = 0; i < lines; i++) bones.appendChild(bone('skeleton__bone--line', { width: widths[i % widths.length] }));
    } else {
      bones.append(bone('skeleton__bone--panel'));
    }
    const parts = [bones];
    if (stalled) {
      parts.push(h('div', { class: 'skeleton__stalled ink-backing' }, [
        h('span', { class: 'skeleton__stalled-text tone-warning' }, [icon('clock', { size: 12 }), h('span', { text: `Still ${label.toLowerCase()} — no response yet` })]),
        h('span', { class: 'skeleton__stalled-actions' }, [
          h('button', { type: 'button', class: 'btn skeleton__btn', dataset: { hit: '48' }, on: { click: () => this.emit('mdj:retry', { label }) } }, [icon('refresh', { size: 14 }), h('span', { class: 'btn-label', text: 'Retry' })]),
          contLabel ? h('button', { type: 'button', class: 'btn btn--ghost skeleton__btn', dataset: { hit: '48' }, on: { click: () => this.emit('mdj:continue', { label }) } }, [h('span', { class: 'btn-label', text: contLabel })]) : null,
        ]),
      ]));
    } else {
      parts.push(h('span', { class: 'skeleton__sr', text: label }));
    }
    this.replaceChildren(...parts);
  }
}
define(MdjSkeleton);
