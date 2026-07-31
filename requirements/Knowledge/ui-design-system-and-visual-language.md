# Momelo UI Design System and Visual Language

**Status:** Canonical React UI reference  
**Applies to:** Every customer-visible route under `web/src/`

## 1. Required Visual References

Before implementing a page, inspect:

1. `requirements/008-implement-adjusment-ui/001-landing-page_rewamp.png`
2. `requirements/008-implement-adjusment-ui/001-logo-and-icon.png`
3. the feature-specific reference image named by its owning requirement

Reference images communicate hierarchy and visual character. Current API,
ownership, accessibility, and component contracts remain authoritative over
literal mockup content.

## 2. Product Character

Momelo is a professional visual creation workspace and community. The interface
is media-first, compact, and precise. Momelo Neon uses Cyan, Violet and Magenta;
Pearl Editorial uses light neutral surfaces; Electric Studio uses deep Wine,
Crimson and Coral. Accent colors support the work rather than becoming
page-wide decoration.

Generated work should command attention. Navigation, filters, metadata, and
system information support the media instead of competing with it.

## 3. Typography

- English: Poppins, weight 500 by default.
- Thai: Noto Sans Thai, weight 500 by default.
- Do not use viewport-width font scaling.
- Letter spacing is `0`.
- Use page-scale headings only for true page titles or hero content.
- Compact panels, cards, sidebars, and metadata use smaller, tighter type.

## 4. Color and Surfaces

Canonical tokens live in `web/src/styles/tokens.css`.
Theme palette overrides live in `web/src/styles/themes.css`, and preference
behavior is owned by
`requirements/012-implementation-adjustment-ui-2/`.

- Default and Creative backgrounds are near-black, never a one-note blue/slate
  field. Fashion uses a cool Pearl canvas with high-contrast editorial ink.
- Raised surfaces: subtly lighter than the page.
- Borders: low-contrast neutral borders; semantic Primary is reserved for
  active/focused state.
- Brand/action gradients are reserved for primary action or selected emphasis.
- Success, warning, danger, and focus colors use their semantic tokens.

Available resolved themes:

```text
default  Momelo Neon
fashion  Pearl Editorial
creative Electric Studio
```

Shared components consume `--theme-*` or compatible `--mpf-*` aliases. Do not
hard-code Cyan, Magenta, white text or black controls in new shared components.

Main page sections may use the shared `.mpf-section-surface` treatment:

- one-pixel restrained border;
- maximum `8px` corner radius;
- modest internal padding;
- clear spacing from adjacent sections;
- no nested decorative cards.

## 5. Spacing and Density

- Keep a clear rhythm between page sections.
- Toolbars and filter strips are compact; default target height is `32px`.
- Primary actions remain at least `40px` high.
- Touch targets on mobile must remain practical even when their visual content
  is compact.
- Fixed-format controls must have stable dimensions so labels and state changes
  do not shift the layout.

## 6. Navigation

- The active route has full contrast and a semantic Primary accent.
- Inactive routes are visibly dimmed but retain readable contrast.
- Hover and focus raise inactive contrast.
- Studio owns the nested Face Creator, Character Sheet, and Scene Builder
  routes.
- Mobile navigation uses a drawer with focus restoration and Escape support.
- Internal links use React Router primitives.

## 7. Media

- Use `cover` for discovery cards and `contain` when the user must inspect the
  complete generated output.
- Do not darken, blur, or crop primary inspection media unnecessarily.
- Media cards may be repeated items; page sections themselves should remain
  structural rather than card-heavy.
- Empty, loading, error, and permission states must preserve the intended media
  dimensions.

## 8. Controls

- Use Lucide icons for familiar actions.
- Use icon-only buttons only for universally understood actions, with accessible
  labels and tooltips.
- Segmented controls are appropriate for mutually exclusive compact filters.
- Unsupported provider/model controls are hidden rather than disabled without
  explanation.
- Primary, secondary, destructive, selected, and unavailable states must be
  visually distinct without relying on color alone.

## 9. Footer

The application footer is owned once by `AppShell`:

1. `SystemStatusFooter` communicates API gateway and dependent service
   availability.
2. `SiteFooter` contains product identity, contact, documentation/blog
   placeholders, legal placeholders, copyright, and package version.

Unimplemented destinations appear disabled and never point to fake routes.

## 10. Responsive and Accessibility Gate

For substantial UI work, validate at least:

- desktop at approximately `1440px`;
- mobile at approximately `390px`;
- Thai and English labels;
- keyboard navigation and visible focus;
- no overlap, clipping, inaccessible controls, or unintended horizontal page
  scrolling;
- reduced-motion behavior where animation exists.

## 11. Component Decision Rule

Create or extend a shared component when the same visual behavior appears on
multiple routes or is shell-owned. Keep route data orchestration within
`web/src/features/<feature>/`; shared visual components belong under
`web/src/components/`.

Do not duplicate markup simply to match a screenshot. Build a reusable contract
whose variants are explicit and typed.
