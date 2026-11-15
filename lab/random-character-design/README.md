# Character DNA Studio

เครื่องมือ HTML/CSS/Vanilla JavaScript แยกสำหรับออกแบบ DNA ตัวละครสมมติและ
สร้าง Prompt ภาษาไทย ไม่มี Login ไม่มีการเรียก AI และไม่ใช้ Credits

## เปิดใช้

ดับเบิลคลิก `start-tool.bat` (ต้องมี Node.js) หรือรัน:

```sh
node lab/random-character-design/serve.mjs
```

เปิด `http://127.0.0.1:8767` และเปิดหน้าต่าง server ค้างไว้ ไม่ต้อง npm install
หรือ build หลีกเลี่ยงเปิดผ่าน file:// เพราะ ES modules และ IndexedDB
ข้อมูลแยกตาม browser/profile/origin ใช้ URL และ port เดิมเสมอ

## ขั้นตอน

1. ตั้ง Profile / ประเภทตัวละคร / Archetype และปรับ DNA ทั้ง13กลุ่ม เลือก Advanced เพื่อดูทุกฟิลด์
   ประเภทตัวละครแยกจากอาชีพ เช่น ตัวร้ายอาชีพผู้บริหาร หรือพระรองอาชีพแพทย์
   มี20ตัวเลือก รวม Auto, พระเอก/นางเอก/พระรอง/นางรอง, ตัวร้าย/นางร้าย/ลูกน้อง,
   ตัวอิจฉา, สมทบ, ตัวตลก, เพื่อน, ผู้ชี้แนะ, ผู้ปกครอง, คนใช้, พนักงาน,
   ผู้บริหาร, นักสืบ, แพทย์ และตัวประกอบ การเลือกบทไม่เปลี่ยนเพศ/อายุ/อาชีพเอง
   ปุ่ม `สุ่มชื่อสากล` เลือกชื่อ–นามสกุลตาม Male/Female/Unisex (Custom)
   ล็อกชื่อเพื่อเก็บชื่อเดิม หรือปิดสุ่มชื่ออัตโนมัติได้ Selective/รายฟิลด์ไม่เปลี่ยนชื่อ
2. ล็อกค่าที่ต้องการคงไว้ แล้วสุ่มทั้งหมด/ตาม archetype/กลุ่มที่เลือก/รายฟิลด์
   `Trending Random` เปิดเป็นค่าเริ่มต้น คัดโครงหน้าทั้งชุดให้เป็นตัวเอก:
   ชายมีหล่ออบอุ่น/หล่อคม หญิงมีหวานละมุน/สวยคมสง่า Custom สุ่มจากทั้ง4แนว
   สุ่มตา คิ้ว จมูก กรามและคางจากชุดที่เข้ากัน ลดสัดส่วนสุดขั้ว พร้อมทิศทางแคสติ้งใน Prompt
   และสุ่มสีผิวเฉพาะอ่อน–กลาง ปิด checkbox เพื่อสุ่มตัวเลือกเดิมทั้งหมด
   ค่าที่ล็อกหรืออยู่นอกกลุ่มที่เลือกจะคงเดิม รวมถึงสีผิวที่อยู่นอก preset
   มี85 Attributes:40 DNA ถาวร +45 รูปลักษณ์/บุคลิก/การแสดง
   ใหม่25ค่าอยู่ในหมวดบุคลิกและเส้นเรื่อง, น้ำเสียง, รายละเอียดลุคและภาษากาย
   Trending ใช้พูลเฉพาะบท เช่น แพทย์มีหูฟังแพทย์/แฟ้ม คนใช้มีถาด/ผ้ากันเปื้อน
   ตัวร้ายใช้สายตาและการแสดงที่ควบคุม โดยไม่บังคับให้หน้าตาไม่ดี
3. เลือก Hero, Looksheet หรือ Scene แล้วกด Generate Prompt เพื่อบันทึก History
4. Copy/ดาวน์โหลด TXT ไปใช้กับเครื่องมือสร้างภาพของคุณ
5. Save Character เมื่อต้องการเก็บใน Library แนบภาพอ้างอิงได้
6. Export Backup เป็น JSON หรือ ZIP รวมภาพ และเก็บไว้ต่างหากเป็นระยะ

การเลื่อน Slider ไม่เพิ่ม History; Preview เป็นข้อความร่างและ wireframe เท่านั้น
Similarity เทียบ Attributes ไม่ใช่ภาพหรือใบหน้าจริง Seed รับประกันเฉพาะข้อมูล
ไม่รับประกันภาพจากโมเดลภายนอก Replay ใช้ baseline/locks/candidate ที่บันทึกไว้
การสุ่มใหม่ใช้ Seed ต่อเนื่องจากปุ่มสุ่ม; ป้อน Seed แล้ว Replay เพื่อเริ่มซ้ำเองได้

น้ำหนัก Trending อยู่ใน `js/trending.js`: `LEADING_COMMON` เป็นค่าร่วมและ
`LEADING_RECIPES` เป็นชุดโครงหน้า4แนว Guided จะเพิ่มน้ำหนักแนวที่ตรง Archetype
ปรับค่าได้โดยออกเวอร์ชันใหม่และเก็บชุดเดิมไว้สำหรับ Replay ห้ามแก้ historical pools
ผลสุ่มเก่าทั้งก่อน Trending และ `contemporary-2026-11-v1` ยัง Replay ได้แบบเดิม
พรีเซ็ตใหม่คือ `leading-2026-11-v2` ดู requirement CR-004 (2026-11-09)
ประเภทตัวละคร ชื่อสากล และพูล25ค่าใหม่อยู่ใน `js/casting.js`
(`CASTING_ROLES`, `EXTENDED_POOLS`, `GIVEN_NAMES`, `SURNAMES`)
สูตรสุ่มใหม่ `mulberry32-v3` / `dramatic-casting-v1` แยกสตรีมชื่อจาก DNA
เก็บสูตรรุ่นเก่าไว้สำหรับ Replay ข้อมูลเก่าที่ไม่มีฟิลด์ใหม่ยังนำเข้าได้
ค่าเริ่มต้นจะถูกเติมเฉพาะร่างที่เปิดแก้ไข ไม่เขียนทับ History หรือ Library
Replay เคารพชื่อที่แก้ด้วยมือ/Save As New; สุ่มชื่อซ้ำจาก Seed ผ่านการสุ่มใหม่
น้ำเสียงเป็นบันทึกกำกับการแสดงใน Prompt ไม่เรียก TTS หรือสร้างเสียง
ดู requirement CR-005 (2026-11-09)
น้ำหนักเป็นการคัดลุคเชิงสร้างสรรค์ ไม่ใช่สถิติความงามหรือการจัดอันดับบุคคล

Library ทุก Save ทับเก็บเวอร์ชันก่อนหน้า โหลดประวัติ/เวอร์ชันไม่แก้ต้นฉบับ
Import มี Preview และเลือก skip / merge by ID / create new copy ก่อนยืนยัน
การ Import ไฟล์เดิมซ้ำไม่เพิ่มข้อมูลในโหมด skip/merge; create new copy เป็นการตั้งใจ
สร้างสำเนาพร้อม remap IDs และความสัมพันธ์

## ข้อมูลและข้อจำกัด

IndexedDB: `character-dna-studio-v1`, stores characters, generations, presets,
images, settings. ข้อมูลไม่ Sync กับ Momelo หรือ browser อื่น ล้าง Site Data
หรือใช้ Private Browsing อาจทำให้ข้อมูลหาย มีตัวตรวจ quota และสำรองก่อน cleanup
รูป JPEG/PNG/WebP ไม่เกิน5MB/รูป; backup ไม่เกิน100MB; ไม่รับ SVG/HTML
ขีดจำกัด1000 History,500 Characters,100 Presets,200 Images; ไม่ลบอัตโนมัติ
Prompt-only Looksheet มี18ภาพย่อยและไม่รับประกัน layout/ตัวอักษรจาก AI

ค่าความคล้าย: geometryรวมสัดส่วน/หู20%,eyes20%,brows10%,nose15%,
jaw/chin/cheeks15%,lips10%,skin/marks10%. Exact เทียบ canonical DNA โดยตรง
การแสดงคะแนนที่ปัดเป็น100ไม่ทำให้ถูกจัดเป็น Exact หาก canonical ต่างกัน
ไม่มี network dependency; JSZip และ license อยู่ใน vendor/

## ตรวจสอบ

```sh
node --test lab/random-character-design/core.test.mjs
node lab/random-character-design/browser.test.mjs
```

Browser test ใช้ Playwright ที่ติดตั้งใน repository และข้อมูลใน browser context
แยก ไม่แก้ข้อมูลใช้งานจริงและไม่เรียก AI
