# คู่มือ BytePlus Seed Audio สำหรับ Dub & Sub Studio

คู่มือการเชื่อมต่อและทดลองสำหรับผู้พัฒนา ลำดับการใช้งานใน Studio เป็นแบบที่กำหนดสำหรับการพัฒนา ชื่อในแอปใช้ `dola-seed-audio` ส่วนค่า model ใน request คือ `seed-audio-1.0` เป็น HTTP API สร้างเสียงแบบ non-streaming รองรับภาษาไทยและจีน [BytePlus Audio 1.0](https://docs.byteplus.com/en/docs/byteplusvoice/seedaudio-01?lang=en)

## ลองสร้างเสียงหนึ่งประโยคด้วย PowerShell

1. เปิด BytePlus Console ด้วยบัญชีที่เปิดใช้ Seed Speech สร้าง API key แล้วตั้งเป็น secret ใน environment ของ process ตัวอย่างใช้ชื่อ `BYTEPLUS_SEED_SPEECH_API_KEY` สำหรับ shell นี้ การส่งคำขอจริงมีค่าบริการ
2. เปิด PowerShell ในโฟลเดอร์ที่จะเก็บไฟล์ตัวอย่าง รันคำสั่งด้านล่างเมื่อพร้อมทดลอง แต่ละครั้งที่ส่งเป็นคำขอสร้างใหม่

```powershell
if (!$env:BYTEPLUS_SEED_SPEECH_API_KEY) { throw 'Set the Seed Speech API key first.' }
$headers = @{
  'X-Api-Key' = $env:BYTEPLUS_SEED_SPEECH_API_KEY
  'X-Api-Request-Id' = [guid]::NewGuid().ToString()
}
$payload = @{
  model = 'seed-audio-1.0'
  text_prompt = 'ผู้หญิงพูดภาษาไทยด้วยน้ำเสียงสงสัยเบา ๆ ว่า “คนในโรงเตี๊ยมนี้หายไปไหนกันหมด”'
  audio_config = @{ format = 'wav'; sample_rate = 24000; enable_subtitle = $true }
} | ConvertTo-Json -Depth 5
$response = Invoke-RestMethod -Method Post -TimeoutSec 120 -Headers $headers -ContentType 'application/json; charset=utf-8' -Uri 'https://voice.ap-southeast-1.bytepluses.com/api/v3/tts/create' -Body ([Text.Encoding]::UTF8.GetBytes($payload))
if (!$response.audio) { throw "Seed Audio returned no audio. Code: $($response.code). $($response.message)" }
$file = Join-Path (Get-Location) ("take-{0}.wav" -f $headers['X-Api-Request-Id'])
[IO.File]::WriteAllBytes($file, [Convert]::FromBase64String($response.audio))
$response.subtitle.sentences | Select-Object start_time,end_time,text
Write-Output $file
```

3. เปิด WAV ฟังการอ่านจริง เทียบ `duration` กับความยาว cue หากมี subtitle ให้นำเวลาระดับประโยคหรือคำซึ่งเป็นมิลลิวินาทีมาบวกเวลาเริ่ม cue เช่น cue เริ่ม 12,000 ms และคำเริ่มที่ 300 ms ให้แสดงที่ 12,300 ms บน timeline

## การใช้กับงานพากย์

- เริ่มด้วย text-only ตามตัวอย่าง จำกัด prompt ที่ส่งจริง 3,000 ตัวอักษร และเสียงที่สร้างได้สูงสุด 120 วินาทีต่อคำขอ แยกงานละครเป็นประโยคเพื่อแก้เทคเฉพาะจุด
- สำหรับ reference audio เรียง references ให้ตรงกับ `@Audio1`, `@Audio2` ใน prompt โดยเริ่มที่ 1 หากใช้ reference image ให้ส่งเฉพาะข้อความที่จะพูดใน text_prompt ตรวจชนิด reference ตาม schema ของ BytePlus ก่อนเปิดโหมดนั้น
- ใน editor ที่เสนอ ให้เลือกประโยค → ตัวละคร → โมเดล Seed Audio → Preview → ฟังพร้อมภาพ → เลือกใช้เทคบนแทร็ก หรือกด Save เพื่อเพิ่มเข้าคลัง ใช้เสียงอ้างอิงที่ได้รับสิทธิ์จากเจ้าของ ตรวจความต่อเนื่องของเสียงและการออกเสียงก่อนใช้เทค
- ฝั่ง integration เก็บไฟล์ผ่าน media owner ทันทีที่ได้เสียง URL ที่ provider คืนมีอายุ 2 ชั่วโมง ใช้ `duration` จัดคลิป และเก็บ `original_duration` สำหรับตรวจยอดกับ billing ของ provider เวลาใน subtitle อ้างถึงเสียงที่สร้าง ส่วนการถอดบทจากวิดีโอต้นฉบับใช้ ASR ของระบบ [BytePlus response fields](https://docs.byteplus.com/en/docs/byteplusvoice/seedaudio-01?lang=en)
- เมื่อถูกปฏิเสธ ให้ตรวจสิทธิ์ Seed Speech, header และ model ID เมื่อ timeout หลังส่งแล้ว ให้เก็บ operation ID กับ request ID เพื่อตรวจสถานะก่อนสร้างซ้ำ การมี request ID เพียงอย่างเดียวไม่ยืนยันว่าคำขอซ้ำจะคิดเงินครั้งเดียว

## สร้างเทคใน Editor

1. เปิดประโยคในโปรเจกต์ เลือกภาษาบทพากย์ แล้วเปิดแผงกำกับเสียง เลือก Dola Seed Audio 1.0 และตัวละครหรือเสียงสำเร็จรูป ตัวอย่างเสียงไทยคือ Elle และ Angpao ส่วนภาษาจีนเลือก Vivi หรือ Yichen ได้
2. ใส่บทที่จะให้ตัวละครพูดในประโยค เลือกอารมณ์ ความเข้ม จังหวะ และเขียนคำกำกับแยกจากบทพูด ระบบส่ง Speaker ID ใน `references[0].speaker` และใช้ `@Audio1` ในคำกำกับโมเดล
3. กด **ดูราคาเทค** แล้วตรวจเพดานเครดิต กด **สร้างเทค** เพื่อเริ่มงาน ขั้นนี้ล็อกราคาสำหรับเสียงสูงสุด 120 วินาที เมื่อสำเร็จระบบคิดจาก `original_duration` ที่ BytePlus รายงาน และคืนยอดจองส่วนเกิน ปัจจุบันราคาฐานต่อวินาทีคือ 0.0025 USD ก่อนคำนวณตามนโยบายเครดิตของระบบ [BytePlus Audio 1.0 pricing](https://docs.byteplus.com/en/docs/byteplusvoice/audiopricing)
4. กด **ฟังเทค** เพื่อฟังไฟล์ที่ได้ กด **ใช้เทคนี้** เพื่อวางลงไทม์ไลน์ของภาษาที่เลือก กด **เก็บเข้าคลัง** เมื่ออยากใช้เทคในคลังเสียง ตรวจเวลาเทคเทียบกับความยาวประโยคก่อนส่งออก

รายการเสียงที่เปิดใช้เก็บใน `server/config/voice-studio/voices.v1.json` และผูกรหัสเสียงกับภาษาที่รองรับ นำ Speaker ID เพิ่มได้จาก [BytePlus Voice List](https://docs.byteplus.com/en/docs/byteplusvoice/tts-voice-list) เมื่อปรับเรตราคาใน `server/config/credit-pricing-policy.json` ให้โหลด service ใหม่เพื่อใช้กับใบเสนอราคาครั้งถัดไป

อ่านขั้นตอนทั้งโปรเจกต์ใน [ข้อกำหนด Dub & Sub Studio](008-dub-sub-studio.md)
