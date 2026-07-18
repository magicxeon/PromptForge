# Phase 2-14 Fashion Shot Packs and Photographer Styles

**Status:** Proposed - Awaiting Review

## 1. Business Requirement

Users choose a commercial result set rather than configuring individual camera attributes. Versioned Shot Packs and Photographer Styles map consumer choices to structured attributes.

## 2. Shot Pack Contract

```json
{
  "id": "fashion-starter",
  "version": 1,
  "outputsPerProduct": 4,
  "shots": [
    { "key": "cover", "framing": "full-body", "purpose": "marketplace-cover" },
    { "key": "half", "framing": "medium", "purpose": "fit-and-style" },
    { "key": "detail", "framing": "close-up", "purpose": "fabric-detail" },
    { "key": "lifestyle", "framing": "wide", "purpose": "social-lifestyle" }
  ]
}
```

Pack versions are immutable after use. Deprecated versions remain readable for history.

## 3. Photographer Style Recipe

A style card maps to a recipe, not free text only:

- Lighting and color grading
- Camera/lens character
- Composition policy
- Preferred framing and scene compatibility
- Prompt fragments per provider where needed
- Excluded/conflicting tags
- Visual preview and bilingual description

Initial styles:

- Clean Marketplace
- Soft Lifestyle Cafe
- Fashion Editorial
- Minimal Studio
- Social Creator

## 4. Validation

- Validate all referenced attributes and provider mappings.
- Detect conflicts with Product integrity and selected scene.
- Preview human-readable recipe effects before confirmation.
- Style cannot silently override locked Model/Product properties.

## 5. Asset Workflow

- Reuse visual metadata and generation manifests from `requirements/003-implementation-visual-character-builder-plan`.
- Photographer-style samples require human brand/commercial approval.
- Example assets must disclose AI generation where required internally and track provenance.

## 6. Acceptance Criteria

- Selecting a Pack produces deterministic structured shot plans.
- Price derives from versioned output/operation counts.
- Style recipes compile consistently in client preview and server execution.
- Existing Batch keeps its original recipe after catalog updates.
- Unsupported/conflicting combinations fail before credit reservation where possible.
