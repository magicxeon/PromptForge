# 21. History Performance, Pagination, Thumbnails and Lazy Preview

**ID:** `021-history-performance-pagination-thumbnails-and-lazy-preview`  
**Application:** `ModelPromptForge`  
**Status:** Implemented - pending runtime verification  
**Feature type:** Shared history infrastructure and performance  
**Applies to:** Generation History, Collection image lists, Comparison History/Dashboard  
**Depends on:** Queue and History persistence, Collections, Requirement 020 - AI Model Comparison Workspace  
**Created:** 2026-07-14  
**Implementation authorization:** Approved 2026-07-14

## 1. Objective

ปรับระบบ History ทั้งภาพปกติและ Comparison ให้รองรับข้อมูลจำนวนมากโดยไม่โหลด metadata และภาพ full-resolution ทั้งหมดในครั้งเดียว พร้อมสร้าง thumbnail แยกเมื่อ generation สำเร็จ และแสดง preview แบบ lazy loading ที่มี loading state และ fade-in ตาม theme เดิม

Requirement นี้เป็น shared infrastructure ห้ามแก้เฉพาะหน้าใดหน้าหนึ่งจนมี pagination หรือ thumbnail contract คนละแบบ

## 2. Product Decisions

- original image ยังคงเป็นไฟล์หลักสำหรับ Workspace, Lightbox และ Download
- list/grid ทุกประเภทใช้ thumbnail ไม่ใช้ original image
- server เป็นผู้ทำ pagination, filtering และ ordering; client ห้ามโหลดทั้งหมดแล้วค่อยแบ่งหน้าเอง
- MVP ใช้ cursor pagination เพื่อไม่ให้รายการเลื่อนหรือซ้ำเมื่อมีงานใหม่แทรกเข้ามา
- เริ่มโหลดครั้งละ 24 records และ server จำกัดสูงสุด 50 records ต่อ request
- Comparison card แสดง preview สูงสุด 3 thumbnails; ภาพที่เหลือใช้ `+N`
- lazy loading ต้องมี loading icon/skeleton และ fade ภาพขึ้นหลัง decode สำเร็จ
- JSON persistence ยังรองรับได้ในระยะปัจจุบัน แต่ API และ repository contract ต้องพร้อมย้าย Database

## 3. Scope

### 3.1 Included

- paginated Generation History
- paginated Comparison Set summaries
- thumbnail generation หลังบันทึก original สำเร็จ
- thumbnail metadata และ fallback สำหรับข้อมูลเก่า
- lazy preview, loading state, fade-in และ image error state
- จำกัดจำนวน records/images ที่อยู่ใน DOM
- Collection view ใช้ history pagination/thumbnail contract เดียวกัน
- cleanup thumbnail เมื่อ original History ถูกลบ

### 3.2 Out of Scope

- search UX และ Comparison Dashboard layout ซึ่งอยู่ใน Requirement 022
- CDN หรือ cloud object storage
- AI crop หรือ face-aware thumbnail
- re-encode original image
- video thumbnails
- analytics dashboard

## 4. API Contracts

### 4.1 Generation History

```text
GET /api/history?cursor={opaque}&limit=24&collectionId={optional}
```

Response:

```json
{
  "items": [
    {
      "id": "job_xxx",
      "thumbnailUrl": "/outputs/thumbnails/job_xxx.webp",
      "imageUrl": "/outputs/job_xxx.png",
      "width": 1024,
      "height": 1365,
      "provider": "openai",
      "submodel": "model-id",
      "timestamp": 0,
      "comparisonSetId": null
    }
  ],
  "nextCursor": "opaque-or-null",
  "hasMore": true
}
```

### 4.2 Comparison Summaries

```text
GET /api/comparisons?cursor={opaque}&limit=24&search={optional}&status={optional}&dateRange={optional}
```

List response ต้องเป็น summary เท่านั้น:

```json
{
  "items": [
    {
      "id": "cmp_set_xxx",
      "name": "Fashion comparison",
      "status": "completed",
      "completedCount": 3,
      "slotCount": 3,
      "providers": ["openai", "gemini"],
      "models": ["model-a", "model-b"],
      "previewImages": [
        { "jobId": "job_xxx", "thumbnailUrl": "/outputs/thumbnails/job_xxx.webp" }
      ],
      "updatedAt": 0
    }
  ],
  "nextCursor": "opaque-or-null",
  "hasMore": true
}
```

List API ห้ามส่ง full prompt, configuration snapshot, reference base64, technical provider response หรือ Runs ทั้งหมด ข้อมูลเต็มโหลดจาก `GET /api/comparisons/:setId` เมื่อเปิด Workspace เท่านั้น

### 4.3 Cursor Rules

- cursor เป็น opaque value ที่ client ห้ามแก้หรือสร้างเอง
- ordering เริ่มต้นคือ `updatedAt DESC, id DESC`
- query parameters ทั้งหมดยกเว้น cursor ต้องเป็นส่วนหนึ่งของ cursor validation
- invalid/expired cursor คืน structured `400` และ client reset ไปหน้าแรกได้
- response คืนเฉพาะ records ของ owner ปัจจุบันเมื่อระบบ user พร้อมใช้งาน

## 5. Thumbnail Pipeline

### 5.1 Generation

หลัง Queue บันทึก original image สำเร็จ:

1. อ่าน dimensions และ MIME ของ original
2. สร้าง thumbnail โดยรักษา aspect ratio และไม่ stretch
3. จำกัดด้านยาวประมาณ 640 px เพื่อรองรับจอความละเอียดสูง
4. บันทึกเป็น WebP quality ที่เหมาะกับ preview; หาก runtime encoder ไม่รองรับให้ใช้ JPEG/PNG fallback
5. บันทึก `thumbnailUrl`, thumbnail MIME, dimensions และ byte size ใน History metadata
6. generation job ถือว่าสำเร็จได้แม้ thumbnail ล้มเหลว แต่ต้อง log warning และให้ UI fallback ได้

เส้นทางแนะนำ:

```text
client/outputs/job_xxx.png
client/outputs/thumbnails/job_xxx.webp
```

### 5.2 Existing Images

- History เก่าที่ไม่มี `thumbnailUrl` ต้องยังแสดงได้
- fallback แรกใช้ original image แบบ lazy loading
- ต้องมี migration script สำหรับสร้าง thumbnail และเติม metadata ของ History เก่าเป็น batch
- migration ต้อง idempotent, จำกัด concurrency และข้ามไฟล์ที่ migrate สมบูรณ์แล้ว
- ห้ามสร้าง thumbnails ทั้งคลัง synchronously ตอน server startup

### 5.3 Required Legacy Migration Script

เพิ่ม script แนะนำที่:

```text
scripts/migrate-history-thumbnails.js
```

คำสั่งที่ต้องรองรับ:

```text
node scripts/migrate-history-thumbnails.js --dry-run
node scripts/migrate-history-thumbnails.js --apply --concurrency=2
node scripts/migrate-history-thumbnails.js --apply --resume --concurrency=2
```

หน้าที่ของ script:

1. อ่าน `server/history.json` ผ่าน migration repository/adapter ไม่ duplicate thumbnail logic
2. ตรวจ original file, MIME และ dimensions ของแต่ละ History item
3. สร้าง thumbnail ผ่าน `ThumbnailService` ตัวเดียวกับ generation flow ใหม่
4. เติม `thumbnailUrl`, thumbnail MIME, original/thumbnail dimensions และ byte size
5. เขียน History metadata แบบ serialized/atomic หลัง batch หรือ checkpoint
6. ไม่แก้ไข, re-encode, rename หรือลบ original image
7. ไม่เปลี่ยน Job ID, Comparison lineage, Collection membership หรือ timestamps เดิม
8. สรุปจำนวน scanned, migrated, skipped, missing original, failed และ elapsed time

ข้อกำหนดด้านความปลอดภัย:

- `--dry-run` เป็น default หากไม่ส่ง `--apply` และห้ามเขียนไฟล์ใด ๆ
- ก่อน `--apply` ต้องสร้าง backup ของ History metadata พร้อม timestamp
- backup ต้องอยู่ใน directory ที่ระบุชัดและไม่ถูกอ่านเป็น production History
- ใช้ temporary file + atomic rename เมื่อ update `history.json`
- ใช้ checkpoint เพื่อ resume หลัง process ถูกหยุด โดยไม่เริ่มใหม่ทั้งหมด
- `--resume` ต้องตรวจว่า checkpoint ตรงกับ source History/version ปัจจุบัน
- จำกัด concurrency ค่าเริ่มต้นต่ำ เช่น 2 เพื่อไม่แย่ง CPU/memory กับ generation queue
- รองรับ graceful shutdown เมื่อ `Ctrl+C`: หยุดรับรายการใหม่, รองานที่กำลังทำ และบันทึก checkpoint
- original หายหรือเสียให้บันทึกใน report และทำรายการอื่นต่อ ห้ามสร้างไฟล์ placeholder แทน
- thumbnail ที่มีอยู่แต่ metadata ไม่ครบให้ตรวจไฟล์และซ่อม metadata โดยไม่ encode ซ้ำเมื่อปลอดภัย
- thumbnail file ที่สร้างสำเร็จแต่ metadata update ล้มเหลวต้องถูกตรวจพบและ reuse ได้เมื่อ resume
- script ต้องไม่ทำงานพร้อม production mutation โดยไม่มี migration lock

Output/report แนะนำ:

```text
server/migrations/
  backups/history-{timestamp}.json
  checkpoints/history-thumbnails.json
  reports/history-thumbnails-{timestamp}.json
```

Comparison และ Collection compatibility:

- Comparison preview lookup ใช้ child `jobId` หา thumbnail จาก History จึงไม่ duplicate thumbnail metadata ลงทุก Set
- script ต้องตรวจ orphan Comparison job IDs และรายงาน แต่ห้ามลบหรือ rewrite Comparison Set อัตโนมัติ
- Collection ใช้ Job IDs เดิม จึงไม่ต้อง migrate membership

### 5.4 Cleanup

- ลบ History image ต้องลบ thumbnail ที่เกี่ยวข้องด้วย
- ไม่พบ thumbnail ระหว่าง cleanup ไม่ถือเป็น fatal error
- ลบ Comparison Set อย่างเดียวไม่ลบ original หรือ thumbnail ของ child History

## 6. Client Loading and Preview UX

แต่ละ preview มีสถานะ:

- `idle`: ยังอยู่นอก preload boundary
- `loading`: แสดง skeleton หรือ loading icon
- `loaded`: decode สำเร็จแล้ว fade-in ภาพ
- `error`: แสดง image placeholder และปุ่ม retry เฉพาะเมื่อมีประโยชน์

ข้อกำหนด:

- ใช้ `IntersectionObserver` เพื่อเริ่มโหลดเมื่อ card เข้าใกล้ viewport
- ใช้ `loading="lazy"` และ `decoding="async"` เป็น browser fallback
- เพิ่ม class `is-loaded` หลัง `HTMLImageElement.decode()` หรือ load event สำเร็จ
- fade-in ระยะสั้นและปิด animation เมื่อ `prefers-reduced-motion: reduce`
- กำหนด aspect ratio หรือ dimensions ล่วงหน้าเพื่อลด layout shift
- original image โหลดเมื่อเปิด Lightbox/Workspace เท่านั้น
- Comparison card โหลดไม่เกิน 3 thumbnails

## 7. DOM and Memory Boundaries

- initial render ไม่เกิน 24 History cards ต่อ section
- ใช้ `Load More` หรือ infinite loading ที่เห็นสถานะชัดเจน
- เมื่อจำนวน rendered cards เกินประมาณ 100 records ให้ใช้ windowing/virtualization หรือจำกัด retained pages ตามผลทดสอบจริง
- event listeners ต้องใช้ delegation หรือ cleanup เมื่อ card ถูกถอดออก
- revoke object URLs เมื่อไม่ใช้แล้ว
- เปลี่ยน filter/search ต้อง abort request เก่าและ reset cursor
- ห้าม preload original images ของ neighboring cards; Lightbox สามารถ preload original ได้เฉพาะภาพก่อนหน้า/ถัดไป

## 8. Repository and Migration Direction

เพิ่ม repository methods โดยไม่ผูก route กับ JSON:

```text
HistoryRepository.listPage(query)
HistoryRepository.getById(jobId)
ComparisonRepository.listPage(query)
ThumbnailService.createForHistoryItem(item)
ThumbnailService.removeForHistoryItem(item)
```

ระยะ JSON:

- สร้าง lightweight summary/index ใน memory ได้หลังอ่านไฟล์
- cache ต้อง invalidate หลัง mutation
- ห้ามส่ง JSON document ทั้งหมดออก client

ระยะ Database:

- index อย่างน้อยบน owner + timestamp/updatedAt
- cursor ใช้ indexed sort columns
- thumbnail metadata อยู่ใน Asset/History record และพร้อมย้าย object storage ตาม Phase2-06

## 9. Failure Handling

- thumbnail generation failure ห้ามทำให้ generation credit ถูก refund เพราะ original สำเร็จแล้ว
- list API failure แสดง retry state โดยไม่ล้าง cards ที่โหลดสำเร็จแล้ว
- thumbnail 404 fallback ไป original แบบ lazy เพียงครั้งเดียว
- original 404 แสดง unavailable placeholder และไม่ retry loop
- duplicate thumbnail generation ต้องให้ผลลัพธ์เดียวกันและไม่ทิ้ง temporary files

## 10. Implementation Steps

### Phase A: Contracts and Measurement

- [ ] วัดขนาด History/Comparison payload ปัจจุบันและจำนวน full images ที่ browser โหลด
- [x] เพิ่ม paginated repository contracts
- [x] กำหนด cursor encoding/validation
- [x] เพิ่ม tests สำหรับ stable ordering และ no-duplicate pagination

### Phase B: Thumbnail Infrastructure

- [x] เพิ่ม image encoder dependency/adapter ที่รองรับ runtime ปัจจุบัน
- [x] เพิ่ม Thumbnail Service และ output directory
- [x] เชื่อม Queue completion โดยไม่เปลี่ยน generation success contract
- [x] เพิ่ม thumbnail metadata และ cleanup
- [x] เพิ่ม required legacy migration script พร้อม dry-run/apply/resume
- [x] เพิ่ม backup, checkpoint, migration lock และ JSON report
- [x] reuse Thumbnail Service ระหว่าง Queue completion และ migration script

### Phase C: Client Loading

- [x] เปลี่ยน History และ Collection grids ให้ใช้ paginated endpoint
- [x] เพิ่ม IntersectionObserver, loading icon/skeleton และ fade-in
- [x] ใช้ thumbnail ใน list และ original ใน Lightbox
- [x] เพิ่ม Load More และ DOM retention boundary

### Phase D: Comparison Integration

- [x] เพิ่ม Comparison summary pagination
- [x] คืน preview สูงสุด 3 thumbnails ต่อ Set
- [ ] ใช้ contract นี้ใน Comparison Dashboard Requirement 022 (deferred to Requirement 022)

### Phase E: Verification

- [ ] unit tests สำหรับ thumbnail success/failure/cleanup
- [x] migration tests: dry-run ห้ามเขียนไฟล์, apply, resume และ idempotent rerun
- [ ] migration tests: missing/corrupt original, existing thumbnail และ interrupted metadata write
- [ ] fixture verification ว่า Job IDs, timestamps, Comparison lineage และ Collection membership ไม่เปลี่ยน
- [x] pagination concurrency and cursor tests
- [ ] browser test รูปเสีย, thumbnail หาย และ fallback
- [ ] browser performance test ที่ 100, 500 และ 1,000 History records
- [ ] mobile memory/network verification

## 11. Acceptance Criteria

1. History และ Comparison list ไม่โหลด records ทั้งหมดใน request เดียว
2. original generation image มี thumbnail แยกเมื่อ encoder ทำงานสำเร็จ
3. list/grid ใช้ thumbnail และไม่ request original ก่อนเปิด Lightbox/Workspace ยกเว้น fallback ของข้อมูลเก่า
4. preview แสดง loading state และ fade-in หลังภาพพร้อม
5. Comparison card โหลด preview ไม่เกิน 3 ภาพและแสดง `+N` สำหรับภาพที่เหลือ
6. เปลี่ยน filter/search แล้ว request เก่าถูกยกเลิกและ cursor reset
7. History เก่าที่ไม่มี thumbnail ยังแสดงได้
8. thumbnail failure ไม่ทำให้ generation job ล้มเหลวหรือหัก/refund เครดิตผิด
9. ลบ History แล้ว thumbnail ถูก cleanup
10. การโหลด 1,000 records ไม่สร้าง 1,000 cards หรือ request full-resolution 1,000 ภาพพร้อมกัน
11. มี migration script สำหรับ History เก่าที่รองรับ dry-run, apply และ resume
12. migration สร้าง backup/checkpoint/report และ update History แบบ atomic
13. รัน migration ซ้ำแล้วไม่ encode thumbnail ที่สมบูรณ์หรือทำ metadata ซ้ำ
14. migration ไม่เปลี่ยน original images, Job IDs, timestamps, Comparison lineage หรือ Collection membership
15. missing/corrupt original ถูก report โดยไม่หยุด migration ทั้ง batch
