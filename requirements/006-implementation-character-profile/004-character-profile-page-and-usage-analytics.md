# Character Profile Page and Usage Analytics

**Parent:** `000-master-character-profile-roadmap.md`  
**Status:** Proposed

## 1. Business Requirement

Each public Character has a page that presents it like a reusable virtual model:
clear identity, creator attribution, generated work and popularity by use case.

## 2. Page Content

First viewport:

- canonical casting preview
- Character name
- owner/creator name linking to creator profile
- short personality and intended usage
- explicit availability badge: `Available to use`, `View only` or `Owner only`
- `Use in Fashion Blueprint` primary action only when allowed
- `Use in Scene Builder` secondary action only when allowed
- owner-only `Edit Character` action for name, description, personality and
  intended usage

Supporting content:

- generated public works using this Character
- total successful outputs
- Fashion output count
- Scene/Story output count
- Other output count
- created/updated date and reusable status

Do not show private generations, private consumers or raw prompt/reference data.

Owner edit behavior:

- opens an accessible dialog or dedicated edit state
- preloads current metadata
- saves through Character Profile API with optimistic version
- updates profile and Community Character projection after success
- does not regenerate the casting sheet
- clearly explains that personality changes apply to future uses only

## 3. Usage Counting

Count only successful outputs:

```text
fashion       -> successful Fashion Blueprint output
scene_story   -> successful Scene Builder output
general       -> other authorized successful generation
```

- A job completion writes one idempotent usage event.
- Aggregates sum `successfulOutputCount`.
- Failed/cancelled/refunded-before-output jobs count zero.
- Regeneration is a separate successful usage if it produces an output.
- Public metrics may be delayed/eventually consistent.

## 4. API

```text
GET /api/community/characters/:id
GET /api/community/characters/:id/works?cursor=
GET /api/community/characters/:id/stats
GET /api/character-profiles/:id/stats        owner detail
```

Public stats:

```json
{
  "totalOutputs": 128,
  "byUseCase": {
    "fashion": 96,
    "sceneStory": 28,
    "other": 4
  }
}
```

## 5. Component Reuse

- Reuse Community media cards, creator links, pagination and engagement
  components.
- Reuse the existing lightbox/detail presentation for generated works.
- Add Character-specific composition in
  `client/character-profiles/characterProfilePage.js`.
- Do not copy Community feed or creator portfolio implementations.

## 6. Files

```text
client/character-profiles/characterProfilePage.js
client/character-profiles/characterProfileEditor.js
client/character-profiles/characterUsageStats.js
server/domain/character-profiles/CharacterUsageService.js
server/app/routes/characterProfileRoutes.js
test/characterUsageAnalytics.test.js
```

Add translation keys under an appropriate Character namespace and register it in
the i18n manifest.

## 7. Acceptance Tests

- Owner and character attribution are visually prominent.
- Clicking a public work opens the existing detail/lightbox behavior.
- Two retries with one successful job write one usage event.
- Private work never appears publicly.
- Stats filter by Character version but aggregate at profile level.
- Mobile layout keeps actions and identity readable without overlap.
- Non-owner never sees enabled Edit action.
- Editing personality updates future handoff but not historical work metadata.
- Reuse badge and enabled actions always agree with server response.
