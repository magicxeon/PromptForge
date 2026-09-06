# CDI-03 Reuse Character Handoff

Status: Implemented; 17 focused client tests and 5 server contract tests passed.

1. Extract existing Profile handoff orchestration into Profiles
   `useCharacterHandoff.ts`; reuse requestCharacterHandoff, writeHandoff,
   createCharacterHandoffNavigationState and current routePaths.
2. Keep Profile callbacks/error/pending UI intact. Guard duplicate invocation
   while pending and discard completions for an actor who is no longer active.
3. Add CharacterCreateAction destination menu using established Radix menu and
   Button primitives. Explicit user selection only, exact available destinations,
   spinner/disabled state, accessible menu keyboard/focus and inline errors.
4. Reuse the same action component in Featured and result cards; no duplicated
   dispatch, altered reference envelope, silent fallback or generation call.
5. Test both destinations, API rejection, retry, double click, stale actor and
   denied UI. Verify existing Profile and handoff navigation tests separately.

Run: `node scripts/test-character-discovery.mjs --part=handoff`.
Server-only parity: `node scripts/test-character-discovery.mjs --part=contracts`.
Only mocks/fixtures for writes; browser review must not issue a generation call.

Evidence (2026-09-06): hook/action tests cover both destinations, rejection/retry,
duplicate invocation, stale actor/Character and unmount. Existing Profile control
and navigation tests pass. Server public projection and handoff contracts pass
unchanged; no real handoff or paid generation was executed.
