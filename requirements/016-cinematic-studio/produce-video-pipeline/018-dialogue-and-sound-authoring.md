# Dialogue And Sound Authoring

Status: implemented; multi-cue edits, save/reload and prompt tests passed 2026-09-12.
Generated speech accuracy remains user-controlled UAT, not a completed guarantee.
Owner: Cinematic Scene/Shot authoring and existing audio prompt contract.
Supersedes dialogue editor deferral in 016; exact speech services remain out of scope.

## User Flow

Story Plan > Scene direction > each Shot exposes Dialogue & Sound in both Simple
and Advanced modes. Show existing line count/summary and an obvious Add dialogue
action. Existing authored dialogue must not remain hidden behind Advanced.
Storyboard/Produce show a readable summary and an edit navigation action, not
separate independent editors or a second script store.

## Requirements

1. Reuse shot.dialogueCues and shot.audioCues. Current form reads index zero and
   replaces the full array on edit; replace that behavior with per-item editing
   that preserves every existing item and metadata not edited by the user.
2. Support ordered multiple dialogue rows with speaker (selected Cast or explicit
   offscreen voice), text, delivery and optional start timing. Add/remove/reorder
   actions use icons and accessible labels. Use the server's existing count and
   text limits; document any justified additive bound rather than silently truncate.
3. Support multiple sound cues through the same audioCues contract: kind,
   description and optional timing. Distinguish ambience/SFX/music direction from
   spoken text. Clear labels; no suggestion that a written cue is an audio file.
4. Preserve exact user-written wording, chosen language, order and speakers during
   edits, save/reload, AI preview/application and packet compilation. AI proposals
   change authored data only after explicit Apply. No new automatic paid call.
5. Validate nonempty entries, speaker scope, nonnegative timing within Shot length,
   and existing readiness rules. Long text versus short Shot duration should prompt
   review without silently deleting/rewriting lines. Offscreen dialogue is allowed
   for a no-visible-Cast Shot; do not automatically add a visible person.
6. Carry all lines into the canonical video packet/prompt with speaker/delivery/
   timing and sound intent. Never silently discard audio on a model with no audio
   support: distinguish silent output from planned later sound production.
7. Direction edits invalidate affected quotes/packet approval using existing
   dependency handling, not all unrelated Scenes. Keep past Takes playable.
8. Multi-line text support does not certify verbatim speech, voice identity or lip
   synchronization. Voice cloning, TTS integration, dubbing and generated subtitle
   services are outside this scope; retain existing exact-audio readiness policy.

## Acceptance

Compatibility: edited/new Shot audio uses audioDirectionVersion=1. Existing
unmodified packets keep their prior rendering and fingerprints. New audio carries
named speakers and delivery into the canonical prompt. Sound-off renders keep the
script and display a silent-output notice. No audio service or price is added.

Three alternating dialogue lines plus two sound cues; edit middle row, reorder,
remove, save/reload and compile without losing other rows. Test legacy multi-line
arrays, quoted Thai/English, explicit offscreen speaker, no-Cast Shot, duration
change and unsupported audio model. Verify full packet round trip and no hidden
pricing or AI invocation. Check keyboard/mobile operation and adjacent Shot forms.
