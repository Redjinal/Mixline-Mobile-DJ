# Verification report — Mixline 6.0.0 — 2026-10-29

## Scope verified
- Screens / workflows: Decks (dual and focus), Mixer, Pads, FX, Library (search, inspector, prepare, favourites, crates, recents, sources setup), Challenge (queue, offline player states), Settings (search, preview, save, discard protection), recording, sessions and recovery, keyboard shortcuts, Android bridge callbacks.
- Viewports actually tested: 360×740, 412×915, 915×412, 1280×800 CSS px (Chromium, touch enabled).
- Method: Playwright 1.x + headless Chromium with real Web Audio (autoplay allowed); node:test for logic. Evidence: `docs/verification/6.0/*.png`, `*-results.json`, `node-tests.txt`.
- Fresh-context code review (after Task 13): seven Important findings, all fixed in one pass with a failing test first (per-deck rendering so a held gesture survives the other deck loading; focus-view mode switch; Decks crossfader following the engine; transition EQ/echo hand-back; Settings patched in place; artwork fallback; async shortcut errors). Minor findings are listed under "Known limitations" below.

## Functional gate
| Check | Result | Evidence | Notes |
|---|---|---|---|
| Primary journey end-to-end (load two originals, play, navigate all workspaces, scratch, sync, focus view, replace protection) | PASS | journey-results.json (23/23) | Real audio clock advances across navigation. |
| Live gestures survive background changes (scratch held on Deck 1 while Deck 2 decodes; first gesture after a waveform-mode switch); Decks crossfader follows the engine | PASS | journey "a held scratch on Deck 1 survives Deck 2 loading"; focus-view check | Added after the fresh-context review found wholesale re-renders tearing down controls. |
| Transition hand-back (bass swap / echo out restore the outgoing deck's EQ and echo on completion) | PASS | engine.test.mjs | |
| Settings controls update in place (range keeps focus and keyboard steps; selects are not replaced); toasts never cover the save bar; Android back asks before discarding | PASS | journey settings check | |
| Artwork that fails to load falls back to the original cover (library rows, deck heads, video thumbnails) | PASS | journey library artwork check | |
| Keyboard shortcuts on an empty deck report a toast, never a page error | PASS | journey keyboard check | |
| Empty / loading / error / success states | PASS | journey (empty deck, cancelled load, blocked video, filtered-empty library, save toasts) | |
| Long content extremes | PASS | journey "long title truncates without overflow"; screens 360×740 | |
| Filters (chips, counts, no dead ends) | PASS | journey library checks; applied chips with Clear all | URL state is not applicable (single-screen app). |
| Timeout / retry safety | PASS | queue + video unit tests; offline YouTube shows an honest error with Retry | |
| Settings (save, dirty protection, search, reset preview) | PASS | journey settings check; settings.test.mjs | |
| Keyboard-only journey | PASS (shortcuts) | journey keyboard check; controls expose roles and arrow keys | Full tab-order audit not performed. |
| Reduced motion | PASS | screens "reduced motion keeps controls usable" (`--t-med` = 0ms) | |
| Touch targets / hover equivalents | PASS by construction | 48 px transport / pads, 44 px secondary; verified visually at 360 px | Not measured element by element. |
| Engine, sources, store, queue, sessions logic | PASS | node-tests.txt (103/103) | |

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
- GitHub Actions (verified): run 40795974765 on commit 85c959c passed both jobs — Web tests (103 unit tests, 67 browser checks on the runner's Chromium 131) and Android test APK (artifact `Mixline-APK`, 2.2 MB, signed with a CI-generated testing key because no `MIXLINE_KEYSTORE_BASE64` secret is set). The first two runs had failed only in checks that assumed YouTube was unreachable (the runner can reach it) and in a Settings step a toast could cover; both are fixed and the journeys now record app state on any failure. Installing and running that APK on a phone remains unverified.

## Known limitations (deferred from review, by user effect)
- 5.0 preferences, Challenge queue and saved sessions are not migrated (the library and its tracks are); 5.0 sessions list as empty and cannot be restored. A one-time migration is the natural next task.
- No offline notice; Library offers delete but no relink for missing local files; transitions are set in bars only (120 BPM assumed when a deck has no tempo); loop regions have no draggable handles.
- The crossfader centre detent is applied for both curves; the light theme applies after storage opens (brief dark flash on cold start).
- Platters, waveforms and meters each own an animation loop even when paused; acceptable on desktop, unmeasured on a phone.
- Every successful load rewrites the track row (including the audio blob) to persist peaks; large local files pay that write once per load.
- Browser checks not yet written: the loading overlay's Cancel, Pads In / Out, file import, FX "Both".

## Retention hypotheses (not claims)
- Persisted preparation and recovery snapshots make returning to a set faster; unmeasured.
