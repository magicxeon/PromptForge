# Momelo AI Short-Film & Series Studio
## Product Workflow, UX Flow, Character Wardrobe, Storyboard, Shot Generation, Video Assembly, and Credit Estimation

**Document type:** Product / UX / Functional Design  
**Project:** Momelo  
**Primary use case:** AI-generated vertical short films and episodic series for TikTok, YouTube Shorts, Facebook Reels  
**Target user:** General users and creators with little or no filmmaking, prompting, editing, or AI-generation expertise  
**Recommended master format:** Vertical 9:16  
**Typical AI video shot duration:** up to ~10 seconds per generated clip, later assembled into a complete episode  

---

# 1. Product Vision

Momelo Short-Film Studio should allow a user with no filmmaking knowledge to create a complete short film or episodic series through a guided wizard.

The user should not need to understand:

- screenplay structure,
- shot planning,
- camera terminology,
- continuity,
- prompting,
- character-consistency techniques,
- image-to-video prompting,
- video-generation providers,
- editing timelines,
- or complex credit calculations.

The user should think primarily in terms of:

1. What story do I want to tell?
2. Who is the main character?
3. What should the character wear?
4. What mood and visual style do I want?
5. How long should the episode be?
6. Do I like this storyboard?
7. Which shot should I change?
8. Am I ready to generate the final video?

Momelo handles the filmmaking logic in the background.

---

# 2. Core Product Principles

## 2.1 Story-first

The workflow starts with the story rather than a blank prompt box.

Instead of asking:

> Enter your full video generation prompt.

Momelo asks:

- What is your story about?
- What genre do you want?
- How should the audience feel?
- How should the story end?
- Who is the main character?
- What should they wear?

The system converts these simple inputs into structured filmmaking data.

---

## 2.2 Character-first

Momelo already has reusable AI Characters.

A user can select an existing Character as:

- protagonist,
- supporting character,
- antagonist,
- narrator,
- recurring series character.

The system should automatically preserve:

- face identity,
- apparent age range,
- body proportions,
- hairstyle,
- key visual traits,
- personality,
- movement tendencies,
- wardrobe rules,
- and character relationships.

Users should not need to repeatedly describe the character.

---

## 2.3 Option-first, prompt-hidden

Most filmmaking decisions should be exposed through simple options.

Examples:

### Story mood

- Romantic
- Emotional
- Comedy
- Mystery
- Horror
- Thriller
- Inspirational
- Fashion
- Documentary-like
- Slice of life
- Fantasy

### Camera feeling

- Natural
- Cinematic
- Handheld
- Smooth
- Energetic
- Intimate
- Editorial

### Story pacing

- Slow
- Balanced
- Fast

Advanced users may optionally open an **Advanced Prompt / Director Controls** panel, but this should not be required.

---

## 2.4 Preview-first

High-cost generation should never happen before the user can preview the result conceptually.

Recommended order:

Story Plan  
→ Scene Plan  
→ Storyboard  
→ Shot Plan  
→ Preview Stills  
→ Draft Video  
→ Final Video

This reduces wasted credits and lowers user frustration.

---

## 2.5 Regenerate only what is wrong

The user should be able to regenerate:

- one storyboard panel,
- one scene,
- one shot,
- one character pose,
- one costume,
- one draft clip,
- or one final clip.

Do not require the entire episode to be regenerated unless necessary.

---

## 2.6 Credit transparency

At all major steps, the user should see:

- current estimated project cost,
- estimated remaining generation cost,
- exact cost before a paid generation action,
- credits already spent,
- optional quality upgrade cost.

Example:

> Current project estimate: 286–322 credits  
> Already used: 24 credits  
> Estimated remaining: 262–298 credits

---

# 3. High-Level User Flow

```text
Create Project
    ↓
Choose Project Type
    ↓
Choose Character(s)
    ↓
Choose Character Outfit / Wardrobe
    ↓
Enter Story
    ↓
Choose Genre / Mood / Visual Style
    ↓
AI Story Structure
    ↓
Series Planner (if Series)
    ↓
Episode Plan
    ↓
Storyboard Preview
    ↓
Edit Scenes
    ↓
Shot Builder
    ↓
Preview Stills
    ↓
Generate Draft Clips
    ↓
Review / Regenerate
    ↓
Generate Final Clips
    ↓
Auto Edit / Merge
    ↓
Sound / Subtitle / Voice
    ↓
Final Preview
    ↓
Export
    ↓
Publish Pack
```

---

# 4. Recommended Wizard Structure

The recommended MVP can use approximately 10–12 user-facing steps.

The system may internally perform more operations, but the user should feel that the flow is simple.

---

# 5. Step 1 — Create Project

## Goal

Establish the overall production format.

## User chooses

### Project type

- Single Short Film
- Series
- Character Story
- Fashion Cinematic
- Product Story
- Advertisement
- Music / Mood Video

### Target platform

- TikTok
- YouTube Shorts
- Facebook Reels
- Multi-platform

### Episode duration

Suggested presets:

- 20 sec
- 30 sec
- 45 sec
- 60 sec
- 90 sec
- Custom

For a system where one generated clip is approximately 10 seconds, Momelo should translate duration into an approximate shot count.

Example:

| Episode length | Suggested generated clips |
|---|---:|
| 20 sec | 2–3 |
| 30 sec | 3–4 |
| 45 sec | 5–6 |
| 60 sec | 6–8 |
| 90 sec | 9–12 |

The system should not force every generated shot to be exactly 10 seconds.

A final 60-second film may use:

- 4 sec,
- 6 sec,
- 8 sec,
- 10 sec

segments cut from generated clips.

## Credit behavior

No generation credits should be charged yet.

Display only a rough starting range.

Example:

> Estimated production: 250–340 credits  
> Final estimate will update after storyboard planning.

---

# 6. Step 2 — Choose Character

## Goal

Allow the user to select an existing Momelo Character instead of constructing a person from scratch.

## Character Card should show

- portrait,
- name,
- creator / owner,
- gender presentation,
- apparent age range,
- personality keywords,
- visual style compatibility,
- character consistency rating if available,
- example generated works.

## Selection roles

User can assign:

- Main Character
- Supporting Character
- Villain / Rival
- Friend
- Romantic Interest
- Background Character

---

# 7. Character Personality

Character personality should influence acting and body language.

Example stored attributes:

```yaml
personality:
  confidence: high
  energy: medium
  social_style: reserved
  emotional_expression: subtle
  movement_style: elegant
  humor: low
  temperament: calm
```

This information can automatically influence:

- pose,
- facial expression,
- walking style,
- reaction shots,
- pacing,
- camera distance,
- dialogue tone.

The user does not need to see all internal attributes.

User-friendly version:

> Lina  
> Calm • Elegant • Independent • Slightly Mysterious

---

# 8. Step 3 — Character Wardrobe / Outfit Selection

This should be a first-class production step rather than an afterthought.

Wardrobe is important because costume affects:

- character identity,
- genre,
- scene continuity,
- fashion style,
- time period,
- visual palette,
- and character consistency.

---

## 8.1 Wardrobe selection modes

The user can choose from four modes.

### Mode A — Character Default Outfit

Use the character's default wardrobe.

Best for:

- fast creation,
- character-consistent series,
- beginners.

Example:

> Lina Signature Look  
> White fitted top + dark tailored trousers + minimal jewelry

---

### Mode B — Momelo Outfit Library

Choose from predefined outfits.

Categories:

#### Casual

- T-shirt + jeans
- Oversized shirt
- Knitwear
- Denim
- Streetwear

#### Work

- Office casual
- Business
- Smart casual
- Formal

#### Fashion

- Minimal editorial
- Luxury
- Avant-garde
- Japanese street
- Korean fashion
- Y2K
- Vintage
- Runway-inspired

#### Story / Genre

- School
- Detective
- Fantasy
- Sci-fi
- Historical-inspired
- Horror
- Cyberpunk
- Sports
- Travel

---

### Mode C — Upload Clothing

The user uploads:

- shirt,
- dress,
- pants,
- skirt,
- jacket,
- shoes,
- bag,
- accessories.

Momelo should recognize each clothing asset and attach it to the selected Character.

Potential later integration:

```text
Uploaded Product
      ↓
Garment Analysis
      ↓
Character Fitting / Try-on
      ↓
Wardrobe Preset
      ↓
Use in Story
```

This is particularly useful because Momelo already targets fashion and product-generation workflows.

---

### Mode D — AI Suggest Outfit

User chooses a simple direction:

> Stylish but casual

or:

> Elegant outfit for a rainy Tokyo night

Momelo proposes 3–4 wardrobe choices.

Example:

**Option A**  
Black trench coat + white knit + straight trousers

**Option B**  
Charcoal oversized blazer + black skirt + boots

**Option C**  
Dark navy dress + minimal silver accessories

The user selects one.

---

# 9. Wardrobe Continuity

This is extremely important for series and multi-shot video.

The system should distinguish:

## Episode Wardrobe

One outfit across the episode.

Example:

```text
Episode 1
Lina → Outfit A
```

---

## Scene Wardrobe

Different outfit for particular scenes.

Example:

```text
Scene 1 Morning
Lina → Pajamas

Scene 2 Office
Lina → Office Outfit

Scene 3 Evening
Lina → Black Coat
```

---

## Series Wardrobe

Save recurring outfits.

Example:

```text
Lina
 ├── Signature Casual
 ├── Office Look
 ├── Evening Look
 └── Rainy-Day Look
```

The user can later choose:

> Use Lina's Office Look from Episode 2.

---

# 10. Wardrobe Lock

After storyboard approval, Momelo should introduce:

**Wardrobe Lock**

This prevents accidental outfit changes between generated shots.

Example system metadata:

```yaml
character_id: lina_001
wardrobe_id: wardrobe_office_02
wardrobe_lock: true
```

If the story intentionally requires a costume change, the change should be attached to a scene boundary.

---

# 11. Step 4 — Story Input

## Goal

Allow a user to explain an idea without knowing screenplay formatting.

Recommended input:

### Story idea

Large natural-language field.

Example:

> A woman finds her old phone and discovers a voice message from her ex-boyfriend that she never listened to.

---

## Guided questions

Optional fields:

### What kind of story?

- Romance
- Mystery
- Comedy
- Horror
- Drama
- Fashion
- Adventure
- Fantasy
- Inspirational

### Audience feeling

- Happy
- Emotional
- Suspicious
- Excited
- Relaxed
- Curious
- Shocked

### Ending

- Happy ending
- Sad ending
- Twist
- Cliffhanger
- Open ending
- AI decide

### Story speed

- Slow
- Balanced
- Fast

### Dialogue

- No dialogue
- Minimal dialogue
- Normal dialogue
- Voiceover driven

---

# 12. Step 5 — Visual & Film Style

The user selects a preset.

Examples:

## Cinematic Drama

- shallow depth of field,
- soft contrast,
- controlled movement,
- emotional close-ups.

## Fashion Film

- editorial composition,
- elegant posing,
- wardrobe emphasis,
- polished lighting.

## Documentary

- handheld,
- natural lighting,
- imperfect framing,
- realistic movement.

## Social Native

- faster cuts,
- stronger opening,
- text-friendly composition,
- more direct framing.

## Dreamy

- soft lighting,
- slow motion feeling,
- atmospheric environments.

## Thriller

- darker lighting,
- tighter framing,
- suspenseful camera movement.

---

# 13. Advanced Style Controls

Hidden by default.

Possible options:

- lens feeling,
- camera height,
- handheld amount,
- contrast,
- film grain,
- motion strength,
- camera speed,
- color temperature,
- depth of field.

---

# 14. Step 6 — AI Story Structure

Once Character, Wardrobe, Story, and Style are selected, AI generates a professional story structure.

The user should not see a screenplay wall of text.

Instead show cards.

Example:

## Episode 1 — The Forgotten Message

### Hook
Lina discovers an old phone while cleaning her apartment.

### Setup
The phone still has one unheard message.

### Development
She recognizes the sender.

### Emotional Peak
She finally plays the message.

### Ending
The message references something that has not happened yet.

### Cliffhanger
A notification suddenly appears:

> New message received.

---

# 15. Film Structure Rules

Momelo's internal planner should use film principles such as:

```text
Hook
↓
Setup
↓
Development
↓
Escalation
↓
Payoff / Reveal
↓
Ending / Cliffhanger
```

For short-form social content, Momelo should emphasize the opening quickly.

TikTok's official creative guidance recommends:

- vertical 9:16 production,
- leaving screen space for platform UI,
- hook → body → close structure,
- dynamic editing,
- sound usage.

See References.

---

# 16. Step 7 — Series Planner

Only shown when Project Type = Series.

## Goal

Plan the complete story before generating expensive video.

Example:

```text
Season 1
8 Episodes
45 sec / episode
```

AI creates:

| Episode | Story purpose | Ending |
|---|---|---|
| EP01 | Introduce mystery | New message arrives |
| EP02 | Investigate sender | Unknown location revealed |
| EP03 | Visit location | Finds photograph |
| EP04 | Character conflict | Friend disappears |
| EP05 | Major reveal | Sender may be alive |
| EP06 | Escalation | Main character followed |
| EP07 | Confrontation | Truth discovered |
| EP08 | Resolution | Final emotional reveal |

---

# 17. Series Bible

Momelo should save a persistent project-level document containing:

```yaml
series:
  title:
  genre:
  theme:
  tone:
  visual_style:
  master_palette:
  editing_style:
  sound_style:

characters:
  protagonist:
  supporting:
  antagonist:

wardrobe:
  default:
  recurring:

locations:
  apartment:
  office:
  cafe:

story_rules:
  continuity:
  timeline:
  important_props:
```

This becomes the internal source of truth for every episode.

---

# 18. Step 8 — Scene Breakdown

AI divides an episode into Scenes.

Example:

## Scene 1 — Apartment / Evening
Duration: 12 sec

Story purpose:

> Lina finds the phone.

Character:
Lina

Wardrobe:
Signature Casual

Location:
Apartment

Mood:
Quiet / mysterious

---

## Scene 2 — Bedroom
Duration: 18 sec

Story purpose:

> She discovers the unread message.

---

## Scene 3 — Memory Flash
Duration: 10 sec

Story purpose:

> Establish emotional connection.

---

## Scene 4 — Present
Duration: 20 sec

Story purpose:

> The message reveals something impossible.

---

# 19. Step 9 — Storyboard Preview

Storyboard is one of the most important user checkpoints.

Momelo generates low-cost preview images for each important scene.

Recommended UI:

```text
┌──────────────────┐
│ Scene 1 Preview  │
│                  │
│ Find old phone   │
│ 12 sec           │
│ Lina • Casual    │
└──────────────────┘

┌──────────────────┐
│ Scene 2 Preview  │
│                  │
│ Unread message   │
│ 18 sec           │
│ Lina • Casual    │
└──────────────────┘
```

---

# 20. Storyboard User Actions

User can:

- reorder scene,
- edit description,
- change wardrobe,
- change location,
- change mood,
- regenerate preview,
- add scene,
- remove scene,
- split scene,
- merge scenes.

Important:

Changing a storyboard should be relatively inexpensive compared with regenerating video.

---

# 21. Storyboard Credit Estimation

Example internal Momelo credits:

| Action | Example credit |
|---|---:|
| Storyboard 6 panels | 8 |
| Storyboard 8 panels | 10 |
| Regenerate one panel | 1 |
| Add new panel | 2 |

These values are product-design examples, not provider prices.

Backend pricing must later map these units to actual provider costs and Momelo margin.

---

# 22. Step 10 — Shot Builder

Once scenes are approved, Momelo converts each scene into camera shots.

Example:

## Scene 1

### Shot 1
Duration: 5 sec  
Type: Wide  
Action: Lina enters apartment.

### Shot 2
Duration: 5 sec  
Type: Medium  
Action: She notices an old box.

### Shot 3
Duration: 6 sec  
Type: Close-up  
Action: Hand picks up old phone.

This may use three generated source clips, later trimmed to the required edit timing.

---

# 23. Beginner-Friendly Shot Controls

The user should not need to know filmmaking terminology.

Momelo can provide visual options.

## Distance

- Full body
- Half body
- Close face
- Detail

Advanced mapping:

```text
Full body → Wide / Full Shot
Half body → Medium
Close face → Close-up
Detail → Insert / Extreme Close-up
```

---

## Camera movement

- No movement
- Slowly move closer
- Follow character
- Move sideways
- Handheld
- Dramatic movement

---

## Character action

Examples:

- walk,
- sit,
- look around,
- turn,
- smile,
- cry,
- pick up object,
- open door,
- run,
- talk.

---

## Emotion

- calm,
- happy,
- nervous,
- sad,
- angry,
- confused,
- scared,
- surprised.

---

# 24. Internal Shot Data Structure

Example:

```json
{
  "shot_id": "ep01-sc01-sh03",
  "duration": 6,
  "character": "lina_001",
  "wardrobe": "lina_casual_01",
  "framing": "close_up",
  "camera_motion": "slow_push_in",
  "action": "looks_at_phone",
  "emotion": "uncertain",
  "location": "apartment_evening",
  "continuity": {
    "screen_direction": "left_to_right",
    "prop": "old_phone"
  }
}
```

---

# 25. Continuity Engine

Momelo should automatically validate continuity across shots.

Check:

- face consistency,
- hairstyle,
- outfit,
- accessories,
- location,
- time of day,
- lighting direction,
- props,
- character position,
- screen direction,
- emotion progression.

Example warning:

> Shot 6 uses Lina's Evening Outfit, but Scene 2 is locked to Signature Casual.  
> Change outfit intentionally?

---

# 26. Step 11 — Preview Still Generation

Before video generation, Momelo creates a still frame for each shot.

Purpose:

- verify composition,
- character identity,
- outfit,
- environment,
- camera framing,
- lighting.

Example:

6 shots × 1 preview each.

This is cheaper than immediately generating six video clips.

---

# 27. Preview Still Actions

User can:

- regenerate,
- edit pose,
- edit framing,
- edit background,
- change expression,
- change wardrobe,
- change camera angle.

Once approved:

> Lock Shot Look

This image can become the starting frame / image reference for video generation.

---

# 28. Step 12 — Draft Video Generation

Momelo generates approximately 5–10 second video clips for approved shots.

Draft mode can use:

- lower-cost model,
- lower resolution,
- faster generation mode,
- reduced iteration settings.

Primary purpose:

Check:

- motion,
- acting,
- camera movement,
- transition compatibility,
- character consistency.

---

# 29. Draft Timeline

Example:

```text
EP01 — 60 sec

Shot 01  [██████] 6 sec
Shot 02  [████████] 8 sec
Shot 03  [██████████] 10 sec
Shot 04  [██████] 6 sec
Shot 05  [██████████] 10 sec
Shot 06  [██████████] 10 sec
Shot 07  [████████] 8 sec
```

The total source footage can exceed the final episode length.

Momelo trims clips during editing.

---

# 30. Draft Review

Each generated video clip receives:

- Approve
- Regenerate
- Edit Motion
- Edit Acting
- Edit Camera
- Replace
- Trim

Avoid forcing users to regenerate an entire scene.

---

# 31. Step 13 — Final Video Generation

Once drafts are approved, the user chooses quality.

## Standard

Suitable for general social content.

## High Quality

Better detail and motion.

## Premium Cinematic

Highest supported provider/model configuration.

Before running:

```text
Final Generation

7 shots
Estimated cost: 175 credits

Current balance: 430 credits

[Generate Final]
```

This is the most expensive stage and should always require explicit confirmation.

---

# 32. Step 14 — Auto Edit

Once final clips are available, Momelo creates an automatic timeline.

Automatically:

- trims generated footage,
- arranges shots,
- adds transitions,
- normalizes pacing,
- applies title card if needed,
- creates ending card if required.

---

# 33. Automatic Film Editing Rules

Examples:

## Emotional Scene

Prefer:

- slower cuts,
- close-ups,
- reaction shots,
- pauses.

## Action

Prefer:

- shorter cuts,
- directional movement,
- stronger sound transitions.

## Fashion

Prefer:

- longer body shots,
- match cuts,
- rhythmic edits,
- garment detail shots.

---

# 34. Step 15 — Sound

Sound should be separated into layers.

```text
Dialogue
Voiceover
Music
Ambient
Foley
Sound Effects
Transitions
```

User-friendly controls:

## Music

- Emotional
- Happy
- Suspense
- Cinematic
- Fashion
- Chill
- None

## Voice

- No voice
- Female voice
- Male voice
- Character voice
- Upload voice

## Environment

- City
- Cafe
- Rain
- Bedroom
- Forest
- Office
- Street

---

# 35. Step 16 — Subtitle

Options:

- Auto subtitle
- No subtitle

Styles:

- Minimal
- TikTok style
- Film subtitle
- Bold social
- Fashion editorial

Important text must remain inside platform-safe areas.

---

# 36. Step 17 — Final Preview

User watches the entire film.

Controls:

- Edit Shot
- Replace Shot
- Trim
- Change Music
- Edit Subtitle
- Adjust Volume
- Edit Ending

Changing one shot should preserve the rest of the production.

---

# 37. Step 18 — Export

Recommended output:

```text
Aspect Ratio: 9:16
Resolution: 1080 × 1920
Frame Rate: 24 / 25 / 30 fps
Video: H.264 or platform-compatible equivalent
Audio: AAC, 48 kHz
```

Actual supported export settings should follow the encoder and target platform requirements at implementation time.

---

# 38. Publish Pack

Momelo may generate:

- final video,
- clean video without subtitles,
- subtitle version,
- thumbnail / cover,
- title suggestions,
- caption suggestions,
- hashtag suggestions,
- episode number,
- next-episode teaser text.

Example:

```text
The Message — EP01
"What would you do if someone from your past sent you a message from the future?"
```

---

# 39. Credit System

The following values are a **Momelo internal-credit proposal**, not direct provider prices.

The system should maintain a conversion layer:

```text
Momelo Credit
      ↓
Internal Cost Engine
      ↓
Provider Cost
      ↓
Margin
      ↓
Displayed User Price
```

This allows providers to change without changing the user's mental model.

---

# 40. Example Credit Table

## Planning

| Action | Credits |
|---|---:|
| Create story plan | 1 |
| Episode breakdown | 2 |
| Series plan | 5 |
| Style planning | 1 |

---

## Character

| Action | Credits |
|---|---:|
| Select existing Character | 0 |
| Load Character preset | 0 |
| Character preview variations | 1–2 |
| Supporting Character setup | 1–2 |

---

## Wardrobe

| Action | Credits |
|---|---:|
| Use default Character outfit | 0 |
| Select library outfit | 0 |
| AI outfit suggestion | 1 |
| Generate custom outfit preview | 1–2 |
| Upload garment analysis | 1 |
| Garment try-on preview | 2–4 |
| Regenerate wardrobe preview | 1–2 |

---

## Storyboard

| Action | Credits |
|---|---:|
| 6-panel storyboard | 8 |
| 8-panel storyboard | 10 |
| Regenerate panel | 1 |
| Add scene panel | 2 |

---

## Shot Preview

| Action | Credits |
|---|---:|
| Generate shot plan | 1 / scene |
| Preview still | 2 / shot |
| Regenerate still | 2 / shot |

---

## Video

Illustrative example:

| Generation | Credits |
|---|---:|
| Draft 10-sec clip | 12 |
| Standard final 10-sec clip | 25 |
| Premium final 10-sec clip | 35 |

These must be recalculated based on the actual selected video provider.

---

# 41. Example: 30-Second Episode

Assume:

3 source video shots.

Planning:

```text
Story          1
Episode plan   2
Style          1
```

= 4 credits

Storyboard:

```text
6 panel = 8
```

Shot preview:

```text
3 × 2 = 6
```

Draft:

```text
3 × 12 = 36
```

Final:

```text
3 × 25 = 75
```

Finishing:

```text
Auto edit    3
Subtitle     2
Music        2
Export       1
```

Total example:

```text
4 + 8 + 6 + 36 + 75 + 8
= 137 credits
```

Recommended customer estimate including regeneration buffer:

> **150–180 credits**

---

# 42. Example: 60-Second Episode

Assume:

6 source clips.

Planning = 4  
Storyboard = 8  
Shot previews = 12  
Draft video = 72  
Final video = 150  
Finishing = 8

Total:

```text
254 credits
```

With expected retry buffer:

> **290–320 credits**

---

# 43. Example: 90-Second Episode

Assume:

9 source clips.

Planning = 4  
Storyboard = 10  
Shot previews = 18  
Draft = 108  
Final = 225  
Finishing = 8

Total:

```text
373 credits
```

Expected displayed estimate:

> **420–470 credits**

---

# 44. Series Credit Estimation

Example:

Series:

```text
6 Episodes
60 sec / episode
```

Estimated standard production:

```text
300 credits × 6
≈ 1,800 credits
```

Momelo can reduce planning costs because:

- Character is reused,
- wardrobe is reused,
- style is reused,
- Series Bible is reused,
- locations may be reused.

Possible Series Discount:

```text
Episode 1: full planning cost
Episode 2+: reuse project context
```

Example display:

> Estimated Series Production  
> 6 × 60-second episodes  
> approximately 1,600–1,850 credits

---

# 45. Live Credit Estimator

The credit estimator should update when the user changes:

- number of episodes,
- duration,
- number of scenes,
- number of shots,
- image quality,
- video quality,
- character count,
- custom clothing,
- voiceover,
- music,
- expected retries.

Example UI:

```text
Project Estimate

Planning                5
Storyboard             10
Preview Images         14
Draft Video            84
Final Video           175
Sound + Export         10
Retry Reserve          40

Estimated Total       338 credits
```

---

# 46. Credit Reserve

Momelo should distinguish:

## Required Credits

Cost of currently selected generation.

## Recommended Reserve

Optional buffer for regeneration.

Example:

> Required: 298 credits  
> Recommended balance: 340 credits

This avoids surprising users during revisions.

---

# 47. Recommended Generation Modes

## Quick Draft

For testing ideas.

Uses:

- low-cost previews,
- draft videos,
- minimal finishing.

---

## Creator

Default recommended mode.

Uses:

- storyboard,
- preview stills,
- draft video,
- standard final,
- subtitles,
- music.

---

## Premium

For campaign or portfolio output.

Uses:

- high-quality images,
- premium video model,
- higher retry allowance,
- stronger consistency checks,
- premium finishing.

---

# 48. Suggested UX for Beginners

The full experience should resemble a simple wizard:

```text
Step 1
What do you want to create?

Step 2
Choose your main Character.

Step 3
What should they wear?

Step 4
Tell us your story.

Step 5
Choose how it should feel.

Step 6
Here is your story plan.

Step 7
Here is your storyboard.

Step 8
Check the shots.

Step 9
Generate draft.

Step 10
Generate final.

Step 11
Finish & export.
```

Avoid production jargon by default.

---

# 49. Advanced Mode

An advanced panel can expose:

- prompt,
- negative prompt,
- model provider,
- video model,
- seed,
- guidance,
- motion strength,
- start frame,
- end frame,
- camera vector,
- reference images,
- continuity tags.

This should not interfere with the beginner workflow.

---

# 50. Internal Architecture Concept

```text
User Wizard
    ↓
Project State
    ↓
Story Planner
    ↓
Character Manager
    ↓
Wardrobe Manager
    ↓
Series Bible
    ↓
Scene Composer
    ↓
Storyboard Generator
    ↓
Shot Planner
    ↓
Continuity Engine
    ↓
Image Generator
    ↓
Video Generator
    ↓
Generation Queue
    ↓
Timeline Composer
    ↓
Sound / Subtitle
    ↓
Export
```

---

# 51. Recommended Product Modules

## Project Module

Responsible for:

- project metadata,
- user progress,
- duration,
- platforms,
- credit estimate.

---

## Story Module

Responsible for:

- story input,
- story structure,
- episode planning,
- series arc,
- scene breakdown.

---

## Character Module

Responsible for:

- character identity,
- personality,
- references,
- consistency,
- role.

---

## Wardrobe Module

Responsible for:

- default wardrobe,
- outfit library,
- uploaded clothing,
- wardrobe generation,
- garment references,
- wardrobe lock,
- per-scene costume changes.

---

## Storyboard Module

Responsible for:

- storyboard panels,
- low-cost preview,
- scene editing,
- regeneration.

---

## Shot Module

Responsible for:

- shot data,
- camera,
- framing,
- movement,
- performance,
- timing.

---

## Continuity Module

Responsible for:

- Character consistency,
- wardrobe consistency,
- location continuity,
- props,
- screen direction,
- temporal continuity.

---

## Generation Module

Responsible for:

- provider routing,
- image generation,
- video generation,
- retry,
- job state.

---

## Timeline Module

Responsible for:

- clip order,
- trim,
- transitions,
- duration,
- pacing.

---

## Audio Module

Responsible for:

- speech,
- voiceover,
- ambience,
- music,
- sound effects.

---

## Credit Module

Responsible for:

- cost estimate,
- reserve,
- debit,
- refund,
- provider cost mapping,
- margin.

---

# 52. Data Hierarchy

```text
Project
│
├── Series Bible
│
├── Characters
│     ├── Character A
│     │      ├── Personality
│     │      ├── Face Reference
│     │      └── Wardrobes
│     │
│     └── Character B
│
├── Episode
│     │
│     ├── Scene
│     │    │
│     │    ├── Shot
│     │    ├── Shot
│     │    └── Shot
│     │
│     └── Scene
│
└── Final Timeline
```

---

# 53. Example Complete User Journey

A user wants:

> A 60-second mystery story about Lina receiving a mysterious message.

### Step 1

Create:

> Series

### Step 2

Choose:

> Lina

### Step 3

Wardrobe:

> Black trench coat + white knit

Lock:

> Episode wardrobe

### Step 4

Story:

> Lina receives a message from someone who disappeared three years ago.

### Step 5

Mood:

> Mystery + emotional

Style:

> Cinematic

### Step 6

AI creates:

```text
Hook
Message arrives

Setup
Sender name appears

Development
Lina remembers the disappearance

Reveal
The message includes her current location

Cliffhanger
Someone knocks on the door
```

### Step 7

Storyboard:

6 visual panels.

User approves five and regenerates one.

### Step 8

Momelo creates:

7 shots.

### Step 9

Preview stills.

Wardrobe and identity locked.

### Step 10

Generate draft videos.

User regenerates Shot 4.

### Step 11

Generate final videos.

### Step 12

Momelo merges clips, adds music, ambience and subtitles.

### Step 13

User exports:

> EP01 — The Message

---

# 54. MVP Recommendation

For the first version, avoid trying to solve everything.

Recommended MVP:

## Include

- Single Film
- Basic Series project
- Momelo Character selection
- Character personality
- Default / library wardrobe
- Uploaded clothing reference
- Story input
- Genre / mood
- basic AI story planning
- storyboard
- shot breakdown
- image preview
- 10-sec video generation
- individual shot regeneration
- simple timeline
- subtitle
- music
- final merge
- credit estimate

## Later

- advanced costume fitting,
- wardrobe marketplace,
- automated continuity repair,
- AI editor,
- automatic B-roll,
- character voice cloning,
- automatic platform publishing,
- collaborative editing,
- complex multicharacter dialogue,
- branching stories.

---

# 55. Key Product Rule

The most important design rule should be:

> **The user creates a story. Momelo handles filmmaking.**

A beginner should never feel that they are operating an AI model.

They should feel that they are directing a film.

---

# 56. Reference Guidelines

The product design above is an application design proposal built around current official short-form platform and API guidance.

## TikTok for Business — Creative Codes

TikTok recommends:

- shooting vertically in 9:16,
- using high-resolution footage of at least 720p,
- reserving screen area for TikTok UI,
- using a hook → body → close structure,
- using music, movement, transitions, text overlays, voice and sound to hold attention.

Official source:

https://ads.tiktok.com/business/en/creative-codes

---

## YouTube Help — Three-Minute Shorts

YouTube states that eligible square or vertical videos up to three minutes can be categorized as Shorts, and Shorts can be uploaded through the YouTube app and YouTube Studio.

Official source:

https://support.google.com/youtube/answer/15424877

---

## OpenAI API Pricing

OpenAI publishes model-specific pricing and different processing modes. This supports the recommendation that Momelo should use its own internal credit abstraction rather than expose raw provider prices directly to users.

Official source:

https://openai.com/api/pricing/

---

# 57. Important Pricing Note

All Momelo credit values in this document are **illustrative product-design numbers**.

Before production launch, the Credit Module should calculate:

```text
Actual API Cost
+
Storage
+
Queue / Compute Cost
+
Retry Allowance
+
Payment Processing
+
Momelo Margin
=
Customer Credit Price
```

Provider costs should be stored in configuration rather than hard-coded into UX.

This allows Momelo to switch or combine providers without redesigning the user-facing pricing system.

---

# 58. Final Recommended Workflow

```text
CREATE PROJECT
      ↓
SELECT FORMAT
      ↓
SELECT CHARACTER
      ↓
SELECT WARDROBE
      ↓
ENTER STORY
      ↓
SELECT MOOD & FILM STYLE
      ↓
AI STORY PLAN
      ↓
SERIES PLAN (optional)
      ↓
SCENE BREAKDOWN
      ↓
STORYBOARD PREVIEW
      ↓
EDIT / APPROVE SCENES
      ↓
SHOT BUILDER
      ↓
PREVIEW STILLS
      ↓
LOCK CHARACTER / WARDROBE / LOOK
      ↓
GENERATE DRAFT VIDEOS
      ↓
REVIEW / REGENERATE INDIVIDUAL SHOTS
      ↓
GENERATE FINAL VIDEOS
      ↓
AUTO EDIT / MERGE
      ↓
MUSIC / VOICE / SUBTITLE
      ↓
FINAL REVIEW
      ↓
EXPORT
      ↓
PUBLISH PACK
```

This workflow preserves professional filmmaking logic while keeping the user experience simple enough for non-filmmakers.

