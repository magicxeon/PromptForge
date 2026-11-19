# VS-01 — UX/UI และขั้นตอนใช้งาน

Parent: [Basic release](000-master.md). Revision 2 source implemented; browser evidence in 005.
Previous source used tall rows with expandable delivery and a separate event dropdown.
User feedback rejects that arrangement. The layout below supersedes that refinement;
earlier viewport checks in 005 establish no-overflow only, not acceptance of this redesign.

## 1. ขอบเขตหน้าจอ

เพิ่มเมนู Voice Studio ใน Create ผ่าน route registry เดิม ใช้ app shell, token,
theme และภาษาเดิม ไม่ปรับหน้า Playground, Cinematic หรือขนาด font ทั้งเว็บ
อ้างอิง [visual language](../Knowledge/ui-design-system-and-visual-language.md)
หน้าจอเป็นเครื่องมือทำงานที่เน้นบทพูด ไม่ใช่หน้า marketing

Desktop ประมาณ 1440px:

```text
Voice Studio              [บทพากย์] [เสียงของฉัน] [คลังไฟล์เสียง]
[เปิดบท ▾] ชื่อบท · บันทึกอัตโนมัติ                     [เล่นทั้งบท]
บทพูดเรียงเป็นแถว                                     ตั้งค่าแถว 02 · รินรดา
01 [อัครเดช ▾] บทพูด...                       [▶] [⋯] เสียง [ชื่อเสียง ▾]
02 [รินรดา ▾]                                         อารมณ์ / จังหวะ / วิธีพูด
   [ถอนหายใจ] [หัวเราะ] [สูดหายใจ] [เว้นจังหวะ] [+]   คำกำกับเพิ่มเติม
   ┌ บทพูดที่แก้ไข · แทรกเสียงตรงเคอร์เซอร์ ┐          โมเดล (ใช้กับทั้งบท)
   └──────────────────────────────────────┘          [ขั้นสูง]
   พร้อมสร้าง · จำนวนอักษร          [สร้างเสียงแถวนี้]
   ▶ 00:00 / 00:08  Take 1 ▾ [ใช้ในบท] [เก็บเข้าคลัง]
[+ เพิ่มบทพูด]
[▶ เล่นทั้งบท] [หยุด] แถว 02 / 06
```

- Desktop: editor ยืดได้, inspector ประมาณ 280–320px; รายการบทเปิดจาก “เปิดบท”
  เป็น drawer ไม่เพิ่ม sidebar ถาวรซ้อน app shell; active row เท่านั้นที่ขยายเครื่องมือ
- Tablet 768–820px: editor เต็มพื้นที่; ตั้งค่าเปิดเป็น sheet ตามแถว ไม่บีบ textarea
- Mobile 390px: หนึ่งคอลัมน์ แถวเป็น card; รายการเอกสาร/ตั้งค่าเป็น sheet/dialog
  ไม่ยัด desktop table; ปุ่มสำคัญมีข้อความ กดได้ ไม่ล้นด้านข้าง
- แถบเล่นเสียงไม่บังแถวหรือคีย์บอร์ดมือถือ ไม่ใช้ footer คงที่ถ้าพื้นที่ไม่พอ
- Detail/Take list เปิดเฉพาะแถวที่ใช้งาน ลดความแน่นโดยไม่ซ่อนสถานะ error
- ชื่อ navigation เป็นคำนาม; “สร้างเสียง” ใช้กับ action ที่ส่ง generation เท่านั้น
- แถวที่ไม่ได้เลือกแสดงตัวละคร บท 1–2 บรรทัด สถานะเสียง ปุ่มฟัง และเมนูเพิ่มเติม
  แถว error มีข้อความสั้นอ่านได้แม้ไม่ active. เปลี่ยนแถวไม่ทำ draft/selection หาย
- Row toolbar และ Generate อยู่กับบทเสมอ; inspector ไม่ทำสำเนาปุ่ม Generate อีกชุด
- บท autosave, “ใช้ในบท” และ “เก็บเข้าคลัง” แสดงผลต่างกัน ไม่มีปุ่ม Save กำกวม
- Duplicate/delete/reorder/clear Take อยู่ในเมนูเพิ่มเติม; keyboard มีปุ่มย้ายขึ้น/ลง
- Model picker เป็นค่าเดียวของเอกสาร ต้องเขียนขอบเขต “ใช้กับทั้งบท” แม้อยู่ inspector

### 1.1 Reference และขอบเขตการนำมาใช้

ผู้ใช้ยืนยัน ElevenLabs. ศึกษา official product guides วันที่ 2026-11-15:
[Text to Speech](https://elevenlabs.io/docs/eleven-creative/playground/text-to-speech),
[Studio](https://elevenlabs.io/docs/eleven-creative/products/studio),
[Voice Design](https://elevenlabs.io/docs/eleven-creative/voices/voice-design).
Text to Speech เน้นช่องบทและการเลือกเสียง; Studio มี contextual sidebar ตามสิ่งที่เลือก;
Voice Design แยกการออกแบบ ฟังตัวอย่าง และบันทึกเสียง. ใช้หลักนี้เป็น reference ของ layout
ข้างต้น ไม่ใช่อ้างว่าเป็นสำเนา pixel-exact ของหน้าที่ล็อกอิน. ภาพประกอบ official:
[TTS reference](https://elevenlabs.io/docs/_fern-files/_img/32b6abef4b76c8652b0e55dbb26c9694fdc82e191a062678b93c9a5ca5d80c94.webp).
รอบ requirement อ่าน product guides ได้ แต่ยังไม่ได้ตรวจ authenticated UI หรือ render
ภาพ reference สำเร็จใน environment นี้; ตรวจภาพเทียบก่อนปิดงาน implementation.
ไม่มี timeline, AI agent, music/SFX, ElevenLabs provider หรือการกด Play เพื่อซื้อ generation.

## 2. ขั้นตอนหลัก

1. เปิดหน้า → empty state มี “สร้างเอกสารบทพูด”; ไม่มี generation อัตโนมัติ
2. สร้างเอกสาร → แถวแรกว่าง เลือก model เริ่มต้นจาก server catalog
3. เลือกตัวละคร/เพิ่มตัวละครจากแถว → ชื่อ + สี + เสียงสำเร็จรูปหรือ Custom Voice
   ที่บันทึกแล้วและรองรับโมเดล; ใช้ซ้ำหลายแถวได้โดยไม่ต้องออกจากบท
4. พิมพ์บท เลือกอารมณ์/วิธีพูด/จังหวะ แทรกแท็กตามตำแหน่งเคอร์เซอร์
5. กด “สร้างเสียง” เมื่อข้อมูลครบ; แสดงต้นทุน/สถานะจากเจ้าของ Credits
6. สร้างสำเร็จ → มี Take และระยะเวลาจริง; ผู้ใช้กดฟังเอง ไม่มี autoplay หลังงานเสร็จ
7. เลือก Take → กด “บันทึกเข้าคลัง”; เก็บไฟล์เดิมพร้อม snapshot บทและค่าที่ใช้
8. ดาวน์โหลด WAV จาก Take หรือคลัง; กลับมาเปิดเอกสารแล้วพบงานเดิม

“บันทึกบท” (autosave), “เลือก Take” และ “บันทึกเสียงเข้าคลัง” เป็นสถานะแยก
บันทึกเสียงสำเร็จไม่แสดงเสมือนบทที่ยัง save ไม่สำเร็จถูกเก็บแล้ว

## 3. แถวบทพูด

หนึ่ง row มี stable ID, enabled, characterPresetId, text, delivery และ selectedTakeId
แสดงลำดับ ตัวละคร บท สถานะ และปุ่มหลัก; actions รองอยู่ในเมนู

- Enter/Shift+Enter ใน textarea เป็น newline ภายในแถว ไม่สร้างแถวหรือ submit
- “เพิ่มบทพูด” เพิ่มหลังแถวที่เลือก คัดลอกเฉพาะตัวละคร แล้ว focus ช่องบทใหม่
- Thai IME composition และการพิมพ์ Space/Enter ไม่ trigger Generate หรือ playback shortcut
- Duplicate คัดลอกบทและ setting แต่ไม่คัดลอก Take/job/selection หรือเรียก API
- Reorder ใช้ drag และปุ่มขึ้น/ลงสำหรับ keyboard; focus คงตาม row ID
- แทรก tag เป็นข้อความใน textarea ที่ selection/caret ไม่ใช้ HTML และ undo ได้
- Vocal tag ใช้ป้ายแปลภาษา + token จริงที่ดูได้; unsupported tag มี inline error
- ตัวละครที่ถูกใช้อยู่ archive ได้; การลบต้องไม่ทำให้แถวหรือ Take สูญเสีย snapshot
- ไม่มี numeric pitch/speed/emotion slider ที่อ้างเป็น native API ถ้ายังไม่มี capability
- ช่องอารมณ์/จังหวะ/วิธีพูดเป็น preset เขียน style พร้อมข้อความอิสระสั้นๆ
- บทว่าง/มีเพียงช่องว่างไม่ให้สร้าง; vocal-event-only เป็นงานภายหลัง

### 3.1 Voice events อยู่ในเครื่องมือเขียนบท

- วาง toolbar **เหนือ textarea และในกรอบ editor เดียวกัน** ของ active row.
  มีปุ่มข้อความสั้นสำหรับ event ที่ใช้บ่อยจาก config และ “เพิ่มเติม” เปิด popover
  แบบค้นหา/เลือกหมวดได้. ไม่มี select ที่ต้องเลือกค่าแล้วกด Insert อีกครั้ง
- เลือก event ครั้งเดียวแทรก token ของ provider ที่ caret ล่าสุดใน row นั้นทันที;
  ถ้าเลือกข้อความไว้ ให้แทรกก่อนข้อความโดยเก็บข้อความเดิม. หากยังไม่เคยวาง caret
  ให้ต่อท้ายบท. ห้ามแทรกเข้าอีก row หรือเลื่อน viewport ไปต้นหน้า
- Toolbar เก็บ selection ก่อน focus ย้าย; ปิด popover แล้วคืน caret หลัง token;
  Escape ยกเลิกไม่แก้บท. Undo/Redo ต้องย้อนหนึ่ง insertion ได้และไม่ทำ Thai IME เสีย
- เช่น “ตกใจ” แสดงคำอธิบาย “แทรก <gasp> ณ จุดที่เลือก”; token เป็นข้อความแก้/ลบได้
  ไม่ใช้ HTML. ตัวอย่างใน popover เป็นบทสั้น ไม่ต้องให้ผู้ใช้รู้ syntax ล่วงหน้า
- หมวด “ปฏิกิริยาเสียง / การหายใจ / จังหวะพัก” และรายการมาจาก capabilities/policy.
  Event เป็นสิ่งที่เกิด ณ ตำแหน่งในบท; อารมณ์/การพูดทั้งแถวอยู่ inspector
- บนมือถือปุ่ม wrap ภายใน editor; เพิ่มเติมเป็น sheet ที่คืน focus ได้. Unsupported
  event ไม่อยู่ในปุ่ม; token เก่าที่ไม่รองรับให้แก้/เอาออกได้พร้อม inline error
- เลือก event, เปลี่ยน style หรือเสียง ไม่สร้างเสียงอัตโนมัติ; Take เก่าคงอยู่พร้อม stale badge

## 4. Take, player และคลัง

**Voice Manager อยู่ในรุ่นแรก**; revision 2 ย้ายเป็นแท็บ “คลังไฟล์เสียง” และ
ย้าย character presets ไป “เสียงของฉัน” โดยคง route/ข้อมูล/actions เดิม:

- ทั้งสองแท็บเปิดใช้งานได้แม้ยังไม่ได้เลือกเอกสาร; ไม่ซ้อนแท็บจัดการเสียงอีกชั้น
- คลังแสดง search + ปุ่มกรอง + จำนวนผลลัพธ์ก่อนรายการ; filter ขั้นสูงอยู่ popover/sheet
  พร้อม active filter chips และล้างตัวกรอง. ห้ามวางเจ็ด filter กล่องใหญ่เหนือไฟล์
- รายการเน้น Play/Pause, ชื่อ, ตัวละคร, ระยะเวลา และเก็บเข้าคลัง/ดาวน์โหลด;
  rename/tags/delete/snapshot อยู่เมนูเพิ่มเติม. ฟังแล้วไม่เปลี่ยน selected Take
- ไฟล์เสียงมี filter “ทั้งหมดที่สร้างสำเร็จ / บันทึกเข้าคลังแล้ว” และค้นหาชื่อ/แท็ก
  กรองเอกสาร ตัวละคร โมเดล และเรียงล่าสุด/ชื่อได้ ใช้ pagination เดิม
- รายการแสดงชื่อ ตัวละคร แหล่งบท โมเดล ระยะเวลา วันที่สร้าง และสถานะบันทึก
- เปลี่ยนชื่อและติดแท็กเพื่อจัดหมวด เช่น “ตอนที่ 1”, “เสียงเล่าเรื่อง”;
  รุ่นแรกใช้แท็ก ไม่เพิ่มระบบ folder ซ้อนกัน
- ฟัง บันทึกเข้าคลัง ดาวน์โหลด WAV ดู snapshot และเปิดบทต้นทางจากรายการได้
  ถ้าบท/row ถูกลบให้แจ้งว่าไม่มีต้นทาง แต่ไฟล์ที่คงอยู่ยังฟังได้
- ลบทีละรายการพร้อมยืนยันชื่อและผลกระทบ; ตรวจการใช้งานอีกครั้งฝั่ง server
  ถ้าเป็น selected Take ให้กลับไปเปลี่ยน/ยกเลิก selection ก่อน ไม่ลบแล้วทิ้ง pointer เสีย
- เปลี่ยนชื่อ/แท็กไม่เปลี่ยนบทหรือ bytes ของเสียง; Save ไม่สร้างไฟล์ซ้ำ
- หมวดเสียงตัวละครเพิ่ม/แก้ preset และ archive ได้; การแก้ไม่เปลี่ยน Take ที่สร้างแล้ว
- บน desktop เป็นรายการพร้อม action menu; mobile เป็น card ไม่บังคับเลื่อนตารางแนวนอน
- Filter/rename/delete ไม่ reset scroll; ล้มเหลวคงรายการพร้อม retry และ error ใกล้ action

- Take แสดงลำดับ วันเวลา โมเดล ความยาว และค่าบท/การแสดงที่ใช้จริง
- Take แรกเลือกให้อัตโนมัติเฉพาะเมื่อยังไม่มี selection; Take ใหม่ไม่ทับที่เลือกไว้
- ฟัง Take อื่นไม่เปลี่ยน selection; ปุ่ม “ใช้ Take นี้” แยกจาก Play
- บทหรือ preset เปลี่ยน → badge “เสียงนี้มาจากบท/ค่าก่อนหน้า” พร้อมดู snapshot
- Save เข้าคลังเป็น idempotent; กดซ้ำหรือ timeout/retry ไม่สร้าง asset/รายการซ้ำ
- Library แสดงเฉพาะ Take ที่สร้างสำเร็จตาม filter และแบ่งหน้า; งานล้มเหลวอยู่ใน log
- ไม่มีแถว preview เปล่าสำหรับงานล้มเหลว; error อยู่ที่แถวงานพร้อม Retry/support ID
- player มี Play/Pause, seek, elapsed/duration; เล่นได้ทีละตัว เมื่อเปลี่ยนเอกสารให้หยุด
- เล่นตามลำดับใช้ selected Take ของแถว enabled ตามลำดับปัจจุบัน เป็น client playback
  ไม่เรียก TTS หรือสร้างไฟล์รวม; หากแถวไม่มีเสียง ให้ระบุแถวและรอให้สร้าง/เลือก Take
  หรือปิด enabled ของแถวนั้นก่อน ไม่ข้ามบทที่ขาดเสียงโดยอัตโนมัติ
- Freeze sequence ตอนเริ่มเล่น; แก้บท/ลำดับ/selection ระหว่างเล่นให้หยุดและแจ้งว่าบทเปลี่ยน
- ใช้เสียงของบทเก่าระหว่าง play sequence ต้องแสดงสถานะก่อนเริ่ม ไม่สับเปลี่ยน Take เงียบๆ
- Browser autoplay rejection มีปุ่มเล่นต่อ ไม่ถือเป็น generation failure

## 5. สถานะและ recovery

| เหตุการณ์ | UI และการกู้คืน |
|---|---|
| โหลดเอกสาร/catalog | สถานะ accessible; ไม่ล้าง editor ของเอกสารเดิมระหว่าง refetch |
| draft กำลังบันทึก/สำเร็จ | ข้อความใกล้ชื่อเอกสาร ไม่ใช้ toast ทุก keystroke |
| autosave fail/offline | เก็บข้อความในหน้า แจ้งยังไม่บันทึก พร้อม Retry และเตือนก่อนออก |
| revision conflict | ไม่ overwrite; ให้เก็บสำเนาฉบับ local หรือเปิด server version |
| queued/running | ProcessingSpinner + สถานะ; disable Generate เฉพาะ row ที่มีงาน |
| text เปลี่ยนระหว่าง generate | job ใช้ snapshot เดิม; result ถูกแสดงเป็น Take ของ revision เดิม |
| fail/timeout | เก็บบทและ Take เดิม; retry เฉพาะแถวนั้น ไม่ auto-buy another attempt |
| uncertain provider outcome | ใช้สถานะกำลังตรวจสอบจาก Generation; ไม่ส่งซ้ำทันที |
| model/voice unavailable | แจ้งที่ setting, เลือกใหม่ก่อนสร้าง; Take เดิมยังฟังได้ |
| session หมดอายุ | หยุด private playback/reads; ใช้ auth recovery เดิม ไม่ปล่อยข้อมูลข้าม actor |
| Save audio fail | Take ที่สร้างแล้วยังฟัง/ลอง save ซ้ำได้ ไม่ต้องสร้างใหม่ |

โต้ตอบในหน้าแล้วต้องไม่ reset scroll/focus, ไม่ remount editor จาก query invalidation
และไม่เปลี่ยน selection ตาม job ที่เพิ่งเสร็จในแถวอื่น

## 6. Accessibility / component reuse / verification

ใช้ component ที่ตรวจพบ: `web/src/components/ui/` (Button, ProcessingSpinner,
AsyncState, StatusNotice, ConfirmDialog, Surface) และ
`web/src/components/generation/GenerationModelPicker.tsx` ตาม public props
ที่รองรับ catalog จริง ไม่ cast ข้าม schema. Route metadata อยู่ที่
`web/src/app/routeRegistry/routes.ts`
ไม่พบ audio player ที่ reuse ได้จาก scoped UX inspection จึงเสนอ feature-owned player
MediaExportButton/API ปัจจุบันเป็น image-oriented; ห้ามอ้างว่าดาวน์โหลด audio ได้แล้ว
`web/src/features/cinematic/components/authoring/DialogueSoundEditor.tsx` เป็นตัวอย่าง
การเรียงบท แต่ผูกกับ Shot/Cast จึงไม่ย้ายมาเป็น Voice Studio editor
`web/src/components/profiles/CharacterPickerDialog.tsx` ผูกกับ Core Character จึงไม่ใช้
แทน voice preset dialog. ใช้ namespace `voice-studio` ใน i18n manifest พร้อม TH/EN parity

Label ทุก control, focus-visible, icon buttons มี accessible name, status ใช้ live
region ที่ไม่ประกาศทุก keystroke, error ไม่พึ่งสีเพียงอย่างเดียว, keyboard เล่น/เลือก/
เรียงแถวได้, touch targets เหมาะกับมือถือ, reduced motion และ theme เดิมต้องทำงาน
ข้อความ UI ผ่าน react-i18next; voice/model ID และบทผู้ใช้ไม่อยู่ใน translation files

Acceptance: workflow ข้อ 2 ทำจบด้วย keyboard และ touch; ตรวจ empty/loading/error/
saved/stale Take ที่ 390/820/1440px ทุก theme ที่เปิดใช้; tab order ไม่หลงใน drawer;
สร้างแถวหนึ่งไม่ทำให้บทหรือเสียงอีกแถวหาย; Refresh แล้ว restore revision ที่ server บันทึก

UX design evidence: `/root/voice_studio_ux` ตรวจ charter, visual language, shared UI,
navigation, Cinematic dialogue และ image export contracts แบบ read-only แล้ว
ข้อเสนอถูกนำมารวมในเอกสารนี้; เป็น design review ไม่ใช่ browser acceptance

## 7. เสียงของฉัน และ Custom Voice Design

ขอบเขตที่ผู้ใช้ยืนยัน: ออกแบบตัวตนเสียงจากคำบรรยายและเก็บใช้ซ้ำ ไม่ใช่เพียงบันทึก
style ของเสียงสำเร็จรูป. Revision 2 ไม่รวมอัปโหลด/อัดเสียงอ้างอิง, voice cloning หรือ remix;
Voice Replication เป็นส่วนเพิ่มเติมที่ยัง planned ในข้อ 8.

1. “เสียงของฉัน” แสดงเสียงที่บันทึกไว้พร้อมชื่อ ประเภท (สำเร็จรูป/ออกแบบเอง),
   ภาษา คำบรรยายสั้น ฟังตัวอย่าง และตัวละครที่ใช้. ค้นหาได้; เพิ่มตัวละครเป็น action รอง
2. ปุ่มหลัก **สร้างเสียงใหม่** เปิดฟอร์ม Voice Design: ชื่อเสียง, คำบรรยาย,
   ภาษา และตัวช่วยเขียนบุคลิกเสียง เช่น ช่วงวัย น้ำเสียง สำเนียง เนื้อเสียง.
   ตัวช่วยเป็น prompt hints ไม่อ้างว่าเป็น native sliders ของ Google
3. แสดงตัวอย่างคำบรรยายไทยที่แก้ได้; บุคลิกพื้นฐานกับอารมณ์รายประโยคแยกกัน
4. **ออกแบบเสียง** ส่งคำขอครั้งเดียวโดยแสดงค่าใช้จ่าย/วงเงินจาก Credits ใกล้ปุ่ม.
   pending ยังคงคำบรรยาย, ไม่มีผลปลอม; error/reconciliation แสดงตรงฟอร์ม
5. สำเร็จแสดงตัวอย่างที่ provider คืน: **ฟังตัวอย่าง / บันทึกเสียงนี้ / ออกแบบใหม่**.
   เริ่มหนึ่ง candidate ต่อคำขอ; ไม่สมมุติว่า Google คืนสามแบบเหมือน ElevenLabs
6. **บันทึกเสียงนี้** เก็บ custom voice เดิม ไม่เรียกออกแบบซ้ำ. สำเร็จมี “ใช้กับตัวละคร”
   ถ้าเปิดจาก row ให้คืนบทและ row เดิม แล้ว apply เฉพาะเมื่อผู้ใช้เลือกยืนยันใช้
7. “ลองด้วยบทของฉัน” หลังมีเสียงแล้วเป็น synthesis แยก มีต้นทุนชัดเจน;
   “ฟังตัวอย่าง” เล่น asset เดิม ไม่มีค่า synthesis ซ้ำ
   Implementation ใช้ “ใช้กับตัวละคร” แล้วเปิด editor เดิมเพื่อทดลองบท;
   ไม่สร้าง audition pipeline ซ้ำ. Dialog มี Pause/seek/time/Stop คุม audio element เดิม
8. เปลี่ยนชื่อ/คำอธิบายแสดงผลไม่เปลี่ยนตัวตนเสียง; แก้ design prompt เพื่อออกแบบใหม่
   สร้าง version/เสียงใหม่ ไม่ทับตัวละครหรือ Takes เดิม
9. Archive ซ่อนจากตัวเลือกใหม่โดยรักษา refs เดิม; ลบถาวรระบุผลต่อการสร้างครั้งต่อไป
   ตรวจ references/active operations ฝั่ง server และใช้ confirmation เดิม.
   เสียงหมดอายุหรือ provider หาไม่พบให้เลือกเสียงใหม่; ไฟล์ Take เดิมยังฟังได้

เลือกเสียงใช้ dialog แบบค้นหาได้ มีหมวด “เสียงสำเร็จรูป / เสียงของฉัน” แสดงชื่อ/ภาษา/
ชนิด/ตัวอย่างพร้อมปุ่ม “ใช้เสียงนี้”. ไม่บังคับเข้า Manager เพื่อสร้าง preset แรก.
แยก Character preset (ตัวละครในบท) กับ Custom Voice (ตัวตนเสียงที่หลายตัวละครใช้ได้).
ถ้าเปลี่ยนเสียงของ preset ที่ใช้หลายแถว ต้องบอกผลกระทบก่อน save; งาน accepted และ
Takes เก่าไม่เปลี่ยน. สถานะ loading/empty/error/quota/expired/unauthorized ต้องมีทางออก
โดยไม่ปิด editor เดิม. ใช้ shared dialogs/buttons/status/spinner, feature player และ API
client เดิม; แยก VoiceEventToolbar, RowInspector, VoicePicker และ VoiceDesignForm
เฉพาะเมื่อ responsibility ต้องการ ไม่เพิ่มชุด UI framework ใหม่.

### 7.1 กล่องสถานะการสร้างเสียง — อนุมัติให้ implement พร้อมแก้ recovery

คำขอจากภาพหน้าจอผู้ใช้: ใน dialog **Create new voice** ให้จัดข้อความสถานะ
ที่ปัจจุบันอยู่ใต้ปุ่ม Design voice และปุ่ม Check status ให้อยู่ในกล่องเดียวกัน.
ขอบเขตเฉพาะการนำเสนอสถานะใน VoiceDesignForm; ไม่เปลี่ยนขั้นตอนสร้างเสียงหรือ Credits.

- กล่องมีพื้นหลัง ขอบ และระยะห่างที่แยกจากฟอร์มชัดเจนตาม theme ของระบบ.
- ข้อความสถานะอยู่ด้านซ้าย และปุ่ม **Check status** อยู่ด้านขวาภายในกล่องเดียวกัน
  ไม่วางปุ่มแยกใต้ข้อความนอกกล่องอย่างในภาพปัจจุบัน.
- Operation/support ID เป็นข้อมูลรองในกล่อง ยังคัดลอกได้ และตัดบรรทัดได้โดยไม่ดัน
  ปุ่มออกนอกกล่อง; ข้อความยาวต้องไม่ทับหรือเบียดปุ่มจนกดไม่ได้.
- หน้าจอแคบให้ข้อความตัดบรรทัดและปุ่มยังชิดขวาภายในกล่อง; หากพื้นที่ไม่พอ
  ให้ปุ่มลงแถวถัดไปภายในกล่องเดียวกัน โดยไม่มี horizontal overflow.
- ระหว่างกดตรวจสอบ ใช้ ProcessingSpinner และสถานะ accessible พร้อมป้องกันการกดซ้ำ;
  ผลตรวจอัปเดตในกล่องเดิม ไม่ทำให้ฟอร์ม ข้อความที่กรอก หรือ scroll หาย.
- Check status ตรวจงานเดิมเท่านั้น ไม่สร้างเสียงใหม่หรือเรียกเก็บค่า generation ใหม่.

เกณฑ์ตรวจเมื่อ implement: สถานะรอตรวจสอบ/กำลังตรวจ/ตรวจไม่สำเร็จอ่านได้ในกล่องเดียว
และปุ่มเข้าถึงได้ด้วย keyboard/touch ที่ 390/820/1440px รวมข้อความและ ID ยาว.
สถานะสำเร็จยังเข้าสู่ฟังตัวอย่าง/บันทึกเสียงตาม flow เดิม.

กรณี provider ส่งเสียงแล้วแต่ยังปิดยอด Credits ไม่สำเร็จ ต้องแจ้งว่าเสียงสร้างแล้ว
และกำลังรอตรวจยอด ไม่ใช้ข้อความเหมือน provider ยังสร้างเสียงอยู่. Check status
เรียก recovery ของงานเดิม; ถ้าสำเร็จให้แสดงตัวอย่างและปุ่มบันทึกตาม flow เดิม.

### 7.2 Filters และเมนู Studio — ขอบเขตที่อนุมัติเพิ่ม

- ปุ่ม Filters ในคลังเสียงมี padding และขนาดกดเหมาะสม ใช้ไอคอน/สถานะเปิดปิดชัดเจน
  ไม่เป็นปุ่มแคบจนข้อความชิดขอบ; search, จำนวนผลลัพธ์ และตัวกรองยังใช้งานร่วมกันได้.
- Voice Studio ใช้ไอคอนสื่อถึงเสียง และ submenu สำหรับ บทพากย์ / เสียงของฉัน / คลังเสียง
  ผ่าน navigation owner เดิม. เปิดลิงก์ตรงและ Back/Forward ได้โดยไม่ล้าง draft.
- Studio เดิมเปลี่ยนชื่อเป็น Character & Scene Studio พร้อมคำแปล และไอคอนต่างจาก
  Voice Studio. คง Face Creator / Character Sheet / Scene Builder และ route เดิม.
- ตรวจ mobile/tablet/desktop และการเลือกเมนู active; ไม่เปลี่ยน sibling navigation อื่น.

### 7.3 My Voices — ปุ่มจัดการและความชัดเจนของการ์ด (บันทึกไว้ก่อน)

สถานะ 2026-11-16: ผู้ใช้ขอจดปัญหาจากภาพหน้าจอ ยังไม่อนุมัติให้แก้ UI ในรอบนี้.
More / details ดูเหมือนข้อความธรรมดา ทำให้หาการจัดการเสียงได้ยาก และพื้นหลัง
การ์ด/ปุ่มกลืนกับพื้นหน้า จึงแยกขอบเขตและลำดับข้อมูลได้ลำบาก.

- แสดง More / details เป็นปุ่มที่เห็นชัดว่ากดได้ มีพื้น/ขอบ ระยะกดและไอคอน
  เปิดเมนู พร้อมสถานะ hover, focus และเปิด/ปิดที่ชัดเจน ใช้รูปแบบปุ่มของระบบ.
- แยกพื้นหน้า พื้นการ์ด ขอบการ์ด และปุ่มด้วย design tokens ของ theme เดิม
  ให้มองเห็นขอบเขตได้โดยไม่ต้อง hover; ข้อความรองและสถานะยังอ่านง่าย.
- จัดลำดับชื่อเสียง ประเภท/สถานะ คำบรรยาย ตัวละครที่ใช้งาน และแถวปุ่มให้สแกนง่าย
  โดยคง Listen to sample, Use with character และเมนูแก้ไข/Archive/Restore/Delete เดิม.
  ไม่เปลี่ยนเงื่อนไขลบ การยืนยัน หรือข้อมูลเสียงจากงานด้าน presentation นี้.
- ขอบเขตเฉพาะการ์ดเสียงใน My Voices และปุ่มจัดการ ไม่รวม redesign ทั้งหน้า
  เปลี่ยน typography ทั้งเว็บ หรือแก้ flow Voice Replication.

เกณฑ์ตรวจเมื่อได้รับคำสั่ง implement: ผู้ใช้เห็นทันทีว่า More / details เป็นปุ่ม
และแยกแต่ละการ์ดกับปุ่มออกจากพื้นหลังได้; ข้อความ/controls มี contrast ตาม
accessibility ของระบบ ใช้ keyboard/touch ได้ และไม่ซ้อนหรือล้นที่ 390/820/1440px.
Checkpoint: บันทึก requirement เท่านั้น; architecture map unchanged;
ไม่แก้ source/config/runtime data และไม่รัน tests/build.

### 7.4 ต้องกด Save ก่อนแสดงเป็นเสียงที่บันทึก (บันทึกไว้ก่อน)

สถานะ 2026-11-16: ผู้ใช้ขอเพิ่ม requirement เท่านั้น ยังไม่แก้ implementation.

- สร้างเสียงสำเร็จยังเป็น candidate สำหรับฟังตัวอย่างในขั้นตอน Create new voice
  ไม่เพิ่มการ์ดลง My Voices หรือแสดงเป็นเสียงที่บันทึกใน Voice Studio โดยอัตโนมัติ.
- ต้องกด **Save / บันทึกเสียงนี้** และบันทึกสำเร็จก่อน จึงแสดงใน My Voices
  และให้เลือกใช้กับตัวละครผ่าน voice picker ได้. ใช้กฎเดียวกันทั้ง From text
  และ From audio ในอนาคต; สถานะสร้างสำเร็จไม่เท่ากับสถานะบันทึกแล้ว.
- ปิด dialog, เปลี่ยนหน้า, reload หรือผล background job สำเร็จไม่ถือเป็นการ Save.
  หาก Save ล้มเหลว ให้คง candidate และปุ่มลองบันทึกอีกครั้งในขั้นตอนสร้างเสียง
  โดยยังไม่เพิ่มเข้ารายการ; กดซ้ำหรือ retry สำเร็จต้องไม่สร้างรายการซ้ำ.
- ข้อมูล operation/candidate ที่จำเป็นต่อ recovery และหลักฐานค่าใช้จ่ายยังเก็บ
  ตาม lifecycle เดิมได้ การไม่แสดงในรายการไม่ได้หมายถึงลบข้อมูลเบื้องหลังทันที.
  ไม่เปลี่ยนการเก็บไฟล์บทพูด Takes หรือเสียงสำเร็จรูปจาก requirement นี้.

เกณฑ์ตรวจเมื่อ implement: สร้างสำเร็จแล้วไม่กด Save ต้องไม่มีรายการใหม่ใน My Voices
หรือ voice picker แม้ reload; Save สำเร็จจึงปรากฏหนึ่งรายการ; Save ล้มเหลวไม่เผยแพร่
candidate เป็นเสียงที่บันทึก และเสียงที่เคยบันทึกไว้ยังแสดงตามเดิม.
Checkpoint: requirement only; architecture map unchanged; ไม่แก้ source/config/data
และไม่รัน tests/build.

### 7.5 Dropdown เลือกตัวละครอ่านตัวเลือกไม่ออก (บันทึกไว้ก่อน)

สถานะ 2026-11-16: บันทึกจากภาพผู้ใช้เท่านั้น ยังไม่แก้ UI.
ใน dropdown เลือกตัวละครของแถวบทพูด ตัวเลือกที่ไม่ได้เลือกเป็นข้อความสีอ่อน
บนพื้นขาวจนแทบมองไม่เห็น ขณะที่รายการที่เลือกอยู่ยังอ่านได้.

- เมื่อเปิด dropdown ต้องอ่านชื่อทุกตัวเลือกได้โดยไม่ต้องเลือกหรือ hover ก่อน
  รวม Choose character และ + Add character; แยก disabled ออกจากรายการที่กดได้
  โดยข้อความยังอ่านได้ ไม่ใช้สีจางจนหายไปกับพื้นหลัง.
- กำหนดสีข้อความและพื้นหลังให้เข้าคู่กันทั้งสถานะปกติ selected, hover และ focus
  รวมตอนปิด dropdown ตาม theme ของระบบ; คง keyboard navigation และ focus ที่เห็นชัด.
- ขอบเขตคือ dropdown เลือกตัวละครใน Voice Studio; คงรายการ การเลือกตัวละคร
  และ action เพิ่มตัวละครเดิม ไม่เปลี่ยนข้อมูลหรือขั้นตอนใช้งานอื่น.

เกณฑ์ตรวจเมื่อ implement: รายการที่เลือก/ยังไม่เลือกและข้อความภาษาไทยอ่านได้ครบ
ทั้งเมื่อเปิดและปิด dropdown บน browser/OS ที่เกิดปัญหา และที่ 390/820/1440px
โดยไม่ถูกตัดหรือบัง; ตรวจด้วย keyboard และ touch ตามอุปกรณ์.
Checkpoint: requirement only; architecture map unchanged; ไม่แก้ source/config/data
และไม่รัน tests/build.

## 8. Revision 3 — สร้างเสียงจากต้นแบบ (requirement draft)

### 8.1 วิธีสร้างและประเภทเสียง

ใน dialog Create new voice เดิมมีตัวเลือกสองแบบอยู่บนสุดก่อนกรอกข้อมูล:

| วิธีสร้าง | Icon จากชุดเดิม | ข้อมูลหลัก |
|---|---|---|
| จากข้อความ / From text | `FileText` | ชื่อ คำบรรยาย โมเดล ภาษา ตาม Voice Design เดิม |
| จากเสียงต้นแบบ / From audio | `AudioLines` | ชื่อ โมเดล คลิปต้นแบบ คลิปยินยอม ภาษาคลิปและภาษาที่จะลองพูด |

แสดง icon + localized label ข้างชื่อใน My Voices, voice picker, รายละเอียดและเสียงที่
ผูกกับตัวละคร. ใช้ discriminator ที่บันทึกจริง ไม่เดาจากชื่อไฟล์หรือคำบรรยาย.
เสียงสำเร็จรูปใช้ประเภท Prebuilt แยกจากสองแบบนี้; เสียง designed เดิมอ่านเป็น From text.
ห้ามพึ่งสีหรือ tooltip อย่างเดียว; icon ตกแต่งใช้ aria-hidden และ label อ่านได้.
การเพิ่ม badge ไม่อนุมัติ redesign การ์ด/แบ่งหน้าคลังเสียงทั้งหน้าในรอบนี้.

### 8.2 ฟอร์ม From audio

1. ชื่อเสียงและโมเดล → กล่องอัปโหลด **เสียงต้นแบบ** → กล่องอัปโหลด **เสียงยินยอม**
   เป็นสองช่องแยกกัน. ทั้งคู่มีชื่อไฟล์ เวลา เล่น/หยุด เปลี่ยนและลบไฟล์ก่อนส่ง.
   รุ่นแรก upload files; การอัดจากไมโครโฟน/ตัดเสียงใน browser แยกเป็นงานถัดไป.
2. อธิบายเงื่อนไข Google เฉพาะใกล้สองช่องนี้ โดยลิงก์ provider evidence ใน 003.
   ผู้พูดต้นแบบและผู้พูดยินยอมต้องเป็นคนเดียวกัน. แสดงข้อความ consent ตามภาษาที่เลือก
   จากชุดที่ตรวจสอบแล้ว; checkbox อย่างเดียวไม่แทนคลิปยินยอม.
3. เลือกภาษาคลิปต้นแบบ/ภาษา consent แยกจากภาษาบทพูดปลายทาง เช่น จีน → ไทย.
   ไม่ตีความภาษา source เป็นข้อบังคับให้ทุกบทในอนาคตต้องพูดภาษานั้น.
4. ตรวจไฟล์และขนาด/ระยะเวลาตาม configuration ก่อนส่ง พร้อมข้อความผิดพลาดที่ช่องนั้น.
   ใช้ WAV เป็น baseline; codec อื่นแสดงให้เลือกเมื่อ decode/validate ได้จริง.
   ไม่เรียก provider เมื่อเพียงเลือกไฟล์ เปลี่ยนวิธีสร้าง หรือฟังต้นฉบับ.
5. ปุ่ม **สร้างเสียงจากต้นแบบ** เริ่มงาน explicit ครั้งเดียว. ใช้กล่องสถานะข้อ 7.1
   พร้อม Check status ด้านขวา. แยก upload / verifying / creating / ready / failed /
   unknown outcome / settlement pending ตามข้อมูลจริง ไม่สร้าง progress ปลอม.
6. เมื่อได้เสียงแล้ว กดบันทึกได้แม้ยังไม่มี preview; แสดงใน My Voices/ใช้กับตัวละคร
   ได้หลัง Save สำเร็จเท่านั้นตามข้อ 7.4. ห้ามนำไฟล์ต้นแบบมา
   แสดงเสมือนเป็นเสียงสังเคราะห์. ส่วน **ทดลองบทพูด** มีข้อความ ภาษาและปุ่มสร้างแยก
   ผ่าน synthesis เดิม; เล่นผลเดิมซ้ำไม่สร้างงานหรือค่าใช้จ่ายใหม่.
7. ออกจาก dialog ระหว่างงานแล้วเปิดกลับใช้ operation เดิม. เปลี่ยนวิธีสร้างเก็บ draft
   ใน dialog ของแต่ละแบบ แต่ไม่อัปโหลดไฟล์ซ้ำหรือเปลี่ยนประเภทเสียงที่สร้างแล้ว.
   หลัง reload ไฟล์ที่ยังไม่อัปโหลดให้เลือกใหม่; ไม่เก็บ Base64 ใน browser persistence.

### 8.3 ขอบเขต UX ที่ต้องคงไว้

คง From text, บทพากย์, ตัวละคร, My Voices, คลังเสียงและ playback owner เดิม. ไฟล์ทั้งสอง
ใช้ player เดียวกันโดยเปลี่ยน source ตามผู้ใช้เลือก. รับมือ upload fail, ไฟล์ผิดชนิด,
consent ไม่ผ่าน, สิทธิ์โมเดลไม่รองรับ, quota และ timeout ในฟอร์ม ไม่เพิ่ม global banner.
ออกแบบกล่องไฟล์/สถานะให้ใช้งานได้ที่ 390/820/1440px และ TH/EN. ข้อความว่าเสียงจีนพูด
ไทยได้ดีหรือเสียงเหมือนต้นแบบ ต้องรอผลทดลองจริง ไม่ใช้ badge ผ่านการทดสอบล่วงหน้า.
