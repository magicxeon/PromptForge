# 24. UI Improvement 1 - Output Controls, Mode-Specific Categories and Navigation Fade

**ID:** `024-ui-improvement-1`  
**Application:** `ModelPromptForge`  
**Status:** Implemented - pending visual verification  
**Feature type:** UX/UI refinement and mode-specific form cleanup  
**Depends on:** Requirement 017 - Config-driven Provider Registry, Requirement 023 - BytePlus ModelArk Seedream Provider, Requirement 022 - Application Navigation  
**Created:** 2026-07-15  
**Implementation authorization:** Approved for implementation

## 1. Objective

Reduce confusion in Studio by hiding controls and categories that do not affect the selected mode or provider, while keeping the interface professional and easy to scan.

This requirement covers:

- Output controls cleanup for providers that use provider-owned resolution presets.
- Headshot Grid category pruning.
- Character Sheet category pruning.
- Application navigation fade behavior when the user is at the top of the page.

## 2. Output Controls Problem

For providers such as Seedream and Grok, users see both:

- Provider/model resolution such as `1K`, `2K`, `4K`.
- Pixel dimensions such as `Width (px)` and `Height (px)`.
- Aspect ratio chips.

This is confusing because provider adapters do not use all of these fields in the same way.

Current understanding:

- Seedream uses `size` values such as `1K`, `2K`, `3K`, `4K`.
- Grok uses provider resolution values such as `1k`, `2k`.
- Aspect ratio is still meaningful for composition and supported-provider mapping.
- Pixel width/height are not the authoritative output size for Seedream or Grok.

## 3. Output Controls Decision

Do not show pixel `Width (px)` and `Height (px)` for providers/models whose output size is controlled by provider resolution presets.

Recommended UI behavior:

```text
Provider/model has capabilities.resolutions
-> show Output Resolution
-> show Aspect Ratio
-> hide Width (px) and Height (px)
```

```text
Provider/model does not expose capabilities.resolutions
-> show Width (px) and Height (px) only if the backend actually uses them
-> otherwise hide them
```

If width/height are retained for any provider, the UI label must make their role clear:

```text
Composition Size
```

or

```text
Legacy Pixel Guide
```

Do not display unused controls as if they directly control final output dimensions.

## 4. Headshot Grid Category Pruning

Headshot Grid should focus on face identity, beauty, camera framing and portrait consistency. It should not expose story, fashion commerce or full-scene controls.

### 4.1 Keep

Recommended Headshot Grid categories:

- Character basics
- Face
- Eyes
- Eyebrows
- Nose
- Lips
- Skin
- Hair
- Hair extra if it affects portrait appearance
- Expression
- Camera framing
- Camera
- Lighting
- Quality

### 4.2 Hide

Hide in Headshot Grid:

- Scene Story
- Fashion Direction
- Fashion Story
- Photographic Context if it introduces full-body/story context
- Body
- Clothing
- Pose
- Environment
- Foreground Layer
- Background Activity
- Architecture
- Fashion Commerce
- Product/commercial marketplace fields
- Accessories, unless later promoted as a small portrait accessory field
- NSFW unless explicitly enabled by policy

### 4.3 Rationale

Headshot output should answer:

```text
What does this face/identity look like across controlled portrait variations?
```

It should not ask:

```text
What is happening in the scene?
What campaign/fashion workflow is this?
What marketplace/commercial context is this?
```

## 5. Character Sheet Category Pruning

Character Sheet should focus on reusable identity and consistent full-body character design. It should not expose narrative or commercial campaign controls.

### 5.1 Keep

Recommended Character Sheet categories:

- Character basics
- Face
- Eyes
- Eyebrows
- Nose
- Lips
- Skin
- Hair
- Hair extra
- Body
- Clothing
- Expression
- Camera framing if used to control sheet layout
- Camera only if it affects consistency/readability
- Lighting
- Quality

Optional:

- Accessories, but only if framed as signature character details.

### 5.2 Hide

Hide in Character Sheet:

- Scene Story
- Fashion Direction
- Fashion Story
- Photographic Context
- Environment
- Foreground Layer
- Background Activity
- Architecture
- Fashion Commerce
- Product/commercial marketplace fields
- Storytelling-specific pose/action fields
- NSFW unless explicitly enabled by policy

### 5.3 Rationale

Character Sheet output should answer:

```text
Who is this character, what do they look like, and how can we reuse them?
```

It should not answer:

```text
What ad scene are they in?
What fashion campaign are they performing?
What marketplace image are we producing?
```

## 6. Story Mode Boundary

Story Mode remains the mode where these categories make sense:

- Scene Story
- Fashion Direction
- Fashion Story
- Photographic Context
- Pose
- Environment
- Foreground/background layers
- Fashion commerce fields
- Architecture/location fields when relevant
- Accessories as styling/commercial details

Do not remove these categories globally. Hide them only for modes where they create noise.

## 7. Navigation Fade Behavior

The application navigation currently stays visible at the top and may cover or visually compete with the main workspace.

Desired behavior:

- When the page is at the very top and the user is not scrolling, navigation becomes subtle/faded.
- When the user scrolls down, navigation becomes visible and usable.
- When navigation receives focus or hover, it becomes fully visible.
- The behavior must not hide navigation from keyboard users.
- The behavior must not break mobile menu access.

Recommended CSS/JS behavior:

```text
body at top + no hover/focus
-> nav opacity reduced
-> nav pointer behavior remains safe for menu button
```

```text
scrollY > threshold OR nav hover OR nav focus-within OR mobile menu open
-> nav opacity 1
```

Suggested threshold:

```text
scrollY > 24px
```

The fade should feel polished, not flickery.

## 8. Implementation Notes

### 8.1 Provider Output Controls

Use provider registry metadata:

```text
model.capabilities.resolutions
model.defaults.resolution
model.capabilities.aspectRatios
```

Avoid provider-name conditionals where possible. Capability-driven behavior is preferred.

### 8.2 Mode Category Filtering

Mode filtering should be driven by a clear allowlist or hide-list that can be reviewed.

Recommended direction:

```javascript
MODE_CATEGORY_POLICY = {
  headshot: {
    include: [...]
  },
  "character-sheet": {
    include: [...]
  },
  normal: {
    include: "all"
  }
}
```

The same policy should affect:

- rendered accordion groups
- prompt compilation
- preset import behavior
- validation
- saved session restore

If a hidden category exists in imported preset JSON, it should not leak into prompt compilation for that mode.

## 9. Acceptance Criteria

- Seedream and Grok show provider resolution controls without unused pixel width/height fields.
- Aspect Ratio remains visible when supported by the selected model.
- Headshot Grid no longer shows Scene Story, Fashion Direction or full-scene/commercial categories.
- Character Sheet no longer shows Scene Story, Fashion Direction or full-scene/commercial categories.
- Story Mode still has access to story, fashion, environment and commercial categories.
- Preset import/session restore cannot compile hidden mode-incompatible categories.
- Navigation fades at page top but becomes clear on scroll, hover and keyboard focus.
- Mobile menu remains discoverable and accessible.
- Existing provider registry, comparison and generation tests remain passing.

## 10. Open Review Questions

- Should Headshot Grid keep `Accessories` for items like earrings, glasses and hair ornaments, or should those wait for a dedicated portrait accessory field?
- Should Character Sheet keep `Pose`, or should pose be replaced by a fixed sheet-layout instruction controlled by the mode template?
- Should pixel width/height be removed entirely from the UI if no active provider uses them as true output dimensions?
