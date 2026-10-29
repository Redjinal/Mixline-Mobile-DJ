# Verification record — 4.0.0-test2

Recorded 28 October 2026. This record distinguishes application checks run in the cloud environment from checks that require a physical phone or a reachable live video service. It does not inherit results from the earlier shared-chat releases.

## Observed checks

| Check | Result | Evidence and limits |
| --- | --- | --- |
| Unit tests | 25 passed | `npm test`: 17 audio-engine tests and 8 video-controller tests. Covers transport timing, loops, cues, replacement races/failure preservation, fade takeover, one-time sync limits, waveform/demo PCM, slip-scratch state, atomic session restoration, recording finalization, URL parsing, and video event/error handling. Audio context/player fixtures isolate behavior. |
| Real-browser local workflow | 8 groups passed | `node tests/app-browser.mjs` runs Chromium with actual Web Audio, IndexedDB, local file import and MediaRecorder. The result report has no failures or uncaught browser exceptions. |
| Mocked-video browser workflow | 13 groups passed | `node tests/video-browser.mjs` substitutes official-player events and also blocks the player API for an offline queue-preparation case. This validates controller/UI behavior, not live YouTube media. |
| Browser layouts | Checked at 320 × 812, 390 × 844, 412 × 915, 768 × 1024, 1440 × 900 and 915 × 412 | Mocked-player layout checks confirm minimum player geometry and a queue viewport clear of the persistent dock. The dock-overlap defect found during development was corrected. Real Android insets/display scaling still require phone testing. |
| Android lint | 0 errors; 1 advisory | `:app:lintDebug`: `GradleDependency` reports a newer `androidx.activity:activity` than the pinned 1.10.1. No lint assertions were disabled to hide this advisory. |
| Live YouTube service | Blocked; not verified | A request through this environment's proxy returned HTTP 403 on the test date. Actual playback, buffering, ads, embedding permission, overlap and local accompaniment were not established by the mock suite. |
| Physical S26 Ultra | Not run | No connected S26 Ultra. Installation, speaker/USB-C routing, native document export, touch latency, interruptions and sustained thermal behavior require the device checklist. |
| Final APK packaging | Passed | Test 2 build/lint, v2 signature and 16 KB ZIP alignment passed. All 11 bundled web files match final source. Testing certificate matches test 1. SHA-256: `4c5d581ee7d96490f0ed0ab7dfa085341186b4bdff153cdd2c90befab8823883`. |

## Visual and motion acceptance

`node tests/motion-browser.mjs` passed 12 acceptance groups in desktop Chromium. This verifies nonblocking/interruptible view transitions, keyboard and pointer rotary input changing the actual audio graph, playback/platter-clock continuity through rapid navigation, cue and loop feedback, manual fade cancellation, seven phone workspace renders, saved/system reduced-motion behavior, six viewport sizes, unsaved preferences and no uncaught exceptions. This supplements the 25 unit checks, 8 real-browser workflow groups and 13 mocked-video groups.

Screenshots and `motion-results.json` are retained in `artifacts/refinement/`. `interaction-preview.mp4` is a sampled recording of the rendered app; its capture/encoding cadence is not a frame-rate or device-latency benchmark. Normal and reduced-motion paths were exercised. Actual phone rendering performance is still a device check.

The visual review checked the implemented instrument against the approved boards: graphite surfaces, paired red/cyan identity, textured vinyl and metal rims, static reflections/tonearms, illuminated transport, rotary EQ/filter controls, legible track identity and persistent performance controls. The review prompted smaller mixer rows, removal of the large performance hero, narrow-screen layout adjustments and consistent vector icons. Generated concept boards remain design references, not an exact pixel specification or proof of phone performance.

## Browser audio evidence

An actual Web Audio probe measured a nonzero local signal: approximately **0.187 RMS**, with a decoded recording PCM peak of approximately **0.495**. These are digital signal measurements from the browser, not a speaker measurement or physical touch-to-sound latency result.

The retained end-to-end UI report independently records a stereo WebM/Opus take of **29,097 bytes**, about **1.200 seconds**, with decoded sample peak **0.5563**. The test confirmed that it saved once, exported successfully through the browser download path, and contained non-silent audio. This does not test Android's document-save picker; the native export path remains a phone acceptance item.

The eight local-browser groups cover demo-pair playback; real-file import and saved preparation; next-load and deliberate cut while preserving outgoing playback; recording/save/export; paused session restoration; missing-file failure before deck replacement; retained preferences/library/sessions/recordings after reload; and absence of uncaught browser exceptions. Development reports were written to `/tmp/mixline-ui-verification/results.json` and `/tmp/mixline-video-browser-results.json`.

## Mocked-video evidence

The 13 video groups exercise queue authoring and persistence; cueing without automatic start; retaining player nodes during navigation; player dimensions; waiting for a PLAYING event before cut completion; pausing before a modal obscures video; pausing when changing source or scrolling video out of view; preserving prepared-next state after failure; absence of uncaught exceptions; both phone-size layouts; and queue-only preparation with the iframe API blocked.

Player mocks cannot reproduce real ads, region restrictions, user-gesture policy, real buffering delays, Android WebView differences or acoustic mixing. The suite uses a Chromium autoplay flag for automation, so its start behavior is not evidence that a real embedded player will accept the same start on a phone.

## Reproduce the checks

From the checkout:

```bash
source /workspace/.mixline-tools/activate.sh
npm test
npm run serve
```

With the server running, use a second shell:

```bash
node tests/app-browser.mjs
node tests/video-browser.mjs
node tests/motion-browser.mjs
bash scripts/build-apk.sh
```

Playwright and Chromium must be installed. The application-browser suite supports configurable module/browser/base-URL paths; the video-browser script currently contains this cloud environment's Playwright/Chromium paths and needs adaptation elsewhere. `build-apk.sh` runs the project build and lint, then verifies the copied APK signature and ZIP alignment and writes its hash file.

## Acceptance boundary

The completed checks support a **standalone testing edition of the latest v3 design direction**, with the v4 source and QoL changes documented in [DESIGN.md](DESIGN.md). They do not establish complete parity with every older V4.1 feature, production release readiness, native low-latency DSP, key lock, commercial streaming integrations, separate cue routing, or verified live YouTube overlap.

Use [DEVICE-TESTING.md](DEVICE-TESTING.md) for the remaining phone checks and keep passed, failed, blocked and unrun outcomes separate. Update this record with physical-device results as they become available.

Five additional screen states (focused deck with live companion, tools, recording, sessions and preparation dialog) were rendered and inspected without browser exceptions. The focused companion strip was moved above the instrument and its transport/status tested against actual playback state.
