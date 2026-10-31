// <mdj-save-bar scope="Mixer settings" count="3" error="Storage full" state="clean|dirty|saving|failed|preview">
//
// The settings action bar (Document 04 §4 "Settings"; Document 03 §5: explicit Save, a visible
// preview / draft distinction and scoped Reset). Save, Discard, Preview and "Reset <scope>" are real
// 48 dp buttons; the status line prints the honest persistence state. Nothing animates to imply a save
// succeeded: `saving` prints SENT and waits, `clean` is the acknowledged saved state.
// Engine binding: none directly — Save asks the settings store to persist the draft; the store (or the
// engine, for config it owns) acknowledges, and the owning screen sets `clean`. Preview applies the draft
// to the live engine TEMPORARILY and is printed as "Previewing — not saved"; leaving the screen or
// Discard reverts it. Reset is scoped to `scope` (this section), never the whole app.
//   clean   — "No unsaved changes": Save / Discard / Preview unavailable, Reset available
//   dirty   — "3 unsaved changes in Mixer settings": everything available
//   saving  — "Saving… sent, waiting for confirmation" (SENT badge): Save / Discard / Preview disabled
//   failed  — "Save failed: <error>. Your changes are kept as a draft": Save reads "Retry save"
//   preview — "Previewing 3 unsaved changes — not saved": Preview is pressed and reads "Stop preview"
// Units / range: count is the number of changed settings. Gesture: tap. Pending vs acknowledged: saving
// vs clean. Cancellation: Discard (mdj:discard) reverts the draft; Stop preview reverts the live preview.
// Events: mdj:save, mdj:discard, mdj:preview { on }, mdj:reset { scope }.
// Accessible: toolbar "Mixer settings changes"; status is aria-live=polite; "Reset Mixer settings to
// defaults"; Preview has aria-pressed.
import { MdjElement, define, h, icon } from './base.js';

export class MdjSaveBar extends MdjElement {
  static tag = 'mdj-save-bar';
  static states = ['clean', 'dirty', 'saving', 'failed', 'preview'];
  static fr = ['FR-008', 'FR-034'];
  static hit = 48;
  static fixture = false;
  static observed = ['scope', 'count', 'error'];
  static samples = {
    default: { scope: 'Mixer settings', count: 3, style: 'width:100%' },
    variants: [{}],
    clean: { count: 0 },
    failed: { error: 'storage full' },
  };

  render() {
    const scope = this.attr('scope', 'Settings');
    const count = Math.max(0, Math.round(this.num('count', 0)));
    const error = this.attr('error', 'the store did not confirm');
    const state = this.state;
    this.className = `save-bar glass save-bar--${state}`;
    delete this.dataset.hit; // the four buttons are the targets
    this.setAttribute('role', 'toolbar');
    this.setAttribute('aria-label', `${scope} changes`);
    const n = `${count} unsaved ${count === 1 ? 'change' : 'changes'}`;
    const canAct = state === 'dirty' || state === 'failed' || state === 'preview';
    const saving = state === 'saving';

    let statusIcon = 'check', statusText = `No unsaved changes in ${scope}`, tone = 'neutral', badge = null;
    if (state === 'dirty') { statusIcon = 'edit'; statusText = `${n} in ${scope}`; tone = 'warning'; }
    else if (saving) { statusIcon = 'loader'; statusText = 'Saving… sent, waiting for confirmation'; tone = 'info'; badge = h('span', { class: 'save-bar__badge save-bar__badge--sent', text: 'SENT', 'aria-hidden': 'true' }); }
    else if (state === 'failed') { statusIcon = 'warning'; statusText = `Save failed: ${error}. Your ${count ? n : 'changes'} are kept as a draft.`; tone = 'critical'; }
    else if (state === 'preview') { statusIcon = 'display'; statusText = `Previewing ${n} — not saved. Leaving this screen reverts the preview.`; tone = 'info'; }
    const status = h('div', { class: `save-bar__status tone-${tone}`, role: 'status', 'aria-live': 'polite' }, [icon(statusIcon, { size: 14 }), h('span', { class: 'save-bar__status-text', text: statusText }), badge]);

    const btn = (cls, label, ic, enabled, name, onClick, extra = {}) => h('button', {
      type: 'button', class: `btn ${cls} save-bar__btn`.trim(), dataset: { hit: '48' }, 'aria-label': name, 'aria-disabled': enabled ? undefined : 'true', ...extra,
      on: { click: () => { if (enabled) onClick(); } },
    }, [ic ? icon(ic, { size: 16 }) : null, h('span', { class: 'btn-label', text: label })]);
    const row = h('div', { class: 'save-bar__row' }, [
      btn('btn--ghost', `Reset ${scope}`, 'undo', !saving, `Reset ${scope} to defaults (this section only)`, () => this.emit('mdj:reset', { scope })),
      h('span', { class: 'save-bar__spacer', 'aria-hidden': 'true' }),
      btn('', 'Discard', 'trash', canAct, `Discard ${count ? n : 'changes'} in ${scope}`, () => this.emit('mdj:discard', { scope, count })),
      btn(state === 'preview' ? 'btn--secondary save-bar__preview--on' : 'btn--secondary', state === 'preview' ? 'Stop preview' : 'Preview', 'display', canAct, state === 'preview' ? 'Stop previewing unsaved changes' : `Preview ${count ? n : 'changes'} without saving`, () => this.emit('mdj:preview', { on: state !== 'preview', scope }), { 'aria-pressed': String(state === 'preview') }),
      btn('btn--primary', state === 'failed' ? 'Retry save' : saving ? 'Saving…' : 'Save', 'save', canAct, state === 'failed' ? `Retry saving ${n} in ${scope}` : saving ? 'Saving, waiting for confirmation' : `Save ${count ? n : 'changes'} in ${scope}`, () => this.emit('mdj:save', { scope, count })),
    ]);
    this.replaceChildren(status, row);
  }
}
define(MdjSaveBar);
