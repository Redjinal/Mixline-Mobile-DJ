# 18 - AWS deployment and comparison plan

**Version:** 1.0  
**Date:** 29 October 2026  
**Status:** Design handoff baseline for a deferred AWS extension; no cloud resources created or source path tested  
**Confirmed direction:** Build the local phone-native personal version first; expand to AWS later if justified. Future AWS planning target is approximately USD 35/month excluding ParDay AI-provider charges. No existing host is selected; the later D-versus-AWS comparison has no measured winner.  
**Owners:** Cloud/Integrations, Android, Library/Data, Security/Release and Quality  
**Companions:** Documents 05, 09, 10, 11, 13, 16 and 17; acquisition comparison protocol; AWS deployment profile and cost assumptions

## 1. Decision and first evidence checkpoint

The owner selected a local version first and AWS expansion later. Deliver the Android app with a phone-owned library, preparation, acquisition job state and live engine, without a required LAN or cloud server. Preserve a replaceable adapter boundary and useful measurements, but do not build or deploy AWS as a dependency of that first version. This document is a deferred expansion specification. When the extension is pursued, AWS is the accepted remote service host for the personal acquisition comparison. It has different network and billing behavior from a home-LAN machine. Keep portability for a later community operator; buying a home server is not required.

The owner selected an approximate USD 35 monthly AWS planning target, excluding ParDay AI-provider charges. Account, region, service/instance, active hours, endpoint, project licence and a concrete deployment decision remain open. The target is not a guaranteed bill, hard ceiling or permission to provision resources now. The initial implementation path is local; the comparative winner for an optional expansion is unmeasured. The interface remains one native acquisition workflow with interchangeable admitted adapters.

After the local version is usable and a concrete cloud experiment is chosen, the first AWS checkpoint is a bounded source-path feasibility test. Build and validate a minimal worker against a permitted known fixture, then verify the intended media sources from the selected AWS environment. Record resolution, actual recording/edition, format, redirects, transfer mode, file integrity, source errors and extractor build. A source path that works on a residential or phone connection is not assumed to work identically from a data-center network. Authentication challenges, source restrictions and unsuccessful requests become evidence; do not reinterpret them as successful extraction or add an unreviewed evasion system.

Keep requested unofficial extractor candidates in the experiment. Technical results, provider/service access, content use and distribution status retain separate records under Document 16. The availability of AWS does not settle any of those source questions. Do not invest in a larger service architecture until at least one intended end-to-end source path works and its remaining constraints are understood.

## 2. Proposed later AWS trial profile

For a finite benchmark, propose one on-demand Linux x86-64 EC2 instance, one availability zone, a small encrypted gp3 EBS allocation, and the same pinned portable worker that can later run elsewhere. Use a non-burstable general-purpose instance as a candidate for repeatable conversion measurements. The m7i.large specification is 2 vCPUs and 8 GiB memory; it is a proposed test profile, not a demonstrated minimum or chosen purchase. [W1]

Start with one active acquisition job and one bounded conversion/preparation operation. Record the effective CPU, memory, process, disk, byte and time limits. These are proposed experimental controls; do not publish throughput or simultaneous-job guarantees until measured. Keep the live engine, cue/master routing, immediate manual takeover and authoritative performance state on the S26 Ultra.

A 30 GiB total gp3 allocation can be used as an initial cost-model assumption, subject to the actual OS/container footprint and bounded fixture sizes. Reserve free space for the operating system and journal; a per-job quota is smaller than the available staging capacity. Reject oversized video or offer an eligible smaller rendition before transfer; never fill the system volume.

Use one owner-authenticated HTTPS service endpoint. Administrative access should use Systems Manager Session Manager when the selected image and network setup support it; AWS documents that Session Manager does not require opening inbound administration ports. [W2] The trial does not need a load balancer, NAT gateway, Kubernetes cluster, managed relational database, GPU or multi-region deployment. Each added service needs a measured purpose and its own cost line.

The region remains open. Use a named region for every price quote and trial, measure from the owner's actual Wi-Fi and mobile networks, and record the endpoint route. A pricing reference region is not a claim about the user's location or the fastest region.

## 3. Why compare these AWS hosting choices

| Candidate | Useful property | Consequence for this experiment |
| --- | --- | --- |
| EC2 on demand | Direct control of the host, pinned containers, local journal/staging and stop/start lifecycle | Proposed finite-trial baseline. OS maintenance remains ours; attached storage and retained addresses can continue costing money while compute is stopped. [W3] |
| Lightsail instance | Bundled compute/storage/transfer packaging can simplify a small steady personal service | Strong alternative if always-available operation becomes preferable. Stopped instances still accrue plan charges until deletion; CPU burst behavior must be recorded during sustained conversion tests. [W4, W5] |
| ECS on Fargate | Managed container execution without maintaining an EC2 host | Revisit when isolated jobs or managed scheduling justify additional networking, state and deployment work. Linux platform 1.4.0+ provides at least 20 GiB ephemeral task storage, configurable up to 200 GiB; container images consume part of it. [W6] |
| Lambda | Useful for a small control-plane action or bounded event processing | Do not make it the default media worker merely to call the service serverless. Standard event functions have a 900-second timeout; documented Managed Instances invocation exceptions support longer execution. Packaging, storage, startup, transfer and job recovery still require a complete design. [W7] |

Do not choose a burstable EC2 or Lightsail profile solely from its advertised vCPU count and then compare a fully credited cold run with a depleted sustained run. If such a profile is evaluated, record CPU credits/burst state, operating mode and related charges. Compare identical output quality and report complete-implementation differences honestly.

No long-term compute commitment or reserved capacity is proposed before the trial establishes actual duty cycle and resource needs. Exact prices and scenarios belong in the accompanying cost assumptions, with quote date, region, operating system, billable hours, storage, IPv4 and transfer stated explicitly.

## 4. Components and data movement

The initial service has a versioned API/controller, a persistent job journal, an isolated acquisition worker and managed staging. These are logical boundaries and may share one machine; their permissions and failure handling remain separate. The phone retains its own authoritative acquisition/publication state and prepared library.

| Leg or stage | Required behavior |
| --- | --- |
| Phone to controller | Submit the accepted request revision and bounded options over verified TLS. Send a service-specific device credential, not AWS account credentials. |
| Controller to worker | Admit an immutable job specification with a lease, resource limits and permitted adapter. A model cannot choose executables, flags, filesystem paths or network policy. |
| Worker to actual source | Resolve and transfer through the admitted adapter. Record the actual source and edition; enforce address, redirect, response-size and timeout rules. |
| Validation and optional conversion | Validate source bytes before conversion and validate the exact final rendition afterward. Final format and timing evidence describe the resulting file. |
| Service to phone | Deliver the authenticated artifact or a separately verified direct-transfer path. Count actual source-to-phone or cloud-to-phone bytes and retries for the verified mode, alongside any source-to-server traffic. |
| Phone library publication | Verify received media, reconcile current revision/cancellation/lease, and publish through the existing atomic contract. Server artifact readiness is not proof of local publication. |

Do not assume a source URL resolved from AWS can be downloaded directly on the phone. The existing direct, relay and server-artifact modes remain distinct. Compare the exact mode offered by the adapter and account for its storage, delay and cost.

Keep S3 optional for the first single-instance experiment. Add private object delivery only if it provides a concrete recovery or stopped-instance benefit. If added, retain Block Public Access, scoped IAM and bounded retention. Presigned URLs are reusable bearer credentials until their effective expiry, not automatically single-use tokens; protect them from logs and model context, and verify the artifact on the phone. Temporary signing credentials may expire before the requested URL expiry. [W8, W9]

All cloud-side media in this profile is temporary working data unless the owner explicitly selects another policy. The phone is the prepared library. Keep originals, analysis, cues, recordings and cloud artifacts distinguishable. A server outage, stop, teardown or expired download link must not invalidate already verified local media.

## 5. Access, credentials and worker isolation

Pair the phone deliberately with a known service identity and an expiring single-use enrollment mechanism. Issue a revocable per-device credential. Require TLS certificate validation and an explicit certificate/identity rotation procedure. If a private VPN/overlay replaces public application exposure, review and document its authentication, encryption, mobile connectivity and additional dependency; a private address alone is not identity verification.

For a public HTTPS trial, expose only the required application port through the security group, use bounded request/job admission, and leave administration ports closed. Endpoint naming, DNS and certificate issuance must be concrete before deployment. A changed IP address must not cause the app to accept an unverified replacement service. Do not use trust-all TLS or bundle an AWS access key in the APK.

Separate owner administration from application access. The owner initially starts/stops the trial using their AWS administrative workflow. A stopped service cannot accept a wake-up request by itself. An in-app wake-up feature would require a separately designed limited control path and is not included by implication.

Use a least-privilege instance role only for the management or explicitly admitted AWS operations the host needs. Require IMDSv2 where metadata is enabled, but do not treat it as sufficient worker isolation. AWS documents metadata tokens and hop-limit behavior separately. [W10] Enforce denial of metadata, loopback, link-local and other private targets from the acquisition worker, including IPv6 and redirect/DNS-rebinding cases. The worker must not obtain the host's AWS credentials merely because the host needs a management role.

Workers run without privileged mode, host networking, the Docker socket, broad host mounts or unnecessary capabilities. Allow only managed staging and required immutable runtime files. Keep provider cookies, API keys, device tokens and AI credentials out of images, repositories, job arguments and diagnostics. Any source-specific credential use requires an explicit adapter configuration and separate scoped storage; no owner session is distributed to community users.

Encrypt EBS volumes. AWS documents encryption of volume data, instance-volume transfers and snapshots made from encrypted volumes. [W11] This does not remove application authorization or backup-retention requirements. Default backups should contain the required configuration and consistent job state, with media staging excluded. If whole-volume snapshots are used, disclose that they may preserve temporary media and apply the corresponding retention policy.

## 6. Cost control and lifecycle

Treat the later cloud trial as a finite experiment with a named resource set, explicit active hours and a teardown plan. The owner has selected approximately USD 35/month as the future AWS planning target, excluding ParDay AI-provider charges. This records the desired envelope, not a current deployment/spending approval or an enforced ceiling. Cost estimates must distinguish test-hours operation from an always-on month. contracts/aws_cost_scenarios.json separates 20-hour, 50-hour and always-on examples. Its M7i compute rate is explicitly historical and requires a current regional quote before any resource is created.

EC2 stop/start differs from deletion. EBS state persists, attached storage remains billable, and retained Elastic IP addresses remain chargeable. An automatically assigned public IPv4 address can change after stop/start, so endpoint identity and reconnection need a deliberate design. [W3] Lightsail stopped-instance billing is different and must not use the EC2 savings assumption. [W4]

Set local admission limits on jobs, bytes, execution time, retry count and retained artifacts. Add an explicit test-session expiry or reviewed idle-stop mechanism; drain or checkpoint work before a scheduled stop and report interruption honestly. Do not rely only on an idle detector to enforce the spending plan. Protect the local mix even if acquisition stops immediately.

Use actual-spend notifications and inspect billed resources during the trial. AWS Budgets data and notifications can lag usage; a normal budget alert is not a synchronous hard ceiling. [W12] AWS also documents project spend limits in its new AWS experience for eligible paid-plan projects. The minimum is the greater of USD 20 and a conservative spend estimate; the limit applies before tax and excludes credits. Reaching it can pause the project, and the documentation specifies permanent deletion after 90 days of inaction while paused. This account's eligibility and resource coverage are uninspected. If selected, validate these behaviors and recovery obligations; do not assume an arbitrary smaller hard ceiling is available. [W13]

Record compute, EBS, address hours, transfer, snapshots, logs, optional object storage/requests and separately chosen DNS, VPN, model or support costs. Do not assume free-tier eligibility, remaining shared transfer allowance, credits or tax treatment. Keep AI costs separate, including on a shared host.

Teardown means reconciling jobs and required exports, deleting the intended compute/storage objects, and auditing leftovers such as volumes, snapshots, addresses, buckets, registry images and log groups. Stopping the instance is a useful operating state, not proof of a zero bill or completed teardown.

### Illustrative cost scenarios in USD

The following EC2 subtotals are calculations, not current deployment quotes. They use a Linux/shared-tenancy m7i.large reference of USD 0.1008 per running hour that AWS explicitly dated 4 May 2024, 30 GiB gp3 retained for a full month at an assumed USD 0.08 per GiB-month, and one auto-assigned public IPv4 at USD 0.005 per running hour. The compute rate requires a current quote before any resource is created. Region us-east-1 is the arithmetic reference, not the owner's selected region. [W14, W15, W16]

| Running hours in the reference month | Compute | Retained disk | Public IPv4 | Subtotal before transfer/extras |
| --- | --- | --- | --- | --- |
| 20 hours | $2.02 | $2.40 | $0.10 | $4.52 |
| 50 hours | $5.04 | $2.40 | $0.25 | $7.69 |
| 730 hours | $73.58 | $2.40 | $3.65 | $79.63 |

Stopping saves compute in this EC2 scenario while the retained disk remains charged. A retained Elastic IP would change the address calculation. Transfer, snapshots, logs, DNS/domain, optional services, taxes and AI usage are outside these subtotals. Any account-wide transfer allowance must be verified against its remaining availability; it is not reserved for this app. The cost contract includes a paid-egress scenario as an assumption to refresh, rather than a promised zero transfer bill.

For a simpler always-available alternative, AWS currently lists Linux Lightsail bundles with public IPv4 at USD 12/month for 2 GB RAM, 2 vCPUs, 60 GB storage and 3 TB transfer, and USD 24/month for 4 GB RAM, 2 vCPUs, 80 GB storage and 4 TB transfer. These are bundle prices and region-dependent allowances, not all-in bills or performance certifications. IPv6-only variants are cheaper but require separate end-to-end connectivity validation. [W17]

The spending-target question is closed: approximately USD 35/month, excluding ParDay AI-provider charges, for a later AWS extension. The illustrative 730-hour M7i subtotal of USD 79.63 already exceeds that target before transfer and extras, so it is not an acceptable always-on recommendation within this envelope. A limited-hours EC2 experiment remains a candidate after a current quote. The listed USD 24 Lightsail base leaves USD 11 of nominal headroom before other costs, but is neither a selected service nor proof that the complete bill or workload fits. At the expansion milestone, choose duty cycle and service from current prices, measured source behavior and actual resource needs; do not reopen AWS setup as a condition of local design.

## 7. Build and operating runbook required from implementation agents

**Provisioning record.** Before creating resources, specify the owner/account context, region, instance/architecture, AMI and software versions, storage, network exposure, endpoint identity, tags, maximum trial duration and cost assumptions. Present the infrastructure change set and cleanup list. This planning document is not an applied template or authorization to incur charges.

**Reproducible build.** Pin the container/runtime, extractor, encoder and dependency versions; produce a dependency/licence inventory and build hashes. Prefer one portable worker package that supports the local and AWS comparison profiles. Exact x86-64/ARM support is tested, not inferred from Docker availability. Keep secrets outside build layers and shared examples.

**Bootstrap and pairing.** Verify encrypted volumes, host updates, management access, effective worker limits, source-fetch isolation, TLS identity and capability negotiation before pairing the phone. Verify that the unauthenticated endpoint cannot submit work or fetch an artifact. Document how to revoke a lost device and rotate credentials without discarding preparation.

**Job recovery.** Persist progress and request/cancellation revisions. A restarted service reconciles incomplete jobs under current leases instead of replaying completed actions. The phone must recognize an interrupted or expired artifact and retry or reacquire through the current request contract. A resumed download cannot overwrite a newer recording choice.

**Update and rollback.** Test a pinned adapter change against the fixture corpus before use. Retain a known working version and protocol compatibility information. A rollback must preserve readable journal data or perform the specified migration; swapping the container tag alone is not a recovery strategy.

**Cleanup and evidence.** Demonstrate a complete permitted fixture from intake to local readiness, deletion/expiry of temporary cloud media, server-loss continuity of local mixing, and accurate resource/cost records. Export redacted traces and checksums, then execute and verify the cleanup list. No public source repository or shared container release is created by running a personal trial.

## 8. Deferred comparison protocol and promotion conditions

The first implementation is D on the phone. The later expansion comparison is D versus AWS, and paired cloud trials are not required to complete local design or the first local release. Promote this deferred work only when the local version is usable, a concrete acquisition/update/processing limitation or operating benefit warrants cloud evaluation, and an actual region/service/costed trial is ready for an implementation decision. Reuse local fixtures and rerun comparably current D measurements; old data cannot automatically be paired with changed extractors or sources. Test the AWS path separately from the owner's actual Wi-Fi and mobile connection when both are relevant. Retain H-LAN/H-REMOTE only as optional home-hardware conditions; no home host is selected.

Preserve Document 16's paired fixture, rendition, cache, workload and timing controls. Add AWS region/availability zone, instance family, AMI/container digests, resource limits, network path, billed hours and bytes, stop/start history, burst state if applicable and service availability to each evidence record. Do not substitute cloud metrics for physical audio measurements on the S26 Ultra.

Include the minimal source-path feasibility stage before sustained comparison. Then measure request-to-local-playable and request-to-prepared time; resolution and human selection separately; completion/failure outcomes; each applicable transfer leg; phone heat, battery and audio behavior; cloud resources; operator effort; and actual/estimated costs with their coverage stated. Cold service startup is part of the relevant user workflow, not silently excluded from an on-demand result.

Prepared local mixing must survive server unavailability. The AWS arm must also demonstrate safe behavior when stopped mid-transfer, when credentials or certificates expire, and when an artifact disappears before phone delivery. A technically usable cloud path does not automatically become the chosen product runtime. Record the owner's eventual tradeoff decision and the evidence that supports it.

## 9. AWS acceptance cases

All cases below are proposed and unexecuted. They apply only to a later evaluated AWS profile; they are not local design or first-local-release gates. Passing them does not require choosing AWS as the final acquisition runtime. Existing FR-049, DLA and relevant QA gates remain authoritative for the implemented local path, media correctness and local audio.

| ID | Required demonstration |
| --- | --- |
| AWS-01 | Source-path feasibility: a permitted fixture and intended source path produce the correct verified local rendition from the actual AWS environment; failures and access conditions are recorded. |
| AWS-02 | Reproducible deployment: the declared configuration can be rebuilt with pinned versions, valid endpoint identity, encrypted storage and no hidden owner-specific dependency. |
| AWS-03 | Pairing and revocation: unauthenticated/revoked devices cannot submit work or retrieve artifacts; certificate/credential rotation is deliberate and does not erase local preparation. |
| AWS-04 | Worker isolation: attempted private/metadata/loopback targets, hostile redirects, excessive resource use and arbitrary execution inputs fail within the documented boundaries. |
| AWS-05 | Correct artifact publication: each applicable transfer leg, exact rendition/hash, cancellation revision, lease and idempotency are checked; server readiness cannot publish a stale or unreceived phone file. |
| AWS-06 | Stop/start and outages: local mixing continues; interrupted cloud jobs reconcile without duplicate publication or autoplay; changed endpoint addressing preserves verified identity. |
| AWS-07 | Workload and comparison: the declared S26 audio profile and paired acquisition experiment meet their gates, with cloud and phone measurements and failure denominators retained. |
| AWS-08 | Cost and admission controls: finite trial hours, quotas, alerts and any applicable spend-limit feature are exercised; residual storage/address/transfer costs remain visible. |
| AWS-09 | Update, backup and restore: protocol mismatch, adapter rollback and restoration preserve correct state while excluding or explicitly governing temporary-media backups. |
| AWS-10 | Retention and teardown: delivered/expired/cancelled artifacts follow policy; required exports are verified and all intended chargeable resources are removed or explicitly retained. |

## Sources checked 29 October 2026

- [W1] AWS, Amazon EC2 M7i instances: https://aws.amazon.com/ec2/instance-types/m7i/
- [W2] AWS Systems Manager, Session Manager: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html
- [W3] Amazon EC2, How instance stop and start works: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/how-ec2-instance-stop-start-works.html
- [W4] Amazon Lightsail, Billing and account management: https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-frequently-asked-questions-faq-billing-and-account-management.html
- [W5] Amazon Lightsail, CPU burst capacity accrual: https://docs.aws.amazon.com/lightsail/latest/userguide/cpu-burst-capacity-accrual.html
- [W6] Amazon ECS, Fargate task ephemeral storage: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-task-storage.html
- [W7] AWS Lambda quotas: https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html
- [W8] Amazon S3, Download and upload objects with presigned URLs: https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html
- [W9] Amazon S3, Public access and defaults: https://docs.aws.amazon.com/AmazonS3/latest/userguide/granting-public-access.html
- [W10] Amazon EC2, Configure Instance Metadata Service options: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-options.html
- [W11] Amazon EBS, How encryption works: https://docs.aws.amazon.com/ebs/latest/userguide/how-ebs-encryption-works.html
- [W12] AWS Cost Management, Managing costs with AWS Budgets: https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html
- [W13] AWS Account Management, Create a spend limit in AWS Settings: https://docs.aws.amazon.com/accounts/latest/reference/create-spend-limit.html

- [W14] AWS Cloud Value Framework example, rate explicitly dated 4 May 2024: https://aws.amazon.com/blogs/migration-and-modernization/unleashing-the-power-of-the-cloud-with-the-aws-cloud-value-framework-cvf-cost-savings-2-7/
- [W15] AWS gp3 regional example (use the per-GB-month rate, not its prorated volume-retention assumption): https://docs.aws.amazon.com/solutions/latest/cloud-migration-factory-on-aws/cost.html ; current EBS pricing: https://aws.amazon.com/ebs/pricing/
- [W16] Amazon VPC, public IPv4 pricing: https://aws.amazon.com/vpc/pricing/
- [W17] Amazon Lightsail, instance bundles: https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-bundles.html

Topology, capacities, workflow, tradeoff judgments and acceptance cases are project proposals. AWS documentation establishes service behavior, not this app's source compatibility, measured performance, available account features or deployment readiness. No AWS account was inspected, no resource was created and no money was spent for this planning work.
