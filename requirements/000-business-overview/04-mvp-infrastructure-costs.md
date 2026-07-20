# 04 - MVP Infrastructure Costs

## 1. Recommended MVP architecture

```text
Cloudflare CDN / DNS
        |
DigitalOcean VPS
Node.js API + background worker
        |
Supabase PostgreSQL + Auth
        |
Cloudflare R2 private image storage
```

ไม่ต้องใช้ GPU เพราะ provider ประมวลผลภาพให้ ไม่ต้องใช้ Kubernetes และยังไม่ต้องแยก Redis/worker server ใช้ PostgreSQL job queue เช่น pg-boss ในช่วง Pilot

## 2. Fixed monthly cost

คำนวณด้วย 35 บาท/USD

| รายการ | Specification | บาท/เดือน |
|---|---|---:|
| Application server | DigitalOcean 1 vCPU, RAM 2GB, SSD 50GB | 420 |
| Weekly server backup | 20% ของ Droplet | 84 |
| Database + Auth | Supabase Pro | 875 |
| Object storage reserve | Cloudflare R2 | 100 |
| CDN/DNS/SSL | Cloudflare Free | 0 |
| Transactional/support email | Free tier หรือ reserve | 0-100 |
| Monitoring | Sentry/Uptime free tier | 0 |
| Domain amortization | เฉลี่ยรายเดือน | 60 |
| Cloud/FX contingency | ประมาณ 20% | 350-400 |
| **รวม** | | **1,900-2,100** |

การทำบัญชีเองและใช้ email support ทำให้ยังไม่ต้องใส่ค่าใช้จ่ายเงินสดของ accountant และโทรศัพท์ แต่ควรบันทึกเวลาที่ใช้เป็น founder labor

## 3. Storage assumption

ลูกค้าเฉลี่ยต่อเดือน:

- Generated images 60-70 ภาพ x 2MB = 120-140MB
- Reference images 10-15 ภาพ x 3MB = 30-45MB
- Thumbnail/metadata ประมาณ 10MB
- รวมประมาณ 175MB/customer/month

| Paying customers | เพิ่มต่อเดือน | สะสม 3 เดือน |
|---:|---:|---:|
| 50 | 8.75GB | 26GB |
| 100 | 17.5GB | 53GB |
| 200 | 35GB | 105GB |
| 500 | 87.5GB | 263GB |

R2 Standard ราคา 0.015 USD/GB-month มี free tier 10GB และ egress ฟรี ค่า storage จึงไม่ใช่ความเสี่ยงหลักใน MVP

## 4. Retention policy

- Temporary upload: 24 ชั่วโมง
- Reference ที่ไม่ถูกบันทึก: 30 วัน
- Generated history: 90 วัน
- Favorite/Collection ของผู้ใช้จ่ายเงิน: เก็บจนผู้ใช้ลบหรือ account policy กำหนด
- Thumbnail: เก็บคู่กับ active asset
- Account deletion: queue ลบไฟล์และ metadata พร้อม audit record

## 5. Security minimum

- R2 private bucket และ signed URL
- จำกัด file type, dimensions และขนาด
- Malware/content validation ก่อนส่ง provider
- Encrypt secrets และแยก API key ตาม environment
- Idempotent ChillPay webhook
- Ownership check ทุก asset/project
- Daily database backup และทดสอบ restore
- Rate limit การสมัคร, upload และ generation

## 6. Scaling triggers

เพิ่มเครื่องหรือแยก worker เมื่อ:

- Memory ใช้เกิน 75% ต่อเนื่อง
- CPU เกิน 70% ต่อเนื่อง
- Queue delay เกิน 2 นาทีโดยไม่ได้เกิดจาก provider
- Web request ถูกงาน background รบกวน
- มี 200-500 active paying users หรือมี campaign batch พร้อมกันจำนวนมาก

ขั้นต่อไปคือ VPS 4GB/2 vCPU หรือแยก web กับ worker ไม่ควรกระโดดไป Kubernetes ก่อนมีปัญหาจริง

## 7. Sources

- [DigitalOcean Droplet pricing](https://www.digitalocean.com/pricing/droplets)
- [Supabase pricing](https://supabase.com/pricing)
- [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/)

