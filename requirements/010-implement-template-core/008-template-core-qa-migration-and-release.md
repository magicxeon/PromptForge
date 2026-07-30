# 008 Template Core QA, Migration and Release

## Migration

- Existing Community posts with embedded `sceneTemplateSnapshot` remain usable.
- A compatibility adapter can materialize a legacy Template Definition/Version
  on first use or by migration script.
- New posts use `templateId` and `templateVersionId`.
- Do not delete embedded legacy snapshots until observation and rollback gates
  pass.

## Automated Coverage

```text
contract/schema
repository ownership and versioning
serializer round-trip
public sanitization
publish validation
use session resolution
locked/required replacement policy
credit estimate and reservation parity
lineage/remix idempotency
Community/Profile discovery
Scene quick use
Fashion single and bulk binding
```

## E2E Actors

1. Creator authors and publishes a hidden Guided Template.
2. Viewer discovers it in Community.
3. Viewer replaces Character and Outfit.
4. Viewer sees AI and Template credit breakdown.
5. Viewer generates without receiving hidden prompt text.
6. Result records creator/version attribution.
7. Creator sees incremented successful use.

Also test owner use, private/unlisted, archived, insufficient credits, provider
incompatibility, expired Use Session and generation refund.

## Release Gates

- no raw hidden prompt in browser/API/log
- no private reference pointer in public DTO
- published version immutable
- actor switch clears Template Use Session
- estimate matches reservation
- legacy Template still works
- responsive visual verification at desktop and mobile
- all i18n catalogs have key parity

## Implementation Validation Record

Completed:

- React TypeScript check
- React production build
- Template serializer and API schema tests
- Template repository, immutable version, pinned session and archive tests
- public reference sanitization tests
- Community share compatibility tests
- generation/comparison credit tests
- Fashion single/bulk planning and reservation tests
- localization catalog parity
- route smoke checks for Community, Scene Builder, Fashion and Template API

Manual acceptance still required:

- inspect creator publish dialog at desktop and mobile widths
- publish one Guided hidden-prompt Template from an actual generated result
- switch actor and complete one Scene use plus one Fashion single-item use
- confirm the combined AI + Template credit breakdown in the browser
