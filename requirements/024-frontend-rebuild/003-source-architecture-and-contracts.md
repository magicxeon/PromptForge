# FE24-ARCH — โครงสร้าง source และการใช้ระบบเดิมร่วมกัน

สถานะ: Planned เท่านั้น; `web/` ยังเป็น runtime owner ปัจจุบัน.
Frontend ใหม่เสนอ `web-next/`; ไม่สร้างโฟลเดอร์ executable ในรอบ requirement นี้.

## 1. โครงสร้างที่เสนอ

```text
web-next/src/
  app/                          bootstrap, providers, routing, shell
  components/ui/                controls ชุดเดียว; ไม่มีธุรกิจ generation
  components/media/             image viewer, video player, thumbnails
  features/playground/
    components/                 Prompt, references, settings, status, results
    hooks/                      orchestration ต่อ use case
    state/                      actor-scoped/versioned draft และ pure validation
    api/                        facade สำหรับ public contracts ที่ใช้ร่วมกัน
    routes/                     page composition
  lib/                          shared-runtime adapters เท่าที่จำเป็น
  locales/th/                   ข้อความ presentation ใหม่
  locales/en/                   key/interpolation parity
  styles/                       tokens ชุดเดียว + global reset ขั้นต่ำ
```

แยก UI, orchestration และ transport; route ประกอบหน้าจอ ไม่ทำ provider dispatch.
ไม่สร้าง component อเนกประสงค์ที่ถือ Prompt/References/Wallet/Jobs/ทุกโหมดในไฟล์เดียว.
ไม่แตกเป็น service/store/hook ใหม่หากหน้าที่เดิมมี public contract ที่ตรงอยู่แล้ว.
CSS ของ feature จำกัดขอบเขต ใช้ CSS Modules หรือ component classes ที่ควบคุมชัดเจน;
ไม่ import `web/src/styles/globals.css`, `themes.css` หรือ AppShell ของเว็บเดิม.

## 2. ขอบเขต reuse ที่ต้องสรุปก่อน implementation

| ปัจจุบัน | สัญญาที่ต้อง reuse / ทางย้าย |
|---|---|
| `web/src/lib/api/apiClient.ts`, `lib/auth/actorStore.ts` และ ActorProvider lifecycle | Credentials, CSRF, identity readiness/epoch, cross-tab invalidation, media URL policy; ห้ามสร้าง fetch bypass |
| `features/generation/api/generationApi.ts` และ schemas | catalog, references, prompt preview, estimate/submit, job/group, Comparison |
| `features/generation/api/videoGenerationApi.ts` และ schemas | catalog, quote, submit, get task, Recent tasks |
| `lib/api/pollingPolicy.ts`, generation hooks/job center | owner เดียวของ active-job observation ต่อ frontend; ไม่ซ้อน poller |
| `lib/persistence/actorScopedStorage.ts` | actor isolation/versioning; new draft namespace ไม่เขียนทับ draftเดิม |
| `components/ui/ProcessingSpinner.tsx` | share implementation ผ่าน boundary เดียว; ไม่สร้าง spinner คู่ขนาน |
| `components/media/AuthenticatedMediaImage.tsx` และ media APIs | private asset delivery contract, session expiry, URL cleanup |
| UI controls/shell ปัจจุบัน | ตรวจ behavior ที่ต้องคง แต่สร้าง presentation ใหม่ในขอบเขตที่อนุญาต |

T01 ต้องระบุรายการ exports/dependencies ที่นำกลับใช้จริงและ temporary compatibility.
แนวทางที่เสนอคือ shared client package สำหรับ transport/schemas/identity/polling
ที่ไม่มี theme dependency ให้ทั้งสอง frontend ใช้ implementation เดียว.
ยังไม่กำหนด path package ก่อนตรวจ dependency graph; ห้ามคัดลอกโค้ดสองชุดแล้วแก้แยก.
ก่อนย้ายไฟล์ต้องอัปเดต architecture map, imports, callers และ parity evidence.
ห้ามให้ package ใหม่ import กลับไป app/component ของ frontend ใด; shared layer
ไม่รู้จักหน้าตาของทั้งสองแอป. การ extraction เป็น future task ที่มี independent
Security/Backend review เมื่อแตะ session/private-media contract.

Inventory แยก pure schemas/types, transport, React identity lifecycle, workflow hooks และ UI;
Generation API มี Studio/Profile type dependencies ต้องตรวจจริง ไม่ถือว่าย้ายไฟล์ API อย่างเดียวแล้วจบ.
แต่ละ application runtime มี identity lifecycle และ Query client ชุดเดียว; คง config→session resolution,
CSRF publication, focus/BroadcastChannel invalidation และการปฏิเสธ response เก่าแม้ abort ไม่ทัน.

## 3. Backend และ environment

ใช้ server/routes/facades เดิมทั้งหมด. New frontend ใช้ same-origin API proxy;
API keys ยังอยู่ server env. ไม่ส่ง key ไป Vite variables หรือ browser.
เส้นทาง dev port และ production preview mount ต้องกำหนดในT01 ก่อนสร้าง launcher.
เลือก origin ที่เข้ากับ Identity allowlist/CSRF/local bypass เดิม ไม่ขยาย wildcard.
`WEB_DIST_ROOT`/Express fallback ปัจจุบันยังชี้เว็บเดิม; ไม่สลับในรอบนี้.
Local bypass admin ต้องใช้ policy เดิม ไม่เพิ่ม bypass ด้วยเหตุผลทดสอบ UI.
T01 จัด environment matrix: browser origin, API/media proxy paths, build base/router basename,
preview mount, Login/callback/validated return route และ rollback entry. Dev proxy ที่มีอยู่ไม่ได้พิสูจน์
ว่า production มี second mount แล้ว; ขาด contract ให้เปิด dependency กับเจ้าของก่อน T03.
Private media ครอบคลุม thumbnail/original/download/poster/playback/seek-range ไม่ใช่เฉพาะ image component.
Library ต้องใช้ authorized transport/allowed origins; ห้ามแก้ player ด้วย public URL workaround.

## 4. State และ data ownership

- Provider capabilities/pricing/limits เป็น server state ใช้ TanStack Query และ owning
  Zod schemas. ไม่มี hard-coded model lists หรือ estimate formula ใน UI.
- New draft namespace ใช้ canonical identity scope (auth mode + actor ID) + schema version; migration นำเข้า draftเก่าเป็น
  explicit action หลังตรวจ schema ไม่แก้ formatของเดิมและไม่ auto overwrite.
- Query keys มี actor identity; switch/logout clear cache/drafts ใน memory และ revoke
  object URLs. Metadata ที่แสดงต้องมาจากงาน/assetของ actor ไม่ใช้ชื่อเป็น ownership.
- Restore หลัง identity พร้อมเท่านั้น; import draft ตรวจสิทธิ์ asset ใหม่. Actor ID ที่ส่งจาก browser
  ไม่ใช่ authorization; server ใช้ identity ที่ตรวจแล้ว. Late JSON/blob/stream ต้องไม่ข้าม identity epoch.
  Logout/switch หยุด player และเอา private bytes/metadata เดิมออกจากจอด้วย.
- เก็บเพียง IDs และค่า form ที่จำเป็น; server JSON/database/output locations ไม่เปลี่ยน.
- Thumbnail lists ต้องแบ่งหน้า/limit; ขยาย API pagination เป็นงานเจ้าของ capability
  แยกหาก endpointปัจจุบันไม่มี ไม่โหลดทั้งหมดแล้วซ่อนใน browser.
- Media buffer/object URL มี lifetime ต่อ selection/viewer และ revokeเมื่อเปลี่ยน/ปิด.
  Private files ใช้ authenticated delivery เดิม ไม่มี public URL workaround.
- Active polling มี terminal stop, bounded retry/backoff, unmount/actor-switch cleanup;
  opening two frontends ไม่ทำให้ submit ซ้ำ. ไม่สร้าง global cache อีกชุดนอก owner.

### 4.1 T01 contract inventory และ prerequisites ต่อ milestone

| Inventory | สิ่งที่ต้องบันทึก | ข้อจำกัดจาก source review 2026-11-20 |
|---|---|---|
| Image/Video/Comparison recovery แยกกัน | owner, correlation key, immutable input identity, permitted persistence, lookup/safe replay, expiry/conflict และ terminal cleanup | Image helper สร้าง request ID ใหม่ถ้าไม่ส่ง; Comparison helper สร้าง key ภายในทุก call; Video key ปัจจุบันอยู่ React ref จึงยังไม่รับรอง reload recovery |
| Recent outputs/งานล่าสุด/reference picker แต่ละรายการ | API owner, stable ID/order/filter, page limit, continuation, thumbnail vs original | Image History มี cursor; Video Recent มี limit แต่ยังไม่มี continuation; ห้ามอ้าง load more โดยเพิ่ม limit ไม่จำกัด |
| Submitted intent vs draft vs selected result | owner/lifetime ของแต่ละ state, actor scope, cleanup และ observer ต่อ operation | แก้ draft ได้โดยไม่เปลี่ยนคำขอเดิม; งานหลายชิ้นต้องไม่ถูกแทนด้วย active ID เดียว |

Persist request intent ก่อน POST ผ่าน owning contract: correlation/key, input identity และ lightweight snapshot
เท่าที่ policy อนุญาต; ไม่เก็บ secrets, private URLs, Base64 หรือ file buffers. Key ไม่ใช่หลักฐานสิทธิ์.
ถ้า owner ยังไม่มี recovery ให้ระบุ dependency ของ mode นั้นพร้อม negative acceptance ก่อน task ผ่าน;
unknown คงตรวจได้แต่ไม่ blind resubmit. ไม่สร้าง reconciliation/queue store คู่ขนานใน frontend.
Lists ใช้ bounded server responses; continuation ต้องไม่ซ้ำ/ตกหล่นและคง selected result เมื่อมีงานใหม่.
รุ่น preview ใช้ bounded Recent พร้อมลิงก์ประวัติเดิมได้โดยระบุขอบเขตตรงจริง; หากต้องการ load more
ต้องทำ owning API prerequisite ให้เสร็จก่อนเปิด control. ไม่โหลดประวัติทั้งหมดมาหั่นใน browser.

## 5. Localization และ components

`web-next/src/locales/{th,en}/` เป็น proposed owner ของข้อความ presentation ใหม่;
`client/i18n/` ยังดูแลเว็บเดิม. ไม่ย้าย AI prompts/user data เข้า locale.
ใช้ react-i18next instance/runtimeตาม boundary ที่ตกลง ไม่ใช้สอง instance ในแอปเดียว.
เลือก shadcn primitive family เดียว (Base/Radix/Aria) ก่อน scaffold; ไม่ผสมหลาย library
สำหรับปุ่มและ dropdown. Imported component code เราต้องดูแลเอง; บันทึก dependency
versions/licenses และ update path. viewer/player ต้องผ่าน auth, keyboard, TH/EN checks.

## 6. สิ่งที่ต้องคงและสิ่งที่เปลี่ยนได้

เปลี่ยนได้: layout, navigation ของ workspaceใหม่, control presentation, CSS,
tokens และ draft namespace ที่มีแผนชัดเจน.
คงเดิม: actor/permission, provider routing, reference order/authority, compiled prompt,
quote/settlement/idempotency, public/private assets และ historical jobs.
หากพบว่าต้องเปลี่ยน public contract ให้หยุดขยาย scopeเงียบ ๆ และบันทึกงานเจ้าของ
พร้อม independent review ที่เหมาะสมใน execution plan ก่อน implement.
