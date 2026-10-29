# Crystal Current design prototype — specification

**Date:** 29 October 2026
**Status:** Approved approach (B) — design artefact, not application code
**Branch:** `design/crystal-current-prototype`
**Source brief:** `docs/planning/v1_0/sources/19_Design_Start_and_Local_First_Handoff.md`, with Documents 02, 03, 04, 08, 12, 13, 14, 15 and 16 as the rule set.

## 1. Purpose

Produce the first connected design for the Mobile DJ app (working label) as an editable, navigable **HTML design prototype** in the selected **C — Crystal Current** direction, covering the complete screen inventory in portrait and landscape at high fidelity, with every required state reachable and every control traced to a requirement ID.

It is design evidence only. It contains no audio engine, no source adapter, no model and no device measurement. Every waveform, meter and progress element is a labelled fixture.

## 2. Owner decisions carried into this prototype

| Decision | Consequence here |
| --- | --- |
| Local Android first; AWS later | No server pairing, cloud account or AWS screen in the first-run journey. AWS appears only as an inert "later extension" row in settings. |
| Galaxy S26 Ultra first; build not captured | Default canvas is a **labelled assumption** of 412 × 892 dp; a viewport picker offers 412 × 915 and "fill this window". |
| C Crystal Current | Pale frosted glass, titanium, restrained brass, dark-ink labels on opaque backing. A is never shown. Low-light and high-contrast are derived from C. |
| Full professional scope minus lighting and external controllers | All twelve screen families are designed. No lighting controls or placeholders. |
| Phone speaker / Bluetooth first | The route-check scene leads with "not a cue route"; USB-C stereo, DJ splitter and multichannel are secondary states. |
| ParDay option C | Read/propose in Perform until a bounded plan is armed; separate Preview / Apply to preparation / Arm transition; persistent Stop Automation. |
| Link-to-file acquisition requested | Sources/downloads screens follow the Document 16 state machine, with actual-source and declared/measured quality visible. |
| Deliverable: HTML prototype, hi-fi everything, pack in `docs/planning/v1_0` | This document. |

## 3. Deliverables

1. `design/prototype/` — the runnable prototype (no build step; static files).
2. `design/spec/` — screen/state index, control→requirement map, token change log, interaction notes, asset manifest updates and the verification report.
3. `design/previews/` — PNG exports of every screen × orientation (daylight) and of the journey scenes in all three themes, plus a contact sheet.
4. A private published link to the prototype so the owner can open it on the phone.

## 4. Architecture (approach B)

### 4.1 Directory layout

```text
design/
  README.md                     how to run, audit, export and publish
  prototype/
    index.html                  app shell: device frame, state switcher, router outlet
    CONVENTIONS.md              authoring rules for components and screens
    app/
      state.js                  global prototype state (theme, tier, motion, font scale,
                                orientation, viewport, scenario, hit-bound overlay)
      router.js                 hash routes: #/s/<screen-id>?o=portrait&state=<state-id>
      shell.js                  persistent performance shell (deck selectors, Play/Cue,
                                crossfader, master/route/record strip)
      walkthrough.js            the six Document 19 journey scenes in order
      fixtures.js               loads and indexes fixtures/*.json
      registry.js               screen registry
      switcher.js               state switcher panel
    tokens/
      tokens.json               extended C tokens (source of truth)
      tokens.css                generated CSS custom properties per theme/tier
      CHANGELOG.md              every change relative to the pack's proposed tokens
    components/
      base.js                   MdjElement base class: attributes, hit bounds, fr ids,
                                fixture marks, accessible names
      materials.css             glass / titanium / brass / ink-backing recipes
      mdj-*.js                  one file per component
      gallery.js                auto-generated component × state gallery screen
    screens/
      <family>/<screen>.js      one module per screen; declares states and FR ids
    fixtures/
      tracks.json library.json sessions.json routes.json parday.json
      acquisition.json plugins.json video.json waveforms.json (generated)
    assets/
      icons.svg                 sprite: Lucide subset (ISC, with notice) + original DJ symbols
      NOTICES.md
  spec/
  previews/
  tools/
    serve.py                    static server
    build_tokens.py             tokens.json -> tokens.css
    gen_waveforms.py            deterministic fixture peak arrays
    export_previews.mjs         Playwright screenshots + contact sheet
    audit.mjs                   Playwright audit (hit bounds, overlap, contrast,
                                required states, FR mapping)
    build_spec.mjs              generates the index/map/report tables from the registry
```

### 4.2 Runtime model

- **1 CSS px = 1 dp.** Opened in the phone's browser, a 48 px target is 48 dp.
- The root carries `data-theme` (`daylight` | `lowlight` | `contrast`), `data-tier` (`essential` | `balanced` | `enhanced`), `data-motion` (`full` | `reduced`), `data-fontscale` (`100` | `130` | `200`), `data-orientation` (`portrait` | `landscape`), `data-hitbounds` (`on` | `off`) and `data-scenario`.
- `prefers-reduced-motion` and `prefers-contrast` set the initial motion and theme; the switcher can override.
- Insets: a 24 dp status bar and a 16 dp gesture bar are drawn as guides and reserved by layout; both are adjustable in the switcher because the real values are unmeasured.

### 4.3 Components

Light-DOM custom elements prefixed `mdj-`, extending `MdjElement`. Each declares:

- `static states` — the named visual states it supports, used by the gallery and audit;
- `static fr` — requirement IDs it serves, emitted as `data-fr`;
- `hit` — the hit-bound class: `48` (default) or `56` (transport, pads, deck selectors); the base enforces `min-width/height` and draws the overlay when `data-hitbounds="on"`;
- an accessible name and role, with value/unit/range for value controls;
- a `pending` and `ack` state for engine-bound controls, plus a documented cancellation behaviour in its header comment;
- a **fixture mark** (`<mdj-fixture-mark>`) whenever it shows waveform, meter, level, progress or analysis data.

Canonical set (Document 04 §4 plus Document 19 §4): deck summary, waveform lane (overview + detailed) with cue/loop/grid/phrase markers, dial (gain/EQ/filter), jog, pitch rail, channel fader, crossfader, transport button (Play/Cue/Sync), performance pad, XY pad, meter, source capability chip, filter chip, badge, library row, status strip, workspace switcher, sheet/dialog, settings row, ParDay button, ParDay proposal card family, route diagram, queue item, progress row, step grid, video preview frame, plugin slot.

### 4.4 Screens

One module per screen, registered in `app/registry.js`:

```js
export default {
  id: 'perform/ab',            family: 'performance',
  title: 'Perform — A/B',      fr: ['FR-010', 'FR-020', ...],
  shell: true,                 // renders inside the persistent performance shell
  orientations: ['portrait', 'landscape'],
  states: {
    playing:   { label: 'A playing, B cued', exercised: true },
    protected: { label: 'Protected load on audible deck', exercised: true },
    clipping:  { label: 'Master clipping', exercised: false },   // drawn only
  },
  render(ctx) { /* returns a DOM node for ctx.orientation / ctx.state */ }
}
```

`exercised: true` means the state is reached by an interaction in the prototype; `false` means it is drawn and reachable only through the switcher. The verification report separates the two.

### 4.5 Screen inventory (all portrait + landscape, hi-fi)

| Family | Screens | Essential states (Document 19 §4) |
| --- | --- | --- |
| Launch, library, crates | open-or-resume, import, library (docked and full), crates/playlists | empty, missing file, partial import, duplicate, no results, offline, analysis pending |
| Track preparation | prepare (grid/cue edit) | uncertain, edited/locked, undo, pending analysis, save failure |
| Readiness and routing | route check, readiness summary | not a cue route (primary), USB-C stereo, split mono, unsupported, disconnected |
| Performance/mixer | perform A/B, A–D focus map, mixer panel, master panel | empty/loading/playing/paused, held touch, pending quantized action, clipping, protected load, seek lock |
| Pads, loops, FX, stems | pads, loops, FX + XY, stems | bank/mode, edit, pending/active latch, unavailable stems, resource refusal |
| Sampler/sequencer | sampler banks, step pattern | empty slot, sounding pattern, queued next-bar revision, immediate/quantized stop |
| Queue/automix | queue | missing next track, committed transition, expired edit, manual takeover |
| Recording/history | record panel, history/sessions | restricted source, full storage, interrupted writer, recoverable segment |
| Sources/downloads | add music, resolution, format choice, download queue | matching, ambiguous version, unavailable adapter, format/quality, progress unknown, cancel, validate, ready, blocked |
| ParDay | prepare panel, perform panel, arm sheet | ready, local only, thinking, proposal ready, needs review, applied, rejected, unavailable, cost limit, stale |
| Video/karaoke/broadcast/mic | video, karaoke, broadcast, microphone | preview/program distinction, singer queue, mic assignment, disconnected receiver, restricted source |
| Plugin rack/settings/recovery | plugin rack, settings, diagnostics, backup/restore, recovery | missing/failed plugin, bypass, dirty/save/discard, restore mismatch, interrupted session |

### 4.6 Journey walkthrough

Scenes 1–6 of Document 19 §3 are sequenced by `walkthrough.js` with a caption bar ("Scene 3 of 6 — Check output") and a next/previous control that sits outside the device canvas. Each scene names the screen, the state and the interaction that advances it.

### 4.7 Fixtures and honesty rules

- Fixtures are fictional: AURORA DRIVE, COPPER SKY and additional invented tracks; sessions, routes, proposals and acquisition jobs are hand-authored JSON.
- `gen_waveforms.py` synthesises deterministic peak arrays (seeded per track). They are labelled fixtures, not analysis.
- `<mdj-fixture-mark>` is rendered by every waveform, meter, level, progress and analysis element and cannot be hidden by the switcher.
- Progress is never a fabricated percentage; unknown progress is labelled unknown.
- Colour never carries meaning alone: deck letters, shapes and text accompany it.

### 4.8 Themes and tiers

- **Daylight** (primary) uses the pack's C values. **Low-light** is derived from C (deeper mineral stage, same role mapping); it is not A. **High-contrast** uses opaque surfaces, stronger separators and no decorative blur.
- **Essential** tier: opaque fills, vector bevels, no `backdrop-filter`. **Balanced** (default): bounded glass blur on panels, static metal detail. **Enhanced**: richer edge light; still no motion behind a live surface.
- Reduced motion removes ornamental travel; engine-driven elements keep their meaning.

### 4.9 Fonts and icons

- Barlow (UI) and IBM Plex Mono (numerals) are loaded from Google Fonts with a system fallback using tabular numerals. AS-02/AS-03 remain *shortlisted*; no font files are acquired by this prototype.
- Icons: a Lucide subset (ISC, notice in `assets/NOTICES.md`) for general symbols; DJ symbols (AS-05) are original vectors drawn for this prototype.

### 4.10 Tooling

- `tools/serve.py` serves the prototype locally (ES modules need HTTP).
- `tools/audit.mjs` loads every screen × orientation × theme and reports: interactive targets under 48 px (56 px for transport/pads/deck selectors), overlapping hit bounds, text contrast below WCAG AA against its opaque backing, missing essential states per family, and `data-fr` values absent from `requirements_register.json`.
- `tools/export_previews.mjs` renders previews at 2× and a contact sheet.
- `tools/build_spec.mjs` generates the screen-state index and control→requirement map from the registry.

### 4.11 Publishing

The prototype is published as a private artefact (multi-file) so it can be opened on the S26 Ultra. Publishing is not a release and makes no claim beyond the design status recorded in the verification report.

## 5. Acceptance (Document 19 §7)

The design pass is accepted when:

1. The owner can follow the local first-mix journey through the six scenes.
2. Portrait and landscape keep the same musical meaning and control identities.
3. Transport, crossfader, route status and master remain reachable while browsing or using ParDay.
4. Four-deck focus (A–D) and every specialist destination are navigable.
5. Every family's essential states exist and have a useful next action.
6. Long titles, 200 % font scale, colour-independent identities, reduced motion, route ambiguity, stale proposals and unknown progress are all exercised.
7. The audit reports zero sub-minimum targets and zero overlapping hit bounds in the performance shell, and no AA contrast failures on essential text.
8. The verification report states **functional status: not implemented**, **visual status: prototype, native unverified**, **physical-device evidence: none**, **asset rights: fonts shortlisted / icons ISC + original / fixtures original**.

## 6. Work plan

| Phase | Work | Method |
| --- | --- | --- |
| 0 | Spec, foundation (tokens, materials, base, shell, router, fixtures, conventions, tools) | Inline, then smoke-rendered with Playwright |
| 1 | Component families | Parallel agents per family; reviewers refute each against Documents 03/04 |
| 2 | Screens: journey scenes first, then the remaining families | Parallel agents per family; reviewers refute against Document 19 §4 states and Document 03 rules |
| 3 | Walkthrough wiring, switcher completeness, audit/fix loops, previews, spec documents, verification report | Workflow with loop-until-dry adversarial passes |
| 4 | Publish, commit, push, hand back remaining engineering evidence | Inline |

## 7. Non-goals

No audio, no engine contract implementation, no provider calls, no file access, no Android project, no asset procurement, no device measurement, no claim of 48 dp on the physical phone until measured there.

## 8. Risks

- Unmeasured viewport: mitigated by the viewport picker and labelled guides.
- Visual drift across parallel agents: mitigated by shared tokens, materials and the gallery review.
- Fixture dishonesty: mitigated by mandatory fixture marks and audit.
- Scope: hi-fi everything is large; journey scenes are built first so the core is right before breadth.
