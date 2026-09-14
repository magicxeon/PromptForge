# Tracked File Retirement Audit

**วันที่สำรวจ:** 2026-09-14  
**สถานะ:** รายการรอตรวจและอนุมัติ; ยังไม่ลบหรือ untrack ไฟล์ใด  
**เจ้าของการตรวจ:** QA/Release; เจ้าของ Core, Web และ migration ต้องยืนยันก่อนลบส่วนที่เกี่ยวข้อง

## ขอบเขตและวิธีนับ

- ฐานก่อนสร้างรายงานนี้คือ `git ls-files` = **3,837 ไฟล์** (ไฟล์ที่ Git track; ไม่รวม `.git/`, ไฟล์ local ที่ไม่ track และ cache/outputs ที่ถูก ignore อยู่แล้ว)
- ในฐานนี้ `node_modules/**` ถูก track **964 ไฟล์** จึงเหลือไฟล์ที่ project เป็นเจ้าของ **2,873 ไฟล์** ตัวเลขเปอร์เซ็นต์หลักด้านล่างใช้ฐาน 3,837 เดียวกันทั้งหมด
- ตรวจ `.gitignore`, package scripts, Core static routes, React entry point, legacy cutover requirement, test/script references และขนาด/เนื้อหาไฟล์ที่น่าสงสัย การไม่พบ static import เพียงอย่างเดียว **ไม่ถือว่าใช้ลบได้** เพราะยังมี dynamic paths, manual scripts และ migration tests
- คำว่า "ลดไฟล์" สำหรับ dependency/build หมายถึง **นำออกจาก Git index หลังพิสูจน์การสร้างใหม่** ไม่ใช่ลบ dependency จากเครื่องที่กำลังรันงาน

## A. ไฟล์ตกค้างที่ไม่ใช่ runtime (16 ไฟล์)

| ไฟล์ | จำนวน | หลักฐาน/สิ่งที่ต้องตรวจอีกครั้ง |
|---|---:|---|
| `keeps`, `maps`, `model-prompt-forge@1.0.0`, `rejects`, `renders`, `resolves`, `selects`, `shows`, `tsc`, `uses` | 10 | ไฟล์ว่าง 0 byte ที่ project root; ไม่ใช่ entry point ใน `package.json` |
| `npm`, `vitest` | 2 | เป็นข้อความ error `Start-Process` จาก path เครื่องเดิม ไม่ใช่ executable หรือ source |
| `client/app.js.bak`, `client/index.html.bak`, `client/style.css.bak` | 3 | backup เก่าที่ `.gitignore` ตั้งใจ ignore; ตรวจว่าต้องเก็บ snapshot ประวัตินอก Git ปัจจุบันหรือไม่ก่อนลบ |
| `web/test-results/.last-run.json` | 1 | Playwright-generated status; `.gitignore` ignore ทั้ง `web/test-results/` |

**ผลที่คาดหลังเจ้าของยืนยัน:** 3,837 -> **3,821 ไฟล์**, ลด **16 ไฟล์ (0.42%)**; ถ้าไม่นับ `node_modules` เป็น project source เท่ากับ **0.56%** ของ 2,873 ไฟล์

## B. เครื่องมือชั่วคราวที่ต้องถามเจ้าของ (1 ไฟล์)

| ไฟล์ | เหตุผลที่เป็น candidate | Gate |
|---|---|---|
| `backup.js` | one-off script สร้าง `.bak` ให้ Vanilla client; ไม่อยู่ใน package scripts และไม่พบ caller ใน source/test ที่ค้น | ยืนยันว่าไม่มีขั้นตอน manual/rollback ที่ยังต้องใช้ ก่อนลบพร้อม `.bak` |

## C. ไฟล์ที่ควรเลิก track หลังพิสูจน์ build/install (977 ไฟล์)

| Path scope | จำนวน | เหตุผลและ gate |
|---|---:|---|
| `node_modules/**` | 964 | dependency ใช้งานจริง แต่ `.gitignore` ระบุไม่ให้ track; ตรวจ `npm ci` จาก clean checkout, lockfile/workspace, model/native binaries และ deployment ก่อนใช้ `git rm --cached` ในรอบแยก ห้ามลบจากเครื่องที่รันอยู่ |
| `web/dist/index.html` | 1 | Vite build output ที่ Core เสิร์ฟอยู่; ต้องพิสูจน์ `npm run build:web` และวิธี package/deploy ก่อน untrack |
| `web/dist/react-assets/*.woff`, `web/dist/react-assets/*.woff2` | 12 | hashed font build outputs ที่ถูก track; เช็กว่า build ใหม่สร้าง asset ครบและ URL โหลดได้ก่อน untrack |

`git ls-files -ci --exclude-standard` ให้ผลรวม **981 ไฟล์**: กลุ่ม C 977 + `.bak` 3 + `.last-run.json` 1. เป็นสัญญาณใน Git ไม่ใช่หลักฐานว่าลบ runtime ได้ทันที สามารถเรียกรายชื่อทั้ง 964 dependency และ 13 build files ได้ด้วย `git ls-files node_modules web/dist` โดยไม่ต้องคัดลอกรายชื่อ dependency ที่เปลี่ยนตาม lockfile ลงในเอกสารนี้

## D. Vanilla client ที่เลิกเสิร์ฟแล้ว แต่ยังมี migration gate (108 ไฟล์)

| Path scope | จำนวน |
|---|---:|
| `client/app.js`, `client/app-dialog.js`, `client/comparison.js`, `client/index.html`, `client/style.css` | 5 |
| `client/admin/**` | 2 |
| `client/character-profiles/**` | 12 |
| `client/clothing/**` | 4 |
| `client/community/**` | 30 |
| `client/comparisons/**` | 6 |
| `client/core/**` | 14 |
| `client/credits/**` | 3 |
| `client/generation-controls/**` | 5 |
| `client/playground/**` | 3 |
| `client/prompt-composer/**` | 3 |
| `client/scene-builder/**` | 13 |
| `client/shell/**` | 7 |
| `client/visual-controls/**` | 1 |

React `web/` เป็น browser runtime เดียว และ Core เสิร์ฟจาก `client/` เฉพาะ assets/i18n/outputs; `web/e2e/react-routes.spec.ts` ยืนยันว่า `/app.js` และ `/style.css` ตอบ 404 อย่างไรก็ดี `test/` และ `scripts/` ยังอ้างอิงโมดูล Vanilla บางตัว เช่น `test/navigationRegistry.test.js`, `test/i18nService.test.js`, `scripts/test-user-profile.bat` จึง **ยังไม่พร้อมลบ** ต้องผ่าน `requirements/009-migration-to-react/012-quality-security-performance-cutover-and-legacy-decommission.md` ข้อ parity, observation/rollback และย้าย/เกษียณ tests ก่อน

**ห้ามรวม** `client/assets/**`, `client/i18n/**`, `client/outputs/**`, `client/README.md` หรือ server contracts ในกลุ่ม D: ยังมีเจ้าของและการอ้างอิงแยกกัน

## ผลรวมแบบมีเงื่อนไข

| ระดับ | จำนวนสะสมที่ลดได้ | คงเหลือจาก 3,837 | ลดจากเดิม |
|---|---:|---:|---:|
| A หลังยืนยันไฟล์ตกค้าง | **16** | **3,821** | **0.42%** |
| A+B+C หลังยืนยัน manual utility และ clean build/install | **994** | **2,843** | **25.91%** |
| A+B+C+D หลังปิด legacy decommission gate | **1,102** | **2,735** | **28.72%** |

ตัวเลข 25.91% และ 28.72% ส่วนใหญ่เกิดจาก dependency ที่ถูก Git track ผิดนโยบาย ไม่ใช่ source ที่ไม่ทำงาน หากดูเฉพาะ 2,873 ไฟล์ที่ไม่ใช่ `node_modules` เพดาน A+B+build+legacy คือ 138 ไฟล์ หรือ **4.80%** และยังไม่ใช่สิทธิ์ให้ลบก่อนผ่าน gate

## ลำดับตรวจ/ลบในรอบถัดไป

1. ขอเจ้าของยืนยัน A/B และความจำเป็นของ backup จากนั้นลบใน commit แยกที่ตรวจ diff ได้
2. ทดลอง clean checkout แล้วรัน install/build/test แบบไม่ใช้ข้อมูลลูกค้าหรือ provider แบบเสียเงิน ก่อน untrack `node_modules` และ `web/dist`; ตรวจ deployment และ Core serving หลัง build
3. ปิด migration gate 012 ทีละ feature/test แล้วจึงลบกลุ่ม D พร้อมอัปเดตสคริปต์, เอกสาร, import และ regression tests

การสำรวจรอบนี้เป็น read-only ต่อไฟล์ candidate; ไม่ได้รัน full application/test suite, พิสูจน์ clean checkout หรือวิเคราะห์ dynamic import/asset reference ทุกตัว จึงไม่อ้างว่าพบไฟล์ที่ไม่ใช้ครบทั้ง repo หรือว่ากลุ่ม B-D ลบได้ทันที
