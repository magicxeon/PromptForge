# 011 Scene Builder, Templates and Cross-Workflow Migration

**Status:** Final complex feature migration  
**Depends on:** 004, 005, 006, 009 and 010

## 1. Business Requirement

Migrate Scene Builder as the final authoring surface while preserving:

- Guided and Manual authoring;
- template snapshots;
- replaceable variables;
- reference-slot mapping;
- history image slot picker;
- reference ownership/privacy;
- shared template publishing/use;
- Character reference direction;
- cross-workflow navigation and result handoff.

## 2. Existing Owners

```text
client/scene-builder/
client/core/crossModeHandoff.js
client/community/communitySharePreview.js
server/domain/scene-templates/
server/repositories/scene-templates/
server/app/routes/sceneTemplateRoutes.js
requirements/004-implementation-scene-builder/
requirements/003-implementation-visual-character-builder-plan/010-014-scene-character-directing-and-reference-set-idea.md
```

React must consume existing template/version/policy contracts. It must not
create a React-only snapshot format.

## 3. React Feature Structure

```text
web/src/features/scene-builder/
  routes/SceneBuilderRoute.tsx
  api/
  state/
    sceneBuilderReducer.ts
    sceneDraftPersistence.ts
  templates/
    templateSchemas.ts
    templateHydrator.ts
    templateSerializer.ts
    variableResolver.ts
  components/
    AuthoringModeSwitcher.tsx
    GuidedSceneForm.tsx
    ManualPromptForm.tsx
    SceneVariableControls.tsx
    ReplacementChecklist.tsx
    HistorySlotPicker.tsx
    SharedTemplatePanel.tsx
```

Use shared generation, Character picker, media and Community share components.

## 4. Authoring Modes

Guided:

- structured categories/options;
- compiler-owned final prompt;
- variable/template compatibility.

Manual:

- user-owned prompt text;
- references and generation settings remain;
- Guided controls are absent;
- switching prompts for explicit confirmation without resetting generation mode.

Mode state is explicit and reducer-owned. No form reset may leave authoring or
generation mode undefined.

## 5. Template Contract

Preserve versioned snapshot fields:

```text
authoringMode
finalPrompt
structuredSelections
manualPromptText
referenceSlotMapping
replaceableVariables
providerModelSnapshot
generationSettings
```

React Zod schemas must accept current supported legacy versions through the
existing versioning/migration rules. Serialization:

- strips large Base64 references;
- stores canonical IDs/URLs allowed by policy;
- preserves variable and slot identity;
- never publishes private source references;
- does not mutate the owner draft during public sanitization.

## 6. Replacement Workflow

`ReplacementChecklist` must:

- distinguish required, optional and owner-provided slots;
- recommend a slot based on source type but allow policy-compatible choice;
- use History picker results by stable output/job ID;
- validate all required variables before generation;
- show hidden/private prompt policy correctly;
- resolve replacement variables once through canonical resolver;
- produce a generation request matching the displayed summary/estimate.

## 7. Character Direction

Character reference preserves identity/body/clothing according to the source
contract while Scene attributes may direct:

- expression;
- pose;
- environment;
- camera/composition;
- allowed styling overrides.

Precedence must be pure, tested and shared with server prompt compilation. React
controls cannot suppress identity rules by changing display order.

## 8. Sharing and Use Template

Reuse Community share dialogs and public template actions.

- Guided Remix Only may hide prompt text while server compiles structured data.
- Manual hidden remix remains blocked unless a secure server-side compilation
  contract exists.
- public references follow slot sharing policy;
- “Use Template” opens Scene Builder with a versioned template ID/snapshot;
- remix attribution/event behavior remains server-owned.

## 9. Cross-Workflow Handoffs

Support:

```text
Headshot -> Character Builder/Profile
Character Profile -> Scene Builder
Community Template -> Scene Builder
History image -> template reference slot
Scene result -> History/Community
```

All handoffs use the platform contract introduced in 010 and preserve
breadcrumb/return context.

## 10. Migration Order

1. Port pure template schemas/serializer/hydrator/resolver with fixtures.
2. Guided/Manual state and switcher.
3. Shared generation component integration.
4. variable controls and replacement checklist.
5. History slot picker and references.
6. Character direction and prompt parity.
7. share/use-template flow.
8. cross-workflow E2E.
9. Scene route cutover.

## 11. Tests

- all current Scene fixtures hydrate and round-trip;
- Guided/Manual switch confirm/cancel;
- no undefined generation mode;
- variable types/default/custom values;
- required replacement blocking;
- history slot compatibility;
- reference sanitization and actor ownership;
- hidden Guided prompt generation;
- Manual Remix Only rejection;
- Character expression/pose/environment precedence;
- template publish/use/remix attribution;
- direct route and return context;
- mobile controls and keyboard operation.

## 12. Exit Criteria

- Scene Builder is React-owned.
- Current snapshot versions remain usable.
- Template privacy and references pass two-actor tests.
- Guided and Manual workflows produce equivalent canonical requests.
- All cross-workflow handoffs are explicit and versioned.
- No legacy Scene script remains required.
