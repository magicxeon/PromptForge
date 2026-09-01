# Character Look Sheet Generation, Credit And Job Lifecycle

**Requirement ID:** `016-CLSG-003`  
**Priority:** P0  
**Status:** Implemented through canonical Generation; live settlement evidence pending

## 1. Canonical Lifecycle

```text
CharacterLookDialog command
-> Character Look source-context authorization
-> Generation exact estimate
-> explicit user confirmation
-> Credit reservation
-> idempotent Queue acceptance
-> provider dispatch and canonical polling
-> durable generated Asset
-> Credit capture or eligible refund
-> user review (free)
-> immutable Look approval (free)
-> optional Cinematic binding (free)
```

Generation owns dispatch and Job state. Credits owns all financial mutation.
Character Profiles owns source validation and adoption into a Look Version.

## 2. Estimate And Consent

The confirmation displays:

- provider and model;
- output dimensions and one-output count;
- effective reference count and bounded source summary;
- estimated Credits and pricing policy/version;
- the fact that approval/binding does not charge again.

Changing provider, model, source Look Version, Character Version, dimensions,
recipe or reference plan invalidates the estimate. Client-supplied price is
never authoritative.

## 3. Idempotency And Settlement

- One user confirmation creates one idempotency key scoped to actor, Character,
  Look Version and immutable estimate.
- Reservation succeeds before Queue visibility/provider dispatch.
- Repeated submit returns the same accepted Job and never reserves twice.
- Success captures once; pre-acceptance failure creates no active Job; eligible
  terminal failure refunds once.
- A completed but human-rejected image remains a paid attempt. Rejection is not
  a provider failure and does not create an automatic refund.
- Retry requires a fresh estimate unless the canonical estimate contract is
  still valid.

## 4. Durable Job And Recovery

- Use the existing Generation Job Center and canonical polling owner.
- Leaving/reloading Cast or Character Profile does not lose the active Job.
- Returning to the same actor/Look resumes the active or completed result.
- Terminal state stops polling and animation.
- Historical attempts remain visible after a new attempt is generated or an
  approved Look Version supersedes an older one.
- Actor switching clears actor-owned query/draft state and cannot expose the
  previous actor's Job or media.

## 5. Lineage

Persist stable IDs/fingerprints only:

- actor, Character Profile/Version and Character Look/Version IDs;
- estimate, pricing, reservation, Job and settlement IDs;
- recipe and reference-plan fingerprints;
- provider/model and normalized output contract;
- generated Asset/result ID;
- review decision and approved Look Version ID when applicable.

Do not persist Base64, signed provider URLs or raw private prompts in client
storage or ordinary logs.

## 6. Implementation Steps

1. Extend the canonical Generation mode registry and estimate schema with
   `character_look_sheet`.
2. Add server-side source-context resolution through Character Profiles and
   Reference Processing public contracts.
3. Wire estimate -> reservation -> enqueue through
   `GenerationApplicationService`; do not add another Queue path.
4. Project the Job through existing Job Center/history contracts.
5. Add terminal Asset adoption and Character Look lineage without auto-approval.
6. Add replay, duplicate-submit, insufficient-Credit, pre-acceptance failure,
   provider failure, refund and restart regressions.

Compatibility decision: `character_look_sheet` is carried by the authorized
Character Look plan and persisted lineage. Runtime dispatch uses the existing
`character-sheet` mode and existing exact estimate contract. No second runtime
mode, reservation service, Queue or poller is introduced.

## 7. Release Gate

The UI may render a truthful qualification state before this lifecycle is
enabled. It must not display an invented Credit amount or enable submission
until server pricing and at least one qualified provider/model are published.
