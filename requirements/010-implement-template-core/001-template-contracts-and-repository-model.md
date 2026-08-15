# 001 Template Contracts and Repository Model

## Business Requirement

Template must be a durable product independent from a Community post or one
generation result. Creator ownership, version history, pricing, public
availability and future Template kinds must survive migration from JSON to a
database.

## System Design

### TemplateDefinition

```ts
{
  id: string;
  ownerUserId: string;
  ownerUsername: string;
  kind: "scene_image" | "fashion" | "product_image" | "video";
  title: string;
  description: string;
  status: "draft" | "published" | "archived";
  visibility: "private" | "unlisted" | "public";
  currentVersionId: string | null;
  pricing: {
    accessCredits: number;
    creatorShareBps: number;
    platformShareBps: number;
  };
  createdAt: string;
  updatedAt: string;
}
```

### TemplateVersion

```ts
{
  id: string;
  templateId: string;
  versionNumber: number;
  status: "draft" | "published" | "superseded";
  executionSnapshot: SceneTemplateSnapshot;
  publicInputSchema: TemplateInputDefinition[];
  promptVisibility: "full" | "remix_only";
  preview: {
    sourceGenerationResultId: string;
    imageAssetId: string | null;
    imageUrl: string;
    thumbnailUrl: string;
  };
  compatibility: {
    generationModes: string[];
    minimumReferenceCapacity: number;
    preferredProviderId: string | null;
    preferredModelId: string | null;
  };
  publishedAt: string | null;
}
```

### TemplateInputDefinition

Supported MVP types:

```text
reference_image
select_option
custom_text
color
```

Every input defines `id`, `label`, `sourceFieldName`, `required`,
`replacementPolicy`, `defaultValue`, options/constraints and an optional
Fashion binding role.

## Repository Interfaces

```text
TemplateRepository
  createDraft
  findById
  findByOwner
  updateDraft
  publish
  archive

TemplateVersionRepository
  createDraftVersion
  findById
  findPublishedVersion
  publishVersion
  listByTemplate

TemplateUseSessionRepository
  create
  findForActor
  attachGeneration
  markCompleted
```

JSON adapters use `jsonFileStore.js`. Domain services do not know file paths.

## Files

```text
server/domain/templates/
server/repositories/templates/
server/data/templates/
server/app/routes/templateRoutes.js
web/src/features/templates/
web/src/components/templates/
```

## Testing

- owner isolation and actor context
- immutable published versions
- monotonic version number
- public/private listing
- invalid kind, status, pricing or input contracts
- no embedded Base64 in stored records

