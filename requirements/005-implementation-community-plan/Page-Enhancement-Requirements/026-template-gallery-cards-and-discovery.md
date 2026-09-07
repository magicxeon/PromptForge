# Template Cards And Discovery Composition

Status: Implementation delivered; focused fixture gates passed. Live/source UAT remains pending. See [delivery evidence](implementation-plan/034-presentation-delivery-evidence.md).
Owner: Community. Execution: [plan 027](implementation-plan/027-template-cards-and-discovery.md).

## Card Contract

1. Rework only `TemplateDiscoveryCard`: portrait original left; compact title,
   creator, friendly tags, real related-work thumbnails, price and actions right.
   This supersedes 001's vertical-card/three-or-four-column presentation, not
   its data, URL, availability or Template Use behavior.
2. Use up to two public output thumbnails from 024 as the inset demonstration.
   Never substitute a private Pose Proxy/blueprint image. Empty preview space
   collapses cleanly when there are no public creations.
3. Show the existing access-fee value as Template fee, not total generation
   price. Technical provider/ratio/resolution details can be secondary; keep
   data available in Detail rather than crowding the card with a dashboard.
4. Use actual public tags through the existing taxonomy label mapping. Missing
   labels are omitted, not raw dot-separated keys. No invented category mappings.
5. Media/title and Detail link use the canonical Template Detail route; Use
   remains a separate focusable action. Do not nest buttons inside links.
6. Do not add fake ratings, weekly ribbons, growth, personalized ranking or
   bookmark controls without an existing compatible service. Save is optional
   presentation of the existing post-save contract, not a new Template library.

## Discover And Lower Sections

- Retain the current search/category/period/sort URL contracts and query owner.
  Search field and sort align in a compact row; actual category options may
  become chips beneath it. Keep unavailable options absent.
- Expose only existing `latest` / `trending` sorts and existing period semantics.
  No Most used/Top rated/For you/Lowest credits computation in client code.
- Heading reflects active filters/sort, not a permanently hard-coded Trending
  this week title. Search/clear/reset keep browser back/forward behavior.
- Three-step strip uses existing DiscoverySteps. Any short wording must reflect
  select Template, required outfit/optional Character, then explicit generation
  confirmation. No tutorial paragraph or unsupported face-upload promise.
- Preserve explicit Load more adjacent to the catalog. Tutorials remain the
  existing labeled mock configuration with no fake working video or autoplay.
- Top creator rankings, follow widgets and creator-income band stay Pending.
  Do not fill missing sections with fabricated marketplace data.

## Responsive And State Rules

- Two horizontal cards per row on desktop when each has sufficient content
  width; one on constrained tablet/mobile. Three only if measured card width
  still supports readable controls. Decide by available content, not screen alone.
- On narrow cards stack image/info if necessary. Keep portrait aspect-ratio,
  readable Thai names and actions reachable at 320px without horizontal scrolling.
- Loading, filtered-empty/reset, initial error/retry and next-page error preserve
  their current ownership. Preview failure is independent of catalog failure.
- Scope CSS to Template Gallery/card classes in `template-gallery.css`.
  Do not change Character, Comparison, Home or generic MediaCard appearance.

## Acceptance

- `TGC-01`: Original/related previews identify one verified family without blueprint exposure.
- `TGC-02`: Actual URL filters, cursor reset and back navigation retain behavior.
- `TGC-03`: Header, card and Detail Use all hand off the original Template Post.
- `TGC-04`: No mock rating/usage/income/category becomes a live claim.
- `TGC-05`: Long titles, missing media and unavailable Template retain compact actions.
- `TGC-06`: Focused Gallery screenshots pass; sibling discovery route smoke checks pass.

Use `DiscoveryToolbar`, `DiscoverySegmentedControl`, `DiscoveryLoadMore`,
`EditorialTutorialRail` and current query orchestration; do not introduce a
parallel discovery store. Rollback card/toolbar composition only, no data changes.
