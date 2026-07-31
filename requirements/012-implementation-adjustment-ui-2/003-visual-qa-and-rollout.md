# Theme Visual QA And Rollout

**Parent:** `000-master-finalize-ux-ui-roadmap.md`

## 1. Required Matrix

```text
Themes: Default, Fashion, Creative
Viewports: 1440 desktop, 390 mobile
Locales: English, Thai
States: loading, empty, error, selected, disabled, focus, menu open
```

Inspect at minimum:

- Community/Home;
- Community Hero and Discovery filter band in all themes;
- Studio;
- Studio viewport, visual attributes, Engine panel and native selects in
  Fashion;
- Studio generation result, comparison slots, add-model slot, reference slots,
  processing summary and comparison credit total in Fashion;
- Playground;
- Fashion Studio;
- Account menu and mobile navigation;
- dialogs, forms, warnings and result media.

## 2. Rollout

1. Ship Default with semantic aliases and verify no visual regression.
2. Enable Fashion and Creative from the global Footer.
3. Keep Auto as the default.
4. Observe route switching, actor switching and refresh behavior.
5. Migrate remaining feature-specific hard-coded colors during owned feature
   changes rather than broad unrelated rewrites.

## 3. Release Gate

- Typecheck, lint, React tests and production build pass.
- Translation catalogs retain key parity.
- No theme changes generation payloads or billable settings.
- No actor can read another actor's preference.
- No unreadable native select/menu surface remains in Fashion.
- Screenshots show stable layout without clipping or overlap.

## 4. Implementation And Validation Plan

Automated:

```text
web/src/lib/theme/themePreference.test.ts
web/src/lib/theme/themeDocument.test.ts
web/src/components/layout/AccountMenu.test.tsx
web/src/components/layout/FooterThemeSelector.test.tsx
```

Run:

```bat
npm run typecheck:web
npm run lint:web
npm run test --workspace web -- src/lib/theme/themePreference.test.ts src/lib/theme/themeDocument.test.ts src/components/layout/AccountMenu.test.tsx src/components/layout/FooterThemeSelector.test.tsx
npm run build:web
```

Manual:

1. Select each explicit theme from the global Footer.
2. Refresh and confirm the selected theme returns for the same Actor.
3. Switch Actor and confirm independent preference.
4. Select Auto and navigate among Community, Playground and Fashion Studio.
5. Inspect native selects, focus rings, disabled controls, errors and dialogs.
6. Repeat at 1440 px and 390 px in English and Thai.
7. Confirm Electric Studio reads as deep red/Wine rather than a recolored
   Momelo Neon surface.

## 5. Known Rollout Boundary

This phase migrates shared primitives, Shell and Fashion Blueprint. Remaining
feature-specific hard-coded colors are not blockers when compatibility tokens
keep content readable, but must not be copied into new components.
