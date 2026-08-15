# Frontend Agent Instructions

This file extends the repository root `AGENTS.md` for work launched under
`web/`. Root architecture, security, ownership and approval rules still apply.

## Professional Owner

For material user-facing workflows, read
`requirements/009-migration-to-react/roles/ux-ui-product-designer.md` and use
the `review-product-ux` Skill when its trigger matches. Tiny local copy or CSS
corrections remain under the base implementation owner.

## Frontend Deltas

- Read `requirements/009-migration-to-react/SKILL.md` and the owning feature
  requirement before implementation.
- Read `requirements/Knowledge/ui-design-system-and-visual-language.md` before
  substantial visible UI changes.
- Keep business workflows in their owning feature/domain contracts; shared UI
  receives normalized state and callbacks.
- Preserve theme, i18n, keyboard, focus, loading, empty, error, unauthorized,
  responsive and terminal states.
- Add regression tests before changing shared components with established
  behavior.
- Verify substantial layout changes at desktop and mobile sizes.
