# Cinematic Opening Scene Direction

Status: implemented; checkbox, persisted intent and explicit Scene Direction
proposal tests passed 2026-09-12. Creative quality remains manual pilot UAT.
Owner: Cinematic planning/direction, existing JSON prompt policy.

## Product Intent

First Scene means an intentionally directed film opening, not First Frame image
transport, title/logo animation or the time-zero opening of every Shot. It should
establish a visual question, atmosphere and story promise appropriate to this film.

## Interaction

1. Add a checkbox Cinematic opening in the first Scene's direction form, near its
   scene intent; initially unchecked for existing Projects. Optional brief opening
   direction may use the existing additional-direction field rather than a new
   mandatory long form. At most one opening Scene applies to a Project.
2. Prefer a stable Scene reference in the existing Project planning contract, not
   scene index alone. If ordering/removal makes a marked Scene no longer first,
   require explicit resolution; never transfer the creative intent silently.
   It is independent from shot.openingFrameVersion (time-zero still contract).
3. Checking the option records intent, not a Generate action. Existing Generate
   Plan/Scene Direction consumes it and presents a reviewable proposal. It must
   not trigger an extra AI call or generate media automatically.

## AI Direction

### Visual-Only Wording Revision (2026-09-12)

Ordered scope: (1) revise openingDirection guidance in story-authoring.v1.json;
(2) revise planning and Scene Direction instructions to anchor visual reactions
to visible actions, not quoted words; (3) prohibit generated readable text in the
video packet. Preserve authored dialogue in its separate audio contract and all
locked fields; do not silently delete dialogue or rewrite existing Projects.
No titles, subtitles, captions or readable prop/screen text in any language for
this unqualified generation flow. Future text support needs explicit qualification.
Use genre-sensitive visual hooks, not a copied film sequence or mandatory montage.
References: https://www.davidbordwell.net/filmart/prestige.php and
https://www.davidbordwell.net/essays/anatomy.php (principles, not fixed templates).
Implementation: prompt wording only; no schema, UI, pricing or dispatch change.
Verification: automated tests intentionally deferred at user request; next user
generation is visual UAT. Existing saved plans/frames are not retroactively fixed.

Use the configured story country style, Genre, Audience Feeling, pacing, total
runtime, approved story and Cast. An opening may use an evocative location,
meaningful object/detail, purposeful reveal or playable action; choose based on
story rather than always producing aerial/slow-motion montage.

Specify the initial visible composition, art direction, motivated light, lens/
camera intent, subject/environment action, sound entry, duration and transition
into the next Shot. Maintain props/weather/wardrobe/spatial and emotional continuity.
Do not place motion instructions as blur into a still; separate still time-zero
direction from video temporal movement through existing compilers.

Preserve runtime and approved plot/cast. Do not add Shots, characters, dialogue,
logos/titles or duration merely to make the opening dramatic without proposal
review. Opening may contain no person. Respect 017 policy: that case must have
a valid no-Cast video route and must not invent Look Sheet authority.

## Configuration And Acceptance

Keep configurable opening guidance/constraints in the existing Cinematic JSON
policy/config owners after inspecting current planning prompts, with one canonical
compiler path. No copy of model instructions inside React or i18n.

Test checkbox off/on, legacy Projects, explicit AI Apply, reordered/deleted Scene,
country/genre/feeling propagation, runtime bounds, no-Cast opening and continuity
into the next Shot. Manually review a pilot opening for narrative interest and
specific visual direction; do not claim an automated test proves creative quality.
