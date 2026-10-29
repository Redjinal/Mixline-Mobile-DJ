# Prototype authoring conventions

Read this before adding a component or a screen. The prototype is **design evidence**: no audio engine, no source adapter, no model, no device measurement. Everything that looks like audio, progress or analysis is a fixture and says so.

Rule set: Documents 03 (interaction), 04 (materials/tokens), 19 (screens and states) and 02 (requirement IDs) in `docs/planning/v1_0/sources/`. Requirement IDs come from `docs/planning/v1_0/contracts/requirements_register.json`.

## 1. Run it

```sh
python3 design/tools/serve.py            # http://127.0.0.1:8765/
node design/tools/smoke.mjs --screen perform/ab --state transition --o landscape --theme lowlight
```

URL shapes: `#/` index · `#/s/<screen-id>?state=<id>&o=portrait|landscape&theme=&tier=&motion=&fontscale=&scenario=&hitbounds=on` · `#/walk/<n>` · `#/gallery`.

The switcher (left panel on desktop, floating button on a phone) changes theme, tier, motion, font scale, orientation, viewport, fixture scenario, hit-bound overlay, inset guides and the device frame.

## 2. Ownership

| Path | Owner | Others may |
| --- | --- | --- |
| `app/`, `tokens/`, `components/base.js`, `components/materials.css`, `components/mdj-fixture-mark.js`, `components/mdj-deck-tab.js`, `fixtures/{tracks,sessions,routes,library,waveforms}.json`, `index.html` | integration lead | read; request changes |
| Foundation components handed to families: `mdj-crossfader.js` → controls · `mdj-transport.js` → transport-pads · `mdj-meter.js` → waveform · `mdj-parday-button.js` → parday · `mdj-route-chip.js` → routing-av (their styles stay in `app/app.css` unless moved into the family CSS by that owner) | named family | read; use |
| `components/families/<family>.js` + `.css` and the `mdj-*.js` files it imports | that component family's agent | read; use |
| `screens/<family>/index.js`, `<family>.css`, `screens/<family>/*.js` | that screen family's agent | read; link to |
| `fixtures/<family>.json` | the family that needs it (create it; load with `ctx.fixtures.family('name')` or `await load('name')`) | read |
| `assets/icons.svg`, `assets/NOTICES.md` | icons agent | use by id |

Never edit another family's files. If you need a shared change, write it in your handoff as a request with the exact diff.

## 3. Tokens and materials

- Colours, spacing, radii, type and motion come from CSS variables in `tokens/tokens.css` (generated from `tokens.json`; run `python3 design/tools/build_tokens.py` after editing). Never hard-code a colour.
- `materials.css` provides `.stage`, `.glass`, `.ink-backing`, `.raised`, `.sunken`, `.titanium`, `.titanium-radial`, `.brass`, `.brass-rim`, `.index-mark`, `.deck-a…d`, `.tone-*`, `.label`, `.numeral`, `.title`, `.body`, `.muted`, `.truncate`, `.wrap-2`.
- Text and numerals always sit on an opaque backing (`.ink-backing`, `.raised`, `.control` surfaces). Glass is decoration; it is never the contrast guarantee.
- Deck identity = letter + label + shape + colour. Set `.deck-a` … `.deck-d` on a container and use `var(--deck)` (text-safe) and `var(--deck-accent)` (luminous, for waveforms/glows), never a raw hex.
- Brass belongs on rims, index marks and grips. Titanium on dial/jog faces, fader thumbs. No gears, steam, parallax or ambient loops.
- Themes: `daylight` (primary), `lowlight` (derived from C), `contrast` (opaque, no blur). Tiers: `essential` (no blur, same hit areas), `balanced` (default), `enhanced`. Test all three themes; the Essential tier must keep every control and label.
- Type: `.label` for control captions (uppercase, tracked), `.numeral` for BPM/time/dB/positions (tabular), `.title` and `.body` for everything else. Sizes `--fs-xs … --fs-xxl` scale with the font-scale setting; layouts must survive 200 %.

## 4. Components

- File `components/mdj-<name>.js`, class `Mdj<Name>` extending `MdjElement` (`components/base.js`), registered with `define(...)`, imported from your family manifest `components/families/<family>.js`. Styles in `components/families/<family>.css`, class prefix `.<name>` / `.<name>__part` / `.<name>--modifier`.
- Light DOM only. Render from attributes in `render()`; re-render on observed attributes. No shadow roots, no frameworks, no external libraries.
- Static contract (all required):

```js
static tag = 'mdj-dial';
static states = ['idle', 'touched', 'pending', 'disabled'];   // used by the gallery and audit
static fr = ['FR-020'];                                      // -> data-fr
static hit = 48;      // 48 default, 56 for transport/pads/deck selectors, 0 if not interactive
static fixture = false; // true if it shows waveform/meter/level/progress/analysis data
static observed = ['value', 'min', 'max', 'unit', 'deck'];
static samples = { default: { value: 0, min: -12, max: 12, unit: 'dB' }, variants: [{}, { size: 64 }], pending: { value: 3 } };
```

- Header comment (required) stating: engine binding (which `EngineCommand`, which revision/generation it carries), units and legal range, gesture, pending/acknowledged behaviour, cancellation (pointer-cancel, background, route loss, rotation), and the accessible alternative.
- Interactive parts carry `data-hit` (the base sets it on the host; put it on the inner `<button>`/slider too). The hit-bound overlay (`hitbounds=on`) must show no overlap with neighbours in any screen that uses the component.
- Accessibility: a real `<button>`, or `role="slider"` with `aria-valuemin/max/now/valuetext`, keyboard operation, and a name that includes deck and parameter ("Filter, deck B, +2.0"). Value components expose numeric entry/increment alternatives where Document 03 requires them.
- `state` attribute mirrors to `data-state`; CSS uses `[data-state='pending']`. Pending/acknowledged visuals must differ. Nothing animates to imply a command succeeded.
- Fixture mark: `static fixture = true` appends `<mdj-fixture-mark>` automatically; keep the host `position: relative` so the mark sits inside it.
- Events: `this.emit('mdj:<verb>', detail)`; screens listen and change state through `ctx.setState`.

## 5. Screens

Module `screens/<family>/<screen>.js`, imported from `screens/<family>/index.js`:

```js
import { register } from '../../app/registry.js';
import { h, button, icon, fmt } from '../../components/base.js';

register({
  id: 'route/check', family: 'routing', title: 'Route check', order: 1,
  fr: ['FR-022', 'FR-023'],
  shell: true,                                   // wrap in <mdj-shell>
  dock: { portrait: true, landscape: true },     // transport dock per orientation
  states: {
    speaker:     { label: 'Phone speaker — not a cue route', exercised: true, scenario: 'set-ready' },
    disconnected:{ label: 'Output lost',                     exercised: false, scenario: 'route-lost' },
  },
  defaultState: 'speaker',
  render(ctx) { /* return one DOM node */ },
});
```

`ctx` = `{ screen, state, stateDef, orientation, scenario, session, fixtures, prototype, navigate, hrefFor, setState }`.
`ctx.session` is the hydrated fixture scenario (decks with resolved tracks, route, master, recording, parday, thermal, storage, network). The shell reads the same object, so a state that needs a different world sets `scenario:` on its state definition.

- **Exercised vs drawn.** `exercised: true` means a tap in the prototype reaches the state (use `ctx.setState('next')` or `ctx.navigate(id, { state })`). `exercised: false` means it is drawn and reachable only through the switcher. Be truthful; the verification report separates them.
- **Both orientations.** Portrait (412 × 892 − insets) and landscape (892 × 412 − insets) are different compositions, not a rotation. Read `ctx.orientation` and use `:root[data-orientation='landscape'] .yourfamily-…` in CSS. Landscape perform-type screens that draw their own transport set `dock.landscape = false`.
- **Shell screens** keep the performance shell: in portrait the content area is about 412 × 600 dp; in landscape about 892 × 260 dp with the dock. Browsing, pads, FX, stems, queue, sources and ParDay (Perform) are shell screens. Launch/import/preparation/settings-type screens are not.
- **Controls** carry `data-fr="FR-0xx"` and `data-hit`. Use `button({...})` from base.js for plain buttons. Transport and pads are 56 dp; everything else ≥ 48 dp; no overlaps.
- **Required states** for your family are in Document 19 §4 (and §9 below). Every state has a useful next action; unavailable things say why.
- **Honesty.** No fabricated percentages: unknown progress is "unknown". Waveforms, meters, levels, analysis, download progress show a FIXTURE mark (use fixture components or add `<mdj-fixture-mark for="…">` inside a `position: relative` box). Nothing says "Done" without an acknowledged state in the fixture.
- **Long titles, 200 % font scale, colour-independent identity, reduced motion** are part of every screen's definition of done. Use the `longtitle` track somewhere visible.
- **Text** is real copy, not lorem. Labels follow Document 03's vocabulary: Load A/B/C/D, Seek, Cue, Play, Sync, Arm transition, Apply to preparation, Preview, Stop Automation, Cancel download.
- No lighting, no external-controller mapping, no AWS setup in first-run, no A-theme, no Mixline.

## 6. Canonical screen IDs

| Family | IDs |
| --- | --- |
| launch | `launch/open`, `launch/import`, `launch/library`, `launch/crates` |
| preparation | `prep/track` |
| routing | `route/check`, `route/readiness` |
| performance | `perform/ab`, `perform/focus-map`, `perform/mixer`, `perform/master` |
| pads | `pads/pads`, `pads/loops`, `pads/fx`, `pads/stems` |
| sampler | `sampler/banks`, `sampler/sequencer` |
| queue | `queue/queue` |
| recording | `rec/panel`, `rec/history` |
| sources | `sources/add`, `sources/resolve`, `sources/format`, `sources/queue` |
| parday | `parday/prepare`, `parday/perform`, `parday/arm` |
| av | `av/video`, `av/karaoke`, `av/broadcast`, `av/mic` |
| system | `system/plugins`, `system/settings`, `system/diagnostics`, `system/backup`, `system/recovery` |

The walkthrough (`app/walkthrough.js`) references these exact screen/state ids: `launch/open` {`empty`, `resume-missing`}, `launch/import` {`partial`}, `prep/track` {`uncertain`, `edited`}, `route/check` {`speaker`}, `perform/ab` {`protected-load`, `transition`}, `rec/panel` {`recording`}, `rec/history` {`saved`}, `system/recovery` {`route-lost`}. They must exist with those names.

Cross-links other families expect: `ctx.navigate('launch/library')` for browse, `route/check`, `parday/perform`, `perform/master`, `rec/panel`, `sources/add`.

## 7. Fixtures

Shared: `fixtures.tracks`, `fixtures.track(id)`, `fixtures.scenario(id)`, `fixtures.route(id)`, `fixtures.library`, `fixtures.waveform(trackId)` (peaks/rms/lows/highs arrays, beats, downbeats, `uncertainAfterSec`). Family data goes in `fixtures/<family>.json` with a `_fixture` note; load it with `await ctx.fixtures.family('parday')` inside `render` (render may return a container and fill it when the promise resolves) or import `load` from `app/fixtures.js`.

Fixture tracks: `aurora`, `copper`, `glasswork` (analysis pending), `tide` (low grid confidence), `brass` (missing), `north`/`north-dup` (duplicates), `soda-radio`/`soda-ext` (download, ambiguous edit), `velvet` (permission missing, explicit), `zinc` (unsupported DRM), `longtitle`, `calypso` (locked grid, explicit), `drift`, `demo-1`, `demo-2`.
Scenarios: `fresh`, `set-ready`, `a-playing`, `transition`, `clipping`, `four-deck`, `route-lost`, `recording`, `missing-media`, `low-storage`, `offline`, `hot`.

## 8. Checking your work

1. Open each screen in both orientations and all three themes; at font scale 200 %; with `hitbounds=on`. No overlaps, nothing clipped, nothing unreadable.
2. `node design/tools/smoke.mjs --screen <id> --all-states` writes screenshots to `design/previews/_smoke/` and fails on console errors.
3. Every declared state renders; every `exercised: true` state is reachable by a tap from the default state or a named prior state (say which, in the state's `from` field).
4. Report in your handoff: screens/components added, states (exercised/drawn), FR ids used, fixtures added, icons you need from the icons agent, and anything you could not satisfy.

## 9. Required states per family (Document 19 §4)

launch: empty, missing file, partial import, duplicate, no results, offline, analysis pending · preparation: uncertain, edited/locked, undo, pending analysis, save failure · routing: no isolated cue, split mono, unsupported route, disconnected · performance: empty/loading/playing/paused, held touch, pending quantized action, clipping, protected load · pads: bank/mode, edit, pending/active latch, unavailable stems, resource refusal · sampler: empty slot, sounding pattern, queued next-bar revision, immediate/quantized stop · queue: missing next track, committed transition, expired edit, manual takeover · recording: restricted source, full storage, interrupted writer, recoverable segment · sources: matching, ambiguous version, unavailable adapter, format/quality, progress unknown, cancel, validate, ready · parday: local only, thinking, stale proposal, needs review, applied, cost limit, unavailable · av: preview/program distinction, singer queue, mic assignment, disconnected receiver, restricted source · system: missing/failed plugin, bypass, dirty/save/discard settings, restore mismatch.
