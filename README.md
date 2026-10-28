# Mixline Mobile DJ

Mixline **5.0.0-test1** restores the audio-first Touch/Wave Studio workflow for Android: balanced waveforms and medium platters, direct Decks/Waves/Mixer/Pads/FX/Library workspaces, and a persistent two-deck transport dock.

## Download

**[Download Mixline 5.0.0-test1 APK](https://github.com/Redjinal/Mixline-Mobile-DJ/raw/refs/heads/main/downloads/Mixline-5.0.0-test1.apk)**

Open the link on your phone; sign in to GitHub if this repository is private. The [downloads folder](downloads/) contains checksums and installation notes. The package and testing signing identity match 4.0 test2 so an ordinary update preserves its local library. Do not uninstall first if you want to retain that data.

## What's in 5.0

- Balanced decks, actual audio waveforms, platter scratching, Cue hold/audition, temporary nudge, slip, exact/fine knob controls and keyboard transport shortcuts.
- Expanded Wave workspace: overview/detail, seek/pan/scratch, pinch zoom, fine seeking, Fit/Follow, named/colorable hot cues, manual markers, draggable custom loops, grid/downbeat, quantize and approximate BPM estimation.
- Latched filter/echo XY pad with separate Bypass and Reset, echo timing/feedback, reverb, eight synthesized sampler sounds, blend/bass-swap/echo-out transitions and manual takeover.
- Trim, channel levels, three-band EQ/cuts, filter, master mute and measured meters. Tempo changes still change pitch; there is no key-lock or continuous-sync claim.
- Library selection/inspection, title/artist/BPM filters, Favorites/Recents/Crates, independent preparation/preview, saved starts/cues/markers/loops/grid, set recipes and adjacent-pair transition rehearsal. Preview uses the current output and is audible to anyone listening there.
- Six original synthesized practice tracks, persistent local imports, protected deck replacement, cancellation/ejection, queue rename/start/reorder/skip/restore, session recovery and local-master recording/export.
- Audius and Jamendo library adapters; experimental Internet Archive and Wikimedia discovery. Track capabilities and credits are explicit. **Live provider access remains unverified in this environment.** Free To Use remains a research entry because a current supported API and applicable terms could not be established; Spotify DJ access is not connected.
- Existing visible YouTube/Challenge, repeat/retry and local accompaniment paths are retained. Live YouTube overlap still requires device and provider validation; video audio does not enter the local DSP or recording.

See [5.0 release scope](docs/RELEASE-5.md), [verification](docs/VERIFICATION-5.md), [restoration audit](docs/design/MIXLINE-5-PARITY.md), and [S26 Ultra test checklist](docs/DEVICE-TESTING.md). Historical concept images are design references, not screenshots of the APK.

## Build and verify

```bash
cd /workspace/Mixline-Mobile-DJ
source /workspace/.mixline-tools/activate.sh
npm test
bash scripts/build-apk.sh
```

The prepared environment supplies JDK 21, SDK 36, Build Tools 36.0.0 and Gradle 8.13. Elsewhere install corresponding tools and set `JAVA_HOME` and `ANDROID_HOME`. The build script runs assembly/lint, validates signing/alignment and writes `artifacts/Mixline-5.0.0-test1.apk` plus SHA256.

For browser development, run `npm run serve`, then:

```bash
node tests/v5-browser.mjs
node tests/video-browser.mjs
```

Browser checks require Chromium and Playwright; scripts support the prepared cloud tooling. Video checks use controlled players and do not establish live YouTube playback. The older app/motion browser scripts document 4.0 and use its retired navigation selectors.

## Test edition

Package `com.mixline.studio.testing`; version `5.0.0-test1` / `50001`; minimum API 29, target API 36. The app uses bundled Web UI/Web Audio inside a Java Android shell with scoped native file import/export, interruption handling and haptics. It does not contain native low-latency DJ DSP.

This signed sideloading build is for testing. Physical S26 Ultra latency, haptics, thermal behavior, interruptions, USB-C routing, source playback and native export still require device checks. Recording captures supported local/eligible master audio, effects and sampler, with no microphone. MediaRecorder format depends on WebView; the recording safety threshold is 48 MB and native export ceiling 64 MB. Uninstalling/clearing app data removes local imports, sessions and unexported takes.
