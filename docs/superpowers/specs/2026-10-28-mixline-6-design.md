# Mixline 6 — design specification

Date: 28 October 2026. Status: accepted for implementation (the user authorised a full recreation, including replacing the existing code and stack where needed).

## 1. Intent

Mixline is a mobile DJ instrument. Two local audio decks, a mixer, performance pads, effects, a music library with online sources, and a video "Challenge" mode for cutting between beats. The user supplied ten design boards (Visual DNA, Performance Controls, Music & Challenge Components, Pads/FX/Settings targets, Perform/Challenge/Prepare concept, Direction 02 and a violet/teal variant). The brief: recreate the app in that design language and deliver a premium, usable product.

What the user said:
- Recreate the app using the design language of the screenshots.
- Recreate everything in the repo if needed; change the stack if needed.
- Outcome: a premium, usable, good app that meets their needs.

Assumptions made (not stated by the user):
- Target device is the user's Android phone (previous builds targeted an S26 Ultra); phones in portrait are the primary form factor, landscape and desktop browsers are secondary but must work.
- All functionality of the current 5.0 build is retained unless noted in §9.
- Audio stays on Web Audio inside the Android WebView shell. A native DSP rewrite cannot be verified here (no Android SDK or device) and the user's feedback across versions has been about UI and usability, not latency.

## 2. Direction

One sentence: **a neon performance instrument on obsidian — physical, glowing, legible.**

Observed in the boards and adopted:
- Palette: Obsidian base `#0B0B0D`, graphite panels, Deck 1 **red** `#FF3B3B`, Deck 2 **cyan** `#00E5FF`, creative **violet** `#A855FF`, warm neutral text `#EDE6DD`. Green for ready/active loops, amber for buffering/warnings.
- Materials: flat dark field, satin graphite panels with hairline borders, brushed-metal bezels on knobs and platters, restrained neon glow rings (calm idle / bright active).
- Components: round CUE/PLAY/SYNC buttons with coloured rings; vinyl platters with grooves, artwork centre and a rim position marker; EQ knobs with glow arcs; recessed faders; eight glowing pads; an XY effects pad on a grid; waveforms with cue markers, playhead and loop region; source badges (LOCAL / VIDEO / ONLINE); queue states READY / BUFFERING / BLOCKED; bottom navigation tabs.
- Typography: Inter (bundled), heavy tracked micro-labels, bold titles, tabular numerals for times and BPM.

Deliberately omitted from the boards:
- Fake data shown in several boards (musical keys for every track, "AI" labels, crowd counts). The app shows only measured or supplied values; unknown stays "—".
- Low-contrast decorative text from Direction 02. Operating information must read at arm's length on a phone.
- A photo-heavy library grid. Artwork is used where real artwork exists; otherwise an original generated cover, never implied album art.

Deck colour themes: **Red/Cyan** (default, from the Visual DNA board) and **Violet/Teal** (from the variant boards) selectable in Settings → Appearance.

## 3. Information architecture

Bottom navigation (six destinations, all views of the same live session):

| Tab | Purpose |
|---|---|
| Decks | Dual deck performance; tap a deck header to open its focus view (large waveform + platter + tempo + hot cues). |
| Mixer | Trim, 3-band EQ with kills, filter, channel faders with meters, master level/mute/meter, crossfader curve. |
| Pads | Per-deck 8-pad grid in Cues / Loops / Sampler modes, slip and beat jump. |
| FX | XY filter × echo pad (latched), filter/echo/reverb knobs, echo time/feedback, bypass/reset, timed transitions (blend, bass swap, echo out). |
| Library | Sources, search and filter chips, track rows, inspector/prepare (waveform, cue, loop IN/OUT, BPM), crates/favourites/recents, import, Load to Deck 1/2. |
| Challenge | Two visible video decks (YouTube), video crossfader, NEXT / CUT / NEXT, Up Next queue with start times, loop and states. |

Header: brand, recording indicator/button, performance lock, settings. Settings opens Studio Settings (search, grouped sections, explicit Save) plus Sessions & Recordings.

Persistent dock on every audio workspace: Deck 1 identity + CUE/PLAY, crossfader, Deck 2 identity + PLAY/CUE, with state text (playing, ready, silent-by-fader). Challenge shows its own video transport instead and a small "audio decks still playing" indicator when relevant.

## 4. Architecture

Stack: static web app in `web/` written as readable vanilla ES modules (no bundler, no runtime dependencies), modern CSS with design tokens, Canvas 2D for waveforms/meters/platter rings, Pointer Events for all instrument gestures. Tests: `node --test` for logic with a mocked AudioContext; Playwright/Chromium for rendered journeys and screenshots. Android: the existing Java WebView shell is kept and updated (version, haptic vocabulary); GitHub Actions builds the test APK because this environment has no Android SDK.

```
web/
  index.html  manifest.webmanifest
  assets/fonts/Inter-latin.woff2   assets/covers/*.svg (original art)
  css/tokens.css base.css layout.css components.css screens.css
  js/main.js
  js/core/   analysis.js demos.js engine.js store.js sources.js video.js session.js settings.js
  js/ui/     dom.js icons.js haptics.js toast.js dialog.js
  js/ui/controls/ knob.js fader.js platter.js waveform.js xypad.js meter.js
  js/shell/  router.js nav.js dock.js keyboard.js native.js
  js/screens/ decks.js mixer.js pads.js fx.js library.js challenge.js settings.js
tests/      *.test.mjs (node)   browser/*.mjs (Playwright)
app/        Android shell (unchanged structure)
.github/workflows/ci.yml
```

Core contracts:
- `MixEngine` owns the Web Audio graph and all deck state; it is the single source of truth. UI reads `engine.decks[i]`, `engine.position(i)` and subscribes to `change`, `error`, `transitionend`, `recording` events. Controls never animate their own copy of state.
- Every load is tokenised: a slower decode cannot replace a newer load; failure keeps the previous track and clock.
- Source capabilities (`load`, `record`, `offline`, `preview`) gate behaviour explicitly; unknown is not permission.
- Settings use draft → Save → persisted, with dirty-state protection.
- Session snapshots are written every 10 s while a track is loaded; restore is always paused and never auto-plays.

## 5. Screens and states

Decks (portrait): two columns. Each deck: artwork, title, artist, BPM / key (if supplied) / duration; compact waveform with cue markers, loop region, playhead and elapsed/remaining; medium platter rotating from the engine clock, scratch on touch, nudge mode available; CUE · PLAY · SYNC/LOOP row; tempo slider with reset. Crossfader with 1 / 2 labels. Empty deck state: dashed platter, "Load from Library" action. Loading state: progress ring on the destination deck with Cancel.

Deck focus: large detailed waveform with overview strip, pinch zoom, Seek / Pan / Scratch modes, Fit/Follow, hot cue flags with names, markers, loop handles; large platter; vertical EQ; FX / LOOP toggles; SLIP / VINYL (scratch vs nudge) switch; tempo fader with fine; the other deck remains as a compact strip with PLAY and SYNC.

Mixer: two channel strips (TRIM, HIGH/MID/LOW knobs with kill buttons, FILTER knob, channel fader with live meter) and a master strip (level, mute, meter, limiter indication). Crossfader with curve BLEND / CUT.

Pads: deck selector 1 / 2; mode tabs CUES / LOOPS / SAMPLER. Cues: 8 pads with name, colour and position bar; tap to jump (or set when empty); long-press to edit name/colour/clear. Loops: 1/4 … 32 beats, IN / OUT / EXIT, active loop glows green. Sampler: 8 original synthesised sounds. SLIP toggle and ±4 / ±16 beat jump.

FX: target 1 / 2 / BOTH; XY pad (x = low-pass ↔ high-pass, y = echo) latched after release, grid and glowing puck; BYPASS keeps values, RESET neutralises; knob cards FILTER, ECHO, REVERB, FEEDBACK and ECHO TIME (beats); Transitions: BLEND / BASS SWAP / ECHO OUT, 4 / 8 / 16 bars or seconds, Go, progress bar, any manual move takes over.

Library: top tabs Library / Crates / Recents / Favourites; search with Title / Artist / All modes; chips: All, Local, Originals, Online, Video and sort; source panel (Audius, Jamendo with Client ID setup, Internet Archive, Wikimedia Commons, Free To Use and Spotify shown as not connected with honest reasons); rows with artwork, title, artist, BPM · duration, source badge, On 1 / On 2 markers; inspector for the selected track: artwork, metadata editing (title, artist, BPM tap/analyse/manual), prepared waveform with cue and loop IN/OUT handles, Preview (public output, labelled), Load to Deck 1 / Load to Deck 2, add to crate, favourite, delete/relink. Empty state illustration and Import button. Practice pair from a crate (loads two adjacent tracks and arms a blend).

Challenge: two video cards (red / cyan frames) with status pill and times; below, identities with per-deck level, crossfader; NEXT DECK 1 · CUT · NEXT DECK 2; Up Next list (artwork fallback, title, start at, source badge VIDEO, READY / BUFFERING / BLOCKED, loop toggle, move up/down, remove with undo), Clear all, paste link to add. Timed fade length and local accompaniment toggle (Deck 1 audio) retained.

Settings: search; AUDIO (output route shown as system-selected, headphone cue explained as unavailable, crossfader curve, pause outgoing deck after transition, safe level warning); HAPTICS (enable, profile Off / Essential / Detailed, Test); APPEARANCE (theme Dark / Light, deck colours Red-Cyan / Violet-Teal, glow intensity); MOTION (system / reduced); SESSIONS & RECORDINGS (counts, lists with restore/export/delete); ABOUT. Explicit Save Settings, unsaved indicator, discard protection, reset to defaults as a draft.

Shared states: toasts for outcomes, dialogs for destructive actions, skeleton rows for online search, explicit error text with retry, offline notice.

## 6. Interaction contracts

- Touch targets ≥ 48 px for transport, pads and faders; 44 px for secondary controls.
- One pointer owns one control from down to up/cancel; a second finger never steals; leaving the bounds does not end the gesture; `pointercancel`, navigation and lifecycle pause release transient states (scratch, cue hold, nudge) safely.
- Knobs: vertical drag (1 px = 1 % of range, Fine = 0.2 %), double-tap resets to default, arrow keys step, value readout while dragging, detent at centre for EQ/filter.
- Faders: catch-and-drag (no jump on touch), keyboard arrows, centre detent cue on the crossfader in blend curve only.
- Platter: touch in Vinyl mode scratches the real audio; Nudge mode bends tempo temporarily; release returns to prior playback (slip optional).
- Waveform: Seek shows a staged marker and commits on release; Pan moves the window; Scratch uses the engine scratch; pinch zooms; Fit / Follow buttons as non-gesture alternatives.
- Haptics vocabulary: select tick, load success, press, step tick, centre detent, endpoint, scratch contact, toggle, warning. Android bridge maps kinds to system haptic constants; web falls back to `navigator.vibrate` where available; every event also has a visual state. Audio never waits for haptics.
- Motion: feedback 120–200 ms, continuity 180–220 ms, no input gating; reduced motion removes travel/glow pulses and keeps state changes immediate.

## 7. Data

IndexedDB stores: tracks (metadata + blob for local imports, demo markers), sessions, settings, recordings, collections (favourites, recents, crates). Transient online audio is cached in memory (≤ 6) unless the source allows offline retention. Recovery snapshot lives in settings.

Track record: `{id, title, artist, bpm, bpmSource, duration, start, cue, cues[8], cueMeta[8], markers[], loop, grid, quantize, source, provider, capabilities, artwork, license, credit, added, updated}`.

## 8. Testing

- Node: analysis math, engine transport/cue/loop/scratch/fx/transitions/recording/restore, sources (license, capabilities, adapters with controlled responses, limits, abort, timeout), video mixer semantics, library filters/time parsing/recipes, store transient cache.
- Browser: load demos to both decks, play, navigate all workspaces while playing, scratch + crossfader, cue hold, XY latch through navigation, bypass/reset, loops and hot cues from Pads, library search/select/prepare/load, settings save/reload, recording produces non-silent audio, overflow/dock checks at 412×915, 915×412 and 1280×800, no page errors, reduced motion.

## 9. Not in this release

Pitch-preserving key lock, maintained beat sync, key detection, stems, native DSP/AudioWorklet, headphone cue routing, four decks, account sync, Spotify audio. Internet Archive and Wikimedia remain experimental discovery. Live provider access and physical-phone audio behaviour cannot be verified in this environment and are called out in the verification report.
