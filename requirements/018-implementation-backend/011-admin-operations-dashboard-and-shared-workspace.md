# Admin Operations Dashboard And Shared Workspace

**Status:** Requirement reconciled with current Momelo capabilities on 2026-08-25; implementation not started  
**Primary role:** UX/UI Product Designer  
**Reviewers:** Backend Platform Architect, QA And Release Engineer  
**Skills:** `review-product-ux`, `verify-release-regressions`  
**Capability owner:** Admin read models and shared staff presentation; owner capabilities retain every mutation

## 1. Outcome

The first authorized Admin screen shall answer, within one scan:

1. Is customer generation healthy now?
2. Which customer, financial, content or provider issue needs action first?
3. Which configuration publication or reconciliation is pending?
4. Can the current staff actor safely open the exact owning workspace?

The dashboard is an operational projection and navigation surface. It never
becomes a second Queue, Credit ledger, moderation engine, configuration store
or Cinematic workflow.

## 2. Current Capability Coverage

The dashboard and staff workspaces must cover the current product, including:

- Image Generation Groups/Jobs, Video Provider Tasks and the Unified Generation
  Job Center projection;
- provider/model health, qualification, submit/poll failures and aging work;
- Credit estimate, reservation, capture, refund and settlement conflicts;
- Playground Image/Video, Studio, Scene Builder and Fashion Blueprint runs;
- Cinematic Projects, Scenes, Shots, attempts, exports and continuity/source
  lineage;
- durable video Assets, poster derivatives, missing-file cleanup and poster
  reconciliation;
- Community image/video posts, reports, moderation, Character attribution and
  public placements;
- Character Profiles, Character Versions, Templates, pose proxies,
  Fashion-ready preparation and reuse eligibility;
- Attribute Catalog drafts, validation, visual production, category release,
  publication, rollback and compatibility blockers;
- versioned provider capability, qualification and pricing/rate-card
  configuration with draft, validation, scheduled/manual publication and
  rollback;
- users, sessions, Support Cases, Audit, Collections and creator-facing content.

Missing or unimplemented owner commands appear as `read_only` or
`action_unavailable`; the UI must not imply that direct data repair is allowed.

## 3. Information Architecture

Use the existing `AppShell`, route registry, theme and staff authorization. One
role-aware Operations navigation group is organized as:

```text
Overview
Operations
  Generation Jobs
  Providers
  Cinematic
  Assets And Reconciliation
Customers
  Users
  Support Cases
Content
  Community
  Templates And Characters
  Media
  Attributes
Commerce
  Credits And Reconciliation
  Payments And Payouts when available
Configuration
  Provider Capabilities
  Rate Cards
  Publication History
Governance
  Approvals
  Audit And Security
```

Permissions remove inaccessible destinations from navigation. Direct route
access is independently denied by the server without leaking record existence.

## 4. Dashboard Composition

### 4.1 Health strip

Display environment, projection freshness, last successful reconciliation and
partial-capability warnings. A stale or unavailable source is named; healthy
sections remain usable.

### 4.2 Actionable summary

Use compact operational metric tiles only for genuine queues:

- active and aging Image/Video jobs;
- provider failures or degraded models;
- generation/Credit settlement conflicts;
- missing Video output/poster or failed media reconciliation;
- open and SLA-risk Support Cases;
- reported/quarantined content;
- configuration drafts awaiting approval/publication;
- recent failed or high-risk staff commands.

Every tile includes count, oldest age or severity, freshness and a link to the
exact URL-filtered owning workspace. There is no global `Fix all` action.

### 4.3 Priority work queue

Order items by server-owned severity and age, not by a client-calculated score.
Each row includes safe reference, capability, customer impact, financial-impact
indicator, owner/team, latest event and one `Open` command. Unauthorized fields
are omitted or redacted.

### 4.4 Recent changes

Show configuration publications, moderation actions, approvals and R2-R4 staff
commands from append-only Audit. This is a bounded list with a link to full
Audit search, not a second audit store.

## 5. Shared Workspace Component Contract

Admin-specific reusable components belong under
`web/src/features/admin/components/` unless they are already general shared UI
under `web/src/components/`. Create a component only after checking the current
owner and tests.

| Concern | Shared contract | Reuse rule |
|---|---|---|
| Page frame | `AdminWorkspaceLayout` | title, breadcrumb, freshness, toolbar and persistent operation region |
| Metrics | `AdminMetricTile` | bounded count/severity/link only; no query or business logic |
| Search/filter | `AdminFilterBar` | URL-backed filters, active count, clear and responsive drawer |
| Lists | `AdminDataTable` / labeled mobile records | cursor pagination, stable selection and accessible row actions |
| Status | `AdminStatusBadge` | one canonical server vocabulary with icon/text, never color alone |
| Entity links | `AdminEntityLink` | stable ID, permission-aware route and copy action |
| Async content | existing `AsyncState`, `StatusNotice`, `Surface` | stable loading dimensions and partial failure |
| Media | existing authenticated media/viewer components | safe thumbnail, reasoned reveal and lineage; no parallel loader |
| Commands | `AdminCommandPreview` | immutable target, impact, approval and expected version |
| Long operations | `AdminOperationStatus` | survives dialog close/reload and links to Case/Audit |
| Evidence | `AdminEvidenceTimeline` | sanitized chronological events from owner projections |
| Configuration | `AdminRevisionDiff` | draft/active diff, validation, schedule and rollback evidence |

Components receive typed data and callbacks. They do not call providers,
calculate Credits, mutate repositories or infer permission. Domain-specific
orchestration remains in its feature route and API/schema boundary.

Do not create one oversized universal table or detail component. Extract shared
behavior only after two real workspaces need the same contract.

## 6. Fast Staff Workflow

- Exact ID lookup is available from the shell and executes before partial text
  search.
- Filters persist in the URL and Back returns to the same selection and scroll
  position where practical.
- Customer 360 and Case Workspace cross-link to Generation, Credit, Content and
  Cinematic details without copying those workflows.
- Frequently repeated safe reads require no modal. Material actions always use
  Preview, reason, confirmation, approval when required and durable outcome.
- Keyboard navigation, visible focus and compact density are first-class.
- Toast confirms a short event; the row, Case timeline or operation region is
  the durable source of truth.

## 7. Dashboard Read API

`AdminBackofficeService` owns a composed bounded read model such as:

```text
GET /api/admin/overview?window&timezone
GET /api/admin/operations?cursor&capability&state&severity&owner
```

The response includes `generatedAt`, per-section `sourceUpdatedAt`, `stale`,
`partial`, permission-filtered links and bounded items. It consumes owner
facades/projections and must not read foreign JSON paths directly.

Dashboard aggregation must not introduce feature-local polling. TanStack Query
uses one actor-scoped query key and a server-owned refresh policy. Refresh stops
when no live operational item needs it, and background updates preserve layout
and current filters.

## 8. Security And Privacy

- Authentication, staff role and session are server-derived; mock actors cannot
  authorize production Admin routes.
- Dashboard responses are permission-filtered at field and section level.
- PII, prompts, private references and full media are absent by default.
- Restricted reveal requires permission, reason, Case when policy requires it,
  short-lived access and enhanced Audit.
- Counts must not reveal a restricted tenant/customer/entity to an unauthorized
  role.
- Links use stable opaque IDs; signed media URLs and provider credentials never
  appear in dashboard payloads.
- All reads and material navigation into restricted records carry request and
  correlation IDs; material access is audited.

## 9. Database-Ready Projection

The dashboard has no authoritative dashboard table. It composes indexed owner
projections and may use a bounded, rebuildable cache with declared freshness
and invalidation.

Production adapters must support:

- stable opaque IDs and foreign keys across user, Job/Task, Case, command,
  Asset, post, Character, Template, Cinematic and configuration records;
- cursor pagination with `(severity, updated_at, id)` or owner-appropriate
  stable indexes;
- an outbox/event projection for cross-capability freshness where direct joins
  would couple owners;
- rebuild and reconciliation of dashboard projections without changing owner
  state;
- no media bytes, raw prompt bodies or provider secrets in PostgreSQL dashboard
  projections.

Local JSON may implement the same read contract for development. Routes and UI
must remain unchanged when repositories move to PostgreSQL.

## 10. Responsive And Visual Contract

- Desktop favors dense summary + queue + detail navigation, not decorative
  cards or a marketing hero.
- Mobile is primarily triage/read; records become labeled stacks without page-
  level horizontal scrolling. High-risk command execution may remain desktop-
  only when the requirement says so explicitly.
- Existing semantic theme tokens support all Momelo themes; no hard-coded Neon,
  Pearl or Electric colors.
- Loading, empty, partial, stale, unauthorized and error states preserve stable
  dimensions and remain distinguishable.
- EN/TH localization parity, reduced motion and accessible live status are
  required.

## 11. Acceptance

- `DASH-018-01`: `/admin` shows every permitted current capability requiring
  attention and identifies partial/stale sources.
- `DASH-018-02`: every metric and priority row opens the correct URL-filtered
  owner workspace in one action.
- `DASH-018-03`: Image/Video Job, Cinematic, Credit, media/poster, Community
  video, Attribute and configuration states are covered without duplicate
  lifecycle ownership.
- `DASH-018-04`: shared components have one presentation contract and preserve
  domain-specific orchestration boundaries.
- `DASH-018-05`: restricted counts, details and links do not leak across roles
  or actors.
- `DASH-018-06`: refresh, partial failure and long-running operations do not
  blank the shell or lose staff context.
- `DASH-018-07`: desktop and mobile, keyboard/focus, all themes and EN/TH pass
  visual and automated review.
- `DASH-018-08`: PostgreSQL adapters can replace local repositories without
  changing route, use-case or component contracts.
