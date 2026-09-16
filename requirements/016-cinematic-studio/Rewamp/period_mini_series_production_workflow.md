# Period Mini Series — Production Workflow Reference

> **Status:** Working canon for this project  
> **Primary video workflow:** Director Agent → First Frame → Veo 3.1 → Confirm → Continue  
> **Format:** Vertical 9:16  
> **Default audio policy:** No music / diegetic sound only unless intentionally specified

---

## 1. Core Production Principle

Do not direct an image. **Direct an event.**

Every shot must be designed as a continuous story action:

**Story → Director Breakdown → Blocking → Emotional State → First Frame → Veo Prompt → Generate → Confirm → Next Shot**

A shot should not exist only because it looks beautiful. It must move the story, emotion, relationship, mystery, or action forward.

---

## 2. Director Agent Responsibilities

Before writing any video prompt, define:

1. Scene objective
2. Character objective
3. Start emotional state
4. Emotional change during the shot
5. End emotional state
6. Character blocking
7. Camera intention
8. Start state
9. End state
10. Handoff to the next shot
11. Romance beat, if applicable
12. Mystery beat, if applicable
13. Audio / dialogue requirements
14. Continuity notes

### Director rule

Think in this order:

**Character intention → Action → Blocking → Camera → Cut**

Do not choose camera movement just because it looks cinematic.

---

## 3. Character Emotion Protocol

Every important character in every shot must have:

**Start Emotion → Emotional Change → End Emotion**

Example:

Female Lead, Chapter 1 Shot 1

- Start: determined, cautious, observant
- Middle: brief hesitation
- End: committed to entering
- Emotional progression: **observe → decide → enter**

Avoid generic acting directions such as “beautiful,” “dramatic,” or “mysterious” without emotional context.

---

## 4. Character Look Sheet Protocol

Before generating a First Frame, identify every important character visible in the shot.

### Required reference

If a main or recurring character appears, request their **Character Look Sheet** before image generation.

The Look Sheet is the source of truth for:

- facial appearance
- apparent age
- hairstyle
- hair color
- skin tone
- body proportions
- distinctive features
- recurring ornaments/accessories
- established costume identity

### Age rule

The age of every recurring character must be written explicitly in every image/video prompt in which they appear.

Example:

`Female Lead — fictional Siamese woman, age 23.`

Do not rely on the model to infer age from the Look Sheet alone.

---

## 5. Reference Image Order

Use an explicit image order in every prompt.

### Standard order

**Image 1 = FIRST FRAME**

- Literal starting frame of the video
- Controls starting composition
- Controls character position
- Controls camera angle
- Controls lighting
- Controls environment state
- Controls prop state

**Image 2 = CHARACTER LOOK SHEET**

- Visual character reference
- Not the starting frame
- Used to reinforce the established character appearance where the selected Veo workflow supports it

Additional references can be assigned only when required and must have a clearly stated role.

Never leave the model to guess which image is the First Frame.

---

## 6. First Frame Workflow

The First Frame is created **before** the Veo video prompt.

### First Frame must be:

- 9:16 vertical
- cinematic
- story-driven
- ready for movement
- not a poster pose
- consistent with the Look Sheet
- consistent with the current environment
- consistent with the emotional state
- period appropriate

### Good First Frame

A character is already positioned in an action-ready pose.

Example:

- wooden gate already partly open
- servant currently handling the latch
- heroine already visible beyond the gate
- body posture ready to walk
- camera already positioned where the video begins

### Bad First Frame

- character standing like a fashion portrait
- action has not been staged
- camera position cannot logically continue
- important character is absent and expected to magically appear
- visual state does not match the planned first second of the video

---

## 7. Confirm First Frame Before Video Generation

Before generating video, verify:

- correct character face
- correct apparent age
- hairstyle continuity
- costume continuity
- period-appropriate props
- emotional expression
- blocking
- camera orientation
- environment
- lighting
- architecture
- screen direction

Only after the First Frame passes do we create the Veo prompt.

---

## 8. Continuity Truth Rule

Once a generated shot is usable, the **actual generated result becomes continuity truth**.

If the result differs slightly from the original director plan but still works dramatically:

- do not waste generations chasing perfection
- accept the real camera geography
- accept the real blocking
- design the next shot from the generated result

The next shot must continue from what actually exists, not from the old imagined storyboard.

---

## 9. Action Continuity

Every shot must include:

### START STATE
Where everyone and everything begins.

### ACTION
What changes during the shot.

### END STATE
The exact physical/emotional state at the end.

### HANDOFF
What the next shot should continue.

Example:

Shot 1:
- Start: gate partly closed
- Action: servant opens gate, heroine enters
- End: heroine still walking forward
- Handoff: Shot 2 begins while she is still walking

### Match-on-action

Whenever possible:

Shot A ends during movement → Shot B begins during the same movement.

Do not reset actors between shots.

---

## 10. Screen Direction and Spatial Continuity

Maintain consistent movement direction within a sequence.

If a character moves left-to-right, the next shot should preserve that direction unless there is a deliberate reorientation shot.

Keep a spatial map for major locations:

- main gate
- courtyard
- stairs
- veranda
- upper windows
- main hall
- forbidden room

Characters should not teleport between spaces.

---

## 11. Main Mansion Architecture Rule

The main residence is a **traditional all-wood aristocratic Siamese mansion**.

All important visible structural elements should be timber / hardwood:

- wooden entrance gate
- wooden walls
- wooden columns
- wooden beams
- wooden floors
- wooden doors
- wooden windows
- wooden railings
- wooden roof structure

Default constraints:

`No concrete.`  
`No plaster walls.`  
`No brick mansion.`  
`No steel structural frame.`  
`No modern construction materials.`

The production design should remain elegant and wealthy while clearly reading as a timber residence.

---

## 12. Period Prop Accuracy

Modern-looking objects must be actively avoided.

Example discovered during Chapter 1 Shot 1:

Avoid:
- suitcase
- leather travel case
- rigid modern handbag

Prefer:
- traditional soft cloth bundle
- tied fabric bundle bag
- wrapped textile belongings

Before generating a historically important prop, verify whether its shape/material is appropriate for the setting.

---

## 13. Veo Prompt Structure

Recommended structure:

1. `CHAPTER / SHOT`
2. format / duration
3. `IMAGE INPUT ORDER`
4. characters
5. character ages
6. emotional state
7. environment
8. period / architecture constraints
9. timed action
10. camera
11. performance
12. dialogue
13. audio
14. continuity
15. final state
16. negative constraints

---

## 14. Dialogue and Voice Protocol

Do not provide dialogue alone.

Every spoken line must specify the voice **inside square brackets immediately before the dialogue**.

### Required format

`[Gender + age + language + vocal quality + pitch + emotional tone] "Dialogue"`

Example:

`[Thai adult male voice, age 40–45, clearly masculine, slightly low-pitched, calm, gentle, respectful servant tone] "เชิญขอรับ"`

### Speaker rules

Always specify:

- speaker
- gender
- approximate age
- language
- voice character
- emotional tone

When needed, reinforce:

`The line must be spoken by the male servant.`

`Do not use a female voice for this line.`

### Example — Female Lead

`[Thai young adult female voice, age 23, soft but composed, clear, restrained emotion] "..."`

---

## 15. Audio Policy

Default for generated shots:

**NO MUSIC**

Use music later in post-production unless a shot explicitly requires generated music.

Recommended prompt block:

```text
NO MUSIC.
NO BACKGROUND MUSIC.
NO FILM SCORE.
NO SOUNDTRACK.
NO MUSICAL INSTRUMENTS.
```

Use only diegetic sound as required:

- wooden doors
- wooden latch
- footsteps
- fabric
- breathing
- rain
- water drops
- wind
- insects
- house creaks
- objects
- dialogue

Avoid:

- cinematic boom
- horror sting
- automatic suspense score
- sentimental background music

---

## 16. Camera Rule

Camera movement must be motivated by action.

Examples:

Character walks → camera tracks  
Character looks up → eyeline cut  
Character reaches for an object → insert / close-up  
Character is caught from falling → camera prioritizes physical contact and reaction

Avoid:

- random orbit
- unnecessary drone/crane movement
- cinematic movement with no story purpose
- camera teleportation
- excessive zoom

---

## 17. Romance Beat Rule

Romantic moments must come from narrative causes.

Structure:

**Setup → Contact → Hold**

Example:

Heroine slips  
→ Hero catches her waist  
→ Both stop and hold eye contact

Do not cut immediately after physical contact.

The HOLD is where the audience gets the emotional payoff.

---

## 18. Mystery / Ghost Rule

Do not constantly show the ghost clearly.

Use:

- background movement
- upper windows
- shadows
- reflections
- empty frame
- sound
- displaced objects
- eyeline

Often let the audience notice something before the heroine does.

Mystery should feel:

“Was something just there?”

rather than relying on repeated jump scares.

---

## 19. Chapter 1 Shot 1 — Successful Test Notes

### Story action

- servant opens wooden gate
- heroine waits outside
- servant invites her in
- heroine observes
- heroine decides
- heroine enters

### Female Lead emotional flow

**determined + cautious + observant → brief hesitation → committed**

### Voice lesson

The line:

`"เชิญขอรับ"`

was initially generated with the wrong voice gender.

Fix:

`[Thai adult male voice, age 40–45, clearly masculine, slightly low-pitched, calm, gentle, respectful servant tone] "เชิญขอรับ"`

### Prop lesson

A rigid travel case appeared.

Fix future prompts with:

`traditional soft cloth bundle`  
`tied fabric bundle bag`

and explicitly prohibit modern luggage.

### Architecture lesson

Generated gate/environment may introduce non-wood elements.

Reinforce:

`all visible gate posts, walls, columns, threshold and main residence structures are traditional timber construction.`

### Production lesson

The generated result was not 100% identical to the storyboard, but it communicated the scene well enough.

Decision:

**PASS — use the actual shot as continuity truth and continue production.**

---

## 20. Final Locked Production Flow

### STEP 1 — User names the shot

Example:

`Chapter 1 Shot 2`

### STEP 2 — Director Breakdown

Define:

- action
- emotion
- blocking
- camera
- start state
- end state
- handoff

### STEP 3 — Reference Required

Before image generation, state exactly which Look Sheets / environment references are required.

### STEP 4 — User provides references

Do not invent recurring character faces.

### STEP 5 — Generate First Frame

9:16, action-ready, reference-driven.

### STEP 6 — Confirm First Frame

Check visual and story continuity.

### STEP 7 — Write Veo Prompt

Explicit reference order:

- Image 1 = First Frame
- Image 2 = Character Look Sheet (when supported by the selected workflow)

Include:

- ages
- emotion
- action
- camera
- architecture
- voice
- no-music policy
- final state

### STEP 8 — Generate Video

### STEP 9 — Confirm Result

Check:

- story action
- emotion
- face consistency
- voice gender
- dialogue
- music leakage
- architecture
- props
- continuity
- final movement

### STEP 10 — Continue from the Real Result

Use the final generated shot as continuity truth for the next shot.

---

## 21. Reference Sources

### Google AI — Veo documentation
Official Google documentation for Veo image-to-video, reference images, audio/dialogue prompting, aspect ratio, and model behavior:

https://ai.google.dev/gemini-api/docs/veo

### Fine Arts Department of Thailand
Reference material on traditional Central Thai wooden houses / timber construction:

https://www.finearts.go.th/

---

## Project Rule Summary

**Director first.  
Emotion always.  
Look Sheet before First Frame.  
First Frame before Veo.  
Image order must be explicit.  
Age in every shot.  
Main mansion = all wood.  
Dialogue voice in square brackets before the line.  
No music by default.  
The generated result becomes continuity truth.**
