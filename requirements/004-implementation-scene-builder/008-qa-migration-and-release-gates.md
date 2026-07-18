# Scene-008 QA, Migration and Release Gates

**Status:** Proposed - Awaiting Review  
**Feature type:** QA, compatibility and launch gates  
**Depends on:** Scene-001 through Scene-007  
**Created:** 2026-07-18

## 1. Objective

Define quality gates for Scene Builder and community template reuse.

## 2. Migration Checks

- Existing Story/normal mode history still loads.
- Existing Headshot -> Character Sheet handoff still works.
- Character Sheet -> Scene Builder handoff attaches Character Reference.
- Existing prompt visibility behavior remains compatible.

## 3. Template Test Cases

Required MVP cases:

```text
TC-SCENE-001 Guided template with character reference replacement
TC-SCENE-002 Guided template with outfit color replacement
TC-SCENE-003 Guided template with outfit front/back replacement
TC-SCENE-004 Manual template with prompt and face reference slot
TC-SCENE-005 Remix Only template where prompt text is hidden but template works
TC-SCENE-006 Missing required replacement slot blocks generation
TC-SCENE-007 Old history record without template snapshot degrades gracefully
TC-SCENE-008 Provider/model unavailable fallback
```

## 4. Safety Checks

- Private references are not exposed in public template payloads.
- Prompt visibility is enforced on public APIs.
- User replacement text is validated like normal custom text.
- Upload metadata is stripped before public sharing.

## 5. UX Checks

- Guided/Manual switch does not erase user work unexpectedly.
- Required replacement checklist is understandable.
- `Use Template` does not require prompt typing for common Guided templates.
- Manual Mode still supports full prompt editing.

## 6. Release Gates

### Gate A: Local Prototype

- Scene Builder naming visible.
- Guided/Manual UI prototype exists.
- Template JSON can serialize and hydrate locally.

### Gate B: Private Template Beta

- Share preview works.
- Use Template opens Scene Builder with replacement slots.
- Remix events are recorded.

### Gate C: Community MVP

- Public posts can include Scene Template workflow snapshot.
- Prompt visibility and reference privacy are enforced.
- At least five official reusable templates pass QA.

## 7. Software Development Specification

### 7.1 Required Automated Checks

Add lightweight tests where possible:

- Scene template snapshot serialization.
- Template hydration with missing/stale fields.
- Variable required/missing validation.
- Reference slot privacy policy validation.
- Legacy history item fallback.

### 7.2 Manual QA Checklist

Manual QA must cover:

- Guided Mode generate.
- Manual Mode generate.
- Guided to Manual prompt copy.
- Manual to Guided without destructive parsing.
- Character Sheet to Scene Builder handoff.
- Share preview with private face reference.
- Use Template with required replacement slot.

### 7.3 Migration Data

Prepare sample records:

- Old normal/story history without scene snapshot.
- New guided scene history with snapshot.
- New manual scene history with snapshot.
- Community post using `Remix Only`.

## 8. Implementation Concerns

- Do not mark Scene Builder complete until legacy history and current handoff flows still work.
- QA must validate privacy through API responses, not only UI display.
- Missing replacement slots should block generation deterministically.
- Provider/model unavailable fallback must be tested with real catalog data.
