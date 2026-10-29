# 16 - Link acquisition implementation and feasibility

**Version:** 1.0  
**Date:** 29 October 2026  
**Status:** Design handoff baseline; local acquisition first, deferred AWS comparison, no implemented downloader  
**Selected baseline:** Crystal Current (C); Samsung Galaxy S26 Ultra on user-reported current software; ParDay with explicitly armed assisted performance  
**Owners:** Integrations, Android, Library/Data, Audio, Security/Release and Quality  
**Companions:** Documents 05, 07, 09, 11, 13 and 14; acquisition_job.schema.json; acquisition_state_machine.json; link_acquisition_acceptance_register.json

## 1. Product decision

The owner explicitly wants an integrated Spotify/YouTube link-to-file workflow comparable to the experience on Spotdown and Y2Mate. Record this as an acquisition requirement, including investigation of unofficial extraction. A catalog search followed only by an external browser handoff does not complete this requirement. Do not treat the absence of an official download API as proof that the mechanism is technically impossible.

The product should let a DJ share or paste a supported link, resolve its recording, see the actual available media and format, download it inside the app, validate it, and prepare it for the normal decks. The final file must be independently identifiable, playable and recoverable. A web page that advertises conversion does not establish a production API, integration permission, actual recording identity, audio fidelity or sustained reliability.

Four questions must remain separate: does the mechanism work; what source/service access basis applies; what content use is covered; and which distribution channel can accept the resulting product. Unofficial is a mechanism classification, not an automatic answer to all four questions. A permission or release concern is not a reason to erase the requested feature from the backlog. An unknown or denied operation also must not be falsely labelled approved.

No music was downloaded, no extractor executed, no account connected, and no hidden endpoint or access control probed during this planning revision. The evidence below establishes candidate approaches and open questions. It does not establish that either named website has supplied a reusable backend to this project.

## 2. What the named services establish

| Candidate | Observed evidence | Consequence for this app |
| --- | --- | --- |
| Spotdown | The supplied page advertises Spotify-link and collection downloads, including MP3. Its footer states that it uses third-party services. Actual media origin and fidelity were not verified. [A1] | Keep as a vendor candidate; do not assume direct Spotify master extraction or repeat quality claims as measured results. |
| Spotdown integration | The examined terms describe personal/noncommercial use. No documented developer interface or app-integration grant was identified in the examined pages. [A2] | A private API may exist, but it is not established. Obtain documentation before coupling an adapter to the service. |
| Y2Mate | The site advertises browser conversion to MP3/MP4. [A3] Its terms require written permission for framing, cloning, resale or commercial exploitation. [A4] | A WebView wrapper is not the recommended integration. A documented vendor arrangement would be a separate candidate. |
| spotDL | Its README describes matching Spotify metadata to YouTube media, then downloading that media. The project uses MIT licensing and depends on other tools. [A5] | Evidence for catalog-to-media matching, not proof that Spotdown uses the same implementation or that matching always finds the correct edit. |
| yt-dlp | A maintained programmatic extractor candidate. Current documentation lists Python 3.11+, FFmpeg-related tools and JavaScript-runtime dependencies for full functionality; distributed artifacts can have different licence obligations. [A6] | Evaluate the controlled-worker candidate alongside the native candidate. Pin complete dependencies; do not assume an old Android wrapper is compatible. |
| NewPipeExtractor | An independently usable Gradle library listing YouTube and other services, licensed GPL-3.0-or-later. [A7] | Evaluate an on-device route if its licence fits the intended distribution. Measure integration, size and runtime behavior. |

The source websites' statements are vendor claims. Retrieval of their public pages was successful; conversion, delivery, API availability and audio inspection were not tested. No conclusion is drawn that either site is malicious, safe, licensed for this app, or permanently available.

## 3. Recommended architecture and execution location

Use an app-owned acquisition module with replaceable resolver and transfer adapters. The Kotlin interface, database job state, file validation and library publication remain ours. An adapter can use a direct download, a documented vendor API, an admitted extraction component, or an external handoff. These methods report distinct capabilities rather than pretending to be equivalent.

The latest owner decision selects the local version first. Build the native intake, library and job infrastructure and evaluate the on-device extraction path without requiring a LAN or cloud server. Preserve a replaceable adapter boundary and reusable fixture/measurement records. The previously selected on-device versus owner-operated AWS comparison moves to a later optional expansion, with an approximate USD 35 monthly AWS planning target excluding ParDay AI-provider charges. This sequence does not claim that the on-device extractor already works or wins on performance. An owner-operated worker may simplify dependency updates and isolate conversion from the phone; its benefit remains a hypothesis for section 13's deferred comparison. Testing both later does not commit the product to maintaining both, and neither cloud deployment nor paired timing results block design or the first local release.

| Approach | Strength | Cost or uncertainty to resolve |
| --- | --- | --- |
| On-device extraction | Local control; no app-operated media relay needed for that path | Android packaging, dependency licence, updates, battery, heat, compatibility and access conditions |
| Controlled backend | Independently deployable adapters; isolated conversion and easier rollback | Hosting/egress cost, retention, access reliability, endpoint security and availability |
| Documented vendor API | Less extraction maintenance if a suitable service exists | Contract, pricing, response semantics, media provenance, rate limits and service continuity |
| Browser plus import | Useful recovery option while an adapter is unavailable | Does not by itself meet the selected integrated acquisition workflow |

Proposed components are LinkIntake, CatalogResolver, RecordingMatcher, SourceAdapter, FormatSelector, TransferCoordinator, MediaValidator, LibraryPublisher and JobJournal. The live audio engine consumes only published library media through its existing loader. It never invokes a website, extractor, FFmpeg process, database migration or language model.

A backend-resolved media URL may expire or be tied to its issuing session or network. Do not assume that a URL resolved on a server can be downloaded directly by the phone. The adapter declares a transfer mode: device direct, controlled relay, or server artifact followed by authenticated download. Validate the intended mode with the actual source. Relay and artifact modes need explicit storage limits, deletion and cost accounting.

## 4. Crystal Current acquisition workflow

Place an Add music action in the library with Paste link, Receive share, Import files and Download queue. Android share intake should resolve user-selected links without silently polling the clipboard. The selected C theme supplies pale glass, titanium and restrained brass; critical progress and error text uses stable high-contrast surfaces.

The resolution screen shows requested title/artist/version, the actual source, source duration, known edit or explicit/clean information, and a concise match explanation. A Spotify reference can resolve to a different platform's candidate. That candidate must carry its actual origin. An uncertain match offers alternatives and a preview or selection step; a matching title alone cannot approve a substitute.

Format choice uses readable options such as Keep source format, MP3 for compatibility, or a supported video/audio rendition. Display actual source codec, known bitrate or an honest unknown value, output encoding and estimated storage. A high output bitrate is not presented as proof of a high-quality original. Artwork and metadata are retained only as their source allows; generic placeholders remain usable.

After Download, show a persistent queue entry with phase, byte progress when measurable, storage destination, pause availability, Cancel and an actionable failure reason. Conversion and analysis are separate phases. An unknown total must not produce a fabricated percentage. Ready to play and fully analyzed are separate states. Finishing a download adds to the library; loading or starting a deck uses the established protected workflow.

For collections, show a bounded selection and per-item outcomes. Preserve playlist order independently from transfer completion order. A batch containing failures is partially completed, never simply Done. Avoid an accidental unbounded artist-discography job; show the enumerated count and let the user select the set before transfer. Do not implement deletion of existing local tracks as an implicit playlist-sync behavior.

## 5. Catalog identity, actual media and sound quality

Every job retains two identities: what the user requested and what the adapter actually obtained. Record requested provider/link ID, actual media provider/ID, candidate revision, edition evidence, duration, media hash, acquisition method and extractor version. Link the resulting MediaAsset to both provenance chains. A supplied catalog title must not overwrite contradictory file evidence.

Use deterministic comparison and user selection before involving ParDay. Title/artist normalization, version labels, durations and permitted recording identifiers can rank candidates. Confidence percentages require calibration; otherwise use exact file, probable recording or ambiguous. A content hash identifies bytes, not the quality or correctness of the performance. A different edit or encode must not inherit sample-position cues without validation.

Keep the source file where practical. Remux without re-encoding when supported and useful. Offer transcoding only when the user needs a different format or the app cannot decode the original. MP3, AAC, Opus, WAV and FLAC are format candidates subject to actual encoder/decoder and licence support; list only options the selected adapter can produce. Converting an already lossy source to WAV/FLAC preserves that decoded signal and does not recover discarded detail. A 320 kbps MP3 output can still derive from a lower-quality source.

Record source and output codec, sample rate, channels, duration, byte size and processing history. Distinguish bitrate measured from a file, bitrate reported by a service, variable bitrate and unknown values. Analyze loudness and clipping as preparation information; do not normalize or alter the preserved original silently. Re-encoding may change leading delay and padding, so cues bind to the validated actual rendition.

## 6. Job contract and state machine

The companion JSON schema describes one network-acquisition child-job snapshot, not an API secret store, collection aggregate or model tool. A trusted app request creates the job and intent reference. A collection has a separate persisted parent aggregate with ordered child IDs and per-item outcomes; parentJobId links to it. External handoffs and returned local files use the existing handoff/import path rather than pretending to be network transfers in this schema.

Resolution may populate candidate choices without mutating the accepted execution request. Accepting or changing a candidate/format creates a new immutable execution revision with a fresh digest and idempotency key, invalidating earlier worker leases. JobId and the originating intent can remain stable across revisions. Retries of the same unchanged revision reuse its key; an old key never authorizes the new selection.

Normal states are CREATED, RESOLVING, AWAITING_SELECTION, READY, QUEUED, TRANSFERRING, optional SOURCE_VALIDATING/CONVERTING, final VERIFYING, PUBLISHING and COMPLETED. READY means a candidate/format is ready to acquire, not that audio exists locally. PAUSED, RETRY_WAIT, CANCEL_REQUESTED, CANCELLED, FAILED and BLOCKED are explicit alternate states. The normative transition map is contracts/acquisition_state_machine.json, with guards described here; a model cannot assign states.

A preserved-source path is TRANSFERRING to VERIFYING to PUBLISHING. A conversion/remux path is TRANSFERRING to SOURCE_VALIDATING to CONVERTING to VERIFYING to PUBLISHING. Final VERIFYING always checks the exact final rendition that will be published. Validation of downloaded source bytes cannot authorize different converted bytes. PAUSED/RETRY_WAIT resume only at a documented safe checkpoint with current identity, lease and admission; cancelled and completed executions never restart themselves.

Cancellation is cooperative inside the acquisition subsystem. Increment a cancellation revision transactionally, stop future stages, close active transfers, and prevent publication by stale workers. Publication uses a database transaction/compare-and-swap fence against the current request revision, cancellation revision, eligible state and active worker lease. The fence, MediaAsset insertion, idempotency result, publication record and terminal COMPLETED job state commit together. A cancellation transaction that wins first prevents publication; a publication transaction that wins first makes a later Cancel report already completed, even if the UI has not seen the acknowledgement. Removal after publication is a separate user action. A check before opening the transaction is insufficient.

Use a stable idempotency key for each accepted immutable execution revision. Repeating the same key/payload returns that revision's existing outcome; changed payload with the same key is rejected. Only one active worker lease owns a job revision. Parent collections have child jobs; completed children remain available if another item fails. Retry policy is bounded, distinguishes permanent from transient failures, respects service rate limits and never silently changes the chosen recording.

## 7. Transfer, validation and publication

Resolve and transfer in private staging. Sanitize display filenames and generate internal paths independently from titles or remote filenames. Set byte, time, duration, redirect and concurrency limits before fetching; stop oversized or unexpectedly endless responses. Validate status, headers and actual media bytes. A .mp3 extension or audio MIME type is not sufficient. HTML error pages, executable content, truncated headers, unsupported codecs and invalid duration fail with useful reasons.

Resume only against a verified identical object. Store a stable object identity, server validator where available, bytes held and the expected range. Check 206 and Content-Range for a continuation; an unexpected full response restarts safely rather than appending duplicate bytes. If an expiring URL is re-resolved, revalidate the media identity and format before attaching it to existing bytes. Session/IP binding, redirect changes and unavailable range support may require a clean retry.

Inspect media in a bounded worker; pass controlled local paths to decoding/probing tools, not an arbitrary network URL supplied by a web page. Validate complete media as appropriate to the selected container and codec. Keep failures quarantined or remove staging according to the job's retention policy. The assistant must not label a file playable based only on a successful HTTP response.

Filesystem publication and a database transaction are not one universal atomic operation. Use a staged manifest and recovery journal: validate, place the final object in managed storage, transactionally publish the MediaAsset, idempotency result and terminal job state under the revision/lease fence. Reconcile a crash between these steps, remove only proven orphan temporary objects, and never delete an existing file referenced by a deck or another job. External export through Android document access is a later, separately tracked operation where atomic rename may be unavailable. Before PUBLISHING, require passed final-rendition validation. Publication remains null until the winning completed transaction. Its hash, committed request/cancellation revisions and object identity must match the validated final object and the fenced execution; these are runtime comparisons beyond JSON Schema.

## 8. Android lifecycle and S26 Ultra validation

The owner selected Galaxy S26 Ultra and reported it up to date. Record the observed Android/One UI build, variant, RAM, storage, battery mode and audio route when testing begins. Do not infer them from a marketing name or treat the word latest as a reproducible build identifier. No S26 Ultra measurements have been performed in this planning session.

Android's user-initiated data transfer jobs are a candidate for explicit longer downloads on supported versions. Android documents an important distinction: its Task Manager Stop can terminate the entire app process and other foreground services, while an app-provided cancellation action can stop only our acquisition work. Persist progress incrementally and provide a clear Cancel download action. Do not promise audio survives OS-level Stop or Force stop. [A8]

For deferrable preparation, evaluate WorkManager separately from user-initiated transfers. Current Android guidance states that long-running WorkManager workers can exhaust job quota on Android 16; a foreground service is not an unlimited-work exemption. Select scheduling from the actual task and OS behavior, then validate interruption and restart. [A9]

Download, extraction, conversion, hashing and analysis operate outside the real-time audio callback. Begin with one active media transfer and one bounded preparation task as a proposed benchmark baseline. During performance, defer expensive conversion or stem preparation when the certified budget requires it. Preserve active audio and already-running live stems; pause optional acquisition work before allowing it to compromise the set. These are proposed policies to measure, not established throughput claims.

Test Wi-Fi/mobile transitions, locked screen, low storage, low battery, thermal limits, memory pressure, loss of server response and USB route changes. The in-app Cancel test must preserve the mix. The OS Stop test verifies truthful interruption/recovery, not impossible uninterrupted playback after the application is terminated.

## 9. Security, privacy and ParDay

The native client accepts supported link types and passes canonical identifiers to adapters. A backend fetcher allows only its defined provider and delivery hosts, validates redirects and DNS/IP destinations on every connection, and rejects loopback, private, link-local and metadata-service targets. Prevent DNS rebinding and alternate IP encodings; use network egress controls as well as URL parsing. Local network media, if later requested, is a separate explicit source with separate scope.

Extractor workers run with least privilege, bounded CPU/memory/time, isolated temporary directories and no access to application secrets. Use structured arguments or library calls rather than interpolated shell text. The caller cannot select arbitrary command flags, executable paths, output paths, plugins or postprocessors. Restrict probe/transcode network access. Adapter configuration is versioned, reviewed and reversible; remote configuration can disable an adapter but does not become arbitrary downloadable executable code.

Do not ask users to give music-service passwords, browser cookie stores or private signed links to an unknown converter. A future authenticated adapter needs its own explicit account and data-handling design. User-selected private media links remain sensitive: redact token/query values from logs and model context. Backend artifacts need an expiry, access control and deletion schedule; do not create an indefinitely shared music cache by accident.

ParDay may help choose an eligible recording, request a bounded acquisition job, report its state and prepare a crate after validated import. The deterministic service performs source resolution, transfer and publication. The language model receives job IDs and permitted summaries, never arbitrary download credentials or execution authority. The selected armed performance mode does not authorize silent downloads, purchases, new data destinations or automatic replacement of an audible deck.

Spotify-derived metadata retains its processing restrictions even if another source supplies the media file. Do not pass such metadata to a model merely because a matching file now exists locally. Independently measured local analysis and independently user-authored text keep their own provenance; do not treat the entire library as contaminated by one restricted field. Document 13 governs model egress and action authority.

## 10. Service permissions and distribution

Spotify's ordinary developer terms restrict stream ripping, and YouTube's service terms restrict downloading outside permitted mechanisms or required permission. Using an unofficial intermediary does not itself grant an exception. These are service-access constraints, separate from whether an extractor can technically return bytes and from the user's rights in a particular recording. [A10, A11]

Google Play's intellectual-property policy identifies unauthorized local downloading of copyrighted content and encouragement of infringement as violations. It does not imply that all download managers or all unofficial libraries are prohibited. A future Play release needs an accurate source/use model and distribution review. The selected milestone is now a personal tool, with optional later open-source sharing under Document 17. A private APK or source release does not automatically resolve underlying service/content rights. [A12]

Keep evidence states independently: technical status, service-access status, content-use basis and distribution status. A source adapter without a conventional official API can still be evaluated. A documented denial, access-control barrier or unestablished release right must be reported accurately rather than hidden by a generic supported badge. Ordinary user-managed local imports do not require uploading proof of ownership. Do not repeatedly ask a DJ to approve the same normal preparation action as a substitute for proper product policy.

For the named sites, the next vendor question would be whether they offer a documented integration arrangement, media-origin information, rate/availability terms, privacy handling and commercial use permission. No messages have been sent. The app-owned module remains the recommendation. On-device implementation is the selected first sequence; the later neutral comparison may justify an optional AWS path. Runtime performance, source feasibility and access status remain unverified until actual tests, irrespective of that sequencing decision.

## 11. Acceptance cases

These twenty cases extend FR-049 and the twelve broader SRC cases. They are specifications, not passed tests. Relevant shared gates are QA-02, QA-04, QA-07, QA-10, QA-15, QA-17, QA-18, QA-19, QA-20 and QA-21; Document 09 remains authoritative for each gate's exact definition.

| ID | Scenario | Required result |
| --- | --- | --- |
| DLA-01 | Shared URL contains redirects, credentials, alternate host syntax or an unsupported source | Canonicalize safely; reject unsafe targets; select only an enabled adapter; no arbitrary backend fetch. |
| DLA-02 | Spotify reference yields a probable YouTube recording with a different edit/duration | Show both identities and ambiguity; require recording choice; do not inherit old sample cues or label it a Spotify master. |
| DLA-03 | Enabled extractor receives an eligible, known fixture | Complete resolve, format selection, transfer, validation and library publication; actual bytes/source match expected evidence. |
| DLA-04 | Named website has a working form but no verified integration contract | Mark vendor integration unverified; do not advertise an embedded API or silently scrape the form as a production dependency. |
| DLA-05 | Lossy source is converted to high-bitrate MP3, WAV or FLAC | Preserve original and processing history; show output format without claiming recovered fidelity or lossless source. |
| DLA-06 | Server returns HTML, executable bytes, corrupt/truncated media or excessive size | Fail safely before playable publication; maintain bounded resource use and actionable diagnostics. |
| DLA-07 | Transfer resumes after URL expiry or changed object | Re-resolve and validate identity/range; resume only the same object; otherwise restart or report change. |
| DLA-08 | Cancellation races transfer, conversion or publication | Old revision cannot publish after cancellation wins; completed publication reports already completed; unrelated playback continues. |
| DLA-09 | Process exits between file placement and database commit | Recovery reconciles the manifest once; no false-ready record, duplicate asset or deletion of referenced media. |
| DLA-10 | Duplicate request or retry arrives | Same immutable request reuses the job; changed payload with reused key is rejected; one worker owns each revision. |
| DLA-11 | Selected playlist contains duplicates, unavailable items and reordered completion | Preserve selected order and intentional duplicates; report per-item outcomes and partial completion honestly. |
| DLA-12 | Acquisition and conversion compete with the selected live workload | Meet the relevant audio/thermal gate or defer acquisition work; no network/file/model work in the callback. |
| DLA-13 | Adapter receives rate limit, login requirement, access denial or repeated failure | Use bounded retry/backoff or specific blocked state; no credential harvesting, control bypass or infinite retry. |
| DLA-14 | Malicious URL, filename, metadata or media parser input reaches a worker | No shell/path injection, private-network fetch, secret access or unbounded decode; failures stay isolated. |
| DLA-15 | Technical success conflicts with service, content-use or distribution evidence | Preserve independent statuses and specific reason; never present technical success as an authorization decision. |
| DLA-16 | Extractor update breaks formats or matches | Pin and canary the update, disable/rollback the affected adapter, preserve downloaded library and live engine. |
| DLA-17 | ParDay receives restricted metadata or sensitive delivery URL | Exclude restricted fields/secrets from prompts, embeddings and logs; permitted job state remains useful. |
| DLA-18 | Download finishes after the user changes decks or takes manual control | Publish to library only; any subsequent load/armed plan needs current state and its own authority. |
| DLA-19 | User cancels in-app versus presses Android Task Manager Stop | In-app cancellation targets acquisition; OS app termination is reported as interruption and recovery is tested without promising continuous audio. |
| DLA-20 | S26 Ultra is tested across software build, storage/network and audio routes | Record exact profile and outcomes; no universal device/source certification from a model name alone. |

## 12. Implementation work packages

**DL0 - Contract and fixtures.** Define adapter responses, provenance, formats, state transitions and errors. Create an original short audio/video fixture set on a controlled source, known wrong-edition pairs, corrupted responses and resumable/expiring transfer fixtures. Record hashes and permissions. No copyrighted catalog is needed to prove the job infrastructure.

**DL1 - Native intake and queue.** Implement paste/share, selection, source/format details, queue, cancellation and persisted states using fake and controlled adapters. Demonstrate the full C-theme journey on the S26 Ultra without touching the audio engine.

**DL2 - Local extraction feasibility.** Evaluate the native on-device candidate on suitable real-source fixtures and current dependencies. Verify actual media identity, source behavior, transfer mode, quality, maintenance burden, Android packaging and licensing. Record reusable fixtures and baseline measurements for the deferred controlled-worker comparison. A blocked source path remains an explicit unresolved capability; report the evidence and alternatives without silently requiring AWS or dropping the selected workflow. A useful demo is not a blanket catalog guarantee.

**DL3 - Transfer and publication.** Implement resumable transfer, bounded validation, optional conversion, recovery journal, deduplication and library publication. Pass adversarial and interruption cases before associating media with live decks.

**DL4 - Performance and ParDay.** Run acquisition alongside the selected audio workload, including manual takeover and late completion. Add bounded assistant tools only after deterministic operations are proven. Compare completion time, errors, heat, battery and required user steps against the manual baseline.

**DL5 - Local source and release decision.** Admit the tested on-device source paths using measured results and separately recorded source evidence. Personal local delivery is selected; optional publication details remain separate. Vendor integration, if pursued, requires a real interface and agreement. Report remaining gaps to the owner; do not delete the selected feature or promise support for every link. A blocked source capability is not completed merely because local playback works. The later AWS comparison belongs to a separate extension decision, not this local release gate.

Completion means an integrated, tested source path producing the correct usable media, with truthful quality and recovery behavior. A browser link, a mocked progress bar, or a successful metadata lookup alone is not completion.

## 13. Deferred comparative evaluation for AWS expansion

The earlier comparison decision remains useful for selecting a later extension, but the latest owner instruction supersedes its timing: build the local version first, then expand to AWS if justified. The initial implementation path is D, with no required server. The deferred experiment compares D and AWS without a predeclared performance winner and without committing the product to two permanent modes. Preserve baseline fixtures and results during local work; rerun comparable cases when AWS is evaluated because software/source conditions may change. Possible source sharing for independent home labs is covered in Document 17. No home host is selected. AWS is accepted for later use with an approximate USD 35/month planning target excluding ParDay AI-provider charges, not provisioning authorization. Document 18 defines its future profile. No service, device benchmark or repository publication has been performed.

### Arms and comparison boundaries

| Arm | Execution and network | What must be declared |
| --- | --- | --- |
| D - On device | S26 Ultra resolves, acquires and performs selected processing | Extractor/runtime/encoder versions, package size, phone resource use and source access path |
| AWS - Owner-operated cloud | Same phone uses the evaluated AWS worker from actual Wi-Fi/mobile networks | Region, instance/runtime, limits, disk, source-to-server and server-to-phone paths, billable bytes and actual access behavior |
| H-LAN / H-REMOTE - Optional future home lab | Portable worker on a separately chosen local host, over LAN or configured remote access | Additional portability evidence only; no local host purchase or deployment is required for local delivery or the later D/AWS comparison |

D is the first local implementation/evidence track. D versus AWS is the deferred comparison once the local version exists and a concrete AWS experiment is chosen. H-LAN and H-REMOTE remain optional network conditions for a future physical home lab. Declare whether the server only resolves a URL, relays bytes, or creates a temporary artifact. A URL bound to a server session/network may make direct phone transfer unavailable. Record this as observed capability rather than quietly switching modes inside a timing comparison.

Use the same extractor implementation/version on both sides when feasible to isolate execution location. If native and backend candidates require different extractors or encoders, report the result as a comparison of complete implementations. Do not attribute all differences to the phone versus server. Test the common source/format intersection for direct comparisons and report extra or unavailable coverage separately. Unofficial extractors remain eligible candidates; an official API is not a universal prerequisite. Source/service/content evidence stays distinct from technical results.

### Fixture and condition controls

Create a versioned fixture manifest with original or appropriately permitted audio/video, exact media IDs and hashes, duration, codec/container, sample rate/channels, expected recording/edition, and applicable use/access basis. Include short and longer music, a video with audio, difficult metadata/version pairs, and controlled invalid/interrupted responses. Use the existing twenty DLA cases for failure correctness. No commercial music library needs to be published with the benchmark pack.

Run source-preservation and conversion as separate experiments. Source-preservation compares the same rendition where available; conversion holds source bytes, output codec/settings, trims and metadata behavior constant. If encoders differ, record both builds and validate final rendition timing and sound rather than demanding equal hashes for independently encoded outputs. Hash equality is appropriate for unchanged preserved files. A faster result obtained by selecting lower quality is not a valid speed advantage.

Record app build, device variant, Android/One UI build, RAM/storage, available space, output route, audio sample rate/buffer, deck/FX/stem/video workload, screen brightness/refresh, battery charge, charging state, battery-saver setting, ambient conditions and observed thermal state. Record server model/CPU/RAM/storage, AWS region and exact instance/runtime, OS/kernel, worker/container digests, CPU/memory limits, active background services and network topology. Measure each applicable transfer leg separately: verified direct source-to-phone transfer, source-to-AWS transfer, AWS-to-phone delivery and optional storage-service transfers. Do not count cloud media egress when verified direct media transfer bypasses AWS. Include start/stop and cold-start conditions; a warm service trial is not an on-demand startup result. Docker containers have no resource constraints by default; record enforced limits rather than inferring isolation from a Compose file. [B4]

Separate app/process startup, resolver startup, resolver cache, downloaded-media cache and analysis cache. A warm cache hit is not a fresh acquisition. For active-mix tests the engine stays running while only acquisition caches/workers change; do not call that an entirely cold app. Use the same foreground tasks and resource policy for each arm. Record external source responses and service outages without repeatedly probing or increasing request volume to force success.

### Staged test plan and applicability

The local build applies the relevant C0 correctness, C2 audio coexistence, C3 local failure and C4 phone setup checks to D. Paired C1 and all cloud-specific variants are deferred and cannot become accidental first-local-release gates. The complete staged protocol below applies when the later AWS comparison is undertaken.

**Stage C0 - Eligibility and correctness.** Confirm build/licence compatibility, usable source path, job contract, identity, format reporting, validation, cancellation, safe publication and recovery using controlled fixtures. Record blocked/unavailable cells separately from technical failures. An unverified website form is not an implemented adapter. Do not compare elapsed time for an arm that cannot deliver the correct artifact. For AWS, first test an actual permitted source path from the intended region and runtime. Record unavailable, denied, rate-limited, authentication-dependent or region-dependent behavior. A cloud VM is not evidence that a source adapter works; do not escalate request volume or silently change access identity to force a pass.

**Stage C1 - Paired preparation trials.** Select a bounded core set covering short/long audio and video, with both preserved-source and conversion tasks. Proposed initial sampling is five paired attempts per selected case/cache condition across at least two independent sessions. Randomize or balance D/AWS order, capture pre-run conditions, and recondition the phone/server to comparable states between pairs. Keep failed and timed-out attempts in the denominator. Report paired differences, medians, ranges, counts and causes; five trials do not justify a stable tail-latency claim. Expand only the cells whose uncertainty could change the decision.

**Stage C2 - Live coexistence.** Compare each viable arm against the same prepared local-set baseline with acquisition disabled, then with the identical acquisition workload. Start with P0 and expand only to the intended supported P1-P3/video profiles in Document 09. Follow the same deferral policy on both arms. Queue time caused by protecting audio is part of the user-visible result. Final certification still requires the relevant shared warm-soak gates; a short comparative demo does not replace them.

**Stage C3 - Failure and remote operation.** Exercise server down, expired endpoint credentials, interrupted connection, Wi-Fi/mobile transition, locked screen, low storage, cancelled conversion, expired media lease, adapter update failure and process recovery. Prepared local mixing must continue without the server. AWS trials distinguish Wi-Fi and mobile service, stopped/warming workers, expired artifacts and endpoint changes. Optional remote home-lab operation is a separate condition if later evaluated. In-app cancel targets the acquisition job; OS Stop/Force stop remains the app-termination case already specified.

**Stage C4 - Setup and maintenance.** Using clean instructions and a permitted fixture, the owner measures setup steps, active time, failed steps, questions, update/rollback effort and backup/restore. Compare phone-only setup with a clean AWS trial deployment and verified cleanup. A future physical home-lab setup is optional portability work. Testing by another operator is conditional on community-reproducibility claims, not a prerequisite for personal release. Record cloud compute, persistent storage, public addressing, transfer, logs and remaining resources after shutdown. For a later physical host, record its operating costs separately. Account spend limits and alerts have the distinct applicability described in Document 18.

### Measurements and honest interpretation

Use client monotonic time for user-visible request-to-ready duration. Separately record resolve, selection wait, queue, transfer, processing, final validation, publication and optional analysis. Human selection time is reported separately from system time. Worker spans use their own monotonic clocks and trace IDs; never subtract unsynchronized phone/server wall clocks. Parallel spans need not sum to total latency. Report first playable separately from fully prepared, and include the selected actual recording and output properties beside each result.

Measure completion/mismatch/failure counts, retries, bytes transferred on each network leg, peak staging/final storage, process CPU time, a clearly defined memory metric, audio underruns/discontinuities, callback budget, thermal observations, phone battery/energy observations, server utilization and incremental operating cost. Pair power observations with an otherwise identical local-set or idle baseline. Show phone consumption and server/network consumption separately; moving work off the phone is not proof of lower total energy.

Android's Thermal API can support observation, but availability and interpretation vary by device; unsupported or invalid readings stay unavailable. Follow the documented sampling limits. [B1] Android Studio's documented power-rail monitoring is device-specific and is not an established S26 Ultra capability. Whole-device power is not automatically app-attributed energy; battery percentage alone is a coarse observation. Record available charge/current counters or an appropriate external measurement method, its resolution and limitations, without inventing missing measurements. [B2]

Use a release-like, non-debuggable/profileable build for comparable UI measurements where supported. Android Macrobenchmark can supply repeatable startup/UI traces; it does not replace physical audio/output measurements from Document 09. [B3] Keep measurement overhead comparable and run final endurance checks under the intended production configuration.

### Decision rule

First apply mandatory gates: correct recording/final format, no unarmed deck action, safe cancellation/publication/recovery, protected audio in the declared profile, source/provenance integrity, bounded worker/network behavior, and dependency compliance for personal deployment, plus compatibility with any project licence later selected for publication. A faster candidate cannot compensate for failure in those gates. An unresolved gate remains unresolved; no numerical score turns it into a pass.

Among viable candidates, present the measured tradeoffs in phone heat/battery, completion time, source coverage, storage, independence away from home, setup/maintenance, privacy and ongoing cost. Apply the established priority of local independence and the approximate USD 35/month future AWS target, then present any remaining tradeoff that could change the extension decision; no arbitrary weighted overall score is preselected. If neither candidate dominates, retain the local default unless measured benefits justify adding or changing an acquisition path. Maintain both only when their distinct benefits justify the cost and maintenance. Record the evidence, limitations, chosen configuration and revisit triggers in an architecture decision record. All results in the companion protocol are intentionally empty.

## Sources checked 29 October 2026

- [A1] Spotdown public product page: https://spotdown.org/en2
- [A2] Spotdown terms: https://spotdown.org/en2/terms-of-service
- [A3] Y2Mate public product page: https://en.y2mate.st/x16/
- [A4] Y2Mate terms: https://en.y2mate.st/terms.html
- [A5] spotDL project documentation: https://github.com/spotDL/spotify-downloader
- [A6] yt-dlp project documentation and licensing: https://github.com/yt-dlp/yt-dlp
- [A7] NewPipeExtractor documentation and licence: https://github.com/TeamNewPipe/NewPipeExtractor
- [A8] Android user-initiated data transfer: https://developer.android.com/develop/background-work/background-tasks/uidt
- [A9] Android long-running workers: https://developer.android.com/develop/background-work/background-tasks/persistent/how-to/long-running
- [A10] Spotify Developer Terms: https://developer.spotify.com/terms
- [A11] YouTube Terms of Service: https://www.youtube.com/static?template=terms
- [A12] Google Play intellectual-property policy: https://support.google.com/googleplay/android-developer/answer/9888072?hl=en

- [B1] Android Thermal API and device limitations: https://developer.android.com/games/optimize/adpf/thermal
- [B2] Android Studio Power Profiler and supported measurements: https://developer.android.com/studio/profile/power-profiler
- [B3] Android Macrobenchmark setup: https://developer.android.com/topic/performance/benchmarking/macrobenchmark-overview
- [B4] Docker runtime resource constraints: https://docs.docker.com/engine/containers/resource_constraints/

Architecture, proposed contracts and acceptance cases are this project's design judgments. Source statements describe current documentation, not measured functionality of this app.
