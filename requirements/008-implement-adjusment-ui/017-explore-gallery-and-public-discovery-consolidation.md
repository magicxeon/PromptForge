# UI-017 Explore Gallery And Public Discovery Consolidation

**Status:** Pending UI-015 and UI-016  
**Depends on:** canonical routes and context navigation

## 1. Purpose

Consolidate Home and Community into `/`, named Explore, with Gallery as its
default view. Public Images, Templates, Characters and Comparisons remain
distinct resource types but share one discovery language.

## 2. Explore Destinations

```text
Gallery      mixed public work and category discovery
Comparisons  published comparisons for inspection and voting
Templates    reusable published templates
Characters   reusable published characters
```

Collections may appear as Gallery items and on Profiles but are not a primary
Explore destination for MVP.

## 3. Discovery Rules

- Gallery preserves category, content-type, sort and pagination in URL search
  parameters.
- Cards use the shared media preview/attention-crop infrastructure while detail
  pages use full approved media.
- A card opens the canonical resource detail, not a modal-only dead end.
- Template and Character cards communicate usability and permission before the
  user enters a creation flow.
- Comparison cards open the reusable Comparison workspace.
- Public APIs expose only sanitized snapshots and permitted prompts/references.

## 4. Reuse Handoffs

- `Use Template` routes to Playground or Fashion Studio according to immutable
  Template compatibility.
- `Use Character` offers only authorized destinations: Character Sheet, Scene
  Builder, Playground or Fashion Studio.
- Published Comparison is for inspect/vote/share; creating a new Comparison
  begins from Studio or Playground.

## 5. Acceptance Criteria

- `/` and the logo open Explore/Gallery.
- No duplicate Home and Community landing pages remain canonical.
- Filters survive detail navigation and context return.
- Every public card has a complete detail route and creator Profile link.
- Reuse actions create actor-owned handoffs and preserve source lineage.

