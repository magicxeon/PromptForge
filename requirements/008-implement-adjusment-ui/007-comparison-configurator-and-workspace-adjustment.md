# UI-007 Comparison Configurator and Workspace Adjustment

**Status:** Implementation approved  
**Owner:** React comparison and shared generation UI  
**Visual reference:** [`007-comparison-screen.jpeg`](./007-comparison-screen.jpeg)

## 1. Business Requirement

ModelPromptForge must provide one consistent comparison workflow wherever a user
generates images and wherever comparison results are reviewed.

The workflow has two distinct user tasks:

1. configure two to four provider/model slots and review the billable estimate;
2. inspect completed outputs side by side, select or vote for a winner, and
   optionally publish a safe Community snapshot.

The same components must serve:

- Studio Face Creation;
- Studio Character Sheet;
- Studio Scene Builder;
- Playground;
- private Comparison detail;
- generated Comparison results; and
- public Community Comparison posts.

The UI must preserve the compact dark Vanilla visual language shown by the
reference instead of creating route-specific variants.

## 2. Functional Requirements

### 2.1 Comparison Configurator

- Support two to four slots.
- Use compact slot cards with a short heading row.
- Provide Previous, Next and Remove icon actions in each slot heading.
- Reordering changes the submitted slot order and visible slot numbering.
- Do not use an internal vertical scrollbar. The configurator grows with its
  content and the owning page performs normal page scrolling.
- Use opaque dark select/input surfaces with readable text and option contrast.
- Show a live credit estimate for every slot.
- Show a total containing only the slots currently present and enabled.
- Show the server error when an estimate is unavailable; do not leave the UI at
  an unexplained `Estimate pending` state.
- Cost estimation may run before a prompt is complete because provider, model,
  output settings and references determine the quote. Generation remains
  disabled until the prompt and all other required inputs are valid.
- The estimate submitted with Generate must be the same current estimate
  displayed to the user.

### 2.2 Comparison Workspace

- Display up to three results side by side on desktop.
- When a run contains four results, display three at a time and provide paging
  controls to reveal the remaining result.
- On narrow screens, stack result panels without causing horizontal page
  overflow.
- Provide a `Sync view` toggle. When enabled, zoom and pan changes apply to all
  visible panels. When disabled, each panel keeps its own transform.
- Provide Zoom Out, Zoom In, Fit, Reset and Fullscreen controls.
- Mouse wheel zoom and pointer/touch drag must work inside each image viewport.
- Use `object-fit: contain`; users must be able to inspect the complete output.
- Highlight the owner-selected winner or public vote leaders with a restrained
  gold border and winner label.
- Preserve partial-success slots and communicate failed slot status without
  collapsing successful results.
- Display the shared prompt in a compact, dark, scrollable read-only field when
  policy permits it.

### 2.3 Private Owner Actions

- The owner can rename a private Comparison Set inline.
- Renaming a private set must not mutate a Community post already published from
  it. Published posts are immutable snapshots.
- The owner can select or clear a private winner.
- A completed slot from a Face Creation (`headshot`) comparison can open the
  existing Face Reference destination dialog using the slot generation job.
- Character Sheet, Scene and other comparison outputs must not expose the Face
  Reference action.
- Existing Collection and Download actions should be reused where their current
  contracts permit them.

### 2.4 Community Sharing and Voting

- A completed private comparison with at least two successful slots can be
  shared as one grouped Community post.
- The share dialog must let the owner choose:
  - `Full prompt`: publish the permitted prompt snapshot;
  - `Prompt hidden`: publish no prompt text.
- Server sanitization is authoritative. The client option must not bypass public
  snapshot or reference policy.
- Community users can cast one vote per comparison post.
- Vote leaders are highlighted. Tied leaders may be highlighted together.
- The Comparison owner cannot vote for their own public post, following the
  existing engagement policy.
- Public Comparison results do not expose private Face Reference actions.

## 3. Software Design

### 3.1 Component Boundaries

`web/src/components/comparisons/ComparisonConfigurator.tsx`

- controlled component;
- receives provider catalog, slots, estimate projection and callbacks;
- owns no API calls, credit policy or generation submission;
- emits reorder/add/remove/provider/model changes.

`web/src/components/comparisons/ComparisonWorkspace.tsx`

- controlled product component shared by private, public and generation modes;
- owns only viewport interaction state;
- receives winner/vote/action callbacks and permission-derived props;
- does not fetch Comparison or Community data directly.

`web/src/features/comparisons/routes/ComparisonDetailRoute.tsx`

- owns Comparison query, rename mutation, delete mutation, private winner
  mutation and owner-only action adapters.

`web/src/features/community/routes/CommunityPostRoute.tsx`

- owns Community engagement query and vote mutation;
- passes only public snapshot data and public permissions to the workspace.

`web/src/components/generation/GenerationExperience.tsx`

- owns estimate queries and comparison submission;
- permits quote calculation before prompt completion;
- passes estimate data and stable errors into the configurator.

### 3.2 Data and API Contracts

Canonical endpoints remain:

- `POST /api/comparisons/estimate`
- `POST /api/comparisons`
- `GET /api/comparisons/:setId`
- `PATCH /api/comparisons/:setId`
- `PATCH /api/comparisons/:setId/winner`
- `POST /api/community/comparisons/:setId/publish`
- Community comparison vote endpoints
- Face Reference handoff endpoint for eligible owner generation jobs

Comparison estimate identity binds:

- actor;
- ordered provider/model slots;
- per-slot resolved resolution;
- aspect ratio;
- reference count;
- output count and generation mode;
- provider configuration version;
- estimate expiry.

The client must never calculate pricing locally.

### 3.3 Visibility Contract

Comparison sharing accepts `promptVisibility` values:

- `full`
- `private`

`full` stores the permitted Comparison prompt snapshot. `private` stores no
public prompt text. The public view continues to derive `promptPreview` through
the canonical Community public-view sanitizer.

## 4. File-Level Implementation Plan

### New

- `web/src/components/comparisons/ComparisonConfigurator.tsx`
- `web/src/styles/comparisons.css`

### Modify

- `web/src/components/generation/EngineTargetPanel.tsx`
  - consume the extracted configurator.
- `web/src/components/generation/GenerationExperience.tsx`
  - decouple estimate eligibility from prompt completion;
  - pass estimate loading/error state.
- `web/src/components/comparisons/ComparisonWorkspace.tsx`
  - side-by-side synchronized viewer and controlled actions.
- `web/src/features/comparisons/routes/ComparisonDetailRoute.tsx`
  - inline rename and owner action adapters.
- `web/src/components/community/ShareComparisonDialog.tsx`
  - collect Prompt Visibility.
- `web/src/components/community/PublishCommunityResourceDialog.tsx`
  - expose an optional prompt-visibility control without affecting other
    resources.
- `web/src/features/comparisons/api/comparisonApi.ts`
  - include Prompt Visibility in publish input.
- `web/src/features/comparisons/schemas/comparisonSchemas.ts`
  - expose the safe configuration mode required for action policy.
- `server/domain/community/CommunityComparisonShareService.js`
  - persist full/hidden prompt policy through the existing sanitizer contract.
- `web/src/styles/globals.css`
  - import shared Comparison styles after Studio styles.
- enabled locale catalogs under `client/i18n/locales/`
  - add parity keys for reorder, paging, rename, prompt policy and errors.

## 5. Impact and Concerns

- **Credits:** stale or mismatched estimates must block submission and return the
  existing stable server error.
- **Ownership:** private Comparison routes remain actor-scoped. Public posts
  expose only sanitized snapshots.
- **References:** Face Reference handoff continues to be server-authorized.
- **Performance:** only three large images render in the active viewer page.
- **Accessibility:** all icon controls require names/tooltips; reorder and
  viewport controls must be keyboard operable.
- **Responsive behavior:** desktop targets three columns; mobile stacks panels
  and retains controls without horizontal page scrolling.
- **Reduced motion:** transform transitions are disabled for users requesting
  reduced motion.

## 6. Testing

### Automated

- Configurator add/remove/reorder preserves stable slot IDs.
- Estimate totals include the current slots only.
- Estimate requests run without requiring prompt text.
- Rename mutation updates the private set.
- Comparison share publishes `full` or `private` prompt visibility correctly.
- Workspace paging exposes slot four without rendering more than three large
  viewports.
- Sync mode applies one transform to visible panels; independent mode preserves
  per-slot transforms.
- Face Reference action appears only for eligible private Headshot slots.
- Community vote leaders and ties are highlighted.

### Manual

1. Open Comparison in Face Creation, Character Sheet, Scene Builder and
   Playground; verify identical configurator behavior.
2. Add four models, reorder them and remove one.
3. Verify each slot cost and total update before entering a prompt.
4. Generate and confirm the submitted total matches the displayed locked quote.
5. Open a three-result set and test synchronized wheel zoom and drag.
6. Open a four-result set and page to the fourth result.
7. Rename the private set, refresh, and verify persistence.
8. Share once with Full Prompt and once with Prompt Hidden using separate sets.
9. As another actor, vote and confirm leader highlighting.
10. Verify only owner Headshot results expose Use as Face Reference.
11. Verify desktop and mobile layouts in Thai and English.

## 7. Acceptance Criteria

- One Configurator implementation serves all generation surfaces.
- One Workspace implementation serves private, public and generated results.
- No Comparison-internal vertical scrollbar remains.
- Costs are visible, server-derived and submission-consistent.
- Three synchronized inspection panels match the hierarchy and shading of the
  visual reference.
- Rename, sharing policy, voting and eligible Face Reference actions work without
  leaking owner-only data.
