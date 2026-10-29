# Device test checklist — Mixline 6.0.0

Acceptance tests to run on the phone (package `com.mixline.studio.testing`, version 6.0.0). These are not claimed results.

1. **Install**: download `Mixline-6.0.0.apk` from the GitHub Actions artifact or release; verify the SHA256; install. If a 4.0/5.0 test build is present and CI used a new key, uninstall it first (this removes its local library and sessions).
2. **First run**: the Decks workspace shows two empty decks. Load two originals from Library. Nothing plays until you tap play.
3. **Transport**: play, pause, CUE hold-to-audition and release, SYNC, tempo fader and reset, quick loop, slip, platter scratch (vinyl) and nudge. Note any audible latency or dropouts separately from animation smoothness.
4. **Mixer**: crossfader, curve, EQ kills, filter, trim, master mute; meters move with audio.
5. **Pads**: set, jump, rename and clear hot cues; loops of several lengths; sampler sounds; beat jumps.
6. **FX**: XY pad latch, Bypass, Reset, filter / echo switches, reverb, echo time; blend, bass swap and echo-out transitions and manual takeover.
7. **Library**: import three files from the device (long titles, missing artwork), analyse BPM, set a start point and loop, Load to Deck 1 while Deck 2 plays, favourite, crate, practice pair. Online: Audius search and load an open-licensed track; Jamendo with a Client ID.
8. **Challenge**: queue two YouTube links, NEXT to each deck, CUT and 4 s fade, loop, reorder, remove with undo; a blocked video shows an error with Retry.
9. **Record**: record one minute, stop, play it back from Settings → Recordings, Save to a file through the Android picker.
10. **Sessions**: save a session, change things, restore it (paused); kill the app mid-set and confirm the recovery prompt on relaunch.
11. **Lifecycle**: incoming call, headphone unplug, screen off, rotation mid-gesture: playback pauses safely and resumes only when you tap play.
12. **Settings**: haptics Essential / Detailed and the Test cue; Violet · Teal palette; glow; reduced motion; light theme.

Record the APK SHA256, Android / One UI version, WebView version, output route and results per item.
