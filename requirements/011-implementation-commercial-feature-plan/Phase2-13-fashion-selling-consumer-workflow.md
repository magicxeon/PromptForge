# Phase 2-13 Fashion Blueprint Commercial Integration

**Status:** Proposed - Awaiting Review  
**Audience:** Thai small merchants  
**MVP limit:** One to five wearable clothing products per Batch

## 1. Business Objective

Allow merchants to create consistent selling images without understanding prompts, camera terminology or the full Advanced Studio.

The user-facing Blueprint workflow is owned by
`requirements/010-implementation-fashion-blueprint`. This commercial phase
replaces its development adapters with production Projects, PostgreSQL, Cloud
Storage, durable jobs, payment-backed credits and operational policy. It must not
fork the Blueprint page, plan resolver or shared generation controls.

## 2. Entry and Project Setup

Community/Solution Home card: `สร้างภาพขายแฟชั่น`.

Wizard:

```text
1 Products -> 2 Model -> 3 Scene & Style -> 4 Image Pack
-> 5 Review & Price -> 6 Generate -> 7 Approve & Export
```

The wizard stores a draft Project continuously. Users may leave and resume.

## 3. Step Requirements

### Products

- Upload one to five products and classify references.
- Name/SKU/color and product integrity selection.
- Optional quoted Product Analysis.

### Model

- Ready template, template variation or custom Model Profile.
- Show setup/candidate cost before generation.
- Require approved canonical Model Profile.

### Scene and Style

- Visual scene and photographer-style cards.
- One shared scene/style in initial MVP.
- Advanced editing opens Studio using Visual Character Builder contracts within Project context.

### Image Pack

- Select predefined shot pack.
- Preview included framing/purpose, output count and platform intent.
- Allow limited supported customization without exposing raw prompt.

### Review and Price

- Summarize products, model, scene, consistency, outputs and optional operations.
- Display maximum total credits and package inclusions.
- Require explicit confirmation.

## 4. Generation Plan Contract

Fashion module creates a validated plan, not jobs directly:

```json
{
  "moduleId": "fashion-selling",
  "projectId": "project_001",
  "productItemIds": ["product_001"],
  "modelProfileVersionId": "model_version_001",
  "consistencyProfileVersionId": "consistency_version_001",
  "shotPackVersionId": "fashion-starter-v1",
  "operations": [],
  "quoteId": "quote_001"
}
```

Core Pricing, Ledger and Job Orchestrator validate and execute it.

The production plan must remain compatible with
`FashionBlueprintPlan` and `FashionBlueprintQuote` from requirements 009.
Development-only owner IDs, JSON paths, local file references and mock estimates
must not cross the production adapter boundary.

## 4.1 Production Adapter Responsibilities

```text
Character Profile/version -> PostgreSQL owner-scoped record
Outfit references         -> private Cloud Storage assets
Blueprint draft/run       -> PostgreSQL Project-scoped records
Quote/reservation         -> transactional credit ledger
Generation operations     -> durable jobs + Cloud Tasks
Results                   -> Cloud Storage + result metadata
```

The current Vanilla JavaScript Blueprint client continues to consume stable
HTTP contracts. A frontend framework rewrite is not required.

## 5. Collections

- Create a default Collection for each Product.
- Successful outputs join their Product Collection.
- Approved outputs may also join an Approved Collection.
- Cover and custom Collections remain available.

## 6. Errors and Recovery

- Preserve completed products when another fails.
- Explain whether retry is free, refunded or newly billable.
- User can return to the relevant wizard step to fix invalid configuration.
- Safety or integrity warning does not expose raw provider payload.

## 7. Acceptance Criteria

- A first-time user can complete the flow without opening Advanced Studio.
- Every Batch has an accepted quote and immutable configuration snapshot.
- Maximum five products and package limits are enforced server-side.
- Resume does not lose draft or duplicate confirmed Batch.
- Outputs are grouped by Project/Product automatically.
- Advanced edits compile through the same authoritative server prompt pipeline.
