# LVI-04 Focused Verification And Handoff

1. Run Hero and StartPaths unit tests (LVI-01/02), then Provider directory tests
   (LVI-03), then HomeRoute + shared discovery regression tests separately.
2. Run EN/TH catalog validation, TypeScript, scoped lint and production build.
3. Use existing local server if available; otherwise start a free port. Never
   trigger paid generation or modify user posts during verification.
4. Home-only browser gate: 390x844, 820x1000, 1440x1000; each three themes.
   Inspect screenshots, not just DOM: nonblank images, no obscured copy, clear
   color bands, first-viewport balance, working model expansion, no overflow.
5. Exercise keyboard focus, provider retry fixture, query search hiding editorial,
   section descriptions and adjacent existing links/filter controls.
6. Inspect scoped diff; record evidence in master. Keep unrelated dirty runtime
   data unchanged. Mark any failed/unverified checks pending with reason.

Commands: `npm run test:web -- <specific test file>`, `npm run typecheck:web`,
`npm run i18n:validate`, `npm run build:web`,
`npm run test:community-layout -- --scope=home --screenshots`.
Optional wider gate: same layout script with `--scope=all`, not default.
