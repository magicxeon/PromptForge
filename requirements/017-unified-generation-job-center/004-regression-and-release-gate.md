# 004 Regression And Release Gate

## Automated Tests

- Queue snapshot is owner-filtered and excludes prompt/reference payloads.
- Group actor listing is bounded and newest-first.
- Projection merges sources without duplicate group children.
- API enforces actor isolation, scope, limit, and `private, no-store`.
- Global query polls only with active work and changes key on actor switch.
- Image route pointer restores job, group, and comparison IDs.
- Tracker covers loading, active, completed, failed, and empty states.

## Existing Regression Suites

- Image submit/status, multi-output groups, result grid, and Comparison.
- Video quote/task/recovery.
- Credit estimate, reservation, capture, refund, and reconciliation.
- History ownership and Recent output.
- Playground, Studio, Scene Builder, and Fashion result surfaces.

## Manual Checks

1. Start two Images, navigate away, and confirm active count.
2. Return before completion and confirm both slots update.
3. Return after completion and confirm the result grid.
4. Repeat with Video and confirm durable task restoration.
5. Trigger failure and confirm all spinners stop.
6. Switch actor and confirm no cross-actor work appears.
7. Refresh and confirm route pointer restoration.
8. Restart backend during Image work and confirm recovery-required state rather
   than endless loading or duplicate dispatch.

Do not close while terminal work can spin forever, foreign work is visible,
Credit behavior regresses, or restart can silently replay billable work.

## Validation Evidence (2026-08-18)

- Server affected suites: 36 passed.
- Web focused/result-surface suites: 12 passed.
- TypeScript: `npm run typecheck:web` passed.
- Localization: `npm run i18n:validate` passed.
- ESLint for changed Job Center, AppShell, GenerationExperience, Video Workspace,
  and query-key files passed.
- Full-repository ESLint remains blocked by unrelated pre-existing unused imports
  in `AdminAttributesRoute.tsx` and `videoGenerationApi.test.ts`.
- Express composition import and server syntax checks passed.
- Manual checks 1-8 remain pending in a running browser and must pass before
  production release closure.
