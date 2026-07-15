# Community-01 Product Home and Workflow Launcher

**Status:** Proposed - Awaiting Review  
**Feature type:** New application entry page and navigation direction  
**Depends on:** Shared application shell and module registry  
**Created:** 2026-07-15

## 1. Objective

Add a first screen that helps new and returning users choose the correct workflow without landing directly inside an advanced model/character or prompt-building screen.

This page is a **Product Home / Workflow Launcher**, not a marketing landing page. It should make the product understandable and actionable in one viewport.

## 2. User Problem

If users enter directly into a character/model creation screen or a dense prompt configurator, they may not understand:

- Whether character creation is required before image generation.
- How freestyle prompting relates to dropdown/config generation.
- Where to create commercial images.
- How community remix connects to Studio.
- Where their history, collections and characters are reused.

## 3. MVP Entry Points

Show a compact set of working entry points:

```text
Generate Commercial Image
Create / Reuse Character
Freestyle with AI Assist
Explore Community Prompts
Open My Projects / History
```

Priority:

1. `Generate Commercial Image`
2. `Freestyle with AI Assist`
3. `Explore Community Prompts`
4. `Create / Reuse Character`
5. `My Projects / History`

The home page must not display future modules as if they are available.

## 4. Character / Model Reuse Direction

Character and model creation should produce reusable identity assets, not one-off prompt fragments.

Expected reuse:

```text
Character Profile
-> Fashion workflow
-> Portrait workflow
-> Freestyle prompt
-> Community remix
-> Future creator workflow library
```

Freestyle and Studio should expose `Use Character`:

```text
Use Character
- None
- My Character A
- My Character B
- Upload reference
```

When a character is selected, Prompt Composer AI or the structured prompt engine should apply identity preservation patterns through normal config fields, not by forcing users to manually write identity prompts every time.

## 5. UX Requirements

- Home loads fast and shows only available workflows.
- The first viewport must communicate the actual product: generate, structure, remix and reuse AI image prompts.
- No long marketing hero is required for authenticated product use.
- New unauthenticated users may see sign-in/register prompts, but the primary actions remain clear.
- Returning users should see recent actions such as latest community saves, recent characters or recent generated images when available.
- Mobile layout must keep primary workflows visible without requiring a long scroll.

## 6. Navigation Contract

Recommended routes:

```text
/home
/studio
/studio/freestyle
/characters
/community
/history
/collections
```

Navigation items must come from the module registry. Do not hardcode community navigation separately from the application shell.

## 7. Acceptance Criteria

- A new user can identify where to start generating an image within one screen.
- Freestyle, Character and Community are visually connected as related workflows.
- Disabled modules are not shown as active options.
- Selecting a character from Home can route into a workflow with that character preselected.
- Home does not duplicate Studio controls; it launches the correct workflow.

