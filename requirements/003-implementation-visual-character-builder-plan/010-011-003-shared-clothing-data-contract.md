# 010-011-003 Shared Clothing Data Contract

**Status:** Draft  
**Parent:** 010-011  
**Depends on:** 010-004-001 through 010-004-003

## Objective

Define where clothing option data lives so UI and prompt compilation stay aligned.

## Data Sources

Use attribute JSON for semantic prompt options.

Suggested files:

```text
attributes/010-clothing.json
```

Optional future split:

```text
attributes/clothing/outfit-base.json
attributes/clothing/pattern.json
attributes/clothing/material.json
attributes/clothing/color.json
```

Do not split files until the current single file becomes genuinely hard to manage.

## Required Fields

Each clothing option needs:

- stable `id`
- `category: clothing`
- specific `subcategory`
- bilingual label
- prompt phrases
- tags for cleanup/filtering
- enabled flag

## Acceptance Criteria

- Client visual configs map to semantic attribute IDs.
- Server compiler reads semantic selections, not visual IDs.
- Data can later migrate to database/admin configuration without changing selected IDs.
