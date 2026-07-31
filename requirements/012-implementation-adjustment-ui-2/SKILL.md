---
name: finalize-momelo-ux-ui-and-themes
description: Design, implement, review or refine Momelo React UX/UI, CSS architecture, responsive web layouts and semantic themes. Use for visual hierarchy, theme tokens, shared components, profile theme preferences, accessibility, responsive behavior, CSS cleanup and screenshot-driven interface work under web/.
---

# Finalize Momelo UX/UI And Themes

## Required Reading

1. `AGENTS.md`
2. the owning feature requirement
3. `requirements/Knowledge/ui-design-system-and-visual-language.md`
4. `requirements/012-implementation-adjustment-ui-2/000-master-finalize-ux-ui-roadmap.md`
5. the visual reference named by the feature
6. current React component, CSS and tests

## Workflow

1. Identify the user goal and shortest valid task path.
2. Inventory existing shared primitives before creating markup.
3. Separate feature orchestration from presentation.
4. Express color intent through semantic tokens.
5. Preserve media prominence and stable control dimensions.
6. Implement loading, empty, warning, error, disabled and success states.
7. Validate keyboard, focus, labels, contrast and reduced motion.
8. Check English and Thai at desktop and mobile widths.
9. Add focused tests and report remaining visual risk.

## UX Rules

- Keep one obvious Primary action per decision point.
- Hide optional/advanced controls until requested.
- Use progressive disclosure instead of adding workflow steps.
- Keep summaries close to billable confirmation actions.
- Use plain customer language; do not expose internal domain terms.
- Never rely on color alone for status or permission.
- Preserve navigation context and actor-owned drafts.

## CSS And Theme Rules

- Use `--theme-*` semantic values and existing `--mpf-*` compatibility tokens.
- Never hard-code a brand hue in a new shared component.
- Keep layout tokens independent from color themes.
- Use one component contract with typed variants instead of theme-specific DOM.
- Avoid nested cards, excessive gradients and decorative color fields.
- Use `contain` for inspection media and `cover` only for discovery previews.
- Keep forms and buttons at the shared radius and stable target height.
- Do not animate global color properties during theme changes.

## Web Design Review

- Confirm hierarchy works without reading helper paragraphs.
- Make the actual work, image or result the strongest visual signal.
- Keep desktop density professional and mobile touch targets usable.
- Check long Thai labels, empty data and partial failures.
- Ensure sidebars, sticky panels and dialogs do not clip content.
- Use Lucide icons with accessible labels/tooltips.

## Theme Persistence

- Read and write through `web/src/lib/persistence/actorScopedStorage.ts`.
- Keep Theme Provider inside Actor Provider.
- Store only validated preference identifiers.
- Rehydrate on Actor switch.
- Keep public Creator Profile free of private UI preferences.

## Validation Handoff

Report:

```text
behavior and routes affected
shared components/tokens changed
persistence and actor impact
localization keys added
desktop/mobile checks
commands the user must run
remaining hard-coded color or visual gap
```

