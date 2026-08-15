---
name: review-product-ux
description: Review substantial ModelPromptForge user flows, navigation, forms, shared components, responsive layouts, themes, localization, accessibility, and async UI states for clarity and regression safety. Use when a user-facing workflow or reusable UI contract materially changes. Do not use for isolated copy, one token value, or a local style fix with no shared interaction impact.
---

# Review Product UX

## Workflow

1. Read the owning requirement and visual-language guide.
2. Name the user, primary goal, frequency and shortest safe path.
3. Inventory loading, empty, error, disabled, unauthorized and terminal states.
4. Map current shared components before proposing a new one.
5. Review progressive disclosure, post-action navigation and recovery.
6. Verify keyboard, focus, semantics, responsive layout, themes and locales.
7. Define desktop/mobile visual evidence and regression tests.

## Required Output

```text
User flow
Screen and state inventory
Component reuse map
Interaction findings
Accessibility/theme/i18n checks
Automated and visual verification
```

## Guardrails

- Do not move business rules into presentational components.
- Do not hard-code one theme in shared UI.
- Do not remove confirmation, price, permission or recovery states for brevity.
- Do not create marketing composition for operational tools.
- Preserve existing shared-component behaviors and tests.
