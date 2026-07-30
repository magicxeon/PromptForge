# Template Core MVP Master Roadmap

**Status:** MVP implemented; desktop/mobile visual acceptance pending  
**Owner:** Template Core capability  
**Application:** ModelPromptForge / Momelo

## 1. Product Goal

Template Core turns a successful generated result into a reusable, versioned
workflow. A creator decides which inputs remain fixed, which inputs a viewer may
replace, whether prompt text is visible, and how many credits are charged for
using the template. A non-technical user should be able to select a compelling
final preview, replace only the required Character, Outfit, or Environment
inputs, review one combined price, and generate.

The template is not a copied prompt. It is a server-authoritative product
contract composed of:

```text
Template definition
Published immutable version
Public preview and Community post
Typed replacement input schema
Server-owned execution snapshot
Use session and generation lineage
Template usage credit component
```

## 2. MVP Decisions

- MVP supports `scene_image` templates.
- `fashion` is a first-class compatible consumer and may add single or bulk
  Outfit input bindings without creating a second template runtime.
- `product_image` and `video` are reserved template kinds, not active MVP
  execution modes.
- Template usage is charged per successful generation attempt through the
  existing credit reservation. There is no separate checkout in this phase.
- Generation credit and Template usage credit are shown separately and reserved
  as one locked total.
- Creator revenue share is recorded in the pricing snapshot and lineage. Cash
  payout is deferred to the commercial phase.
- Hidden Guided templates execute without exposing the canonical prompt.
- Hidden Manual templates remain unsupported until server-side secure prompt
  composition is implemented.
- A Community post points to a published Template version. Community does not
  own the Template definition.

## 3. Shared Capability Boundaries

| Capability | Responsibility |
|---|---|
| Template Core | Definition, version, input contract, use session, validation |
| Scene Builder | Authoring adapter and replacement UI |
| Community | Discovery, preview, engagement, Use Template entry point |
| Generation | Canonical prompt compilation and provider execution |
| Credits | Estimate, reserve, capture, refund and pricing snapshot |
| Fashion Blueprint | Single/bulk Outfit binding and batch plan |
| Profiles | Creator-owned Template portfolio |
| Moderation | Publish eligibility and public visibility |

## 4. Canonical Data Flow

```text
Scene authoring
  -> serialize candidate snapshot
  -> create Template draft
  -> validate preview and input contract
  -> publish immutable version
  -> create/link Community post
  -> viewer opens Template
  -> server creates actor-bound use session
  -> replacement form resolves typed inputs
  -> estimate includes AI + Template usage credits
  -> generation reserves combined total
  -> result stores template/version/session lineage
  -> successful remix updates Community engagement
```

## 5. Delivery Steps

1. [001 Core contracts and repository model](./001-template-contracts-and-repository-model.md)
2. [002 Authoring serializer and variable policy](./002-template-authoring-serializer-and-variable-policy.md)
3. [003 Publishing, versioning, preview and Community linkage](./003-template-publishing-versioning-and-preview.md)
4. [004 Use Template and replacement experience](./004-template-use-session-and-replacement-experience.md)
5. [005 Usage credits, lineage and creator earnings foundation](./005-template-usage-credits-lineage-and-earnings.md)
6. [006 Discovery and reusable Template UI](./006-template-discovery-and-reusable-ui.md)
7. [007 Fashion Studio and future template kinds](./007-fashion-and-future-template-extension.md)
8. [008 QA, migration and release gates](./008-template-core-qa-migration-and-release.md)
9. [009 Owner Template management](./009-owner-template-management.md)

## 6. Non-Duplication Rules

- Do not add another generation endpoint or provider integration.
- Do not add Template-specific credit balances.
- Do not duplicate Community cards, media presentation, actor context, reference
  upload, or generation result components.
- Template adapters produce the existing `GenerationRequestDraft`.
- Fashion binds products to the same Template input schema.
- Public DTOs never contain hidden prompt text or private reference pointers.

## 7. Exit Criteria

- A newly authored React Scene can be published as a versioned Template.
- A second actor can use it without seeing a hidden prompt.
- Required replacements block generation until supplied.
- Locked values cannot be overridden by the client payload.
- Estimate shows AI and Template components and submission matches the estimate.
- Successful results retain Template and version attribution.
- Community and Creator Profile can display the same shared Template card.
- Fashion can consume the same input contract for one or several Outfit items.

## 8. Implemented Capability Map

| Area | Canonical implementation |
|---|---|
| Template contracts and sanitization | `server/domain/templates/templateContracts.js` |
| Publish, version, use session, archive, lineage | `server/domain/templates/TemplateCoreService.js` |
| JSON-to-database migration boundary | `server/repositories/templates/` |
| Runtime MVP data | `server/data/templates/` |
| Public Template API | `server/app/routes/templateRoutes.js` |
| Community publishing and Use Template handoff | `server/domain/community/CommunityShareService.js` |
| Server-authoritative Template pricing | `server/domain/credits/` |
| Generation, Comparison and Fashion execution | existing canonical generation pipeline |
| React serialization and replacement mapping | `web/src/features/templates/` |
| Shared Template pricing/use presentation | `web/src/components/templates/` |
| Creator publish controls | `web/src/components/community/ShareGeneratedDialog.tsx` |
| Owner Template presentation editor | `web/src/components/templates/SharedTemplateEditDialog.tsx` |

Published versions are immutable. Republish creates the next version, active use
sessions remain pinned to their original version, and archive removes discovery
without invalidating already-created sessions.
