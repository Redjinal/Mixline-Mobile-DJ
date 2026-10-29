# Verification report — Mixline 6.0.0 — 2026-10-29

## Scope verified
- Screens / workflows: Decks (dual and focus), Mixer, Pads, FX, Library (search, inspector, prepare, favourites, crates, recents, sources setup), Challenge (queue, offline player states), Settings (search, preview, save, discard protection), recording, sessions and recovery, keyboard shortcuts, Android bridge callbacks.
- Viewports actually tested: 360×740, 412×915, 915×412, 1280×800 CSS px (Chromium, touch enabled).
- Method: Playwright 1.x + headless Chromium with real Web Audio (autoplay allowed); node:test for logic. Evidence: `docs/verification/6.0/*.png`, `*-results.json`, `node-tests.txt`.

## Functional gate
| Check | Result | Evidence | Notes |
|---|---|---|---|
| Primary journey end-to-end (load two originals, play, navigate all workspaces, scratch, sync, focus view, replace protection) | PASS | journey-results.json (21/21) | Real audio clock advances across navigation. |
| Empty / loading / error / success states | PASS | journey (empty deck, cancelled load, blocked video, filtered-empty library, save toasts) | |
| Long content extremes | PASS | journey "long title truncates without overflow"; screens 360×740 | |
| Filters (chips, counts, no dead ends) | PASS | journey library checks; applied chips with Clear all | URL state is not applicable (single-screen app). |
| Timeout / retry safety | PASS | queue + video unit tests; offline YouTube shows an honest error with Retry | |
| Settings (save, dirty protection, search, reset preview) | PASS | journey settings check; settings.test.mjs | |
| Keyboard-only journey | PASS (shortcuts) | journey keyboard check; controls expose roles and arrow keys | Full tab-order audit not performed. |
| Reduced motion | PASS | screens "reduced motion keeps controls usable" (`--t-med` = 0ms) | |
| Touch targets / hover equivalents | PASS by construction | 48 px transport / pads, 44 px secondary; verified visually at 360 px | Not measured element by element. |
| Engine, sources, store, queue, sessions logic | PASS | node-tests.txt (102/102) | |

## Visual gate
| Check | Result | Notes |
|---|---|---|
| Direction brief exists and is followed | PASS | docs/DESIGN-6.md; boards' palette, materials and components applied. |
| Typography system | PASS | Inter, micro labels, tabular numerals. |
| Colour roles, light + dark | PASS | Light theme rendered (mixer-light-412x915.png); dark is primary. |
| Composition / hierarchy | PASS | Reviewed captures at four viewports. |
| Density matches usage | PASS | Compact instrument density; desktop capped widths. |
| Brand preserved | PASS | MIXLINE wordmark and deck identities as in the boards. |

## Accessibility
- Roles: sliders (knobs, faders) with aria-value*, tabs with aria-selected, switches with aria-checked, dialogs via `<dialog>`, status text next to every colour cue.
- Contrast: text on obsidian passes by inspection; small 9–10 px micro labels are decorative duplicates of larger text or icons. Automated audit: NOT VERIFIED.
- Focus: visible 2 px violet outline on all controls.

## Performance (lab — headless Chromium, not a phone)
- LCP / INP / CLS: NOT VERIFIED. Waveform and platter rendering use requestAnimationFrame with cached peak backgrounds; meters at 60 fps. Physical S26 Ultra thermal and latency behaviour remain to be measured (see DEVICE-TESTING.md).

## Assets
- Provenance recorded in docs/DESIGN-6.md: Inter (OFL), original SVG covers and icons. No paid assets.

## Not verified / needs real-device evidence
- Android WebView audio latency, haptic feel per kind, audio focus and headphone-unplug handling, document picker import and export, APK install and update over the 5.0 test build (new signing key unless the old keystore is supplied).
- Live Audius / Jamendo / Internet Archive / Wikimedia requests and actual stream decoding; live YouTube embedded playback and cut behaviour. Both hosts were blocked from the build environment; adapters are unit-tested with controlled responses.
- GitHub Actions run of the APK build (the workflow is new).

## Retention hypotheses (not claims)
- Persisted preparation and recovery snapshots make returning to a set faster; unmeasured.
