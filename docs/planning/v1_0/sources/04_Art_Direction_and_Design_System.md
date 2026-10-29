# 04 · Art direction and design system

**Version 1.0 · 29 October 2026 · C Crystal Current selected - design handoff baseline; native validation pending**

New product, with no Mixline reuse. The user confirmed Android first and steampunk, reviewed **A — Precision Atelier** and **C — Crystal Current**, and selected **C**. Crystal Current is the approved art direction for the next design pass on the Galaxy S26 Ultra. A remains a historical comparison, not an approved alternative/night theme. Generated concept imagery does not verify a functional screen. ParDay is the assistant's name; the app's product name remains open.

## 1. Design brief

**Primary user:** a serious mobile DJ controlling a live set directly on a phone, including prepared mixing and fast spontaneous transitions. **Secondary user:** a casual streaming DJ who needs clear source availability and a quick route to a first mix. Initial intended use is personal practice and private gatherings. **First useful outcome:** two available tracks loaded, understood and mixed. **Hard moments:** dark or bright environments, one-handed browsing while music plays, small targets, long titles, unknown audio routes, interruptions and heat. **Return value:** preserved preparation, dependable recovery and faster repeat use.

**Selected concept:** a precision DJ instrument expressed through C pale frosted glass, titanium and subtle brass. The owner selected this material direction; precise colors, geometry, typography and render cost remain to be validated. Its critical information stays clear while material detail gives controls a tactile, crafted identity. Branding is allowed to be expressive; audio state remains literal.

Premium Product UI informs coherent composition, functional/visual acceptance, asset provenance and state completeness. The native-mobile brief overrides its default desktop/web-first sequence. Glass/brass is primarily identity and perceived craft; performance benefits are hypotheses to test, not established facts.

The first design target is the local Android app on the Galaxy S26 Ultra, with no required server or cloud account. Build the design around local library preparation and performance, then expose optional online source/ParDay capabilities through their own truthful states. AWS is a later extension with a roughly US$35/month planning target excluding AI, not an initial screen or onboarding requirement. Document 19 is the entry point for the first connected design deliverable.

## 2. Comparison record and selected direction

| Direction | Composition, type and materials | Signature interaction | Tradeoff |
| --- | --- | --- | --- |
| **A — Precision Atelier** | Graphite instrument bed, smoked glass panels, champagne-brass rims, engraved index marks, clean industrial sans with stable numeric readouts | A value ring and sparse haptic detent clarify a dial's musical position | Most direct match for restrained steampunk; dark glass needs careful brightness and contrast tuning |
| **C — Crystal Current — SELECTED** | Pale mineral glass, frosted panes, brushed titanium, dark-ink readouts, restrained brass joints/index marks | The same value ring and focus behavior rendered with lighter material and edge treatment | More futuristic and airy; pale decoration needs strong opaque numerical/control contrast |

The original comparison brief called for the **same geometry, controls, state and track content** in A and C. The user has now chosen C. Its next native layout must normalize the generated control differences rather than treating accidental render omissions as requirements. Both omit decorative spinning gears and animated steam: neither represents musical state. Genuine jog motion, meter movement and pending-beat indication remain useful. The previous Engine Room option is retained only in version history and is not part of the requested render comparison.

Neither option is merely a dark/light toggle. A emphasizes warm mechanical craft; C emphasizes frosted optical depth and precise pale metal. C now leads and still requires separately tuned low-light, daylight and opaque high-contrast treatments. Derive those from Crystal Current; the selection does not authorize A as a separate night theme.

## 3. Selected direction and proposed tokens

These numerical values remain proposals. **C is selected**; use the C palette table for implementation experiments. The first palette is retained only to document A, while the shared spacing, targets, type and focus rules remain applicable. Contrast and legibility must be measured on the actual composed native screen.

| Historical A palette / shared token | Candidate value / rule |
| --- | --- |
| Stage / opaque control surface / raised surface | `#0C1015` / `#171D26` / `#222B36` |
| Primary / secondary text | `#F3F5F6` / `#BAC2CC` |
| Structural brass | `#B9955D`; material cue, not a warning |
| Deck A / B / C / D | `#53D7E8` / `#FF955A` / `#B6A0FF` / `#82DEAB`; always paired with letters and state labels |
| Warning / critical | `#FFD75E` / `#FF667A`; always paired with explicit meaning |
| Spacing | 4dp base rhythm; 8/12/16/24dp group gaps |
| Targets | 48dp minimum on Android; aim for 56dp frequent transport/pads |
| UI type | Barlow candidate, system sans fallback |
| Numeric type | IBM Plex Mono candidate or tabular figures in the UI font |
| Type sizes | Start at 12/14/16/20/28sp; the smallest size is secondary detail, never a license to make essential live labels unreadable |
| Numerals | Stable width for BPM, time, loop length and meter units |
| Corner vocabulary | Small radii on instrument controls; softer bounded panel corners; never identical rounded cards for every element |
| Focus | Explicit high-contrast outline/shape independent of deck colour |

| Selected C palette | Proposed value / rule |
| --- | --- |
| Stage / opaque control / raised surface | `#DCE6EA` / `#F1F5F6` / `#FFFFFF` |
| Primary / secondary text | `#15252E` / `#455C68` |
| Structural titanium / restrained brass | `#98A9B1` / `#8B6B39`; no low-contrast metal-as-text shortcut |
| Deck A / B light-surface foreground | `#00697A` / `#A53E18`; preserve cyan/orange identities with clear letters and shapes |
| Deck C / D light-surface foreground | `#6541A5` / `#246A45`; distinguish label colour from luminous waveform accents |
| Warning / critical on pale surfaces | `#805600` / `#A01939`, with icons and written state |

The machine-readable set records `selected_direction: "C"`, uses C for its top-level palette and retains A only as an unselected historical direction. Selecting a material family does not approve every proposed color value. A generated highlight or altered shade does not silently replace a token or establish a contrast pass.

Night and daylight themes are independently tuned. A high-contrast Stage option uses opaque surfaces, stronger separators and reduced decorative detail. Respect system/in-app reduced-motion settings. Persistent transport locations do not move with changing values, badges or labels.

## 4. Composition and component families

The performance screen is an instrument, not a dashboard of unrelated cards. Waveform, musical position and control hierarchy lead. Avoid giant greetings or artwork that displaces controls. Small album art identifies tracks but is never the primary state signal.

Build canonical components for deck summary, waveform lane, cue marker, gain/EQ/filter dial, pitch rail, channel/crossfader, transport button, performance pad, XY pad, meter, source capability chip and library row. Every component documents states, semantic labels, touch region, units, geometry, engine binding and performance cost. Procedural vector/Canvas geometry is preferred for controls over a bitmap for each state.

Add a compact ParDay access button and structured suggestion card family: context summary, proposal, timing, affected deck/track, Preview, Apply, Dismiss, expired and applied states. Status text carries meaning; an animated orb is optional decoration outside Perform and never a success indicator. The assistant's visual identity shares the instrument's materials but remains subordinate to track and route state. A catalogue search result and an eligible playable file have visibly distinct actions.

Glass panels have a stable opaque contrast backing under text, a restrained edge highlight and optional local optical treatment. Do not refract labels or blur active values. Brass is concentrated on rims, index marks and control grips. Its mechanical detail explains affordances only if it remains recognizable at the actual size.

### Six shared UI contracts, adapted to native

| Family | Required native application |
| --- | --- |
| Badges | Count actionable items only. Hide known zero; display 1–99 then 99+; unknown stays unknown. Stable geometry, exact accessible count and explicit clearing rules. No badge on every deck. |
| Navigation | Phone uses labelled workspaces/docked browser. Tablet may use a collapsible resizable library pane if useful. Preserve current location and safe return; no desktop sidebar requirement is imposed on a phone. |
| Loading | Region-sized skeletons only for genuinely asynchronous data. Playing controls stay active. Real progress/unknown state, timeout and recovery; no fake percentages. |
| Dates | Relevant only to history/export filters: typed/picked parity, clear range and timezone semantics. Date-only data is not silently converted through UTC. Do not add calendar widgets to performance. |
| Settings | Searchable categories, explicit Save, dirty-state protection, preview/discard, scoped Reset and clear consequences. Live controls remain immediate. |
| Filters | Removable chips above results, real/unknown counts, useful zero-results recovery, native state restoration. Sensitive paths stay out of public links and analytics. |

## 5. Motion and haptics

Motion has four purposes: immediate input feedback, spatial continuity, musical visualization and optional presentation. Suggested initial timings are 90–160ms for state changes and 140–220ms for workspace transitions. These are tunable proposals, not standards. Animation must be interruptible and input remains usable before it completes.

Engine-driven waveforms and meters retain their meaning under reduced motion; remove ornamental travel, refraction and ambient loops. No looping steam, parallax or brand sequence runs behind a live set. Use fixed geometry and tabular numerals to avoid jumping controls.

Haptics distinguish accepted transport/pad actions, real detents, bank confirmation and rejected actions. They are optional and sparse. Android recommends clear action-oriented feedback and capability-aware fallback; rich effects are not supported uniformly.[1] Do not vibrate on every beat by default, use vibration as an assumed accurate metronome, or inject UI clicks into the master audio. Record device tests for fatigue, actuator quality and possible microphone pickup.

## 6. Rendering tiers and budget proposals

| Tier | Rendering policy | Required behavior |
| --- | --- | --- |
| Essential | Opaque/alpha fills, vector bevels, cached highlights, no dynamic blur | Complete qualified controls and state; same semantic hierarchy |
| Balanced — default | Bounded glass, restrained static metal detail, profiled local effects | Same musical behavior and hit targets |
| Enhanced | Optional local RuntimeShader effects and richer optics where measured safe | Graceful fallback without restarting audio or changing parameter values |

Android's AGSL RuntimeShader support begins with Android 13.[2] It is a graphics capability gate. The audio eligibility and minimum OS decision must consider the equivalent fallback, not depend on the most decorative tier.

Initial proposed budget: roughly 8 MiB of packaged non-audio visual assets, separately budgeted fonts, and no mandatory live 3D scene or video background. Sustain a 60Hz baseline on the declared minimum device under its worst qualified audio workload; proposed visual benchmark is no more than 1% janky frames over five minutes of intense interaction. The exact metric and test fixture must be fixed before the gate is approved. Audio underrun/deadline gates remain separate. No benchmark result is claimed.

## 7. Comparable render brief

Use image generation for material and art-direction exploration, then rebuild approved controls as exact native components. Generated screens do not prove feasible typography, interaction, licensing or performance.

### Shared composition and content

Use a straight-on landscape phone performance screen, approximately 20:9, without perspective distortion. Keep the same layout in both concepts: thin route/recording/ParDay status area; two readable stacked waveform lanes; Deck A on the left and Deck B on the right; track name, BPM and key; two shallow jog rings; a compact central mixer; clearly separated Play/Cue, Sync and four numbered hot-cue pads per visible deck; a lower central crossfader; and labelled access to Library, Pads, FX and Stems. The four visible pads are one bank of the planned eight hot cues; the render is not a reduction of that requirement.

Use fictional fixture tracks **AURORA DRIVE** and **COPPER SKY**, each at **124.0 BPM**, key **8A**; cyan Deck A and orange Deck B. Small text reads **USB Master + Cue**, **REC**, and **ParDay**. Do not invent a product brand or real performer artwork. Show a modest **Concept** label. The waveform is illustrative within the concept render and cannot be reused as real audio-derived data. The mockup does not establish actual 48dp hit bounds or native text fit; those remain build requirements.

**Prompt A — Precision Atelier:** “Apply the shared landscape two-deck composition in smoked liquid glass over a deep graphite instrument bed. Champagne-brass machined jog rims, restrained knurling, precise index marks and subtle bevels convey steampunk craftsmanship. Use crisp off-white numerals over opaque dark backing; cyan/orange deck states remain explicit. Keep labels undistorted, transport prominent and controls separated. No steam, exposed gears, pipes, antique parchment, external controllers or floating mascot. This is an original art-direction concept for a mobile DJ app.”

**Prompt C — Crystal Current:** “Apply exactly the same landscape two-deck composition and fixture content in pale frosted mineral glass, brushed titanium and subtle champagne-brass mechanical joints/index details. Use dark-ink labels over stable pale backing, clear cyan/orange deck states, restrained edge light and optically convincing glass depth. Keep typography, control locations, visible functions and framing comparable with A. No refracted labels, floating panels obscuring controls, ornamental steam, gears, pipes or external controllers. This is an original art-direction concept for a mobile DJ app.”

Portrait preparation and performance layouts are required next-design deliverables within selected C, alongside landscape; they do not require another art-direction vote or a second A/C comparison. Use consistent crate/track fixtures and ParDay proposals across orientations. Final production screens must recompose for real phone dimensions, safe areas, text scale and measured touch regions. The earlier approximately 20:9 render canvas is a concept-art framing choice, not a verified Galaxy S26 Ultra logical viewport.

### Generated comparison review

Two concept images were generated and visually inspected on 29 October 2026. A shows dark smoked surfaces with champagne-brass rims and pale readouts. C shows pale frosted surfaces, titanium and dark-ink readouts. Both depict the same fixture tracks, two-deck task, cyan/orange identity and compact ParDay access. These images establish the material comparison from which the user selected C.

The images are **not pixel-matched layouts**: the jog/pad ordering differs, A repeats a Gain label and omits visible tempo faders that appear in C. Neither shows the full EQ/control requirement set at once. Their illustrated waveforms and meter values are not computed audio data. Evaluate colour, material, atmosphere and hierarchy; do not choose based on these accidental feature differences or copy them into the interaction contract. The chosen concept still needs an exact native composition with consistent control access, calibrated meters, corrected labels and measured hit targets.

## 8. Approval and verification record

Inspect native portrait/landscape/tablet/foldable renders with realistic names and all important states. Validate contrast over the worst underlying content, target overlaps, typography at scaled sizes, night/daylight, colour-independent meaning, reduced motion and loading/error treatments.

The owner explicitly selected **C — Crystal Current**. Retain pale frosted glass, titanium, dark-ink labels and restrained brass; do not silently switch to A or a combined A/C product. Compare the selected aesthetic against a flatter functional baseline on the Galaxy S26 Ultra. Record its actual software build, density, display configuration and text scale before testing. If task errors, wrong-deck actions or rendering costs increase, simplify materials before removing useful controls. **Functional status: NOT VERIFIED. Native visual status: NOT VERIFIED. Concept images: GENERATED AND VISUALLY REVIEWED. Art-direction selection: C CONFIRMED.** A polished mockup cannot close either implementation gate on its own.

### Sources

[1] Android Developers, [Haptics design principles](https://developer.android.com/develop/ui/views/haptics/haptics-principles). [2] Android Developers, [AGSL](https://developer.android.com/develop/ui/views/graphics/agsl). Both accessed 29 October 2026. Font acquisition and licensing checks are specified in Document 08.
