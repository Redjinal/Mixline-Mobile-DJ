# Mixline 6 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recreate the Mixline mobile DJ app as a premium, readable, tested web instrument in the supplied boards' design language, inside the existing Android WebView shell, with CI producing the test APK.

**Architecture:** Static vanilla ES-module web app in `web/` (no bundler, no runtime dependencies). `MixEngine` owns the Web Audio graph and all deck state; screens are thin views over it and re-render on engine `change` events, with canvas/rAF for waveforms, platters and meters. The Java shell is kept and updated; GitHub Actions builds the APK.

**Tech Stack:** HTML/CSS/JS (ES2022 modules), Web Audio, Canvas 2D, Pointer Events, IndexedDB, MediaRecorder, YouTube IFrame API; Node 22 `node --test`; Playwright + Chromium; Gradle/AGP 8.13 (CI only).

**Spec:** `docs/superpowers/specs/2026-10-28-mixline-6-design.md`

## Global Constraints

- Deck colours: Deck 1 `#FF3B3B` red, Deck 2 `#00E5FF` cyan; violet `#A855FF` creative; obsidian `#0B0B0D`; warm text `#EDE6DD`. Alternative palette Violet/Teal via `data-decks="violet"`.
- No external network assets at runtime: Inter is bundled at `web/assets/fonts/Inter-latin.woff2`; icons are inline SVG.
- Primary touch targets ≥ 48 CSS px; secondary ≥ 44 px.
- IndexedDB name stays `mixline-studio-4` version 1 so existing libraries survive the update. Android package stays `com.mixline.studio.testing`; version `6.0.0` / code `60000`.
- No fabricated data: BPM/key/duration shown only when supplied or measured; otherwise `—`.
- Every engine action applies to the audio graph immediately; UI animation never gates input.
- Tests run with `npm test` (node) and `npm run test:browser` (Playwright against `npm run serve` on port 8080).

## Review Focus

- A load that fails or is cancelled while the other deck plays: the playing deck's clock and track must be untouched (engine test "failed replacement preserves…", browser load-cancel check in Task 8).
- Navigation while a finger holds Cue, a platter or the XY puck: transient states release on `pointercancel`/unmount without stopping the whole mix (Task 6/7 browser checks).
- Rotation or viewport change mid-gesture: controls re-measure on `pointerdown`, never cache bounds across layouts (Task 5 fader/knob tests use `getBoundingClientRect` per gesture).
- Long titles, missing artwork and unknown BPM in rows, dock and deck headers: text truncates with ellipsis, fallback cover renders, `—` shows (Task 8 fixture rows).
- Settings navigated away with unsaved changes: draft is protected, persisted values unchanged (Task 10 browser check).

---

### Task 1: Foundation and shell

**Files:**
- Create: `web/index.html`, `web/manifest.webmanifest`, `web/assets/fonts/Inter-latin.woff2`, `web/css/tokens.css`, `web/css/base.css`, `web/css/layout.css`, `web/css/components.css`, `web/css/screens.css`
- Create: `web/js/ui/dom.js`, `web/js/ui/icons.js`, `web/js/ui/toast.js`, `web/js/ui/dialog.js`, `web/js/shell/router.js`, `web/js/shell/nav.js`, `web/js/main.js`
- Modify: `package.json` scripts: `test`, `serve`, `test:browser`
- Test: `tests/browser/smoke.mjs`

**Interfaces:**
- Produces: `dom.js` → `$(sel, root)`, `$$(sel, root)`, `esc(text)`, `html(strings, ...values)` tagged template that escapes interpolations unless wrapped by `raw(str)`, `render(el, htmlString)`, `delegate(root, event, selector, handler)`; `icons.js` → `icon(name, {size=20, className})` returning an SVG string for names: play, pause, cue, sync, loop, fx, pads, mixer, decks, library, challenge, settings, record, lock, unlock, search, filter, more, chevronLeft, chevronRight, chevronDown, check, warning, info, close, plus, drag, headphones, speaker, video, cloud, music, folder, star, starFilled, clock, trash, download, upload, link, scissors, next, reset, heart, heartFilled, eject, tap; `router.js` → `createRouter(routes)` with `navigate(name, params)`, `current` `{name, params}`, `subscribe(fn)`, `back()`; `toast.js` → `toast(message, {kind:'info'|'success'|'warning'|'error', timeout})`; `dialog.js` → `confirmDialog({title, body, confirmLabel, danger})`, `promptDialog({title, label, value, validate})`, `sheet({title, body})` returning `{close}`.
- `tokens.css` defines `--bg`, `--surface`, `--surface-2`, `--raised`, `--line`, `--line-strong`, `--text`, `--text-muted`, `--text-dim`, `--deck1`, `--deck2`, `--violet`, `--green`, `--amber`, `--danger`, `--glow-1`, `--glow-2`, `--glow-v`, `--radius-s/m/l/xl`, `--space-1..8`, `--font`, `--ease`, `--t-fast`, `--t-med`; `[data-decks="violet"]` swaps deck tokens; `[data-theme="light"]` swaps neutrals; `[data-motion="reduced"]` zeroes `--t-*`.

- [ ] Step 1: Write `tests/browser/smoke.mjs` asserting: page loads with no `pageerror`, `nav [data-route]` count is 6, clicking `[data-route="mixer"]` sets `Mixline.router.current.name === 'mixer'`, `#dock` is within viewport at 412×915.
- [ ] Step 2: Run `npm run test:browser` → fails (no page).
- [ ] Step 3: Implement files above; `main.js` mounts header, nav, empty screen placeholders, dock placeholder, exposes `window.Mixline = {router}`.
- [ ] Step 4: Run smoke → PASS. Commit "feat: Mixline 6 shell, tokens and navigation".

### Task 2: Analysis, time and demos

**Files:**
- Create: `web/js/core/analysis.js`, `web/js/core/time.js`, `web/js/core/demos.js`
- Test: `tests/analysis.test.mjs`, `tests/time.test.mjs`, `tests/demos.test.mjs`

**Interfaces:**
- `analysis.js`: `clamp(v,min,max)`, `crossfadeGains(x, curve='blend'|'cut') → [g0,g1]`, `loopPosition(pos, loop, duration)`, `phaseAlignedPosition(pos, bpm, targetPos, targetBpm)`, `peaksFromBuffer(buffer, count=512) → Float32Array`, `estimateBpm(buffer) → {bpm, confidence, method:'estimated'}|null`, `fitWaveWindow(duration, center, span) → {start, span}`, `zoomWaveWindow(duration, window, factor, anchor) → {start, span}`, `timeAtWavePoint(window, fraction, duration)`.
- `time.js`: `formatTime(seconds, {ms=false}) → 'mm:ss' | 'mm:ss.mmm'`, `parseTime(text) → seconds|null` (throws on malformed), `timeInput(seconds) → 'mm:ss.mmm'|''`.
- `demos.js`: `DEMO_TRACKS` (6 records with `id:'demo-*'`, `demo`, title, artist 'Mixline Originals', bpm, `source:'original'`, `artwork:'assets/covers/<key>.svg'`), `SAMPLER_SOUNDS` (8 names), `makeDemo(id) → {track, blob}` (WAV), `makeSamplerBuffer(ctx, index, volume) → AudioBuffer`.

- [ ] Step 1: Port assertions from existing `tests/engine.test.mjs` (crossfade, loop, phase, peaks, demos, estimateBpm) and `tests/wave5.test.mjs`, `tests/library5.test.mjs` time cases into the three new test files.
- [ ] Step 2: `npm test` → fails (modules missing).
- [ ] Step 3: Implement modules (algorithms from the previous engine, written readably).
- [ ] Step 4: `npm test` → PASS. Commit "feat: analysis, time and original demo modules".

### Task 3: Audio engine

**Files:**
- Create: `web/js/core/channel.js`, `web/js/core/recorder.js`, `web/js/core/engine.js`
- Test: `tests/engine.test.mjs` (rewritten from the existing file against the new import path and names)

**Interfaces:**
- `channel.js`: `createChannel(ctx, masterNode) → nodes {input, low, mid, high, filter, channel, mix, analyser, outputAnalyser, delay, feedback, echo, reverb, wet}`; `applyChannelFX(ctx, deck)`; `setParam(ctx, param, value, ramp=.015)`.
- `recorder.js`: `createRecorder(stream, {limitBytes=48*1024*1024}) → {start(), stop() → Promise<Blob>, recording, elapsed, pending, on(event, fn)}`.
- `engine.js`: `class MixEngine extends EventTarget` with the public API listed in the spec §4 and the previous engine (`load, restore, cancelLoad, eject, play, pause, pauseAll, toggle, position, seek, cue, cueDown, cueUp, returnToStart, setStartCue, setCue, clearCue, renameCue, goCue, addMarker, updateMarker, removeMarker, setGrid, setQuantize, analyzeBpm, bend, endBend, setRate, beatJump, setBpm, tap, sync, setLoopPoints, loop, setEQ, setEQKill, setFilter, setFX, setXY, setFXBypass, resetFX, setEcho, setGain, setTrim, setMaster, setMasterMute, setCrossfade, setCrossfadeCurve, fadeTo, transitionTo, cancelFade, waveform, meter, outputMeter, recording, recordingElapsed, startRecording, stopRecording, setSlip, startScratch, scratchTo, endScratch, sampler, snapshot, destroy`). Events: `change`, `error`, `transitionend`, `recording`, `loaded`.

- [ ] Step 1: Rewrite `tests/engine.test.mjs` from the existing suite: same mocked `Context/Node/Buffer`, imports from `../web/js/core/engine.js`, `nudge(i,beats)` → `beatJump(i,beats)`.
- [ ] Step 2: `npm test` → engine tests fail.
- [ ] Step 3: Implement the three modules, keeping semantics (tokenised loads, cue hold, slip scratch, transitions on the audio clock, 48 MB recording stop, restore validates before replacing).
- [ ] Step 4: `npm test` → PASS. Commit "feat: readable MixEngine with channel graph and recorder".

### Task 4: Store, sources, video

**Files:**
- Create: `web/js/core/store.js`, `web/js/core/sources.js`, `web/js/core/video.js`
- Test: `tests/store.test.mjs`, `tests/sources.test.mjs`, `tests/video.test.mjs`

**Interfaces:**
- `store.js`: `class Store` (same API as before) plus `getCollections() → {favorites:[], recents:[], crates:[{id,name,ids}]}`, `setCollections(c)`, `listTracks()`, `getTrack(id) → {track, blob}|null`, `cacheTrack(track, blob)`, `saveTrack(track, blob)`, `updateTrack(id, updates)`, `deleteTrack(id)`, sessions/settings/recordings methods, `storageEstimate()`, `requestPersistence()`; export `store` singleton.
- `sources.js`: `SOURCE_CATALOG`, `licenseInfo(value)`, `sourceCapabilities(source, license, {streamable, gated})`, `createSources({store, config, fetchImpl, timeoutMs}) → {init, list, getConfig, configure, search(source, query, {page, limit, signal}), prepare(track, {signal, purpose})}`.
- `video.js`: `parseYouTubeURL(input)`, `class VideoMixer extends EventTarget` (same API as before).

- [ ] Step 1: Port `tests/sources5.test.mjs`, `tests/video.test.mjs`, store transient-cache test to new paths.
- [ ] Step 2: `npm test` → fail. Step 3: implement. Step 4: PASS. Commit "feat: store, online sources and video mixer modules".

### Task 5: Instrument controls and haptics

**Files:**
- Create: `web/js/ui/haptics.js`, `web/js/ui/controls/knob.js`, `fader.js`, `platter.js`, `waveform.js`, `xypad.js`, `meter.js`
- Test: `tests/browser/controls.mjs` (mounts controls on a bare page `web/dev/controls.html`)

**Interfaces:**
- `haptics.js`: `haptics.configure({enabled, profile:'off'|'essential'|'detailed'})`, `haptics.play(kind)` for kinds `select, load, press, step, detent, center, edge, contact, toggle, warning`.
- `knob.js`: `createKnob(el, {min, max, step, value, defaultValue, detent, format, label, onInput(value), onChange(value)}) → {set(value), destroy()}`; vertical drag, fine with second finger/Shift, double-tap reset, ArrowUp/Down, renders `.knob-arc` SVG and `.knob-value`.
- `fader.js`: `createFader(el, {orientation:'vertical'|'horizontal', min, max, value, detents:[], onInput, onChange}) → {set, destroy}`; catch-and-drag.
- `platter.js`: `createPlatter(el, {engine, deck, mode:()=> 'vinyl'|'nudge'}) → {destroy()}`; rotates from `engine.position`, scratch via `engine.startScratch/scratchTo/endScratch`, nudge via `engine.bend/endBend`.
- `waveform.js`: `createWaveform(canvas, {engine, deck, kind:'overview'|'detail'|'thumb', getMode:()=>'seek'|'pan'|'scratch', window}) → {draw(), setWindow(w), destroy()}`.
- `xypad.js`: `createXYPad(el, {onInput(x,y), onChange(x,y)}) → {set(x,y), destroy}` with x∈[-1,1], y∈[0,1].
- `meter.js`: `createMeter(canvas, {getLevel:()=>0..1, color}) → {destroy}`.

- [ ] Step 1: Write controls browser test: knob drag of 100 px changes value by ~100 % of range; fader touch away from handle does not jump; XY drag then release leaves puck where released; platter pointerdown sets `engine.decks[0].scratching` true, pointerup resumes.
- [ ] Step 2: fails. Step 3: implement. Step 4: PASS. Commit "feat: instrument controls and haptic vocabulary".

### Task 6: Decks screen and dock

**Files:**
- Create: `web/js/shell/dock.js`, `web/js/screens/decks.js`, `web/assets/covers/*.svg` (6 originals)
- Modify: `web/js/main.js`, `web/css/screens.css`
- Test: `tests/browser/journey.mjs` (begins here, extended by later tasks)

**Interfaces:**
- `dock.js`: `createDock(el, {engine, router, haptics}) → {update(), destroy()}`; buttons `[data-dock-cue="i"]`, `[data-dock-play="i"]`, crossfader `[data-dock-xfader]`.
- `decks.js`: `createDecksScreen(ctx) → {mount(container), unmount(), update()}` where `ctx = {engine, store, router, settings, haptics, toast, library}`; focus view via `router.navigate('decks', {focus: i})`.

- [ ] Step 1: Journey test: load demos into both decks via `Mixline.loadDemo(i, id)`, click `[data-dock-play="0"]`, assert position advances; navigate all six tabs while playing; assert still playing; screenshot `decks-412x915.png`.
- [ ] Step 2: fails. Step 3: implement. Step 4: PASS. Commit "feat: Decks workspace with focus view and persistent dock".

### Task 7: Mixer, Pads and FX screens

**Files:**
- Create: `web/js/screens/mixer.js`, `pads.js`, `fx.js`
- Test: extend `tests/browser/journey.mjs`

- [ ] Step 1: Tests: XY drag latches `engine.decks[0].filter>0.1 && fx.echo>0.1` and survives navigation; Bypass keeps values; Reset zeroes; Pads → Loops `[data-loop="4"]` sets `engine.decks[0].loop.beats≈4`; Cues pad 1 sets cue; Mixer `[data-kill="0:low"]` sets `eqKills.low`.
- [ ] Step 2: fail. Step 3: implement. Step 4: PASS. Commit "feat: Mixer, Pads and FX workspaces".

### Task 8: Library screen

**Files:**
- Create: `web/js/screens/library.js`, `web/js/core/library.js` (pure helpers: `filterTracks(tracks, {query, mode, source, sort, unknownBpm})`, `normalizeRecipe(json)`)
- Test: `tests/library.test.mjs` (ported filters/recipe), extend `tests/browser/journey.mjs`

- [ ] Step 1: Node tests ported; browser: search 'Afterhours' shows one row, select → inspector visible, `[data-load-deck="1"]` loads into deck 2 while deck 1 keeps playing; cancel a load; favourite + crate persist via `store.getCollections()`; long-title fixture truncates (no horizontal overflow).
- [ ] Step 2: fail. Step 3: implement (sources panel, import, prepare with loop IN/OUT, practice pair). Step 4: PASS. Commit "feat: Library with sources, prepare and crates".

### Task 9: Challenge screen

**Files:**
- Create: `web/js/screens/challenge.js`, `web/js/core/queue.js` (`createQueue(store)` with add/remove/undo/move/rename/setStart/skip/restore/persist)
- Test: `tests/queue.test.mjs`, extend journey (offline: UI renders, adding an invalid link shows error toast, queue reorder works, players show "Video unavailable offline" state without page errors)

- [ ] Steps: test → fail → implement → pass. Commit "feat: Challenge video workspace with queue".

### Task 10: Settings, sessions, recordings, recording

**Files:**
- Create: `web/js/core/settings.js`, `web/js/core/session.js`, `web/js/screens/settings.js`
- Test: `tests/settings.test.mjs` (defaults merge, validation), extend journey (change haptics profile → Save → reload persists; navigate away dirty → confirm dialog; recording 1 s → non-silent decodable blob in `store.listRecordings()`)

- [ ] Steps: test → fail → implement → pass. Commit "feat: Studio settings, sessions and recordings".

### Task 11: Keyboard, native bridge, lifecycle

**Files:**
- Create: `web/js/shell/keyboard.js`, `web/js/shell/native.js`
- Modify: `web/js/main.js`
- Test: extend journey (press `q` toggles deck 1 play when no input focused; typing in search does not trigger shortcuts; `window.mixlineLifecycle('pause')` pauses both decks; `window.mixlineBack()` returns true when a sheet is open)

- [ ] Steps: test → fail → implement → pass. Commit "feat: keyboard shortcuts, Android bridge and lifecycle".

### Task 12: Android shell and CI

**Files:**
- Modify: `app/build.gradle` (versionCode 60000, versionName 6.0.0), `app/src/main/java/.../MainActivity.java` (haptic `kind` mapping), `app/src/main/res/values/styles.xml` (colours), `scripts/build-apk.sh` (6.0.0 names, optional keystore from env)
- Create: `.github/workflows/ci.yml` (jobs: node tests; browser tests with Playwright; Android APK artifact; release on `v*` tags)

- [ ] Steps: update files; validate Java compiles syntactically (no SDK here: review only); `actionlint`-style manual review of YAML; commit "build: 6.0.0 shell and CI workflows".

### Task 13: Verification, docs, cleanup, push

**Files:**
- Create: `docs/verification/6.0/` (screenshots + results.json), `docs/VERIFICATION-6.md`, `docs/DESIGN-6.md` (design brief)
- Modify: `README.md`, `downloads/README.md`; move old docs to `docs/archive/`; delete superseded `web/*.js|css` from 5.0 and old tests.

- [ ] Run full `npm test` and `npm run test:browser`; capture screenshots at 412×915, 915×412, 1280×800 for every workspace; fix any failures; write report; commit; push with `git push -u origin ccr-aa0afb26-qp52r2`.
