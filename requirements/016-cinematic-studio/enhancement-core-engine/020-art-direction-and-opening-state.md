# Art Direction And Opening State

Status: implemented; isolated validation passed; visual UAT pending. Owner: Story Plan structured fields and canonical compilers.

- JSON creative guidance varies production design, palette, contrast and lens
  intent by story genre, feeling and pacing; it is not a universal cinematic
  booster. Preserve physically motivated lighting, actual scene geography and
  continuity rather than forcing every genre into documentary/natural-light style.
- Each AI-planned Scene includes art direction and motivated lighting; each Shot
  includes framing, camera angle/lens intent and appropriate temporal movement.
  Manual input remains optional and advanced; Generate Plan supplies relevant
  details and preserves locked/authored choices in existing proposal workflow.
- visibleMoment is explicitly the opening state at time zero, not a midpoint or
  payoff. subjectAction is the motion after that image. continuityExit describes
  the resulting end state. Reuse these fields rather than a duplicate prompt
  compiler or parallel first-frame record. Persist a versioned semantic marker
  for new plans; existing approvals are not silently rewritten as new openings.
- Still compilation renders only the opening state and its visible pose/contact;
  it must not render the future completed action. Video begins from that approved
  image and performs the subsequent action, preserving camera/light/art context.
- Artwork, lighting, camera and atmosphere survive JSON schema, normalization,
  manual edit/save, preview and final provider prompt. Failed or incomplete AI
  proposals stay reviewable; no invented progress or auto-approved result.
- Test an action such as reaching for a cup versus drinking, environment-only
  coverage, multiple people, genre contrast, inherited Scene direction and locked
  field preservation. Paid visual qualification remains an explicit UAT step.

New plans and newly added Shots use openingFrameVersion 1. Editing an opening or
accepting an AI opening-field proposal upgrades only that Shot. Untouched legacy
Shots retain their semantics and approved media; generate/review a new Plan or
edit the opening explicitly to adopt the new contract. The semantic version is
system metadata, not a user-editable proposal field.
