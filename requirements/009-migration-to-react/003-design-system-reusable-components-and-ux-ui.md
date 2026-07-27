# 003 Design System, Reusable Components and UX/UI

**Status:** Foundation gate  
**Depends on:** 002 workspace

## 1. Business Requirement

ModelPromptForge needs one coherent interaction language across Community,
Profiles, Fashion, Studio, Playground and Admin. A visual or accessibility fix
to a shared control must propagate without copying markup or CSS between pages.

## 2. Visual Direction

Use the current Momelo references as directional evidence:

```text
requirements/008-implement-adjusment-ui/001-landing-page_rewamp.png
requirements/008-implement-adjusment-ui/002-mode-character.png
requirements/008-implement-adjusment-ui/003-freeform-generation.png
requirements/008-implement-adjusment-ui/004-photo-viewer.png
requirements/007-implement-user-profile/user-profile-concpet.png
```

The images are not literal pixel specifications. Preserve product hierarchy,
real data, capability rules, permissions, localization and responsive behavior.

## 3. Styling Architecture

Use:

- Tailwind for layout, spacing, responsive rules and component composition;
- CSS custom properties for semantic design tokens;
- Radix UI for accessible primitive behavior;
- Lucide for consistent icons;
- component variants for size, intent and state.

Required token groups:

```text
color background/surface/text/border/action/status
spacing
font family/size/weight/line height
radius
shadow
focus ring
motion duration/easing
z-index layers
breakpoints/content widths
media aspect/stage dimensions
```

Do not paste the full legacy stylesheet into React. Extract intentional tokens
and rebuild components. Temporary legacy matching CSS must be route-scoped and
tracked for removal.

## 4. Component Layers

### UI primitives

```text
Button
IconButton
Input
Textarea
Checkbox
RadioGroup
Switch
Select
Combobox
ColorPicker
Slider
Tabs
Badge
Tooltip
Popover
Menu
Dialog
AlertDialog
Drawer
Toast
Progress
Skeleton
EmptyState
ErrorState
Pagination
```

### Layout

```text
AppShell
GlobalHeader
Sidebar
Breadcrumbs
PageHeader
PageSection
ResponsiveRail
StickyActionArea
```

### Media

```text
SmartImage
MediaCard
MediaGrid
MediaRail
MediaStage
PhotoViewer
ThumbnailStrip
FullscreenAction
DownloadAction
```

### Product components

```text
CreatorIdentity
CreatorStats
ProfileTabs
EngagementBar
CommentThread
ShareDialog
ReportDialog
ComparisonSummary
ComparisonWorkspace
PromptEditor
ReferenceSlotGrid
EngineTargetPanel
CreditEstimate
GenerationActionBar
GenerationResultSurface
VisualOptionPicker
```

Product components compose primitives. They may not bypass primitives with a
second private button/dialog system.

## 5. Component API Rules

Every reusable component must:

- receive data and callbacks through typed props;
- expose controlled state when parent workflows need authority;
- support loading, empty, error, disabled and permission-hidden states;
- avoid API calls unless it is explicitly a data-bound feature container;
- avoid reading global workflow state;
- provide accessible names for icon-only actions;
- allow feature variants through finite options, not arbitrary boolean growth;
- document intended reuse and non-goals.

Prefer:

```ts
<GenerationPanel mode="comparison" capabilities={...} />
```

over:

```ts
<GenerationPanel
  hideNormalModel
  enableComparison
  hideResolutionSometimes
  useSpecialCredits
/>
```

Use discriminated unions for materially different modes.

## 6. UX Interaction Rules

- Community is the home route.
- Create workflows have obvious entry points and preserve context.
- Breadcrumb/back behavior returns to the actual parent context.
- Generate scrolls to active progress/result; Edit returns to the controlling input.
- Empty result areas stay collapsed until actionable.
- Unsupported capability controls are absent, not misleadingly editable.
- Destructive and billable actions require clear confirmation.
- Credit estimate is visible before billable submission.
- Loading must preserve layout dimensions.
- Long lists use cursor pagination or bounded virtualized presentation.
- Do not nest decorative cards.
- Cards use radius 8px or less unless a token explicitly defines otherwise.

## 7. Media and Responsive Rules

- Preserve full primary artwork with `object-fit: contain`.
- Use intentional focal positioning only for thumbnails.
- Never crop a full-body required view in a detail surface.
- Stable aspect ratio containers prevent layout shift.
- Desktop and mobile layouts must not overlap header, controls or text.
- Fixed toolbars and carousels retain stable dimensions.
- Horizontal rails support keyboard and touch navigation with hidden visual
  scrollbars only when another clear navigation affordance exists.

## 8. Accessibility

Target WCAG 2.2 AA for customer workflows:

- semantic landmarks and headings;
- keyboard-complete operation;
- visible focus;
- dialog focus trap and restoration;
- form label/error association;
- status announcements for async operations;
- contrast-compliant text and controls;
- reduced-motion support;
- minimum practical touch targets;
- no color-only status;
- logical reading order after responsive rearrangement.

Radix behavior is a foundation, not proof of accessibility. Product compositions
still require tests.

## 9. UX/UI Validation

Each substantial route requires:

- desktop screenshot;
- narrow mobile screenshot;
- keyboard walkthrough;
- longest enabled-locale content check;
- loading/empty/error screenshots;
- permission-state comparison;
- no-overlap and horizontal-overflow check;
- image loading/failure check.

Use Playwright for route-level visual evidence. A component gallery route may
exist only in development and must not ship as public navigation.

## 10. Acceptance Criteria

- Shared primitives are used by at least Community and Profile before the system expands.
- No migrated route imports legacy CSS.
- No duplicate dialog, button or engagement implementation exists.
- Thai, English and Japanese labels fit supported layouts.
- Components meet keyboard and focus requirements.
- Token changes propagate predictably across migrated routes.

