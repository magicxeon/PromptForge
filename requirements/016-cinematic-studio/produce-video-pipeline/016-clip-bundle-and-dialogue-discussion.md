# Clip Bundle And Dialogue Discussion

Status: scope approved under 021 and implemented 2026-09-12. Packaging and
selection tests passed; final evidence is in plan 009. Exact-speech remains deferred.
Owner: Cinematic. Reviewed code on 2026-09-12, no paid provider verification.

## Before Implementation: Clip Download Findings

Individual video viewing/downloading uses shared media controls. No Cinematic
bulk clip download route/control was found in the current API, route, domain or
Produce UI. Finish has an export placeholder; 007 final assembly is a distinct
capability and must not be described as an already working clip ZIP download.

## Requirement: Download Selected Clips

1. Download one ZIP containing the selected/approved Take for each included Shot,
   in Scene/Shot order. This is packaging existing media, not generation or a
   merged movie. Initial proposed scope is the Project's selected clips; all-Take
   archival and scene-only filtering are optional later scope, not assumed here.
2. Show a pre-download summary: selected clip count, total known size and Shots
   without an eligible selection. Never silently choose the latest Take. For
   gaps offer explicit download of the ready subset with omitted Shots listed;
   do not name an incomplete set complete. Zero ready clips disables download.
3. Pin an immutable selection/version manifest at request time. Recheck project
   and Asset ownership; use local authorized output Assets, never provider signed
   URLs or client-supplied paths. Safe deterministic names such as
   Scene-01_Shot-02_Take-03.mp4 and an ordered manifest containing safe IDs.
   Exclude private prompts, reference URLs and credentials from the bundle.
4. Cinematic owns the selection manifest; Assets owns media access/packaging via
   its facade. Before implementation inspect existing export utilities, choose
   streaming/bounded packaging and document size/count limits, cleanup on failure
   and cancellation, retention and any new runtime paths. No unbounded archive
   buffer or dozens of separate browser downloads. The bounded pilot contract is
   at most 128 selected clips / 128 MiB source media plus ZIP headers and manifest.
   Server streams the archive; authenticated browser download uses a bounded Blob.
   No ZIP is retained on disk; existing original media retention stays unchanged.
5. No AI request, generation Credit debit, auto-approval or re-render. Cancellation,
   missing files and failure must be surfaced, never a misleading success ZIP.
   Infrastructure/retention choices require finalizing before implementation.

## Before Implementation: Dialogue Findings

- Story Plan opens SceneDirectorDialog; ShotSequenceEditor exposes speaker,
  delivery and dialogue text under Advanced / Shot advanced settings.
- Stored Shot dialogueCues is an array, but the current manual form reads/edits
  only index zero. It is not yet a complete multi-turn conversation editor.
- CinematicVideoPacketCompiler normalizes these cues into packet.audio and
  compiles speaker/text/start-offset instructions into the video prompt.
- ProduceStoryContext displays an audio/dialogue summary. Presence in a prompt
  does not verify exact spoken wording, pronunciation, voice consistency or lip
  sync. Existing 007 exact-dialogue/audio-readiness requirements remain separate.

## Resolved Follow-up

2026-09-12 update: Dialogue & Sound discovery and multiple-line editing are now
requested scope under [018](018-dialogue-and-sound-authoring.md). The proposal
below is retained as context; exact speech services are still excluded. ZIP uses
one selected Take per Shot and requires explicit consent for a partial set.

Expose a discoverable Dialogue & Sound section without requiring Advanced mode.
Support multiple ordered lines with speaker, text, delivery and optional timing;
preserve offscreen voice data and check timing against Shot duration. Reuse
dialogueCues rather than introducing a second script format. Explicitly separate
authored text from verified generated speech and separately qualified voice/TTS
or lip-sync work. Do not enable new paid audio services in this round.

## Resolved Decisions

- ZIP means one selected Take per Shot, not every generated Take.
- Dialogue discovery/multiple-line editing belongs in this round under 018.
- No pricing change, media generation, final assembly or new audio service.
