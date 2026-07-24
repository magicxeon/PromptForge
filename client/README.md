# ModelPromptForge Client

`client/` contains the browser application for ModelPromptForge. The current
client is a server-rendered static shell with browser-native JavaScript, HTML,
and CSS. There is no client build step and no framework module loader.

The client supports these primary workflows:

- discover shared work in Community;
- create guided images in Studio;
- create freeform images and model comparisons in Playground;
- build reusable characters and scenes;
- inspect generation history, collections, and comparisons;
- switch between local mock actors during the MVP;
- access support and audit tools when the active actor has an allowed role.

Project-wide file ownership rules remain defined in
`requirements/007-technical-dept/000-master.md`. Read that document before
creating, moving, or renaming client files.

## 1. Runtime Model

The browser loads `client/index.html` from the Express server. Client modules
are plain scripts that expose narrow APIs through namespaced `window` objects.
Script order in `index.html` is therefore part of the dependency contract.

The high-level startup flow is:

```text
index.html
  -> infrastructure and feature scripts
  -> app.js initializes Studio data and shared services
  -> modelpromptforge:ready
  -> router resolves the current path
  -> application shell activates the matching page
```

Important rules:

- Do not introduce an isolated page bootstrap for an internal route.
- Do not use full-page navigation for links owned by the application.
- Register routes in `shell/navigationRegistry.js` and navigate through
  `window.ModelPromptForgeRouter`.
- Load a dependency before the script that consumes its `window` API.
- Prefer a capability namespace such as `window.ModelPromptForgePlayground`
  over new unrelated globals.
- Keep initialization idempotent because both `DOMContentLoaded` and
  `modelpromptforge:ready` may be observed by modules.

## 2. Routes

The canonical route registry is `shell/navigationRegistry.js`.

| Route | Module | Purpose |
| --- | --- | --- |
| `/` | Community | Default entry; treated as the Community route |
| `/community` | Community | Discover shared images and workflows |
| `/studio` | Studio | Guided character, character-sheet, and scene creation |
| `/playground` | Playground | Freeform prompt generation and model comparison |
| `/history` | History | Actor-owned generated images and collections |
| `/comparisons` | Comparisons | Comparison dashboard |
| `/comparisons/:setId` | Comparisons | Individual comparison set |
| `/admin` | Admin | Role-gated support and audit tools |

When adding a route:

1. add its pattern and module metadata to `shell/navigationRegistry.js`;
2. add its page container to `index.html`;
3. teach `shell/applicationShell.js` how to activate the page;
4. use `ModelPromptForgeRouter.navigate(path)` for internal links;
5. add direct-path and browser back/forward tests.

The server must continue returning the application shell for valid direct
paths so a refresh on `/playground`, `/history`, or another registered route
does not produce `Cannot GET`.

## 3. Directory Ownership

| Directory or file | Ownership |
| --- | --- |
| `app.js` | Studio bootstrap and top-level client orchestration |
| `index.html` | Application shell markup and authoritative script order |
| `style.css` | Current global visual system and responsive rules |
| `admin/` | Support, audit, and backoffice UI |
| `assets/` | Runtime visual assets shipped to the browser |
| `clothing/` | Clothing rules, prompts, references, and visual configuration |
| `community/` | Community page and local mock community workflows |
| `comparisons/` | Comparison dashboard and summary components |
| `core/` | Shared browser infrastructure and cross-feature services |
| `credits/` | Credit balance, estimates, and generation billing UI |
| `generation-controls/` | Shared generation UI used by Studio and Playground |
| `i18n/` | Locale manifest, catalogs, and vendored browser dependencies |
| `outputs/` | Generated images and thumbnails served at runtime |
| `playground/` | Freeform generation page, state, and controller |
| `prompt-composer/` | Local structured prompt proposal UI |
| `scene-builder/` | Scene authoring, template hydration, variables, and sharing |
| `shell/` | Navigation registry, router, and application shell |
| `visual-controls/` | Reusable visual option selectors |
| `comparison.js` | Comparison workspace orchestration and compatibility API |

Place a module in the feature folder that owns its behavior. Use `core/` only
when the behavior is genuinely shared across features. Shared generation
controls belong in `generation-controls/`, not in Studio or Playground.

Generated images belong in `outputs/`; source visual sets and slicing manifests
belong under the repository-level `visual-assets/character-builder/`.

## 4. Shared Client Contracts

### Studio state

`core/studioState.js` owns the canonical Studio-compatible state exposed as
`window.state`. Feature modules should use the existing state shape and helper
functions rather than create parallel copies of provider, prompt, reference, or
mode state.

Scene Builder keeps its feature-specific state behind
`window.ModelPromptForgeSceneBuilderState`. Playground keeps actor-scoped state
behind `window.ModelPromptForgePlaygroundState`.

### Actor context and API requests

`core/actorContext.js` owns the active local mock actor:

```text
window.ModelPromptForgeActorContext
  getActiveMockUserId()
  setActiveMockUserId(userId)
  getActorHeader()
  appendActorQuery(url)
  subscribeActorChange(listener)
```

Use `core/apiClient.js` for application API calls. It attaches the canonical
`x-mpf-user-id` header. Do not trust or recreate ownership from a username in a
feature module.

Browser persistence that contains user work must be scoped by durable actor id.
Changing the active actor must refresh actor-owned history, queues, drafts,
templates, and credit information rather than leaking the previous actor's
state.

### Router and shell

`window.ModelPromptForgeNavigationRegistry` owns visible modules, feature
flags, role gates, and route matching.

`window.ModelPromptForgeRouter` owns internal navigation and emits
`modelpromptforge:route`.

`shell/applicationShell.js` renders navigation and activates the appropriate
page. It also reacts to route, locale, and actor changes.

### Shared generation controls

`window.ModelPromptForgeGenerationControls` is assembled by scripts under
`generation-controls/`. Current shared surfaces include:

- Engine and Target Output with comparison controls;
- Prompt Editor;
- Reference Slot Manager;
- Generation Action Bar;
- Generation Result Surface.

Studio and Playground must configure these components through their public
parameters. Do not fork their markup or behavior into a page-specific copy.
Changes to pricing display, provider/model behavior, comparison mode, result
navigation, or generation actions should be made in the shared component when
both pages are affected.

### Scene Builder

`scene-builder/sceneBuilderController.js` is the public aggregator for
`window.ModelPromptForgeSceneBuilder`. Feature modules remain split by concern:

- authoring mode and UI;
- template serialization and hydration;
- replaceable variables;
- replacement checklist;
- reference-slot history picker;
- share preview and shared-template loading.

Call the controller or another documented feature API instead of reaching into
private module state.

## 5. Generation Flow

Normal generation follows:

```text
page controller or Studio action
  -> shared generation controls collect input
  -> credit estimate locks provider/model/settings
  -> core/generationService.js submits the request
  -> server returns a job id
  -> client polls actor-owned job status
  -> modelpromptforge:generation-status
  -> result surface and history refresh
```

Comparison generation is owned by the comparison workspace. When comparison
mode is active:

- only enabled comparison slots contribute to the credit estimate;
- the normal provider/model selector is hidden;
- generated comparison results open through the comparison UI;
- page result surfaces must not present a competing normal-generation state.

Reference images can be large. Persist stable output URLs, job ids, or compact
metadata where possible. Do not store embedded Base64 images in local template,
community, or history snapshots.

## 6. Client Events

Cross-module events currently include:

| Event | Purpose |
| --- | --- |
| `modelpromptforge:ready` | Core application data and services are ready |
| `modelpromptforge:route` | Internal route changed |
| `modelpromptforge:languagechange` | Active locale or loaded catalogs changed |
| `modelpromptforge:actorchange` | Active mock actor changed |
| `modelpromptforge:generation-status` | Generation lifecycle status changed |

Prefer a documented service subscription when one exists, such as
`subscribeActorChange()`. Use a DOM event for broad cross-feature notification,
not for private communication between two functions in the same module.

## 7. Localization

Localization is owned by:

```text
core/i18nService.js
core/localePreferenceService.js
i18n/manifest.json
i18n/locales/<locale>/<namespace>.json
```

Client copy should use `window.ModelPromptForgeI18n.t()` or declarative i18n
attributes supported by the service. Keep the English, Thai, and Japanese
catalog keys in parity.

To add a locale:

1. register it in `i18n/manifest.json`;
2. create every required namespace under `i18n/locales/<locale>/`;
3. preserve interpolation tokens exactly, such as `{{name}}`;
4. add the locale to the language selector;
5. validate catalog parity and fallback behavior;
6. inspect every route at desktop and mobile sizes.

Do not add feature text only to `index.html` or only to one catalog. Dynamic
labels and error messages require catalog entries too.

## 8. Adding or Changing a Feature

Before implementation:

1. read `requirements/007-technical-dept/000-master.md`;
2. identify the owning route and feature folder;
3. inspect the nearest module and its public namespace;
4. identify shared controls and services that can be configured or extended;
5. define actor ownership, persistence, i18n, credit, and accessibility impact.

During implementation:

1. keep state behind the owning state service;
2. use `ModelPromptForgeApiClient` for authenticated application requests;
3. use the router for internal navigation;
4. update all locale catalogs for visible copy;
5. add scripts to `index.html` in dependency order;
6. avoid inline styling when the visual rule belongs in `style.css`;
7. preserve keyboard, focus, loading, empty, success, and error states.

Before completion:

1. verify direct navigation and back/forward behavior;
2. switch mock actors and confirm data isolation;
3. switch every supported locale;
4. test normal and comparison generation paths when affected;
5. test desktop and mobile layouts;
6. run syntax, i18n, and relevant automated tests;
7. check that every new file follows the documented ownership structure.

## 9. Validation

The repository agent must not run Node validation directly. Ask the developer
to execute the relevant commands and report failures.

Common checks are:

```powershell
node --check client/app.js
node --check client/<feature>/<module>.js
npm run i18n:validate
node --test test/i18nService.test.js test/i18nCatalogParity.test.js
npm test
```

For UI work, also validate these manually:

- open `/community`, `/studio`, `/playground`, `/history`, and `/comparisons`
  directly in a fresh browser tab;
- verify the browser console and network panel contain no errors;
- use the application navigation without a full-page reload;
- verify all controls remain usable at narrow mobile widths;
- verify modals, lightboxes, dropdowns, and menus have correct stacking and
  keyboard behavior.

## 10. Avoid These Patterns

- Duplicating shared Engine, Prompt, Reference, Action, or Result markup.
- Adding a new global when an owning namespace already exists.
- Calling `fetch()` directly when `ModelPromptForgeApiClient` should carry the
  actor context.
- Persisting user data under a global local-storage key.
- Treating `username` as the authorization identity.
- Hard-coding visible text without catalog entries.
- Loading a script before its browser dependency.
- Putting generated output, source visual assets, and UI modules in the same
  directory.
- Adding internal routes without direct-path server fallback.
- Growing `app.js` with feature logic that belongs in a capability module.
