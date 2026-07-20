# 09 - Glossary

## A

### Activation
เหตุการณ์ที่แสดงว่าผู้ใช้ได้รับคุณค่าแรกจากระบบ สำหรับผลิตภัณฑ์นี้ควรเป็นการสร้าง Draft สำเร็จและเลือกอย่างน้อยหนึ่งภาพ ไม่ใช่แค่สมัครบัญชี

### Advanced mode
โหมดที่ผู้ใช้เลือก provider, model, resolution, quality, references และ parameter ต่าง ๆ เอง เหมาะกับ Creator และผู้เชี่ยวชาญ

### ARPPU (Average Revenue Per Paying User)
รายได้เฉลี่ยต่อผู้ใช้ที่จ่ายเงินจริงในช่วงเวลาหนึ่ง

## B

### Break-even point
จุดที่ contribution รวมเท่ากับต้นทุนคงที่ ธุรกิจยังไม่มีกำไรแต่ไม่ขาดทุนจากการดำเนินงานในขอบเขตที่คำนวณ

## C

### CAC (Customer Acquisition Cost)
ต้นทุนเฉลี่ยเพื่อให้ได้ลูกค้าที่จ่ายเงินจริงหนึ่งคน

```text
CAC = ค่าโฆษณา + โปรโมชัน + free-credit cost + sales cost
      / จำนวนลูกค้าใหม่ที่จ่ายเงินจริง
```

### Chargeback
การที่เจ้าของบัตรโต้แย้งรายการและ payment provider ดึงเงินคืน อาจมีค่าธรรมเนียมเพิ่ม

### Churn
สัดส่วนลูกค้าที่หยุดใช้งานหรือไม่ซื้อซ้ำในช่วงเวลาที่กำหนด

### Contribution
เงินที่เหลือจากรายได้หลังหักต้นทุนแปรผัน ใช้จ่าย fixed cost และสร้างกำไร

```text
Contribution = Net revenue - variable cost
```

### COGS (Cost of Goods Sold)
ต้นทุนโดยตรงในการให้บริการ เช่น AI API, retry, payment fee และ variable storage

## F

### Fixed cost
ต้นทุนที่เกิดแม้ไม่มีลูกค้า เช่น server ขั้นต่ำ, database plan และ domain

### Free-credit cost
ต้นทุน API จริงจากเครดิตฟรี ต้องนับเป็น acquisition/marketing cost ไม่ใช่ของฟรีสำหรับธุรกิจ

## G

### Gross margin
สัดส่วนรายได้ที่เหลือหลังหัก COGS

```text
Gross margin = (Revenue - COGS) / Revenue
```

อย่าสับสนกับ markup ซึ่งคำนวณเทียบกับต้นทุน

## I

### Idempotency
คุณสมบัติที่ทำให้ event เดิมถูกประมวลผลซ้ำแล้วไม่เกิดผลซ้ำ เช่น ChillPay ส่ง webhook ซ้ำแต่ระบบเติมเครดิตเพียงครั้งเดียว

## L

### LTV (Customer Lifetime Value)
มูลค่า contribution รวมที่คาดว่าจะได้รับจากลูกค้าตลอดช่วงที่ยังเป็นลูกค้า

### LTV/CAC
อัตราส่วนมูลค่าลูกค้าตลอดอายุต่อต้นทุนการได้ลูกค้า โดยทั่วไปต้องมากกว่า 1 เพื่อไม่ขาดทุน และควรสูงพอรองรับ fixed cost และความเสี่ยง

## P

### Payback period
ระยะเวลาที่ contribution จากลูกค้าคืน CAC ที่ใช้หาลูกค้าคนนั้น

### P95 cost
ต้นทุนที่ 95% ของ jobs มีค่าไม่เกินตัวเลขนี้ ใช้กำหนดราคาได้ปลอดภัยกว่าค่าเฉลี่ยเมื่อมีงานบางส่วนแพงผิดปกติ

### Provider routing
กติกาที่เลือกว่า job ควรส่งไป provider/model ใดตามประเภทงาน reference, quality, cost, latency และ provider health

## R

### Retention
สัดส่วนผู้ใช้ที่กลับมาใช้งานหรือซื้อซ้ำหลังจากช่วงเวลาหนึ่ง

### Retry reserve
งบที่เผื่อไว้สำหรับการเรียก provider ซ้ำเมื่อเกิด technical failure

## S

### Simple mode
โหมดที่ลูกค้าเลือกผลลัพธ์ เช่น Draft, Selling Quality หรือ Premium Campaign โดยระบบเลือกโมเดลให้

### Signed URL
ลิงก์เข้าถึงไฟล์ private ที่หมดอายุและมีสิทธิจำกัด ลดการเปิดเผย reference/image ต่อสาธารณะ

## U

### Unit economics
การวิเคราะห์รายได้ ต้นทุน และ contribution ต่อหน่วย เช่น ต่อ customer, pack, generation หรือ campaign

### Usable image rate
สัดส่วนภาพที่ผู้ใช้ยอมรับว่านำไปใช้ต่อได้ เป็นตัววัดคุณค่าที่สำคัญกว่าจำนวนภาพที่ API สร้างสำเร็จ

## V

### Variable cost
ต้นทุนที่เพิ่มตามการใช้งาน เช่น API, payment fee, reference processing และ storage

## W

### Working capital
เงินหมุนที่ต้องมีระหว่างจ่าย provider กับวันที่ ChillPay settlement เข้าบัญชี รวมถึงเงินสำรองรองรับเครดิตที่ขายแล้วแต่ยังไม่ถูกใช้

