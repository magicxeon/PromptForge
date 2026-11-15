# Character DNA & Looksheet Prompt Generator — Requirements

**Document ID:** CDLG-REQ-001  
**Version:** 1.2 (Draft for review)  
**Date:** 2026-11-08  
**Status:** Implemented — Standalone Lab MVP; focused logic/browser verification passed
 
## Implementation checkpoint — Standalone Lab (2026-11-08)

Authorized destination: `lab/random-character-design/`, isolated HTML/CSS/Vanilla
JavaScript tool. Case D; primary Product Requirement Architect, UX and QA applied
sequentially by the implementer (limited independence). No production imports,
accounts, provider API, Credits or existing Character Library integration.

Ordered tasks: T1 dictionary/validation/seeded randomizer/Thai composer and focused
pure tests; T2 IndexedDB/library/history/versioning/similarity/backup; T3 responsive
Builder/Library/History/Compare/settings and launcher; T4 browser acceptance,
storage/restore/error checks and requirement closure. Status: T1–T4 complete.

Implementation clarifications: adult age18–120; Hero default2:3; full13 DNA groups
with all initial subfields, Basic/Advanced disclosure; `earVisibility` is variable
appearance while earShape stays permanent. Exact uses canonical DNA equality,
never rounded similarity; categorical distance0/1 and slider distance/4, with
documented group weights. Ears/proportions belong geometry. Similarity excludes
the current generation event. Every explicit Generate creates one immutable full
profile/appearance/output snapshot. Every Library update retains its previous
snapshot; Save As New gets a fresh ID. Replay captures baseline, locks, RNG/schema/
preset/constraint versions, scope and candidate index; Novelty also records dataset
fingerprint and replay uses the recorded candidate rather than reranking new data.
Looksheet permits only its requested short labels; other modes forbid image text.
Storage limits and backup/import limits are visible; no silent automatic deletion.
ZIP uses a locally vendored JSZip build/license; no CDN or runtime installation.
All Lab source, isolated tests, local launcher and README stay in the owning folder.

### Delivery evidence — 2026-11-08

- Runtime: `lab/random-character-design/index.html`, `styles.css` and focused
  ES modules under `js/`: schema/dictionary, randomizer, composer, similarity,
  IndexedDB storage, backups and application UI.40 Permanent DNA Attributes in
  all13 groups plus20 variable fields;6 guided archetypes plus Custom.
- Launcher: `start-tool.bat` -> `serve.mjs`, read-only static loopback service at
  `http://127.0.0.1:8767`. No build/install, production imports, Login, providers,
  Credits or live-data mutations. IndexedDB database `character-dna-studio-v1`
  is the only runtime store. Locally vendored JSZip3.10.1 and license included.
- UI: three-column Builder, Advanced controls/locks, seed replay, closest matches,
  image uploads, three Thai prompt modes, fixed18-image Looksheet wireframe,
  Library/History search/filter/sort, Compare/reroll, version loading, presets,
  theme/threshold/candidate/scope settings and confirmed delete/cleanup/import.
  Mobile/tablet has sticky Profile/DNA/Styling/Prompt section shortcuts.
- `node --test lab/random-character-design/core.test.mjs`:12 tests passed.
  Covers schema/counts/presentations, reproducibility, selective/locked fields,
  identity-safe replay, maximin novelty selection over30 candidates, exact and
  weighted comparison, mode-specific Thai prompts, portable import idempotency,
  copy relationship remapping, version retention and invalid input rejection.
- `node lab/random-character-design/browser.test.mjs`:passed real Chromium
  interaction and IndexedDB tests.20 slider changes create0 History,2 Generate
  clicks create2 immutable events; Library Save/versioning, uploaded reference,
  presets, TXT/DNA JSON downloads, Library/History search/Compare and modal
  wireframe work. Reload restores draft/images; a separate browser context
  restores ZIP including images. Reimporting ZIP and DNA JSON does not duplicate
  IDs. Prototype-key import is rejected; delete and clear require confirmation.
  Injected QuotaExceededError keeps the draft and does not add a failed History
  event; a persistent Export/Cleanup recovery message is visible.
- Responsive:9 cases passed,390/820/1440px x Professional Light/Dark/Burgundy.
  No horizontal overflow;44px primary targets, contained wireframe dialog,
  small-screen section jumps, reduced motion and escaped user text verified.
  Screenshots visually inspected; latest raw browser artifacts and evidence:
  `%TEMP%/character-dna-browser-wcdOeC/`. No external network requests/page errors.
  Static server traversal and POST requests return404/405. Node syntax checks pass.
- Acceptance mapping: AC01–04/15–17 and AT-H03/06/07 -> core tests; AC05–07/10/11
  -> composer tests and visible output/wireframe; AC08/13/14/18/19 and AT-H01/02/
  04/05/08/09 -> browser persistence/download/import/delete journey; AC09 ->9
  responsive/keyboard-operable cases; AC12 -> no API/key/network dependencies;
  AC20 -> visible Attributes-only notices; AT-H10 -> quota injection/recovery.
- Scoped sequential UX/QA review:pass, limited review independence. Import schema,
  HTML escaping, safe image types, bounded storage and transactional commits
  reviewed. This is prompt-only; no provider image quality or pixel/layout
  consistency claim. Physical-device, Safari/Firefox and Windows double-click
  launcher interaction were not directly exercised. No required MVP work remains.
- No existing application files moved. Architecture owner row updated in099;
  no production runtime data path or capability ownership changed. README records
  launch, storage/backup limits and exact verification commands.

## 1. วัตถุประสงค์

### CR-005 — Names, dramatic roles and extended character attributes (2026-11-09)

Case D; primary Product Requirement Architect, sequential scoped UX/QA with
limited independence. Owner: standalone `lab/random-character-design/`. Reuse
Builder fields, locks, randomizer, prompt compiler and existing IndexedDB/backup.
No production integration, provider dispatch, paid generation or new account data.

Outcome and UX contract:
- International fictional given name + surname pools: male/female/unisex by the
  selected presentation; never change presentation to fit a role. Dedicated
  Random Name button plus Name Lock and default-ON auto-name checkbox. Full,
  Guided and Novelty randomize names when enabled/unlocked; Selective and
  one-field rerolls never rename. A name-only action changes no DNA/History.
  Reproducible name stream is separate from facial/novelty sampling.
- Add a character-type selector independent of free-text occupation: Auto lead,
  hero, heroine, second hero/heroine, villain/villainess, henchman, jealous rival,
  supporting, comic relief, friend/confidant, mentor, parent, household worker,
  employee, executive, investigator, doctor and background extra. Selection
  changes future randomization; do not silently rewrite existing attributes,
  profession, gender, name or stored History. No physical trait implies morality.
- Add25 lockable/selectively randomizable attributes:12 personality/story fields
  (temperament, social style, motivation, inner conflict, strength, flaw, stress
  response, relationships, speech style, voice tone, voice pace, character arc)
  and13 visual/performance fields (facial hair, hair finish, wardrobe fit/condition,
  posture, gestures, gaze, movement energy, smile, signature prop, makeup finish,
  layering, grooming). Group these with progressive disclosure. Keep the40
  permanent DNA fields/13 groups and DNA similarity semantics unchanged.
- Every role has an explicit curated temperament/story/acting/wardrobe set.
  Trending uses a coherent face recipe plus common/role-specific bounded pools
  for all85 fields. Leads retain CR-004 casting quality; antagonists use poised
  sharper direction, supporting/service/employee roles have appropriate restrained
  styling, extra roles stay visually unobtrusive. No role changes age/body/skin
  eligibility; Trending retains light/medium by the existing creative brief.
  OFF restores all dictionary choices while still randomizing gender-fit names.
- Locks/selected scope always take priority. Show the selected role and its scope
  beside the selector; shared actions remain in place. Include fictional role,
  personality and acting intent in Hero/Looksheet/Scene prompts; explicit DNA and
  manual values take priority. Historical traces must not invent new lead text.
- Additive optional profile fields only: older JSON/ZIP/History remains valid.
  Fill missing defaults only in editable drafts/new draws, never rewrite saved
  snapshots. Pin a new RNG/casting version; replay pre-Trending, contemporary-v1
  and leading-v2 using the original60-field dictionary/order and old pools. New
 85-field traces replay names, role pools and attributes deterministically.

Tasks: NC1 requirement/UX contracts; NC2 catalog/optional fields/versioned
randomization and name controls; NC3 prompt/persistence compatibility and focused
core/browser/mobile-tablet-desktop verification. NC1–NC3 complete. New `js/casting.js`
owns the role/name configuration inside the existing Lab boundary; architecture
map unchanged, no new stores/runtime data paths or moved files.

CR-005 delivery evidence:
- `js/casting.js` owns20 role options (including Auto), story/acting/wardrobe pools,
  version and international name pools. Existing schema/app/randomizer/composer,
  scoped HTML/CSS, README and Lab tests extended.25 additive optional variable
  attributes:85 total, still40 permanent DNA fields in13 groups. Schema1.0 remains
  compatible with old snapshots; new draws pin RNG3/Casting1. Name stream does
  not affect candidate selection. Replay preserves manual/Save As New name metadata.
- `node --test lab/random-character-design/core.test.mjs`:24 passed. All role x
  presentation x mode combinations and every curated pool value validate. Tests
  cover naming/lock/OFF/selective behaviour, role-specific traits, all85 pools,
  immutable older snapshots, portable backup and unchanged permanent DNA equality.
  Historical full-output goldens before Trending, contemporary-v1 and leading-v2
  pass, including leading-v2 `ad14f067`; unknown versions reject explicitly.
- `node lab/random-character-design/browser.test.mjs`:pass. Dedicated name action
  changes no DNA/History, locked name survives reroll, role selection and doctor
  props/prompt work, locked personality survives randomization. Name/role/new
  attributes persist through Library/History/DNA JSON and existing ZIP/reload
  journeys. Existing quota/error/import and immutable History checks pass.
-9 theme/viewport cases at390/820/1440 pass; no external requests/page errors.
  Raw evidence `%TEMP%/character-dna-browser-r9IYKN/`. Desktop Light/mobile Dark
  and focused name/role controls visually inspected. Existing responsive form,
  attribute groups, focus targets and sibling actions retained. No build needed
  for the standalone tool. Scoped UX/QA applied sequentially, limited independence.
- No production runtime data changes or paid image/TTS calls. Attribute/prompt
  functionality is verified; provider-rendered appearance and voice quality are
  untested. No required CR-005 implementation remains.

### CR-004 — Leading-character Trending Random (2026-11-09)

Outcome: tighten Trending Random into coherent fictional leading-character
casting recipes. CR-003's broad independent face weights did not give a clear
hero/heroine direction. Case D; primary Product Requirement Architect, UX/QA
reviewed sequentially by the implementer, with limited independence. Owner and
write scope remain `lab/random-character-design/` and this requirement.

Research and interpretation:
- [British GQ, 9 March 2026](https://www.gq-magazine.co.uk/article/every-man-is-better-with-a-bigger-brow)
  highlights fuller brows in contemporary male grooming. Interpretation: defined,
  groomed brows for the hero recipes; this source does not prescribe face ratios.
- [Vogue, Yerin Ha's own routine, 26 January 2026](https://www.vogue.com/video/watch/beauty-secrets-yerin-ha)
  describes understated screen makeup and softer brown liner. Interpretation:
  natural skin detail and restrained eye definition for heroine styling.
- [Ibáñez-Berganza et al., Scientific Reports, 2019](https://www.nature.com/articles/s41598-019-44655-9)
  investigates subjectivity/complexity in facial attractiveness. Do not treat
  styling sources as evidence of universal attractiveness or fixed golden ratios.
  The following numeric ranges and combinations are our creative casting brief,
  not measured popularity, scientific beauty scores or celebrity likenesses.

Curated attribute directions (all sliders use the existing 1–5 scale):

| Recipe | Coherent face direction | Supporting styling |
|---|---|---|
| Male: romantic lead | Oval/oval-diamond, almond eyes, straight/soft-angled brows, defined jaw 3–4 with angularness 2–3, rounded chin | Short/medium dark hair, natural movement, soft smile or composed gaze |
| Male: charismatic lead | Diamond/oval-diamond, almond/fox eyes, softly angled/sword brows, jaw definition 4 and angularness 3–4, controlled cheekbones | Groomed dark hair, calm confident expression |
| Female: romantic lead | Oval/heart, almond/round eyes size 3–4, soft brows, jaw width 2–3 and angularness 2, rounded/tapered chin | Medium/long dark hair, soft fringe/waves, natural makeup |
| Female: elegant lead | Oval/diamond, almond/cat eyes, softly angled/arched brows, cheekbone prominence 3–4, jaw width 2 and angularness 2–3 | Medium/long dark hair, restrained makeup, composed expression |

Acceptance and protected behavior:
1. Choose one complete face recipe before drawing its individual attributes.
   Full/Guided/Selective/one-field/Novelty share the same curated pools. Guided
   archetypes bias recipe choice, never inject a conflicting independent field.
   Custom presentation draws from all four recipes without changing presentation.
2. Every field has an explicit curated pool: no unrestricted categorical fallback.
   Common bounds: face length/width 3; eye spacing/depth 3; facial balance/symmetry
   4; nose bridge 3–4, width 2–3, straight/soft bridge and defined/rounded tip;
   chin length 3/width 2–3; lips 3–4, lip balance/mouth width 3; small natural
   asymmetry 1–2. No extreme sliders, convex bridge, cleft/square chin, prominent
   ears or scars in the Trending pool. Skin stays light/medium per CR-003.
3. Limit portrait styling to front/three-quarter, 50/85mm, soft/window light,
   relaxed/seated pose and neutral/soft-smile/composed gaze. Preserve age, role,
   aesthetic, body, manually set DNA and all original controls.
4. Locks and selected scope take priority, even outside a recipe. Checkbox stays
   default ON; OFF restores unrestricted randomization. Toggling alone must not
   change current DNA, Prompt or History. Existing Library/History stay immutable.
5. New traces pin `leading-2026-11-v2` and the chosen recipe ID. Replay continues
   to reproduce both `mulberry32-v1` and CR-003 `contemporary-2026-11-v1` outputs.
   Reject unknown preset versions explicitly. Do not overwrite historical pools.
6. Show the casting intent in newly randomized prompts, derived from the recorded
   recipe rather than the checkbox; explicit DNA/manual settings take priority.
   Existing prompt snapshots remain unchanged. No provider/image-quality claim:
   the Lab still produces attributes and prompts only.

Plan: LC1 research/UX/requirement → LC2 versioned recipes/RNG/prompt/help → LC3
focused coherence/locks/OFF/replay checks and existing browser journey. LC1–LC3
complete. Architecture map unchanged; no new persistence or production path.

CR-004 delivery evidence:
- Extended the existing `js/trending.js` owner with four complete casting recipes,
  common pools and immutable historical pools. Updated randomizer, composer,
  existing checkbox help/accessibility, README and Lab tests. No new/moved files,
  stores, API contracts or production imports. No paid generation executed.
- `node --test lab/random-character-design/core.test.mjs`:19 tests passed. Checks
  every field in all four recipes;810 sampled draws across presentations,
  archetypes and Full/Guided/Novelty stay inside their selected recipe. Existing
  mode/seed checks, all locks, one-field/selective invariants, OFF facial/skin
  variety, Custom presentation and metadata preservation pass. Legacy pre-trend
  golden `a5818baa` and CR-003 full/guided/candidate7 goldens
  `561eecba`/`a3ee6fcd`/`21bde1b9` pass; unsupported versions reject explicitly.
- `node lab/random-character-design/browser.test.mjs`:pass. New female casting
  hint/prompt and recorded recipe are verified; toggling leaves Prompt untouched.
  Existing Generate/History, Library versions, JSON/ZIP/image restore, idempotent
  imports, escaped text and quota recovery pass.9 theme/viewport cases at
 390/820/1440 pass with no page errors/external requests. Desktop Light/mobile
  Dark screenshots inspected: helper wraps within the existing control, no layout
  redesign. Raw evidence: `%TEMP%/character-dna-browser-NMeCzn/`.
- Scoped UX/QA pass by the same implementer, limited independence. Browser/RNG
  evidence validates attributes, prompts and interaction; attractiveness of
  provider-rendered faces has not been evaluated. No required implementation work
  remains; image casting evaluation would be a separate user-approved activity.

### CR-003 — Trending Random (2026-11-08)

Authorized request: add a Trending Random checkbox to the standalone Lab, favour
contemporary attractive/cool character design and exclude darker tones from its
random pool for now. Case D; Product/UX primary, scoped sequential QA. Compact
tasks: TR1 trend research/requirement, TR2 versioned weights + checkbox/persistence,
TR3 focused RNG/legacy replay/browser checks. TR1–TR3 complete.

Research: sources describe styling trends, not a universal beauty ranking or
scientific facial-proportion standard. Global editorial/search signals are used
as inspiration, not claimed to be Thai-only popularity statistics.

| Direction | Source evidence | Implementation interpretation |
|---|---|---|
| Men | [GQ 2026](https://www.gq.com/story/best-hair-trends-for-men-2026): natural texture, centre/side parts, softer movement | Short/medium hair, straight/wavy texture, centre/side part, controlled volume, neutral contemporary clothes |
| Women | [Vogue 2026](https://www.vogue.com/article/hair-trends-2026): polished movement, brunette shades, bobs and fringe; [Google Search Apr2026](https://blog.google/products-and-platforms/products/search/spring-2026-fashion-beauty-trends/): modern shag, Italian bob, bixie/Birkin bangs | Current controls approximate these with varied short/medium/long lengths, dark/brown colour, straight/soft wave, soft fringe and natural/editorial makeup |
| Common | Individual styling and controlled presentation rather than one fixed face | Weight moderate proportions and defined features with variation; no celebrity likeness cloning. Face weights are our creative curation, not sourced demographic statistics |

Acceptance:
- Checkbox labelled `Trending Random`, default ON for new drafts and older drafts
  loaded in UI. Toggling changes future randomization only; it never edits current
  DNA, generates History or changes saved snapshots. Persist in drafts/presets/
  Library/History/JSON/ZIP; accept older profiles without the optional boolean.
- Enabled: versioned curated pools for Full/Guided/Selective/One Field/Novelty.
  Skin pool is `light`/`medium` only; exclude `tan`/`deep`/`rich-deep`. This palette
  restriction is user-selected, not a claim about trend or personal value.
- Female/male/custom use configurable style weights, never permanent gender
  restrictions. Keep all manual options. OFF restores unrestricted legacy pools.
- Locks and Selective scope always win. A locked/excluded or unselected skin tone
  remains unchanged with a clear hint; never silently alter it to fit the preset.
- Store the trend preset version and RNG recipe in randomization traces. Keep
  `mulberry32-v1` replay compatible; never reinterpret a saved seed with new weights.
  Replay must retain character identity and dataset/candidate behaviour.
- Tests cover all presentations/modes, excluded tones, unrestricted OFF, lock/
  selective invariants, seed replay + golden legacy output, persistence/backup and
 390/820/1440 layouts. No production or architecture boundary changes.

CR-003 delivery evidence:
- `js/trending.js` is the new versioned pure preset owner under the existing Lab
  boundary. Common and male/female/custom weights remain editable in this file.
  `schema.js`, `randomizer.js`, `app.js`, `index.html`, scoped CSS and README updated.
  No files moved, IndexedDB stores/schema paths changed or production consumers added;
  architecture map unchanged. Older profiles may omit the additive boolean.
- `node --test lab/random-character-design/core.test.mjs`:15 tests passed.
  New checks validate every weighted option,3 presentations x4 modes x24 seeds,
  restricted tones, unrestricted OFF, locked/untargeted skin, deterministic replay
  and original v1 golden output `a5818baa`. The new v2 trace pins trend version;
  unknown future preset versions fail explicitly instead of reinterpreting a seed.
- `node lab/random-character-design/browser.test.mjs`:passed; checkbox defaults ON,
  toggles leave current Prompt/DNA unchanged and add no History; preference survives
  reload and is present in Library/History/exported JSON. Existing ZIP restore,
  idempotent import, quota recovery and core authoring journey still pass.
 9 responsive theme/viewport combinations passed at390/820/1440; screenshots
  visually inspected. Raw evidence: `%TEMP%/character-dna-browser-TOQ4Dy/`.
- Node syntax checks passed. Sequential scoped UX/QA review, limited independence.
  No paid image execution or visual beauty/likeness claim; trends inform styling
  presets and the output remains prompt-only. No required CR-003 work remains.

สร้าง Web Application ด้วย **HTML, CSS และ Vanilla JavaScript** เพื่อออกแบบใบหน้าและรูปลักษณ์ตัวละครสำหรับภาพยนตร์/ละคร AI โดยเลือก Attributes ผ่าน Select, Slider และตัวเลือกอื่น ๆ หรือสุ่มค่าด้วย Seed แล้วนำมาประกอบเป็น **Prompt ภาษาไทยเป็นหลัก** (อนุญาตให้ใช้ศัพท์เทคนิคภาษาอังกฤษเมื่อแปลแล้วไม่ชัดเจน) สำหรับสร้าง Hero Portrait, Character Looksheet และ Scene Portrait

เป้าหมายสำคัญคือ (1) สร้างตัวละครที่มีเอกลักษณ์และหลากหลาย (2) รักษา Character DNA ข้าม Prompt (3) ให้ Looksheet มี **Pattern มาตรฐานเดียวกัน** ไม่ว่าจะเป็นตัวละครชายหรือหญิง (4) ใช้งานได้โดยไม่ต้องพึ่ง Backend ใน MVP (5) เก็บ Library และประวัติการสร้างเพื่อช่วยหลีกเลี่ยงรูปแบบ Facial DNA ที่เคยสร้าง

## 2. ขอบเขตและข้อสมมติ

### 2.1 MVP (ต้องมี)

- Single-page web app ใช้งานใน browser ได้ด้วย HTML/CSS/JavaScript
- ตัวเลือกเพศ/การนำเสนอ: **Male, Female, Custom** โดยใช้ Schema ร่วมกัน ไม่บังคับลักษณะใบหน้าตามเพศ
- ข้อมูลตัวละครและ Facial DNA ที่ปรับแต่งได้
- โหมด Randomize: Full, Guided by Archetype, Selective by unlocked fields
- Seed-based reproducibility สำหรับ **ชุด Attributes**
- Lock/Unlock ราย Attribute และ Lock All Permanent DNA
- Archetype Presets: Fox, Cat, Wolf, Soft, Sharp, Elegant, Custom (เป็นแนวออกแบบ ไม่ใช่การอนุมานนิสัยจากใบหน้าคนจริง)
- Prompt Composer ภาษาไทย: Hero Portrait, Looksheet, Scene Portrait
- มาตรฐาน Looksheet 9:16 พร้อมองค์ประกอบและลำดับช่องที่ตายตัว
- Copy Prompt, Export TXT, Export/Import Character DNA JSON, Save/Load presets ใน browser
- **Character Library + Auto Generation History + Search/Filter + Compare + Exact/Weighted Duplicate Detection + Novelty-aware Randomizer** ตามข้อ 15
- เก็บ Metadata, History, Presets และภาพอ้างอิงที่ผู้ใช้เพิ่มไว้ใน IndexedDB; Export/Import Backup แบบพกพา
- Validation/Warnings สำหรับค่าที่ขัดแย้งกันหรือพรอมต์ที่อาจทำให้ตัวละครเพี้ยน
- Responsive UI รองรับ Desktop และ Mobile

### 2.2 Phase 2 (ยังไม่อยู่ใน MVP)

- เชื่อมต่อ Image Generation API และจัดการ API Key ผ่าน Backend ที่ปลอดภัย
- เชื่อม API เพื่อสร้าง/ประเมินภาพอ้างอิงอัตโนมัติ (MVP อนุญาตให้อัปโหลดและเก็บภาพใน IndexedDB ด้วยตัวเอง)
- สร้างภาพทีละ Panel แล้วประกอบ Looksheet ด้วย HTML Canvas/CSS หรือ Renderer เพื่อความคงที่ระดับพิกเซล
- Couple Compatibility/Visual Contrast Explorer (การประเมินเชิงศิลปะ ไม่ใช่คะแนนความเข้ากันของบุคคลจริง)
- Image/Face Similarity ที่ประเมินความคล้ายจากพิกเซลภาพจริง (MVP วัดความคล้ายจาก Facial DNA Attributes เท่านั้น)
- Cloud Sync ข้ามอุปกรณ์, Multi-user Collaboration, Advanced Character Version Branching, Batch image generation, Integration กับระบบสร้างวิดีโอ

### 2.3 ไม่อยู่ในขอบเขต

- การรับประกันว่าค่า Seed เดิมสร้างภาพเหมือนเดิมทุกพิกเซลใน AI Image Model
- การจำแนกนิสัย ความดี/ความชั่ว หรือความเข้ากันของมนุษย์จริงจากโครงหน้า
- การบันทึกความลับหรือ API Keys ลง Local Storage ฝั่ง Client
- การอ้างว่า Prompt อย่างเดียวล็อก Looksheet Layout ได้ 100%

## 3. ผู้ใช้และ Use Cases

**Primary users:** ผู้สร้างละคร AI, นักออกแบบตัวละคร, Content Creator, ผู้ผลิตโฆษณาแบบเล่าเรื่อง

- **UC-01:** เลือก Male/Female/Custom, อายุตัวละคร, บทบาท, Archetype แล้วออกแบบใบหน้าด้วย Attributes
- **UC-02:** สุ่มใบหน้าหลายแบบโดยล็อก Attribute บางรายการไว้
- **UC-03:** กำหนด Seed เพื่อสร้างค่า DNA เดิมกลับมาได้
- **UC-04:** สร้าง Prompt ภาษาไทยสำหรับ Hero Portrait เพื่อคัดเลือกใบหน้าต้นแบบ
- **UC-05:** ใช้ DNA เดิมสร้าง Looksheet 9:16 ที่มี Pattern เดียวกัน
- **UC-06:** เปลี่ยนสีหน้า เครื่องแต่งกาย และกล้อง โดยไม่เปลี่ยน Permanent DNA
- **UC-07:** Export/Import Preset และส่ง Prompt ไปใช้กับ Gemini/Seedream หรือโมเดลอื่นด้วยตนเอง
- **UC-08:** Generate Prompt แล้วสร้าง History Entry อัตโนมัติ โดยไม่บันทึกเมื่อปรับ Slider อย่างเดียว
- **UC-09:** Save ตัวละครที่เลือกไว้เข้า Character Library พร้อมภาพ Reference หากมี
- **UC-10:** ตรวจ Exact Match และ Similarity กับประวัติ/Library ก่อนเพิ่มรายการหรือสุ่มครั้งใหม่
- **UC-11:** เปิด Compare สองรายการและเลือกสุ่มเฉพาะ Attribute ที่ต่างกันน้อยที่สุด
- **UC-12:** Backup/Restore ข้อมูลข้าม browser ด้วย Export/Import

## 4. ข้อมูลตัวละคร (Character Profile)

| Field | Type | หมายเหตุ |
|---|---|---|
| `characterId` | string/UUID | สร้างเมื่อเริ่มตัวละคร; คงที่ |
| `name` | string | ไม่บังคับ |
| `project` | string | ชื่อโปรเจกต์ ไม่บังคับ |
| `presentation` | enum | male / female / custom |
| `age` | integer | อายุสมมติ; ค่าเริ่มต้นเป็นผู้ใหญ่ 18+ |
| `role` | select/text | CEO, Student (ผู้ใหญ่), Aristocrat, Artist ฯลฯ |
| `aestheticStyle` | enum | Chinese Modern, Thai Modern, European Modern, International, Custom |
| `archetype` | enum | fox, cat, wolf, soft, sharp, elegant, custom |
| `personalityDirection` | select/text | ใช้กำกับ *การแสดง* ไม่อนุมานจากใบหน้า |
| `bodyHeight` | numeric/range | ตัวเลือกเสริม |
| `bodyBuild` | enum | slender, athletic, broad-shouldered ฯลฯ |
| `randomSeed` | string/integer | กำหนดการสุ่มแบบทำซ้ำได้ |
| `schemaVersion` | string | สำหรับ migration |

### 4.1 Permanent Facial DNA

ใช้ **schema เดียวกันทุกเพศ** และสามารถปรับได้อิสระ ตารางด้านล่างกำหนด **13 Attribute Groups** สำหรับ Permanent Facial DNA โดยแต่ละกลุ่มประกอบด้วย **Attributes ย่อย** หลายรายการ; Attribute ย่อยแต่ละรายการต้องมี ID, Label ไทย, Options, Default, คำแปลอังกฤษ, Lock State และ Prompt Mapping

**นิยามสำหรับการตรวจรับ:** `Attribute Group` คือหมวดในคอลัมน์แรกของตาราง (รวม 13 กลุ่ม); `Attribute` คือฟิลด์ย่อยที่ผู้ใช้กำหนดค่าได้จริง เช่น `eyeShape`, `eyeSize` หรือ `canthalTilt` ไม่ใช่ตัวเลือกภายในฟิลด์ เช่น `oval` หรือ `diamond` และไม่นับสถานะ Lock/Seed/Prompt เป็น Attribute ใบหน้า

| กลุ่ม | Attribute ตัวอย่าง | รูปแบบ |
|---|---|---|
| Overall facial geometry | faceShape: oval/diamond/heart/square/round/oblong/combination | select |
| Facial proportions | faceLength, faceWidth, facialThirdBalance, facialSymmetry | slider 1–5 |
| Cheeks | cheekboneHeight, cheekboneProminence, cheekFullness | slider 1–5 |
| Jaw | jawWidth, jawAngularness, jawDefinition | slider 1–5 |
| Chin | chinLength, chinWidth, chinShape | select + slider |
| Eyes | eyeShape: almond/round/fox/cat/downturned/hooded, eyeSize | select + slider |
| Eye placement | eyeSpacing, canthalTilt, eyeDepth, eyelidType | slider/select |
| Eyebrows | browShape: straight/arched/sword/soft-angled, density, angle | select + slider |
| Nose | noseBridgeHeight, bridgeShape, tipShape, noseWidth | select + slider |
| Lips | lipFullness, upperLowerBalance, cupidBow, mouthWidth | select + slider |
| Ears | earShape, earVisibility | select |
| Skin | skinTone, undertone, realisticTexture, freckles | select + slider |
| Distinctive marks | beautyMark, dimple, minorScar, subtleAsymmetry | multi-select + location |

**ข้อกำหนด:** หลีกเลี่ยงการผูก attributes กับเชื้อชาติหรือเพศอย่างตายตัว และไม่ใช้สัดส่วนที่เทียบเคียงกับการประเมินคุณค่าของคนจริง

### 4.2 Variable Appearance

- Hair: ความยาว, สี, แสก, Texture, Volume, Fringe, Styling
- Makeup: ระดับและสไตล์ที่เหมาะกับการออกแบบ ไม่จำกัดตามเพศ
- Costume: ชุดหลักและชุดทางเลือก, วัสดุ, สี, ยุคปัจจุบัน/ยุคที่เลือก
- Accessories: ต่างหู แว่น นาฬิกา สร้อย ฯลฯ
- Expression: Neutral, Gentle Smile, Joy, Sadness, Surprise, Controlled Anger, Cold Stare, Evil Smirk ฯลฯ
- Pose, Camera, Lighting, Background, Lens, Aspect Ratio

**Rule:** ถ้าเลือก `sameIdentity=true` Prompt ทุกประเภทต้องอ้างถึง Permanent DNA เดียวกันและแจ้งให้รักษาจุดจำเฉพาะตัว

## 5. Randomization Algorithm

1. อ่าน `characterProfile`, `archetype`, `seed` และ lock map
2. เริ่ม deterministic PRNG (เช่น `mulberry32` หลัง normalize seed เป็น integer)
3. สำหรับแต่ละ attribute ที่ **ไม่ได้ Lock**: เลือกค่าจาก distribution หรือ weighted options ที่สัมพันธ์กับ Archetype; ห้ามเปลี่ยนค่าที่ล็อก
4. Run constraint validator เพื่อตรวจความขัดแย้ง เช่น ประเภทหน้าและคำบรรยายสัดส่วนที่สวนทางกัน
5. ใช้ normalization/soft constraints: ไม่บังคับให้ทุกคนสวยเหมือนกัน และไม่ทำให้ผลสุ่มทั้งหมดกระจุกที่ค่ากลาง
6. เขียนผลเป็น `characterDNA` พร้อม `seed`, `schemaVersion`, `archetype`, `locks`
7. ใช้ Composer แปลงค่าทั้งหมดเป็น Prompt โดยไม่ให้ข้อมูลซ้ำหรือขัดกัน

### โหมด

- **Full Random:** สุ่มทุกค่าที่ยังไม่ล็อก ไม่จำเป็นต้องใช้น้ำหนัก Archetype
- **Guided Random:** สุ่มด้วยน้ำหนักจาก Archetype พร้อมปรับค่าเองได้
- **Selective Random:** ผู้ใช้เลือกกลุ่มที่ต้องการสุ่ม เช่น Eyes + Hair เท่านั้น
- **Reroll One Attribute:** สุ่มเฉพาะรายการเดียวโดยคงค่าอื่น
- **Novelty-aware Random:** สร้าง Candidate หลายชุดและคัดชุดที่แตกต่างจาก History/Library มากที่สุด ภายใต้ Locks และ Constraints (รายละเอียดข้อ 15.4)

**การทำซ้ำ:** Seed + Schema Version + Preset Version + Lock Map + ลำดับสุ่มเดียวกัน ต้องให้ผล JSON Attributes เหมือนกัน; ไม่รับประกันรูปภาพจากโมเดลภายนอก

## 6. Prompt Composer — ภาษาไทย

### 6.1 กฎภาษา

- ภาษาไทยเป็นหลักทุกส่วน: ภาพรวม, โครงหน้า, ผิว, การแสดง, เสื้อผ้า, แสง, ฉาก, ข้อห้าม
- ภาษาอังกฤษสำหรับคำเฉพาะที่แปลไม่ชัด เช่น `Almond Eyes`, `Canthal Tilt`, `85mm`, `f/2.8`, `Ultra-Photorealistic`, `Three-quarter View`
- อนุญาตให้ใส่ชื่อเทคนิคอังกฤษในวงเล็บหลังคำไทย
- ไม่แสดงเพียง `key=value`; แปลงเป็นข้อความกำกับภาพที่อ่านลื่นและไม่ซ้ำ
- ใช้คำบรรยายเชิงสังเกต ไม่ใช้ stereotype แบบ “หน้าตาแบบนี้เป็นคนร้ายจริง”
- แยก `Positive Prompt`, `Camera & Lighting`, `Continuity Rules`, `Avoid/Negative Constraints`

### 6.2 Output Modes

**Mode A — Hero Portrait**
- แสดงหนึ่งตัวละคร หนึ่งภาพ (default 2:3 แนวตั้งหรือเลือก 9:16)
- มุมหน้าตรงหรือ 3/4, โครงหน้าชัด, แสงมาตรฐาน, เสื้อผ้า Signature
- เหมาะกับการเลือกใบหน้าต้นแบบก่อนสร้างหลายช่อง

**Mode B — Looksheet**
- 9:16 แนวตั้ง, **หนึ่งตัวละครต่อแผ่น**
- Layout Contract ตามข้อ 7 และคง DNA ในทุกช่อง
- Prompt อธิบายจำนวนช่องและลำดับแน่นอน

**Mode C — Scene Portrait**
- ยึด DNA, อ้างอิง Hero Portrait/Looksheet ที่ผู้ใช้อัปโหลดในเครื่องมือปลายทาง
- เปลี่ยนเฉพาะ Expression, Costume, Pose, Camera, Environment
- รองรับภาพสำหรับละคร/ภาพยนตร์/โฆษณา

### 6.3 ตัวอย่างโครง Prompt ภาษาไทย

```text
สร้างภาพ [ประเภทภาพ] ของ[เพศ/การนำเสนอ]อายุ [อายุ] ปี ในแนว [Aesthetic Style]

เอกลักษณ์ใบหน้า: [Facial DNA ที่เรียบเรียงเป็นประโยคภาษาไทย]
รายละเอียดผิวและเส้นผม: [Skin + Hair]
สีหน้าและบุคลิกการแสดง: [Expression + Acting Direction]
เสื้อผ้าและเครื่องประดับ: [Wardrobe + Accessories]
กล้องและองค์ประกอบ: [Lens + Angle + Framing + Aspect Ratio]
แสงและสภาพแวดล้อม: [Lighting + Background]

รักษาตัวตนและรูปลักษณ์ใบหน้าตาม Character DNA ที่กำหนดในทุกมุม
ข้อห้าม: ไม่เพิ่มคน ไม่เปลี่ยนลักษณะใบหน้า ไม่สร้างนิ้วเกิน ไม่มีข้อความ/ลายน้ำ
```

## 7. Looksheet Pattern Standard (9:16)

**Layout ID:** `LS-STD-9x16-V1`  
**Requirement:** ทุกเพศใช้ Pattern และลำดับแผงเดียวกัน; ปรับได้เฉพาะเนื้อหาและโทนสีที่เลือก

| ลำดับ | Panel | เนื้อหา | หมายเหตุ |
|---|---|---|---|
| 1 | Header | Character Name, ID, Age, Role | ข้อความสั้น ชัดเจน |
| 2 | Hero Portrait | ภาพใบหน้าหลัก ขนาดใหญ่ | เห็นหน้าอย่างชัดเจน |
| 3 | Character DNA Summary | จุดเด่น 3–5 อย่าง | ไม่ทับภาพ |
| 4 | Angle Views | Front, 3/4, Side, Back | จัดลำดับและกรอบคงที่ |
| 5 | Expression Study | Neutral, Smile, Sad, Anger, Surprise | ค่าเริ่มต้น 5 ช่อง |
| 6 | Wardrobe | Signature, Casual, Business, Formal | ค่าเริ่มต้น 4 ช่อง |
| 7 | Details | Eye, Nose, Lips, Hair/Skin | ช่องรายละเอียด 4 ช่อง |

### 7.1 กฎภาพ

- อัตราส่วนทั้งแผ่น **9:16** (เช่น 1080 × 1920 px)
- หนึ่งตัวละครต่อแผ่น ห้ามแสดงชายหญิงรวมใน Looksheet เดียว
- มุมหน้าตรง/3-4/ด้านข้างใช้ Identity เดียวกัน
- ทุกรูปใน Expression Study ใช้ลักษณะหลักและเครื่องแต่งกายเดียวกัน เพื่อเทียบการแสดง
- Wardrobe เปลี่ยนเครื่องแต่งกายได้แต่ห้ามเปลี่ยน Face DNA
- แสงพื้นฐานควบคุมให้ใกล้เคียงกัน เพื่อไม่สร้างความแตกต่างหลอกตา
- ป้ายกำกับเลือกภาษาไทยเป็นหลัก; ไม่ต้องสร้างข้อความยาวบนภาพ
- ทำธีม Default แบบ **Professional Clean Editorial** (พื้นอ่อน/เทากลาง ตัวอักษรอ่านง่าย) และ Theme Preset เพิ่มเติม เช่น Dark Cinematic, Burgundy/Gold

### 7.2 ระดับการรับประกัน Layout

- **Prompt-only MVP:** แสดง/คัดลอก Prompt ที่กำหนด Layout Contract; ภาพจาก AI อาจคลาดเคลื่อนในแผง ข้อความ หรือใบหน้า
- **Future deterministic renderer:** Generate ภาพแยกแต่ละ Panel แล้วประกอบด้วย Template 9:16 ที่มีตำแหน่งและขนาดตายตัว เพื่อความคงที่จริง

## 8. UI/UX Requirements

### 8.1 Layout

- Desktop: 3 columns — Controls / DNA Summary / Thai Prompt Output และเมนู Builder / Library / History / Compare
- Mobile: Tabs หรือ Sections — Profile → DNA → Styling → Output
- มี Select, Slider, Color Picker (ตามความเหมาะสม), Checkboxes, Lock icons, Randomize Buttons
- ระบุค่าที่กำลังถูก Lock ให้มองเห็นชัด และมี Reset to Default

### 8.2 Controls

- `New Character`, `Load Preset`, `Save Preset`, `Save to Library`, `Open History`, `Compare Characters`
- `Random All`, `Guided Random`, `Random Selected`, `Reroll Field`, `Novelty-aware Random`
- `Seed` Input + `Regenerate From Seed`
- `Lock Permanent DNA` และ Lock รายรายการ
- `Generate Prompt` (Hero/Looksheet/Scene)
- `Copy Thai Prompt`, `Download TXT`, `Export JSON`, `Import JSON`
- `Show Preview Layout` เป็น Wireframe; ไม่ใช่ภาพ AI ที่สร้างแล้ว

### 8.3 Accessibility

- Form labels อ่านได้ชัด, Keyboard navigation, Focus states, Contrast ที่เหมาะสม
- ภาษา UI หลักเป็นไทย มี Tooltip อธิบายคำเฉพาะและตัวอย่างแบบเข้าใจง่าย
- ไม่ใช้สีเพียงอย่างเดียวแสดงสถานะ Lock/Validation

## 9. Data & Technical Design

### 9.1 Technology

- HTML5 + CSS3 + Vanilla JavaScript (ES modules)
- MVP ทำงาน Client-side ไม่ต้องมี Backend
- **IndexedDB** เป็น Primary Client Storage สำหรับ Presets, Character Library, Generation History และ Reference Image Blob (ถ้ามี); ไม่ใช้ LocalStorage เก็บภาพ
- รองรับ JSON/ZIP Export–Import Backup และตรวจ schema/version ก่อน Restore; ต้องมีปุ่มล้าง History แบบยืนยันก่อนลบ
- มี Storage Quota Handling พร้อมแจ้งเตือนและสำรองข้อมูลเมื่อพื้นที่ไม่พอ
- โครงสร้างแยก Module: `schema`, `presets`, `randomizer`, `constraints`, `promptComposer`, `looksheetTemplate`, `history`, `library`, `similarity`, `storage`, `ui`

### 9.2 ตัวอย่าง JSON (ย่อ)

```json
{
  "schemaVersion": "1.0",
  "characterId": "char-example-001",
  "name": "",
  "presentation": "female",
  "age": 26,
  "aestheticStyle": "chinese-modern",
  "archetype": "fox",
  "randomSeed": 123456,
  "facialDNA": {
    "faceShape": "oval-diamond",
    "faceLength": 4,
    "cheekboneProminence": 3,
    "jawDefinition": 3,
    "eyeShape": "almond",
    "canthalTilt": 4,
    "browShape": "soft-angled",
    "noseBridgeHeight": 3,
    "lipFullness": 3,
    "skinTone": "neutral-ivory"
  },
  "locks": { "faceShape": true, "eyeShape": true },
  "appearance": {
    "hairStyle": "long-soft-waves",
    "costume": "burgundy-business",
    "expression": "neutral"
  },
  "output": { "mode": "looksheet", "layoutId": "LS-STD-9x16-V1", "language": "th" }
}
```

### 9.3 Validation

- ใช้ schema validation กับ JSON ขาเข้า และตรวจ `schemaVersion`
- กำหนดช่วง Slider ชัดเจนและบังคับค่าอยู่ในช่วง
- ตรวจ Negative/Positive prompt ไม่ขัดกัน
- ความขัดแย้งที่เป็นเพียงความไม่คุ้นเคยด้านรูปลักษณ์ให้แสดงคำเตือน ไม่บังคับแก้ไข
- ห้าม Randomizer เปลี่ยนค่าที่ล็อก

## 10. Acceptance Criteria (ทดสอบผ่านก่อนส่งมอบ)

- **AC-01:** เลือก Male/Female/Custom แล้วระบบต้องแสดง Facial DNA ครบ **13 Attribute Groups** ตามตารางข้อ 4.1 โดยมี **Attributes ย่อยอย่างน้อย 15 ฟิลด์ที่ผู้ใช้เลือกหรือปรับค่าได้จริง** และนำค่าที่กำหนดไปประกอบเป็น Prompt ภาษาไทยได้; ตรวจรับโดยนับ Group ID ที่ไม่ซ้ำให้ครบ 13, นับ Attribute ID ที่ไม่ซ้ำอย่างน้อย 15 และทดสอบทั้ง 3 โหมดเพศ
- **AC-02:** Archetype 6 แบบเป็น Preset เริ่มต้นและสามารถ Custom ข้ามเพศได้
- **AC-03:** สุ่มจาก Seed และ config เดิมได้ Attributes JSON เหมือนกัน 100%
- **AC-04:** เมื่อ Lock `faceShape` และ `eyeShape` แล้วสุ่มซ้ำ ค่าสองรายการนี้ไม่เปลี่ยน
- **AC-05:** Prompt Hero Portrait ไม่ปะปนคำสั่ง Looksheet หลายช่อง
- **AC-06:** Prompt Looksheet ทั้งชายและหญิงใช้ `LS-STD-9x16-V1` และจำนวน/ลำดับ Panel เท่ากัน
- **AC-07:** เปลี่ยน Expression หรือ Wardrobe แล้ว Permanent DNA ใน JSON ไม่เปลี่ยน
- **AC-08:** Copy Prompt, Export TXT, Export JSON และ Import JSON กลับมาค่าเหมือนเดิม
- **AC-09:** ใช้งานได้ทั้ง Desktop/Mobile และรองรับคีย์บอร์ด
- **AC-10:** Generated Prompt อ่านเป็นภาษาไทยอย่างเป็นธรรมชาติ ไม่ใช่เพียง key-value และใช้คำอังกฤษเฉพาะเทคนิคเมื่อจำเป็น
- **AC-11:** แจ้งผู้ใช้ว่า Prompt-only ไม่รับประกันภาพหรือเลย์เอาต์เหมือนกันทุกพิกเซล
- **AC-12:** ไม่มี API key หรือความลับฝังใน Client Source
- **AC-13:** กด Generate Prompt หนึ่งครั้งแล้วสร้าง History หนึ่งรายการ; เปลี่ยน Select/Slider เฉย ๆ ไม่เพิ่ม History
- **AC-14:** Save to Library แล้วปิด/เปิดหน้าใหม่ยังค้นคืนข้อมูลพร้อมภาพ Reference ได้จาก IndexedDB (เมื่อข้อมูลเว็บไซต์ไม่ถูกล้าง)
- **AC-15:** DNA ที่ normalize แล้วเหมือนกันได้ Exact Duplicate Match; เปลี่ยนเฉพาะ Costume/Lighting ไม่ทำให้กลายเป็นใบหน้าใหม่
- **AC-16:** Similarity Score คำนวณซ้ำจากคู่ DNA เดิมได้ผลเท่าเดิม และแสดง Attribute แตกต่างสำคัญ
- **AC-17:** Novelty Random เคารพ Locks, Constraints และจัดอันดับ Candidate ตามความแตกต่างจากประวัติ/Library
- **AC-18:** Export แล้ว Import กลับมาได้ Character, History, IDs, Seeds และรูปอ้างอิงตามที่เลือก โดยไม่เกิดรายการซ้ำจากการ Import รอบเดิม
- **AC-19:** History/Library ค้นหา กรอง เรียง และลบได้โดยมีการยืนยันการลบ
- **AC-20:** แจ้งเตือนชัดว่า Similarity เป็นการเทียบ Attributes ไม่ใช่การตรวจภาพหรือใบหน้าจริง

## 11. ลำดับการพัฒนา (Implementation Plan)

1. ออกแบบ Attribute Dictionary + schema + Thai/English phrase mappings
2. ทำ UI Profile & Facial DNA Controls พร้อม Lock และ Slider
3. พัฒนา PRNG/Randomizer และ Test การทำซ้ำด้วย Seed
4. พัฒนา Thai Prompt Composer: Hero Portrait → Looksheet → Scene
5. ทำ Looksheet 9:16 Wireframe + Layout Contract
6. สร้าง IndexedDB Storage, History, Library, Search และ Backup/Restore
7. เพิ่ม Exact/Weighted Similarity, Compare View และ Novelty-aware Randomizer
8. Import/Export Presets + Validation + Responsive QA
9. ทดสอบ User Journey: ออกแบบหญิง → สุ่ม → ล็อก DNA → สร้าง Looksheet → เปลี่ยนสีหน้า → สร้าง Scene และทำซ้ำกับชาย

## 12. ความเสี่ยงและแนวทางรับมือ

| ความเสี่ยง | แนวทาง |
|---|---|
| ค่าบรรยายชนกันหรือซ้ำ | Schema validation + Prompt Composer rules |
| สุ่มแล้วหน้าดูคล้ายกันหมด | Weighted distributions + Distinctiveness warnings (Phase 2) |
| AI สร้าง Looksheet แต่ละแผ่นคนละ Layout | กำหนด Layout ID; อนาคตใช้ deterministic renderer |
| ภาพหลายช่อง Identity เปลี่ยน | ใช้ Hero Portrait/Reference ในโมเดลที่รองรับ; ตรวจด้วยสายตา |
| UI ซับซ้อนเกินไป | Basic/Advanced mode, grouped controls, preset-first workflow |
| บันทึกข้อมูลสูญหาย | IndexedDB + Export ZIP/JSON backup, เตือนเรื่องการล้างข้อมูล Browser และ schema migration |
| การวัดความคล้ายจาก DNA ไม่ตรงกับหน้าภาพที่ AI สร้าง | ระบุขอบเขตให้ชัด และย้าย Visual Similarity จริงเป็น Phase 2 |
| History โตจนเกินพื้นที่ Browser | Quota Warning, Image Compression/Size Limit, Export และ Cleanup |

## 13. ข้อสรุปที่ล็อกแล้ว / ประเด็นรอตัดสินใจ

### Locked requirements

- HTML/CSS/Vanilla JS เป็นพื้นฐาน MVP
- Prompt **ภาษาไทยเป็นหลัก** ใช้อังกฤษเฉพาะที่จำเป็น
- รองรับชาย หญิง และ Custom ด้วย Schema เดียวกัน
- Randomize + Attribute Lock + Seed
- Hero Portrait ก่อน Looksheet เป็น Workflow ที่แนะนำ
- Looksheet **9:16 Pattern เดียวกันทุกตัวละคร**
- ไม่รวมชายหญิงไว้ใน Looksheet เดียว
- History แยกจาก Library, ใช้ IndexedDB เป็น Primary Storage, ตรวจ Similarity จาก Facial DNA, มี Novelty-aware Randomizer

### Open decisions

1. **Hero Portrait Default:** 2:3 หรือ 9:16 (รองรับทั้งคู่)
2. **Attribute Complexity:** MVP มี **13 กลุ่ม Facial DNA ตามข้อ 4.1** และมี **Attributes ย่อยขั้นต่ำ 15 ฟิลด์**; โหมด Advanced เพิ่มจำนวนฟิลด์ภายในกลุ่มเดิมได้โดยไม่ต้องเปลี่ยนจำนวนกลุ่ม (แนะนำ)
3. **Layout Consistency:** MVP เน้น Prompt-only; deterministic renderer เมื่อมี Image API หรือภาพ Panel (แนะนำ)
4. **API Integration:** เพิ่ม Phase 2 หลัง MVP ผ่านการทดลองใช้งาน (แนะนำ)
5. **Theme Default:** Professional Light หรือ Dark Editorial (เสนอ Professional Light)
6. **Cross-device:** MVP รองรับ Export/Import Backup แต่ยังไม่รองรับ Cloud Sync; หากจำเป็นต้องใช้หลายเครื่อง ให้กำหนดระบบ Sync ใน Phase 2

## 14. References

- Adobe — Character Design: https://www.adobe.com/creativecloud/video/discover/character-design.html
- Google AI for Developers — Gemini Image Generation: https://ai.google.dev/gemini-api/docs/image-generation
- MDN — Web Storage API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API
- MDN — JavaScript: https://developer.mozilla.org/en-US/docs/Web/JavaScript
- MDN — HTML: https://developer.mozilla.org/en-US/docs/Web/HTML

> **Note:** Facial DNA เป็นระบบควบคุมภาษาภาพและรายละเอียดตัวละครสมมติ ไม่ใช่มาตรวัดความงามหรือบุคลิกของคนจริง และไม่ได้รับประกันความสอดคล้องของภาพจากโมเดลสร้างภาพภายนอก


## 15. Change Request CR-001 — Character Library, History & Duplicate Avoidance (v1.1)

### 15.1 เป้าหมายและนิยาม

- **Generation History:** เก็บทุกครั้งที่ผู้ใช้กด `Generate Prompt` อย่างชัดเจน แม้ไม่ได้เลือก Save; ไม่บันทึกทุกการขยับ Slider หรือเปิด Preview
- **Character Library:** เก็บตัวละครที่ผู้ใช้กด `Save Character` โดยเจตนา พร้อม DNA, Prompt ที่เลือก, Reference Image (ถ้ามี) และ Metadata
- **Character Version:** การแก้ตัวละครใน Library ต้องไม่ลบเวอร์ชันก่อนหน้าโดยไม่ตั้งใจ; MVP เก็บ `updatedAt` และ Snapshot ก่อนแก้สำคัญหรือ Save As New
- **Facial DNA Similarity:** ค่าความคล้ายของ Attribute ที่ Normalize แล้ว **ไม่ใช่** คะแนนความเหมือนของภาพที่ AI Render หรือการจดจำใบหน้ามนุษย์จริง
- การระบุว่า `Character ID` เหมือนกันหรือไม่ ต้องแยกจากการตรวจ `Facial DNA Fingerprint` เหมือนกัน

### 15.2 Data Model และการเชื่อมโยง

| Entity / Store | ตัวอย่างข้อมูล | หมายเหตุ |
|---|---|---|
| `characters` | `characterId`, `name`, `project`, `createdAt`, `updatedAt`, `facialDNA`, `appearance`, `locks`, `imageIds[]` | Saved Library; ID คงเดิมเมื่อแก้ |
| `generations` | `generationId`, `characterId?`, `createdAt`, `seed`, `archetype`, `schemaVersion`, `presetVersion`, `facialDNA`, `locks`, `promptType`, `promptText`, `fingerprint` | Immutable snapshot ต่อการ Generate |
| `presets` | `presetId`, `version`, `config`, `createdAt` | User Presets |
| `images` | `imageId`, `characterId?`, `mimeType`, `blob`, `createdAt`, `source` | User-uploaded Reference; จำกัดไฟล์และตรวจ MIME |
| `settings` | `key`, `value` | Thresholds, UI preferences, storage preferences |

- ใช้ `IndexedDB` ใน Browser เป็น Primary Storage และสร้าง Index อย่างน้อย `createdAt`, `characterId`, `project`, `archetype` สำหรับการค้นหา/กรอง
- `fingerprint` คำนวณจาก **Canonical Permanent Facial DNA** ที่เรียง Key, Normalize ค่า และใช้ schemaVersion; **ไม่รวม** Costume, Expression, Lighting, Camera หรือ Prompt Wording
- IDs ของตัวละคร/History/ภาพต้องเป็นเอกลักษณ์ เพื่อป้องกันการ Import ซ้ำ และรองรับเชื่อมกลับไปยังรายการต้นทาง
- เก็บ Prompt ภาษาไทยที่ Generate แล้วเป็น Snapshot; ปรับ Composer รุ่นใหม่แล้ว History เดิมต้องไม่เปลี่ยนเงียบ ๆ
- เก็บภาพเฉพาะที่ผู้ใช้แนบหรือ Import; **ไม่อ้างว่าเว็บสร้างภาพจริงได้** ใน MVP

### 15.3 Duplicate Detection และ Compare

1. **Exact Match:** คำนวณ Facial DNA Fingerprint แล้วค้นทั้ง History และ Library; ถ้าตรงให้เตือนและลิงก์เปิดรายการเก่า ไม่บังคับห้ามบันทึก
2. **Weighted Similarity:** คำนวณจากกลุ่ม Attribute ที่มีร่วมกัน โดย Normalize ทุก Slider เป็นช่วง 0–1 และกำหนดการเทียบ Category อย่างชัดเจน; น้ำหนักกลุ่มรวมกัน = 100%
3. **น้ำหนักเริ่มต้นสำหรับทดลอง:** Face geometry 20%, Eyes 20%, Brows 10%, Nose 15%, Jaw/Chin/Cheeks 15%, Lips 10%, Skin/Distinctive marks 10%; ปรับได้ภายหลังด้วย Versioned Configuration
4. **Thresholds เริ่มต้น:** 100% = Exact; >=90% = High Similarity; 75–<90% = Moderate; <75% = Relatively Distinct (ตั้งค่าได้ ไม่ใช่ค่ามาตรฐานเชิงวิทยาศาสตร์)
5. **Compare View:** เลือก Current Draft เทียบ History/Library หนึ่งรายการ แสดงด้านข้างกัน พร้อมรายการ Attribute ที่ตรง/ต่าง, Similarity Score, Seed, Archetype และปุ่ม Load/Save As New
6. ไม่ใช้ `characterId`, เพศ, อายุ, แฟชั่น หรือบทบาท มาตัดสินว่าโครงหน้าซ้ำ; ใช้เป็นเงื่อนไขกรองผลเท่านั้น
7. เมื่อไม่มีประวัติ ให้แสดง `No history to compare` และไม่กล่าวอ้างว่าหน้าใหม่มีเอกลักษณ์สมบูรณ์

### 15.4 Novelty-aware Randomization

- เพิ่มโหมด `Novelty-aware Random` ที่สร้าง Candidate อย่างน้อย 20 ชุด (ปรับจำนวนได้) ด้วย seeded PRNG โดยเคารพ Field Locks และ Constraint Validation
- คัด Candidate ที่ไม่มี Exact Match ก่อน จากนั้นจัดอันดับด้วย **ความคล้ายสูงสุดต่อรายการเดิมที่ต่ำที่สุด** (maximize minimum distance) เพื่อหลีกเลี่ยงหน้าที่ใกล้รายการเก่าเกินไป
- ในกรณีคะแนนเท่ากัน ใช้ deterministic tie-breaker จาก Candidate Index/Seed เพื่อทำซ้ำได้
- ผู้ใช้เลือก Scope การเทียบได้: Library Only / History Only / Both (เริ่มต้น Both)
- มี `Random Again`, `Keep Locked Attributes`, `Show Closest Existing Character`, `Save to Library`
- หากพื้นที่ค้นหาแคบจาก Locks มากจนไม่มี Candidate ที่ต่างพอ ต้องแจ้งเตือนและเสนอให้ปลด Lock บางค่า **ไม่แอบเปลี่ยนค่า Lock**
- Reproducibility ต้องบันทึก RNG Algorithm Version, Seed, Candidate Count, Constraint Version และ **Fingerprint ของชุด History/Library ที่ใช้เทียบ** เนื่องจากประวัติที่เพิ่มภายหลังอาจเปลี่ยนผลการจัดอันดับ

### 15.5 UX Flows

**Flow A — สุ่มและบันทึก:** Builder → Random/Adjust → Generate Thai Prompt → บันทึก Generation History → ตรวจ Similarity และแสดงรายการใกล้เคียง → Save Character (เฉพาะเมื่อผู้ใช้กด) → Character Library

**Flow B — ดูย้อนหลัง:** History → ค้นชื่อ/Project/Archetype/วันที่/Seed → เลือกรายการ → ดู Prompt/DNA/Similarity → Load Draft หรือ Save to Library

**Flow C — หลีกเลี่ยงซ้ำ:** Builder → Novelty-aware Random → เปรียบเทียบกับ Library/History → แสดงคะแนนและความต่าง → ยืนยัน Generate/Save

**Flow D — ใช้ตัวละครต่อเนื่อง:** Library → เลือก Character → Lock Permanent DNA → Generate Hero Portrait / Looksheet / Scene Prompt โดยใช้ Layout ID `LS-STD-9x16-V1` เดียวกันทุกเพศ

**Flow E — Backup/Restore:** Export JSON สำหรับ Metadata/Prompts และ ZIP สำหรับรวมรูป Reference; Import พร้อม Preview จำนวนรายการและ Conflict Strategy (`skip`, `merge by ID`, `create new copy`) ก่อน Commit

### 15.6 Storage, Privacy & Reliability

- MVP = Browser-only / Offline-first; ข้อมูลอยู่ในเครื่องและ Browser Profile ที่ใช้ ไม่ Sync อัตโนมัติข้ามอุปกรณ์
- แนะนำ HTTPS หรือ Local Development Server เพื่อให้ IndexedDB ใช้งานสม่ำเสมอ; การเปิด `file://` อาจมีพฤติกรรม Storage แตกต่างกันในแต่ละ Browser
- ข้อมูล IndexedDB อาจถูกลบเมื่อ Clear Site Data หรือโหมด Private Browsing; **ต้องมีคำเตือน** และปุ่ม Export Backup ชัดเจน
- จำกัดขนาดภาพ Reference, ตรวจประเภทไฟล์และจัดการข้อผิดพลาด Storage Quota; ไม่บันทึก API Keys หรือข้อมูลลับ
- History Delete/Clear และ Library Delete ต้องมี Confirmation; การลบภาพที่ยังถูกอ้างอิงโดย Character อื่นต้องเตือนก่อน
- Import ต้อง validate JSON/schema, ป้องกัน Prototype Pollution และจัดการ Record IDs ซ้ำโดยไม่เขียนทับเงียบ ๆ
- แยกการเพิ่ม History ออกจาก Save Library: อาจ Save โดยอ้าง `generationId` ที่มีอยู่ เพื่อไม่สร้าง History ซ้ำโดยไม่จำเป็น

### 15.7 ข้อจำกัดและ Phase 2

- MVP เปรียบเทียบความคล้ายของ **Facial DNA Attributes เท่านั้น**; ยังไม่ตรวจ Facial Embeddings/Visual Similarity จากภาพ
- Phase 2: Cloud Account/Sync, Image Generation API, Image Similarity (ต้องออกแบบเรื่องความเป็นส่วนตัวและสิทธิ์ในการใช้ภาพ), Search ข้ามโปรเจกต์/ทีมขั้นสูง
- Looksheet Prompt ยังต้องใช้ Reference Image ที่ผู้ใช้ส่งให้โมเดลภายนอก และไม่รับประกันเหมือนกันทุก Panel; deterministic Layout Renderer เป็น Phase 2 ตามข้อ 7

### 15.8 Acceptance Tests เพิ่มเติม

- **AT-H01:** เปลี่ยน Slider 20 ครั้งแต่ยังไม่กด Generate → History ไม่เพิ่ม
- **AT-H02:** กด Generate สองครั้ง → มี 2 Generation Events พร้อม Time/Seed/Prompt Snapshots ที่แยกกัน
- **AT-H03:** DNA เหมือนเดิมแต่เปลี่ยนเสื้อผ้า → Fingerprint เดิมและแจ้ง Exact Match
- **AT-H04:** History Search/Filter/Sort คืนข้อมูลที่ถูกต้องและ Load Draft ได้ โดยไม่แก้ Entry เดิม
- **AT-H05:** Save Library แล้ว Reload Page ข้อมูลยังอยู่; Delete ต้อง Confirm
- **AT-H06:** Similarity Score และ Top Matching Character ตรงกันทุกครั้งสำหรับ Dataset/Version เดิม
- **AT-H07:** Novelty-aware Random ไม่เปลี่ยน Field ที่ Lock แม้หา Candidate ใหม่ไม่สำเร็จ
- **AT-H08:** Export/Import ข้อมูลชุดเดิมซ้ำสองรอบ ไม่สร้างรายการ Duplicate โดยไม่ตั้งใจ
- **AT-H09:** Prompt ของ Character ที่ Saved เป็นไทย และ Looksheet ทุกคนใช้ Layout `LS-STD-9x16-V1`
- **AT-H10:** เมื่อล้างข้อมูลเว็บ/พื้นที่ไม่เพียงพอ UI มีคำเตือนและเสนอ Export Backup หรือ Cleanup

### 15.9 Reference เพิ่มเติม

- MDN — IndexedDB: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- MDN — Storage quotas and eviction: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
- MDN — Web Crypto / random UUID: https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID


## 16. Clarification CR-002 — Attribute Group vs Attribute (v1.2)

- ตารางข้อ 4.1 เป็นแหล่งอ้างอิงหลักสำหรับ **13 Facial DNA Groups** และจำนวนดังกล่าวเป็นข้อกำหนดของ MVP
- **Attribute** หมายถึงฟิลด์ย่อยที่กำหนดค่าผ่าน Select/Slider/Multi-select ได้ โดยแต่ละฟิลด์มี `attributeId` ไม่ซ้ำกัน; ตัวเลือกหนึ่งค่าภายใน Select ไม่ถือเป็น Attribute ใหม่
- **AC-01** ต้องตรวจจำนวนทั้งสองระดับ ได้แก่ Groups = 13 และ Configurable Attributes ≥ 15
- การเพิ่ม Attribute ย่อยในอนาคตทำได้ภายใต้ Versioned Schema; ถ้าเพิ่ม Group ใหม่ ต้องแก้ทั้งข้อ 4.1 และ AC-01 พร้อมกัน
- การสร้าง Prompt ภาษาไทยต้องนำค่าที่ผู้ใช้เลือกเข้าสู่ Prompt Mapping จริง ไม่ใช่เพียงแสดงตัวเลือกในหน้าเว็บ
