# 005 Shared Discovery Component Contract

Status: Implemented and verified in scope (2026-09-06)

Owner: React shared presentation under `web/src/components/discovery/`; route orchestration remains with the owning feature

## 1. Objective

รวมเฉพาะ interaction และ presentation ที่ทำงานเหมือนกันจริงระหว่าง Templates, Comparisons, Characters และ Community Feed เพื่อให้แก้ UX, responsive และ accessibility ได้จากจุดเดียว โดยไม่สร้าง universal component ที่เต็มไปด้วย conditional branches

## 2. Proposed Shared Components

| Component | Responsibility | Must not own |
|---|---|---|
| `DiscoveryPageHero` | Bounded media-first page header, title, supporting copy and CTAs | Querying, route policy, featured selection |
| `DiscoveryToolbar` | Layout for search, filters, sort and period controls | URL parsing, server filters, feature-specific options |
| `DiscoverySearchField` | Search input, clear action, accessible label | Debounce policy or query state persistence |
| `DiscoveryFilterMenu` | Option menu with active value and reset | Capability decisions |
| `DiscoveryPeriodControl` | Latest/week/month/year segmented selection where supported | Ranking calculation |
| `DiscoverySectionHeader` | Compact heading and optional command | Navigation side effects |
| `DiscoveryMetricRow` | Icon-labelled authoritative metadata | Fabricating or deriving unavailable metrics |
| `DiscoverySteps` | Small ordered workflow strip | Marketing carousel or animation engine |
| `EditorialTutorialRail` | Configured tutorial placeholders and click targets | Eager iframe loading, autoplay, remote content discovery |
| `DiscoveryLoadMore` | Explicit loading/disabled/end state | Cursor storage or API invocation |

Exact names may change during implementation only if ownership and public contracts remain equivalent.

## 3. Feature-Specific Components

These components must not be collapsed into a single resource card:

- `TemplateDiscoveryCard`: result, readiness, pricing and Template Use
- `PublicComparisonCard`: ordered result slots, model association and public result state
- `CharacterDiscoveryCard`: identity, intended uses, reuse destinations and handoff
- Existing `MediaCard`: generic Community image/video/collection content

## 4. Component API Rules

- Shared components receive typed props, option arrays and callbacks
- No shared component calls `apiClient`, TanStack Query, a provider or a repository
- No shared component reads route pathnames to infer mode
- Commands use `Button` and Lucide icons; unfamiliar icon-only controls have tooltips and accessible names
- Binary state uses the existing `ToggleSwitch`; modes use segmented controls/tabs; option sets use menus/selects
- Cards use radius no greater than 8px unless the existing design token requires otherwise
- Fixed media, controls and metadata rows have stable dimensions
- Labels wrap without clipping; font size does not scale with viewport width; letter spacing remains zero
- Shared components support className/variant only for documented visual states, not arbitrary page behavior

## 5. Page Adapter Boundary

Each route owns a small adapter that translates its API response into component props:

```text
TanStack Query -> Zod response -> route selector/adapter -> shared layout + typed resource card
```

The adapter may format display metadata but must not infer ownership, public visibility, Credit price, winner, rank or capability. Those decisions come from server-owned fields.

## 6. Styling Ownership

- Shared layout styles belong in `web/src/styles/community-discovery.css` if extraction is justified by at least two consumers
- Page-specific composition stays in the existing feature stylesheet or a clearly named page stylesheet
- Use existing color and spacing tokens; do not copy literal mockup colors into every component
- Keep the yellow render signature specific to generation/render surfaces; discovery pages must not reuse it merely as decoration
- Verify default, fashion and creative themes before adding page-specific overrides
- Avoid section-level floating cards, nested cards, decorative gradient blobs and one-hue page palettes

## 7. Detailed Tasks

- `SHARED-01` Inventory duplicate toolbar, header, metadata and pagination markup
- `SHARED-02` Define typed props and documented variants before moving markup
- `SHARED-03` Implement one primitive at a time with isolated tests
- `SHARED-04` Migrate Templates first as the reference consumer
- `SHARED-05` Add Characters and Comparisons without new feature conditionals inside shared primitives
- `SHARED-06` Integrate Community root last
- `SHARED-07` Delete agent-authored duplicate presentation only after parity tests pass
- `SHARED-08` Add Storybook only if the repository later adopts it; it is not required for this work

## 8. Acceptance Criteria

1. At least two pages reuse every component placed in `components/discovery`
2. Shared controls are stateless with respect to server data and route ownership
3. Resource card contracts remain feature-specific
4. Existing generic components keep backward-compatible defaults
5. Keyboard, focus, hover, disabled, loading and error states are tested independently
6. A change to toolbar spacing or metadata wrapping can be made once and verified across all consumers

## 9. Focused Tests

- One test file per shared component
- Prop contract tests for controlled value and callbacks
- Keyboard and accessible-name checks
- Long-label and empty-option cases
- Shared stylesheet viewport fixture used by per-page Playwright specs
