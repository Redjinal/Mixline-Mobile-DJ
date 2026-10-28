# Mixline Mobile DJ

Mixline **4.0.0-test2** is a standalone Android test edition of the Mixline performance studio. It redesigns local two-deck mixing and the visible-video Challenge workflow for a Samsung S26 Ultra, with red Deck 1, blue/cyan Deck 2, and large performance controls.

This repository contains a bundled web interface and Web Audio engine inside a Java Android WebView shell. The native bridge supplies Android file selection/export, audio-focus interruption handling, screen-awake behavior, and haptic feedback. It is not a native low-latency DJ DSP engine.

## Build and run

The prepared cloud environment provides JDK 21, Android SDK 36, Build Tools 36.0.0 and Gradle 8.13. The project wrapper pins Gradle 8.13 with checksum verification; Android Gradle Plugin is 8.13.2.

```bash
cd /workspace/Mixline-Mobile-DJ
source /workspace/.mixline-tools/activate.sh
npm test
bash scripts/build-apk.sh
```

The build script runs `assembleDebug` and `lintDebug`, verifies APK signing and ZIP alignment, and writes:

- `artifacts/Mixline-4.0.0-test2.apk`
- `artifacts/Mixline-4.0.0-test2.apk.sha256`

On a different development machine, install the corresponding Android SDK/JDK tools and set `ANDROID_HOME` and `JAVA_HOME`; the `/workspace/.mixline-tools` activation step is specific to this cloud environment. Preserve the environment's proxy and certificate trust when downloading dependencies.

For browser development, run `npm run serve`. This serves `web/` on port 8080; Android file export and interruption behavior require the APK. The app and unit tests have no npm package dependencies.

With that server running, the browser suites can be run in a second shell:

```bash
node tests/app-browser.mjs
node tests/video-browser.mjs
```

The browser suites require Playwright and Chromium. `app-browser.mjs` accepts `PLAYWRIGHT_MODULE`, `CHROMIUM_EXECUTABLE`, `MIXLINE_BASE_URL` and `MIXLINE_TEST_OUTPUT`; it also attempts standard package/Python-Playwright discovery. `video-browser.mjs` currently uses this cloud environment's Playwright installation path and `/usr/bin/chromium`, so adapt those paths when running elsewhere. Its YouTube players are mocks: passing it does not prove live YouTube playback.

## Test edition behavior

- Local audio imports are copied into the app's IndexedDB library. Two original synthesized demo beats make the first mix possible without an account or network access.
- Local decks include playback, cue return, eight hot cues, waveform seek, forward/reverse granular platter scratching, manual BPM/tap tempo, one-time sync, beat loops/jumps, channel EQ/filter, echo/reverb, sampler, and manual/timed transitions.
- Challenge provides a prepared-next-track workflow, separate **Load next** and **Cut now** actions, editable queue order, removal undo, and a persistent cue/play/crossfader dock.
- Official visible YouTube players accept pasted video links and prepared start points. Two-player overlap is experimental and requires real-device verification. Video audio is not decoded, processed by the local DSP, or recorded.
- Video Challenge exposes repeat/retry controls and a **Local instrumental layer**. Load local Deck 1 from Library, then deliberately play/pause that accompaniment and adjust its separate level while videos remain visible. Only the local audio enters recordings; live YouTube accompaniment still needs phone testing.
- Sessions, recovery snapshots, preferences and local-master recordings are stored on the device. Video-only sessions retain video positions and repeat preferences and restore paused. Recording exports use Android's document-save picker.

These statements describe the implemented source paths. Build, browser and physical-device evidence must be reported separately; the historical chat's test counts do not validate this build. See [the verification record](docs/VERIFICATION.md) for observed results, [the design and capability record](docs/DESIGN.md) for remaining scope, and [the device test checklist](docs/DEVICE-TESTING.md) for phone acceptance checks.

## Installation and distribution

Application ID: `com.mixline.studio.testing`. Version: `4.0.0-test2` / `40002`. Minimum Android API: 29; target API: 36. This standalone package can coexist with an older Mixline application using a different package ID. It does not migrate that application's library or sessions.

The build script produces a debug-signed sideloading APK for testing, not a Play Store or production release. Future updates must use the same package and signing key to retain this test installation's data. Uninstalling or clearing app data removes its local library, sessions and unexported recordings; export important takes first.

Audio routing and latency still require testing on the S26 Ultra using its speaker and USB-C headphones. Background playback, microphone capture, commercial streaming catalogs, private cue output and native key-lock DSP are not provided in this test edition.

The test 2 visual/motion pass is documented in docs/DESIGN.md. Screen captures and a sampled interaction preview are in artifacts/refinement; the motion acceptance command is `node tests/motion-browser.mjs` with the local server running.
