# 005 Admin Profit Configuration

Scope: existing pricing configuration revision/publication. Dependency: 001.

1. Expose text/image/video markup percentages with clear cost-plus semantics.
2. Default each to 30%; validate bounded numeric values on server and UI.
3. Use existing Admin authorization, version conflict protection and audit trail.
4. Refresh policy cache only for new quotes; never mutate accepted snapshots.
5. Preserve qualified fixed image tariffs until a documented cost-based tariff
   replaces them; percentage settings alone do not prove every image margin.
6. Connect new measured OpenAI image and paid Look Sheet text quotes to category
   markup. Existing immutable quotes and legacy policies without category markup
   retain their original semantics. Test both active markup changes and fixed
   image exceptions; no live historical quote rewrite.

Checks: authorization, malformed percentage, conflict, publication and cache tests.

Evidence: Admin22, tariff31 and scoped Admin UI17 passed. Independent QA verified
new cost-based quotes use the category override while fixed/historical quotes do
not change. TH/EN390/820/1440 checks passed with intercepted API responses only.
Publication keeps its existing explicit development/test enable flag and
production identity/transactional-storage gates; default billing does not depend
on publishing a new Admin revision.
