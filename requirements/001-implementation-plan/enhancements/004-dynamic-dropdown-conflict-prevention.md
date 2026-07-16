# Task enhancements-004: Dynamic Dropdown Conflict Prevention & Exclusions

## 1. Goal
เพิ่มความสามารถให้ระบบ Mutual Exclusions ทำงานในลักษณะ **Two-Layer Defense**:

- **Layer 1 — Preventive UI**: เมื่อมีการเลือกตัวเลือกที่มีเงื่อนไขขัดแย้ง (`exclusions`) ระบบจะ **Disable** option ที่ขัดแย้งใน dropdown list ทุกตัวทันที โดยแสดงสัญลักษณ์ 🚫 นำหน้า และเป็นสีจาง — ผู้ใช้เห็นแต่คลิกเลือกไม่ได้
- **Layer 2 — Defensive Cleanup**: ถ้ามีการฝืนมีค่า Conflict ปรากฏขึ้น (เช่น โหลด Preset หรือ Import JSON ที่มีค่าขัดแย้ง) → `enforceExclusionRules()` ที่มีอยู่เดิมจะยังทำงาน auto-clear + flash animation ตามปกติ

---

## 2. Design Decisions (Q&A Confirmed)

| คำถาม | คำตอบที่ยืนยัน |
|---|---|
| ระบบ Preventive ใหม่ต้องทำงานพร้อมกับระบบ Defensive เดิม (enforceExclusionRules) ไหม? | ✅ ทำงานพร้อมกัน — ถ้ามีการเลือกแบบ "ฝืน" ต้องมีการแจ้งเตือน conflict ด้วย |
| ตัวเลือกที่ถูก Disabled จะแสดงในลักษณะใด? | ✅ แสดงอยู่ใน list แต่เป็นสีจาง + มีสัญลักษณ์ 🚫 (ผู้ใช้เห็นแต่คลิกไม่ได้) |

---

## 3. Logic Flow & Specifications

### A. Dynamic Option Disabling (Layer 1 — Preventive)
* **Trigger Points**: ฟังก์ชัน `updateDropdownExclusions()` จะถูกเรียกทุกครั้งที่:
  - ผู้ใช้เปลี่ยนค่า dropdown (change event)
  - โหลด Preset
  - Import JSON config
  - Randomize (Surprise Me)
  - Reset form
* **State Scan**: สแกน `state.selections` ปัจจุบันทั้งหมด ค้นหา item ใน `state.library` ที่ตรงกับ ID ที่เลือก
* **Exclusion Collection**: รวบรวม ID ทั้งหมดจาก `item.exclusions[]` ของทุก selection ที่ active ไว้ใน `activeExclusions` Set
* **Option UI Updates**: วนลูปทุก `<select>` และ `<option>` ใน `#form-container`:
  * หาก `option.value` อยู่ใน `activeExclusions`:
    * `option.disabled = true`
    * ดึงข้อความเดิมจาก `data-original-text` แล้วแสดงเป็น: `🚫 [Original Label]`
    * ใช้ CSS class `.option-conflicted` เพื่อแสดงสีจาง
  * หาก `option.value` **ไม่**อยู่ใน `activeExclusions`:
    * `option.disabled = false`
    * คืนค่าข้อความเดิมจาก `data-original-text`
    * ลบ CSS class `.option-conflicted`

### B. Label Preservation (ป้องกัน Label ซ้อนกัน)
เพื่อป้องกัน `🚫 🚫 🚫 [Label]` เมื่อ updateDropdownExclusions ถูกเรียกซ้ำ:
* ตอนสร้าง `<option>` ใน `renderForm()` ให้เซฟข้อความสุดท้ายก่อน append ไว้ใน `data-original-text`:
  ```javascript
  optionNode.setAttribute("data-original-text", optionNode.textContent);
  ```
* ทุกครั้งที่ `updateDropdownExclusions()` จะดึงข้อความจาก `data-original-text` เสมอ ไม่ดึงจาก `textContent` ปัจจุบัน

### C. Enforcement on Conflict-via-Preset/Import (Layer 2 — Defensive)
* `enforceExclusionRules()` ที่มีอยู่เดิม **ยังคงทำงานตามปกติ** ไม่ถูกลบหรือแก้ไข
* เพิ่มการเรียก `enforceExclusionRules(id)` ใน flow ของ `applyPreset()` และ `importConfigJSON()` ด้วย หากยังไม่มี
* เมื่อมีการ clear selection เกิดขึ้น → จะ trigger `updateDropdownExclusions()` อัตโนมัติผ่าน `updatePromptPreview()`

---

## 4. Proposed Changes

### [MODIFY] `renderForm()` ใน [app.js](file:///d:/development/ModelPromptForge/app.js)
ต่อจาก block ที่สร้าง `optionNode.textContent = ...` (บรรทัด ~476-482):
```javascript
// เพิ่มหลังจากกำหนด textContent แล้ว — ก่อน select.appendChild(optionNode)
optionNode.setAttribute("data-original-text", optionNode.textContent);
```

### [NEW] ฟังก์ชัน `updateDropdownExclusions()` ใน [app.js](file:///d:/development/ModelPromptForge/app.js)
สร้างฟังก์ชันนี้ตรงบริเวณใกล้ `enforceExclusionRules()` (~บรรทัด 844):
```javascript
// Preventive UI: disable/grey-out conflicting options in all dropdowns based on active selections
function updateDropdownExclusions() {
  // 1. Collect all actively excluded IDs from current selections
  const activeExclusions = new Set();
  Object.values(state.selections).forEach(sel => {
    if (sel.isCustom) return;
    const item = state.library.find(li => li.id === sel.id);
    if (item && item.exclusions) {
      item.exclusions.forEach(exId => activeExclusions.add(exId));
    }
  });

  // 2. Loop through all dropdown options and update disabled state + label
  document.querySelectorAll("#form-container .custom-select").forEach(select => {
    Array.from(select.options).forEach(option => {
      // Skip placeholder and custom write-in options
      if (option.value === "" || option.value === "__custom__") return;

      const originalText = option.getAttribute("data-original-text") || option.textContent;

      if (activeExclusions.has(option.value)) {
        option.disabled = true;
        option.textContent = `🚫 ${originalText}`;
        option.classList.add("option-conflicted");
      } else {
        option.disabled = false;
        option.textContent = originalText;
        option.classList.remove("option-conflicted");
      }
    });
  });
}
```

### [MODIFY] `updatePromptPreview()` ใน [app.js](file:///d:/development/ModelPromptForge/app.js)
เพิ่ม call ต่อท้ายฟังก์ชัน `updatePromptPreview()` (~บรรทัด 1020-1103):
```javascript
function updatePromptPreview() {
  // ... existing code ...
  updateDropdownExclusions(); // ← เพิ่มตรงนี้ก่อน return
}
```

### [MODIFY] `style.css` — เพิ่ม CSS class สำหรับ conflicted options
```css
/* Conflict-disabled option in dropdown */
.custom-select option.option-conflicted {
  color: var(--text-muted, #6b7280);
  font-style: italic;
  background-color: transparent;
}
```
> **หมายเหตุ**: การ style ตัว `<option>` มีข้อจำกัดในบาง browser (Chrome/Edge ไม่รองรับ color ใน option ได้ทุกกรณี) — ดังนั้น disabled + 🚫 prefix คือ visual feedback หลัก

---

## 5. Verification Plan

### A. Dropdown Option Disabling (Preventive)
1. เปิดหน้าเว็บและเลือกตัวเลือก **Location** เป็น **"Bustling Japanese Arcade"** (`environment.pop_06`)
2. เปิด accordion **Environment** → เปิด dropdown **Location** อีกครั้ง
3. ✅ ตัวเลือก **"Traditional Thai architecture"** (`environment.008`) ต้องแสดง `🚫 🏮 Traditional Thai architecture...` และ **คลิกไม่ได้**
4. เปลี่ยน Location กลับเป็นว่าง → ✅ ตัวเลือก Traditional Thai จะต้องกลับมาปกติ ไม่มี 🚫

### B. Preset Integration (Defensive)
1. กดเลือก Preset **"thaiSilk"** (มี Traditional Thai style)
2. เปิด dropdown **Location** → ✅ ตัวเลือก "Bustling Japanese Arcade" ต้องถูก disable อัตโนมัติ
3. ลองเปลี่ยน Location ไปที่ "Japanese Arcade" (ไม่ควรได้ เพราะ disabled)

### C. Import JSON Edge Case
1. Export config ที่มี Japanese Arcade เป็น JSON
2. แก้ JSON ด้วยมือให้มีทั้ง Japanese Arcade + Traditional Thai พร้อมกัน
3. Import JSON นั้นกลับเข้ามา
4. ✅ `enforceExclusionRules()` ควรล้าง Traditional Thai ออก + flash animation ปรากฏ
5. ✅ `updateDropdownExclusions()` ควร disable ตัวเลือกที่ขัดแย้งใน dropdown ทันทีหลัง import

### D. Label Integrity Test
1. เปิดและปิด exclusions ซ้ำๆ หลายครั้ง (เปลี่ยน Location ไปมา)
2. ✅ Label ต้องไม่มีการซ้อนกัน เช่น `🚫 🚫 Traditional Thai...` — ต้องคงเป็น `🚫 🏮 Traditional Thai...` เสมอ
