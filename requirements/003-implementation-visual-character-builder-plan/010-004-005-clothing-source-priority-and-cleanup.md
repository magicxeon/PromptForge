# 010-004-005 Clothing Source Priority and Prompt Cleanup

**Status:** Draft  
**Parent:** 010-004  
**Depends on:** 010-004-001 through 010-004-004, 010-005

## Objective

Define how clothing prompt parts are selected, combined, omitted, or overridden.

## Source Priority

| Priority | Source | Output |
| --- | --- | --- |
| 1 | Outfit Front/Back Upload | upload reference phrase only |
| 2 | Outfit Base + Pattern + Color + Material | modular clothing prompt |
| 3 | Modest Default Fallback | safe fallback clothing |

## Upload Override Rules

If Outfit Front or Outfit Back exists:

- omit modular clothing prompt
- omit fallback clothing prompt
- use upload reference wording from 010-005
- retain modular selections as metadata only if needed for UI restoration

## Modular Prompt Assembly

Order:

```text
Outfit Base + Primary Color + Secondary Color + Pattern + Material
```

Example:

```text
wearing a simple fitted T-shirt and straight-leg jeans, in navy as the primary garment color, with white trim accents, subtle vertical stripe pattern on the top, matte cotton fabric
```

## Cleanup Rules

- If pattern is empty or `solid`, omit pattern language.
- If secondary color is empty, omit secondary color language.
- If material conflicts with outfit base, omit or soften material.
- Remove repeated garment nouns.
- Remove repeated color phrases.
- Do not mention uploaded outfit reference and modular outfit in the same prompt.
- Do not mention fallback clothing when modular outfit exists.

## Test Matrix

| Case | Expected |
| --- | --- |
| no clothing selected | modest fallback |
| outfit base only | outfit base prompt only |
| base + primary color | base + primary color |
| base + primary + secondary | base + both colors |
| base + solid pattern | no pattern phrase |
| base + stripe pattern | stripe phrase included |
| base + material | material phrase included |
| upload + modular selected | upload phrase only |

## Acceptance Criteria

- Prompt compiler output is deterministic.
- No duplicate clothing fragments appear.
- Upload reference ownership is respected.
- Cleanup tests cover common combinations.
