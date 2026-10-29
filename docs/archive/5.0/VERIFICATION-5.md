# Mixline 5.0 testing build verification

Build: `5.0.0-test1`, version code `50001`, package `com.mixline.studio.testing`.

This document distinguishes verification performed for the 5.0 testing build from design targets, archived results and phone checks that remain unrun. The earlier design-only restriction was superseded by the user's instruction to start 5.0 and update GitHub when complete.

## Scope and evidence

- JavaScript engine/provider tests exercise processing state, cancellation, restoration, source normalization and failure handling. Mock provider tests do not establish live catalog access or permission to use every track.
- `tests/v5-browser.mjs` exercises the integrated application with actual desktop Chromium Web Audio, UI controls and local persistence. It saves per-check evidence and screenshots under `artifacts/v5-verification/`.
- Android assembly/lint, APK signature verification and ZIP alignment checks apply to the packaged artifact. A separate asset comparison ensures the tested web files match the APK contents.
- Physical Samsung S26 Ultra audio latency, USB-C behavior, Android document-picker export, interruptions, thermal/battery behavior and sustained sessions require the checks in [DEVICE-TESTING.md](DEVICE-TESTING.md).

## Results

Verified on 28 October 2026:

| Check | Result | Evidence / practical boundary |
|---|---|---|
| Unit and helper checks | 72 passed | Engine 33, source adapters 17, library helpers 6, Wave helpers 8, video 8; `npm test` discovers all five test files. |
| Integrated 5.0 Chromium checks | 16 groups passed | [Results](verification/5.0/results.json): real playback and cue/nudge, held-state navigation cleanup, XY gesture/latch/bypass/reset, Wave isolation/editing, master mute, library preparation/independent preview/collections, source setup, bass transition takeover, metadata restore, non-silent recording, reduced motion and no uncaught exceptions. |
| Layout coverage | 20 route/orientation captures | Ten routes at 412×915 and 915×412; no horizontal overflow, dock stays in viewport. Source-card action-width regression was corrected and rerun. |
| Extended Wave interaction checks | Passed | `tests/wave5-browser.mjs`: actual CDP pinch, pan, staged seek/cancellation, fine preview, named cue/marker editing, custom loop and scratch release; both phone orientations. |
| Final Wave phone geometry | Passed | [Geometry](verification/5.0/wave-geometry.json): Seek/Pan/Scratch and zoom toolbar bottom 673.5px, dock top 700px at 412×915. Targeted check after final CSS refinement. |
| Preserved video workflow | 13 checks passed | [Results](verification/5.0/video-results.json): mocked official-player events, failed incoming transitions, saved queue, visibility and 200px player minimum, offline queue preparation. **Not live YouTube playback.** |
| Android assembly and lint | Passed | Gradle8.13, JDK21, API36/build-tools36.0.0; zero lint errors, one existing dependency-update advisory. |
| Packaging | Passed | All17 web asset files byte-identical between source and APK; v2 signature verified; 16KB ZIP alignment verified; no native ABI libraries. |
| Signing compatibility | Passed | Same certificate as published4.0.0-test2 APK. |

APK: `Mixline-5.0.0-test1.apk`, **5,869,655 bytes**.
SHA-256: `778e1efd5cc88cb1e52fb128de05bb0290d0194e229948877e6c5bb4279511db`.
[Packaged artifact evidence](verification/5.0/apk-evidence.json) records the asset and certificate checks. Manifest checked: version50001 /5.0.0-test1, min API29, target36, same testing package; no microphone/storage permission added.

Actual rendered app captures: [Decks](verification/5.0/perform-412x915.png), [Waves](verification/5.0/waves-412x915.png), [latched XY FX](verification/5.0/fx-412x915.png). These show the implemented UI, unlike the earlier generated concept boards. Static captures do not establish touch latency or animation frame rate.

The native Android picker now respects the initiating input's accepted audio/video or JSON MIME types, including `.json` recipe inputs, instead of always restricting selection to audio/video. Compilation/lint passed; physical Android recipe import/export remains a device check.

## Source and device limits

The cloud environment currently restricts external service hosts. Prior direct official-documentation requests for Free To Use, Internet Archive and Wikimedia returned proxy CONNECT 403 responses. Audius/Jamendo and additional providers need explicit live-service verification; the UI must not turn a source tile, setup action or mocked result into a claim of a live connection.

The user describes the S26 Ultra software as “Latest versions”; exact Android/One UI build identifiers remain unverified. No physical S26 test was performed in this environment.

The test APK retains the existing dedicated testing signing identity and application ID, permitting an update over 4.0 test2 when that installation used the same key. The signing key is ignored and must not be committed or bundled. This is not production signing or physical-device certification.
