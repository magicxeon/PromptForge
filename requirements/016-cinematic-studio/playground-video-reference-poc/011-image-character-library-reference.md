# 011 Image Character Library Reference

Status: implemented and deterministically verified.
Parent: [000-master.md](000-master.md).
Owning capabilities: Profiles for Character authority; Playground for selection;
Generation for estimate and execution.

## Outcome

Image Playground lets a creator choose an owned or reusable Community Character
through the same library picker used by Template and Video flows. The provider
receives the authorized canonical Character reference and pinned Profile Version,
not the display thumbnail.

## Contract

1. Add `playground_image` as an explicit Character handoff destination for both
   Character types currently accepted by Scene Builder.
2. The server rechecks view/reuse permission, active Version, Character type and
   canonical reference Asset before returning the handoff.
3. The client binds `character_reference`, `characterProfileContext`, outfit
   behavior and display-only Community artwork as one selection.
4. Manual replacement/removal clears the Character context so stale identity
   authority cannot accompany another image.
5. The Character selector appears only in Image mode. Model capability remains
   authoritative: unsupported models hide/disable reference use through the
   existing Generation component.
6. Actor switching clears the selected Character and its draft context.

## Implementation Steps

1. Extend the Character destination policy, handoff API schema and tests.
2. Add a small Playground-owned Character selection panel around the shared
   `CharacterLibraryPicker`.
3. Persist IDs/context and display metadata in the actor-scoped Image draft; do
   not persist Base64 or private signed URLs.
4. Pass the authorized reference, display preview and Character context to the
   existing `GenerationExperience`.
5. Verify selection, removal, actor switch, unsupported model and estimate payload.

## Acceptance

- Template and Scene Builder picker behavior is unchanged.
- Community artwork is presentation only; generation uses the canonical handoff.
- Quote and submit include the same pinned Character Profile and Version.
- Selecting a Character never calls a provider or spends Credits.

## Verification Evidence

- Character destination, lifecycle and public-projection tests pass for reusable
  and styled Characters, including `playground_image`.
- Shared picker and Playground selection/removal tests pass; TypeScript and i18n
  validation pass.
