# Separate Story Enhancement And Role Analysis

Date: 2026-09-11. Status: implemented; isolated automated/browser checks passed.
Primary: Product Requirement Architect; UX and QA review sequentially.
Extends 024; Cinematic owns Setup and draft application, Generation owns the
existing text-operation facade. No new provider, endpoint or billing lifecycle.

## 1. Distinct Operation Contracts

1. Send validated `purpose: story | roles` through the existing enhancement API;
   default omitted purpose to story for compatibility. Reject unknown purposes.
2. Use purpose-specific prompt recipes and structured provider output. Story
   returns rewritten story/direction; roles returns only role recommendations
   and warnings, never a newly written story. Preserve the shared policy gate,
   model configuration, source validation and qualification cost notice.
3. Both receive current country style, ordered genre/feeling/pacing, brief and
   creative direction. Role analysis is grounded in the current story: style
   informs performance, not extra people, ethnicity, setting or language.

## 2. Distinct Dialogs And Safe Apply

1. Keep the current shared dialog orchestration but render purpose-specific
   bodies. Story: original versus editable enhancement, conflict/emotional arc,
   Enhance story and Apply story. Roles: collapsible source brief, role count,
   unframed role rows with name, importance, function, objective, relationship,
   emotional arc and performance; Analyze roles and Apply roles. No rewritten
   story preview or Story enhancement label in roles mode.
2. Show a compact localized summary of selected country, genres, audience
   feelings and pacing in both dialogs. Use existing theme typography/tokens.
3. Apply story changes only story/creative direction, preserving role slots and
   planning mode. Explain in the preview that existing roles remain and should
   be reanalyzed after story changes. Apply roles changes only role slots and
   role planning mode, preserving story/direction/intent. Never auto-apply.
4. Setup Enhance story and Analyze story roles both use Momelo primary gradient.
   Keep Sparkles and shared pending spinner; preserve original Cancel, error,
   retry and disabled states. Do not permit duplicate or stale-result Apply
   during a retry. Closing/unmounting must not apply a late result.

## Ordered Implementation And Validation

1. Implement purpose validation, bounded source projection, recipes and output
   schema selection. Test role-only payload and country/intent preservation.
2. Implement purpose-specific dialog body/copy, safe draft application and Setup
   button style; test both Apply contracts, pending, retry/error and cancellation.
3. Add tests to the existing directed-openings focused/aggregate runner. Browser
   checks cover both dialogs at 390/820/1440px, EN/TH, initial and result states.
4. Record evidence here. No paid calls, live data writes, production build or
   backend/worker restart. User performs live narrative-quality UAT separately.

No file moves or new runtime data paths. New recipe stays under
server/config/prompt-recipes/cinematic. A focused draft-application helper and
dialog tests belong in existing Cinematic state/components folders.

## Implementation Evidence

- Task 1 complete: validated purpose, bounded existingRolePlan, separate role
  recipe and provider schemas. Provider transport and service tests prove country
  and ordered intent reach the operation; roles cannot replace the source text.
- Task 2 complete: distinct dialog bodies, editable story/direction, role detail
  rows, theme-consistent Setup buttons and purpose-specific Apply helper. Six UI
  and draft tests cover preservation, duplicate prevention, retry/error recovery
  and discarding late results after closing/switching the dialog. Closing does
  not cancel an already dispatched provider request; it discards the UI result.
- Task 3 complete: existing runner extended with actions and actions-ui groups.
  Aggregate regression suite and TypeScript passed; i18n parity and diff checks
  passed. Existing Scene Director, Cast picker, references, Storyboard, transport
  and Credit regression groups remain included and passed.
- Task 4 complete: browser fixtures cover EN/TH, 390/820/1440px, original versus
  story result and source/role list states. Checks assert distinct bodies,
  country/genre request payload, gradient action, no horizontal overflow and
  reachable Apply controls. All API mutations in browser QA are intercepted;
  no real AI or runtime data is used. Screenshots use the OS temporary directory
  prefix mpf-directed-openings; the runner prints the exact path.

Commands (repository root, dependencies installed):

```text
node scripts/test-cinematic-directed-openings.mjs actions
node scripts/test-cinematic-directed-openings.mjs actions-ui
node scripts/test-cinematic-directed-openings.mjs all
node scripts/validate-i18n-catalogs.js
node scripts/verify-cinematic-directed-openings.mjs
```

Browser prerequisite: source Vite server at http://127.0.0.1:5173 (or set
CINEMATIC_WEB_ORIGIN to another localhost source server), Playwright Chromium.
No build or server/worker restart is performed by these runners.

Review: UX and QA applied sequentially by the implementing agent; not an
independent reviewer. Deterministic acceptance passes. Live narrative quality,
country-style nuance and deployed-bundle behavior remain operator UAT; no paid
provider request was made. Refresh source UI and restart the backend through
the normal development workflow before live testing the new purpose/recipe.

Manual UAT: select a country and story intent, enhance and explicitly apply the
story, then analyze and apply roles. Confirm the first action preserves the role
plan and the second preserves the story. Cancel either preview to keep the
draft unchanged. No automatic role-staleness flag is introduced in this scope.
