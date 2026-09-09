# 001 Definition, Identity And Lineage

ID: CLSFE-001. Status: baseline implemented; remaining acceptance checks tracked in PLAN. Owner: Character Profiles definition policy;
Generation owns execution snapshots. Parent: [master](000-master.md).

## Form Contract

All text accepts Thai/English, is trimmed and length-bounded in Unicode code
points. Reject invalid input on the server; never silently truncate identity.

| Field | Required | Bound / interpretation |
|---|---|---|
| name | yes | 1-80 characters; document name, not a verified person or ownership claim |
| ageYears | yes for a new definition | Positive integer within existing permitted age policy; exact intended age, not inferred from appearance |
| appearance | yes | 1-600 characters describing character/presentation, hair, build and distinctive traits |
| situation | yes | 1-800 characters describing role and context, not a second identity authority |
| outfit | no | At most 800 characters; resolved default must be visible and editable before quote |
| personality | no | At most 240 characters; visible stable default if omitted |
| existingCharacter | no | Authorized Profile ID + pinned Version/handoff; never just a client URL |

Do not require a separate twenty-field anatomy form. Important gender/presentation,
ethnicity, age and distinctive features explicitly provided by the user must
survive normalization and prompt construction. Do not infer those attributes from
the uploaded/reference person's appearance or fabricate a nationality from a name.

When a profile is selected, import canonical structured identity including its
age range. Do not invent an exact age from a range. Display the locked range;
an optional intended age may narrow within it without mutating the profile.
Reject conflict, or require explicitly clearing the selected Character to author
a new one. Legacy missing identity remains visibly incomplete; no guessed age.

Use existing age/safety and wardrobe policies. The technical proposal's blanket
adult wording must not override a selected age or silently change site-wide
eligibility. Any new age restriction requires a separate approved policy decision.

## Defaults And Authority

- No hidden AI analysis/generation to fill optional fields. Initial defaults are
  versioned recipe data, displayed before consent, and safe for the chosen age.
- Approved styled-character outfit preservation and reuse rights take precedence;
  a form cannot unlock wardrobe replacement forbidden by the selected identity.
- Role/personality may affect styling/performance, never the locked age/face/body.
- Name and situation are user data, not instructions to bypass prompt policy.
- Reference authorization uses CharacterUsageService and existing handoffs.
  Creating/approving an owned Look remains a different explicit action.

## Proposed Bounded Snapshot

Add a strictly validated optional `lookSheetDefinition` input and server-owned
`lookSheetSnapshot` result projection in the existing Generation contracts.
Names are proposed contract additions, not currently available API fields.

Snapshot contains schemaVersion, presetId/version, prompt recipe fingerprint,
normalized fields + resolved defaults, source Profile/Version when present,
authority/reference fingerprint, entry surface and generation strategy.
Keep total definition metadata <= 8 KiB excluding existing reference contracts.
Use stable IDs; no Base64, signed URLs, account credentials or raw private pack.

Generation owns the immutable accepted snapshot. Editing a form after submit
must not rename or re-age an earlier result or its exported document. On resume,
History/result projection supplies the accepted snapshot, not local draft text.
Preserve metadata through Queue, terminal result, History normalization and the
authorized DTO; optional fields keep legacy entries readable without a backfill.

Current stores remain `DATA_FILES.history` and existing Generation records.
No parallel look-sheet History JSON, auto-created Character or new SQL schema.
Actor drafts contain only bounded inputs/IDs and use existing versioned storage.
Public projections exclude the new private snapshot unless a later Community
requirement explicitly authorizes a sanitized subset.

## Tasks

- [x] DEF-01 Define strict client/server schemas and schema version.
- [x] DEF-02 Extend existing identity helpers; test age range and outfit authority.
- [x] DEF-03 Resolve visible defaults once; include them in preview/quote/submit.
- [x] DEF-04 Extend accepted Job/result metadata and History/API normalizers.
- [ ] DEF-05 Add versioned actor drafts; migrate without altering ordinary Image,
  Studio attribute or Video drafts.
- [ ] DEF-06 Prove owner-only reads and no profile/publication mutation.

## Acceptance

DEF-A1: missing/invalid/oversized inputs fail before quoting or enqueuing.
DEF-A2: new authoring works without Profile ID; selected identity remains pinned.
DEF-A3: conflicting age/wardrobe and foreign or expired handoffs are rejected.
DEF-A4: reopening a completed result retains the original name/age/preset.
DEF-A5: legacy History loads and public responses reveal no private snapshot.
Verify with `definition`, `generation`, `privacy` and `drafts` groups in [009](009-verification-and-release.md).
