# Tag-Based Conflict Resolution (Implementation Plan)

## 🎯 Goal & Overview
พัฒนาระบบตรวจสอบความขัดแย้งของ Prompt เชิงความหมาย (Semantic Conflict Resolution) โดยใช้ระบบ Tags ที่มีอยู่แล้วใน JSON เป็นตัวตัดสิน และทำการตัด (Drop) ส่วนที่ขัดแย้งที่มีความสำคัญน้อยกว่าทิ้งไปในขั้นตอนประกอบ Prompt (Finalize) ก่อนส่งไปสร้างภาพ

## 🛠️ System Design (การออกแบบระบบ)

### 1. Conflict Rules (กฎความขัดแย้ง)
สร้างชุดกฎกำหนดคู่แท็กที่ขัดแย้งกัน (Mutually Exclusive Tags) เช่น:
- `indoor` vs `outdoor`
- `day` vs `night`
- `summer` vs `winter`
- `vintage` vs `futuristic` / `cyberpunk`

### 2. Category Priority (ลำดับความสำคัญ)
เมื่อเจอ 2 Options ที่มีแท็กขัดแย้งกัน ระบบจะต้องตัดสินใจว่าจะเก็บอันไหนและทิ้งอันไหน โดยใช้ระดับความสำคัญของ Category (หมวดหมู่) เช่น:
1. `environment` (สำคัญสุด เพราะเป็นฉากหลังหลัก)
2. `lighting` (แสงต้องล้อตามฉาก)
3. `camera` (มุมกล้องและสไตล์)
4. `clothing` (เสื้อผ้า)
5. `pose` (ท่าทาง)
*ตัวอย่าง*: ถ้า Environment มีแท็ก `outdoor` แต่ Lighting มีแท็ก `indoor` -> Environment ชนะ Lighting จะถูกตัดออกจาก Prompt ตอน Finalize

## 📋 Task Breakdown (แบ่งงาน)

### Task 1: สร้าง Tag Conflict Specification
- สร้างไฟล์ `attributes/spec/tag-conflicts.json` (หรือใส่ไว้เป็น Constant ใน `app.js`)
- กำหนด Array ของแท็กที่ขัดแย้งกัน (Conflict Pairs)
- กำหนด Priority weight ของแต่ละ Category

### Task 2: เขียนฟังก์ชัน Conflict Resolver ใน `app.js`
- สร้างฟังก์ชัน `resolveTagConflicts(selections)`
- ทำงานโดย:
  1. ดึง Tags จากทุกออพชั่นที่ User เลือก
  2. ตรวจสอบว่ามีแท็กคู่ไหนที่อยู่ใน Conflict Rules
  3. ถ้าเจอคู่ขัดแย้ง ให้เทียบ Priority ของ Category
  4. คืนค่า (Return) รายการ Selections ชุดใหม่ที่ตัดตัวแพ้ออกไปแล้ว

### Task 3: ปรับแก้ฟังก์ชัน `generatePromptText()`
- แทรกฟังก์ชัน `resolveTagConflicts()` เข้าไปก่อนที่จะเริ่ม Loop นำ Text มาต่อกัน (Assembly)
- ทำให้ Prompt ที่โชว์ในช่อง Live Preview เป็น Prompt ที่ถูกเกลาแล้ว (ไม่มีตัวขัดแย้ง)

### Task 4: เพิ่ม Visual Feedback ใน UI (Optional / Recommended)
- ถ้ามี Option ไหนถูกระบบหักล้าง (Dropped) ในช่อง Live Preview ควรมีลูกเล่น UI แจ้งเตือนผู้ใช้ เช่น:
  - ขีดฆ่าข้อความส่วนนั้น (Strikethrough) และเปลี่ยนเป็นสีเทา 
  - หรือมี Tooltip บอกว่า *"Dropped due to conflict with [Environment]"* เพื่อให้ผู้ใช้เข้าใจว่าทำไมข้อความถึงหายไป

### Task 5: อัปเดต Tags ใน JSON Data ให้สมบูรณ์
- ไล่ตรวจสอบและเติม Tags พื้นฐานในไฟล์ JSON ให้ครบถ้วนเพื่อให้ระบบนี้ทำงานได้จริง เช่น:
  - เติมแท็ก `indoor` / `outdoor` ให้ทุกสถานที่ใน `012-environment.json`
  - เติมแท็ก `day` / `night` ใน `013-lighting.json` และ Time of Day
  - เติมแท็กสภาพอากาศใน `010-clothing.json` (เช่น เสื้อโค้ทกันหนาว ควรมีแท็ก `winter`)

---

## 🛑 User Review Required
1. **การสร้างไฟล์ JSON ใหม่**: จะสร้าง `tag-conflicts.json` แยกไปเลย หรือจะเขียนเป็นตัวแปร (Constant) ใน `app.js` เลยดีครับ? (แนะนำใส่ใน `app.js` เลยถ้ากฎยังไม่เยอะมาก จะได้ลด Request)
2. **Visual Feedback**: การตัดข้อความใน Live Preview อยากให้ขีดฆ่าให้เห็นชัดเจนว่าถูกตัด (Strikethrough) หรือให้ซ่อนหายไปเลยเนียนๆ ดีครับ?
