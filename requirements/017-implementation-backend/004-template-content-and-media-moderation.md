# Template, Content And Media Moderation

**Status:** Requirement ready for implementation planning
**Owner:** Admin read models with Templates, Assets and Community command owners
**Primary role:** Backend Platform Architect
**Reviewers:** Security, Product UX, QA And Release Engineer
**Skills:** `review-product-ux`, `verify-release-regressions`

## 1. Objective

Authorized staff must be able to locate and contain any inappropriate,
malicious, broken or rights-infringing Template or image even when it is
disabled, private, retired, no longer listed publicly or reachable only through
a derivative URL. The tool coordinates owner commands; it does not create a
parallel Template, Community or Asset lifecycle.

## 2. Search Coverage

### Templates

Search all records and immutable versions, including:

- draft, preparing, ready, enabled, disabled, failed, retired, quarantined and
  tombstoned records;
- reusable and ordinary Community posts;
- Fashion-ready state, pose-proxy status and preparation Job;
- public, unlisted, owner-only and historical visibility;
- source post, owner, version, use sessions and usage events.

Filters include stable Template/post/version ID, title, owner, lifecycle,
moderation status, visibility, readiness, date range, report/reason code and
source Job ID. Disabled content must remain searchable by staff.

### Images And Media

Search Asset records and authorized lineage for:

- generated originals and thumbnails;
- uploaded Face, Character, Outfit, Pose and Style references;
- Community post media and Creator/Profile featured media;
- Template source images and private pose proxies;
- Character canonical faces, three-view references and featured images;
- approved Attribute visuals and deterministic derivatives;
- future video, audio, poster and frame derivatives through the same media
  contract.

Filters include Asset/public-safe ID, source Job/Generation Group ID, owner,
media role/type, MIME type, dimensions, checksum/perceptual hash when available,
visibility, moderation state, created range and linked entity ID.

Filename and free-text search are bounded and normalized. Never scan image
bytes or every object synchronously during a request. Future similarity search
uses a separately approved perceptual-hash/index capability.

## 3. Moderation State

Content moderation is independent from business lifecycle:

```text
unreviewed -> allowed | quarantined | rejected
quarantined -> allowed | rejected
rejected -> allowed only through an audited restore decision
```

Each transition stores actor, role, reason code, notes, Case/report IDs,
expected version, timestamp, policy version and affected scope. The original
record and bytes are retained according to evidence/retention policy; customer
surfaces never infer moderation state from `enabled` alone.

## 4. Containment Semantics

Quarantining media must atomically or recoverably:

1. block public and cross-owner delivery of the original;
2. block every known thumbnail/presentation derivative;
3. remove it from Gallery, profile, Character, Template, Collection and search
   read models;
4. prevent new reuse, generation reference selection and export;
5. mark linked Templates/posts unavailable when they cannot operate safely
   without the media;
6. preserve owner/support evidence access according to policy;
7. invalidate CDN/application caches and signed URLs;
8. enqueue reconciliation for links or derivatives not updated synchronously.

Quarantining a Template blocks new use sessions immediately but does not delete
historical versions, usage events, Credit records or generated customer
outputs. Existing private outputs are handled by their own media decision, not
silently deleted because the source Template changed status.

Restore runs the same impact analysis in reverse. It must not restore content
whose underlying Asset remains quarantined or missing.

## 5. Capability Boundaries

- Admin provides cross-capability search/read models and command preview.
- Community owns public post moderation and feed/search visibility.
- Templates owns Template availability, versions and reuse sessions.
- Assets owns media moderation, derivative lineage and delivery authorization.
- Character Profiles and Collections consume moderation-aware media views; they
  do not override Asset decisions.
- Support Cases link reports, evidence and recovery commands.
- Audit records all sensitive reveals and state changes.

No route writes another capability's repository. Search indexes are projections
and cannot become the authoritative lifecycle source.

## 6. API And Query Requirements

- Cursor pagination with bounded limits and stable sorting.
- Exact-ID lookup before partial text search.
- Explicit `includeDisabled`, lifecycle and moderation filters; no hidden
  public-only predicate in staff repositories.
- Result schemas separate sanitized metadata, safe thumbnail and restricted
  reveal capability.
- Command preview returns affected entity counts, blocking dependencies,
  cache/derivative scope and required approval.
- Mutations require expected version, reason, idempotency key and Case/report
  evidence when policy requires it.
- Bulk containment is deferred unless every item is individually authorized,
  auditable and recoverable.

## 7. Security And Privacy

- Moderator may inspect safe public/sanitized previews and execute configured
  content commands; private raw-media reveal requires elevated permission.
- Support may locate IDs and lineage for a Case but cannot moderate by default.
- Finance roles receive no raw media access from their role alone.
- Normal logs never contain image bytes, Base64, signed URLs, raw prompts or
  local storage paths.
- Every restricted reveal records actor, target, reason, Case and expiry.
- Legal hold overrides normal deletion/retention without making content public.

## 8. Failure And Recovery

- If owner command succeeds but a projection/cache update fails, the item stays
  fail-closed and enters reconciliation.
- Unknown mutation outcomes are looked up by idempotency/operation ID before
  retry.
- Missing derivative records cannot make a quarantined original visible.
- Restore cannot partially publish; unresolved consumers remain hidden and are
  listed in the command result.
- Provider or object-storage outage does not remove moderation evidence.

## 9. Automated Acceptance

- Search returns enabled, disabled, retired and quarantined Templates when the
  corresponding filters are used.
- A public-only user can never use the staff include-disabled contract.
- Exact Asset, Job, post, Template, Character and checksum lookup returns the
  same canonical lineage where authorized.
- Quarantine prevents original, thumbnail and presentation delivery and removes
  all customer-facing placements.
- New Template use sessions and Generation references reject quarantined media.
- Existing Credit, Audit and usage history remains unchanged.
- Restore requires the same or stronger authorization and does not bypass a
  quarantined dependency.
- Concurrent moderation returns version conflict; idempotent replay returns the
  original command result.
- Cache invalidation/reconciliation failures remain fail-closed and observable.
- Cross-role, cross-owner and raw-media reveal tests pass server-side.

## 10. Manual Scenarios

1. Find a disabled Fashion Template by ID and owner, inspect readiness lineage,
   restore it and confirm it becomes usable only after dependencies pass.
2. Report an inappropriate public image, quarantine the original and verify its
   post, profile feature, Template card, thumbnail and direct media URL stop
   serving customer content.
3. Find a private uploaded reference from a support Job ID as Support. Confirm
   metadata is visible but full media remains restricted until an authorized,
   reasoned reveal.
4. Attempt to restore a Template whose source image remains quarantined and
   verify the command is blocked with the dependency identified.
5. Simulate cache invalidation failure and verify customer delivery remains
   blocked while reconciliation is queued.
