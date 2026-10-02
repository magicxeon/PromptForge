# 003 Cinematic API Connections

Scope: thin routes and Cinematic source/context ownership. Dependency: 002.

1. Add project writing quote and operation-recovery contracts.
2. Route Characters, outline, Chapters, Scenes, Shots, Environment, Wardrobe,
   legacy Story Plan (including SSE) and Scene Direction through the canonical
   paid use-case facade. Reject unquoted SSE requests before response headers.
3. Connect new-project Brief enhancement through the same Generation/Credit owner.
4. Preserve free Full Story generation/revision and returned Characters.
5. Bind source Project/canonical Series Full Story root versions, sibling version
   and active revision IDs, continuity, scene/character and request input. Recheck
   after reservation and after each authoring context snapshot is prepared, before
   provider dispatch; stale context refunds without an AI call.
6. Validate missing/stale/foreign quote failures before provider invocation.
7. Legacy Story Plan quotes include configured repair-call output allowances.
   Paid legacy execution must not switch to an unpriced fallback provider;
   non-billable/direct helper behavior retains its existing fallback policy.

Checks: focused routing tests and unchanged Full Story/Character DTO parsing.
Legacy internal authoring helpers are reused, not alternate public billing routes.
Live generation is deliberately excluded from automated tests.

Evidence: text15, legacy22 and48 neighboring authoring/Series tests passed.
Independent QA verified canonical root/sibling revision binding, source changes
during reservation/context reads, repair-budget fingerprints and paid/direct
fallback boundaries. No additional provider pipeline or runtime path was added.
