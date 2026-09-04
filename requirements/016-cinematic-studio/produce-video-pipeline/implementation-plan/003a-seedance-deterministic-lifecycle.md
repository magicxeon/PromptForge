# Package 003A - Seedance Deterministic Lifecycle

**Plan ID:** `016-PVP-IP-003A`  
**Status:** Deterministic implementation complete; live qualification pending  
**Parent:** `003-seedance-first-frame-vertical-slice.md`  
**Scope:** Deterministic implementation only; no paid/live provider request

## 1. Why This Subplan Exists

The existing code already has a ModelArk adapter, durable provider-task store,
video Asset copy and poster extraction. The remaining work crosses Generation,
Credits, Assets, startup recovery and Cinematic approval, so it is split here
before source changes. This avoids creating a second provider path or claiming
live qualification from mocked evidence.

Official BytePlus documentation checked on 2026-09-04 confirms that Seedance
1.0 Pro Fast supports asynchronous first-frame image-to-video, 480p/720p/1080p,
2-12 second MP4 output at 24 fps, and completion-token billing. Account
entitlement and actual response behavior still require a live qualification
run.

## 2. Ordered Implementation

### 003A.1 Local preflight before Credits

1. Add a provider-adapter preflight contract that performs no provider call.
2. Validate configured credential, HTTPS endpoint, supported Seedance model and
   transport before quote and again before reservation.
3. For Cinematic first-frame requests, validate the referenced Asset belongs to
   the actor, is current, readable, an image, within configured size/dimension
   limits and compatible with the selected aspect ratio.
4. Return stable Generation/Cinematic error codes without prompt, Base64 or
   signed URL data.

### 003A.2 No-user-Credit qualification authorization

1. Keep provider-cost evidence in the server-owned estimate.
2. For internal Cinematic requests using a research-only, testing-enabled,
   paid-disabled model, issue a deterministic no-charge authorization instead
   of reserving user Credits.
3. Persist the estimate and authorization IDs on the provider task and attempt.
4. Leave ordinary Playground and every paid-capable route on the existing
   reserve/capture/refund path.

### 003A.3 Durable task recovery and settlement

1. Resume only persisted tasks and poll the original provider task ID.
2. Move ambiguous pre-submit records without a provider task ID to
   reconciliation rather than risking duplicate provider submission.
3. Isolate per-task recovery failures so one bad task cannot stop all recovery.
4. Reuse one terminal-settlement function for browser polling and startup
   recovery.
5. Register recovery after orphan-reservation reconciliation during server
   startup.

### 003A.4 Durable technical media evidence

1. Add one Assets-owned ffprobe service using structured process arguments.
2. Normalize container, video codec, dimensions, frame rate, duration, audio
   presence and probe version; never persist raw ffprobe output.
3. Persist the owner-scoped video Asset before derivative/probe repair so
   provider success is not lost.
4. Make probe and poster repair idempotent against the same source Job.
5. Keep failed/corrupt media in reconciliation with a safe error and partial
   Asset lineage.

### 003A.5 Cinematic review and approval gate

1. Project the probe summary through the typed Generation task contract.
2. Treat `captured` and `qualification_no_charge` as settled states; no other
   state may be approved.
3. Require a passing technical probe and current packet/source fingerprints.
4. Keep all existing Storyboard, Playground Video and paid Credit behavior
   unchanged.

## 3. Deterministic Verification

- Seedance request/preflight/status/error/usage tests.
- known preflight failures occur before Credit reservation;
- qualification quote/submit does not mutate balance and retains provider-cost
  evidence;
- restart resumes the original provider task and settles once;
- ambiguous pre-submit records reconcile without resubmission;
- valid, corrupt and retryable probe/poster paths retain Asset lineage;
- Cinematic approval accepts passing no-charge qualification output and rejects
  failed/missing probe evidence;
- protected video capability, Playground, Cinematic, Credits and Asset suites;
- JSON parse, production Web build and `git diff --check`.

## 4. Stop Gate

After deterministic verification, Package 003 remains open until the three
live, rights-cleared qualification runs in `../004-seedance-activation-and-qualification.md`
are explicitly authorized and recorded. Do not start Package 004 and do not
enable paid routing before that gate passes.

## 5. Deterministic Outcome - 2026-09-04

- provider/model/reference preflight now runs before any Credit authorization;
- internal research-only Cinematic requests receive a persisted no-charge
  qualification authorization while preserving provider-cost evidence;
- provider tasks resume by original provider task ID, ambiguous submissions
  enter reconciliation and terminal settlement is idempotent;
- copied clips retain owner-scoped Asset lineage and require a passing bounded
  ffprobe summary before Cinematic approval;
- quote, reservation or qualification authorization, task, attempt, settlement
  and technical-probe fields are projected through the sanitized lineage read
  model;
- ordinary paid and Playground behavior remains on the existing lifecycle;
- Produce remains responsive and usable at 390px, 820px and 1440px with no
  document-level horizontal overflow.

Automated deterministic tests and the Web production build pass. No live
provider request was made, no customer Credit was charged and paid Seedance
routing remains disabled.
