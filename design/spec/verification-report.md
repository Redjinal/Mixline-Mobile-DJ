# Verification report — Crystal Current design prototype

Date: 31 October 2026. Branch: `design/crystal-current-prototype`.

This report keeps four kinds of status apart, as Document 19 §7 and `CLAUDE.md` require. "Checked" below means a script measured the prototype in a desktop Chromium. It does not mean `verified` in the planning-pack sense.

| Kind | Status |
|---|---|
| Functional | **Not implemented.** No Android app, audio engine, acquisition adapter, store or model exists. Every waveform, meter, level, progress figure and analysis value is a fixture and is labelled FIXTURE on screen. |
| Visual | **Prototype, checked in desktop Chromium.** All screens and states render in both orientations, three themes and three font scales. Native rendering is unverified. |
| Physical device | **None.** The Galaxy S26 Ultra has not been measured. The 412 × 892 dp canvas is an assumption. |
| Asset rights | **Recorded, not reviewed.** Fonts are SIL OFL 1.1 and icons are Lucide (ISC, some MIT) with notices and checksums; everything else is original. See `asset-manifest-updates.md`. No register row is marked verified. |

## What exists

- **Screens:** 36 screens in 12 families, every state drawn in portrait and landscape. Families: launch, preparation, routing, performance, pads, sampler, queue, recording, sources, ParDay, audio/video, system.
- **Components:** six families of light-DOM web components, plus the foundation shell, rendered in `#/s/foundation/gallery`.
- **Tokens:** `tokens/tokens.json` version 0.5-prototype, with every change from the planning pack logged in `tokens/CHANGELOG.md`.
- **Walkthrough:** the 11-scene first-mix journey from Document 19 §3 (`#/walk/1`).

## Automated checks (final run)

Commands, from the repository root:

```sh
node design/tools/audit.mjs --states all --themes all
node design/tools/check_interactions.mjs
```

| Check | Result |
|---|---|
| Renders measured (36 screens × every state × 2 orientations × 3 themes) | 1,584 |
| Interactive targets below their 48 or 56 dp class | 0 |
| Overlapping targets in the same layer | 0 |
| Interactive elements without a hit-size marker | 0 |
| Text below WCAG AA contrast (4.5:1, or 3:1 for large text) | 0 |
| Data displays without a FIXTURE mark | 0 |
| Requirement IDs not in the register | 0 |
| Console errors | 0 |
| Horizontal overflow of the device | 0 |
| Required states per family (Document 19 §4) present | 12 of 12 families |
| Declared tap paths into exercised states, both orientations | 272 of 272 pass |
| Walkthrough scenes that resolve to a real screen state | 11 of 11 |

Each family's author also rendered its screens at 200 % font scale and in the Essential tier with the hit-bound overlay, and opened the images. Those renders are not part of the audit totals above.

## Limits of these checks

- The audit measures geometry and colour in the DOM. It cannot judge craft, hierarchy or whether a DJ can use the layout under pressure.
- The contrast check reads ancestor background colours. Text drawn over a sibling layer or a pseudo-element needs an explicit backing to be measured; the prototype now gives it one wherever the audit found the gap.
- Overlaps between a modal or bottom sheet and the page beneath it are not counted, because a tap lands on the sheet.
- The component families were authored and self-checked, but the independent refuting review planned for them did not run because of usage limits. Screen families were checked by their authors and then by this integrated audit.
- Fonts render from the bundled files in Chromium. Android text rendering at 100, 130 and 200 % has not been seen.

## Defects found and fixed during integration

- Tertiary text colour failed contrast on small labels in daylight and low-light; the token was changed and the changelog's earlier pass claim corrected.
- The ParDay plan header and note were about 1.5:1 on a brushed face in low-light.
- Live and ON AIR words were 2.5:1 on low-light red.
- Search and crate-name inputs were under 48 dp and unmarked.
- Karaoke steppers collided in landscape.
- The landscape dock meter ran off the device in the clipping state.
- Byte sizes printed binary values with decimal units.
- Several fixtures contradicted each other (smart-crate results, a route claiming cue isolation without a cue path, a recording estimate that did not match free space).

## Still open

See `interaction-notes.md` "Open component changes" for component requests not yet made. None of them blocks a state; each has a screen-level stand-in.

## What would make any of this verified

1. Native implementation of the shell and the performance screen on the S26 Ultra, with measured dp, insets and touch latency.
2. A DJ walking the first-mix journey on the device.
3. The asset acceptance reviews named in the register (DJ symbol comprehension, originality, native conversion).
4. Engine, analysis and routing contracts from Documents 06 and 15 replacing the fixtures.
