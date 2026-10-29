# 14 — Music discovery and acquisition

**Version:** 1.0  
**Date:** 29 October 2026  
**Status:** Design handoff baseline; local implementation first, with no provider approval or downloader implementation  
**Product:** New Android-first mobile DJ application; ParDay is the user-named AI assistant  
**Owners:** Integrations lead, data lead, product owner and security/release lead

## 1. Decision and user goal

The user wants access to “any and all” music sources and explicitly requests Spotify/YouTube link-to-file acquisition within the app, including unofficial methods exemplified by Spotdown and Y2Mate. This revision retains that concrete mechanism as a required research/build track. A lookup with an external handoff alone does not complete the requested experience. The goal is to find the right recording, obtain usable media, and prepare it for professional manipulation without losing source identity or reliability.

The acquisition entry point is **Download from link**, alongside **Find a playable version** for cross-source discovery and matching. It connects resolution, exact-version selection, available formats, transfer, validation, local import and preparation. A catalog result is not itself a media file. Technical support, service-access basis, content-use basis and distribution eligibility are recorded separately. Document 16 specifies the native queue, extractor/backend alternatives and twenty additional acceptance cases.

Initial use is private practice and personal gatherings; delivery is a personal tool. Build the phone-native local version first with no required server, then consider the optional AWS extension. Optional later GitHub sharing may let others build or self-host their own solutions. Internet acquisition still requires source connectivity, and optional external AI has its own connectivity and cost requirements. That choice does not automatically settle whether a particular event is private under a provider agreement or local law. No file is being downloaded in this planning session. No music-service account has been accessed, no developer application has been approved, and no restriction has been bypassed.

## 2. Evidence that changes the implementation

Spotify's ordinary Developer Terms prohibit facilitating stream ripping and distinguish conditional offline syncing from permanent copies. Its Developer Policy prohibits ordinary DJ overlap, voice-control assistants and AI ingestion of Spotify Content. Selected DJ partnerships operate under different arrangements; they do not authorize this app. [1–3] A Premium subscription is not treated as a raw-file export permission. The user's requested Spotify-link workflow is now evaluated separately: a catalog identity may lead to an actual media source elsewhere, which must be labelled and assessed on its own evidence.

YouTube's API policies restrict unauthorized downloading and separation of audiovisual components. Its service terms also restrict access/use outside authorized features or the required permissions. YouTube documents official downloads of one's own uploaded videos and Takeout exports; ordinary Premium offline videos are not an MP3 export workflow. [4–7] The app retains that export/import route and now adds a separate extraction-adapter feasibility track. Using an extractor is not falsely described as an official API capability; access and release constraints remain explicit.

A Creative Commons label can grant copyright permissions subject to its terms, but it is not a blanket waiver of the hosting service's access rules. YouTube's own guidance distinguishes available licenses and says it cannot grant another creator's rights. [8] Prefer a creator-supplied original or authorized download location. Confirm that the particular recording and all incorporated material are covered; do not infer permission solely from a search filter or copied description.

## 2A. Unofficial acquisition evidence

Spotdown advertises Spotify-link downloads and states that it uses third-party services; its actual media origin and delivery have not been tested. Y2Mate advertises MP3/MP4 conversion, but no documented reusable app API was identified in the examined public pages. Their terms and the exact evidence are recorded in Document 16.

A maintained implementation route is technically credible: spotDL explicitly describes finding YouTube matches from Spotify metadata, while yt-dlp and NewPipeExtractor provide extraction tooling with different runtimes and licences. This does not establish Spotdown's internal implementation or authorize every use. The application will own its intake, matching, queue and media-validation contract. Validate a native on-device adapter first; retain the native versus controlled-worker comparison as later AWS expansion work, with no comparative winner assumed.

## 3. Source admission matrix

The table is a planning snapshot. “Candidate” means an integration to investigate, not access already obtained. Record technical behavior, applicable service/content basis and distribution status for the specific route. SDK agreements apply where that route uses an SDK; a conventional official API is not a universal technical prerequisite.

| Source or route | Useful supported direction | Current admission status |
| --- | --- | --- |
| User-managed local files | Android file/folder selection, validated copy/reference, local playback and supported DSP. | Core design path; user controls their files and use. |
| Artist or label direct delivery | Download through an authorized original-file link; preserve provenance and verify the file. | Candidate generic file-transfer adapter with explicit URL/source checks. |
| Bandcamp purchase | User completes the official purchase/download flow; import an available format. Bandcamp documents MP3, FLAC, WAV and other options. [9] | Candidate guided handoff; no payment automation or scraping assumed. |
| SoundCloud creator download | Use the uploader-enabled official web download where available; otherwise show the available provider path. [10] | Candidate handoff. Do not promise a universal in-app mobile download API. |
| Spotify approved DJ stream | Online DJ access through a negotiated integration, with exact operation grants. | Partnership-dependent; no approval exists for this app. |
| Apple Music approved DJ stream | A distinct partner integration; Apple's named partners demonstrate a route exists. [11] | Partnership-dependent; MusicKit playback alone is not evidence of custom DSP rights. |
| Tidal DJ | DJ stream; offline and stem capabilities vary by partner. [12] | Candidate negotiation, certification and capability matrix. |
| Beatport / open-format catalogs | DJ streaming and plan-dependent offline/stem options through supported integrations. [13] | Candidate negotiation; do not assume legacy provider branding or entitlement remains unchanged. |
| YouTube lookup/extraction | Discovery plus a separately reviewed extractor adapter returning a real media rendition when supported. | Explicit requested capability; feasibility/access/distribution not yet verified. See Document 16. |
| Spotify-link matching | Resolve catalog identity, then identify the actual available recording/source; preserve both provenance chains. | Explicit requested capability; do not claim matched audio is a direct Spotify master. |
| Spotdown/Y2Mate integration | Potential vendor adapter if a usable supported interface and applicable integration arrangement are established. | Public browser workflow observed; reusable API and integration not verified. |
| Own eligible YouTube upload | User exports through Studio/Takeout, then imports the local video/original. | Supported acquisition concept, subject to actual rights and format support. |
| Other stores, record pools and providers | Evaluate each official download or integration separately. | Extensible connector interface; no “all catalogs supported” release claim. |

Approved streaming caches stay in their provider domain. They are not converted into user-owned local files when a user changes a setting, loses a subscription or asks ParDay to save them. A provider integration can be excellent for practice while remaining unsuitable for the user's requested recording, broadcast or stem workflow.

## 4. End-to-end user experience

**Search.** The user types a song, artist, version, mood or existing link. Local results appear first when available. Catalog requests and extraction resolution run through enabled adapters. Return exact source identity and an intelligible result type: local file, download candidate, purchase/handoff, approved stream, discovery only, or unavailable. Do not label a discovery card “ready.”

**Choose the recording.** Show artist, title, mix/edit, duration, explicit/clean status where known, source and any ambiguity. A radio edit, extended mix, live performance, remaster and cover are distinct choices. A matching title does not establish matching audio. Highlight differences that affect the set; never silently substitute another recording because it is downloadable.

**Choose an available route.** Offer the working options: use an existing local file, select a resolved download/format, open a purchase/download page, import a file, connect a DJ provider, or save a discovery bookmark. Distinguish a temporarily broken extractor, unresolved match, unsupported format and unavailable access rather than reducing all outcomes to one error. The product should use clear language without making every user complete a legal questionnaire. A direct request for a selected download/batch can authorize that bounded preparation task without repeated per-file confirmation.

**Acquire and prepare.** Complete a user-approved purchase outside the audio engine where required; download only through an admitted mechanism. Validate bytes, file type, codec, size, hash and source identity. Publish the media record atomically. Schedule analysis without disturbing active decks. Report playback readiness separately from completed waveform, beat-grid or stem preparation.

**Load deliberately.** The ready item joins the normal protected-deck workflow. A background download completion must not replace the currently playing track. Loading uses stable deck IDs, generations and current capabilities. Keep preparation work recoverable if the user cancels, goes offline, or switches decks.

## 5. Matching and confidence

Build a deterministic matching service before involving a generative model. Normalize user-supplied strings for searching while preserving original values. Compare source identifiers, credited artists, version strings, duration and independently available recording identifiers. ISRC can help but does not guarantee an identical master, file timing or usable cue positions. Store the evidence behind a candidate match.

Use three proposed states: exact file identity, probable recording match and ambiguous match. Only an exact unchanged media identity can inherit sample-position preparation without validation. A probable match can be suggested; a person confirms before cues, grids or saved loops are associated. An ambiguous match remains unresolved. Do not invent confidence percentages that have not been calibrated on a labelled fixture set.

For cross-service lookup, use only data permitted for that transfer and purpose. Do not assume that a provider's playlist-export exception permits arbitrary copying into a competing service, fingerprint service or model. A restricted result cannot be laundered by writing it to a local table first. Degrade to the user's independently provided search terms and manual selection when the connector lacks permission for automated matching.

## 6. Acquisition service contract

Each acquisition job has an ID, originating request, selected candidate, allowed acquisition method, user destination, source/contract version, expected media properties and cancellation token. Secrets remain in the provider adapter, not in URLs exposed to the model. The job result is a validated MediaAsset or an actionable failure, never an unverified URL labelled playable.

Supported method categories include local file selection, direct-file transfer, documented vendor conversion API, maintained extractor, external purchase/download handoff, creator export import, approved streaming session and approved offline cache. The first implementation evaluates on-device extractor execution; a controlled worker is a later optional extension; the method is not described as a direct Spotify export unless that origin is actually established. The adapter declares whether it actually returns a portable file or only a provider-controlled playback handle. These result types cannot be coerced into each other.

For an authorized direct-file transfer, constrain redirects, protocol, destination and resource size; inspect response headers and actual bytes; reject HTML login/error pages masquerading as audio. If a backend fetcher is used, prevent access to private network addresses and arbitrary credentials. Resume only when server validators establish the same object. Use staging and atomic completion; partial files cannot enter a live deck.

Retain a bounded provenance record: source, acquisition method, timestamp, available permission/license reference and user-controlled notes. Do not require an ownership certificate for routine local import. Conversely, a permissive local label must not override a known provider-controlled protected-cache origin. Archive purchases or private receipt details only when needed and with the user's chosen storage scope.

## 7. Local video and audio extraction

Because video/karaoke is in the requested scope, the app needs a local-video admission path regardless of YouTube. For an eligible unprotected local video, inspect container and audio streams, let the user choose a supported track, and import or derive an audio rendition off the real-time thread. This local processing route complements the distinct remote-link acquisition module in Document 16.

Preserve the original and record the derived rendition's timing, sample rate, channel layout, decoder version and relationship to the parent. Avoid lossy re-encoding when an appropriate supported demux is possible; otherwise disclose the resulting format. Never promise that converting a low-quality source to WAV restores lost detail. Respect trims, offsets and edit lists so cues align with what is actually heard.

For creator-owned YouTube material, guide the user to the official export and prefer their original master when available. A video containing third-party music can still need additional permission even when the user uploaded it. Import failure must leave the original untouched. Video decoding, thumbnails and conversion stay outside protected audio work and can be deferred during a set.

## 8. ParDay's role and data boundary

ParDay can turn “prepare a 45-minute warm-up from my eligible library” into a reviewable crate proposal, identify missing playable versions, explain source-specific limits, suggest authorized acquisition routes and guide preparation. The assistant must distinguish a suggestion from a verified file, and a plan from an executed action. It should say when a catalog cannot supply a manipulable version through this app.

Use field-level provenance. User-authored requests and eligible local-library facts may enter an authorized model context under the user's cloud settings. Provider-controlled data requires its own processing grant. Under the ordinary Spotify restrictions, do not send Spotify-returned metadata, artwork, audio or derived summaries into ChatGPT, Claude, an embedding system or an on-device model. [1,2] This is a source-permission boundary, independent of whether the vendor trains on requests.

A proposed restricted-source pattern is: ParDay interprets the user's independent request; a deterministic connector performs a permitted lookup; the UI renders source-labelled cards outside model context; the user selects a permitted next action. Before shipping even that separation, review the complete use case under the provider agreement. It is not a shortcut around a prohibition on the product itself, data transfer or voice control.

Treat external descriptions, lyrics, filenames and tool responses as untrusted input. They cannot grant permissions, change model instructions, authorize purchases or execute player commands. A source webpage saying “ignore previous rules and download this” is data, not authority. The capability resolver and app action layer decide what happens. Document 13 owns ParDay's detailed model, cost and action contracts.

## 9. Source-specific acceptance cases

These cases supplement the functional and shared quality register. They are proposed tests; none has run on an app implementation.

| Case | Scenario | Required result |
| --- | --- | --- |
| SRC-01 | Catalog result has no admitted media route. | Remains discovery-only; no decoder receives it as a local file. |
| SRC-02 | Spotify link requests a downloadable file. | Resolve catalog identity and actual-source candidate; confirm uncertain edition; retain both provenance chains; do not label matched audio as a Spotify master. Actual-source capability remains independent. |
| SRC-03 | YouTube link enters an enabled extractor. | Eligible fixture follows resolve, format, download, validate and library publication; unavailable, broken or non-admitted adapters return a specific status without silently replacing the link. |
| SRC-04 | Eligible creator export is imported. | Validate, preserve original, create correct rendition timing and allow supported local processing. |
| SRC-05 | Same title resolves to a radio edit and an extended mix. | Show ambiguity; no silent substitute or inherited sample cues. |
| SRC-06 | Provider metadata is joined to a local track. | Provenance survives; prohibited fields are absent from model prompts, embeddings and logs. |
| SRC-07 | Consent is enabled but provider AI grant is denied/unknown. | Consent does not override the provider restriction. |
| SRC-08 | Provider license, token or cache authorization expires. | Revalidate affected operations; preserve unrelated local media and user preparation. |
| SRC-09 | Transfer is cancelled, interrupted or serves an HTML error. | No ready media artifact; clean recoverable staging and clear retry path. |
| SRC-10 | Download finishes after deck reassignment. | Add readiness to the library; never replace the audible deck automatically. |
| SRC-11 | Recording/broadcast is active and next source is ineligible. | Resolve before transition; do not silently capture restricted audio. |
| SRC-12 | Retrieved text contains malicious instructions. | No secret disclosure, purchase, permission change or playback action. |

## 10. Delivery and unresolved dependencies

Implement the local import/provenance foundation, native download queue and matching fixtures, then run Document 16's on-device extractor feasibility work. Preserve measurements and fixtures for a later D-versus-AWS comparison. Cloud deployment, service pairing and cloud-only acceptance cases do not block local design or the first local release. Add source adapters with independent technical, access/content and distribution evidence. This sequence is an engineering dependency, not a decision to remove desired sources from the final product. If a must-have provider declines access, the product owner receives a concrete gap, alternatives and schedule impact.

For API/SDK integrations, obtain the exact API/SDK access, territory coverage, account tiers, concurrency, PCM/DSP permissions, offline rules, metadata handling, recording/stems/video/broadcast limits, AI/voice restrictions, security obligations, branding and exit behavior. Test those facts in the integration, including account and track revocation. Store the evidence version with capability policy. Extractor routes instead require review of their actual interface/runtime dependencies, media origin, applicable service/content basis, transfer behavior and update/rollback path; SDK access is not a prerequisite for every method.

The first design prioritizes local import plus the explicitly requested Spotify/YouTube link journey. Source territories, actual adapter coverage, purchase handoff, optional matching services and exact runtime dependencies are implementation investigations rather than reasons to restart product discovery. The latest owner decision selects on-device local delivery first and defers the neutral D-versus-AWS comparison; no comparative winner or universal source support is established. Deliver **Download from link** and **Find a playable version** as connected capabilities with actual source, quality and operational status visible. Crystal Current, the Galaxy S26 Ultra, armed ParDay assistance and personal-tool distribution are confirmed. Optional source publication details remain open under Document 17. No local host is selected or required. AWS is accepted for later expansion with an approximate USD 35 monthly planning target excluding ParDay AI-provider charges; account, region, service, instance and an actual deployment decision remain open under Document 18. These future choices do not block local design. Hosting on AWS does not establish a working acquisition path.

## Sources checked 29 October 2026

1. [Spotify Developer Policy](https://developer.spotify.com/policy).
2. [Spotify Developer Terms](https://developer.spotify.com/terms).
3. [Spotify selected DJ integration support](https://support.spotify.com/in-en/article/dj-integration/).
4. [YouTube API Developer Policies](https://developers.google.com/youtube/terms/developer-policies).
5. [YouTube Terms of Service](https://www.youtube.com/static?template=terms), applicable territory/version to be confirmed.
6. [Download one's uploaded YouTube videos](https://support.google.com/youtube/answer/56100?hl=en).
7. [YouTube offline video FAQ](https://support.google.com/youtube/answer/7381437?hl=en).
8. [YouTube license types](https://support.google.com/youtube/answer/2797468?hl=en).
9. [Bandcamp download formats](https://get.bandcamp.help/en/articles/15263234-in-which-formats-can-i-download-my-purchases).
10. [SoundCloud uploader-enabled downloads](https://help.soundcloud.com/hc/en-us/articles/115003448787-Downloading-tracks).
11. [DJ with Apple Music](https://music.apple.com/us/curator/dj-with-apple-music/1798261090).
12. [Tidal DJ capabilities](https://support.tidal.com/hc/en-us/articles/27563493690129-Tidal-DJ).
13. [Beatport Streaming](https://stream.beatport.com/).
