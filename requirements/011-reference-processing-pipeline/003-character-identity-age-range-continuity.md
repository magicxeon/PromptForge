# RPP-003 Character Identity Age Range Continuity

**Requirement ID:** RPP-003  
**Status:** Implemented; automated and manual validation pending  
**Owner:** Character Profile and Reference Processing  
**Depends on:** RPP-002, Character Profile versioning and canonical Generation prompt compilation

## 1. Problem

Character Sheet stores the selected Age option, but Character reuse previously
carried only image identity and body authority into Scene, Playground and
Fashion generation. Providers therefore inferred age again from lighting,
skin rendering or the small face inside a three-view sheet. A Character created
as `Young Adult (24-27)` could consequently appear 35-40 years old.

Initial range propagation alone was insufficient. Portrait recipes that asked
for pores, cheek structure or natural variation could still invent mature
under-eye lines, facial folds and facial gauntness after reading the numeric
range. The canonical face image and its visible maturity must therefore remain
the visual authority, while the selected range acts as a bounded guard against
age drift.

## 2. Product Contract

Age remains the existing bounded option range. The product does not request or
store a person's exact real age.

Each Character Profile Version derives compact immutable identity metadata:

```json
{
  "identityMetadata": {
    "ageRange": {
      "attributeId": "character.004",
      "minimum": 24,
      "maximum": 27
    }
  }
}
```

The metadata follows the approved identity lineage:

```text
Face/Character selections -> Character Profile Version
-> authorized CharacterIdentityPack -> Generation prompt compiler
```

The server resolves this value from the authorized Character Version. A client
handoff cannot override the canonical range.

## 3. Compact Prompt Policy

Storage metadata and provider prompt text remain separate. Owner IDs, lineage,
permissions and asset metadata are never added to the prompt merely because
they are stored in the identity pack.

For Character use, the compiler emits one compact age-authority directive as
the final identity guard after destination pose, lighting, camera and
personality instructions:

```text
Treat the selected apparent age range of 24-27 years as an immutable part of
character identity. Preserve facial maturity and only source-consistent skin
texture. Do not invent age cues absent from the canonical identity reference.
Lighting, expression, lens treatment and personality direction must not make
the character appear older or younger than this range.
```

Age authority must not override destination Expression, Pose, Clothing,
Environment, Lighting or Camera. Those controls may change presentation but
must not change apparent age.

For a range whose maximum is `29` or lower, the guard explicitly prohibits
invented crow's feet, deep under-eye lines, forehead lines, deep nasolabial
folds, hollow cheeks, facial gauntness and gray hair. This does not request
beauty-filter smoothing: pores and fine skin detail that are visible in the
canonical face remain valid.

Portrait-lighting recipes must describe source-consistent skin detail rather
than generic `real skin pores` or `dimensional cheek structure`. Personality
text from legacy JSON is repaired from UTF-8 mojibake before provider prompt
compilation; unreadable encoded text must not influence apparent age or facial
structure.

## 4. Compatibility

- New Character Versions persist normalized `minimum` and `maximum` values.
- Existing versions derive the same metadata from their stored Age selection
  during authorized Character use without paid regeneration. A later metadata
  migration may persist that derived value without changing the visual version.
- A missing or unrecognized legacy Age selection produces no guessed numeric
  age. Generation continues with image identity authority only.
- Open-ended options such as `60+` use `maximum: null`.
- No new form field, Credit operation, reference asset or provider call is
  introduced.

## 5. Acceptance Criteria

- A Character created with `Young Adult (24-27)` exposes `24/27` in its
  server-authorized identity pack.
- Scene, Playground and Fashion prompts include the compact range directive
  whenever that Character is used.
- Client-supplied age metadata cannot replace the approved Version value.
- Existing Characters gain the range from their structured snapshot without
  paid regeneration.
- Generation without a Character Profile does not receive the directive.
- The age guard is the final compiled Character identity instruction and cannot
  be weakened by later portrait-lighting, camera or personality text.
- A youthful canonical face in the `24-27` range retains source-consistent skin
  detail without newly invented mature lines or facial gauntness.
- Legacy UTF-8 personality text is readable before it enters the provider
  prompt.
- Outfit behavior, canonical face override, effective reference count,
  Credit estimate and Queue behavior remain unchanged.

## 6. Manual Verification

1. Approve a Character with `Young Adult (24-27)`.
2. Build the same neutral Scene three times with restrained makeup and soft
   daylight.
3. Inspect the debug prompt and confirm that it contains the `24-27` apparent
   age directive once, at the end of the compiled direction.
4. Confirm the face remains consistent with the selected range without
   changing Character identity, body proportions or destination expression.
5. Repeat with an existing pre-migration Character and confirm the directive
   is derived from its stored Age selection.
6. Use Soft Character Portrait and confirm that lighting preserves visible
   source texture but does not introduce crow's feet, deep under-eye lines,
   hollow cheeks or deep facial folds absent from the canonical face.

## 7. Implementation Record

- Added compact age-range derivation and validation under the Character Profile
  capability.
- Character Profile Versions now persist or compatibility-derive immutable
  identity metadata from their structured Age selection.
- Character usage resolves age from the authorized server Version and adds it
  to the effective `character-identity-pack-v2` identity pack.
- The canonical Generation prompt compiler emits the bounded apparent-age
  directive only for Character usage and places it after all destination
  direction as the final age guard.
- Generic identity preservation now includes facial maturity and apparent age;
  permitted photographic variation cannot invent aging features.
- Personality summaries are repaired at the Character capability boundary and
  again defensively during Generation compilation when legacy mojibake is
  detected.
- Personality-led portrait lighting now preserves source-consistent texture and
  rejects invented age cues.
