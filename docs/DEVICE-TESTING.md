# S26 Ultra test checklist

Use this checklist for **Mixline 5.0.0-test1**, package `com.mixline.studio.testing`. These are acceptance tests to perform, not claimed passing results.

The user reports that the S26 Ultra is on the latest Android/One UI versions. Exact OS build numbers have not been supplied or verified.

## Record the test setup

Record the APK SHA-256, phone model, Android and One UI versions, Android System WebView/Chrome version, display scaling, navigation mode, orientation and output route. Start with the phone speaker, then repeat critical audio checks with the intended USB-C headphones or adapter. Keep the phone volume modest for initial transitions.

Use two ordinary audio files you can play locally and the bundled original demo pair. For video checks, use known embeddable YouTube videos and note their links and network conditions. A blocked video or ad is a source condition to report, not evidence that the local audio engine failed.

## Install the standalone test build

1. Build or obtain `artifacts/Mixline-5.0.0-test1.apk` and its `.sha256` file. Verify the file hash against the supplied value.
2. Transfer the APK to the phone and allow installation from that transfer/browser/file-manager app when Android requests it. Install the Mixline test edition.
3. Confirm the displayed version is `5.0.0-test1` and the package is `com.mixline.studio.testing`. Existing Mixline installations with a different package should remain separate.
4. Launch without an account. Load the original demo pair. Confirm both decks are initially under your control rather than starting unexpectedly.

For a developer with an authorized USB-debugging connection, `adb install artifacts/Mixline-5.0.0-test1.apk` installs the package. Use `adb install -r` only for an update signed with the same key. An APK rebuilt with a different debug key may require uninstalling; export important recordings first because uninstalling deletes app data.

## Local mixing and touch

- Play each deck separately; confirm deck identity, audible output, play/pause state and displayed time agree.
- Start both and move the crossfader end-to-end and through the center. Check for unexpected silence, clipping, jumps or stalled gestures.
- Start a timed fade, then touch the fader midway. Confirm immediate manual takeover without the timed fade resuming afterward.
- Repeat cuts and completed fades with **Pause outgoing deck** enabled and disabled. Verify the silent deck follows that saved preference.
- Try waveform seek, platter scrub, eight hot cues, manual/tap BPM, loop lengths, Loop In/Out, beat jumps and one-time sync. Report latency separately from visible animation smoothness.
- Change channel EQ/filter and echo/reverb, and trigger sampler sounds while both decks play. Confirm controls affect the intended local channel.
- Browse the library and queue while playing. Confirm the persistent dock stays reachable and editing preparation does not move the playing deck.
- Load another file into a playing deck; cancel the confirmation, then try a corrupt/unsupported file. The original track should survive cancellation or decode failure.
- Test portrait and landscape, one-handed Challenge actions and two simultaneous touches. Check gesture-navigation edges, keyboard/inset overlap, clipped labels, and accidental neighboring controls.

## Restored 5.0 controls and preparation

- Hold and release main Cue while paused, and test temporary tempo nudge in both directions. Release, interrupted touch and view changes must not leave a held state active.
- Open Waves. Test Seek, Pan and Scratch separately, pinch zoom, Fit/Follow, fine positioning, cue/marker edits and custom-loop boundaries. Confirm Pan changes the viewport without seeking and an abandoned Seek does not move playback.
- Open FX and move the XY puck. Release and change views: its filter/echo position must remain latched. Bypass must retain the settings, and Reset must return the selected deck to neutral. Verify the audible effect agrees with the shown values.
- Test separate trim/channel gain, EQ kill, master mute and visible channel/master levels. A pre-fader channel meter alone does not prove a deck is audible in the main mix.
- Try bass-exchange transitions and interrupt with a relevant manual control. Check that cancel preserves current values rather than snapping back.
- Prepare a track while the other deck plays. Independent preview must use its own position and explicitly identify its current output. Confirm live deck positions are not moved by preview edits.
- Check Favorites, Recents, Crates and source filters; relaunch to verify saved organization and preparation. Test source errors/setup without treating a visible source tile as a successful connection.

## Challenge queue and recovery

1. Prepare at least three local tracks with different start points; add them to the queue.
2. Move a queued item up, remove another, and undo removal. Relaunch and confirm the saved queue order.
3. While a deck plays, select **Load next**. Verify the prepared track starts at its saved point and does not become audible before your deliberate play/cut action.
4. Select **Cut now** and confirm the intended deck receives the mix. Test both directions repeatedly.
5. Enable performance lock. Loading/seeking/queue changes should be protected while intended transport actions remain usable.
6. Save a named session with positions, cues, a loop and a queue. Restore it and confirm it returns paused with the saved data.
7. Play for at least 20 seconds with a loaded local track, close the app, then inspect **Sessions** for the recovery snapshot. It should not autoplay on restore. A periodic snapshot may lag the last action.
8. Delete an imported track used by a saved session and attempt restore. Confirm a clear missing-file response rather than invented availability.

## Lifecycle and audio output

- Rotate in both directions during playback and a timed fade. Playback state, positions, controls, queue and transition should survive normal rotation.
- Leave the app using Home, switch apps, lock the screen and return. This edition is designed to pause on interruption and require deliberate resume; it does not provide background DJ playback.
- Trigger audio-focus loss using another media app or an incoming call. Confirm Mixline pauses and does not unexpectedly resume at high volume.
- Connect USB-C headphones, test playback, then unplug them while playing. Confirm the noisy-output event pauses playback rather than unexpectedly sending the mix to the speaker.
- With headphones attached, verify left/right output and level behavior using material whose stereo content is known. Android chooses the route; this build has no independent cue-output routing.
- Repeat Back navigation through tools, dialogs and the main screen. Confirm the app does not lose state or leave hidden playback running.

## Recording and export

1. Start a local deck, begin a recording, blend the second deck, use an effect and stop.
2. Confirm the take appears in **Recordings** with its actual MIME type and size. Relaunch and check that it remains available.
3. Export through Android's document picker, choose a destination, then play the exported file in another compatible app. Check duration, audible content and file extension/format agreement.
4. Start another export and cancel the picker. The original take must remain in Mixline and export should still be possible afterward.
5. Start recording and trigger an app/audio interruption. Check whether the take is finalized, saved and recoverable; record any lost audio or missing save as a defect.
6. Check the 48 MB recording stop threshold and 64 MB export limit. Confirm an automatically stopped take remains available to save. Do not infer unlimited or native disk-streamed recording from a short successful take.
7. Confirm video audio and microphone audio are not included. The app records the local master only.

## Experimental visible-video workflow

- Switch to Video decks, paste one video link, give it a recognizable title/start point and cue it. Start playback with a deliberate user action.
- Repeat on the second deck. Both players must remain visible and unobscured in portrait and landscape; app UI should not cover player controls.
- Distinguish queued, initialized/ready, buffering, playing and blocked/error states. “Player level” is a requested volume setting, not a measured VU meter.
- If both videos can play, test manual volume changes and chosen-duration fades. Record actual behavior, ads, buffering and autoplay restrictions; two-player overlap remains experimental until these tests establish it.
- During an incoming transition, disconnect the network or try a video that cannot embed. The outgoing deck should remain available, with a visible recovery action.
- Test Retry and Open in YouTube. Returning from the external app should not silently restart hidden playback.
- Check that app backgrounding pauses visible-player playback. YouTube video must not continue as a hidden audio-only mode.
- Load an instrumental into local Deck 1 from Library, switch to Video Challenge, then use **Local instrumental layer** to start/pause it while the video players remain visible. Check its separate level slider and verify the video crossfader changes the video balance without silently replacing the local track. Record this as a live-phone result; mocked video checks do not establish audible layering.
- Enable repeat for each video. Verify the saved start position is used and report any seek/restart gaps; sample-accurate video looping is not promised.
- Save a video-only session with positions and repeat enabled, relaunch, and restore it. Verify both video references, saved positions and repeat preferences return paused. Check the periodic recovery snapshot also works without a loaded local track.
- Record while a local instrumental accompanies video. Confirm the exported take contains local audio only, never the videos.

## Sustained-use and defect report

After the short checks, run a 30-minute local session with queue browsing, transitions and recording. Note battery level, heat, stutters, app closure, touch response and recording size at the start and end. Extend the duration only after basic playback and recovery are dependable.

For a defect, record: build/hash, output route, orientation, source type, exact steps, expected result, observed result, whether retry/relaunch recovered it, and any visible error. Diagnostics can report engine state/sample rate and browser-reported base latency; that value is not a physical touch-to-sound latency measurement.

A test APK being installable does not certify production readiness. Retain failed, skipped and unrun checks explicitly, especially real-device latency, YouTube overlap, interruptions, recording export and session recovery.
