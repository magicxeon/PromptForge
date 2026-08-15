# UI-008 Shell, Community Discovery, and Public Post Layout Refinement

**Status:** Approved for implementation  
**Owners:** React application shell and Community feature  
**Visual references:**

- [`001-landing-page_rewamp.png`](./001-landing-page_rewamp.png)
- [`004-photo-viewer.png`](./004-photo-viewer.png)
- the current and retained Vanilla sidebar spacing shown in UI review

## 1. Business Requirement

Momelo must present one coherent dark workspace in which navigation, Community
discovery, and public content details are visually separated without wasting
media space.

Users must be able to:

1. understand that the left navigation is a distinct panel;
2. reach Scene Builder from the collapsed Studio icon even though its children
   are hidden;
3. filter Community content by both resource type and content category;
4. inspect a complete uncropped Community image and its public metadata;
5. interact through Like, Save, Share, Comments, Collection and permitted
   Template actions; and
6. open public comparisons in the same Comparison Workspace used elsewhere.

## 2. Functional Requirements

### 2.1 Application Shell and Sidebar

- Desktop shell uses `16px` outer screen padding.
- Left Navigation and routed page content use the shared `16px` panel gap.
- The page canvas is darker than both foreground panels.
- Expanded Studio is an accordion trigger only:
  - clicking it toggles child visibility;
  - it does not navigate.
- Collapsed Studio has no visible children. Its icon becomes a navigation
  action and opens `/studio/scene#studio-configurator-title`.
- Other collapsed navigation items retain their existing direct destinations.
- Mobile remains an edge-attached drawer and does not inherit desktop outer
  panel gaps.

### 2.2 Community Discovery

- Keep compact resource filters for All, Community images, Templates,
  Comparisons and Collections.
- Restore a distinct category-filter row sourced from the server feed facets.
- Category controls show readable labels without result counts.
- The active category is persisted in the URL through `category=<officialTag>`.
- Selecting All categories removes the category query parameter.
- Category filters may horizontally scroll on narrow screens without exposing a
  visible scrollbar.
- Pagination retains the existing cursor-based `Load more` contract.
- Community cards remain route links. Comparison cards open the public
  Comparison Workspace through the Community post route.

### 2.3 Community Hero

- Keep Start creating and Explore templates.
- Add a clear Playground action linking to `/playground`.
- Do not add a marketing-only route or duplicate the Playground editor.

### 2.4 Public Image and Template Detail

- Use a full routed detail page, not a Lightbox.
- Use a black media stage with `object-fit: contain`.
- Never crop the primary inspection image.
- Size the primary image from its intrinsic aspect ratio:
  - do not stretch portrait images to the full media-panel rectangle;
  - constrain with responsive `max-width` and `max-height`;
  - preserve the complete image even when this leaves black space beside it;
  - do not upscale a small source merely to fill the panel.
- The Fullscreen action expands the already-loaded black media stage rather
  than opening a duplicate image or a second Lightbox. Native `Escape` must
  return the user to the routed detail page without losing page state.
- Media source selection is explicit:
  - Community discovery cards use the derived preview URL;
  - routed image/template detail, Fullscreen and Download use the original
    image URL, with preview only as a missing-original fallback;
  - a detail component must never prefer `thumbnailUrl` over an available
    `imageUrl`.
- The MVP maintains one derived preview profile rather than a responsive
  rendition set. Sharp generates `preview-v1` as WebP with a maximum dimension
  of `1280px`, quality `86`, orientation normalization and no enlargement.
  Existing `thumbnailUrl` fields and `/thumbnail` endpoints remain as
  compatibility names for this preview so Community, Collection and Character
  Profile contracts do not require a coordinated rename.
- `scripts/migrate-history-thumbnails.js` treats a missing or stale preview
  profile as a migration candidate and regenerates it atomically from the
  original output. Migration never modifies the original image.
- Media and information are separate raised panels with a `16px` gap.
- The information panel presents, in scan order:
  1. creator identity;
  2. category/type tag;
  3. title and description;
  4. Like, Save and Share;
  5. Prompt card only according to public prompt policy;
  6. provider/model, aspect ratio, dimensions and generation duration;
  7. Use Template when server policy permits;
  8. Add to Collection.
- Add to Collection must not bypass Collection ownership:
  - use the existing picker only when an actor-owned generation job is
    available;
  - otherwise render the action disabled with a clear unavailable explanation.
- Comments appear in a separate panel beneath the media and use the reusable
  `CommentThread`.
- Each comment displays a compact user avatar or initials fallback.
- More from creator displays up to four additional public posts.

### 2.5 Public Comparison Detail

- Public Comparison posts render through
  `web/src/components/comparisons/ComparisonWorkspace.tsx`.
- Preserve synchronized zoom/pan, paging, voting, winner highlighting and prompt
  visibility behavior.
- Do not expose private Collection, Face Reference or owner-only actions.

## 3. Software Design

### 3.1 State and Routing

- `SidebarNavigation` remains controlled by `AppShell`.
- Expanded/collapsed state remains actor-independent shell preference state.
- Community resource type, category, period and search remain URL state.
- TanStack Query keys include the active actor and complete filter object.

### 3.2 API Contract

`GET /api/community/posts` already accepts:

- `postType`
- `officialTag`
- `sort`
- `period`
- `search`
- `cursor`

The client must parse `facets.officialTags` with Zod and must not introduce a
second taxonomy endpoint.

Public generation metadata adds optional `generationDuration`. New shared
snapshots retain the sanitized generation settings needed for aspect ratio,
dimensions, resolution and duration. For legacy posts, the public detail
service may recover only these allowlisted fields from the owner-scoped source
generation record. It must not copy prompt text, private references, actor data
or other generation payload fields into the public response. If neither source
contains a value, the field remains optional and displays the localized
unavailable label.

### 3.3 Component Ownership

```text
web/src/components/layout/SidebarNavigation.tsx
  expanded accordion and collapsed Studio navigation behavior

web/src/features/community/routes/CommunityHomeRoute.tsx
  URL filters, feed pagination and category-facet orchestration

web/src/features/community/components/CommunityHero.tsx
  Community launch actions

web/src/features/community/routes/CommunityPostRoute.tsx
  public post query, mutation adapters and detail composition

web/src/components/community/CommentThread.tsx
  reusable comment composer/list/avatar presentation

web/src/components/comparisons/ComparisonWorkspace.tsx
  public Comparison media interaction

web/src/styles/shell.css
  application shell spacing only

web/src/styles/community-home.css
  Community discovery and cards

web/src/styles/community-detail.css
  public post page layout and responsive behavior
```

## 4. Implementation Plan

1. Update the sidebar parent branch so collapsed Studio renders a React Router
   link to Scene Builder while expanded Studio remains a button.
2. Normalize desktop shell padding and gap through shared tokens.
3. Extend the Community feed Zod schema and API filter with official taxonomy
   facets.
4. Render category chips from the first feed page and keep the selection in the
   URL.
5. Add the Playground hero action and localization keys.
6. Refactor Community post detail into semantic media, information, prompt,
   metadata, comment and related-work panels.
7. Add avatar/initial presentation to the shared CommentThread.
8. Add optional duration to the public Community metadata projection.
9. Add responsive styles and validate desktop/mobile.

## 5. Impact and Concerns

- **Ownership:** Community media IDs must not be treated as private History job
  IDs.
- **Privacy:** hidden prompts remain absent, not merely visually concealed.
- **Compatibility:** category facets and duration are optional for old posts.
- **Performance:** category filtering reuses the current paginated endpoint.
- **Accessibility:** accordion state, collapsed destinations, filter pressed
  state, disabled Collection action and icon labels remain explicit.
- **Responsive behavior:** desktop panels separate; mobile stacks with no
  horizontal overflow.

## 6. Testing

### Automated

- Expanded Studio toggles submenu without navigation.
- Collapsed Studio links to Scene Builder.
- Category filter serializes to `officialTag`.
- Feed facets parse through the Zod boundary.
- Public detail keeps prompt-hidden state private.
- Comparison posts use the Comparison Workspace.
- Comment avatars render with fallback initials.

### Manual

1. Expand and collapse the desktop sidebar.
2. Verify expanded Studio toggles children and collapsed Studio opens Scene
   Builder.
3. Select resource and category filters; refresh and verify URL persistence.
4. Open Image and Template posts and inspect the complete uncropped image.
5. Test Like, Save, Share, Prompt visibility and Comments.
6. Confirm unavailable Collection action explains why it is disabled.
7. Open a Comparison post and test synchronized zoom and voting.
8. Check desktop `1440px`, mobile `390px`, English and Thai.

## 7. Acceptance Criteria

- Desktop sidebar never touches the viewport edge or routed content panel.
- Collapsed Studio is useful and unambiguous.
- Resource and category filters are both visible and URL-driven.
- Image and Template detail pages match the panel hierarchy of the visual
  reference.
- Primary media is complete and uncropped.
- Comparison, Comments and engagement reuse canonical shared components.
- No ownership, prompt visibility or Collection policy is weakened.
