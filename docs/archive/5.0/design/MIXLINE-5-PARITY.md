# Mixline 5.0 — restoration audit and screen study

Date: 28 October 2026, America/Barbados. Status: design proposal; no 5.0 implementation approved.

This audit expands [the discussion brief](MIXLINE-5-DISCUSSION.md). Baseline: current Android 4.0.0-test2, commit `96c97ed`. Application code, APK, signing, publication and environment configuration are untouched by this design pass.

Implementation update: the user subsequently authorized the 5.0 build and GitHub update. This document preserves the design-phase baseline and comparison; see [the 5.0 release scope](../RELEASE-5.md) and [verification](../VERIFICATION-5.md) for the delivered implementation.

## Evidence and limits

Reviewed the visible release descriptions in both the [original conversation](https://chatgpt.com/share/6ae009be-afd4-83ea-8e24-6fc6858816ad) and [later mobile conversation](https://chatgpt.com/share/6ae123ee-4ab4-83e8-b6f2-1bea2f69eff6), the recovered mobile presentation source, approved historical design boards, and current `web/app.js`, `engine.js`, `store.js`, `video.js`, `waveform.js`, `motion.js` and documentation.

Historical coverage: initial rehearsal prototype → V2 → online V3/V3.1 → Touch Studio V4 → Wave Studio V4.1 → later mobile v1–v3 → current Android 4.0. Version numbers are not a single chronological series.

“Older documented” means an archived release description claims implementation. It does not mean it was rerun here. The complete older engine and original distributable source bundles are unavailable; this is a comparison of recoverable evidence, not a guarantee that undocumented behaviors have been found. No provider access, account connection, current API quota or source-specific commercial right was validated in this pass. Old test counts are not current test results. Current status below is source-inspected, with device testing still outstanding.

The older V4/V4.1 release explicitly left **live Audius and Jamendo playback unverified**. That does not justify omitting their library integrations from the restoration scope. Restore their complete user workflow, then test live search, audio access, permissions and device behavior before calling them operational.

## Source inventory — every named source remains accounted for

| ID | Source | Historical evidence | Current 4.0 | Proposed 5.0 treatment and evidence needed |
|---|---|---|---|---|
| S01 | Your Files / local imports | V2 onward; deck import, local preparation and recording | Present; managed copies survive ordinary relaunch | Retain persistence and restore full inspect/preview/cancel/eject workflow. Do not regress to reimport-on-reload. |
| S02 | Mixline Originals | Initial prototype described six authored synthesized loops with known metadata | Two generated demo tracks | Restore a useful six-track practice collection or document a deliberate replacement; do not claim the two-track pair is full historical parity. Recreate original audio if it cannot be recovered. |
| S03 | Audius | V3 search/trending, artwork/artist metadata and stream loading; retained in Touch/Wave | Absent | Restore source browser, result selection, preparation and explicit Load 1/2. Recheck current API/auth requirements, availability, eligible audio access/redirects, permitted processing and recording. Live success remains a required test. |
| S04 | Jamendo | V3 search, audio URLs, license details, public Client ID setup; retained in Touch/Wave | Absent | Restore source browser and Client ID setup with useful validation. Recheck current account/API terms and track permissions, allowed processing/caching/export, and live playback. Do not request or embed a client secret in the APK. |
| S05 | Spotify library/planning | V2 described PKCE, liked songs, playlists, paginated playlist contents, search, planning crate, refresh/disconnect/error handling. User later explicitly retired it in favor of Audius/Jamendo. Live account access was not established by those reports. | Absent | Keep its history explicit. Optional metadata/planning restoration requires a design decision and current endpoint/access checks. DJ audio requires an appropriate integration route. Use “Partner access required” details; no misleading promised release date or working Connect button for DJ playback. |
| S06 | YouTube | Later visible-player queue/start/repeat/transition/layering work; overlap remained experimental | Official embedded players, pasted links, saved starts, repeat/retry, guarded transitions and local accompaniment; live behavior unverified here | Retain as an optional video workspace, with visible players and source-specific controls. Validate allowed behavior and phone playback separately. No decoded waveform, custom EQ/scratch or master capture is implied. |
| S07 | Free To Use | Suggested as a free catalog/API candidate | Absent | User requested active investigation. Check present API availability, licenses and mixing/export suitability before offering Browse or Load. Not a removed integration. |
| S08 | Internet Archive | Suggested for downloadable/public-domain or licensed audio, rights per item | Absent | User requested active investigation. Verify recording-level permissions, file suitability, metadata, fetching and decoding. Public availability alone is insufficient. |
| S09 | Wikimedia Commons | Suggested for licensed test assets | Absent | User requested active investigation for curated audio discovery/import, with file-level license and attribution. Not an older full DJ catalog. |
| S10 | Beatport / Beatsource offering | Later DJ catalog candidate; access not supplied | Absent | Partnership investigation. Confirm current product structure, integration route, entitlement, Barbados availability and supported features; no assumed connection. |
| S11 | TIDAL DJ | Later commercial catalog candidate | Absent | Partnership investigation with explicit access/entitlement and playback processing capabilities. Ordinary metadata/player access is not assumed to supply custom DSP input. |
| S12 | SoundCloud / SoundCloud DJ | Discussed as restricted API/partner candidate, later remix discovery option | Absent | Investigate the supported DJ route and eligible catalog. Not a proven older integration being restored. |
| S13 | Free Music Archive | Considered and described as unsuitable for direct API/hotlink integration in the historical research | Absent | Keep as a historical option rather than invent a live API. Licensed user imports may be possible; recheck current offering before a catalog commitment. |

Recents, Favorites, Crates and Queue are **collections**, not audio providers. Device picker locations, including a cloud-backed document provider Android may expose, are import locations rather than promised direct streaming integrations. There is no recovered evidence of completed Dropbox/Drive/Bandcamp adapters.

### Additional-source feasibility — first investigation

The user explicitly selected investigation of all three additional free sources on 28 October 2026. They are now active research items alongside the Audius/Jamendo restoration, rather than an unrequested backlog. Provider tiles remain proposals until actual access and capabilities are verified.

| Source | Preliminary role based on the archived research | Questions to resolve next | Candidate first usable slice |
|---|---|---|---|
| Free To Use | Music-oriented discovery candidate; the earlier conversation described public search/stream/download APIs and license conditions | Is the API still offered? What authentication/quotas and attribution apply? Do its current terms cover third-party DJ processing, mixed recordings, distribution and retention? Do audio URLs permit reliable loading/seeking? | Search → license/details → eligible-track preview → explicit Load 1/2. Mark recording/offline behavior only after permission and technical validation. |
| Internet Archive | Potential archival/public-domain or openly licensed audio; heterogeneous metadata, item rights and formats | Which music collections/files have sufficiently clear rights? Can search reliably identify those files? What original/composition/recording rights and attribution apply? Which formats, download sizes, redirects and seek behavior work on Android? | Curated, rights-reviewed music collection → file/format inspector → explicit import/prepare. Avoid presenting arbitrary archive uploads as a ready DJ catalog. |
| Wikimedia Commons | Candidate for clearly documented test audio and small curated musical assets; not a substitute for a mainstream song catalog | Can API search return suitable musical audio with authoritative file-license/credit metadata? Which files and formats are usable? What attribution and other rights apply to each asset? | Small reviewed collection with license/source/credit retained alongside allowed local imports; evaluate wider search separately. |

These are design hypotheses, not newly verified service features. Research order: establish current official API/terms → inspect metadata and representative eligible files → check fetch/decode/analysis → prove two-deck loading and source-capability handling → test recording and permitted export → test relaunch/offline behavior where allowed. In-browser/phone processing and permission to do it are separate checks.

Recommended shared quality-of-life behavior: a source-details panel, visible availability/connection state, stored track credit/license link, an explicit reason when Load/Record/Save offline is unavailable, and preserved outgoing playback on network or decoding failure. Do not add five visually identical “Connected” badges before the services work.

Live-documentation check on 28 October 2026: requests through the inherited session proxy to `https://freetouse.com/api`, `https://archive.org/developers/`, and `https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia` all failed with **HTTP CONNECT 403 Forbidden**. The managed environment's enforced custom allowlist contains `chatgpt.com` and `developer.android.com`, plus package-manager presets. The initial sandbox also prevented network calls; the permitted read attempt outside that sandbox reached the proxy denial. This was not an automatic approval-review rejection. No network policy or environment draft was changed and no alternative route was used. Current API/terms/live-file findings remain **blocked, not verified** until supported network access to the official documentation and necessary media/API hosts is available.

### Provider behavior contract

- A source declares separately what it supports: metadata, discovery, preview, deck playback, processing/scratch, tempo, waveform/analysis, recording/export, and offline retention. Unknown capability is not treated as permission.
- Preserve provider ID and playback-source identity. A local file linked to an external reference remains labeled Local; source badges must not imply Spotify or YouTube audio has entered the local mixer.
- Connection states: not configured → validating → available, or sign-in/setup required, expired, rate-limited, offline, region unavailable or service failure. Do not fabricate connection success or measured download progress.
- Search and selection do not fetch/decode/play track audio. Explicit Prepare waveform, Preview or Load identifies the work being requested. Fetch only metadata needed for normal browsing.
- Loading stages are truthful: resolving/fetching/decoding/analysis/ready when applicable. Cancel prevents late assignment; failure retains the previous deck and outgoing audio.
- Restricted actions explain the practical limitation at the action. If a source cannot be recorded, resolve that conflict before it joins a recording session; never silently omit it from the take.
- Crates/sessions retain references and allowed preparation data. Store audio offline only when the source allows it. Show missing/unavailable items with relink, replace, skip or retry paths.
- Source health/setup belongs in Library → Sources and Settings → Sources. Playback remains in the same persistent session across music workspaces.

## Performance parity ledger

Each row is a restoration/retention requirement for scoping. “Partial” includes engine operations with missing controls. The proposed surface is not approved navigation geometry.

| ID | Older documented capability | Current 4.0 assessment | Proposed surface / next action |
|---|---|---|---|
| P01 | Two independent loaded decks, identities and transport | Present | Retain; all workspaces observe the same engine/session. |
| P02 | Main Cue set/return/hold audition; separate Return to start | Cue return/pause and start setting present; no hold audition | Restore hold/release semantics and explicit return action. |
| P03 | Forward/reverse platter scratching preserving release state | Present as granular Web Audio scratch | Retain and device-test quality; do not label native DSP. |
| P04 | Temporary slower/faster nudge returns to chosen tempo | Missing; current `nudge` API is a beat jump | Restore dedicated momentary pitch-bend controls and interruption release. |
| P05 | Slip | Present, including user-facing toggle in Pads | Retain; the older current-design note saying it lacks UI is inaccurate. |
| P06 | ±16% tempo, reset, match tempo and one-time phase alignment | Present; playback speed changes pitch | Preserve and label separately from maintained sync or key lock. |
| P07 | Tap and manual BPM correction | Present | Retain source/manual labeling and exact entry. |
| P08 | Approximate BPM estimation when metadata absent | Missing | Restore analyzed estimate with uncertainty and manual correction. |
| P09 | Manual downbeat and quantized cue/loop positions | Missing | Restore a grid editor with visible reference and explicit Quantize state. |
| P10 | Eight named/colorable hot cues, individual set/jump/clear | Eight numbered positions; names and individual edit/clear missing from UI | One shared cue model across Waves/Pads/Prepare; restore editing. |
| P11 | Manual named section markers; previous/next navigation | Missing | Restore manual Intro/Vocal/Drop/Outro annotations; no automatic section-detection claim. |
| P12 | Beat loops from ¼ to 32, manual In/Out | Present | Retain all lengths and exact custom labeling. |
| P13 | Graphical custom loop boundaries and saved settings | No draggable handles; session stores active loop | Restore handles and exact editing; persist custom boundaries. Saved loop-bank proposals are separately scoped below. |
| P14 | Beat jumps | Present, fixed UI choices −16/−4/+4/+16 | Preserve and provide deliberate length selection; distinguish nudge. |
| P15 | Overview plus detailed waveform and expanded Wave desk | One overview only | Restore dual scale, visible zoom window and explicit Deck 1/2 focus. |
| P16 | Seek, Pan and Scratch modes; waveform uses same scratch engine | Staged seek only; scratch limited to platter | Restore explicit modes and shared engine behavior. |
| P17 | Pinch zoom; pull-down fine scrub; magnified precision view | Missing | Restore zoom/fine controls with non-gesture alternatives. |
| P18 | Fit/Follow; proposed seek vs real playhead; cancel seek; exit loop when seeking out | Staged marker/cancel present; no full view system; seeking retains active loop | Restore complete behavior and playback-state preservation. |
| P19 | Continuous PCM contour, energy layer; mono/stereo distinction | Real cached contour retained, single combined peak summary | Restore detailed measured display without invented spectrum/stems. |
| P20 | Separate trim and channel volume | Channel accessible; trim API without UI | Expose both with different labels and useful scales. |
| P21 | Three-band EQ with cuts, LPF/HPF, scoped resets | EQ/filter present; no deliberate kill controls; channel reset broad | Restore kill and separate EQ/filter/FX reset actions. |
| P22 | Real channel/master meters, master level/mute | Channel meters and master level accessible; master meter API but no UI; no master-mute control | Restore measured master and peak display, explicit mute. Current channel analyser is before crossfader, so it cannot prove audience contribution. |
| P23 | Blend/Cut crossfader curves | Present in Preferences | Preserve; make curve discoverable in Mixer. |
| P24 | Large filter/echo XY pad | Missing | Restore central pad with precise knob/value alternatives. User confirmed latch after release. Bypass remembers position; Reset neutralizes. |
| P25 | Echo, reverb and eight synthesized sampler sounds | Present, sampler under FX | Retain; direct Pads → Sampler access plus FX rack. Additional DSP types are not silently included. |
| P26 | Blend, bass-exchange, echo-out timed macros; immediate manual takeover | Blend and fixed echo-out; bass exchange missing; limited duration UI | Restore three styles, bar/seconds duration as appropriate, accurate progress and cancellation by affected manual controls. |
| P27 | Independent simultaneous touch and safe interrupted release | Pointer-driven controls exist; current suite covers parts of this | Preserve per-pointer ownership; test waveform/FX/pads plus fader combinations on phone. |
| P28 | Fine adjustment and tap-value exact entry | Rotary drag/keyboard step/reset present; global Fine/exact pattern absent | Restore consistent precision UI across knobs, faders, times and grid fields. |
| P29 | Keyboard performance shortcuts | Only component keyboard actions and Escape are exposed | Restore documented desktop/keyboard controls with text-input suppression and safe release. Editable mappings were proposed, not proven complete. |
| P30 | Direct Decks/Mixer/Pads/FX/Library workspaces | Tools hub and below-fold Perform shortcuts | Proposed six direct destinations add Waves, retaining all old workspaces. Validate rail on actual phone. |
| P31 | Persistent dock with both track identities, state, transport and crossfader | Transport/fader retained; main dock generally omits real track titles | Restore identities and meaningful states, including playing but silent. |
| P32 | Focus deck and keep other deck visible/controllable | Present in test2 companion strip | Retain on Deck/Wave/Pad/FX views and landscape. |

## Library, loading and rehearsal ledger

| ID | Older documented capability | Current 4.0 assessment | Proposed surface / next action |
|---|---|---|---|
| L01 | Search songs + artists, title-only, artist-only | Combined substring search | Restore deliberate search modes. |
| L02 | Min/max BPM, query ranges, sorting, include unknowns | BPM text substring only | Restore structured filters, unknown toggle, sorting, Match Deck ±6 and clear chips. Provider filtering must explain whether it covers fetched results only. |
| L03 | Load more / provider pagination and discovery | Absent | Restore provider-backed pages/trending where supported, cancellation and retry. |
| L04 | Select / Deselect and persistent selected-track inspector | Direct Load/Prepare actions; no independent selected state | Restore obvious selected row and inspector, with no auto-play or auto-load. |
| L05 | Artwork, artist, source, duration, BPM, On A/On B | Partial; fallback covers, no imported-art extraction; no row assignment badges | Restore metadata/assignment visibility and honest unknowns; preserve fixture artwork attribution. |
| L06 | Explicit Load A/B, protected replacement | Present | Retain target-specific actions; show selected item versus loaded item distinctly. |
| L07 | Eject A/B and cancel loading independently | Engine APIs exist, UI missing | Restore reachable controls, empty deck state, obsolete-load rejection. |
| L08 | Failed/cancelled replacement preserves prior track; no cumulative audio-memory leak | Atomic load/token logic present | Retain and regression-test repeated long-track replacements and cancelled requests. Preparation must not retain duplicate full decode copies indefinitely. |
| L09 | Independent library waveform/preview position and explicit preparation | Only numeric metadata/start form | Restore dedicated Prepare inspector, isolated from live deck clocks. Current output preview must be labeled public/audible. |
| L10 | Prepared start, named cues/markers/custom loops saved | Title/artist/BPM/start and deck cues/loop snapshot only | Restore full track-preparation record and consistent next-load application; do not mutate a live instance by editing its library record. |
| L11 | Preparation crate and ordered set builder | One live queue, no full crate/set builder | Restore reusable ordered crates/sets, add/remove/reorder, save/reopen. Keep a set plan distinct from the consumable live queue. |
| L12 | Later Recents and Favorites collections | Missing | Restore collections and safe library deletion/relink behavior. |
| L13 | Adjacent-pair transition rehearsal; replay, cancel/reset; 4/8/16 bars | No dedicated rehearsal/pair/replay workflow | Restore practice surface from a saved set, exact starting state and safe replay. Do not replace the live set without an explicit action. |
| L14 | Save/reopen set name, track order and blend length | Sessions save queue/state; no per-pair rehearsal model | Restore reusable basic recipe semantics. Rich per-transition notes/history/A-B comparison were proposals, not proven older implementation. |

## Later mobile, session and interaction ledger

| ID | Historical/later requirement | Current 4.0 assessment | Proposed 5.0 treatment |
|---|---|---|---|
| U01 | Prepared live queue, chosen deck/start, rename, reorder, Skip/Restore | Add via Prepare; one move-up control; remove/undo; no full queue rename/skip/restore editor | Restore complete queue editing with up/down and optional drag alternative, exact start, rename, skip/restore and safe cancel. |
| U02 | Separate Next preparation from Cut; progress and manual fade takeover | Present with readiness guard for video; mode-specific queue; manual start/fade | Retain and make target/readiness explicit. Handle stale prepared items, failed incoming sources and user cancellation. |
| U03 | Portrait expandable queue; landscape side panel; controls reachable while browsing | Partial, current views vary | Preserve same session/scroll/selection when opening and closing panels; no modal chains for frequent actions. |
| U04 | Both videos visible; paste/discovery, save starts, repeat, retry, recovery | Paste/reference workflow present; no video search API; live playback unverified | Preserve supported controls; discovery/search remains an explicit integration dependency. No source-labeled fake waveform/VU. |
| U05 | Video + local accompaniment; two-video transition request | Experimental implementation present, not live validated | Keep visible and optional; resolve platform feasibility and policy rather than promising proven parity. Do not let audio-core navigation unexpectedly pause a local session. |
| U06 | Named sessions and recovery; restore paused | Present, local media retained, periodic recovery includes video | Retain; extend schema to all restored preparation/source/FX/grid/collection fields with migration and missing-reference recovery. |
| U07 | Local master recording, saved takes/download | Present; supported MediaRecorder format, 48MB stop threshold / 64MB native export ceiling | Retain clear recording scope, effects/sampler capture, storage errors and export. Test phone-generated files. No mic for this test scope; no claim of WAV/MP3 or unlimited recording. |
| U08 | Haptics Off/Essential/Detailed + Test feedback | Boolean with detent throttling | Restore profiles/test and meaningful native events; preserve visual fallback. Audio never waits on haptics. |
| U09 | Portrait/landscape continuity, focus views, fullscreen | Rotation handled in shell; full screen/workspace geometry still needs device review | Retain deck positions, loops/cues, live fade, queue and latched FX across layout changes; release interrupted gestures safely. |
| U10 | Brightness/theme/motion and other preferences | Dark/light and reduced motion; no full historical brightness controls | Restore practical brightness/glow control and deliberate save/reset. Keep active vs saved/draft settings clear. |
| U11 | Output/cue routing tools | Android-selected stereo, audio focus and unplug handling; no private split/multichannel cue | Show actual current output. Separate private-monitor feasibility from restored UI. Speaker/USB-C remains first route. |
| U12 | Load protection, recovery and audio health | Partial; performance lock; decode limits; lifecycle pauses | Retain explicit errors/diagnostics, no unexpected auto-resume; test calls, background, USB unplug, storage pressure and long sessions. |
| U13 | Session/set import/export and recording management | Recording export present; sessions have save/restore/delete, no portable session file | Restore/evaluate portable recipes/reference export explicitly; do not imply music is bundled or cloud sync exists. |
| U14 | Always-available utility entry points | Tools hub contains record/session/preferences | Queue, recording status and session/settings access remain directly discoverable; exact top-bar geometry is proposed. |

## Earlier ideas that are not established working parity

Keep these in the backlog so they are not lost, but do not describe their absence as removal of proven functionality:

- Pitch-preserving key lock, independent key shift, automatic musical-key detection and compatible-key suggestions. Authored demo metadata is different from detected key for arbitrary audio.
- Maintained beat synchronization, tempo leader selection, variable-tempo grids and phrase/drop analysis. Restore the documented manual grid and one-time alignment before expanding.
- Saved named loop banks, instant doubles, dedicated reverse/brake, crossfader bypass per channel, automatic gain matching and gain-reduction display where the older release only proposed them.
- Editable keyboard mapping/profiles, transition notes/history/comparison and richer per-pair recipes beyond the original basic saved order/blend length.
- Native low-latency DSP/AudioWorklet path, streamed long-track engine and disk-streamed long recording. A WebView APK is not evidence of these.
- Private headphone monitoring, Cue/Master blend, split mono and USB multichannel routing without external DJ decks. Routing depends on usable independent outputs and Android support.
- Four decks, stems, automatic coaching, account/cloud sync, public sharing and billing. These were ideas or deferred work.
- Additional FX types such as flanger are future design candidates, not implied by the two restored Echo/Reverb tabs.

## Proposed screen study

The user has confirmed **balanced instrument** (medium platters + substantial waveforms) as the starting performance view. Expanded Wave workbench and Vinyl focus remain useful views of the same session and controls. The exact six-destination rail and panel geometry remain proposals; approving layout emphasis does not approve implementation or every illustrated control.

The nine concepts are organized as three boards, not nine extra menu destinations:

| Board | Screens | Intended task |
|---|---|---|
| [Performance](renders/01-performance.png) | Decks, Wave Inspector, XY FX | Play both tracks, inspect/edit the selected waveform, shape filter/echo with latched XY state. |
| [Library](renders/02-library.png) | Sources, Browse/inspect, Prepare | Choose source, search/select, prepare safely, then load a named destination deck. |
| [Controls](renders/03-controls.png) | Mixer, Pads, Live queue/Challenge | Shape channels/master, perform cues/loops/sampler, prepare the next beat with reachable Load/Cut. |

All renders are **generated concept illustrations with sample data**, not screenshots, working prototypes, provider results, timing benchmarks or phone usability evidence. Original fixture art is illustrative; source glyphs are not approved branding assets. Historical reference boards informed material/deck color but were not copied as layout requirements.

The working rail is Decks · Waves · Mixer · Pads · FX · Library. Queue/Challenge and record/session/settings are utilities of the same session. Library Sources, Browse and Prepare are connected subviews/panels. Opening a live inspector should preserve reachable dock controls and return context. Blocking confirmations are reserved for disruptive actions.

Portrait expands the work area above the dock; landscape should place the selected inspector or library beside the decks without shrinking targets. Desktop can use a persistent library and mixer/decks together. A landscape layout and settings/recording/recovery states are still to be drawn; absence from these nine renders is not scope deletion.

### Motion and glow behavior to prototype

| Trigger | Proposed response | Interruption / reduced-motion rule |
|---|---|---|
| Accepted press/cue/pad | Immediate press depth/local flash; settle to actual saved/active state | Cancel transient animation safely; static state still shows acceptance. |
| Ready vs audible | Ready = thin steady identity; audible = measured post-fader contribution and explicit status | No fake VU or decorative pulse implying audible output. Playing-but-silent gets text/reason. |
| XY movement/release | Puck/value follow input; brief fading gesture trail; position and active amount remain latched | Release never springs to neutral. Reduced motion omits trail, keeps puck/readouts. |
| Bypass vs Reset | Bypass disables processing while preserving settings; Reset returns selected target to neutral | State and audio agree; do not delay DSP commands for animation. Tail policy requires separate design decision. |
| Loop / armed-next | Green bounds only for actual active loop; amber pending-next with readiness text | No glow that makes selected/queued appear loaded or playing. |
| Inspector open/close | Short interruptible continuity from its source; transport remains reachable | No input gating; reduced motion uses immediate state change. Preserve focus and origin on close. |
| Transition | Progress follows actual audio-clock automation; manual takeover removes automation state immediately | No ornamental timer or level snap on cancel. |

These are interaction proposals; static renders cannot demonstrate actual animation quality. Exact durations/intensities need a focused motion prototype and device review. The prior 4.0 test2 interface actually throttles repaint to about 32ms; smoothness must be measured during future implementation rather than inferred from these images.

### Render review and unresolved details

Visually reviewed the old reference boards and all generated/refined boards. Refinements removed invented musical-key codes and unscoped FX tabs, made Queue/Spotify-details/Save actions clearer, and corrected queued starts that were accidentally illustrated at track end.

Remaining illustration precision is not a behavior specification: the XY puck position is not geometrically exact to its numeric values; drawn meter segments do not prove correct dB calibration; some waveform time/loop/marker placements and sample metadata differ between panels. Source labels for original demos should use ORIGINAL consistently in the implementation. These must be resolved in deterministic wireframes/prototypes, not copied from painted pixels. Touch sizes, contrast, text expansion, keyboard/focus, safe-area insets and motion have not been verified on an S26 Ultra by making these boards.

## Restoration readiness before a 5.0 build

1. Keep an explicit disposition for every S/P/L/U row: retain, restore, deliberate redesign, conditional source/route work, or agreed defer. No invisible deletion to shorten menus.
2. Agree screen emphasis, navigation and where precise Wave/FX/Prepare panels open. Preserve shared state rather than rebuilding players on route changes.
3. Validate Audius/Jamendo with current documentation and live services, including actual eligible tracks on both decks. Obtain only configuration required for an identified integration; no credentials are needed for this design discussion.
4. Design migration for track preparation, named cues/markers/loops/grid, crates/set recipes, provider references, latched FX and preferences. Never equate saved recipe with audio recording.
5. Define regression tasks before implementation: source search/filter/select/deselect, prepare without moving live decks, cancel/eject/failed replacement, two long tracks/repeated replacement, Cue hold/nudge release, waveform scratch + fader, FX latch/bypass/reset, precise cues/loops/grid, rehearsal replay, queue skip/restore, session relaunch and non-silent master export.
6. Verify rendered phone/landscape layouts and a motion prototype; then physical S26 Ultra audio, multi-touch, output changes, interruptions, battery/heat, sustained playback, source failures and export. A generated render, successful build or historical test total is not this evidence.

No application code was changed or tested in this design pass. No APK was built, committed, pushed or published.
