// <mdj-value-inspector label="Filter" deck="B" value="2" draft="3.5" unit="" min="-100" max="100" step="0.5"
//                      fine="0.1" default="0" state="idle|dirty|disabled">
//
// The enlarged inspector a dial, fader or pitch rail opens through mdj:inspect. It is the accessible
// alternative Document 03 §4 requires: big numeral, visible unit and range, fine −/+ (48 dp), numeric
// entry and an explicit Reset.
// Engine binding: the same EngineCommand as the control it inspects (set_parameter / set_tempo with the
// deck generation and mixer revision). The inspector never applies anything itself: −/+ emit
// mdj:value { value, source: 'increment' }, Apply (or Enter in the field) emits mdj:value { source:
// 'entry' }, Reset emits mdj:reset { value: default }. The screen forwards them and acknowledges by
// setting `value`.
// Pending vs acknowledged: `value` is the ACKNOWLEDGED engine value (big numeral, aria-live). `draft` is
// a typed, unapplied entry: state `dirty` prints UNAPPLIED beside the field, enables Apply and keeps the
// acknowledged numeral visible — typing never changes the sound. Out-of-range entries are clamped on
// Apply and the clamp is printed. Nothing animates to imply success.
// Units / range: inherited from the control (min, max, step, fine, unit, default) and always printed.
// Cancellation: Escape in the field or Cancel discards the draft (mdj:discard). `disabled` (route loss,
// no track) disables every action and says why in the note.
// Accessible: the field is a real <input inputmode="decimal"> named "<label> value, deck <X>"; every
// button is a real button named with deck and parameter; the big numeral is aria-live=polite so an
// acknowledgement is announced once. Deck identity is the letter in the title, never colour alone.
import { MdjElement, define, h, icon } from './base.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
function display(v, unit, bipolar, ascii = false) {
  const a = Math.abs(v);
  const digits = a >= 100 ? 0 : 1;
  const body = a.toFixed(digits);
  const sign = Number(body) === 0 ? '' : v < 0 ? (ascii ? '-' : '−') : bipolar ? '+' : '';
  return sign + body;
}

export class MdjValueInspector extends MdjElement {
  static tag = 'mdj-value-inspector';
  static states = ['idle', 'dirty', 'disabled'];
  static fr = ['FR-020', 'FR-015'];
  static hit = 48;
  static observed = ['label', 'deck', 'value', 'draft', 'unit', 'min', 'max', 'step', 'fine', 'default', 'reason'];
  static samples = {
    default: { label: 'Filter', deck: 'B', value: 2, unit: '', min: -100, max: 100, step: 1, fine: 0.5, default: 0, style: 'width:min(320px, 100%)' },
    dirty: { draft: '3.5' },
    disabled: { reason: 'No track loaded on deck B' },
  };

  // While the person types, `draft`/`state` are updated without re-rendering so the field keeps
  // its caret and focus; the dirty visuals are painted in place instead.
  attributeChangedCallback(name) {
    if (this._silent) { if (name === 'state') this.syncState(); return; }
    super.attributeChangedCallback(name);
  }

  model() {
    const label = this.attr('label', 'Value');
    const deck = this.attr('deck', '').toUpperCase();
    const min = this.num('min', 0), max = Math.max(this.num('max', 100), this.num('min', 0) + 0.001);
    const unit = this.attr('unit', '');
    const dflt = clamp(this.hasAttribute('default') ? this.num('default', min) : min, min, max);
    const value = clamp(this.num('value', dflt), min, max);
    const step = Math.abs(this.num('step', (max - min) / 100)) || 1;
    const fine = Math.abs(this.num('fine', step / 2)) || step;
    const draft = this.attr('draft', '');
    const bipolar = dflt > min && dflt < max;
    const reason = this.attr('reason', 'Control unavailable');
    return { label, deck, min, max, unit, dflt, value, step, fine, draft, bipolar, reason, state: this.state };
  }

  render() {
    const m = this.model();
    const active = document.activeElement;
    const focusKey = this.contains(active) ? (active.dataset.act ? `[data-act='${active.dataset.act}']` : '.inspector__field') : null;
    const disabled = m.state === 'disabled';
    const dirty = m.state === 'dirty';
    this.className = `inspector raised ${m.deck ? `deck-${m.deck.toLowerCase()}` : 'deck-none'}`;
    const where = m.deck ? `deck ${m.deck}` : 'master';
    const unitSpoken = m.unit || '';
    const detail = (value, extra = {}) => ({ deck: m.deck, label: m.label, value, unit: m.unit, ...extra });
    const send = (v, source) => this.emit('mdj:value', detail(clamp(v, m.min, m.max), { source }));

    const head = h('div', { class: 'inspector__head' }, [
      h('span', { class: 'inspector__title label label-strong', text: `${m.label} · ${where}` }),
      h('span', { class: 'inspector__range numeral', text: `${display(m.min, m.unit, m.bipolar)} … ${display(m.max, m.unit, m.bipolar)}${m.unit ? ' ' + m.unit : ''}` }),
    ]);
    const big = h('div', { class: 'inspector__value ink-backing', 'aria-live': 'polite', 'aria-atomic': 'true' }, [
      h('span', { class: 'inspector__numeral numeral', text: disabled ? '—' : display(m.value, m.unit, m.bipolar) }),
      m.unit ? h('span', { class: 'inspector__unit label', text: m.unit }) : null,
      h('span', { class: 'inspector__ack label', text: disabled ? m.reason : 'Engine value' }),
    ]);

    const btn = (act, label, ic, on, text = null) => h('button', {
      type: 'button', class: `btn btn--secondary inspector__btn inspector__btn--${act}`, dataset: { hit: '48', act }, 'aria-label': label, disabled: disabled ? true : null, on: { click: on },
    }, [ic ? icon(ic, { size: 18 }) : null, text ? h('span', { class: 'btn-label', text }) : null]);

    const field = h('input', {
      type: 'text', inputmode: 'decimal', class: 'inspector__field numeral', value: dirty ? m.draft : display(m.value, m.unit, m.bipolar, true),
      'aria-label': `${m.label} value, ${where}, ${display(m.min, m.unit, m.bipolar, true)} to ${display(m.max, m.unit, m.bipolar, true)}${unitSpoken ? ' ' + unitSpoken : ''}`,
      'aria-invalid': dirty && !Number.isFinite(parseFloat(m.draft)) ? 'true' : undefined, disabled: disabled ? true : null, dataset: { hit: '48' },
      on: {
        input: (e) => {
          this._silent = true;
          this.setAttribute('draft', e.target.value);
          this.setAttribute('state', 'dirty');
          this._silent = false;
          this.paintDirty(e.target.value);
          this.emit('mdj:draft', detail(e.target.value));
        },
        keydown: (e) => {
          if (e.key === 'Enter') { e.preventDefault(); this.apply(m); }
          if (e.key === 'Escape') { e.preventDefault(); this.discard(m); }
        },
      },
    });
    const fine = h('div', { class: 'inspector__fine', role: 'group', 'aria-label': `Fine adjust ${m.label}, ${where}` }, [
      btn('dec', `Decrease ${m.label} by ${m.fine}${unitSpoken ? ' ' + unitSpoken : ''}, ${where}`, 'minus', () => send(m.value - m.fine, 'increment')),
      h('span', { class: `inspector__entry ${dirty ? 'inspector__entry--dirty' : ''}`.trim() }, [
        field,
        h('span', { class: 'inspector__flag label', text: dirty ? 'Unapplied' : `Step ${m.fine}${m.unit ? ' ' + m.unit : ''}` }),
      ]),
      btn('inc', `Increase ${m.label} by ${m.fine}${unitSpoken ? ' ' + unitSpoken : ''}, ${where}`, 'plus', () => send(m.value + m.fine, 'increment')),
    ]);
    const actions = h('div', { class: 'inspector__actions' }, [
      btn('reset', `Reset ${m.label} to ${display(m.dflt, m.unit, m.bipolar, true)}${unitSpoken ? ' ' + unitSpoken : ''}, ${where}`, 'undo', () => this.emit('mdj:reset', detail(m.dflt, { source: 'inspector' })), `Reset · ${display(m.dflt, m.unit, m.bipolar)}${m.unit ? ' ' + m.unit : ''}`),
      dirty ? this.cancelButton(m) : null,
      h('button', {
        type: 'button', class: 'btn btn--primary inspector__btn inspector__btn--apply', dataset: { hit: '48', act: 'apply' }, disabled: disabled || !dirty ? true : null,
        'aria-label': `Apply typed ${m.label}, ${where}`, on: { click: () => this.apply(m) },
      }, [icon('check', { size: 18 }), h('span', { class: 'btn-label', text: 'Apply' })]),
    ]);
    this.replaceChildren(head, big, fine, actions);
    if (focusKey) { const el = this.querySelector(focusKey); if (el) { el.focus({ preventScroll: true }); if (el.classList.contains('inspector__field')) { const n = el.value.length; try { el.setSelectionRange(n, n); } catch { /* not selectable */ } } } }
  }

  cancelButton(m) {
    return h('button', {
      type: 'button', class: 'btn btn--secondary inspector__btn inspector__btn--discard', dataset: { hit: '48', act: 'discard' },
      'aria-label': 'Cancel, discard the typed value', on: { click: () => this.discard(m) },
    }, [icon('x', { size: 18 }), h('span', { class: 'btn-label', text: 'Cancel' })]);
  }
  paintDirty(raw) {
    const valid = Number.isFinite(parseFloat(String(raw).replace('−', '-').replace(',', '.')));
    this.querySelector('.inspector__entry')?.classList.add('inspector__entry--dirty');
    const flag = this.querySelector('.inspector__flag'); if (flag) flag.textContent = valid ? 'Unapplied' : 'Not a number';
    const field = this.querySelector('.inspector__field'); if (field) { if (valid) field.removeAttribute('aria-invalid'); else field.setAttribute('aria-invalid', 'true'); }
    const apply = this.querySelector('.inspector__btn--apply'); if (apply) apply.disabled = !valid;
    if (!this.querySelector('.inspector__btn--discard')) this.querySelector('.inspector__actions')?.insertBefore(this.cancelButton(this.model()), apply);
  }

  apply(m) {
    const raw = this.getAttribute('draft') ?? '';
    const parsed = parseFloat(String(raw).replace('−', '-').replace(',', '.'));
    if (!Number.isFinite(parsed)) return;
    const v = clamp(parsed, m.min, m.max);
    this.emit('mdj:value', { deck: m.deck, label: m.label, value: v, unit: m.unit, source: 'entry', clamped: v !== parsed });
    this.removeAttribute('draft');
    this.setAttribute('state', 'idle');
  }
  discard(m) {
    this.removeAttribute('draft');
    this.setAttribute('state', 'idle');
    this.emit('mdj:discard', { deck: m.deck, label: m.label });
  }
}
define(MdjValueInspector);
