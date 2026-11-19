# VS-04 — Data และวงจรชีวิต

Parent: [Basic release](000-master.md). Storage contracts source implemented.
Files are created on first valid mutation beneath paths.js-selected roots; no live data
was provisioned or migrated for the isolated checks.

## 1. แยกข้อมูลตามหน้าที่

ทุก record มี schemaVersion, id, ownerUserId และ timestamps; entity ที่แก้ไขได้มี revision
owner มาจาก server actorContext. Repository เป็นจุดเดียวที่อ่าน/เขียนไฟล์ของ capability

| Entity | Fields สำคัญ | Owner / proposed storage |
|---|---|---|
| Document | title, modelId, language, revision, archivedAt, ordered rows | Voice Studio: `server/data/voice-studio/documents.json` |
| Dialogue row | id, enabled, characterPresetId, text, delivery, selectedTakeId | nested ใน Document เพื่อ update/reorder แบบ atomic |
| Character voice preset | name, color, voiceId, compatible model, revision, archivedAt | Voice Studio: `server/data/voice-studio/characters.json` |
| Take | documentId, rowId, jobId, outputAssetId, immutable inputSnapshot, savedAt, displayTitle, tags, metadataRevision | Voice Studio: `server/data/voice-studio/takes.json` |
| Generation job / provider usage | operation, frozen request, attempt, status, usage, sanitized failure | Generation repository เดิม ขยาย audio contract |
| Audio Asset metadata | owner, MIME, byteSize, durationMs, sampleRate, channels, checksum, storage key | Assets repository เดิม; ไม่ทำ assets.json อีกชุด |
| Audio bytes | validated complete WAV | `OUTPUTS_DIR/voice-studio/<opaque-asset-id>.wav` ผ่าน paths.js/Assets |
| Quote / financial records | quote snapshot, reservation/capture/refund/usage evidence | Credits owner เดิมเท่านั้น |
| Operational error | jobId, code, correlationId, safe provider diagnostics | existing diagnostics/log owner ไม่เก็บลง audio library |

Paths ข้างต้นเป็น logical default. `paths.js` ต้อง resolve data/output roots ที่ระบบเลือก
รวม qualified local fixture environment; ห้าม hard-code `D:` หรือ directory จริงใน domain
ไฟล์ generated ไม่อยู่ใน config/source หรือ Git. ไม่เก็บ Base64 ใน JSON/localStorage

## 2. Snapshot และความสัมพันธ์

Take inputSnapshot เก็บ text, delivery, character label, voiceId, model/provider,
document/row/character revision, catalogVersion, compilerVersion, requestHash และ
generation operation ID. Provider usage/credit ledger เก็บที่ owner แล้วอ้าง ID ไม่ copy ledger
Snapshot เป็น private user data สำหรับการทำซ้ำ ไม่ log raw transcript ลง operational logs

Take เป็น immutable evidence; เปลี่ยนเพียง library metadata เช่น savedAt/title ได้ด้วย
versioned command. `selectedTakeId` เป็น pointer ใน row และต้องอ้าง Take ของ actor/row นี้
การแก้บทหรือชื่อ/เสียง preset ไม่ rewrite snapshot ของ Take ที่เกิดแล้ว
Library เป็น filtered read model ของ successful Takes โดยเลือก saved/all ได้
ไม่เป็นไฟล์ข้อมูลซ้ำอีกชุด. displayTitle/tags เป็นข้อมูลจัดการของ Take ไม่เปลี่ยน
ชื่อไฟล์ physical, checksum, snapshot หรือชื่อ character เดิมในหลักฐานการสร้าง
Voice Manager และ Creator อ่านข้อมูลชุดเดียวกัน; แก้ metadata แล้ว invalidation ตรง owner

## 3. Persistence และความพร้อมใช้งาน

- Document autosave ใช้ expectedRevision + atomic JSON mutation; outdated request ตอบ 409
- Autosave debounce ตาม policy; flush ก่อน Generate และรับ server revision ก่อน freeze input
- ระหว่าง save fail เก็บ draft ใน memory และเตือนก่อนออก; ไม่อ้างว่ารองรับ offline durable edit
- ผล generation ต้องผูก actor/document/row ณ ตอน submit ไม่ใช้ row ที่ UI กำลังเลือกภายหลัง
- Asset write จบก่อน terminal success; ใช้ temp file + owning atomic finalize
- Unique Take source = jobId + output index; event replay/restart ไม่สร้าง Take ซ้ำ
- Pin/save retry idempotent; ถ้า metadata write fail แต่ไฟล์มีแล้ว ให้ reconcile โดย asset ID
- list bounded/paginated; จำกัด rows, text, response bytes, files/actor และ disk quota
  ก่อนเรียก provider เพื่อไม่จ่ายเงินแล้วพบ storage เต็มที่ตรวจได้ล่วงหน้า

ไม่มี transaction ข้าม JSON หลาย capability โดยสมมุติเอง: ใช้ owner lifecycle +
idempotent reconciliation และบันทึกขั้นที่เสร็จแล้ว. ไม่สร้าง voice-specific financial journal

## 4. Retention, deletion และสิทธิ์

ข้อเสนอ Basic: successful Takes เก็บแบบ durable ทั้งที่เลือกและยังไม่เลือกจนผู้ใช้สั่งลบ
ภายใต้ storage quota; Save เป็นการจัดเข้าคลัง ไม่ใช่เปลี่ยน temporary URL ให้ durable
ค่าการเก็บ/พื้นที่และ backup ต้องยืนยันใน implementation plan ก่อนเปิดใช้จริง
ไม่ตั้ง TTL ให้เสียงหายเงียบๆ; ไม่เปลี่ยนนโยบายข้อมูลเดิมของ Assets

- Archive document ซ่อนจากรายการปกติแต่เปิดกลับได้; ไม่ cascade ลบ audio
- ลบ Take ต้องยืนยัน item ที่ลบ ตรวจ reference อีกครั้ง และใช้ Assets deletion contract
  หากเป็น selected Take ต้องเลือกใหม่หรือยกเลิก selection อย่างชัดเจนก่อน
  หากมี reference อื่นให้ปฏิเสธพร้อมเหตุผล; ไม่ลบ generation/financial audit evidence
  ถ้าลบไฟล์กับ metadata สำเร็จไม่พร้อมกัน ให้คงสถานะ reconciliation และไม่แสดงไฟล์
  ที่ลบแล้วเป็น playable; retry ใช้ ID เดิมผ่าน owner ไม่สร้าง deletion pipeline ซ้ำ
- Row ที่มี active job ไม่ให้ลบจน job terminal; ลบ row หลังจากนั้นไม่ลบ Take ที่ save ไว้
- Character preset ที่ถูกใช้ให้ archive; immutable snapshots และเสียงเก่ายังคงอ่านได้
- Local stored data/backup ต้องไม่เผยแพร่; account deletion/retention ใช้ policy owner เดิม
- GET/HEAD/Range/download recheck owner ผ่าน AssetDeliveryService; opaque ID ไม่แทน authorization
- เปลี่ยน actor/logout ให้หยุด audio, release object URLs และ clear actor-scoped client state
- Basic ไม่มี reference upload/voice cloning/consent-record collection เพราะไม่ใช่ขอบเขตนี้

## 5. Data acceptance

Reload คืนเอกสาร/เสียงที่บันทึกแล้วได้; actor A อ่าน/แก้/ดาวน์โหลดของ B ไม่ได้;
duplicate submit/save/event ไม่เพิ่มงาน/ไฟล์/ค่าใช้จ่ายซ้ำ; stale revision ไม่ overwrite;
failed job ไม่สร้าง playable Take แต่ตรวจ log ด้วย support ID ได้;
config/voice changes ไม่เปลี่ยนเสียงหรือ price snapshot เก่า; disk failure ไม่ทิ้ง success ปลอม

## 6. Revision 2 custom voice data (source implemented)

New logical store: `server/data/voice-studio/customVoices.json`, resolved through paths.js
and VoiceStudioRepository. Created on first valid design projection, not at bootstrap.
Implementation refinement: providerVoiceId/project credential fingerprint remain only in
the Generation operation; Voice Studio stores operationId. This avoids copying private
provider authority into a second repository or returning it to browsers. Existing character
voiceId stores the application ID with voiceKind=custom; missing voiceKind means prebuilt.
Character mutations emit schemaVersion 2; existing snapshots are not rewritten.

| Record | Required data / meaning |
|---|---|
| Custom voice | schemaVersion, application ID, ownerUserId, revision, name, displayDescription, immutable designPrompt, language, provider/model, operationId, previewAssetId, savedAt, archivedAt, expiresAt, timestamps; lifecycleState is derived for the response |
| Character binding | discriminated reference to prebuilt catalog ID or owned customVoiceId; character remains separate from voice identity |
| Design operation | Generation-owned durable design snapshot, request hash, provider outcome, private providerVoiceId/credential fingerprint, asset ID, error and settlement refs; reuse Generation operation storage |
| Design preview | private Assets-owned WAV plus metadata; distinct from dialogue Takes and hidden from audio library unless a dedicated supported flow saves it |

Existing string voiceId records resolve as prebuilt without rewriting old Takes. Introduce
a versioned binding schema and compatibility read path; Take snapshots record resolved
voice kind/identity/version at submission. Test old documents and missing/archived presets.

Lifecycle: creating → ready → archived / expired / delete_pending → deleted;
failed and reconciliation_required describe unsuccessful/unknown creation. savedAt marks
an explicitly saved ready candidate. Ready-but-unsaved candidates remain recoverable in a
bounded “ยังไม่บันทึก” list after closing the form/reload; count them toward quota, never
create invisible unlimited remote voices or auto-delete them on dialog close.

The provider may persist a voice as soon as design succeeds, before local Save. Tell users
this in concise form help; Save adds it to My Voices without another create. Keep private
design metadata and preview until explicit discard/delete or owning account-retention policy;
provider expiry still applies. Discard removes the unused remote candidate through the same
owned deletion flow; deletion failure remains retryable and visible. Keep minimal operational/
financial audit references without retaining raw samples/prompts in ordinary logs.

Archive prevents new selection but preserves existing bindings. Permanent deletion is
blocked while character/document bindings or active operations need the voice; return usable
references so the user can reassign/archive deliberately. Historical audio bytes and immutable
Take evidence survive deletion of a voice identity. Deleting a voice does not delete its
previously generated dialogue audio. No raw provider ID import or public sharing.
Replication is a planned addition in section 7, not implemented by Revision 2.

All CRUD, generation, preview GET/HEAD/Range and deletion recheck actor ownership. Project
voice quota applies across actors; admission needs a shared bound against concurrent creates.
Catalog reload, actor switch and logout must not leak private voice choices or preview URLs.

## 7. Revision 3 — Origin and reference audio lifecycle (planned)

Keep customVoices and speechOperations canonical; no new parallel voice database.
Version custom-voice metadata with `sourceType: text | audio`, source-language metadata
and nullable previewAssetId. Missing sourceType on existing custom voices resolves to
text; prebuilt stays its own voiceKind. A stored text voice cannot be patched into audio.
Character selection uses the same application customVoiceId. Take snapshots preserve
origin/version at generation time; changing voice metadata never relabels old Takes.

Private upload metadata records owner, purpose (source/consent), asset ID, MIME, decoded
duration, bytes, digest and expiry. Generation snapshot holds these immutable references,
consent locale/version and provider verification outcome. Raw clips do not enter custom
voice list DTOs, client persistence, ordinary logs or public generated-media listings.
Do not label a checkbox or local file upload as Google consent verification success.

Proposed retention for approval before implementation: temporary inputs only, delete after
terminal verification/creation or discard; abandoned uploads expire after configurable
24 hours. Accepted in-flight/uncertain operations retain required inputs only under a
bounded recovery policy; no silent permanent retention. Keep minimal outcome/digest/audit
metadata after byte deletion. Final retention and recovery bound remain open, not approved.
Private intake uses existing Assets ownership and paths.js; finalize exact temporary
location in the architecture map before creating files. No runtime path introduced now.

Stored provider profile and completed synthesized Takes have separate lifecycles. Existing
archive/in-use deletion rules apply to replicated voices; remote deletion failures remain
retryable with the same ID. Retain already-generated audio unless explicitly deleted.
Actor switch/logout clears transient files, preview URLs and pending recording resources.
