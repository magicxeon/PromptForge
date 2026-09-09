# 007 Momelo Browser Icon

ID: CLSFE-007. Status: baseline implemented; remaining acceptance checks tracked in PLAN. Owner: Web application bootstrap / brand assets.
Independent of the generation strategy decision and paid provider work.

## Current Evidence

`web/index.html` has title/theme-color but no favicon declaration.
`web/src/components/brand/MomeloBrand.tsx` imports the approved source
`web/src/assets/brand/momelo-mark.svg`. This is the first source of truth for
the icon, not a new generated logo or an unrelated provider icon.

## Requirement

- Add a favicon declaration using the existing Momelo mark and Vite-supported
  asset resolution so it loads in development and production builds.
- Include a small PNG fallback only if necessary for supported browsers; derive
  it from that mark, preserve transparency/colors and do not manually redesign.
- Keep title, theme-color, theme switching, header/left-menu logo and provider
  icons unchanged. No PWA/service-worker rollout or SEO redesign in this task.
- Reuse brand provenance for Download PNG, but keep favicon and configurable
  export logo concerns distinct. Replacing export logo config need not change
  the favicon unless explicitly requested later.
- No manual edits to `web/dist/`; generated build output is not source.

## Tasks

- [x] ICO-01 Verify existing mark and browser asset path strategy.
- [x] ICO-02 Add head declaration and optional fallback in the owning asset folder.
- [ ] ICO-03 Check HTTP MIME/status and visible browser-tab mark in dev and a
  later isolated build/preview; account for browser favicon caching.

## Acceptance

ICO-A1: Momelo mark is visible in the browser tab, without missing-asset errors.
ICO-A2: development and built asset URLs resolve; old favicon cache instructions
are documented only when needed, not used to mask a broken path.
ICO-A3: no shell branding, theme or provider icon changes occur.
Groups: `favicon`, `layout-favicon` in [009](009-verification-and-release.md).
