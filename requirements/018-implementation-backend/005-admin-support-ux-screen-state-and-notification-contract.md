# Admin And Support UX Screen, State And Notification Contract

**Status:** Requirement ready for implementation planning  
**Owner:** Admin and Support React features  
**Primary role:** UX/UI Product Designer  
**Reviewers:** Backend Platform Architect, QA And Release Engineer  
**Skill:** `review-product-ux`  
**Implementation in this change:** None

## 1. Outcome

Authorized Momelo staff shall move from an alert or customer report to a safe,
auditable resolution without learning internal repository structure. Every
screen must make the current state, next valid action, financial impact,
approval requirement and final outcome understandable.

This requirement refines the routes and functions in Requirement 018-001. It
does not create alternate Support, Credit, Payment, Generation, Template,
Asset, Community or Identity workflows.

Low-fidelity route layouts are defined by Requirement 018-008. Permission and
command visibility follow Requirement 018-007. The landing dashboard and
shared staff workspace contracts follow Requirement 018-011.

## 2. Experience Principles

1. **Case first for mutation:** staff may investigate without a Case, but every
   material command must be linked to a Case before execution.
2. **One primary action per state:** the screen emphasizes the next safe action;
   secondary tools remain available without competing visually.
3. **Evidence before action:** diagnosis and immutable target IDs appear before
   Retry, Refund, Suspend, Quarantine or Restore controls.
4. **Progress persists:** closing a modal never hides an executing, approval-
   pending or reconciliation-pending operation.
5. **Financial units stay separate:** Money, Credits, creator liability and
   platform adjustment are never combined into one total.
6. **Progressive disclosure:** lists show sanitized summaries; restricted
   prompts or private media require an explicit reasoned reveal.
7. **Operational density:** use compact lists, tabs and split workspaces rather
   than marketing heroes or decorative card grids.
8. **Fail safely:** an unknown outcome remains visible as unresolved and offers
   reconciliation, never a blind retry.

## 3. Shared Information Architecture

Use the existing `AppShell`, role-aware Operations navigation, route registry,
breadcrumbs and active actor context.

```text
Operations
  Overview
  Users
  Support Cases
  Trace Lookup
  Finance          permission-gated
  Community        moderator-gated
  Content          moderator/admin-gated
  Audit            lead/admin-gated
```

The shell preserves the current user theme. Semantic warning, success, danger
and focus tokens must work in every supported theme. Do not create a separate
Admin theme or a second navigation shell.

## 4. Shared Page Composition

Every Operations route uses this order where applicable:

1. breadcrumb and compact page title;
2. data freshness, environment and active filters;
3. primary search/filter/action toolbar;
4. bounded result list or operational workspace;
5. contextual detail panel, drawer or dedicated detail route;
6. persistent operation/status region for long-running work.

Shared components should extend existing owners before creating new ones:

| Need | Preferred owner |
|---|---|
| Shell/navigation/breadcrumb | `AppShell`, route registry, breadcrumbs |
| Loading/empty/error/permission | `AsyncState`, `StatusNotice`, `Surface` |
| Confirmation and feedback | `ConfirmDialog`, shared Toast system |
| Safe media | `AuthenticatedMediaImage`, `MediaStage`/viewer |
| Generation state | existing Queue status vocabulary/components |
| Credit values | existing Credit and ledger formatters |
| Lists | one shared paginated operational-list primitive |
| Command progress | one shared staff operation-status component |

Business orchestration remains in route feature modules and capability API
clients. Shared UI components receive state and callbacks only.

## 5. Global Search And Filtering Contract

- Exact stable-ID lookup runs before partial text search.
- Search is submitted explicitly with `Enter` or Search; filters may update the
  query without clearing unrelated compatible filters.
- Filters are represented in the URL so a permitted staff member can return to
  the same queue view.
- Changing one filter must not reset category, date range or owner unless the
  combination becomes invalid; invalid dependent filters are cleared with an
  inline explanation.
- Lists are cursor-paginated and preserve selection when the selected item is
  still present.
- `Clear filters` is always available when a filter is active.
- Empty results distinguish `no records require action` from `no records match
  these filters`.
- Restricted records may appear as sanitized metadata with an explicit access
  state; the UI must not imply that hidden data does not exist.

## 6. Screen Specifications

### 6.1 Operational Overview - `/admin`

**Primary goal:** identify the highest-priority unresolved operational queue.

Show a compact queue summary for open/aging Cases, failed or orphaned
Generation operations, unsettled Credit reservations, payment reconciliation,
provider incidents, moderation and recent high-risk commands. Each summary
shows count, oldest age, severity, data timestamp and opens its pre-filtered
owner route.

States:

- loading retains stable queue-summary dimensions;
- empty says no action is currently required;
- partial data identifies the unavailable capability and keeps healthy queues
  usable;
- stale data displays age and Refresh without presenting old counts as live;
- unauthorized queues are omitted, not rendered as tempting disabled cards.

### 6.2 User Search - `/admin/users`

**Primary goal:** locate the correct customer without exposing unnecessary PII.

Search by allowed public user ID, username/email, safe support reference, Job,
Case, payment or ledger ID. Results show masked identity, status, role summary,
open Case count, safe Credit summary and latest activity. Exact matches are
clearly distinguished from partial matches.

Validation:

- reject empty, over-length and unsupported reference shapes locally;
- server validation remains authoritative;
- ambiguous matches require explicit selection;
- no bulk mutation in MVP.

### 6.3 Customer 360 - `/admin/users/:userId`

**Primary goal:** understand customer state and enter the correct owner flow.

Use anchored sections or tabs for Summary, Credits, Payments, Generation,
Content, Cases and Audit. Load bounded summaries first; fetch detailed sections
only when opened. Private media is represented by counts unless an authorized
workflow needs a reveal.

Primary contextual action is `Open support case` or `View active case`.
Suspend, Reactivate and Revoke Sessions are explicit commands with target,
effect, reason, confirmation and persistent result. There is no generic user
edit form.

### 6.4 Case Inbox - `/support/cases`

**Primary goal:** triage and take ownership of one Case.

Filters include status, priority, category, assignee, team, SLA age, financial
impact, provider/model, surface, error code and date. Rows show safe reference,
customer, category, priority, owner, age, latest action and financial indicator.

The selected Case may open in a responsive split workspace on desktop and a
dedicated route on narrow screens. Assignment and priority changes require
optimistic concurrency; a conflict refreshes current state without losing a
staff-authored note draft.

### 6.5 Case Workspace - `/support/cases/:caseId`

**Primary goal:** diagnose, execute one allowed recovery and verify outcome.

Layout:

- sticky compact Case header with status, priority, customer, assignee and IDs;
- evidence timeline as the main reading region;
- diagnosis summary with expected versus actual lifecycle;
- permission-aware command panel;
- persistent operation/approval/reconciliation status.

Command flow:

```text
Select diagnosis
  -> Preview command
  -> Review immutable target and impact
  -> Enter reason, customer note and evidence
  -> Approval when required
  -> Execute owner command
  -> Monitor owner operation
  -> Reconcile technical and financial result
  -> Resolve, monitor or escalate Case
```

Notes support internal/customer-visible visibility and a length counter. A note
that contains likely secrets triggers a blocking warning. Unsaved note text is
preserved across version conflict and accidental route navigation confirmation.

### 6.6 Trace Lookup - `/support/lookup`

**Primary goal:** turn one safe reference into a linked technical timeline.

Accept one reference at a time and identify its type automatically where safe.
Display linked request, correlation, Job, Generation Group, Fashion Run, quote,
reservation, ledger, payment, Template, Asset and Case nodes as a readable
timeline first; a relationship graph is optional progressive detail.

Explicit result states: found, partial trace, expired, not found, malformed and
unauthorized. Provide `Open Case` or `Link to existing Case` after a valid
result. Never display raw provider bodies, Base64, secrets or unrestricted
private URLs.

### 6.7 Finance Queue - `/admin/finance`

**Primary goal:** reconcile one financial mismatch without double settlement.

Use separate queue tabs for stale reservations, captured-without-result,
result-without-capture, payment webhook conflict, pending refund/adjustment and
reconciliation mismatch. Every row separates Money, Credits, creator liability
and platform adjustment.

Financial commands always open a dry-run detail surface showing original
transaction, current projection, proposed entries, approval threshold and
idempotency reference. High-risk actions remain unavailable until their Case,
evidence and approval prerequisites are satisfied.

### 6.8 Audit Search - `/admin/audit`

**Primary goal:** prove who accessed or changed what and why.

Filter by actor, role, Case, correlation, command, target, action, risk tier and
date. Audit events are append-only and displayed in stable chronological order.
Exports, when implemented, require separate permission, reason and retention
notice. Audit UI has no edit or delete action.

### 6.9 Community Moderation - `/admin/community`

**Primary goal:** inspect reported public content and invoke the Community-owned
moderation command.

Reuse the existing moderation surface and align its command preview,
confirmation, operation status and Toast behavior with this contract. It links
to Content when Asset or Template containment is required.

### 6.10 Content Management - `/admin/content`

**Primary goal:** find and safely contain any Template or media regardless of
public visibility.

Provide `Templates` and `Media` tabs with exact-ID-first search, bounded
filters, lifecycle, moderation, readiness, visibility, owner and date. Template
status, publication status, Fashion-ready status and moderation status are
separate fields.

Media detail shows original/derivative lineage and every known placement.
Restricted full-resolution reveal requires reason and enhanced Audit.
Available commands are Quarantine, Restore, Disable new reuse, Retire, Replace
presentation and Escalate. There is no generic Delete action.

Command preview lists affected posts, Templates, profiles, Characters,
Collections, derivatives, thumbnails and reuse entry points. Reconciliation
failure remains fail-closed and visible.

### 6.11 Generation Operations - `/admin/operations`

**Primary goal:** diagnose one Image or Video operation from submission through
provider state, durable output and Credit settlement.

Use the Unified Generation Job Center only as the activity projection. Detail
links to canonical Image Group/Job or Video Task records and shows provider
task, restart/recovery state, quote/reservation/settlement, output Asset/poster,
safe error and retry eligibility. Image and Video keep distinct lifecycle
vocabularies where their owner contracts differ.

### 6.12 Providers - `/admin/providers`

**Primary goal:** identify a degraded provider/model and prevent unsafe new
submissions without losing active-task visibility.

Show operation qualification, exposure cohort, recent submit/poll latency,
bounded failure rate, last successful terminal result and active configuration
version. Emergency disable is server-owned, reasoned and audited; rate changes
remain in Configuration.

### 6.13 Cinematic - `/admin/cinematic`

**Primary goal:** trace Project -> Scene -> Shot -> attempt -> provider task ->
Asset/settlement while preserving Storyboard and Character/wardrobe authority.

The workspace exposes bounded project/attempt evidence and links to owner
commands. It must not replicate the customer Cinematic editor.

### 6.14 Assets And Reconciliation - `/admin/assets`

**Primary goal:** identify missing originals, posters, derivatives or invalid
placements and invoke one safe owner reconciliation path.

Rows distinguish `file_missing`, `poster_missing`, `derivative_stale`,
`placement_blocked`, `quarantined` and `cleanup_eligible`. Destructive cleanup
requires Preview, evidence retention rules and a durable Audit result.

### 6.15 Attributes And Configuration

`/admin/attributes` retains the Attribute Catalog authoring and category-level
publication workflow. `/admin/configuration` owns provider/model capability and
rate-card revision lifecycle. Both reuse the same revision diff, validation,
approval, schedule, publication history and rollback presentation without
merging their domain schemas or publish commands.

## 7. Validation Contract

Validation is layered:

1. **Field validation:** required, format, length and allowed value close to the
   field without waiting for submit.
2. **Form validation:** cross-field requirements such as reason plus evidence,
   Case linkage and customer-visible note.
3. **Server policy validation:** role, target ownership, expected version,
   current state, risk tier and self-action restrictions.
4. **Dry-run validation:** immutable target IDs, effect, financial units,
   dependencies, approval requirement and fingerprint.
5. **Execution validation:** idempotency, owner operation and unknown outcome.
6. **Reconciliation validation:** actual technical and financial state before
   the Case may resolve.

Errors use stable server codes translated into actionable messages. Preserve
valid input after a server error. Focus the first invalid field on submit and
provide an error summary for long command forms. Never expose stack traces,
repository paths or provider secrets.

## 8. Notification And Status Contract

### 8.1 Toast Use

Toast is appropriate for short acknowledgement:

- note saved;
- Case assigned;
- filter view saved when that function exists;
- command request submitted;
- operation completed after the persistent state has also updated.

Success Toast uses semantic success styling and a concise target reference.
Error Toast may announce failure but must link/focus the persistent error state.

### 8.2 Toast Is Not The Source Of Truth

Do not use a disappearing Toast as the only evidence for:

- approval pending/rejected/expired;
- command executing or unknown outcome;
- refund, compensation or reconciliation result;
- quarantine/restore propagation;
- Case transition or owner operation failure.

These states remain in the Case timeline, queue row and operation-status region
after dialogs close or the route reloads.

### 8.3 Async State Vocabulary

Use the same vocabulary across routes:

```text
idle
validating
preview_ready
waiting_approval
executing
monitoring
completed
failed
outcome_unknown
reconciliation_required
reconciled
```

Loading controls retain stable dimensions. Buttons show progress and cannot
double-submit. Retry is shown only when owner policy confirms it is safe.

## 9. Confirmation, Focus And Navigation

- Low-risk reversible actions use concise confirmation when necessary.
- Financial, user-status, quarantine, restore and retirement confirmations name
  the actor-visible target, effect, reversibility and Case.
- Closing a command drawer returns focus to its invoking control.
- Successful creation navigates to or opens the durable Case/Command record.
- Browser Back preserves queue filters and scroll position where practical.
- Route changes with unsaved notes require confirmation.
- Keyboard operation, visible focus, Escape behavior and live-region async
  announcements are mandatory.

## 10. Responsive, Theme And Localization

- Validate desktop near `1440px` and mobile near `390px`.
- Desktop may use list/detail split views; mobile uses stacked labeled records.
- Tables must not require page-level horizontal scrolling on mobile.
- Risk and status use text/icon in addition to color.
- All visible text uses `react-i18next` with EN/TH key parity.
- Shared components use semantic theme tokens and preserve contrast in Momelo
  Neon, Pearl Editorial and Electric Studio.
- Respect reduced motion for progress animation.

## 11. UX Acceptance IDs

- `UX-018-01`: every Operations route has one clear primary goal/action.
- `UX-018-02`: filters preserve compatible context and are URL-restorable.
- `UX-018-03`: loading, empty, partial, stale, error and unauthorized states
  are distinct and testable.
- `UX-018-04`: every material command exposes Preview, validation, confirmation,
  execution and durable outcome.
- `UX-018-05`: Toast never becomes the sole record of a material action.
- `UX-018-06`: financial units and outcomes remain visually separate.
- `UX-018-07`: restricted data requires reasoned reveal and enhanced Audit.
- `UX-018-08`: desktop/mobile, keyboard, focus, themes and EN/TH pass review.
- `UX-018-09`: existing customer workflows remain independent of Admin UI
  availability.

QA validation and evidence ownership are defined in Requirement 018-006.
