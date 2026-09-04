# Package 002A - Additional Motion Direction

**Plan ID:** `016-PVP-IP-002A`  
**Status:** Complete  
**Requirement owner:** `../002` Section 3  
**Primary capability:** Cinematic Shot authoring  
**Reviewers:** Backend Platform Architect, Generative Media Pipeline, QA

## 1. Goal

Close the remaining Package 002 direction gap with one concise optional motion
instruction that belongs to the Shot. React never appends it to a compiled
prompt. The Cinematic server persists it, recompiles the video packet and
invalidates only video consumers of that Shot.

## 2. Contract

- `additionalMotionDirection` is optional and limited to 300 Unicode
  characters after whitespace normalization.
- The approved Storyboard still remains valid because this field controls
  temporal execution, not the immutable first-frame image.
- Existing video attempts and Timeline entries for that Shot become
  `packet_changed`; an approved clip is unbound without deleting history.
- Packet fingerprint and provider-independent prompt change deterministically.
- Quote, submit, provider, Queue and Credit paths remain canonical and
  unchanged; the next quote binds the recompiled packet.
- Approval recompiles and compares the current packet fingerprint so a result
  generated before the edit cannot be approved.

## 3. Steps

1. Add the optional Shot/schema and packet field plus configured phrasing.
2. Add a narrow Cinematic application mutation and thin HTTP/API adapter.
3. Add the controlled Produce input with save/reset and preserved unsaved text
   after an error or version conflict.
4. Project `packet_changed` as a recovery status without changing Story order.
5. Test normalization, Storyboard-source preservation, packet staleness,
   approval protection, compiler output and React behavior.

## 4. Exit Gate

- Saving motion direction does not clear the approved Storyboard source.
- Old video output cannot be approved or exported as current.
- A fresh quote uses the new packet fingerprint and generated prompt.
- Empty/reset direction restores the authored Shot contract.
- No client-side prompt concatenation or second generation workflow exists.
