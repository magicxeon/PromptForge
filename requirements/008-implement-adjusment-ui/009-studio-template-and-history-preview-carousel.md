# UI-009 Studio Template and History Preview Carousel

**Status:** Implemented; attention-crop extension pending validation  
**Owners:** Shared React media components, Scene Builder, server asset presentation and Creator Profile integration

## 1. Business Requirement

Scene Builder must provide quick access to recent History images and shared
Templates without rendering an unbounded horizontal row that clips cards or
turns Studio into a second library page.

Users must be able to:

1. inspect a compact preview subset without content leaving the panel;
2. move backward or forward approximately two cards per action;
3. select a History image or use a shared Template without leaving Studio; and
4. open their Creator Profile Gallery or Templates tab when they need the full
   collection.

## 2. Functional Requirements

### 2.1 Shared Carousel Behavior

- Both rows use one reusable `HorizontalMediaCarousel`.
- The viewport clips overflow internally and does not create horizontal page
  scrolling.
- Previous and Next use Lucide icon buttons with localized accessible labels.
- One navigation action advances by two measured card widths.
- The carousel updates button availability after scrolling, resizing or item
  changes.
- Reduced-motion preference disables smooth scrolling.
- Keyboard users can focus every card, navigation control and View-all link.
- Cards retain stable dimensions at desktop and mobile widths.

### 2.2 Preview Limits

- Shared Templates renders at most four Template cards before the terminal
  profile action.
- History renders at most eight image cards before the terminal profile action.
- The complete dataset remains owned by its existing paginated destination;
  the carousel must not add a second pagination or infinite-scroll contract.

### 2.3 Creator Profile Handoff

- Scene Builder resolves the active actor's canonical Creator Profile through
  `GET /api/community/creator-profiles/me`.
- It must use the returned `handle`; it must not derive a durable profile URL
  from `username`.
- Shared Templates links to `/creators/:handle/templates`.
- History links to `/creators/:handle/gallery`.
- If the profile query is unavailable, Studio selection remains functional and
  only the terminal profile action is omitted.

### 2.4 Full-frame, Person-focused Template Presentation

- Shared Template cards fill their stable `16:10` media frame without black
  letterbox bars.
- The card must use the server-approved `template-card-person-focus`
  presentation URL rather than applying an arbitrary crop profile in React.
- The presentation uses Sharp `fit: cover` with
  `sharp.strategy.attention`. This is a local content-aware crop and does not
  call an AI provider.
- The existing `preview-v1`, original image, Detail, Fullscreen and Download
  contracts remain unchanged. They must not inherit the card crop.
- The crop pipeline prefers the authorized `preview-v1` source and falls back
  through the existing media resolver when a legacy post has only an original;
  it does not decode the original needlessly when a suitable preview exists.
- If presentation rendering fails, the card falls back to the existing
  thumbnail/image URL with `object-fit: cover`; Template selection remains
  available.
- Unknown profile names fail closed with a stable `404` and must never allow
  arbitrary client-controlled Sharp options.

## 3. Software Design

```text
web/src/components/media/HorizontalMediaCarousel.tsx
  reusable measured carousel, controls and terminal route link

web/src/styles/media-carousel.css
  shared dimensions, clipping, controls and responsive behavior

web/src/features/scene-builder/components/SharedTemplatePanel.tsx
  Template query and Template-card adapter

web/src/features/scene-builder/components/HistoryReferencePicker.tsx
  actor-owned History query, role selector and image-card adapter

web/src/features/scene-builder/routes/SceneBuilderRoute.tsx
  own-profile query and destination URL orchestration

web/src/features/profiles/api/profileApi.ts
web/src/features/profiles/schemas/profileSchemas.ts
  typed own-profile API boundary

server/domain/assets/ImagePresentationService.js
  allowlisted Sharp presentation profiles, bounded in-memory cache and
  attention-crop rendering

server/app/routes/sceneTemplateRoutes.js
  actor-authorized Template presentation endpoint

server/domain/community/communityPostPublicView.js
  server-owned presentation URL projection
```

`HorizontalMediaCarousel` is presentational. It receives heading, toolbar,
children, item sizing and an optional View-all destination. It must not fetch
Templates, History or profile data.

## 4. Implementation Plan

1. Add the minimal own-profile Zod schema and API function.
2. Add the reusable carousel with two-item measured scrolling.
3. Add shared carousel CSS to the global style entry.
4. Adapt Shared Templates to four cards and the Templates profile tab.
5. Adapt History to eight cards and the Gallery profile tab.
6. Resolve the active profile once in `SceneBuilderRoute`.
7. Add enabled-locale strings and component tests.
8. Validate desktop, mobile, keyboard navigation and actor switching.
9. Add the allowlisted person-focused presentation profile and bounded cache.
10. Expose its URL through the public post contract after existing post access
    checks.
11. Render Shared Template media from that URL with a non-blocking fallback.

## 5. Impact and Concerns

- **Identity:** actor switching changes the profile query key and destination.
- **Ownership:** History remains actor-scoped through the existing API client.
- **Performance:** only preview subsets mount in Studio.
- **Image processing:** Sharp work is cached by source path, source
  modification metadata and profile. The cache is bounded and is not a new
  durable runtime-data store. Card rendering normally starts from the existing
  `preview-v1` to keep CPU and memory bounded.
- **Security:** presentation rendering occurs only after the existing Community
  visibility policy resolves an authorized local source file. Clients cannot
  submit dimensions, output formats or Sharp operations.
- **Navigation:** internal destinations use React Router links.
- **Accessibility:** disabled arrows remain discoverable by label and controls
  do not rely on icon shape alone.
- **Reuse:** no Scene Builder API or state is embedded in the shared carousel.

## 6. Testing

### Automated

- Carousel renders children and optional View-all destination.
- Next and Previous scroll by two measured items.
- Template and History panels apply their preview limits.
- Own-profile response is validated before building profile URLs.
- Actor-relative profile query keys change on actor switch.
- Attention profile resolves to `640x400`, `cover`, WebP and Sharp attention.
- Repeated requests for an unchanged source/profile use the bounded cache.
- Unknown profiles return the stable not-found contract.

### Manual

1. Open `/studio/scene`.
2. Verify Shared Templates and History remain inside their panel.
3. Use Previous and Next with mouse and keyboard.
4. Confirm each action moves approximately two cards.
5. Select a Template and a History image.
6. Open View all and verify Templates/Gallery tabs on the active profile.
7. Repeat at desktop `1440px` and mobile `390px`.
8. Confirm portrait Template subjects retain the important face/person region,
   fill the card, and show no black letterbox bars.
9. Open the same work in Detail/Fullscreen and verify the complete original is
   still shown.

## 7. Acceptance Criteria

- Neither row clips inaccessible content or expands the page horizontally.
- Both rows use the same reusable carousel implementation.
- Studio shows only a bounded preview subset.
- Full browsing is handed off to the actor's canonical Creator Profile.
- Existing Template and History selection behavior remains unchanged.
- Shared Template cards use a full-frame attention crop while inspection and
  download surfaces retain their prior uncropped media contracts.
