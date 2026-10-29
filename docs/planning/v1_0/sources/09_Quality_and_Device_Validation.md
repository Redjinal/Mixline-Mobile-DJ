# 09 — Quality and Device Validation

**Version:** 1.0  
**Date:** 29 October 2026  
**Status:** Design handoff baseline; implementation and validation pending  
**Product basis:** New product; no Mixline validation is inherited.  
**Platform decision:** Android first; Samsung Galaxy S26 Ultra is the user-selected first test device.  
**Accountable agents:** Quality/Release; Audio Engine; Android Platform; Product UI.  
**Target status:** Numerical performance and test thresholds below are proposed, not measured results, vendor guarantees or delivery commitments. The separate future AWS planning target of about US$35/month excluding ParDay AI charges is owner-confirmed.

## Quality objective and release rule

Prove that the product can sustain a real mobile DJ session, with audible behavior matching the interface and recoverable failures. Every supported capability must have a named device, OS, output route, configuration and result. Emulator success, screenshots and a brief cold-device demo cannot establish professional reliability.

The two-deck foundation is the first integration gate. The selected complete product also includes four music decks, an independent sampler/sequencer, prepared and device-gated live stems, eligible recording, mic, automix, video, karaoke, broadcasting and third-party plugin hosting; lighting is excluded. Live stem separation is a gated capability. A failed extended profile does not justify advertising that profile as supported; it also need not invalidate an independently verified basic profile.

Release requires no open defect that can leak headphone cue to master, lose user edits without warning, start unexpected playback, corrupt source files, or repeatedly interrupt audio in a certified profile. Root-cause and retest all reproducible audible failures. A low statistical crash rate alone cannot waive a known performance-breaking defect.

Evidence progresses through G0 Decision baseline; G1 Audio feasibility; G2 Working vertical slice; G3 Core performance beta; G4 Advanced performance; G5 Source/provider and ParDay integrations; G6 Release candidate; G7 Personal installed release; and G8 Maintenance/optional community readiness. G3 applies P0; G4 applies advanced profiles; G5 adds source/entitlement and assistant failures; G6 repeats the release-relevant physical gates on the packaged build. The first version is local on the phone. AWS comparison/deployment and service-specific home-lab cases are deferred extension evidence, not prerequisites to G6/G7 local personal release. Full selected local capabilities and their applicable source/AI tests still require evidence. System-interruption expectations must follow the supported Android audio-focus rules. [S5]

## Device and route matrix

The first device is **Samsung Galaxy S26 Ultra**, with software reported by the owner as “up to date.” This is a device selection, not inspected software inventory or certification. Before the first benchmark, record exact model/region variant, RAM/storage configuration, Android version/API level, One UI version, build/fingerprint, security patch, available storage, display settings and the actual audio accessory/route. Do not infer those values from the model name or the phrase “up to date.” Record app, NDK, DSP and extractor versions with each run.

Broader supported coverage remains open. If the product advertises it, add a baseline midrange Android/Samsung phone, an independent-vendor phone and tablet/foldable evidence. The S26 Ultra selection does not establish performance on those devices. Cover the proposed minimum OS, current shipping OS and meaningful intermediate behavior changes. At the date of this baseline, Android 17 background-audio behavior warrants explicit coverage. [S1]

| Axis | Required coverage | Purpose |
|---|---|---|
| CPU/RAM | Named S26 Ultra configuration first; additional real phones only if added to the support matrix | Certify the claimed device scope; do not generalize one high-end result |
| OS/lifecycle | Minimum, current, focus/background behavior boundaries | Service, permissions, calls and routing |
| Page size | Native 4 KB and 16 KB environments | Core plus every prebuilt SDK compatibility [S2] |
| Display/input | Small/large portrait, landscape, resize, 60/120 Hz where offered | Reachability, multitouch and frame pacing |
| Wired stereo | Built-in/USB-C DAC where supported | Master and splitter profiles |
| USB multichannel | Named ≥4-output interface and supported hub/power setup | Independent stereo master/cue |
| Bluetooth | Named ordinary wireless routes | Honest delay reporting and graceful limitations |
| iOS if included | Named iPhone/iPad and accessory combinations | Separate platform certification |

For splitter tests use a dedicated DJ splitter and check channel assignment; a duplicated stereo Y splitter is not equivalent. Do not infer output channel count from a USB device marketing label. Query and verify the negotiated route and mapping. Oboe documents Bluetooth and unsupported channel configurations as reasons a low-latency request can fail. [S3]

## Profiles and test conditions

**P0 foundation:** two music decks, validated key lock, channel EQ/filter, two selected FX per deck, eight sampler voices, waveforms, ordinary glass treatment and recording where eligible. **P1 extended:** four music decks, sixteen sampler voices, equivalent declared FX and recording. **P2 prepared stems:** the declared deck count with four aligned prepared stems per active stem deck; evaluate its mix/stretch cost. **P3 live separation:** add the exact model/runtime/inference concurrency and certify separately.

Those combinations are workload definitions to test, not promises that all phones support them. List the heaviest allowed FX chain rather than testing only cheap effects. Use high brightness, active multitouch, browsing/search and realistic charging conditions. Test both normal ambient conditions and an agreed hot-room scenario that remains within device operating guidance. Log temperature/thermal status; never claim indefinite operation at any temperature.

Google’s Thermal API supports workload adaptation because sustainable mobile performance changes with thermal state. A short benchmark cannot establish warm performance. [S4] Degradation must stop optional analysis and queued or precomputation stem jobs, reduce glass/shader cost and lower nonessential visual refresh before affecting audio. Live inference supplying audible stems belongs to the protected active workload and cannot be suspended. P3 is unavailable on a profile that cannot sustain it. Active tempo, key, stem alignment, limiter latency and route remain unchanged. If stable audio cannot be maintained, the profile fails.

## Acceptance register

All targets apply to the stated corpus/profile/hardware. Change a target only through a recorded decision; do not quietly relabel a failed result.

| ID | Test and proposed acceptance | Evidence owner |
|---|---|---|
| QA-01 | P0 two-hour warm-soak, three independent runs: no app-caused audible dropout, recorded discontinuity, crash/ANR or accumulating underrun count in controlled conditions | Audio + QA |
| QA-02 | P1/P2/P3 each tested separately under maximum declared load: same continuity rule; exact unsupported combinations listed | Audio + QA |
| QA-03 | Physical cue/pad touch-to-output: target median ≤20 ms, p95 ≤35 ms on certified wired baseline, ≥500 trials; report tails and method | Platform + QA |
| QA-04 | Callback workload: target p99 <50% of deadline, maximum below deadline in test; bounded queues and no callback I/O/locks/allocations | Audio |
| QA-05 | Engine-scheduled quantized events: ≤1-frame execution error against requested frame after compensation; no accumulated click-track drift over 30 minutes | Audio |
| QA-06 | Cue isolation: no unintended cue in master; target ≥70 dB separation on certified hardware where achievable; correct mono sum and stereo mapping | Platform + QA |
| QA-07 | 100 rapid loads/cancels plus seek/reverse/loop stress: no stale-generation playback, memory fault, deadlock, unbounded queue or unexplained spike | Audio + Data |
| QA-08 | Blind listening at declared tempo/key ranges: no release-blocking artifact on approved corpus; panel criteria set before comparison | Audio + DJ reviewers |
| QA-09 | Stems: aligned length/timing, acceptable blind quality, recorded preparation time/RAM/storage/heat; cancellation honored; live mode separate | Analysis + QA |
| QA-10 | Focus/calls/lock/background/route changes: specified compliant state, safe output, no cue leakage, no accidental loud resume | Platform |
| QA-11 | Full disk, revoked storage and process kill during recording: storage failure preserves live mix; recover to last valid chunk where feasible; incomplete status visible | Data + Audio |
| QA-12 | Prepared local workflow: proposed p95 cold start ≤3 s and prepared track-ready ≤1 s on named ≤10-minute-track corpus and baseline device | Product + QA |
| QA-13 | Sampler/FX: quantized triggers, documented voice stealing, choke groups, tails/bypass and parameter changes match specification | Audio |
| QA-14 | Signal integrity: correct trim/crossfader curves, meter taps, limiter/headroom, no NaN/Inf or digital overflow under adversarial input | Audio |
| QA-15 | Library/analysis: malformed files safely rejected; revoked URI/missing media handled; manual grid/cue edits survive analysis and migration | Data |
| QA-16 | UI/accessibility: all primary tasks operable without color alone; semantic labels/value adjustments; touch targets and rotation preserve state | UI + QA |
| QA-17 | Final package: reproducible signed-release candidate, native ABIs/page sizes validated, dependency versions/licences pinned | Release |
| QA-18 | Content eligibility: source-specific recording/stem/offline restrictions respected; denied action explains reason; no unauthorized cache/export | Content + QA |
| QA-19 | No-network local set: complete prepared set works without login/network calls; cloud retries do not interfere; account behavior as approved | Services + QA |
| QA-20 | Session recovery and destructive actions: source files preserved, edits durable, undo/confirmation behavior correct, restored set does not autoplay | Product + Data |
| QA-21 | Diagnostics privacy: inject sentinel tokens, private paths, track metadata and microphone content; exported/logged/network data contains none unless the user explicitly selects that field and the source policy permits that destination/purpose; restricted provider data remains blocked or redacted despite selection; consent matches actual behavior | Security + QA |
| QA-22 | Microphone/input: denied permission, feedback-prone route, clock mismatch, live monitoring and talkover exercise the explicit mute/gain/duck contract on supported hardware | Audio + Platform |
| QA-23 | Automix/manual takeover: cancel, reorder, unavailable next track, tempo mismatch and intervention at transition boundaries never replace or restart the wrong deck | Audio + Product |
| QA-24 | Backup/restore: round-trip cues, grids, duplicate entries, missing media and conflicts; reject path traversal/oversized archives; no tokens or restricted caches exported | Data + Security |

## ParDay, acquisition and advanced-module evidence

AI-001 through AI-024 in Document 13, SRC-01 through SRC-12 in Document 14 and AV cases in Document 15 extend the shared QA register without replacing it. First run model-free fixtures to prove permissions, source isolation, stale proposal rejection, duplicate-call handling, cancellation and manual takeover. Then run provider-specific evaluations with eligible fixture data; never use prohibited catalog payloads as convenient prompt fixtures.

Queue future fader/transport automation, then intervene manually without changing the track or route. Verify the engine-owned automation revision is invalidated and none of those already queued events can reassert old values. Inject a partial-capacity admission failure and require an all-or-nothing result; verify cancellation acknowledgements and at-most-once action behavior. Repeat under full scheduling queues, changed-payload ID reuse, master-control takeover, permission invalidation and engine restart. No affected queued event may run after the acknowledged cancellation frame.

The user selected ParDay armed assisted performance. Verify preparation assistance and bounded transition/automix execution with explicit arming and immediate takeover, while unarmed live behavior remains read/propose. Exercise late model results after deck replacement, route reopen, manual fader movement and permission change. Verify that denied or unknown provider data never enters prompts, embeddings or model-readable tool results. Test an offline set with the assistant disabled, timing out, and rate-limited. A correct recommendation is still a failure if its execution targets stale state or causes an audible surprise.

Add exact video decode/GPU/encode and plugin-chain workloads to P0-P3 when certifying combinations. Video freezes/frame drops, stream disconnects, microphone paths and plugin failures need distinct expected outcomes. Do not certify every module simultaneously by combining unrelated individual pass results. Hosting must pass with an actual supported third-party plugin, not only app-owned effects.

## Measurement methods and meaningful evidence

Measure touch-to-sound with a synchronized physical trigger/observation rig and electrical output capture where possible. State exactly whether a number represents UI input delivery, engine response, output latency or round-trip latency. Buffer duration alone is not end-to-end latency. Do not estimate output latency by simply halving an unrelated round-trip figure.

Use generated impulse/click/chirp fixtures for timing, alignment and reconstruction tests; cleared musical fixtures for listening. Include steady electronic beats, swing, live drums, variable tempo, acapella, dense bass, sustained notes, percussion transients and silence. Store hashes and expected timing metadata. For proprietary SDKs use equivalent settings and identical source material. Do not compare different buffers or warmed caches as if they were controlled equivalents.

Separate engine scheduling error from perception and musical analysis error. A sample-accurate event scheduled to a wrong beatgrid is still musically wrong; inspect BPM/downbeat/grid accuracy and user correction independently. Conversely, visual waveform drift may be display interpolation rather than audio drift; capture output and correlate engine timestamps before diagnosing it.

For the personal build, the owner performs repeated concealed-reference listening and records the limits of a single-listener result. A broader quality study should include at least three experienced DJs/listeners before generalizing claims; external-panel recruitment is not a personal release gate. Use concealed backend identity, randomized order and repeated references. Proposed ordinary evaluation range is 0.8–1.2× tempo and ±6 semitones; extended ranges require their own verdict. Use a pre-agreed artifact rubric covering attacks, vocals, bass, phasing and transition glitches. These are proposed study settings, not proven universal professional thresholds.

## Failure injection and release evidence

Inject storage exhaustion, permission revocation, malformed artwork/audio, missing files, cancelled imports, provider authentication expiry, network loss, busy/removed USB output, sample-rate change, foreground-service interruption and process death. Keep expected safe state separate from the normal happy path. A route change that legitimately stops audio must be labelled as interruption handling, not counted as uninterrupted performance.

Every evidence record includes build commit/hash, app/SDK/model versions, exact device/OS, route/accessories, codec and sample rate, buffer and channel configuration, profile, brightness, charging state, thermal history, duration, raw logs/captures, result and reviewer. Performance telemetry excludes music content and private filenames by default; user-shared diagnostic bundles require explicit selection.

QA must return a capability report: passed profiles, failed profiles, known limits, reproduction steps and release recommendation. Audio Engine and Platform owners sign off the relevant fixes; the Orchestrator may not turn a failing capability into a marketing claim. Re-run only affected gates plus necessary regression coverage after fixes. The complete physical suite repeats on release candidates and material audio/SDK/OS changes.

## Completion and unresolved choices

Android first, the S26 Ultra first device, USB interfaces/splitters, local-first delivery and the full discussed feature intent except lighting are confirmed. The validation plan needs actual device/build/accessory evidence and a declared format/provider/workload matrix before certification, not before design. Begin with the proposed two-hour P0 soak and distinct P1-P3 profiles, recording their limits. Four-deck capability and live stems both remain selected; their simultaneous maximum workload is unverified. Design supported, unavailable and resource-denied states now. If the intended combination cannot pass, report that concrete limitation for a scope decision instead of quietly dropping either feature. Wider device support and a longer target session can be specified when needed.

## Functional-to-quality traceability

QA-FR identifiers are feature-specific cases from Document 02. QA-01 through QA-24 are shared quality gates. Both must pass where applicable; a general soak result does not replace a functional case. The machine-readable requirements_register.json records every requirement, its functional case, shared gates, owner and evidence placeholders. All are currently unverified.

| Requirement | Functional case | Shared quality gates |
| --- | --- | --- |
| FR-001 | QA-FR-001 | QA-19 |
| FR-002 | QA-FR-002 | QA-15 |
| FR-003 | QA-FR-003 | QA-07, QA-15 |
| FR-004 | QA-FR-004 | QA-15 |
| FR-005 | QA-FR-005 | QA-15, QA-20 |
| FR-006 | QA-FR-006 | QA-04, QA-15 |
| FR-007 | QA-FR-007 | QA-05, QA-08, QA-15 |
| FR-008 | QA-FR-008 | QA-05, QA-15 |
| FR-009 | QA-FR-009 | QA-05, QA-16 |
| FR-010 | QA-FR-010 | QA-03, QA-05, QA-07 |
| FR-011 | QA-FR-011 | QA-05, QA-15 |
| FR-012 | QA-FR-012 | QA-02, QA-07, QA-16 |
| FR-013 | QA-FR-013 | QA-03, QA-07, QA-08 |
| FR-014 | QA-FR-014 | QA-03, QA-07, QA-16 |
| FR-015 | QA-FR-015 | QA-04, QA-05, QA-08 |
| FR-016 | QA-FR-016 | QA-05, QA-08 |
| FR-017 | QA-FR-017 | QA-05, QA-13 |
| FR-018 | QA-FR-018 | QA-05, QA-07, QA-08 |
| FR-019 | QA-FR-019 | QA-05, QA-07, QA-08 |
| FR-020 | QA-FR-020 | QA-06, QA-14 |
| FR-021 | QA-FR-021 | QA-14 |
| FR-022 | QA-FR-022 | QA-06, QA-10 |
| FR-023 | QA-FR-023 | QA-06, QA-10 |
| FR-024 | QA-FR-024 | QA-04, QA-08, QA-13 |
| FR-025 | QA-FR-025 | QA-13, QA-16 |
| FR-026 | QA-FR-026 | QA-03, QA-05, QA-13, QA-16 |
| FR-027 | QA-FR-027 | QA-02, QA-05, QA-07, QA-13 |
| FR-028 | QA-FR-028 | QA-02, QA-09, QA-18 |
| FR-029 | QA-FR-029 | QA-02, QA-09, QA-18 |
| FR-030 | QA-FR-030 | QA-06, QA-10, QA-14, QA-22 |
| FR-031 | QA-FR-031 | QA-11, QA-18 |
| FR-032 | QA-FR-032 | QA-05, QA-07, QA-23 |
| FR-033 | QA-FR-033 | QA-04, QA-16 |
| FR-034 | QA-FR-034 | QA-20 |
| FR-035 | QA-FR-035 | QA-07, QA-20 |
| FR-036 | QA-FR-036 | QA-18, QA-19 |
| FR-037 | QA-FR-037 | QA-10 |
| FR-038 | QA-FR-038 | QA-16 |
| FR-039 | QA-FR-039 | QA-10, QA-16 |
| FR-040 | QA-FR-040 | QA-19 |
| FR-041 | QA-FR-041 | QA-15, QA-20, QA-24 |
| FR-042 | QA-FR-042 | QA-10, QA-21 |
| FR-043 | QA-FR-043 | QA-17 |
| FR-044 | QA-FR-044 | QA-18, QA-19 |
| FR-045 | QA-FR-045 | QA-02, QA-04, QA-05, QA-10, QA-18; AV cases in Document 15 |
| FR-046 | QA-FR-046 | QA-02, QA-04, QA-10, QA-18, QA-21, QA-22; AV cases in Document 15 |
| FR-047 | QA-FR-047 | QA-02, QA-04, QA-05, QA-14, QA-17; AV cases in Document 15 |
| FR-048 | QA-FR-048 | QA-04, QA-05, QA-07, QA-18, QA-19, QA-20, QA-21, QA-23; AI-001-024 |
| FR-049 | QA-FR-049 | QA-02, QA-04, QA-07, QA-10, QA-15, QA-17, QA-18, QA-19, QA-20, QA-21; SRC-01-12 and DLA-01-20 |

A passing functional case requires the expected behavior specified in Document 02. Record separate cases for unsupported/error, cancellation and recovery paths. No mapping authorizes bypassing a source permission or accepting a leaking route.

## Link acquisition evidence crosswalk

Document 16 and link_acquisition_acceptance_register.json add DLA-01 through DLA-20 under FR-049. They cover actual-source/version matching, quality reporting, an enabled extractor fixture, bounded transfer/validation, cancellation/publication races, recovery, batch identity, workload coexistence, worker/network isolation, source evidence, updates, ParDay egress and late completion. App-provided Cancel download must preserve unaffected mixing; Android Task Manager Stop/Force stop may terminate the app and is tested as interruption/recovery. No DLA case has been executed. Shared gates for FR-049 are QA-02, QA-04, QA-07, QA-10, QA-15, QA-17, QA-18, QA-19, QA-20, QA-21.

## Comparative acquisition, AWS and home-lab evidence

The latest owner instruction selects local delivery first. Run the S26 Ultra device arm D first under Document 16 section 13 and contracts/acquisition_comparison_protocol.json; preserve its fixtures and raw observations for reuse. D-versus-AWS is a deferred expansion comparison, with no measured winner. H-LAN and H-REMOTE remain optional portability profiles. The approximately US$35/month future AWS target excludes ParDay AI charges and is not a test result or permission to deploy.

When the AWS expansion is commissioned, rerun equivalent fixtures on the phone's actual Wi-Fi/mobile networks and record cloud region, runtime and transfer path. Record exact source/format, software, caches, network and hardware. Different extractor implementations are a system comparison, not isolated proof of location effects. Deferred AWS and home-lab runs do not fail local release merely by being unexecuted; applicable DLA/SRC cases for the local source capability remain mandatory. Record results only when measured and leave selected_winner empty until a comparative decision is supported.

Cases HL-01 through HL-10 in Document 17 and contracts/home_lab_deployment_profile.json extend the existing build, runtime and independence requirements. Service-specific variants are conditional on a service profile; HL-10 applies only before optional publication. Their purpose is reproducible setup, pairing, credentials, outage independence, bounded work, upgrades and cleanup. They do not commit the product to a backend. Document 18 and contracts/aws_deployment_profile.json add AWS-01 through AWS-10 for the evaluated cloud profile, including actual cloud source feasibility, pairing, isolation, stop/recovery and resource cleanup. Those cases are unexecuted and deferred until that optional extension is evaluated; naming AWS is not evidence that an extractor works there. Reproducible local installation, backup and recovery cases remain applicable without a service. Optional source publication requires its own clean, reviewable package; public-store approval and commercial-market validation do not gate the selected personal release.

## Sources

Checked 29 October 2026. Numeric targets are original proposed requirements, not claims derived from these sources.

- **S1:** Android, [Background audio hardening](https://developer.android.com/about/versions/17/changes/bg-audio).
- **S2:** Android, [Support 16 KB page sizes](https://developer.android.com/guide/practices/page-sizes).
- **S3:** Google, [Oboe FAQ](https://github.com/google/oboe/blob/main/docs/FAQ.md).
- **S4:** Android, [Thermal API](https://developer.android.com/games/optimize/adpf/thermal).
- **S5:** Android, [Manage audio focus](https://developer.android.com/media/optimize/audio-focus).

