# TUT-008 AI Cinema And Shared Content Access

**Status:** Requirements only; no implementation.  
**Confirmed 2026-10-08:** Only Admin uploads and publishes AI Cinema initially.

## Product Separation

- Tutorial is for learning; AI Cinema is for watching films/series. Keep separate
  menus, catalog/detail screens, vocabulary and domain metadata.
- Cinematic Studio remains the production tool, not the paid viewing catalog.
- Admin-only POC exposure applies to both catalogs, APIs and private playback;
  confirming Admin publishing does not authorize public paid viewing yet.
- Film: one main video with optional separate trailer. Series: ordered episodes,
  optional Seasons. No Lesson/enrollment UI is required for a cinema viewer.
- Member uploads, creator marketplace, payouts and public release are deferred.
- Uploading requires a rights declaration and audited publication. Being Admin
  does not establish distribution rights to someone else's material.

## Access And Price

Tutorial creator sets first N free Chapters; cinema Admin sets first N free
episodes per Series. Three is a suggested editor default only, not an enforced
minimum or system-wide override. All-free and all-paid are separate modes.

Persist per-title mode/count and the resolved free unit IDs at publication.
Partial-free requires integer 1 <= N < published unit count. Count ordered episodes
across the Series' ordered Seasons; it does not restart silently each Season.
Editor previews the exact list and access impact before publish/reorder. A single
film supports free or paid viewing; a trailer is a separate preview asset, not
an automatically free main film. Trailer support is a proposal, not required input.

Proposed offer scope: whole Course / Film / Series, not per play. Series vs Season
vs Episode purchases, duration and future-episode inclusion remain policy decisions
before charging. Quote snapshots explicit covered IDs/version and rights policy.
Changing free counts, episode order or current prices does not erase bought rights.
Free previews never imply paid entitlement or a recorded sale.

## Shared Ownership, Not A Second Wallet

| Owner | Responsibility |
|---|---|
| Tutorials | Course/curriculum publication, learning enrollment/progress |
| AI Cinema | Film/Series/Season/Episode publication, cinema metadata and viewing experience |
| Content Access (proposed) | Versioned offers, purchase orchestration, orders, durable entitlement/recovery |
| Credits (existing) | Quote financial authority, reserve/capture/refund, wallet/funding-lot mutations |
| Assets (existing) | Private bytes, upload/probe/transcode, authorized delivery sessions |
| Finance (existing) | Financial attribution, reconciliation and monthly/yearly reports |

Planned cohesive capability: `server/domain/content-access/` with a single public
application facade and `server/repositories/content-access/` for offers/orders/
entitlements. No duplicated balance, cash or credit ledger. Store metadata via
configured `server/data/content-access/` paths when implemented. Catalog owners
publish immutable approved offers to Content Access; avoid circular facade calls.
Playback joins current publication permission with Content Access entitlement;
Assets may serve only an authorized, scoped playback grant.

Use `contentType` + `contentId` + `offerId` + version in quote, idempotency,
entitlement, session and finance records. A Course and Film with the same local
ID must not share rights, charges, playback token scope or report totals.
TUT-004's purchase/recovery/refund invariants apply identically to both catalogs.
Type-specific publication and analytics stay in their owning domains; do not make
one oversized Course class or copy tutorial commerce into Cinema.

Planned cinema UI/domain: `web/src/features/ai-cinema/`,
`server/domain/ai-cinema/`, `server/repositories/ai-cinema/`, metadata under
`server/data/ai-cinema/`; use existing route composition and config path helpers.
All paths are proposed, not runtime additions. Keep this requirement packet in its
existing folder to preserve links; no rename is needed for shared foundations.

## UX And Integration

Add AI Cinema as a peer menu to Tutorial, not inside Cinematic Studio. Proposed
`/ai-cinema`, title detail, Watch and Admin manage routes use the existing registry.
Provide poster, synopsis, language, duration/episode count, accurate free/price
state, Play/Continue and ordered episode selection. Small screens use video first
and episodes below. Reuse player/confirmation/upload components; no training
completion messages or learner roster on a public title page.

A separate Admin-visible AI Cinema landing band is a proposed follow-on to the
confirmed Tutorial landing section, not permission to redesign existing home.
Use real published posters/titles only. No public section until release approved.
Optional future import from Cinematic Studio must be an explicit publish workflow
with actor/rights/readiness checks and asset lineage. Never auto-publish a render
or mutate Studio source work. Initial scope is Admin upload only.

## Reporting And Acceptance

Finance filters by Tutorial/AI Cinema and Course/Film/Series, plus optional episode
playback breakdown. One Series sale is recorded once, not once per played episode.
Combined totals derive from the same events without adding aggregate and child rows.
Distinct viewers, purchasers, sessions and watch time remain separate. Annual
unique viewers are a union; admin previews/test purchases are not customer sales.
Cash-backed value vs Credits/refunds/unknown funding follows TUT-004 unchanged.

Verify Admin-only upload/publish and copied-media denial; N=1/3/5 and reordered
episodes; Course/Film ID collision isolation; duplicate purchase/refund/restart
recovery for each content type; monthly/yearly category totals; and unchanged
Cinematic Studio render behavior. These checks extend existing planned groups,
not a second streaming/credit test runner. Public commerce remains gated by 007.
