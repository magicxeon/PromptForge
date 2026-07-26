# Community-05-001 Shared Media and Comparison Presentation

**Status:** Implemented - Node and browser acceptance pending
**Feature type:** Community discovery, reusable comparison presentation and engagement
**Depends on:** Community-04, Community-05, Community-07, Community-12, current private Comparison workspace
**Owner:** `client/community/` and `client/comparisons/`

## 1. Objective

Create one reusable presentation contract for comparison previews and comparison
detail. The same components must serve the private `/comparisons/` workspace and
public Community posts without copying DOM construction, visual rules or
interaction behavior.

This requirement also improves ordinary Community media cards:

- clicking an image and clicking its title open the same destination;
- media is presented on a black background so light and transparent images are
  easy to inspect;
- the creator identity is visually more prominent;
- public comparison posts show their related images as one grouped item rather
  than unrelated feed cards.

## 2. Business Requirements

### 2.1 Community Card Activation

For image, template, collection and comparison posts:

- The media area and title are two accessible activators for the same post.
- Activation routes to `/community/:postId`.
- The feed must not open a different Lightbox workflow when the image is clicked.
- Keyboard users can activate the media with `Enter` or `Space`.
- Creator name is displayed directly below or beside the title with stronger
  weight and contrast than secondary metadata.
- Creator activation navigates to the creator profile and must not activate the
  post card.

### 2.2 Community Media Surface

- The media viewport uses solid black (`#000`) behind every image.
- Images use `object-fit: contain` in detail views so the full output remains
  inspectable.
- Feed cards may use a stable crop, but their empty area remains black.
- Loading, unavailable and removed media states remain readable and must not
  expose private output paths.

### 2.3 Comparison Group Preview

A comparison Community post represents one comparison set:

- Show up to three result images in a single grouped mosaic.
- Preserve the comparison slot order.
- If more than three results exist, show `+N` on the last visible tile.
- Failed or unavailable slots use a stable placeholder and do not resize the
  group.
- Clicking any visible image or the group title opens the same comparison detail.
- The grouped preview is reused by the private Comparison dashboard and the
  Community feed, with context-specific labels and actions supplied by options.

### 2.4 Comparison Detail

Opening a comparison from its image or title displays a workspace with the same
core composition as `/comparisons/`:

1. comparison title, creator and publication metadata;
2. side-by-side result images in slot order;
3. provider/model and result status per slot;
4. prompt disclosure below the image comparison;
5. Community engagement actions below the prompt;
6. comments after the engagement summary.

The prompt area must obey the authoritative public prompt-visibility policy.
`remix_only`, hidden and removed prompts must never be reconstructed from client
state or private Comparison data.

## 3. Winner and Community Vote Contract

Private owner selection and public voting are different concepts:

```text
ownerSelectedWinner  private evaluation decision made by the comparison owner
communityVoteLeader  public aggregate calculated from Community votes
```

Rules:

- A signed-in actor may cast one vote per comparison Community post.
- The post owner cannot vote on their own comparison.
- A vote targets a published comparison slot ID, not an image URL or array index.
- Changing a vote moves the actor's vote atomically to the new slot.
- The server returns aggregate vote counts per slot and the active actor's vote.
- Voter identities are not included in the public response.
- The highest count greater than zero receives a highlighted leader border.
- If multiple slots share the highest positive count, all are highlighted and
  labelled `Joint leader`.
- With zero votes, no result is visually declared the winner.
- Vote state is refreshed from the server after mutation; the client does not
  calculate an authoritative total.

Community-12 remains the only owner of vote persistence and engagement
aggregation. This requirement must not create another vote store.

## 4. Permission and Action Matrix

The presentation component receives resolved permissions. It must not infer
ownership from a username embedded in a post.

| Context | Allowed actions |
|---|---|
| Private comparison owner | Open result, set private winner, use owned compatible Face/Character/Style reference, add to Collection, download, publish |
| Public comparison owner | View aggregates, share public link, edit permitted post metadata, comment; cannot vote/report own post |
| Public signed-in viewer | Vote, like, save, share public link, comment and report |
| Public anonymous viewer | View only, unless future authentication policy enables another action |
| Admin/support | Normal public actions plus explicitly authorized moderation actions |

Face Reference, Character Reference and Style Reference controls are shown only
when all conditions are true:

- the current view is a private owned result;
- the actor owns or may reuse the referenced asset;
- the destination workflow supports that reference type;
- the server-provided permission permits the action.

These controls must be absent, not merely disabled, in a public Community
comparison. Public `Share` means Web Share API or copy-public-link fallback; it
does not duplicate or republish the post.

## 5. Shared Component Design

### 5.1 Comparison Mosaic

Canonical owner:

```text
client/comparisons/comparisonMosaic.js
```

Public API:

```js
window.ModelPromptForgeComparisons.createMosaic({
  mount,
  items,
  maxVisible: 3,
  label,
  context: "private" | "community",
  onActivate
});
```

`items` use a normalized presentation shape:

```text
id
imageUrl
thumbnailUrl
alt
status
providerLabel
modelLabel
```

The component owns only grouped media rendering, accessibility and activation.
It does not fetch posts, poll jobs, route, vote or enforce ownership.

### 5.2 Comparison Workspace

Canonical owner:

```text
client/comparisons/comparisonWorkspace.js
```

Public API:

```js
window.ModelPromptForgeComparisons.createWorkspace({
  mount,
  viewModel,
  options,
  permissions,
  actions
});
```

Return contract:

```text
update(nextViewModel)
focus()
destroy()
```

Supported options include:

```text
context: private | community
showCreator
showPrompt
showEngagement
showComments
showPrivateEvaluation
```

Supported action callbacks include:

```text
onSelectPrivateWinner
onVote
onLike
onSave
onShare
onComment
onReport
onOpenResult
onUseReference
onDownload
onPublish
```

The workspace owns the shared layout and rendering states. Controllers own API
calls, navigation, polling and mutations.

### 5.3 View Model Adapter

Canonical owner:

```text
client/comparisons/comparisonViewModel.js
```

It exposes separate adapters:

```text
fromPrivateComparisonSet(set, actorContext)
fromPublicCommunityPost(post, actorContext)
```

Both return `ComparisonWorkspaceViewModel`:

```text
id
context
title
creator
createdAt
promptDisclosure
results[]
ownerSelectedWinner
communityVoteSummary
engagementSummary
commentSummary
permissions
```

The public adapter accepts only the sanitized Community public view. Raw private
comparison records, output paths and reference payloads must never be passed to
the Community component.

## 6. Controller Ownership

Keep orchestration in existing feature controllers:

```text
client/comparison.js
  private loading, polling, private winner, references, download, collection

client/comparisons/comparisonSummaryCard.js
  private dashboard cards using ComparisonMosaic

client/community/communityFeed.js
  public feed cards and grouped comparison activation

client/community/communityPostDetail.js
  public post loading, vote, like, save, share, comment and report
```

No Community module may import private persistence state from
`client/comparison.js`. Shared presentation modules receive data and callbacks.

## 7. Server and Public Read Model

The Community public comparison response must include:

```text
postId
postType: comparison
title
creator public summary
createdAt
promptDisclosure
comparison.results[].slotId
comparison.results[].communityMediaUrl
comparison.results[].providerLabel
comparison.results[].modelLabel
comparison.results[].status
comparison.voteSummary.total
comparison.voteSummary.bySlot[]
comparison.voteSummary.actorSlotId
engagementSummary
permissions
```

It must not include:

```text
raw output paths
private job IDs
private comparison mutation tokens
private reference images or Base64
voter identities
hidden prompt text
owner-only winner mutation capability
```

`communityPostPublicView.js` remains the public sanitization boundary.
`CommunityEngagementService` remains the authoritative vote and aggregate owner.

## 8. Visual and Interaction Specification

- Image surfaces: `#000`.
- Shared media frames: maximum `8px` radius.
- Community leader state: high-contrast border and subtle outer emphasis; do not
  rely on color alone.
- Creator name: stronger weight/contrast than date, taxonomy and counters.
- Keep result tiles dimensionally stable while images load.
- The private Comparison workspace owns a functional vertical scroll container
  when results and prompt content exceed the viewport.
- Prompt panels in private Comparison and Community detail use the same read-only
  textarea component with compact text, a taller resizable inspection area and
  its own visible vertical scrollbar.
- On mobile, comparison results become a horizontal snap row or stacked list
  without reducing images below a useful inspection size.
- Prompt, engagement and comments follow the images in document order.
- Respect reduced-motion preferences.
- After voting, retain scroll position and update only affected counts/styles.

## 9. File-Level Implementation Plan

### New files

```text
client/comparisons/comparisonMosaic.js
client/comparisons/comparisonViewModel.js
client/comparisons/comparisonWorkspace.js
test/comparisonViewModel.test.js
test/communityComparisonPresentation.test.js
```

### Modified files

```text
client/index.html
client/style.css
client/comparison.js
client/comparisons/comparisonSummaryCard.js
client/community/communityFeed.js
client/community/communityPostDetail.js
client/community/communityEngagementApi.js
client/i18n/locales/en/community.json
client/i18n/locales/th/community.json
client/i18n/locales/en/comparisons.json
client/i18n/locales/th/comparisons.json
server/domain/community/CommunityEngagementService.js
server/domain/community/communityPostPublicView.js
```

Do not add a root-level comparison module. Browser scripts must be registered in
dependency order: view model and presentation components before their private
and Community controllers.

## 10. Implementation Sequence

1. Freeze the normalized view model and permission matrix in tests.
2. Extract `ComparisonMosaic` from existing private and Community card markup.
3. Extract `ComparisonWorkspace` from private result presentation without moving
   polling or API mutations into the component.
4. Adapt `/comparisons/` to the shared components and verify behavior parity.
5. Extend the sanitized public comparison read model with vote aggregates and
   resolved permissions.
6. Adapt Community feed and post detail to the shared components.
7. Wire engagement actions through existing Community APIs.
8. Add localization and responsive styles.
9. Run private/public permission, data-leak and browser interaction regression
   validation.

## 11. Input, Process and Output

```text
Input
  private Comparison set OR sanitized Community comparison post
  actor context
  server-resolved permissions

Process
  owning controller fetches data
  adapter normalizes data
  shared component renders
  controller handles callback
  server authorizes mutation
  controller refreshes view model

Output
  consistent grouped preview and comparison workspace
  context-appropriate actions
  authoritative public vote totals
  no private data leakage
```

## 12. Testing

### Automated

- Private and public adapters produce the same presentation shape.
- Public adapter cannot expose output paths, private job IDs or references.
- Image and title invoke the same activation callback exactly once.
- Mosaic preserves slot order and renders `+N`.
- Owner cannot vote on own public comparison.
- One actor has at most one active vote per post.
- Vote replacement updates both slot counts atomically.
- Zero-vote, unique-leader and tied-leader states render correctly.
- Public context never exposes Face/Character/Style Reference controls.
- Prompt visibility rules remain enforced.
- Existing private winner behavior remains independent of Community votes.

### Browser E2E

- Verify Community image, template, collection and comparison card activation.
- Verify creator link does not activate the post.
- Verify black media surface and prominent creator name.
- Verify grouped comparison preview in Community and `/comparisons/`.
- Verify public detail vote, like, share, comment and report flow.
- Verify private owner actions still work on `/comparisons/`.
- Verify desktop and mobile layouts, keyboard operation and reduced motion.

## 13. Acceptance Criteria

- Community image click and title click always open the same post.
- Comparison image click and title click always open the same comparison detail.
- Community comparison posts display one grouped comparison mosaic.
- `/comparisons/` and Community use the same mosaic and workspace presentation
  components.
- Public prompt and engagement appear below the compared images.
- Permission-ineligible controls are not rendered.
- Public votes are actor-scoped, server-authorized and visibly aggregated.
- The highest positive vote count is highlighted; ties are explicit.
- No private reference, output path or voter identity is present in public data.
- No duplicate engagement repository, vote formula or comparison workspace DOM
  implementation is introduced.
