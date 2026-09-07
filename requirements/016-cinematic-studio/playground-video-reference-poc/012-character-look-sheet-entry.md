# 012 Character Look Sheet Entry From Image Playground

Status: implemented and deterministically verified.
Parent: [000-master.md](000-master.md).
Canonical owner: Character Profiles / Character Look lifecycle.

## Outcome

After choosing a Character in Image Playground, the creator can start Character
Look Sheet preparation without a new page or a parallel Look/Generation workflow.

## Reuse Contract

1. Reuse `CharacterLookDialog` for source direction/upload and
   `CharacterLookGenerationDialog` for the billable generation workspace.
2. Reuse the existing Character Look draft, generation plan, estimate, Credit,
   Queue, result adoption, review and approval contracts unchanged.
3. The Playground entry opens AI mode for the selected owned Character and labels
   it as Look Sheet preparation. It does not auto-generate, auto-adopt, approve or
   bind a Look.
4. Community Characters may be used as image references when authorized, but Look
   creation is owner-only because it mutates private Character state. The action
   is hidden with an explanatory state when the selected Character is not owned.
5. On save, invalidate the Character Look query only. The current Image prompt,
   model, references and result remain intact.

## Implementation Steps

1. Project ownership in Character summaries used by the picker.
2. Add a Look Sheet action to the selected Character panel for owner selections.
3. Mount the existing Look dialog with selected Profile/Version and AI mode.
4. Add UI regression tests proving no duplicate provider, Credit or Look workflow.
5. Retain existing Character Profile and Cinematic entry points.

## Acceptance

- No new route, repository, provider adapter or pricing table is introduced.
- Closing Look preparation returns to the unchanged Image Playground draft.
- A completed candidate still requires explicit Review and Approve.
- Existing Character Look tests remain authoritative and pass.

## Verification Evidence

- Playground entry tests confirm owner-only Look access and no automatic
  generation.
- Existing Character Look dialog suite passes all source, generation, review and
  approval behavior unchanged.
