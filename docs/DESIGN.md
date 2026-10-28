# Mixline 4 test design and scope

## Source and accepted direction

The source brief is the [shared Mixline conversation](https://chatgpt.com/share/6ae123ee-4ab4-83e8-b6f2-1bea2f69eff6). Its final mobile release was called **Mixline 3.0**. The older “V4.1” reference described a browser-prototype capability baseline, not a newer mobile release. Its APK retained a legacy V2 filename, so filenames alone are not reliable version evidence.

The final user approval covered 18 portrait visual targets: dual/focused decks and mixer; dual video, Challenge and preparation; collection, track preparation and queue; pads, FX and settings; sessions, recording and routing; discovery, details and recovery. The chat called the design DNA **Performance Instrument × Music Culture**. Generated boards defined a direction; they were not proof of complete functionality or real-phone usability.

This implementation is a new **4.0.0-test2** build from that brief. The current request authorizes a full redesign and discussion of improvements. Local mixing and video/Challenge have equal importance. Challenge favors large one-handed actions. Existing decisions also include:

- Samsung S26 Ultra, a fresh standalone test APK, speaker or USB-C headphones first.
- Portrait and landscape with session continuity during rotation.
- Red Deck 1 and blue/cyan Deck 2; violet FX, green active states and distinct cue/attention states.
- Manual track starts and crossfader control, plus optional timed fades and immediate manual takeover.
- Both video players visible while their audio levels change; no video overlay or visual dissolve.
- Live queue preparation and performance controls that remain accessible while browsing.

The old chat claimed 120 passing tests and a verified APK signature for v3.0, but also stated that YouTube playback stalled in its browser. Those are historical claims, not validation of this implementation.

## Composition and controls

The interface uses dark graphite panels, metallic platter rims, vinyl grooves, restrained illuminated deck identities, and quiet library/settings surfaces. Typography uses installed Inter/Roboto/Arial fallbacks; no external font download is required. Platters are authored CSS; two original SVG illustrations depict a red sunset rooftop and cyan moonlit harbor for demo covers. Imported tracks without artwork use these illustrative covers, not asserted album art; the included demo audio and sampler sounds are synthesized in code. No paid assets or commercial music are bundled.

Current color tokens include background `#0b0d11`, red `#ff505b`, cyan `#26dcf5`, violet `#bd9cff`, green `#72e6b1`, and warm foreground `#f1f0eb`. Colors supplement text, position and control state rather than replacing them.

Four primary destinations keep navigation short: **Perform**, **Challenge**, **Library**, and **Tools**. Tools contains mixer, pads/loops, effects, recording, sessions and preferences. Focused deck view gives one local deck more space. Both local deck identities receive equal visual weight in the dual-deck view; video players stack in portrait and share available width in landscape.

Challenge separates preparation from the audible handoff: **Load next** prepares a deck; **Cut now** changes the mix deliberately. The cue/play/crossfader dock persists across workspaces. This is an improvement target for one-handed operation, not a claim that reach and accidental-touch rates have already been measured on the phone.

Ordinary buttons and fader touch areas aim for 48 CSS pixels or more; real Android scaling, smaller utility controls and navigation areas need rendered and device review. Focus outlines, labels, keyboard range controls and reduced-motion handling are part of the implementation. Visual or accessibility acceptance must be based on rendered checks, not source inspection alone.

## Implementation and current limits

| Area | Present in this test implementation | Remaining difference from the broader brief |
| --- | --- | --- |
| Local decks | Independent decoded-buffer decks; play/pause, cue return, protected replacement, waveform seeking, forward/reverse granular scratching, tempo control | Native low-latency engine and measured scratch latency remain; slip exists in the engine but has no user-facing toggle |
| Waveforms | Peaks computed from decoded local audio; position, cue and loop markings | Separate detailed/overview waveform desk, pan mode, pinch zoom, fine vertical scrub and draggable loop boundaries remain |
| Preparation | Local title/artist/manual BPM/start editing; durable imported copies; eight hot-cue positions per deck | Named hot cues, section markers, isolated library preview and full preparation waveform remain |
| Timing | Tap/manual BPM; tempo matching and one-time phase alignment; beat jumps; ¼–32-beat and In/Out loops | Automatic BPM/key detection, editable downbeat grid, quantization, continuous sync and pitch-preserving key lock remain; speed changes alter pitch |
| Mixer and creative tools | Channel levels, three-band EQ, filter, master control, measured local meters, blend/cut curves, echo/reverb, echo-out and eight synthesized one-shots | Full trim/kill UI parity, XY effects pad and bass-exchange transition macro remain |
| Queue and Challenge | Add prepared local tracks/video references; move up; remove/undo; explicit next-load and cut; timed-fade controls | Drag reorder, complete historical queue tooling and custom fade-entry UX remain |
| Video | Official embedded players, pasted links, manual playback/start points, repeat/retry, visible state/error messages, volume transitions and a local accompaniment control | Actual YouTube playback/overlap on the S26 remains unverified; no provider search API, decoded waveform/EQ/recording or offline video |
| Sources | Local imports, original demos and YouTube references | Beatport, TIDAL, SoundCloud or other subscription catalogs are not connected; no partner access is assumed |
| Sessions | Named sessions and periodic recovery snapshots, including video-only sessions; saved video position/repeat preferences; restore paused; local queue/preferences persistence | Full parity for every old setting/source preparation field requires continued audit; no account sync or cross-device backup |
| Recording | Local master and effects via supported MediaRecorder format; device storage and native document export | No microphone, YouTube capture, native disk-streamed unlimited recording or assumed 24-bit WAV format; 48 MB recording stop threshold and 64 MB export ceiling |
| Routing/lifecycle | Android-selected output, audio focus, headphone-disconnection pause, deliberate resume, screen-awake while playing | No separate master/cue routing, USB-controller integration or background playback service |

Switching between local and video modes pauses the previous mode first. In Video Challenge, **Local instrumental layer** deliberately starts or pauses local Deck 1 while the visible video players remain active, with a separate local level control. Load the local track from Library before enabling this accompaniment. The video crossfader continues to control the videos; only the local accompaniment enters local-master recordings. This implements an accompaniment path, but live YouTube-plus-local behavior remains unverified because the environment cannot currently reach the live YouTube service.

Video repeat is exposed in Challenge. It uses player seek/restart controls and may contain gaps; it is not sample-accurate looping. Session/recovery snapshots include video playback positions and repeat preferences, including sessions with no loaded local track.

Imports have a 150 MB file-size limit. Loaded tracks are decoded into memory, so that limit does not establish safe memory usage for arbitrary long audio. Sustained playback and large-file behavior require phone testing; a streamed native engine remains a separate development path.

The Android shell serves bundled assets from an isolated HTTPS origin using WebViewAssetLoader. Native messages are restricted to the trusted main frame; remote video iframes receive no native bridge. The shell has no native DSP library: local audio processing runs in Web Audio. This architecture allows a testable first redesign, while physical-device latency, heat and sustained reliability determine whether a later native audio migration is needed.

## Quality-of-life decisions

- Imported audio is stored as a managed local copy, so ordinary app relaunch does not require reselection. App-data clearing/uninstallation still removes it.
- Loading into a playing deck requires confirmation; local decode failure is intended to preserve the current track.
- Performance lock protects loading, seeking and queue/cue edits while leaving transport available. It is not a complete screen lock.
- Queue removal has one-step undo. Preparation and handoff are separate actions.
- Preferences use explicit Save, visible unsaved state and discard protection. Reset changes a draft until saved.
- A setting controls pausing the outgoing deck after a completed transition. The default in this test edition pauses it; v3.0 reportedly left it running silently. This saves work while allowing the older behavior to be selected.
- Saved sessions restore paused. Recovery snapshots are periodic, so the last few seconds before a crash may not be retained.
- Errors and source capabilities use explicit language; video player volume is not presented as measured audio VU.

## Verification and release boundary

This document records source-level implementation and intended device behavior. [VERIFICATION.md](VERIFICATION.md) separates the passing unit/browser/lint evidence from mocked video checks and unrun physical-device tests. Final APK packaging evidence must be attached to the delivered artifact; it is not inferred from source inspection. Record device results with the build hash, OS/WebView version and output route.

The current deliverable is a standalone test APK. Production readiness additionally requires complete agreed scope or an explicit revised scope, physical-device audio and interruption testing, measured performance/thermal limits, validated streaming behavior, durable export/recovery testing, production signing and release review. Passing JavaScript tests or creating a signed APK does not establish those outcomes.


## Test 2 visual and motion refinement

The first test build was packaged before the visual/motion pass was finished. Test 2 replaces the generic performance controls with a coordinated hardware treatment and makes feedback follow actual app state.

- `layout.css` retains responsive structural rules; `style.css` defines instrument components, materials and state treatment. `motion.js` owns shared interaction motion. `waveform.js` caches PCM-derived waveform rendering and draws live transport/loop/cue overlays.
- Platters use the authoritative track position at 33⅓ RPM-equivalent rotation, so navigation does not restart a decorative animation. Static lighting, tonearms and bezels remain independent. Reduced motion keeps a static platter while essential position/meters remain readable.
- Rotary controls support vertical pointer dragging, arrow-key steps, double-tap reset and a visible value. EQ zero/filter center use a twelve-o'clock detent. All commands reach the audio graph immediately.
- Route entry uses a cancelable 180 ms transform/opacity animation; dialog entry uses 220 ms. Input is never gated on animation completion. Rapid navigation cancels the previous entry motion. Closing a dialog is immediate, avoiding delayed callbacks that could close a subsequent dialog.
- Buttons provide a bounded press ripple, cue/sample actions flash briefly, active transport has a persistent illuminated state, and loop/loading/fading states use text plus color. Ripples and decorative entry motion respect system or saved Reduced preferences.
- Channel meters are measured audio with a short visual smoothing transition. Waveforms are cached real PCM peaks, with a staged seek marker, saved cue flags, loop boundaries and live position. No random or invented analysis data is drawn.
- Haptics are throttled; crossfader feedback occurs at center/edge detents rather than buzzing continuously while dragging.

The performance header is compact, track names and artwork have their own space, core transport stays in view in phone landscape, and the mixer exposes its EQ/filter/channel controls in compact rows. Library, pads, effects, sessions, settings and recovery use the same surface, type, icon and focus rules. No native audio engine, streaming entitlement or physical-device result is implied by this visual work.
