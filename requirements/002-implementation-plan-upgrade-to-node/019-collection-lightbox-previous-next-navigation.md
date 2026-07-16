# 19. Collection Lightbox Previous/Next Navigation

**ID:** `019-collection-lightbox-previous-next-navigation`  
**Application:** `ModelPromptForge`  
**Status:** Implemented - Pending Runtime Verification  
**Feature type:** History and Collection image-viewing UX enhancement  
**Depends on:** Requirement 013 - Image Collections, Navigation, and UI Reliability Fixes  
**Created:** 2026-07-14  
**Implementation authorization:** Approved and implemented on 2026-07-14

## 1. Objective

ปรับปรุง History lightbox ให้ผู้ใช้เปิดภาพหนึ่งครั้งแล้วเลื่อนไปดูภาพก่อนหน้าหรือถัดไปใน Collection ที่กำลังเลือกได้ทันที โดยไม่ต้องปิด lightbox แล้วกด thumbnail ใหม่ทุกภาพ

เพิ่ม navigation control แบบซ่อนอยู่บริเวณขอบซ้ายและขวาของ lightbox:

- เมื่อ pointer เข้าใกล้ขอบซ้าย ให้แสดงปุ่ม `<` สำหรับภาพก่อนหน้า
- เมื่อ pointer เข้าใกล้ขอบขวา ให้แสดงปุ่ม `>` สำหรับภาพถัดไป
- เมื่ออยู่ภาพแรก ไม่แสดงปุ่มซ้าย
- เมื่ออยู่ภาพสุดท้าย ไม่แสดงปุ่มขวา
- ไม่วนจากภาพสุดท้ายกลับภาพแรก หรือจากภาพแรกไปภาพสุดท้าย

Navigation ต้องเปลี่ยนทั้งรูปภาพ metadata, lineage, Collection membership และ action context ให้ตรงกับภาพใหม่ทุกครั้ง

### 1.1 Implementation outcome

Implementation ปัจจุบันประกอบด้วย:

- `lightbox-content-container` พร้อม hidden hover zones ที่ขอบซ้าย/ขวา โดยไม่วาง controls ทับอยู่ภายในตัวภาพบน desktop
- browse context จาก visible History หรือ `collection.jobIds`
- previous/next click และ `ArrowLeft`/`ArrowRight`
- boundary hiding แบบไม่ wrap-around
- mobile-visible controls ที่ไม่พึ่ง hover
- full active-item rendering สำหรับรูป, metadata, lineage, Collections, download และ reference actions
- neighbor preloading และ stale image-load guard
- Parent Lineage navigation แบบรักษา context เมื่ออยู่ใน list และ standalone เมื่ออยู่นอก Collection
- context recovery เมื่อ History/Collection membership เปลี่ยน
- localized navigation labels/status ภาษาไทยและอังกฤษ
- Escape close, focus trap และคืน focus ไปยัง thumbnail ต้นทาง

## 2. User Problem

ปัจจุบัน `Background Queue & History` เปิดภาพผ่าน full-screen lightbox แต่ lightbox เก็บเพียง `activeItem` รายการเดียว หากต้องการดูหลายภาพ ผู้ใช้ต้อง:

1. ปิด lightbox
2. หา thumbnail ถัดไปใน history grid
3. เปิด lightbox ใหม่
4. ทำซ้ำทุกภาพ

ขั้นตอนนี้ไม่สะดวกโดยเฉพาะ Collection ที่มีภาพจำนวนมาก หรือต้องการเปรียบเทียบ character/fashion set ต่อเนื่อง

## 3. Scope

### 3.1 In scope

- previous/next controls ภายใน History lightbox เดิม
- browse context ตาม Collection filter ที่กำลังเลือก
- `All Images` browse context
- mouse hover/proximity, keyboard และ touch-friendly behavior
- metadata/action synchronization เมื่อเปลี่ยนภาพ
- boundary behavior ที่ไม่แสดง control เมื่อไม่มีปลายทาง
- preload ภาพข้างเคียงเพื่อลดเวลารอ
- accessibility และ responsive behavior

### 3.2 Out of scope

- autoplay slideshow
- wrap-around navigation
- การเปลี่ยนลำดับภาพใน Collection
- drag-and-drop Collection ordering
- เปรียบเทียบหลายภาพพร้อมกัน ซึ่งอยู่ใน Requirement 020
- zoom/pan synchronization ของ AI Comparison
- navigation ระหว่าง active Queue jobs ที่ยังสร้างไม่เสร็จ

## 4. Browse Context

### 4.1 Source list

เมื่อเปิด lightbox จาก history thumbnail ให้สร้าง browse context จากรายการที่ผู้ใช้มองเห็นใน grid ณ ขณะนั้น:

| Current filter | Browse list | Ordering |
|---|---|---|
| Specific Collection | successful history items ที่ resolve ได้จาก Collection | ลำดับ `collection.jobIds` |
| `All Images` | history items ที่กำลัง render | ลำดับเดียวกับ `state.history`/history grid |
| Empty Collection | ไม่มี lightbox entry | ไม่มี navigation |

ห้ามนำภาพจาก Collection อื่นมาปะปนเมื่อผู้ใช้กำลังดู Collection เฉพาะรายการ

### 4.2 Context snapshot

เมื่อเปิด lightbox ให้เก็บอย่างน้อย:

```javascript
{
  source: "history" | "collection" | "standalone",
  collectionId: "all" | "collection-id" | null,
  itemIds: ["job-id-1", "job-id-2"],
  activeIndex: 0
}
```

ใช้ job ID เป็น identity ไม่เก็บสำเนา history object เพื่อให้ metadata ล่าสุด resolve จาก `state.history`

### 4.3 Context invalidation

- หากลบ active image ขณะ lightbox เปิด ให้ไปภาพถัดไปใน context เดิม หากไม่มีให้ไปภาพก่อนหน้า
- หากไม่มีภาพเหลือ ให้ปิด lightbox และแสดง empty state ใน grid
- หาก membership ถูกแก้จน active image ไม่อยู่ใน Collection แล้ว ให้ recompute context และใช้ behavior เดียวกับการลบ
- หาก Collection ถูกลบหรือ selected filter กลับเป็น `All Images` ระหว่างเปิด lightbox ให้ปิด lightboxหรือ rebuild context อย่างชัดเจน ห้ามค้าง context ที่อ้าง Collection ไม่มีอยู่
- orphan job ID ใน Collection ต้องถูกข้ามเหมือน history rendering ปัจจุบัน

### 4.4 Lineage navigation

เมื่อกด Parent Lineage thumbnail:

- หาก parent อยู่ใน browse list ปัจจุบัน ให้เปิด parent และตั้ง `activeIndex` ให้ตรง
- หาก parent ไม่อยู่ใน Collection ที่กำลังดู ให้เปิดแบบ `standalone` และไม่แสดง previous/next controls
- ห้ามนำ parent ที่อยู่นอก Collection แทรกเข้า browse list โดยอัตโนมัติ

## 5. Navigation Controls

### 5.1 Placement

เพิ่ม interaction zone บริเวณขอบด้านนอกซ้ายและขวาของ `lightbox-content-container`:

- zone ซ้ายควบคุม previous
- zone ขวาควบคุม next
- ปุ่มอยู่กึ่งกลางแนวตั้งของ container บน desktop
- controls ไม่วางซ้อนอยู่ภายในตัวภาพบน desktop
- จอเล็กสามารถขยับ controls เข้ามาชิดขอบ container เฉพาะช่วงพื้นที่ภาพเพื่อไม่ให้ล้น viewport
- visual style ใช้สี, border, glow และ transition ตาม application theme เดิม
- ใช้ glyph `<` และ `>` หรือ icon จากระบบเดิมโดยไม่เพิ่ม icon dependency ใหม่

### 5.2 Hidden and reveal behavior

Desktop pointer behavior:

- control เริ่มต้นโปร่งใสหรือซ่อนแบบไม่รบกวนภาพ
- เมื่อ pointer เข้า interaction zone ให้ปุ่ม fade/slide เข้ามาอย่างรวดเร็ว
- เมื่อ pointer ออกจาก zone ให้ซ่อนหลัง delay สั้นเพื่อไม่ให้ปุ่มกระพริบ
- เมื่อ keyboard focus อยู่บน control ต้องมองเห็นเสมอ
- interaction zone ต้องไม่ขวางการกดปุ่ม close, metadata actions หรือ lineage thumbnails

ห้ามใช้ mouse coordinate polling ตลอดเวลา หาก `pointerenter`, `pointerleave`, CSS `:hover` หรือ `:focus-visible` ทำได้

### 5.3 Boundary behavior

- `activeIndex === 0`: ไม่ render หรือใช้ `hidden` กับ previous control
- `activeIndex === itemIds.length - 1`: ไม่ render หรือใช้ `hidden` กับ next control
- list มีภาพเดียว: ไม่แสดงทั้งสองปุ่มและไม่เปิด keyboard navigation
- control ที่ไม่มีปลายทางต้องไม่สามารถ focus หรือ click ได้
- ไม่ใช้ disabled button ที่ยังมองเห็น เพราะผู้ใช้ระบุว่าเมื่อสุดแล้วไม่ต้องแสดง

### 5.4 Click behavior

เมื่อกด previous/next:

1. guard การกดซ้ำระหว่าง active item update
2. เปลี่ยน `activeIndex`
3. resolve item จาก `state.history`
4. render lightbox ด้วย item ใหม่
5. update navigation boundary
6. preload neighbor ใหม่
7. รักษา lightbox ให้อยู่ในสถานะเปิดตลอด

ไม่เรียก Collection หรือ History API ใหม่ทุกครั้งหากข้อมูลอยู่ใน Client state แล้ว

## 6. Keyboard and Touch

### 6.1 Keyboard

เมื่อ lightbox เปิดและไม่มี input/editor อื่นกำลังรับข้อความ:

- `ArrowLeft`: ภาพก่อนหน้า
- `ArrowRight`: ภาพถัดไป
- `Escape`: ปิด lightboxตาม behavior เดิม
- key ที่ boundary ไม่มีผลและไม่ wrap
- ต้อง `preventDefault()` เฉพาะเมื่อ key ถูก lightbox handle จริง

ไม่ intercept arrow keys เมื่อ focus อยู่ใน input, textarea, select, contenteditable หรือ nested Collection modal

### 6.2 Touch and mobile

- ไม่มี hover บน touch device จึงต้องแสดง control แบบโปร่งบางเมื่อมีปลายทาง หรือแสดงเมื่อแตะขอบภาพ
- hit target อย่างน้อยประมาณ 44x44 CSS pixels
- รองรับ swipe ซ้าย/ขวาเป็น enhancement ได้ แต่ต้องมี movement threshold และไม่รบกวน vertical page scroll
- MVP สามารถเริ่มจาก visible edge buttons บน mobile ก่อน swipe

## 7. Rendering Contract

แยกการทำงานปัจจุบันของ `openLightbox(item)` ให้ reuse ได้ระหว่าง initial open และ navigation เช่น:

```text
openLightbox(item, browseContext)
renderLightboxItem(item)
navigateLightbox(direction)
renderLightboxNavigation()
closeLightbox()
```

`renderLightboxItem(item)` ต้อง update ทุก field:

- full-resolution image `src` และ `alt`
- Generation Reference title
- prompt
- provider/engine
- model
- timestamp
- generation duration
- download URL, extension และ filename
- Parent Lineage thumbnails
- Collection memberships
- Face/Style/Character reference action target
- `modal.activeItem`

ห้าม update เฉพาะ `img.src` เพราะ action และ metadata จะชี้ภาพเดิม

## 8. Loading and Transitions

- preload previous/next image ด้วย `Image()` หลัง active image render สำเร็จ
- แสดง loading state เมื่อ neighbor ยังโหลดไม่เสร็จ
- ใช้ transition สั้นและเคารพ `prefers-reduced-motion`
- image load failure ต้องคง lightbox เปิด พร้อมข้อความและให้ย้อนกลับได้
- ป้องกัน stale image load callback เขียนทับภาพใหม่เมื่อผู้ใช้กดเร็ว
- ไม่ preload ทั้ง Collection เพื่อหลีกเลี่ยง network/memory usage สูง

## 9. Accessibility

- controls ใช้ `<button type="button">`
- aria-label localized เช่น `Previous image` / `ภาพก่อนหน้า` และ `Next image` / `ภาพถัดไป`
- keyboard focus indicator ต้องชัดเจนตาม theme
- เมื่อเปลี่ยนภาพให้ประกาศตำแหน่งแบบสุภาพ เช่น `Image 3 of 12` ผ่าน `aria-live="polite"`
- alt text ใช้ข้อมูลภาพที่เหมาะสม ไม่ใช้ข้อความเดียวกันทุกภาพหากมี prompt/title
- focus trap ของ lightbox ต้องรวม navigation controls
- เมื่อปิด lightbox คืน focus ไป thumbnail ที่เปิด lightbox หาก thumbnail ยังอยู่

## 10. Localization

เพิ่ม translation keys แทน hardcode อย่างน้อย:

```text
lightbox.previousImage
lightbox.nextImage
lightbox.imagePosition
lightbox.imageLoadFailed
```

ปุ่มที่ใช้ glyph `<`/`>` ยังคงต้องมี localized `aria-label` และ tooltip

## 11. State and Lifecycle Safety

- browse context เป็น Client-only transient state ไม่ persist ลง session/config JSON
- ปิด lightboxแล้วต้อง clear context และ pending image-load token
- event listeners สำหรับ keyboard ต้อง bind ครั้งเดียวและตรวจสถานะ modal ไม่ bind ซ้ำทุกครั้งที่เปิดภาพ
- history refresh ต้องรักษา active item หากยังมีอยู่และ recompute index อย่างปลอดภัย
- Collection selector change ต้องไม่ปล่อย stale context
- rapid click/keydown ต้องไม่ทำให้ index ต่ำกว่า 0 หรือเกิน list length

## 12. Suggested File Changes

| File | Responsibility |
|---|---|
| `client/index.html` | previous/next interaction zones, buttons และ aria-live status |
| `client/style.css` | hidden/reveal edge controls, responsive states และ reduced motion |
| `client/app.js` | browse context, navigation, keyboard handling, metadata refresh และ preload |
| localization source used by Client | labels/tooltips/status ภาษาไทยและอังกฤษ |

ไม่ต้องแก้ Server API หรือ Collection persistence สำหรับ MVP

## 13. Implementation Steps

### Phase A: Lightbox state refactor

- แยก item rendering ออกจาก modal open lifecycle
- เพิ่ม transient browse context และ active index
- สร้าง helper สำหรับ visible history list ชุดเดียวกับ `renderHistory()`

### Phase B: Controls and theme

- เพิ่ม left/right zones และ buttons
- ทำ hover/focus reveal และ boundary hiding
- ปรับ desktop/mobile layout โดยไม่ทับ metadata panel

### Phase C: Interaction

- เชื่อม click และ keyboard navigation
- update metadata/actions ทุกครั้ง
- รองรับ lineage standalone behavior

### Phase D: Reliability and accessibility

- preload neighbors และ stale-load guard
- localized aria labels/status
- focus return และ reduced motion

### Phase E: Verification

- automated tests สำหรับ context ordering, index boundary และ stale item handling
- manual test ด้วย All Images, Collection 1 ภาพ, Collection หลายภาพ และ orphan member
- desktop mouse, keyboard และ mobile touch verification

## 14. Acceptance Criteria

1. เปิดภาพจาก Collection แล้วเลื่อนได้เฉพาะภาพใน Collection นั้นตามลำดับ `jobIds`
2. เปิดจาก `All Images` แล้วเลื่อนตามลำดับ history grid
3. pointer เข้าใกล้ขอบซ้าย/ขวาแล้ว control ที่ใช้ได้แสดงขึ้นตาม theme
4. ภาพแรกไม่แสดงปุ่มซ้าย และภาพสุดท้ายไม่แสดงปุ่มขวา
5. Collection หนึ่งภาพไม่แสดง navigation controls
6. กด control แล้วรูป metadata, lineage, memberships, download และ reference actions เปลี่ยนครบ
7. `ArrowLeft`/`ArrowRight` ทำงานเมื่อ lightbox active และไม่รบกวน form controls
8. navigation ไม่ wrap-around
9. parent ที่อยู่นอก Collection เปิด standalone โดยไม่ปะปน browse list
10. ลบภาพหรือแก้ membership ขณะเปิด lightbox แล้ว context ฟื้นตัวโดยไม่ crash
11. rapid navigation ไม่แสดงภาพหรือ metadata คนละ item
12. mobile มี control ที่กดได้โดยไม่ต้องพึ่ง hover
13. ปิด lightboxแล้วคืน focus และไม่เหลือ stale keyboard/image listeners
14. ไม่ต้องเรียก API ใหม่ในแต่ละครั้งที่เลื่อนภาพ

## 15. Decisions Recorded

- Feature นี้ใช้ Requirement 019 และแทรกก่อน AI Model Comparison
- AI Model Comparison Workspace เลื่อนไปเป็น Requirement 020
- navigation ยึด Collection/filter ที่เลือกอยู่ ไม่เลื่อนข้าม Collection
- controls ซ่อนที่ขอบและแสดงเมื่อ pointer เข้าใกล้บน desktop
- เมื่อถึงขอบ list ให้ซ่อน control ฝั่งนั้น ไม่แสดง disabled state
- ไม่ wrap-around
- รองรับ keyboard และ mobile โดยไม่เปลี่ยน visual language เดิม
- Implementation เสร็จแล้วและรอ runtime verification
