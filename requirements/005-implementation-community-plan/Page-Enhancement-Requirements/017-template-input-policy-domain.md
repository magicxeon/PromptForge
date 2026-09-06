# Template Input Policy Domain

Owner: Templates via TemplateCoreService; publication via CommunityShareService.
Status: Implemented; focused verification passed. Parent: 016.

- One server policy derives source capabilities from original replaceable fields
  and reference slots, not client-provided arbitrary field names/defaults/URLs.
- Inputs: outfit front required, outfit back optional, Character optional.
  Reject unsupported options and unrecognized policy properties. No face fallback
  satisfies an exposed Character input; existing unmodified legacy sessions keep
  their existing contract.
- Draft and owner settings DTOs contain capability booleans and enabled choices,
  no hidden prompts or private source URLs. Owner reads and writes check actor.
- Edit compares the expected current version. Stale/conflicting saves report
  409, preserve existing published work and do not dispatch providers.
- Changed schema publishes an immutable version, updates the Community post
  version pointer/public projection and invalidates affected read caches.
  No-op schema saves do not create another version. Existing settings-only edit
  behavior remains compatible.
- Existing session IDs pin old versions and pricing. New use sessions consume
  the new schema. Community-owned references are updated through owning facades.
- Pose preparation inheritance requires equal execution snapshot and preview,
  same template and owner, and active/policy-valid original preparation. Never
  treat an unprepared or changed source as qualified. No paid operation on save.
- Preserve original baseline/reference compiler and ownership checks. Do not
  clone private image data or add extra user references for Template preview.

Tests: allowed/forbidden/required inputs, source capability, owner denial,
immutable old version/session/price, stale save, no-op retry, projection pointer,
active proxy inheritance and changed-source rejection. Temporary stores only.
Cross-file JSON stores are not a database transaction: document recovery risk;
do not introduce a parallel persistence system for this change.

Verification: policy/Core/proxy/Share group 16/16; ownership/community/baseline
compatibility group 5/5. Independent QA recheck passed cross-owner access,
obsolete-version session rejection, overlapping saves and partial-save retry.
Existing sessions remain pinned. Identical retries can recover an interrupted
post projection update; changed or stale retries fail and require reload.
Serialization is process-local; repository compare-and-set rejects stale writes.
This does not make multi-file JSON writes transactional.
