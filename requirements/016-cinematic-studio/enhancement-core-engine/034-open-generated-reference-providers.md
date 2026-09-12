# Open Generated Reference Providers

Status: implemented; focused offline checks passed. Live provider UAT pending.
Supersedes the Seedream-only selection and
30-day local-source restrictions in 031 and earlier generated Cast/Look imports.
Primary: Product Requirement Architect. Sequential Backend/security and QA review;
no independent review claimed. Skills: generation-workflow, media-pipeline, QA.

## Scope And Rules

Open generated Storyboard and Look Sheet source providers across Playground and
Cinematic. Image generation continues using all configured capable image models;
do not add providers that have no adapter or bypass actual reference-count, format,
dimension, credentials or price constraints. Keep category filtering for Looks.

One server configuration, `server/config/generated-reference-policy.json`, defaults
to allowing all source providers. `blockedSources` entries match providerId and/or
modelId (omitted fields mean any). Blocks apply globally to generated media reuse,
not deletion or creating the original image. JSON edits take effect after restart.
allowAnyProvider=false restricts source providers to the legacy Seedream family,
but never reinstates image-age expiry.

Open mode uses authorized local originals for other providers or absent URLs.
Valid Seedream URLs remain preferred, with verified local originals when their
signed URL expires or becomes unavailable. Never label local
images as provider-trusted or manufacture provenance/expiry. Ownership, image
decoding, byte hash, category, Cast mapping and immutable approval remain required.
Quotes and submission revalidate source policy; denied sources fail before reserve.
Existing .env actual first_frame switch remains unchanged; sketches use composition.
Errors retain attachments and never auto-retry, auto-generate or auto-remove.

## Ordered Tasks

1. Done: validated source-policy JSON/helper and edit examples/rollback.
2. Done: extend existing generated-source list/prepare/resolve facade with owned local
   sources; filter before pagination; preserve bounded lists and strict mode.
3. Done: apply policy to video reference validation and public catalog; preserve Asset
   authority, model constraints and Credit lifecycle. No new dispatch/polling path.
4. Done: accept nullable legacy expiry in generated Cast/UI, remove Seedream-only messages and
   obsolete Storyboard compatibility warning for sketches. Keep existing layout.
5. Passed: focused policy/source, mocked quote-submit, picker and type checks only. No paid
   generation, live data mutation, full suite or worker restart.

## Acceptance And Manual Pilot

OpenAI and another non-Seedream Look appear and can be selected without expiry;
ordinary scene images remain excluded from Look picker. Sketch approval from any
image provider is usable as composition. Source hashes/names/count/order match at
quote and submit. Denied provider/model, foreign/deleted image, altered bytes and
unsupported MIME/count fail. Strict policy restores prior rules. Rejections retain
selection. Provider acceptance/visual quality remains user-controlled Playground UAT.

Example blockedSources: [{"providerId":"openai","modelId":"gpt-image-2"}].
To block all outputs of a provider use [{"providerId":"openai"}]. Empty [] opens
all. Use actual IDs from History/catalog, not display labels. No new data directory,
DB migration or backfill. Old generated Cast expiry is ignored; server still
revalidates its owned source before use.

## Image-Age Cleanup (Latest User Addition)

Remove the 30-day limit, timestamp eligibility checks, countdowns and expiry labels.
Delete unused maximumAgeDays config/schema fields and obsolete fallback flags.
Keep generatedAt as historical evidence, not an eligibility gate. Existing API
expiresAt/validUntil fields are nullable compatibility data, not enforced limits;
new responses set null. Do not rewrite live records just to remove old fields.
Signed provider URL expiry remains a transport concern and uses verified local
bytes; do not extend or forge signed URLs. Quote/Credit/authorization-token expiry
and provider task expiry are unrelated and remain intact.

Muse now permits reference-free scene/character-sheet generation on existing
Playground/Studio/Cinematic surfaces. Its actual no-image-reference capability
remains enforced. This supersedes its former headshot-only product exposure,
without enabling Fashion or introducing another adapter.

## Verification And Rollout

### Approval Recovery Follow-up

Primary: Backend Platform Architect; sequential security/QA review (not independent).
Observed: completed owned Job and local output exist, but History lacks the row;
the current Queue swallows History write errors. The specific runtime write error
has not been recovered from logs. Do not regenerate or modify live data to repair it.

1. Add an explicit Generation result read for Storyboard approval: History first,
   otherwise an owner-matched completed Cinematic scene child in durable Groups.
   Never infer ownership from a filename or accept client-provided result metadata.
2. Asset approval uses that read, retaining local path, bytes, hash and immutable
   adoption checks. Missing, foreign, pending, refunded or non-Cinematic children
   fail. Existing History is authoritative, including wrong-owner rejection.
3. Preserve server-authored style/provenance in future durable child results.
   Legacy results without style remain unclassified; never relabel them as sketches.
   No Credit/dispatch change, extra polling, new data path or expiry restriction.
4. Focused offline tests: recovery, authorization, terminal eligibility, metadata,
   missing file and existing approval regressions. No paid generation or worker restart.

Status: recovery implemented; `node scripts/test-generated-cast-sheets.mjs approval-recovery`
passed 10 tests. Read-only adoption of job_1789210864340_3sk5ox8kl using the updated
service found its durable group, loaded original bytes and calculated its hash;
Asset creation was replaced with an in-memory stub, so no live state was changed.
`git diff --check` passed. Sequential security/QA review preserved foreign-owner,
terminal-state, path and byte checks. No UI layout changed; browser mutation UAT
remains pending after server reload.

User retries Approve on the existing result after loading the updated server.
Broader History persistence repair remains an explicit gap; this change restores
approval from independently durable evidence. This existing result has no stored
sketch-style metadata, so approval does not assert sketch/video qualification.
Future completed Group results now retain the server-authored style/provenance.

Owning runner: `scripts/test-generated-cast-sheets.mjs`. Short commands:

```powershell
node scripts/test-generated-cast-sheets.mjs open-sources
node scripts/test-generated-cast-sheets.mjs source-regression
node scripts/test-generated-cast-sheets.mjs open-picker
node scripts/test-generated-cast-sheets.mjs types
node --test --test-name-pattern="Muse surface and mode" test/metaMuseProvider.test.js
node --test test/cinematicSketchProduction.test.js test/cinematicStoryboardAssetService.test.js
```

Passed: seven open-source checks (including selected-destination mocked dispatch,
deny rules, foreign owner, bytes, no invented provenance, no age and strict-source
rollback); source regression group (23 before final two additive checks); 18 UI
checks; nine sketch/Asset checks; Muse exposure check; TypeScript. git diff --check
passes (pre-existing CRLF warnings only). No paid generation or live data writes.

Browser fixture: `CAST_SHEETS_WEB_ORIGIN=http://127.0.0.1:6501` and
`node scripts/verify-generated-cast-sheets.mjs`, with Vite and Playwright installed.
Passed EN/TH at 390/820/1440: OpenAI Cast selection/save/replacement, image contain,
category exclusion, no horizontal overflow, loading/empty/error states. Screenshots
in temporary `mpf-direct-cast-GZ0vcE`. All API calls are mocked and local only.
Existing runner `all` remains explicit opt-in and fail-fast; not executed here.

Security review: the tool reviewer initially stopped part of a patch. Read-only
tracing and isolated tests established owner/hash validation, registered adapter
selection, quote parity and reserve-before-dispatch. No new destination, background
transmission or automatic paid action. Remaining UI cleanup applied after this
evidence; review was sequential, not independent. References are sent only to the
provider/model explicitly selected when the user submits Generate.

Restart backend/rebuild web through `scripts/start-dev.bat` when active work permits.
Reselect a saved source once if its old policy version is cached; no regeneration
is required while the original local file is available. Config changes do not
delete images or cancel already accepted tasks. User performs one Playground trial
per intended target model, then adds failed source providers/models to blockedSources.
