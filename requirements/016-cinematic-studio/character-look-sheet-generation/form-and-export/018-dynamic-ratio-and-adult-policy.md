# Dynamic Ratio And Adult Policy

Status: implemented; focused domain/UI checks passed. Parent: 017.

## Ratio

- Remove the document editor's fixed 3:4 constraint. Use the selected model's
  catalog ratios; initial preference is portrait when available.
- Switching provider/model preserves the current ratio if supported; otherwise
  choose its equivalent 3:4/6:8 alias or a supported portrait/default ratio.
  Do not disable an otherwise eligible provider merely for the old model's ratio.
- Retain genuine reference count, release and pricing restrictions. Fixed-ratio
  workflows outside document Look Sheet must keep their restrictions.
- UI estimate and submit use the same catalog spelling. Do not relax server
  validation to accept ratios that the provider adapter cannot transport.
- Canonical prompt states the chosen ratio and adapts single-page panel layout
  to portrait/landscape/square. Keep original output unmodified for trusted use.

## Age

- Product policy: document Look Sheet minimum 18, maximum 120; not a claim about
  a universal provider rule. Enforce client readiness and server acceptance.
- Existing selected identity must have minimum >=18. Reject underage, unknown,
  and 15-19 ranges without silently changing approved identity or stored records.
- Drafts can retain old invalid values for correction; historical snapshots remain
  readable. Empty age is allowed while editing but not for standalone generation.
- Ordinary Face/Character sheet/Scene identity ranges remain unchanged.
- Return a stable Look Sheet-specific error before enhancement or image spend.
