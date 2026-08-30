# CINE-FIX-004 Shot Emotion And Cinematic Realism Authority

**Priority:** P0
**Status:** Implemented; live provider quality check pending
**Reported Job:** `job_1788100284843_5vibarh3q`

## Evidence

The persisted Job prompt contains the old authored Shot prompt but does not
contain Scene `emotionalStart`, `emotionalEnd`, story change, blocking or the
new Storyboard still contract. The Shot dialog preferred `shot.prompt` over the
compiled default whenever a saved prompt existed. The same Job also includes a
Character personality directive containing a smiling trait, which conflicts
with the Scene's tense/apprehensive performance.

## Required behavior

1. A saved authored Shot prompt is input to the Storyboard compiler; it must
   never bypass Project, Plan, Beat, Scene, Character, Look or continuity
   authority.
2. Resolve one observable emotional target for the selected Shot:
   - first Shot uses Scene emotional start;
   - last Shot uses Scene emotional end;
   - intermediate Shots use an explicit transition state;
   - a single Shot receives one dominant state with the Scene arc as context.
3. Scene/Shot performance, gaze and emotional target override baseline
   Character personality for the current expression. Personality must not
   force smiling or eye contact.
4. Add a versioned server-owned Storyboard still Prompt Recipe. It applies to
   every `generationSurface=cinematic`, `generationMode=scene` final prompt,
   including single-Shot and Generate All submissions.
5. The recipe requests photographic cinematic realism through physically
   plausible practical lighting, natural skin/material detail, subtle
   asymmetry, environment integration and restrained grading. It rejects
   beauty filters, plastic skin, glamour posing and unrequested smiles.
6. Prompt configuration is source-controlled server configuration, not Project
   runtime data, localization text or UI-only hard-coding.
7. Deployment must rebuild the static React bundle served by port 6500 so the
   tested browser contract matches source.

## Regression checklist

- Existing Character identity, age, wardrobe and reference authority remain
  immutable.
- Audio intent stays outside still-image prompts.
- Non-Cinematic Playground, Studio and Fashion prompts remain unchanged.
- Manual and batch Storyboard generation retain estimate/submit parity.
- The final compiled prompt records recipe ID/version/fingerprint in tests or
  deterministic evidence where supported.

## Evidence (2026-08-30)

- Adapter tests cover opening/final emotion, saved-contract de-duplication,
  no-smile authority and existing Character/Look/continuity behavior.
- Server tests cover recipe application, personality precedence and isolation
  from non-Cinematic Scene generation.
- Browser inspection of the rebuilt Project route confirmed the first Shot
  contains `Selected Shot emotional target: Tense and watchful` and the explicit
  no-smile rule.
- Focused Web: 44 tests passed. Focused server Generation/Cinematic: 34 tests
  passed. Full Web: 94 files / 337 tests passed. TypeScript, i18n and production
  build passed.
- Remaining gate: submit one deliberate live Shot after restart and compare the
  persisted final Job prompt plus identity, expression and realism output.
