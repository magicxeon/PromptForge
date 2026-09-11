# Explicit Cast Coverage

Status: implemented; isolated validation passed; visual UAT pending. Owner: Cinematic Cast/Scene/Shot authority and Generation refs.

- Scene and Shot express explicit no-person coverage versus selected/inherited
  Cast. A deliberate empty Shot must never inherit people from its Scene.
  Keep legacy fallback only for records without the new explicit coverage marker.
- AI can plan establishing, environment, object/prop and transition Shots with
  no visible person. No wardrobe, face, identity, gaze or human performance is
  required for these; atmosphere/environment action can carry the story. Audio
  may still refer to an authorized offscreen speaker.
- Multiple visible Cast must resolve each actor-authorized identity/reference
  separately in deterministic order, never use the first person for all roles.
  Extend canonical Reference Processing with bounded named Cast slots and capability preflight;
  reject unsupported capacity before quote or payment. Do not remove the old
  one-person guard until actual reference-count and identity parity are tested.
- Character/Look Sheet authority is shared by Story Plan, Storyboard and Video.
  Deduplicate IDs. Invalid, revoked or expired references fail closed, never
  silently omit a person. Existing approved source replacement invalidates only
  dependent work. No public access expansion or new character creation.
- Test none/one/multiple/legacy cases, parent fallback, source ownership, reference
  limits, no extra wardrobe for none, and model filtering plus single/batch parity.

## Implemented Qualification

Two to six visible Cast members use one approved whole sheet per person, from a
direct generated Cast source or an approved versioned Character Look. Named sheets
retain Shot order, names and content hashes in the plan fingerprint. Missing or
unauthorized Cast, changed source bytes, expired trust and insufficient provider
capacity fail closed. Quote preparation and queued dispatch reauthorize sources.

Legacy outfit-only multi-Cast remains blocked until every visible person has a
whole approved sheet; the existing single-Cast path is preserved. Scene Director
can inherit Scene Cast, select a subset, or explicitly show no people. Changing
Scene Cast/Looks does not refill explicit empty or selected-subset Shots.
