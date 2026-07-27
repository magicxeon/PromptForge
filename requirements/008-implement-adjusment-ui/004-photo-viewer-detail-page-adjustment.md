# UI Adjustment 004 - Community Photo Viewer Detail Page

**Status:** Implemented, pending automated and visual validation  
**Owning capability:** Community public post detail  
**Route:** `/community/:postId`  
**Depends on:** Community public snapshot, engagement, creator portfolio, and
Scene Template handoff contracts

## 1. Visual Reference

Use [`004-photo-viewer.png`](./004-photo-viewer.png) as the directional
reference for:

- a large, dominant artwork stage
- compact creator, category, title, and description hierarchy
- a cyan-magenta Prompt card
- separate engagement and workflow actions
- generation metadata
- compact Comments
- four additional public works from the same creator

The mockup is not a pixel-perfect instruction. The existing application shell,
navigation, search, credit balance, actor controls, localization, accessibility,
ownership policy, and responsive conventions remain authoritative.

### Required Differences From The Mockup

- The full-page Photo Viewer replaces Lightbox for Community image and template
  post details. Clicking the primary artwork must not open Lightbox.
- Keep direct icon-only Fullscreen and Download controls on the media stage,
  with localized accessible names and hover tooltips.
- Do not show `Remix this image` until a generic image-remix handoff contract is
  implemented.
- Show `Use Template` as the primary CTA only when the server public projection
  reports `templateAvailability: true`.
- Show `Add to collection` as a disabled, visibly unavailable placeholder in
  this phase. Do not mutate the existing History collection contract.
- Do not show or implement `Create character` on this page.
- Do not copy the mockup sidebar or header. Use the current application shell.

## 2. Business Requirement

The Community Photo Viewer must let a visitor understand, inspect, engage with,
and reuse a public image without opening another modal.

A visitor must be able to:

1. see the complete artwork as the visual focus
2. identify its creator, category, title, and description
3. inspect the publicly shared Prompt according to creator visibility policy
4. copy the visible Prompt and expand long Prompt text
5. Like, Save, and Share the post
6. inspect Model, Aspect Ratio, and image dimensions when available
7. use a reusable Scene Template when permission permits
8. read or add comments
9. continue to four other public works from the same creator

The page must not expose private prompts, source output paths, private
references, internal generation records, or owner-only controls.

## 3. Functional Scope

### 3.1 Supported Post Types

The Photo Viewer component owns:

- `image`
- `template`

Existing specialized detail views remain authoritative for:

- `comparison`
- `collection`

These specialized views must not be forced into the single-image layout.

### 3.2 Artwork Stage

- Use a black media background.
- Display the complete image with `object-fit: contain`.
- Prefer available vertical space and reduce decorative whitespace.
- Keep a stable stage height without cropping the image.
- Fullscreen invokes the browser Fullscreen API on the stage.
- Download targets the authorized public media endpoint.
- Image click performs no Lightbox action.
- If the image cannot load, show a localized unavailable state.
- Use `loading="eager"` for the primary artwork.

### 3.3 Information Hierarchy

Display in this order:

1. creator identity linking to `/creators/:handle`
2. primary category or content type
3. post title
4. description
5. Like, Save, Share action bar
6. Prompt card
7. generation metadata
8. primary and secondary workflow actions

Category selection priority:

1. first public official tag
2. first public taxonomy category code
3. localized post type

Do not infer creator or taxonomy data from the image.

### 3.4 Prompt Card

- Render the Prompt only from `promptPreview`.
- Hidden prompts show the existing localized hidden state.
- Use a restrained cyan-magenta border without a large outer glow.
- Collapse long prompts visually to a compact preview.
- Show `Show more` / `Show less` only when expansion is useful.
- Show `Copy` only when public Prompt text exists.
- Copy exactly the public Prompt returned by the server.
- Display a short localized copied state without resizing the layout.

The server public projection may return the complete approved public Prompt.
Prompt visibility sanitization remains authoritative before projection.

### 3.5 Actions

Engagement Action Bar:

- Like with current count and active state
- Save with current count and active state
- Share using native share when supported, otherwise copy the public URL
- Report remains available to non-owners as a subdued utility action

Primary workflow:

```text
templateAvailability === true -> Use Template
otherwise                     -> no primary workflow CTA
```

`remixAvailability` is descriptive server data only in this phase. A generic
`Remix this image` button must not be rendered until its destination state,
prompt/reference transfer, ownership policy, and generation provenance are
defined.

Secondary workflow:

```text
Add to collection -> visible, disabled, localized "Coming soon" explanation
Create character  -> absent
```

### 3.6 Generation Metadata

The public view may expose only this allowlisted metadata:

```js
{
  providerModelDisplay: string | null,
  generationMetadata: {
    aspectRatio: string | null,
    width: number | null,
    height: number | null,
    resolution: string | null
  }
}
```

Read values from the sanitized `workflowSnapshot.generationSettings` or the
sanitized Scene Template generation settings. Never return the raw workflow or
template snapshot.

For older posts:

- derive width and height from `HTMLImageElement.naturalWidth/naturalHeight`
- derive a reduced integer aspect ratio only when no public aspect ratio exists
- hide Model when unavailable
- never fabricate a model or resolution

### 3.7 Comments

- Use the existing Community engagement API.
- Keep the editor to two rows and one clear Post command.
- Show the comment count in the heading.
- Render a localized empty state when no comments exist.
- Preserve server-provided delete permission.
- Comment failures must leave the existing page usable.

### 3.8 More From Creator

- Request public portfolio posts from
  `GET /api/community/creators/:handle/posts`.
- Request up to five records so the current post can be removed.
- Render at most four records with valid public thumbnail or image URLs.
- Exclude the active post.
- Each card navigates to `/community/:postId`; it must not open Lightbox.
- `View all` navigates to `/creators/:handle`.
- Hide the complete section when the creator handle is unavailable, the request
  fails, or no other public work exists.
- Failure is non-blocking and must not replace the main post with an error.

## 4. Layout And Responsive Behavior

### Desktop

Use a two-column composition:

```text
Main:  minmax(0, 1.55fr)  -> artwork and Comments
Aside: minmax(320px, 0.75fr) -> post information and actions
Bottom full width: More from Creator
```

- The main artwork should use approximately 60-70% of available content width.
- The aside may remain sticky only when it does not trap page scrolling.
- Keep cards at 6px radius or less.
- Avoid cards nested inside decorative cards.

### Tablet And Mobile

Below the existing application breakpoint:

```text
Back/breadcrumb
Artwork
Post information
Engagement
Prompt
Metadata
Workflow
Comments
More from Creator
```

- Action controls wrap without clipping.
- The artwork remains fully visible.
- More-from cards become a horizontal scroll row or compact two-column grid.
- Text and controls must not overlap the shell.

## 5. Component Contract

Create `client/community/communityPhotoViewer.js`.

It is a presentation component and must not call APIs directly.

Input:

```js
render({
  mount,
  post,
  engagement,
  onLike,
  onSave,
  onShare,
  onReport,
  onUseTemplate
})
```

Output:

```js
{
  mediaElement,
  updateEngagement(nextEngagement),
  destroy()
}
```

Responsibilities:

- image stage and direct media controls
- creator/title/category/description hierarchy
- engagement action bar
- Prompt disclosure/copy behavior
- metadata presentation and image-dimension fallback
- permission-aware workflow controls

`communityPostDetail.js` remains the controller for loading data, mutation
callbacks, Comments, creator portfolio, route transitions, and choosing between
Photo Viewer, Comparison, and Collection detail layouts.

## 6. Data Flow

```text
/community/:postId
  -> CommunityPostDetail loads public post + engagement + comments
  -> public post selects image/template Photo Viewer
  -> CommunityPhotoViewer renders sanitized public projection
  -> controller optionally loads creator portfolio
  -> engagement callbacks mutate through CommunityEngagementApi
  -> controller reloads authoritative state
```

Template use:

```text
Use Template
  -> CommunityTemplateActions.usePostTemplate(postId)
  -> server revalidates visibility and reuse policy
  -> sanitized Scene Template handoff
  -> Scene Builder replacement workflow
```

## 7. File-Level Implementation Plan

### New client module

`client/community/communityPhotoViewer.js`

- implement the presentation contract in Section 5
- use the existing global/IIFE module convention
- expose `window.ModelPromptForgeCommunityPhotoViewer`

### Modified client modules

`client/community/communityPostDetail.js`

- stop opening Lightbox for image/template post details
- delegate image/template rendering to Community Photo Viewer
- retain specialized Comparison and Collection renderers
- add compact comment empty state and count
- load and render four additional creator works
- remove Community detail `Create character`
- retain API ownership in the controller

`client/community/communityCreatorApi.js`

- reuse `getPortfolio`; no parallel API client

`client/index.html`

- register `communityPhotoViewer.js` after its dependencies and before
  `communityPostDetail.js`

`client/style.css`

- implement page, stage, aside, Prompt, metadata, action, comment, and
  more-from responsive styles
- remove zoom cursor behavior from the full-page artwork

`client/i18n/locales/{en,th,ja}/community.json`

- add labels for Fullscreen, Download, Copy, copied state, Show more/less,
  metadata, disabled Collection action, Comments empty state, and More from
  Creator
- preserve catalog key parity

### Modified server module

`server/domain/community/communityPostPublicView.js`

- expose only allowlisted generation metadata
- return the complete approved public Prompt rather than a UI-truncated value
- preserve all prompt visibility and private snapshot exclusions

### Tests

`test/communityPublicSnapshot.test.js`

- assert metadata allowlist
- assert private workflow fields remain absent
- assert hidden Prompt remains absent
- assert approved long public Prompt is preserved

`test/communityPhotoViewerContract.test.js`

- static contract checks for no Lightbox call in the Photo Viewer
- assert no Create character action
- assert generic Remix is not rendered
- assert Add to collection is disabled
- assert template CTA is permission-driven

## 8. Acceptance Criteria

1. Opening an image or template post shows the full-page Photo Viewer.
2. Clicking the artwork does not open Lightbox.
3. Fullscreen and Download are available from the artwork stage.
4. Creator, category, title, and description are easy to scan.
5. Like, Save, and Share use the existing engagement behavior.
6. Prompt Copy and Show more respect public prompt visibility.
7. Model, aspect ratio, and size show only available public values.
8. `Use Template` appears only for reusable templates.
9. `Remix this image` and `Create character` do not appear.
10. `Add to collection` is visible but disabled.
11. Comments show a compact empty state when appropriate.
12. Up to four other public creator works appear and navigate without Lightbox.
13. Comparison and Collection detail pages retain their specialized layouts.
14. Desktop and mobile layouts contain no clipped or overlapping content.

## 9. Validation

Static:

```bat
node --check client\community\communityPhotoViewer.js
node --check client\community\communityPostDetail.js
node --check server\domain\community\communityPostPublicView.js
node scripts\validate-i18n-catalogs.js
```

Automated:

```bat
node --test test\communityPublicSnapshot.test.js test\communityPhotoViewerContract.test.js
```

Manual:

1. Open a public image post and confirm no Lightbox opens from the artwork.
2. Test Fullscreen, Download, Prompt Copy, and Show more.
3. Like, Save, Share, add a comment, and reload.
4. Open a reusable template and confirm `Use Template` enters Scene Builder.
5. Open a view-only image and confirm no primary workflow CTA appears.
6. Confirm Add to collection is disabled and Create character is absent.
7. Open another work in More from Creator and verify route history/back.
8. Verify desktop and mobile widths.
