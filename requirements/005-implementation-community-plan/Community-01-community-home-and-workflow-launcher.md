# Community-01 Community Home and Workflow Launcher

**Status:** Proposed - Awaiting Review  
**Feature type:** New application entry page and navigation direction  
**Depends on:** Community-00-007 shared application shell and navigation registry
**Created:** 2026-07-15

## 1. Objective

Make Community the default application entry screen and let users move directly
from inspiration to creation without first entering a dense configurator.

This page is a **Community Home with a compact workflow launcher**, not a
marketing landing page. The first viewport must show real community work and a
medium-sized Create panel that routes into the correct creation workflow.

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

Required routes:

```text
/community
/studio
/playground
/characters
/history
/collections
/credits
/support
/admin
```

`/` must redirect to `/community`. Navigation items must come from
`client/shell/navigationRegistry.js`. `/admin` must be omitted unless Actor
Context grants an approved admin/support capability.

## 7. Acceptance Criteria

- A new user can identify where to start generating an image within one screen.
- Freestyle, Character and Community are visually connected as related workflows.
- Disabled modules are not shown as active options.
- Selecting a character from Home can route into a workflow with that character preselected.
- Home does not duplicate Studio controls; it launches the correct workflow.

## 8. Implementation Plan

### User Review Required

- Community Home combines discovery and a compact workflow launcher.
- It must show only enabled modules from the navigation registry.
- Community entry can point to local/mock Community during development.
- Mock user switcher from Community-10 may be visible in development builds.

### Proposed Files

```text
client/community/communityHomePage.js
client/community/communityCreateLauncher.js
client/community/communityFeed.js
client/shell/navigationRegistry.js
client/app.js
client/index.html
client/style.css
```

### Process

1. Register `/community` as the default route through the application shell.
2. Read enabled modules from the navigation registry.
3. Render the Community feed and a medium Create panel for Studio, Playground,
   Character Builder and Scene Builder.
4. Route each card into an existing workflow with optional handoff payload.
5. Hide unavailable modules instead of showing disabled fake features.

### Testing

- Verify `/` redirects to `/community`.
- Verify `/community` renders without requiring generated history.
- Verify workflow cards route to correct sections.
- Verify disabled Community module does not appear.
- Verify active mock user is visible only in development mode.

