# 22. Comparison History Dashboard and Application Navigation

**ID:** `022-comparison-history-dashboard-and-application-navigation`  
**Application:** `ModelPromptForge`  
**Status:** Draft for review  
**Feature type:** New application page and navigation foundation  
**Depends on:** Requirement 020 - AI Model Comparison Workspace, Requirement 021 - History Performance and Thumbnails  
**Aligns with:** Phase2-00 Commercial Platform Master Roadmap, Phase2-02 Application Shell and Module Registry  
**Created:** 2026-07-14  
**Implementation authorization:** Not yet approved

## 1. Objective

เพิ่มหน้า `Comparison History` แยกจาก Studio เพื่อให้ผู้ใช้ค้นหาและกลับมาเปิด Comparison Sets จากหลายวันหรือหลายสัปดาห์ก่อนได้ง่าย พร้อมเริ่ม Application Navigation กลางก่อนที่จำนวน modules จะมากจนอยู่ในหน้าจอเดียวไม่ได้

หน้า Dashboard ต้องเรียบง่ายและมีเพียงฟังก์ชันที่ใช้จริง ห้ามกลายเป็น analytics หรือ benchmark dashboard

## 2. MVP Functions

จำกัดเพียง 4 กลุ่ม:

1. **Browse and Open** - ดูรายการ Comparison Sets และเปิด Workspace เดิม
2. **Search** - ค้นจากชื่อ Set, Provider หรือ Model ด้วยช่องเดียว
3. **Filter** - สถานะและช่วงเวลาแบบ preset ที่จำเป็น
4. **Basic Management** - Rename และ Delete Comparison Set โดยไม่ลบ child images

การเลือก Winner, zoom/pan, Add to Collection, reference actions และรายละเอียด prompt ยังคงอยู่ใน Comparison Workspace ไม่ทำซ้ำใน Dashboard

## 3. Application Navigation Direction

เริ่มสร้าง Application Shell/Menu กลางที่รองรับ modules ในอนาคต โดย MVP แสดงเมนูเท่าที่มีจริง:

```text
ModelPromptForge
  Studio
  Image History
  Comparisons
```

ข้อกำหนด:

- desktop ใช้ compact sidebar หรือ top navigation ตาม theme ที่ผ่าน design review
- mobile ใช้ drawer/menu button และไม่บัง primary action
- active page เห็นชัดและรองรับ keyboard
- menu item มาจาก navigation/module registry contract ไม่ hardcode กระจายหลายไฟล์
- feature flag/entitlement กำหนด visibility ได้ แต่ server authorization ยังคงจำเป็น
- menu structure ต้องพร้อมเพิ่ม Projects, Assets, Fashion Selling และ Account ใน Phase 2 โดยไม่เปลี่ยน shell ใหม่
- ห้ามแสดงเมนูอนาคตที่ยังใช้งานไม่ได้

Route แนะนำ:

```text
/studio
/history
/comparisons
/comparisons/:setId
```

หาก MVP ปัจจุบันยังใช้ static SPA สามารถใช้ client router หรือ History API fallback ได้ แต่ deep link และ browser Back/Forward ต้องทำงาน

## 4. Dashboard Layout

```text
[Menu]  Comparison History
        [Search name, provider or model...] [Status] [Date]

        [preview mosaic]  Fashion Model Test
                          Completed 3/3
                          Gemini · OpenAI · Grok
                          14 Jul 2026
                          [Open]

        [Load More]
```

Card requirements:

- preview mosaic สูงสุด 3 thumbnails จาก Requirement 021
- ภาพที่เหลือแสดง `+N`
- loading icon/skeleton และ fade-in
- ชื่อ Set
- status พร้อม completed/total
- Provider/Model summary แบบสั้น
- วันที่อัปเดตล่าสุด
- primary action `Open`
- overflow menu มีเฉพาะ `Rename` และ `Delete`

ห้ามแสดง full prompt, configuration JSON, technical errors หรือทุก Run บน card

## 5. Search and Filters

### 5.1 Search

- ช่องเดียวค้นจาก normalized Set name, Provider display name และ Model display name
- debounce ประมาณ 300 ms
- abort request เก่าเมื่อ query เปลี่ยน
- Enter ต้อง submit ได้และมี clear button
- empty query คืนรายการล่าสุด

### 5.2 Filters

Status:

- All
- Completed
- Partial/Failed
- Processing

Date:

- All time
- Last 7 days
- Last 30 days

ไม่เพิ่ม advanced query builder, credit range, winner-only หรือ custom date picker ใน MVP

## 6. Browse and Open Behavior

- default เรียงล่าสุดก่อน
- โหลดครั้งละ 24 Sets ผ่าน Requirement 021
- `Load More` แสดงเฉพาะเมื่อ `hasMore=true`
- card click หรือ Open นำไป `/comparisons/:setId`
- Workspace โหลด full Set detail หลัง route เปิดเท่านั้น
- browser Back กลับมาที่ query, filters, cursor/page และ scroll position เดิม
- Comparison ที่กำลัง process แสดง live status แบบ polling contract เดิม
- status chip และ Background Queue parent card ยังคงเป็นทางลัดสำหรับ active Run

## 7. Basic Management

### 7.1 Rename

- เปิด shared AppDialog
- validate ชื่อ 1-100 characters ฝั่ง client และ server
- update card โดยไม่ reload ทั้งหน้า

### 7.2 Delete Set

- เปิด confirmation AppDialog อธิบายว่าภาพและ History จะไม่ถูกลบ
- delete เฉพาะ Comparison Set/Run metadata
- child History, original, thumbnail และ Collection membership ยังคงอยู่
- หากลบ Set ที่เปิดอยู่ ให้กลับ `/comparisons` และล้าง active-set recovery link

## 8. Empty, Loading and Error States

- initial loading ใช้ skeleton cards ไม่ใช่หน้าว่าง
- no data แสดงข้อความและ action กลับ Studio เพื่อสร้าง Comparison
- no search result แสดง query/filter summary และ Clear Filters
- API error รักษารายการที่โหลดแล้วและแสดง Retry
- thumbnail error แสดง placeholder ตาม Requirement 021
- deleted/missing Set deep link แสดง not-found state พร้อมกลับ Dashboard

## 9. Performance and Data Boundaries

- ใช้ Comparison summary endpoint จาก Requirement 021 เท่านั้น
- Dashboard ห้ามโหลด full Set detail ล่วงหน้า
- ไม่เกิน 3 thumbnail requests ต่อ visible card
- pagination, lazy loading, DOM boundaries และ request cancellation ใช้ shared implementation จาก Requirement 021
- query/filter state อยู่ใน URL เพื่อ deep link และ browser navigation
- client cache summary pages ได้ระยะสั้น แต่ต้อง invalidate หลัง rename/delete หรือ completion update

## 10. Accessibility and Localization

- ข้อความใหม่มี `en` และ `th`
- navigation มี landmark และ active-page semantics
- mobile drawer คุม focus และ Escape ได้
- search มี label ที่มองเห็นหรือ accessible name ชัดเจน
- status ไม่ใช้สีอย่างเดียว
- card overflow menu รองรับ keyboard
- loading state ใช้ `aria-busy`; completion update ใช้ live region อย่างเหมาะสม
- fade-in ปิดเมื่อ reduced motion

## 11. Modular Direction

```text
client/
  shell/
    applicationShell.js
    navigationRegistry.js
    router.js
  comparisons/
    comparisonDashboard.js
    comparisonFilters.js
    comparisonSummaryCard.js
    comparisonApi.js
```

Navigation registry contract ตัวอย่าง:

```json
{
  "id": "comparisons",
  "label": { "en": "Comparisons", "th": "เปรียบเทียบ AI" },
  "route": "/comparisons",
  "icon": "compare",
  "order": 30,
  "featureFlag": "aiComparison"
}
```

icon ต้องมาจาก icon system ของแอป ไม่รับ HTML จาก configuration และ route ต้องผ่าน allowlist

## 12. Implementation Steps

### Phase A: Shell and Route Foundation

- [ ] inventory entry points และ modal/deep-link behavior ปัจจุบัน
- [ ] เพิ่ม Application Shell และ Navigation Registry
- [ ] เพิ่ม routes Studio, Image History และ Comparisons
- [ ] รองรับ Back/Forward และ direct route fallback

### Phase B: Dashboard

- [ ] เพิ่ม Comparison Dashboard page
- [ ] เชื่อม paginated summaries และ thumbnail previews จาก Requirement 021
- [ ] เพิ่ม Search, Status filter และ Date preset
- [ ] เพิ่ม loading/empty/error states

### Phase C: Actions and Recovery

- [ ] เปิด Workspace จาก card/deep link
- [ ] restore Dashboard URL state และ scroll position เมื่อ Back
- [ ] เพิ่ม Rename/Delete ผ่าน AppDialog
- [ ] ซ่อม active comparison chip เมื่อ Set ถูกลบ

### Phase D: Verification

- [ ] route/deep-link/browser navigation tests
- [ ] search/filter request cancellation tests
- [ ] pagination and lazy thumbnail browser tests
- [ ] desktop/mobile navigation accessibility checks
- [ ] Thai/English checks

## 13. Acceptance Criteria

1. ผู้ใช้เปิด Comparison จากสองวันหรือหลายสัปดาห์ก่อนได้จากเมนู `Comparisons`
2. Dashboard มีเพียง Browse/Open, Search, Filter และ Rename/Delete
3. list ใช้ paginated summary และไม่โหลด full Set details
4. card แสดงไม่เกิน 3 lazy thumbnails พร้อม loading state/fade-in และ `+N`
5. Search ค้นชื่อ, Provider หรือ Model และยกเลิก request เก่าเมื่อพิมพ์ต่อ
6. Filter รองรับสถานะและ Last 7/30 days โดย state อยู่ใน URL
7. เปิด Workspace แล้ว Back กลับมาที่ตำแหน่งและ filters เดิม
8. Delete Set ไม่ลบ child images, History, thumbnails หรือ Collection membership
9. menu รองรับ desktop/mobile, keyboard และ feature registration ในอนาคต
10. เพิ่ม module/menu ใหม่ได้ผ่าน Navigation Registry โดยไม่แก้ layout ของทุก page

