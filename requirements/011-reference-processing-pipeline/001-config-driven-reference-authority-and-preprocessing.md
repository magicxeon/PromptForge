# RPP-001 Config-Driven Reference Authority And Preprocessing

**Requirement ID:** RPP-001  
**Status:** MVP implemented; semantic adapters deferred  
**Owner:** Generation / Reference Processing  
**Depends on:** Asset ownership, Provider Registry, Generation pipeline,
Template Core and Credit estimate contracts

## 1. Business Requirement

The system must accept imperfect but usable reference images and constrain each
image to its intended role before generation.

A user uploading an Outfit image containing another person must receive a
result where:

- the garment is transferred according to the selected garment scope;
- the incidental wearer does not replace the selected Face or Character;
- the Outfit scene and pose do not replace the Template scene and pose;
- the original Template garment is removed when Outfit is an explicit
  replacement;
- impossible hand/garment interactions may be adapted without replacing the
  broader composition.

These rules must work consistently in every generation surface.

## 2. Source Contracts

Implementation must derive data from current canonical owners:

| Data | Source of truth |
|---|---|
| Uploaded asset ownership and storage | Asset domain/repository |
| History references and output ownership | Generation History repository |
| Template baseline and replaceable inputs | Template version and Use Session |
| Character identity/outfit behavior | Character Profile version/policy |
| Provider limits and supported inputs | Provider Registry public catalog |
| Selected attributes | Normalized generation request |
| Credit estimate parameters | Credit Pricing and Reservation services |

The Reference Processing Pipeline does not create parallel stores for uploads,
history, templates, characters, providers or credits.

## 3. Normalized Contracts

### 3.1 Reference Processing Request

```ts
type ReferenceProcessingRequest = {
  schemaVersion: 1;
  actorUserId: string;                 // server-derived
  generationSurface:
    | "studio"
    | "scene_builder"
    | "playground"
    | "comparison"
    | "template"
    | "fashion";
  generationMode: string;
  providerId: string;
  modelId: string;
  templateUseSessionId?: string | null;
  characterProfileVersionId?: string | null;
  references: ReferenceInput[];
  selections: Record<string, AttributeSelection>;
  requestedOutput: {
    aspectRatio: string;
    resolution?: string | null;
    outputCount: number;
  };
};
```

### 3.2 Reference Input

```ts
type ReferenceInput = {
  slotId: string;
  role:
    | "face_reference"
    | "character_reference"
    | "outfit_front"
    | "outfit_back"
    | "style_reference"
    | "pose_reference"
    | "template_baseline"
    | "product_reference"
    | "environment_reference";
  source: {
    kind: "asset" | "history" | "template" | "character";
    id: string;
  };
  requestedScope?: string | null;
  roleOptions?: Record<string, string | number | boolean | null>;
};
```

No client-supplied local path, owner ID, policy directive or authorization flag
is trusted.

### 3.3 Processing Result

```ts
type ReferenceProcessingResult = {
  schemaVersion: 1;
  policyVersion: string;
  status: "accepted" | "accepted_with_warning" | "action_required" | "rejected";
  authorityPlan: ReferenceAuthorityPlan;
  processedReferences: ProcessedReference[];
  effectiveSelections: Record<string, AttributeSelection>;
  publicAuthorityProjection: PublicAuthorityProjection;
  warnings: ProcessingMessage[];
  providerPlan: {
    orderedReferenceIds: string[];
    referenceCount: number;
    directiveIds: string[];
    executionMode: "single_stage" | "multi_stage";
  };
};
```

### 3.4 Processed Reference

```ts
type ProcessedReference = {
  role: string;
  sourceAssetId: string;
  derivativeAssetId?: string | null;
  processorIds: string[];
  detectedScope?: string | null;
  confidence?: number | null;
  preserveTraits: string[];
  suppressTraits: string[];
  contentFingerprint: string;
};
```

The contract stores IDs and metadata only. Base64 data and private filesystem
paths are forbidden.

## 4. Authority Plan

```ts
type ReferenceAuthorityPlan = {
  identity: AuthorityDecision;
  body: AuthorityDecision;
  expression: AuthorityDecision;
  pose: AuthorityDecision;
  garment: AuthorityDecision;
  environment: AuthorityDecision;
  lighting: AuthorityDecision;
  composition: AuthorityDecision;
  renderingStyle: AuthorityDecision;
};

type AuthorityDecision = {
  primarySource: string;
  fallbackSources: string[];
  suppressedSources: string[];
  ownedAttributeFields: string[];
  editableAttributeFields: string[];
  conflictResolution: "replace" | "merge" | "preserve" | "adapt";
};
```

Default priority:

```text
Identity:
  explicit Character > explicit Face > Template baseline > prompt

Garment:
  explicit Outfit > outfit-bound Character > Template baseline > attributes

Pose:
  explicit Pose > replaceable Template pose > Template baseline > attributes

Environment:
  explicit replaceable Template/environment input > Template baseline > attributes

Style:
  explicit Style > Template visual treatment > attributes
```

An explicit replacement takes priority only inside its declared role boundary.

## 5. JSON Configuration

### 5.1 Canonical Files

```text
server/config/reference-processing-policy.json
server/config/reference-processing-policy.schema.json
```

The policy is source-controlled configuration, not runtime user data.

### 5.2 Configuration Example

```json
{
  "schemaVersion": 1,
  "policyVersion": "rpp-2026-07-v4",
  "defaultFallbackMode": "safe_deterministic",
  "roles": {
    "outfit_front": {
      "intent": "garment_transfer",
      "allowedSourceKinds": ["asset", "history"],
      "preserveTraits": [
        "garment_silhouette",
        "garment_construction",
        "garment_color",
        "garment_pattern",
        "garment_material"
      ],
      "suppressTraits": [
        "wearer_identity",
        "wearer_hair",
        "wearer_body_identity",
        "source_pose",
        "source_environment",
        "source_lighting_style"
      ],
      "ownedAttributeGroups": ["Clothing"],
      "editableAttributeFields": ["Primary Color", "Secondary Color"],
      "attributeConflictMode": "role_option",
      "processors": [
        "image_probe",
        "orientation_normalize",
        "person_region_detect",
        "garment_scope_detect",
        "garment_isolation"
      ],
      "scopeOptions": [
        "full_look",
        "top_only",
        "bottom_only",
        "single_item"
      ],
      "defaultScope": "auto",
      "minimumConfidence": 0.72,
      "directiveId": "outfit_front.v1"
    },
    "face_reference": {
      "intent": "identity_transfer",
      "preserveTraits": ["facial_identity", "facial_proportions"],
      "suppressTraits": [
        "source_body",
        "source_outfit",
        "source_pose",
        "source_environment",
        "source_style"
      ],
      "ownedAttributeGroups": ["Face"],
      "editableAttributeFields": ["Expression"],
      "processors": [
        "image_probe",
        "orientation_normalize",
        "face_region_detect",
        "face_attention_crop"
      ],
      "directiveId": "face_identity.v1"
    }
  },
  "directives": {
    "outfit_front.v1": {
      "base": "Transfer only the declared garment scope and suppress incidental wearer identity, pose, environment and visual style.",
      "replaceTemplateGarment": "Remove the corresponding original template garment before applying the replacement. Do not blend the original and replacement garments unless layering is explicitly enabled."
    },
    "face_identity.v1": {
      "base": "Preserve only facial identity and facial proportions. Follow destination expression, body, clothing, pose, environment and style."
    }
  },
  "authorityRules": [
    {
      "when": ["template_baseline", "outfit_front"],
      "domain": "garment",
      "winner": "outfit_front",
      "mode": "replace"
    },
    {
      "when": ["template_baseline", "outfit_front"],
      "domain": "pose",
      "winner": "template_baseline",
      "mode": "adapt"
    }
  ],
  "providerOverrides": {
    "gemini/*": {
      "referenceOrder": [
        "template_baseline",
        "character_reference",
        "face_reference",
        "outfit_front",
        "outfit_back",
        "style_reference",
        "pose_reference"
      ],
      "directiveSuffixIds": [],
      "dispatchRules": [],
      "structuredBrief": {
        "id": "fashion_template_character_outfit_v1",
        "generationSurfaces": ["fashion"],
        "requiredRoles": [
          "template_baseline",
          "character_reference",
          "outfit_front"
        ],
        "task": "Generate one photorealistic vertical commercial fashion photograph.",
        "templateDirection": {
          "authority": [
            "pose",
            "movement",
            "camera",
            "framing",
            "environment",
            "lighting"
          ],
          "preserve": ["destination pose and scene direction"],
          "ignore": [
            "template person identity",
            "template skin tone",
            "template body proportions",
            "template clothing"
          ]
        },
        "characterIdentity": {
          "authority": [
            "identity",
            "face",
            "hair",
            "skin",
            "body shape",
            "body proportions"
          ],
          "preserve": [
            "recognizable facial identity",
            "hairstyle",
            "skin tone",
            "complete body proportions"
          ],
          "ignore": [
            "source background",
            "source pose",
            "source clothing",
            "casting sheet layout"
          ]
        },
        "outfitTransfer": {
          "authority": ["garment"],
          "preserve": [
            "garment silhouette",
            "construction",
            "color",
            "pattern",
            "material"
          ],
          "ignore": [
            "outfit source identity",
            "outfit source skin tone",
            "source pose",
            "source environment"
          ]
        },
        "output": {
          "subjectCount": 1,
          "singleFullFramePhoto": true,
          "fullBodyVisible": true,
          "prohibit": [
            "identity blending",
            "template skin tone",
            "multiple views",
            "casting sheet",
            "white casting clothes"
          ]
        }
      }
    }
  }
}
```

### 5.3 Configuration Rules

- Configuration validates at server startup and fails fast in development.
- Unknown processor or directive IDs are rejected.
- Every policy change requires a new `policyVersion`.
- Provider capability values are not duplicated here.
- Provider overrides may adjust ordering/directives only within capabilities
  reported by the Provider Registry.
- JSON must not contain executable expressions, secrets, filesystem paths or
  user-visible translated strings.
- Directive text is server prompt policy and is not stored in i18n catalogs.
- Jobs store policy and directive IDs, not an unbounded duplicate of the whole
  configuration.
- Provider reference order is an execution-strength control, not a replacement
  for domain authority. Explicit Character/Face identity derivatives must be
  dispatched before person-bearing Outfit and Template images. Outfit follows
  identity, while the Template baseline follows explicit replacements and
  remains authoritative only for composition, pose, environment and lighting.
- An approved Reusable Character supplies its canonical, server-authorized
  three-view casting image for Fashion identity. Manual provider trials showed
  that the complete front/side/back Character evidence preserves identity,
  hairstyle, skin tone and body proportions more reliably than an inferred
  face crop or front-only derivative. The JSON authority contract must instruct
  the provider to ignore the casting layout, source pose, white background and
  casting clothes so they are not reproduced in the final single image.
  Derivative URLs are accepted
  only when returned by the server-owned Character version; client-provided
  `/outputs/character-profiles/...` paths are not trusted.
- Gemini Fashion sends references in an explicit, stable sequence:
  `IMAGE_0 = Template`, `IMAGE_1 = canonical three-view Character`,
  `IMAGE_2 = Outfit Front`, and optional `IMAGE_3 = Outfit Back`.
  A config-driven structured JSON brief maps each image to its exclusive
  authority. Template controls composition/pose/scene, Character controls
  identity/face/hair/skin/body, and Outfit controls garment only. The provider
  receives this JSON contract before the resolved destination prompt.

## 6. Processing Stages

```text
1. Resolve actor and source ownership
2. Load canonical source metadata
3. Validate MIME, size, dimensions and provider compatibility
4. Probe orientation and content fingerprint
5. Analyze role-relevant regions and confidence
6. Resolve requested/inferred scope
7. Create deterministic or semantic derivative
8. Build authority plan
9. Filter or override conflicting structured attributes
10. Deduplicate processed references
11. Validate final provider reference count
12. Compile ordered role directives
13. Estimate/reserve credits from the exact execution plan
14. Dispatch through the existing Queue Manager
15. Persist processing and lineage metadata
```

Estimate and generation must use the same immutable processing-plan
fingerprint. A changed source, scope, processor result or policy version makes
the estimate stale.

## 7. Processor Interface

```ts
interface ReferenceProcessor {
  id: string;
  version: string;
  supports(input: ProcessorInput): boolean;
  process(input: ProcessorInput): Promise<ProcessorOutput>;
}
```

Processor categories:

- deterministic: probe, rotate, resize, attention crop;
- semantic local: face/person/garment/pose region analysis;
- provider-assisted: deferred and feature-gated;
- multi-stage generation: deferred Premium route.

Processors never call a provider directly from React or bypass the Generation
and Credit services.

## 8. Outfit Behavior

For a person-worn Outfit image:

1. Detect whether top, bottom, full look or one product is visible.
2. Suppress face, hair, body identity, pose, environment and source lighting.
3. Produce an isolated/normalized derivative when supported.
4. Show the inferred garment scope to the user.
5. Require confirmation only below the configured confidence threshold.
6. Replace the matching Template garment instead of layering by default.
7. Adapt hands when the Template pose depends on a removed garment.

If multiple garments are visible and the system cannot confidently infer the
intended scope, status is `action_required`; it must not guess after charging
credits.

## 9. Shared UI Contract

Reuse shared components:

```text
ReferenceInputCard
ReferenceProcessingPreview
ReferenceScopeSelector
ReferenceAuthorityNotice
ReferenceQualityWarning
```

Expected UX:

- Upload remains one action.
- Accepted references show a normalized preview and concise role label.
- Low-confidence scope shows 2-4 visual choices, recommended choice first.
- Attributes controlled by a reference are hidden or disabled with one clear
  explanation.
- Users may replace/remove a reference without resetting unrelated work.
- Advanced technical processor details remain outside the normal workflow.

The UI consumes `publicAuthorityProjection`; it does not reproduce server policy
JSON or authority logic.

## 10. Canonical Module Ownership

Planned files:

```text
server/domain/reference-processing/
  ReferenceProcessingService.js
  ReferencePolicyRegistry.js
  ReferenceAuthorityPlanner.js
  ReferenceProcessorRegistry.js
  StructuredReferenceBrief.js
  referenceProcessingContracts.js
  processors/

server/config/
  reference-processing-policy.json
  reference-processing-policy.schema.json

web/src/features/generation/api/
  referenceProcessingApi.ts

web/src/features/generation/schemas/
  referenceProcessingSchemas.ts

web/src/components/generation/
  ReferenceProcessingPreview.tsx
  ReferenceScopeSelector.tsx
  ReferenceAuthorityNotice.tsx

test/
  referenceProcessingPolicy.test.js
  referenceAuthorityPlanner.test.js
  referenceProcessingService.test.js
```

Derived files use the existing Asset repository and storage. If a derivative
index is required, it belongs under the Asset capability and records:

```text
sourceAssetId
derivativeAssetId
processorId
processorVersion
policyVersion
inputFingerprint
createdAt
```

No independent reference-image filesystem or JSON database is introduced.

## 11. Integration Impact

### Generation

`generationRequestService` requests a processing plan before prompt compilation.
Queue options receive processed asset pointers, authority plan, ordered role
manifest and policy version.

### Prompt Compiler

Compiles only effective attributes and directive IDs from the authority plan.
It must not combine suppressed selections back into the prompt.

### Templates

Template baseline is server-resolved. Declared replacements override only their
domains. Template version lineage records the processing policy used per result.

### Character Profiles

Character type determines whether outfit is preserved or replaceable. The
pipeline does not infer this from the image.

### Comparison

Every slot receives the same processing plan and processed references. Provider
adapters may translate ordering, but they may not reinterpret roles.

### Fashion Blueprint

Single and bulk items bind to normalized garment scope. Identical source
products reuse cached derivatives and do not repeat preprocessing.

### Credits

MVP deterministic preprocessing has no separate user charge. Estimates count
the unique processed references actually dispatched. Future semantic/premium
processing may add an explicit, visible line item.

## 12. Security And Privacy

- Resolve actor identity from `req.actorContext`.
- Verify source ownership or an explicit public reuse capability.
- A public preview URL alone never grants generation access.
- Derived assets inherit source ownership and visibility restrictions.
- Do not persist Base64 in snapshots, plans or diagnostics.
- Do not log raw prompts, images or private paths.
- Template baseline authorization is scoped to its Use Session.
- Client-supplied role, scope and options are validated against server policy.
- Public lineage exposes role/policy metadata, not private asset identifiers.

## 13. Diagnostics

Safe diagnostic fields:

```text
requestId
jobId
policyVersion
role
sourceKind
processorIds and versions
inferred scope and bounded confidence
warnings/error codes
provider/model
final reference count
processing duration
execution plan fingerprint
```

Images, Base64, full prompts and private storage paths are excluded.

## 14. Error Contract

Stable codes:

```text
reference_source_not_found
reference_access_denied
reference_media_invalid
reference_role_unsupported
reference_scope_required
reference_quality_insufficient
reference_processing_failed
reference_conflict
reference_capacity_exceeded
reference_policy_invalid
reference_plan_stale
```

Errors occur before credit reservation whenever possible.

## 15. Testing

### Configuration

- JSON Schema validity and unique policy version.
- Every role references known processors/directives.
- Provider overrides cannot exceed Provider Registry capabilities.
- Startup rejects malformed policy.

### Authority

- Face controls identity while Expression remains editable.
- Character outfit behavior follows Reusable/Styled policy.
- Outfit replaces garment but cannot replace identity, scene or pose.
- Style cannot copy garment or identity.
- Pose cannot copy clothing or environment.
- Template locked fields remain locked.
- Explicit replaceable Template field overrides baseline only in its domain.

### Imperfect Inputs

- Person-worn full look.
- Product-only image.
- Cropped torso.
- Multiple garments with uncertain scope.
- Busy background.
- Rotated image.
- Very small/unreadable image.
- Front and Back mismatch.

### Regression Scenario

```text
Template:
  denim jacket model in clothing studio

Outfit Front:
  different wearer, white T-shirt, blue jeans and sneakers in another studio

Expected:
  Template identity/selected Face, Template studio and approximate composition
  + white T-shirt, blue jeans and sneakers
  - no Outfit wearer identity, hairstyle, source pose or source room
  - no original denim jacket unless layering was explicitly selected
```

### Cross-Surface

- Studio, Scene Builder, Playground and Comparison produce the same authority
  plan for identical inputs.
- Fashion single and bulk runs reuse the same processor.
- Estimate and dispatch fingerprints match.
- Actor switching cannot reuse private derivatives.
- History lineage stores policy/processor IDs.

## 16. Implementation Plan

1. Freeze contracts and JSON Schema with fixtures.
2. Add policy registry and startup validation without changing behavior.
3. Add authority planner and compatibility policy tests.
4. Make server prompt compilation consume effective selections.
5. Add deterministic Sharp processors and Asset derivative metadata.
6. Add shared processing preview and scope confirmation UI.
7. Integrate Single generation, then Comparison, then Templates/Fashion.
8. Add optional semantic processor adapters behind feature flags.
9. Record policy lineage and safe diagnostics.
10. Run cross-surface E2E and enable per role/provider.

Each stage must retain one canonical generation and credit pipeline. No surface
may ship a private copy of the authority rules.

## 17. Acceptance Criteria

- One JSON policy controls role boundaries and attribute authority.
- Configuration can be versioned and tuned without editing every workflow.
- Arbitrary person-worn Outfit input does not become identity/scene authority.
- The UI and prompt compiler consume the same authority projection.
- Provider limits and credit estimates use processed, deduplicated references.
- Results record policy and processor lineage.
- Deterministic fallback and semantic processors share one interface.
- Existing reference workflows remain available during staged rollout.

## 18. Implementation Record

Implemented canonical owners:

```text
server/config/reference-processing-policy.json
server/config/reference-processing-policy.schema.json
server/domain/reference-processing/
server/domain/reference-processing/StructuredReferenceBrief.js
server/domain/generation/prepareGenerationReferences.js
server/providers/resolvedReferenceImages.js
web/src/components/generation/ReferenceProcessingPreview.tsx
web/src/components/generation/ReferenceScopeSelector.tsx
web/src/components/generation/ReferenceAuthorityNotice.tsx
web/src/components/generation/ReferenceQualityWarning.tsx
```

Single generation, Template use, Character use, Playground and Comparison now
enter the same server preparation path. Credit estimates and reservations bind
the processed unique-reference count and processing-plan fingerprint. Queue
dispatch uses the same ordered role plan used to compile `Reference image N`
directives, and history stores only the safe public processing lineage.

The current MVP processors are deterministic Sharp probe, EXIF orientation
normalization and bounded resize. Semantic detection/isolation and premium
multi-stage processing remain deferred by Sections 7 and 16; no UI claims that
those processors ran. Outfit scope is selected explicitly and stored in the
request so later semantic adapters can replace the implementation without
changing the public contract.

The React generation command now obtains its locked estimate from the same
draft snapshot submitted to `/api/generate`. This closes the debounce race in
which a newly suppressed selection or changed reference plan could be submitted
with the previous query's estimate and trigger `credit_estimate_stale` even
though the displayed account balance was sufficient.
