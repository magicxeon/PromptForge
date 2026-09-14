# Module Consolidation And Duplication Audit

**วันที่สำรวจ:** 2026-09-14  
**สถานะ:** แผนรอตรวจ; ยังไม่ย้าย รวม หรือลบ source file  
**เจ้าของหลัก:** QA/Release audit; Backend และ Web owner ตรวจ contract ก่อน implement  
**เอกสารก่อนหน้า:** [Tracked file retirement audit](unused-file-candidates-audit.md)

## เป้าหมายและขอบเขต

ลดไฟล์ที่ไม่มี caller และชั้น forwarding ที่ไม่เพิ่มกฎธุรกิจ โดยรักษา endpoint, UI, actor-scoped state, Credit, provider dispatch, generated media และ lazy route เหมือนเดิม ไม่รวมโมดูลต่าง capability เพียงเพราะชื่อคล้ายกันหรือไฟล์สั้น งานรอบนี้เป็น **audit/documentation เท่านั้น**; แยกการลบไฟล์ที่พิสูจน์ได้ออกจากการย้าย logic ซึ่งอาจลดจำนวนไฟล์แต่ไม่ได้ลด bytes จริง

ฐาน `git ls-files` ก่อนสร้างรายงาน = **3,837 ไฟล์**; หัก `node_modules/**` ที่ Git track 964 เหลือ first-party tracked **2,873 ไฟล์** ใน Core/Web/Post-Processing มี source `.js/.mjs/.ts/.tsx` **849 ไฟล์**. Static import/re-export graph จาก TypeScript parser รวม first-party scripts/tests พบ **9 ไฟล์ไม่มี static inbound import**: 4 ไฟล์เป็น entry point/setup/ambient type (`server/server.js`, `web/src/main.tsx`, `web/src/test/setup.ts`, `web/src/vite-env.d.ts`) ที่ต้องเก็บ; อีก 5 ไฟล์อยู่ในตาราง A. ใช้ `rg` ตรวจชื่อ symbol/path เพิ่ม แต่ static graph ไม่พิสูจน์ dynamic import, tooling, external consumer หรือ manual process ได้ทั้งหมด ไฟล์ Python ของ post-processing service ที่ยังไม่ track และงานที่เปลี่ยนระหว่างสำรวจไม่อยู่ในฐานนี้; ไม่จัดเป็นไฟล์ขยะและต้องสำรวจแยกเมื่อ implementation นิ่ง

## A. Orphan ที่ควรตรวจเพื่อลบ (4 + 1 ไฟล์)

| Candidate | เหตุผล/เจ้าของที่ควรเก็บ | การยืนยันก่อนถอด |
|---|---|---|
| `web/src/features/profiles/components/CharacterLookDraftDialog.tsx` | re-export ชื่อเก่าของ `CharacterLookDialog`; ไม่พบ caller | Profile dialog tests, typecheck และค้น path ที่ dynamic จาก Web |
| `web/src/components/templates/TemplateUseBanner.tsx` | UI ที่ไม่พบ importer; template surfaces ปัจจุบันใช้ component อื่น | Template/Studio visual smoke, เช็ก registry และ dynamic use |
| `server/domain/scene-templates/sceneTemplateVersioning.js` | stub คืน version 1 และ snapshot เดิม; ไม่พบ caller | ยืนยันกับ repository/migration owner ว่าไม่มี manual migration ใช้ |
| `server/domain/scene-templates/sceneVariableResolver.js` | resolver รุ่นเก่าที่ไม่มี caller; current template flow เข้าผ่าน owner อื่น | ตรวจ template execution, locked variable/reference parity และ legacy snapshots |
| `server/providers/SandboxVideoProvider.js` | simulated adapter ไม่มี import; อาจเป็น test fixture ที่จงใจพักไว้ | ให้ Video owner ตัดสินใจ: ลบได้ = ลด 1, ย้ายไป `test/fixtures` = ไม่ลดไฟล์ |

**ลำดับ:** 4 ไฟล์แรกเป็น candidate ที่มีหลักฐานดี แต่ยังต้องผ่าน checks; `SandboxVideoProvider.js` เป็น conditional ไม่รวมในเลขขั้นต่ำ การลบ 4 ไฟล์แรกลด source bytes ดิบราว **4,179 bytes** เท่านั้น และแทบไม่เปลี่ยน browser bundle เพราะไฟล์ไม่มี importer อยู่แล้ว

## B. รวม owner/ตัด forwarding โดยคงพฤติกรรม (ลดสุทธิ 3 ไฟล์)

| งาน | ไฟล์ที่ลดสุทธิ | เหตุผลและวิธีที่ไม่เปลี่ยน contract | Gate |
|---|---:|---|---|
| เปลี่ยน Playground ให้ import `web/src/features/generation/api/trustedVideoSources.ts` ตรง แล้วถอด `web/src/features/playground/api/trustedVideoSources.ts` | 1 | ไฟล์ Playground เป็น re-export ล้วน; Generation เป็นเจ้าของ API, Zod schema, pagination/cursor และ actor header อยู่แล้ว | ปรับ 3 consumer และ mock ใน `TrustedVideoSources.test.tsx`; ตรวจ reference order/category และ API request เดิม |
| รวม `web/src/features/cinematic/state/storyboardEnginePreference.ts` กับ `produceVideoPreferences.ts` เป็น state module เดียวภายใน Cinematic | 1 (2 -> 1) | ทั้งคู่เป็น read/write schema รอบ `actorScopedStorage` เดียวกัน; ลด storage plumbing โดยไม่สร้าง generic storage อีกตัว | คง feature key ทั้งสอง, schemaVersion, shape, merge-on-write และ actor isolation; ปรับ imports/tests; อย่ายุบ schema สองชนิดเป็นชนิดเดียว |
| ย้ายค่า Additional Direction 300 ตัวอักษรไปยัง `server/config/generationInputPolicy.js` ที่ถูกส่งใน attributes `inputPolicy` อยู่แล้ว; ถอด `web/src/features/studio/additionalDirectionContract.ts` | 1 | Server `generationRequestService.js` และ Studio UI ถือค่า 300 แยกกัน; ให้ server เป็น authority เดียว | ต้องมี schema/client state สำหรับค่าใน bundle, เก็บ UX ก่อน bundle พร้อม, Unicode code-point count และ error `additional_direction_too_long` เท่าเดิม; อย่าทำให้ฟอร์มรอ network เพิ่มโดยไม่วัด |

ไฟล์ policy สั้น ๆ ที่มีเจ้าของและผู้ใช้จริง เช่น `server/config/openAIImage25.js` **ไม่ใช่** forwarding ขยะ: pricing กับ provider ใช้ขนาดเดียวกันอยู่แล้ว การรวมเข้า provider จะทำให้ Credits ต้องพึ่ง provider implementation ผิดทิศทาง

## C. ทางเลือกเล็กมากและ logic ซ้ำ (ไม่นับในเป้าหมายหลัก)

- `web/src/features/studio/components/StudioRecentGenerations.tsx` เป็น wrapper 1 consumer ของ `GenerationLibrary variant="compact" limit={12}`. ถ้า inline ที่ `GenerationExperience.tsx` ลดอีก **1 ไฟล์** โดย import graph เหมือนเดิม แต่ต้องแก้ `scripts/validate-studio-ui-quick.bat`. ความคุ้มต่ำ; ไม่จำเป็นต่อการลด duplication
- Blob download/object-URL flow กระจายอยู่ใน `studioConfigFile.ts`, `financeReportExcel.ts`, `ClipBundleDownload.tsx`, `MediaExportButton.tsx`, `ComparisonExportDialog.tsx`. ควรรวม *กลไก* การสร้าง anchor/revoke ใน helper เจ้าของร่วม เมื่อแก้ feature เหล่านี้ครั้งต่อไป แต่เวลาคืน object URL ต่างกัน (ทันที/1 วินาที/30 วินาที) ต้องมี test download ทุกชนิด การเพิ่ม helper แล้วถอด `studioConfigFile.ts` ให้ผลจำนวนไฟล์สุทธิ **0**, จึงไม่ใส่ในสถิติการลดไฟล์
- `actorScopedStorage.ts` เป็นฐานร่วมอยู่แล้ว ห้ามสร้าง persistence helper อีกชุดเพื่อรวม preference สองไฟล์; รวมเพียง feature-level exports

## ไม่ควรรวมเพื่อไล่จำนวนไฟล์

| ขอบเขต | เหตุผล |
|---|---|
| `web/src/features/history/routes/HistoryRoute.tsx` กับ shared `GenerationLibrary` | router ใช้ `lazyRoute` ที่ไฟล์นี้; การยุบลง shared component อาจเปลี่ยน route chunk และ loading behavior |
| `web/src/components/generation/GenerationEngineShell.tsx` | ใช้ซ้ำสองจุดและเป็น UI contract ที่มี test; การ inline ทำให้ style/semantics แตกกันง่าย |
| `server/app/routes/*` ทั้งชุด | route ขนาดเล็กยังแยก ownership/auth/error surface; รวมเป็นไฟล์ใหญ่ไม่ลด workflow ซ้ำและเพิ่ม blast radius |
| `client/assets/**`, `client/i18n/**`, config JSON ที่ versioned, `post-processing-service/config/**` | เป็น data/asset และ policy boundary ที่ active; merge อาจทำลาย lazy locale, model provenance หรือ policy review |
| Cinematic storyboard/video compilers | contract, provider prompt และ video packet เป็นคนละขั้นตอน; ห้ามรวมก่อนพิสูจน์ reference/fingerprint/limit parity |

## สถิติผลที่คาด

| สถานการณ์ | ลด source เพิ่มจาก audit ก่อน | % ของ 849 source | % ของ 2,873 first-party | % ของ 3,837 tracked |
|---|---:|---:|---:|---:|
| A เฉพาะ 4 orphan ที่ตรวจผ่าน | **4** | **0.47%** | **0.14%** | **0.10%** |
| A + sandbox 1 + B อีก 3 | **8** | **0.94%** | **0.28%** | **0.21%** |
| เพิ่ม C wrapper ที่คุ้มต่ำ | **9** | **1.06%** | **0.31%** | **0.23%** |

เมื่อรวมกับ audit ก่อนหน้าโดย **ไม่ทับรายการกัน**: ถ้าลดเพียง 16 ไฟล์ตกค้างเดิมและ A 4 จะเป็น **20 ไฟล์ / 0.52%** จาก 3,837; ถ้าทำ B และ sandbox เพิ่มด้วย จะเป็น **24 ไฟล์ / 0.63%**. เพดานที่รวมการ untrack dependency/build และปิด legacy migration gate เดิมทั้งหมดคือ **1,110 ไฟล์ / 28.93%**, เหลือ **2,727 ไฟล์** แต่ตัวเลขนี้มี dependency 964 ไฟล์ซึ่งยังต้องติดตั้งเพื่อรันจริง จึงไม่ใช่ผลจากการ refactor source อย่างเดียว

ขนาด source Vanilla client 108 ไฟล์จาก audit ก่อนหน้ารวมประมาณ **1.18 MB**; นี่เป็นโอกาสลด first-party bytes ใหญ่กว่าการรวมไฟล์ A/B แต่ยังติด migration/rollback gate. การ untrack `node_modules` ลดไฟล์ใน Git checkout ไม่ได้ทำให้ runtime เร็วขึ้นและไม่ลบ Git history เดิมอัตโนมัติ

## ลำดับ implement และ acceptance checks ในรอบที่ได้รับอนุมัติ

1. Baseline: เก็บ `git ls-files`, Vite build/chunk sizes, focused tests และ runtime routes ก่อนแก้; ยืนยันไม่มี dynamic consumers สำหรับ A แล้วลบทีละ capability
2. B1: ปรับ import/mocks ไปหา Generation owner โดยไม่เปลี่ยน API/Zod/request; test Playground reference picker และ Cinematic Cast ที่ใช้ canonical API อยู่แล้ว
3. B2: รวม Cinematic preferences ภายใน feature โดยคง localStorage key/schema เดิมทุก byte; test actor switching, persisted drafts และ Storyboard/Produce UI
4. B3: ย้าย Additional Direction limit ผ่าน public input policy; test 300/301 Unicode code points, offline/loading behavior, server 400 และ Studio export/restore
5. เลือก C เฉพาะเมื่อแก้ download/studio code อยู่แล้ว; ตรวจ object-URL cleanup, filename, MIME, private fetch และไม่เพิ่ม initial route chunk เกิน baseline
6. รัน focused Node/Vitest, `npm.cmd run typecheck:web`, `npm.cmd run build:web`, route smoke และ `git diff --check`; เปรียบเทียบ Credit/Generation/Asset behavior เฉพาะจุดที่แตะ อย่ารัน provider แบบเสียเงินเพื่อพิสูจน์การรวมไฟล์

**หลักฐาน audit นี้:** static graph 849 source, `rg` ชื่อ symbol/path, owner routes/config และขนาดไฟล์; ไม่มี code change หรือ functional test รอบนี้. นี่เป็น candidate list ไม่ใช่คำสั่งลบหรือรับรองว่า dynamic reference ทั้งหมดถูกค้นครบ
