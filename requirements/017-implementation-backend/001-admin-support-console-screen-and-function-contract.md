# Admin And Support Console Screen And Function Contract

**Owner:** Admin and Support React features
**Primary role:** UX/UI Product Designer
**Reviewers:** Backend Platform Architect, QA And Release Engineer
**Skill:** `review-product-ux`

## 1. Routes

```text
/admin                         operational overview
/admin/users                   user search/list
/admin/users/:userId           customer 360
/support/cases                 case inbox
/support/cases/:caseId         case workspace
/support/lookup                trace lookup
/admin/finance                 reconciliation queues
/admin/audit                   staff audit search
/admin/community               existing moderation surface
/admin/content                 Template and media moderation search
```

Routes are hidden and server-protected by capability permission. A hidden link
is not authorization.

## 2. Navigation

Admin/Support uses the existing `AppShell`, route registry, breadcrumbs and
theme. Add one role-aware `Operations` navigation group; do not add a second
admin shell.

- Overview
- Users
- Support Cases
- Trace Lookup
- Finance (permission-gated)
- Community (moderator-gated)
- Content (moderator/admin-gated)
- Audit (lead/admin-gated)

## 3. Reuse Matrix

| Need | Reuse |
|---|---|
| Layout/navigation | AppShell, Sidebar, breadcrumbs, ContextBackLink |
| Async/empty/error | AsyncState, StatusNotice, Surface |
| Commands | Button, ConfirmDialog, Toast |
| Media | AuthenticatedMediaImage, MediaStage/viewer |
| Generation | QueueStatus and existing status vocabulary |
| Credits | existing ledger/credit formatting and top-up units |
| Lists | one shared paginated data-list/table primitive when introduced |

No Support component may call a domain-specific endpoint without the owning
feature API/schema boundary.

## 4. Overview

Show operational queues, not vanity charts:

- open/aging Support Cases;
- failed/orphaned Generation operations;
- unsettled Credit reservations;
- payment reconciliation failures;
- provider incidents;
- moderation queue;
- recent high-risk staff commands.

Each tile links to a filtered queue and displays data timestamp/staleness. Empty
states say no action is required.

## 5. User Search And Customer 360

Search accepts exact public user ID, username/email where permission allows,
support reference, Job ID, Case ID, payment ID or ledger ID. Partial text search
is bounded and paginated.

Customer 360 sections:

- identity summary, status, roles and session risk;
- Credit available/reserved balance and ledger link;
- payments/subscriptions/entitlements when implemented;
- recent Generation Groups/Jobs and failures;
- Characters, Templates and public/private counts, not all private media;
- open/closed Support Cases;
- audit history relevant to the customer.

Actions are command-specific: suspend/reactivate, revoke sessions, open case.
There is no generic `Edit user` form.

## 6. Case Inbox

Filters:

- status, priority, category, assignee, age/SLA, financial impact;
- provider/model, surface and error code;
- owner/team and created/resolved range.

Rows show safe reference, customer, category, priority, assignee, age, latest
action and financial-impact indicator. Bulk mutation is excluded from MVP.

## 7. Case Workspace

### Header

- case ID/support reference, status, priority, customer and assignee;
- created/updated age and correlation IDs;
- permission-aware command menu.

### Evidence timeline

- customer report and staff notes;
- request/trace events;
- quote, reservation, ledger and payment events;
- Generation/Queue/provider events;
- commands, approvals and outcomes.

Timeline defaults to sanitized summaries. Raw prompt/private media requires a
reasoned reveal action and enhanced audit.

### Diagnosis panel

- expected vs actual lifecycle;
- terminal/non-terminal state;
- financial settlement and mismatch;
- ownership and reference availability;
- recommended allowed commands with risk level.

### Command drawer

1. select a diagnosed allowed action;
2. see immutable target IDs and dry-run impact;
3. enter reason and customer-facing note;
4. attach evidence or reference;
5. confirm idempotency/approval state;
6. execute and monitor owner command;
7. verify reconciliation before resolve.

## 8. Trace Lookup

Input supports request, correlation, Job, Generation Group, Fashion Run, quote,
reservation, ledger, payment, Template and Case IDs. Results render a linked
graph/timeline with explicit `not found`, `expired`, `unauthorized` and
`incomplete trace` states.

Lookup never returns secrets, Base64, raw provider request bodies or private
media URLs.

## 9. Finance Queue

Permission-gated views:

- stale reservations;
- captured charge without durable result;
- result without expected settlement;
- payment webhook pending/conflict;
- refund/adjustment awaiting approval;
- reconciliation mismatch.

Money, Credits, creator liability and platform revenue are separate columns and
units. Never combine them into one balance label.

## 10. Command UX States

Every command exposes:

- permission denied;
- validation/evidence missing;
- dry-run loading/success/conflict;
- approval required/waiting/rejected/expired;
- executing/completed/failed/unknown outcome;
- duplicate/idempotent replay;
- reconciliation passed/failed.

Closing a dialog does not imply completion. Long-running commands remain in the
case timeline and shared queue state.

## 10.1 Template And Media Search

The Content workspace searches beyond public Community posts. Staff can find:

- Templates in draft, preparing, ready, enabled, disabled, retired,
  quarantined, failed-preparation and tombstoned states;
- original generated images, uploaded references, approved derivatives,
  thumbnails, Character featured images and Template pose proxies;
- content by stable ID, owner ID/handle, Job ID, post/Template/Character ID,
  asset ID, checksum, moderation status, visibility, date range and report ID;
- items that no longer appear in customer lists but still exist for evidence,
  support recovery or lineage.

Results use bounded metadata and safe thumbnails. Full-resolution or private
media requires a reasoned reveal action and enhanced Audit. Search must not
silently exclude disabled or quarantined records when a staff filter requests
them.

Template rows keep lifecycle, publication, Fashion-ready/preparation and
moderation status separate. Media rows show original/derivative relationships
so staff can quarantine the correct scope instead of guessing from a URL.

Available commands are explicit: quarantine, restore, disable new reuse,
retire, replace featured media and escalate. There is no generic Delete button.
Every command previews affected posts, Templates, profiles, collections,
thumbnails and reuse entry points before execution.

## 11. Responsive And Accessibility

- Desktop uses list + case workspace; mobile stacks evidence and commands.
- Tables become labeled records, never horizontal clipped text.
- Risk is represented by text/icon/status, not color alone.
- Destructive/high-risk confirmations name the customer, target and effect.
- Keyboard, focus restoration and live async announcements are required.
- EN/TH key parity is required.

## 12. UX Acceptance

- Support can move from a customer report to a linked Case in under three
  primary actions.
- One screen explains technical and financial outcome for a failed billed Job.
- An unauthorized role cannot see or invoke a restricted command.
- No action disappears after modal close; Toast and timeline confirm result.
- Empty, stale, partial, error and approval states are testable.
