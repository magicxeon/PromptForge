# Face, Character And Scene MVP Closure Test Suite

**Requirement ID:** VCB-013  
**Status:** Manual closure suite  
**Owner:** Face Creator, Character Profile, Reference Processing and Scene Builder  
**Depends on:** VCB-012, RPP-002 and Professional Scene Builder Requirement 010

## Purpose

This is the complete MVP manual test suite for closing the coordinated Vertical
Drama Face options, Character Identity Pack, explicit Face override and
Character reuse policy.

Run the cases in order. Stop at the first failure, fix it and repeat that case
before continuing. Do not substitute a later successful Scene for a failed
Face or Character result.

Minimum closure scope:

- 5 test cases;
- 8 generated outputs;
- one adult female identity;
- one adult male identity;
- one explicit Face override;
- one public cross-user use; and
- one owner-only denial.

For every generated output, record the real Job ID, provider/model, output path
and result. Use one output per Generate action to limit Credit usage.

---

## Test Case 1: Female End-to-End

### 1A. Create Face

Open `Studio > Face Creator`, reset the form and select:

- Gender: Female
- Age: Early Twenties (20-23)
- Ethnicity: Chinese
- Face Shape: Refined Soft Tapered Face
- Eyes: Expressive Refined Almond Eyes
- Eyebrows: Refined Soft-arc Brows
- Nose: Refined Straight Nose
- Lips: Soft Defined Bow Lips
- Expression: Subtle Friendly Smile
- Hair Length: Long Hair
- Hair Style: a long or layered style, not Undercut
- Parting / Fringe: Side Part and No Bangs
- Hair Texture: Silky Smooth Hair
- Hair Color: Dark Brown
- Skin: Very Fair Neutral or Porcelain Skin
- Makeup: Soft Peach Makeup
- Output count: 1

Generate without a Face Reference.

Pass when:

- one photorealistic head-and-shoulders portrait is returned;
- apparent age is approximately 20-23;
- all five selected facial structures remain visible in the compiled result;
- hair is long and consistent with the selections; and
- no extra person, text, logo, crop or watermark appears.

```text
TC1A Female Face
Job ID:
Provider / Model:
Output path:
Apparent age:
Face fidelity: /5
Hair fidelity: /5
Result: pass / conditional pass / fail
Notes:
```

### 1B. Create And Approve Character

From the passed Face, choose `Build a Character`, reset the Character form and
select:

- Character type: Reusable Model
- Age: retain Early Twenties (20-23)
- Model Build: Elegant Slender Lead Build
- Body Silhouette: Balanced Leading-woman Silhouette
- Layout: front, exact side facing viewer right and back
- Casting outfit: neutral gray silhouette-reading outfit with grid
- Output count: 1

Generate one sheet, create a Character Profile from the accepted output and
approve the Character version.

Pass when:

- the sheet contains exactly three equal-scale complete views;
- face, age, skin and hair remain consistent with TC1A;
- body proportions remain consistent across all views;
- side and back anatomy point in the correct direction;
- the approved version has canonical three-view and canonical face assets; and
- Identity Pack status is ready.

```text
TC1B Female Character
Source Face Job ID:
Character Job ID:
Character Profile ID:
Character Version ID:
Provider / Model:
Output path:
Canonical face present: yes / no
Identity Pack status:
Identity fidelity: /5
Anatomy consistency: /5
Result: pass / conditional pass / fail
Notes:
```

### 1C. Generate Scene With Canonical Face

Open `Build Scene` from the approved Character and select:

- Mode: Simple
- Recipe: Soft Character Portrait v2
- Character Reference: the approved female Character
- Explicit Face Reference: empty
- Outfit: one neutral popular outfit
- Personality: calm, refined and quietly confident
- Aspect ratio: 6:8
- Output count: 1

Pass when:

- the result contains one person shown once, not a three-view sheet;
- face, age, skin, hair and body relationship match TC1A and TC1B;
- the casting outfit is replaced by the Scene outfit;
- the provider plan used the Character three-view and canonical face;
- lineage records the Character Profile and Version IDs;
- explicit Face override is false; and
- the result is a professional close model portrait.

```text
TC1C Female Scene
Scene Job ID:
Provider / Model:
Output path:
Reference count:
Canonical face source recorded: yes / no
Explicit Face override: false
Identity fidelity: /5
Age fidelity: /5
Recipe fidelity: /5
Commercial quality: /5
Result: pass / conditional pass / fail
Notes:
```

---

## Test Case 2: Male End-to-End

### 2A. Create Face

Open `Studio > Face Creator`, reset the form and select:

- Gender: Male
- Age: Early Twenties (20-23)
- Ethnicity: Chinese
- Face Shape: Sculpted Tapered Face
- Eyes: Defined Deep Almond Eyes
- Eyebrows: Structured Straight Brows
- Nose: Sculpted Straight Bridge
- Lips: Clean Defined Lips
- Facial Hair: none, allowing the clean-shaven default
- Expression: Subtle Friendly Smile
- Hair Length: Short Hair
- Hair Style: Undercut or Side Part
- Parting / Fringe: Side Part and No Bangs
- Hair Texture: Silky Smooth Hair
- Hair Color: Dark Brown
- Skin: Very Fair Neutral
- Output count: 1

Generate without a Face Reference.

Pass when:

- one photorealistic head-and-shoulders portrait is returned;
- apparent age is approximately 20-23;
- all five selected facial structures are retained;
- the face is clean-shaven with no invented moustache, beard or stubble;
- hair matches the selected short style; and
- no extra person, text, logo, crop or watermark appears.

```text
TC2A Male Face
Job ID: job_1786684690343_rpw8e4jjd
Provider / Model: gemini-3.1-flash-lite-image
Output path: /outputs/job_1786684690343_rpw8e4jjd.jpg
Apparent age: 22-23
Face fidelity: 4/5
Hair fidelity: 5/5
Clean-shaven default: pass 
Result: pass 
Notes: use custom beauty, Chinese Lead actor, handsome, face structure like Chinese comic male lead charactor ถ้าไม่ใส่ ไม่หล่อเหมือนพระเอก
```

### 2B. Create And Approve Character

From the passed male Face, choose `Build a Character`, reset the Character form
and select:

- Character type: Reusable Model
- Age: retain Early Twenties (20-23)
- Model Build: Lean Broad-shouldered Lead Build
- Body Silhouette: Tapered Leading-man Silhouette
- Layout: front, exact side facing viewer right and back
- Casting outfit: neutral gray silhouette-reading outfit with grid
- Output count: 1

Generate one sheet, create a Character Profile and approve its version.

Pass when:

- exactly three equal-scale complete views are present;
- face, age, skin and hair remain consistent with TC2A;
- shoulders, torso and limbs retain the selected male build;
- side and back feet, knees, pelvis, torso and head face correctly;
- lower body and feet are not reversed; and
- the approved Identity Pack contains canonical three-view and face assets.

```text
TC2B Male Character
Source Face Job ID: job_1786684690343_rpw8e4jjd
Character Job ID:  job_1786685014497_k6bocmq1c
Character Profile ID: charprof_1786685229618_e6nbhedt
Character Version ID: first version
Provider / Model: gemini-3.1-flash-lite-image
Output path: outputs/job_1786685014497_k6bocmq1c.jpg
Canonical face present: yes 
Identity Pack status:
Identity fidelity: 4/5
Anatomy consistency: 5/5
Result: pass 
Notes:
```

### 2C. Generate Full-body Scene With Canonical Face

Open `Build Scene` from the approved male Character and select:

- Mode: Simple
- Recipe: Street Walk Editorial v2
- Character Reference: the approved male Character
- Explicit Face Reference: empty
- Outfit: one neutral menswear outfit
- Aspect ratio: 6:8
- Output count: 1

Pass when:

- exactly one complete person appears in one continuous photograph;
- face and apparent age match TC2A;
- body build matches TC2B;
- the full outfit and both shoes remain inside the frame;
- the casting outfit is not copied;
- the provider plan includes the canonical face automatically; and
- the result has credible walking anatomy and commercial fashion quality.

```text
TC2C Male Scene
Scene Job ID: job_1786685467046_e396xpkvk.
Provider / Model: gemini-3.1-flash-lite-image
Output path: /outputs/job_1786685467046_e396xpkvk.jpg
Reference count:1
Canonical face source recorded: yes
Explicit Face override: false
Identity fidelity: 3/5
Age fidelity: 4/5
Body fidelity: 5/5
Recipe fidelity: 5/5
Commercial quality: 4/5
Result:  conditional pass
Notes: หน้าไม่หล่อเหมือนในรูปต้นฉบับ หน้าเกร็งๆ ดูไม่ธรรมชาติ
```

---

## Test Case 3: Explicit Face Override And Restore

Use either approved Character from TC1 or TC2.

1. Open Scene Builder with that Character selected.
2. Confirm Face Reference remains enabled.
3. Attach a different authorized Face image in the explicit Face slot.
4. Keep Soft Character Portrait v2 and generate one output.

Pass when:

- the explicit Face replaces the Character canonical face;
- the Character body, height relationship and outfit behavior remain active;
- the provider plan does not send both canonical and explicit faces as
  competing identity authorities;
- lineage records `explicitFaceOverride: true` and the override source; and
- removing the explicit Face restores the canonical face in the UI/provider
  plan without reselecting the Character.

Generating again after removal is not required for MVP closure; provider-plan
inspection is sufficient.

```text
TC3 Explicit Face Override
Character Profile ID:
Character Version ID:
Override Face source:
Scene Job ID:
Provider / Model:
Output path:
Effective reference count:
Canonical face suppressed: yes / no
Explicit override recorded: yes / no
Canonical face restored after removal: yes / no
Face override fidelity: /5
Body preservation: /5
Result: pass / conditional pass / fail
Notes:
```

---

## Test Case 4: Public Character Cross-user Use

1. As the Character owner, open `Manage Character`.
2. Set `Who can use this Character?` to `Anyone can use` and save.
3. Refresh and confirm the value remains `Anyone can use`.
4. Switch to a different actor.
5. Find and select the public Character in Scene Builder.
6. Generate Soft Character Portrait v2 once without an explicit Face.

Pass when:

- the non-owner can discover and select the Character;
- raw private canonical asset paths are not exposed;
- generation receives an authorized Character identity pack;
- output identity matches the public Character;
- lineage records the non-owner actor and source Character version; and
- switching back to the owner still shows `Anyone can use`.

```text
TC4 Public Cross-user Use
Owner actor:
Consumer actor:
Character Profile ID:
Character Version ID:
Scene Job ID:
Provider / Model:
Output path:
Reuse policy persisted: yes / no
Non-owner selection: pass / fail
Private asset path protected: pass / fail
Identity fidelity: /5
Result: pass / conditional pass / fail
Notes:
```

---

## Test Case 5: Owner-only Protection

No generation is required.

1. As owner, change the Character reuse policy to `Owner only` and save.
2. Refresh and confirm `Owner only` remains selected.
3. Switch to a different actor.
4. Open the public Character route if a listing remains visible.
5. Open Scene Builder and attempt to select or use that Character.

Pass when:

- a non-owner cannot select or generate with the owner-only Character;
- a direct API/use attempt is rejected by server authorization, not only hidden
  by the UI;
- the owner can still view and use the Character;
- no canonical face, three-view asset or private media URL is disclosed; and
- switching actors does not retain the previous actor's Character selection.

```text
TC5 Owner-only Protection
Owner actor:
Non-owner actor:
Character Profile ID:
Policy after refresh:
Hidden or unavailable in picker: pass / fail
Direct use rejected by server: pass / fail
Owner can still use: pass / fail
Private assets protected: pass / fail
Actor selection isolation: pass / fail
Result: pass / conditional pass / fail
Notes:
```

---

## Final Closure Record

The MVP requirement closes only when all five cases pass. `Conditional pass`
does not close the requirement unless the condition is documented as an
accepted provider limitation with an owner and follow-up requirement.

```text
TC1 Female End-to-End: pass / fail
TC2 Male End-to-End: pass / fail
TC3 Explicit Face Override: pass / fail
TC4 Public Cross-user Use: pass / fail
TC5 Owner-only Protection: pass / fail

Total generated outputs: 8 expected
Automated regression suite: pass / fail
Open defects:
Accepted provider limitations:
Validated by:
Validation date:
MVP closure: approved / rejected
```

---

## Execution Log

### Female Run 1 - 2026-08-14

```text
TC1A Female Face
Job ID: job_1786677761105_7ct2jhrk3
Provider / Model: gemini-3.1-flash-lite-image
Output path: /outputs/job_1786677761105_7ct2jhrk3.jpg
Apparent age: 24-25
Face fidelity: 5/5
Hair fidelity: 5/5
Result: conditional pass
Notes: Beauty used Custom Write-In "Chinese Lead actress". Apparent age is
       above the selected 20-23 range.

TC1B Female Character
Source Face Job ID: job_1786677761105_7ct2jhrk3
Character Job ID: job_1786678828852_u85246g10
Character Profile ID: charprof_1786678978650_uwpiv6u8
Character Version ID: charver_1786678978658_8is52ngb
Provider / Model: gemini-3.1-flash-lite-image
Output path: /outputs/job_1786678828852_u85246g10.jpg
Identity fidelity: 5/5
Anatomy consistency: 5/5
Observed Identity Pack status: identity_pack_ready
Result: fail
Notes: The visual sheet passed, but sourceHeadshotIds was empty. The version
       incorrectly used its 320x320 three-view face crop as canonicalFaceAssetId
       instead of the trusted Face Creation Job. The ready status was therefore
       structurally present but semantically incorrect.

TC1C Female Scene
Scene Job ID: job_1786679207610_5p6o0zd66
Provider / Model: gemini-3.1-flash-lite-image
Output path: /outputs/job_1786679207610_5p6o0zd66.jpg
Effective Reference Processing count: 2
Canonical face source recorded: yes, but pointed to the incorrect sheet crop
Explicit Face override: false
Identity fidelity: 3/5
Age fidelity: 3/5
Recipe fidelity: 3/5
Commercial quality: 2/5
Result: fail
Notes: Apparent age increased. The final prompt contained the immutable 20-23
       age instruction and dispatch contained Character plus Face roles. Root
       cause was the incorrect low-resolution canonical face source inherited
       from TC1B, not a missing Scene age prompt or one-reference dispatch.
```

Engineering correction:

- authorized Face handoff Job IDs now persist into Character Sheet
  `sourceHeadshotIds`;
- Character Profile versions now select that trusted Face Job as canonical
  headshot and canonical face; and
- regression coverage protects both persistence boundaries.

Female Run 1 remains failed. Retest TC1B and TC1C with a new Character version
created after the correction. Do not reuse
`charver_1786678978658_8is52ngb` as closure evidence because its immutable
canonical lineage records the old crop.
