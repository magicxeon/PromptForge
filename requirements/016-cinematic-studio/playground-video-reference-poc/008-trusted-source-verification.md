# 008 Trusted Source Verification

Date: 2026-09-07. Implementation and deterministic verification passed;
real-provider acceptance, visual quality and paid POC remain pending.
Backend, security, financial and QA review applied sequentially by the same
agent; this is not an independent release sign-off.

## Requirement Traceability

| Requirement | Implementation and evidence |
| --- | --- |
| 005 Original capture | ModelArkSeedreamProvider requests URL for eligible Seedream 5.0 Lite/Pro T2I and I2I; QueueManager persists unchanged image bytes, then privately captures provenance through Generation before existing settlement. Adapter/capture tests prove URL, bytes, provider timestamp, mode and actual reference count. Invalid/missing timestamp never becomes a trusted age. |
| 005 Privacy and ownership | Private Generation repository, whitelist projection, safe local preview URL, owner-scoped cursor listing. Domain and route tests reject foreign selection and ignore client-supplied owner/limit. Original URL is absent from public metadata/list/task DTO. |
| 006 Policy enforcement | Real catalog tests cover every restricted Seedance model; legacy plans, URL/upload, Character IDs, mixed roles and duplicate images fail before pricing/reservation. Cinematic and other-model tests retain previous contracts. |
| 006 Exact transport | Stubbed quote/submit uses exact original provider URLs, one first_frame with no ratio, or scene then Look as two reference_image inputs; reference counts agree with Credits. No trusted-path GCS/Base64 fallback. |
| 006 Revalidation | Expiry/account/mode/model/hash checks at prepare and URL resolution, including expiry during verification. Bounded download verifies original hash. Per correction 015, provider rejection is retained as evidence only and never hides or blocks source reuse. |
| 007 Picker | Only Choose generated image and Remove in restricted models. Separate safe draft fields, no hidden Character/upload submission. API error/retry, disabled expired/duplicate sources, Escape, original previews and first-frame mode switching verified. |
| 007 Protected behavior | Existing CharacterLibraryPicker, unrestricted source controls, Engine panel, model selection, Cinematic reference contract, provider task lifecycle, Credits and original transport regression tests pass. |

## Focused Commands

Run from the repository root. Each group runs independently; no live paid request.

```powershell
node scripts/test-playground-video-references.mjs trusted
node scripts/test-playground-video-references.mjs contract
node scripts/test-playground-video-references.mjs regression
node scripts/test-playground-video-references.mjs ui
node scripts/test-playground-video-references.mjs types
node scripts/validate-i18n-catalogs.js
```

Baseline results before amendment 009: trusted 19, contract 17, regression 59,
UI 25 = 120 tests passed. Amendment 009 evidence is recorded in its own file.
TypeScript and scoped ESLint passed. EN/TH catalogs passed validation.
An existing VideoEngineTargetPanel unit test logs a mocked-i18n initialization
warning; it passes and browser verification uses real translations.

Optional pre-UAT aggregate (only these isolated groups, not the whole system):

```powershell
node scripts/test-playground-video-references.mjs all
```

Visual scripts require the Vite dev server at 127.0.0.1:5173. They intercept APIs
and use local bitmap fixtures; they do not contact the paid generation provider.

```powershell
node scripts/test-playground-video-references.mjs layout-trusted
node scripts/test-playground-video-references.mjs layout
```

Both passed EN/TH at 390, 820 and 1440px: 12 viewport/locale checks total.
Trusted modal selection, loaded images, no horizontal overflow/clipped controls
and no untranslated reference labels verified. Modal screenshots were visually
inspected on mobile, tablet and desktop. Synthetic fixtures are not qualification
or real billing evidence.
Artifacts in local temporary directories:

- `C:/Users/punya/AppData/Local/Temp/mpf-video-references-layout-88ylyd`
- `C:/Users/punya/AppData/Local/Temp/mpf-video-references-layout-YkiRju`

## Performance And Data Boundaries

No speculative cache or new polling loop. Source list is 24 history records per
cursor page; the JSON repositories still read their underlying collections.
Query keys include actor and cursor, staleTime 0, enabled only while the picker
is open. Actor/model remount clears modal state; terminal tasks invalidate source
queries. Browser snapshots contain safe preview/IDs, never provider signed URLs
or Base64. Expiry is authoritative at server quote and submission.

New URL verification is GET, HTTPS allowlisted provider hosts, no redirect,
12-second timeout and 30MB maximum per reference, with streamed hashing.
At most two references are verified sequentially. Compared with the old source
path this adds up to 24 seconds of URL verification per quote/submit, in addition
to local reads and provider/credit work. Successful mocked trusted tests completed
in under one second for the group; that is not a real-network latency baseline.
Repeated quote requests can repeat this bounded I/O. Measure actual POC latency
before adding a canonical cache or further tuning. PostgreSQL/index work and
retention cleanup remain separate future ownership work.

The new private JSON file is created lazily at successful ModelArk image capture;
tests use temporary repositories, not the live data store. No live user data,
provider configuration, pricing or active jobs were changed by the tests.

## User-Run POC

1. Restart the existing backend when safe and refresh Playground. Development
   model availability and Credit controls remain unchanged.
2. Generate a new image with Seedream 5.0 Lite or Pro, first without image
   references and then with an image reference. The POC policy admits both but
   does not claim provider qualification.
3. Switch to Playground Video, select Seedance 2.0/2.5 and First Frame mode.
   Choose generated image; confirm source model, generated date and expiry.
4. Review the actual quote before generating one clip. Inspect accepted provider
   task ID, progress and completed preview, or the surfaced provider error.
5. For the pair POC, choose Character/reference mode, then two eligible generated
   originals: scene first, generated Look second. Review the changed quote.

Legacy images without private original URL/time/mode evidence remain disabled;
there is no fabricated backfill or automatic regeneration. Thirty days describes
the trust window from generation, not a promise that a temporary URL remains
downloadable. No TOS/Asset Library provisioning or alternate transport is forced.
This route does not guarantee provider moderation acceptance or identity
preservation. Real BytePlus rejection remains pending
support/POC evidence; do not reopen or automatically resubmit blocked sources.

No production build, real backend worker startup, real upload or billable
generation was performed in this verification. Existing full Queue-to-provider
execution must still be observed in the user-run POC.
