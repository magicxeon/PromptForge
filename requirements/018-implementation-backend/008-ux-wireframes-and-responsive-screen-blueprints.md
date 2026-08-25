# Admin And Support UX Wireframes And Responsive Screen Blueprints

**Status:** Low-fidelity UX blueprint ready for implementation planning  
**Owner:** Admin and Support React features  
**Primary role:** UX/UI Product Designer  
**Reviewers:** Product And Requirement Architect, QA And Release Engineer  
**Skill:** `review-product-ux`  
**Implementation in this change:** None

## 1. Outcome

This requirement translates Requirements 017-001 and 017-005 into consistent
low-fidelity layouts before React implementation. The screens optimize repeated
operational work, scanning, comparison and recovery. They are not marketing
dashboards.

Current Momelo shared shell, theme tokens, localization, permission projection,
API contracts and capability ownership remain authoritative over literal
wireframe labels.

## 2. Shared Desktop Frame

```text
+ AppShell ---------------------------------------------------------------+
| Sidebar: Operations | Breadcrumb / Page title       Staff actor / status |
|---------------------+---------------------------------------------------|
| role-aware nav      | freshness / environment / persistent incident     |
|                     | compact toolbar: search, filters, primary action   |
|                     |---------------------------------------------------|
|                     | route workspace                                   |
|                     |                                                   |
|                     | persistent operation / approval / error region     |
+-------------------------------------------------------------------------+
```

Rules:

- content uses full-width structural bands with constrained inner spacing;
- filters target compact `32px` controls; primary commands remain at least
  `40px` high;
- repeated records may use bordered rows/cards with radius at most `8px`;
- do not place cards inside cards or use oversized metrics as decoration;
- data freshness and environment remain visible but subordinate;
- persistent command state remains visible after drawer/dialog close.

## 3. Shared Mobile Frame

```text
+------------------------------------------------+
| Menu | Page title                    Staff menu |
| Breadcrumb / back                              |
| Environment + freshness                        |
| Search                                         |
| Filter button (active count) | Primary action  |
|------------------------------------------------|
| stacked labeled records or workspace sections |
|                                                |
| persistent operation status                   |
+------------------------------------------------+
```

Filters open a bottom sheet/drawer with Apply and Clear. Detail routes replace
desktop split panels. No table requires page-level horizontal scrolling.

## 4. `/admin` Operational Overview

```text
Overview                    Production  Updated 14s ago  [Refresh]
[Open cases 12] [Image/Video 3] [Finance 1] [Content 4]
[Providers 1] [Media/posters 2] [Config drafts 2] [Approvals 1]

Priority queue ------------------------------------------------------------
Severity | Queue / oldest age | Owner | latest event             [Open ->]
High     | Payment reconcile  | Fin   | webhook conflict 18m
High     | Video settlement   | Gen   | provider terminal, reserved 31m
Med      | Poster reconcile   | Asset | durable Video has no poster 8m

Recent high-risk commands -----------------------------------------------
Time | Command | Target | Requester | Approval / outcome
```

Interactions:

- summary opens the exact filtered owner route;
- partial capability failure leaves other queues usable and identifies stale
  counts inline;
- no global `Fix all` action;
- empty state says no operational action is currently required.
- every summary and row opens the exact URL-filtered owner workspace;
- partial data names its failed source and does not hide healthy queues;
- unauthorized queues and counts are omitted server-side.

Dashboard component behavior, current capability coverage and database-ready
projection ownership are defined in Requirement 018-011.

## 5. `/admin/users` User Search

```text
Users
[ Search user, support reference, Job, payment or ledger ID... ] [Search]
[Status] [Role] [Has open case]                            [Clear filters]

Match | User / masked contact | Status | Credits | Open cases | Last activity
Exact | Alice / a***@...       | Active | 98      | 1          | 3m       [>]
```

Interactions:

- search does not execute for empty/malformed input;
- exact ID result appears before partial matches;
- selecting a result navigates to Customer 360;
- no mutation control appears in the list.

## 6. `/admin/users/:userId` Customer 360

```text
< Users   Alice Creator      Active             [Open/View support case]
Public ID | masked contact | roles | session risk

[Summary] [Credits] [Payments] [Generation] [Content] [Cases] [Audit]
-------------------------------------------------------------------------
Selected bounded section

Context actions: [Revoke sessions] [Suspend account]
```

Interactions:

- Summary loads first; other sections fetch on selection;
- tabs preserve URL and Back behavior;
- actions open command Preview, never mutate directly;
- private media defaults to counts/sanitized metadata;
- mobile uses a horizontal scrollable tab list with visible selected state,
  followed by stacked labeled records.

## 7. `/support/cases` Case Inbox

Desktop:

```text
Cases                                      [Create case]
[Status] [Priority] [Assignee] [SLA] [Financial] [More filters]
-------------------------------------------------------------------------
Case list 40%                         | Selected case preview 60%
P1  SC-1042  Payment  18m  Alice     | Header + current diagnosis
P2  SC-1041  Generation  32m Bob     | latest timeline events
...                                    | [Open workspace]
```

Mobile:

```text
Cases [Create]
[Search] [Filters 3]
[P1] SC-1042 Payment
Alice | 18m | Finance impact
Latest: awaiting reconciliation                [Open]
```

Interactions:

- desktop list selection does not lose scroll/filter state;
- mobile row navigates to Case Workspace;
- assignment conflict refreshes current owner while preserving unsaved note;
- SLA state uses text/icon and color.

## 8. `/support/cases/:caseId` Case Workspace

```text
< Cases  SC-1042  Investigating  P1  Alice  Owner: Finance   [Commands]
Linked: req... job... reservation...                 Updated 20s ago
-------------------------------------------------------------------------
Evidence timeline 65%                  | Diagnosis and action 35%
Customer report                        | Expected / actual lifecycle
Request + trace                        | Financial state
Quote / reservation / ledger           | Missing evidence
Job / provider / asset                 | Recommended allowed commands
Staff notes / approvals / outcomes     | [Preview selected command]
-------------------------------------------------------------------------
Persistent operation: waiting approval / executing / reconcile / failed
```

Command drawer:

```text
Command name + risk tier
Immutable target IDs
Current state -> proposed effect
Money | Credits | creator liability | platform adjustment
Dependencies and reversibility
[Reason code] [Reason]
[Evidence links]
[Customer-visible note]
Approval policy / idempotency reference
[Cancel] [Request approval / Execute]
```

Interactions:

- timeline is the primary reading region, not a small sidebar;
- command drawer cannot hide an unresolved operation after close;
- invalid submit focuses first field and shows an error summary;
- stale dry-run/version offers Refresh Preview while preserving reason/note;
- mobile orders Header, Diagnosis, Commands, Timeline and persistent status,
  with anchors for quick navigation.

## 9. `/support/lookup` Trace Lookup

```text
Trace lookup
[ Paste one request, correlation, Job, run, quote, ledger, payment,
  Template, Asset or Case ID... ] [Lookup]

Detected: Job ID   Status: partial trace           [Open case] [Link case]
-------------------------------------------------------------------------
10:01 Request received
10:01 Quote -> Reservation
10:02 Queue -> Provider dispatch
10:03 Provider failure
10:03 Credit refund pending
Missing: durable refund event                      [View relationship graph]
```

Interactions:

- one input and one clear primary action;
- timeline is default; graph is progressive detail;
- malformed, not found, expired, partial and unauthorized are distinct;
- restricted node explains access limitation without leaking data.

## 10. `/admin/finance` Finance Queue

```text
Finance reconciliation                            Updated 8s ago
[Stale reservations] [Captured/no result] [Result/no capture]
[Webhook conflict] [Refund approval] [Mismatch]
[Date] [State] [Provider] [Amount band]
-------------------------------------------------------------------------
Reference | Customer | Money | Credits | Creator | Platform | Age | State [>]

Selected reconciliation detail
Original transaction -> current projection -> proposed correction
[Open linked case] [Preview allowed command]
```

Interactions:

- units are always separate columns/rows;
- financial detail never uses client-calculated authoritative totals;
- missing Case/evidence/approval appears as prerequisite, not generic disabled
  button;
- mobile uses one labeled financial record per item.

## 11. `/admin/audit` Audit Search

```text
Audit
[Actor] [Case] [Target] [Action] [Risk] [Date range] [Search]
-------------------------------------------------------------------------
Time | Actor/role | Action | Target | Case | Correlation | Outcome [Details]
```

Detail is read-only and displays reason, authorization decision, immutable
references and safe before/after summary. Export remains absent until its
permission, attribution and retention contract is implemented.

## 12. `/admin/community` Community Moderation

Reuse the current moderation workspace but align it to:

```text
Reported content list | safe preview + report evidence | command preview
```

Public post action stays Community-owned. A linked Asset/Template issue opens
Content with the relevant exact ID and Case context rather than duplicating
containment controls.

## 13. `/admin/content` Content Management

```text
Content
[Templates] [Media]
[ Search exact ID, owner, Job, checksum... ] [Search]
[Lifecycle] [Moderation] [Visibility] [Readiness] [Date] [Include disabled]
-------------------------------------------------------------------------
Results 38%                           | Selected detail 62%
safe thumbnail / type / stable ID     | Safe preview or restricted notice
owner / lifecycle / moderation        | Lifecycle + moderation + readiness
linked entities count                 | Lineage / placements / dependencies
                                      | [Preview allowed command]
```

Media lineage detail:

```text
Original Asset
  -> thumbnail derivatives
  -> Community post
  -> Profile / Character feature
  -> Template / pose proxy / reuse entries
  -> Collections
```

Interactions:

- disabled/quarantined/tombstoned items remain searchable when requested;
- full private media requires reasoned reveal and enhanced Audit;
- Quarantine/Restore Preview names every affected surface and cache scope;
- unknown propagation remains fail-closed with persistent reconciliation;
- there is no generic Delete button.

## 13.1 Current Operations Workspaces

The following routes reuse the shared desktop/mobile frame, filter bar, list,
status, entity-link, evidence and persistent-operation contracts from
Requirement 018-011:

```text
/admin/operations     Image/Video Job and Credit settlement detail
/admin/providers      provider/model health and qualification
/admin/cinematic      Project/Scene/Shot/attempt lineage
/admin/assets         original/poster/derivative reconciliation
/admin/attributes     Attribute Catalog authoring and category release
/admin/configuration  capability/rate-card revision and publication
/admin/approvals      independent approval queue
```

Each keeps its domain-specific detail and commands. Sharing the frame must not
produce one generic edit form or move business rules into React components.

## 14. Shared State Blueprints

### Loading

Preserve list/detail dimensions with shared loading treatment. Do not blank the
entire shell or shift toolbars.

### Empty

- no queue work: positive operational empty state;
- no filter match: show active filters and `Clear filters`;
- no linked evidence: explain what ID/evidence is expected.

### Error

Show stable support reference, retry only when safe, and preserve input/filter
state. Command failures remain in the persistent operation region.

### Permission

Hide routes/actions without capability. Direct unauthorized navigation renders
a clear access state without revealing target existence or metadata.

### Stale And Conflict

Show current versus submitted version, require a refreshed Preview for material
commands and preserve staff-authored reason/note drafts.

### Notification

Toast acknowledges a short event; timeline/queue/operation status owns durable
truth as defined by Requirement 018-005.

## 15. Handoff Checklist

- route uses existing `AppShell` and route registry;
- primary goal/action matches this blueprint;
- API state and command vocabulary match Requirements 017-002 and 017-005;
- controls are permission-driven by Requirement 018-007;
- shared component owner is identified before adding markup;
- URL filters, Back behavior and post-action navigation are specified;
- loading, empty, partial, stale, error, unauthorized and terminal states exist;
- desktop `1440px` and mobile `390px` evidence is captured;
- keyboard, focus, reduced motion, all themes and EN/TH are validated;
- QA acceptance maps to Requirement 018-006.

## 16. Acceptance IDs

- `UI-018-01`: every declared Operations route matches one blueprint and clear
  primary goal.
- `UI-018-02`: desktop and mobile preserve complete information and actions
  without clipped or horizontally scrolling page content.
- `UI-018-03`: Case Workspace supports diagnosis through durable reconciliation
  without losing staff input.
- `UI-018-04`: Trace Lookup converts one safe reference into an understandable
  linked timeline.
- `UI-018-05`: financial and content commands expose impact/dependencies before
  execution.
- `UI-018-06`: shared async, permission, conflict and notification behavior is
  consistent across routes.
- `UI-018-07`: no screen duplicates an owner capability workflow or creates a
  second Admin shell.
