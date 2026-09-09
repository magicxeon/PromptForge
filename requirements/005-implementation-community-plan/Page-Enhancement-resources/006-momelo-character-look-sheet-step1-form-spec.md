# Momelo — Step 1 Character Look Sheet Form
## UX/UI specification for AI Developer

- Version: 1.0
- Date: 2026-09-08
- Status: Design handoff; not an implemented feature
- Scope: เฉพาะฟอร์ม Step 1 Character Look Sheet ใน Playground
- Visual reference: Mockup ล่าสุดในบทสนทนา ชื่อภาพ exec-62b15712-0533-417a-8b2b-b001bde8ba4c.png

## 1. เป้าหมายและขอบเขต

ปรับการแสดงผลฟอร์มเดิมให้ professional ใน Momelo Neon theme อ่านง่ายและแก้ไขข้อความยาวสะดวก โดยรักษาฟิลด์เดิม ข้อมูลที่ผู้ใช้กรอก และพฤติกรรมเชื่อมต่อระบบเดิม

จัดลำดับเป็น:
1. Character identity — ชื่อ อายุ และลักษณะภายนอก
2. Story & styling — บทบาท เสื้อผ้า และบุคลิก
3. Momelo Enhancement — การปรับ Prompt พร้อมตรวจราคาก่อนใช้งาน

ห้ามขยายขอบเขตไปแก้ Header, Sidebar, Footer, Step 2 Engine & Target Output, Step 3 Generate, Prompt preview, Render result หรือ Queue

ไม่มีการเพิ่มปุ่ม Generate, Next, Save หรือระบบ Wizard ใหม่ในฟอร์มนี้

### หลักการใช้ Mockup

- ภาพเป็นแนวทางลำดับข้อมูลและสไตล์ ไม่ใช่ขนาด CSS ที่ต้องขยายตามภาพ
- ข้อความ Narin และรายละเอียดตัวละครในภาพเป็นตัวอย่าง ห้ามนำไปทับค่าจริง
- ใช้ HTML controls และ shared components จริง ห้ามใช้ภาพ Screenshot แทนฟอร์ม
- เมื่อแสดงในคอลัมน์ซ้ายเดิม ให้ฟอร์มยาวขึ้นตามเนื้อหา ไม่ย่อฟอนต์เพื่อบังคับให้สูงเท่าคอลัมน์ Step 2
- การปรับครั้งนี้ไม่เปลี่ยน Prompt contract, AI provider, billing หรือ validation rules ที่ระบบมีอยู่

## 2. ปัญหาจากฟอร์มต้นฉบับและแนวปรับ

| ปัญหาที่เห็นจากภาพ | แนวปรับ |
| --- | --- |
| ชื่อ Character Look Sheet ซ้ำหลายระดับ | แสดงหัวข้อหลักครั้งเดียวภายใน Step 1 |
| Role และ Outfit อยู่สองคอลัมน์แคบ | เปลี่ยนข้อความยาวทุกช่องเป็นเต็มความกว้าง |
| Textarea เตี้ยและมี Scrollbar เล็ก | เพิ่มความสูงเริ่มต้นและอนุญาตขยายตามข้อความ |
| Enhancement คั่นก่อนข้อมูลบริบท | ย้ายกลุ่ม Enhancement ไปท้ายฟอร์ม |
| เส้นกรอบและพื้นหลังซ้อนหลายชั้น | ใช้ Panel เดียว แยกกลุ่มด้วยช่องว่างและเส้นบาง |
| Required และ Optional อ่านแยกยาก | ใช้เครื่องหมาย * และคำว่า Optional กำกับ Label |
| ข้อมูลลักษณะภายนอกกับเรื่องราวอยู่ปะปน | แบ่งเป็นสองกลุ่มพร้อมหัวข้อชัดเจน |

## 3. โครงสร้างฟอร์ม

| ลำดับ | ส่วน | เนื้อหา |
| --- | --- | --- |
| 1 | Form heading | STEP 1 + Character Look Sheet |
| 2 | Intro | Define your character’s appearance and story. |
| 3 | Required hint | * Required fields |
| 4 | Identity heading | Character identity + Choose existing character |
| 5 | Identity row | Character name และ Age |
| 6 | Appearance | Character Prompt เต็มความกว้าง |
| 7 | Story heading | Story & styling |
| 8 | Role | Role and situation เต็มความกว้าง |
| 9 | Outfit | Outfit เต็มความกว้าง |
| 10 | Personality | Personality เต็มความกว้าง |
| 11 | Enhancement | Switch + คำอธิบาย + Get enhancement price |

ใช้หัวข้อและเส้นแบ่งแบบเบา ไม่เพิ่ม Accordion สำหรับฟิลด์ที่ผู้ใช้ต้องกรอกเป็นประจำ

## 4. Field specification

| Field | Control | Required ตามภาพเดิม | Layout |
| --- | --- | --- | --- |
| Character name | Text input | ใช่ | กว้างประมาณ 75% ของแถว |
| Age | Numeric input | ใช่ | กว้างประมาณ 25%; มีพื้นที่พออ่าน |
| Choose existing character | Secondary button เปิด Picker เดิม | ไม่บังคับ | ข้างหัวข้อ Identity เมื่อพื้นที่พอ |
| Character Prompt | Multiline textarea | ใช่ | เต็มความกว้าง |
| Role and situation | Multiline textarea | ใช่ | เต็มความกว้าง |
| Outfit | Multiline textarea | ไม่บังคับ | เต็มความกว้าง |
| Personality | Multiline textarea | ไม่บังคับ | เต็มความกว้าง |
| Momelo Enhancement | Switch | เปิด/ปิดได้ตามระบบเดิม | ท้ายฟอร์ม |
| Get enhancement price | Secondary action button | ขึ้นกับ Enhancement state | เต็มความกว้าง |

Required status ข้างต้นอ้างอิงเครื่องหมายในภาพ หากระบบจริงมีเงื่อนไข Required ตาม Enhancement mode ให้คงเงื่อนไขเดิมและอัปเดต Label ให้ตรงกับสถานะ ห้ามเพิ่ม validation บังคับใหม่จากการตีความ Mockup

### Character name

- Label: Character name *
- Example: Narin
- ใช้ข้อจำกัดความยาวและการ Normalize ตามระบบเดิม
- รองรับภาษาไทย ไม่ตัดวรรณยุกต์ และไม่บังคับเป็นอักษรอังกฤษ

### Age

- Label: Age *
- Example: 26
- แสดง Label ภายนอกช่อง ไม่ใช้ Placeholder แทน Label
- ใช้ขอบเขตอายุและข้อจำกัดเดิมของ Backend
- อย่าเพิ่มขั้นต่ำอายุหรือเปลี่ยนเป็น Dropdown โดยไม่มี Requirement
- ขณะพิมพ์อนุญาตค่าว่างชั่วคราวเพื่อให้ผู้ใช้แก้ค่าได้
- แสดงข้อผิดพลาดเมื่อควร Validate ไม่ทำให้ผู้ใช้ติดอยู่ในค่าที่ลบไม่ได้

### Choose existing character

- Label: Choose existing character
- แสดง Optional ข้างปุ่มหรือในข้อความประกอบ
- ใช้ Picker เดิม ไม่สร้างระบบเลือกตัวละครขึ้นมาใหม่
- คง Mapping ว่าฟิลด์ใดถูกเติมจาก Character ตาม Logic เดิม
- การจัด Layout ใหม่ต้องไม่ทำให้ค่าผู้ใช้ถูก Reset เมื่อเปิด/ปิด Picker
- ถ้ามีขั้นตอนยืนยันการแทนค่าที่แก้แล้ว ให้คงขั้นตอนนั้น
- ไม่ใช้รูปโปรไฟล์หรือ Gallery ตัวละครขนาดใหญ่ในฟอร์ม Step 1

### Character Prompt

- Label: Character Prompt *
- Helper: Describe facial features, hair, skin tone and build.
- เป็นพื้นที่เด่นที่สุดของฟอร์ม
- Suggested min-height: 160–180px บน Desktop; 180px บนจอแคบ
- Padding: 12–16px; text size: 15–16px; line-height: 1.6
- คง limit 2,000 ตามภาพและตรวจว่าตรงกับ Backend
- แสดง Counter จริง เช่น 529 / 2,000 จากค่าปัจจุบัน หรือแสดง Max. 2,000 characters แบบ Mockup
- ห้าม Hardcode ค่า Counter จากภาพ
- ใช้วิธีนับความยาวเดียวกับระบบเดิม โดยเฉพาะภาษาไทยและ Unicode
- Cyan border ใน Mockup แทน Focus state; เมื่อ Blur ให้กลับกรอบปกติ
- ไม่ทำช่องอื่นที่ไม่ได้ Focus ให้เรืองแสงพร้อมกัน

### Role and situation

- Label: Role and situation *
- บทบาทและสถานการณ์ของตัวละคร แยกจากรายละเอียดรูปลักษณ์
- Suggested min-height: 104–120px
- เต็มความกว้าง
- ไม่อนุมาน Required dependency ใหม่จากตำแหน่งที่ย้าย
- Example placeholder: Describe the character’s background and current situation.

### Outfit

- Label: Outfit + Optional
- Suggested min-height: 88–104px
- เต็มความกว้าง
- Example placeholder: Describe clothing, colors and accessories.
- ไม่เพิ่มระบบเลือก Wardrobe หรือ Upload ภาพเสื้อผ้าใน Scope นี้

### Personality

- Label: Personality + Optional
- Suggested min-height: 88–104px
- เต็มความกว้าง
- Example placeholder: Describe temperament, habits and social behavior.
- ไม่เปลี่ยนช่องนี้เป็น Chip selector ที่จำกัดข้อความอิสระ

## 5. Momelo Enhancement

ย้ายมาต่อท้าย Story & styling เพื่อให้ผู้ใช้ใส่ข้อมูลครบก่อนตรวจราคา ทั้งหมดเป็นการย้ายตำแหน่ง UI ไม่เปลี่ยนการทำงานของ Service

### Anatomy

- Sparkle icon แบบเรียบ
- Heading: Momelo Enhancement
- Optional label
- Switch ทางขวา
- Helper: Refine the prompt using your character details.
- Action: Get enhancement price
- Supporting text: Review the price before applying enhancement.

### Behavior

- Default switch ใช้ค่าที่ระบบมีอยู่หรือค่า Draft ไม่บังคับเปิดทุกครั้งตามภาพตัวอย่าง
- OFF: แสดงคำอธิบายสั้นและซ่อน/Disable ปุ่มตรวจราคาตาม Pattern เดิม; ช่องข้อมูลตัวละครยังเก็บค่า
- ON, not priced: แสดง Get enhancement price
- Pricing: แสดง Loading ในปุ่ม ป้องกัน Request ซ้ำ
- Priced: แสดงราคาจริงและขั้นตอนถัดไปของระบบเดิม ห้ามแต่งตัวเลขราคา
- Applying: แสดงสถานะทำงานตาม Service เดิม
- Applied: แสดงสถานะสำเร็จเมื่อ Backend ยืนยันเท่านั้น
- Error: แสดงข้อความแก้ไขได้ พร้อม Retry; ไม่ลบ Prompt เดิม
- Input changed: หากระบบมี Quote/Enhanced result ที่ขึ้นกับข้อมูลเดิม ให้แสดงว่าต้องคำนวณใหม่ตาม Contract เดิม

ปุ่ม Get enhancement price ต้องเรียกตรวจราคาเท่านั้น ห้ามเปลี่ยนเป็นการหักเครดิตหรือ Apply Enhancement อัตโนมัติจากการออกแบบนี้

หากมีเงื่อนไขบล็อก Generate จน Enhancement เสร็จ ให้คงการส่งสถานะเดิมไปส่วน Generate ไม่ไปออกแบบ Step 3 ใหม่ และไม่สร้างสถานะ Ready ปลอมเพื่อให้ปุ่มใช้งานได้

## 6. Spacing และขนาด

| Element | Suggested CSS value |
| --- | --- |
| Panel padding | 24px; ลดเป็น 16px เมื่อพื้นที่แคบ |
| Panel radius | 14–16px |
| Group spacing | 24–32px |
| Label → control | 8px |
| Control → helper | 6–8px |
| Field → next field | 16–20px |
| Inline field gap | 12–16px |
| Single-line input height | 44–48px |
| Button minimum height | 44px ตามเป้าหมายการออกแบบ |
| Input radius | 8–10px |
| Main heading | 22–26px |
| Group heading | 18–20px |
| Label | 14px medium |
| Input/body | 15–16px |
| Helper/optional | 12–13px |

ไม่ลด Input text ตาม Scale ของภาพ Screenshot ให้คงค่าที่อ่านง่ายใน Browser จริง

### Textarea growth

- เติบโตตามเนื้อหาอย่างนุ่มนวล โดยมี min-height ตามตารางฟิลด์
- ให้ผู้ใช้ Resize แนวตั้งได้หาก Shared component รองรับ
- หลังสูงมากประมาณ 320–400px สามารถใช้ Internal scroll ได้
- อย่ากำหนดความสูงเล็กจนเห็นข้อความเพียงหนึ่งบรรทัด
- หาก auto-grow พร้อม manual resize มีพฤติกรรมขัดกัน ให้เลือก Pattern เดียวกับฟอร์มหลักของระบบ

## 7. Responsive ตามความกว้างของฟอร์ม

ให้พิจารณาความกว้างคอลัมน์ Step 1 ไม่ใช่เฉพาะ Viewport เพราะ Desktop อาจยังมี Step 2 อยู่ข้างกัน

| ความกว้างฟอร์ม | การจัดวาง |
| --- | --- |
| 640px ขึ้นไป | Heading และ Choose existing อยู่แถวเดียวกันถ้าพอ; Name/Age 3:1 |
| 420–639px | ปุ่ม Choose existing ลงบรรทัดใหม่; Name/Age ใช้ flexible name + age ประมาณ 96–112px |
| ต่ำกว่า 420px | Name/Age เรียงแนวตั้ง; ปุ่มเต็มความกว้าง; Required hint ลงบรรทัดใหม่ |

- ทุก Textarea เต็มความกว้างเสมอ
- ไม่มี Horizontal scrollbar ของฟอร์ม
- Optional label ต้องไม่เบียด Label จนอ่านไม่ได้
- ไม่เปลี่ยนตำแหน่งหรือความกว้าง Step 2 เพื่อชดเชยฟอร์มใหม่
- หาก Parent layout มี Fixed height ที่ทำให้เนื้อหาถูกตัด ให้แก้เฉพาะข้อจำกัดของ Step 1 หรือรายงาน Integration constraint แทนการแก้ทั้งหน้าโดยพลการ

## 8. Theme and visual styling

ใช้ Momelo tokens เดิมเป็นหลัก ค่าด้านล่างเป็นแนวทางให้จับคู่กับ Token ที่มีอยู่

| Semantic role | Suggested value |
| --- | --- |
| Panel background | #101624 |
| Input background | #0B101B |
| Border | #2A374B |
| Primary text | #F2F5FC |
| Secondary text | #AFBBD0 |
| Focus/accent | #20D5F5 |
| Step badge | Purple ตาม Momelo theme |
| Error | ใช้ semantic error token เดิม |

- Step badge เป็นจุดสีม่วงขนาดเล็ก
- Cyan ใช้กับ Focus, Switch ON และไอคอนกลุ่ม
- Get enhancement price เป็น Secondary outline/tinted button
- หลีกเลี่ยง Gradient เต็มพื้นที่ทุกฟิลด์
- ใช้ Flat surfaces และเส้นบาง ไม่ซ้อน Card หลายชั้น
- สีจริงต้องทดสอบ Contrast ใน DOM ไม่ถือว่าภาพ Mockup ผ่านมาตรฐานแล้ว

## 9. Component responsibility

| Component เสนอ | หน้าที่ |
| --- | --- |
| CharacterLookSheetStepOne | ผูก state และ callbacks เดิม |
| StepOneHeading | Badge, title, description, required hint |
| CharacterIdentityFields | Picker, name, age, appearance prompt |
| StoryStylingFields | Role, outfit, personality |
| EnhancementControls | Switch, price action, status เดิม |
| Shared FormField | Label, helper, error และ control id |
| Shared Textarea | ตัวกรอกข้อความและความสูง |
| Shared Switch | Toggle พร้อม keyboard support |

ใช้ชื่อเดิมของ Project หากมีอยู่ ไม่ต้อง Rename module หรือสร้าง Service ใหม่เพียงให้ตรงเอกสารนี้

## 10. State and integration contract

Logical field mapping; ไม่ใช่ Backend schema migration:

| Logical state | Existing source |
| --- | --- |
| characterName | Character name field |
| age | Age field |
| selectedCharacterId | Existing character picker |
| characterPrompt | Character Prompt field |
| roleAndSituation | Role and situation field |
| outfit | Outfit field |
| personality | Personality field |
| enhancementEnabled | Momelo Enhancement switch |
| enhancementStatus / price | Existing enhancement flow |

ข้อกำหนด:

- รักษา Controlled/uncontrolled pattern ของ Project
- ห้ามเปลี่ยน Key ที่ใช้ Draft persistence หรือ Prompt builder โดยไม่ทำ compatibility mapping
- ไม่เก็บสำเนา State แยกจน Step 1 กับ Prompt preview ข้อมูลไม่ตรงกัน
- การ Collapse/ย้าย Layout/Resize ต้องไม่ Unmount แล้วทำข้อมูลหาย
- การ Reorder ฟิลด์ใน UI ต้องไม่ Reorder Prompt packet โดยอัตโนมัติ
- ไม่เพิ่ม API endpoint, DB table หรือ billing rule สำหรับงานปรับ Form นี้
- ไม่มี autosave ใหม่ เว้นแต่ระบบมีอยู่แล้ว
- ห้ามนำตัวอย่าง Narin ไปเป็น Default ของ Draft ทุกคน

## 11. Validation, focus และ error states

- Keep existing validation timing and limits; prefer per-field inline feedback.
- Required marker และ aria-required ต้องตรงกับ Business rule ขณะนั้น
- แสดงข้อความ Error ใต้ฟิลด์ เช่น “กรุณาระบุชื่อตัวละคร”
- ไม่แสดง Error สีแดงทุกช่องทันทีที่เปิด Draft ว่าง
- ข้อมูลผิดให้แก้ได้โดยไม่ล้างฟิลด์อื่น
- เชื่อม Label ด้วย for/id และ Helper/Error ด้วย aria-describedby
- เมื่อ Validate ทั้งฟอร์มจาก Workflow เดิม ให้เลื่อนและ Focus ไปฟิลด์ผิดแรก
- Switch ใช้ Keyboard ได้และมี Accessible name
- ปุ่ม Picker และ Get enhancement price ใช้ type="button" เมื่ออยู่ใน form เพื่อป้องกัน Submit โดยไม่ตั้งใจ
- Loading status ประกาศผ่าน aria-live แบบสุภาพ ไม่อ่านข้อความยาวทั้งหมดซ้ำ
- Pending enhancement ไม่ควรล็อกทุกช่องโดยไม่มีเหตุผลจากระบบเดิม

## 12. Accessibility implementation

อิงแนวทาง W3C เรื่องการจัดกลุ่ม Form controls:

- ใช้ fieldset/legend หรือ semantic grouping สำหรับ Identity กับ Story & styling
- ใช้หัวข้อสั้นที่บอกกลุ่มได้ชัดและไม่ซ้ำกับทุก Label
- ออกแบบ Heading level ให้สัมพันธ์กับหน้าหลัก ไม่ Hardcode H1 ซ้ำใน Component
- Tab order ตรงกับ Visual order
- มี Focus indicator ชัดเจน
- Required/Optional ใช้ข้อความประกอบ ไม่ใช้สีอย่างเดียว
- Decorative icons ใช้ aria-hidden
- รองรับ Text zoom และภาษาไทยที่มีสระ/วรรณยุกต์
- Placeholder ไม่ทดแทน Label
- Target height 44px เป็น Design target ของโครงการ ไม่ใช่ข้อสรุปว่าทุก Control ของ WCAG AA ต้องสูงเท่านี้

## 13. Acceptance criteria

### Scope and functionality

- [ ] เปลี่ยนเฉพาะ Step 1 form; ส่วนอื่นของหน้าไม่มีการออกแบบใหม่
- [ ] ฟิลด์เดิมทุกช่องยังอยู่และค่า Draft ไม่หาย
- [ ] Character Look Sheet title ไม่ซ้ำภายในฟอร์ม
- [ ] Picker เดิมยังเปิดและเติมข้อมูลได้ตาม Mapping เดิม
- [ ] Validation และ Required dependency ไม่เปลี่ยน
- [ ] Prompt builder/preview ได้ข้อมูลเหมือนก่อนปรับ Layout
- [ ] Enhancement OFF/ON, price, pending, success, error เชื่อมสถานะเดิมครบ
- [ ] กด Get enhancement price ไม่ Submit Generate หรือหักเครดิตทันที

### Visual and responsive

- [ ] ชื่อ/อายุอยู่แถวเดียวเมื่อพื้นที่พอ
- [ ] Role, Outfit, Personality เป็นเต็มความกว้าง
- [ ] ช่องข้อความยาวอ่านได้หลายบรรทัด
- [ ] Enhancement อยู่ท้ายฟอร์ม
- [ ] Optional และ Required แยกชัด
- [ ] ใช้ Momelo shared tokens; ไม่เพิ่ม Glow หลายชั้น
- [ ] ฟอร์มใช้งานได้ที่ความกว้างประมาณ 320, 480, 640px
- [ ] คอลัมน์แคบบน Desktop ไม่ทำให้ปุ่มหรือ Label ล้น
- [ ] เนื้อหายาวไม่ถูกซ่อนเพื่อให้สูงเท่า Step 2

### Accessibility and verification

- [ ] Label/Helper/Error เชื่อมกับ Control ถูกต้อง
- [ ] Tab order ตรงกับการอ่าน และเห็น Focus
- [ ] Keyboard ใช้ Picker, Switch, price button ได้
- [ ] ข้อความไทยไม่ถูกตัดแนวตั้ง
- [ ] ตรวจ Contrast จาก CSS จริง
- [ ] ตรวจ Error และ Loading ด้วยบริการเดิมหรือ Controlled fixtures

## 14. วิธีส่งงานพัฒนา

1. ตรวจ Component, tokens, form state และ Enhancement flow เดิม
2. Reorganize markup และ CSS เฉพาะ Step 1
3. ใช้ Existing controls โดยปรับขนาดและ label grouping
4. ตรวจ Draft เดิม, Picker และ Callback ของ Prompt/Enhancement
5. ตรวจ Responsive และ Keyboard flow
6. ส่ง Screenshot ของ Step 1 แบบ Desktop column และ Mobile พร้อมสรุปไฟล์ที่เปลี่ยน

ไม่ต้องเพิ่มชุดทดสอบที่เพียงตรวจว่า CSS class ตรงตามที่เขียน ให้ใช้การตรวจ Layout และ regression ของพฤติกรรมที่มีความเสี่ยงจริง เช่น Draft values และ Price action ไม่ Submit

## 15. References and authority

- ภาพต้นฉบับและ Mockup ในบทสนทนานี้เป็นแหล่ง Requirement และ Visual direction
- [W3C WAI — Grouping Controls](https://www.w3.org/WAI/tutorials/forms/grouping/) รองรับแนวทางจัดกลุ่มทั้งทางสายตาและ semantics ด้วย fieldset/legend หรือ ARIA grouping

ข้อเสนอด้านขนาด ระยะห่าง สี และลำดับฟิลด์เป็นการออกแบบสำหรับ Momelo ไม่ใช่ค่าบังคับจาก W3C และเอกสารนี้ไม่ได้รับรองผล Accessibility ของหน้าเว็บที่ยังไม่ได้พัฒนา

