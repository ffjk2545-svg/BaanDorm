# BaanDorm

ระบบจัดการหอพักและธุรกิจให้เช่าที่สร้างด้วย Next.js App Router, TypeScript และ Supabase PostgreSQL/Auth/Storage

## ความสามารถในรุ่นเริ่มต้น

- สมัครสมาชิกและเข้าสู่ระบบผ่าน Supabase Auth
- ตั้งค่ากิจการและอาคารแรก พร้อมแยกข้อมูลตามกิจการ
- จัดการห้อง ผู้เช่า และสัญญาเช่า พร้อมสถานะห้องและรายการเงินประกัน
- ย้ายออกโดยปิดสัญญา คืนห้อง และบันทึกคืน/หักเงินประกันในธุรกรรมเดียว
- จดเลขมิเตอร์น้ำและไฟ พร้อมตรวจสอบลำดับค่ามิเตอร์ในฐานข้อมูล
- สร้างบิลจากค่าเช่าและอัตราสาธารณูปโภคที่ครอบคลุมรอบบิล
- บันทึกรับชำระบางส่วน โดยป้องกันยอดเกินคงเหลือในธุรกรรมเดียว
- บันทึกรายจ่ายและดูยอดสุทธิเงินสดบน Dashboard
- บันทึก/ปิดงานซ่อม จัดการประกาศ พัสดุ และรายการงานพื้นฐาน
- ตั้งอัตราค่าน้ำไฟและเพิ่มอาคาร พร้อมจัดเก็บรายการอ้างอิงใบแจ้งจากผู้ให้บริการ
- Dashboard คำนวณตัวเลขจากข้อมูลจริง และแสดงสถานะว่างเมื่อไม่มีข้อมูล
- โครงสร้างฐานข้อมูลสำหรับอัตราค่าสาธารณูปโภค งานซ่อม ทรัพย์สิน ประกาศ พัสดุ งาน และประวัติ
- Row Level Security ทุกตาราง และ Storage แบบ private สำหรับหลักฐาน

โมดูลที่ยังไม่มีหน้าสร้าง/แก้ไขครบถ้วนระบุไว้ใน [PROJECT_SPEC.md](PROJECT_SPEC.md)

## เทคโนโลยี

- Next.js 16 App Router, React 19, TypeScript strict
- Supabase Auth + PostgreSQL + Storage และ `@supabase/ssr`
- Zod, Decimal.js, Lucide React
- CSS responsive พร้อมภาษาไทยและสกุลเงินบาท

## เตรียมเครื่อง

- Node.js 20.9 ขึ้นไป
- npm 10+
- Supabase project

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

บน Windows ให้คัดลอก `.env.example` เป็น `.env.local` ด้วย File Explorer หรือ `Copy-Item` แล้วกรอกค่า Supabase URL และ anon key

รัน SQL migration ใน Supabase CLI หรือ SQL Editor ตามลำดับไฟล์ใน `supabase/migrations/` ก่อนสมัครผู้ใช้

## คำสั่ง

```bash
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

## Environment variables

ดู [.env.example](.env.example) และ [คู่มือติดตั้ง](docs/DEPLOYMENT.md) ห้ามเปิดเผย Service Role Key ใน Client Component หรือ commit `.env.local`

## Deploy

เชื่อม GitHub repository เข้ากับ Vercel, ตั้งค่า environment variables ใน Vercel, apply migrations กับ Supabase project และกำหนด Auth Site URL/Redirect URLs ตามโดเมนที่ใช้งาน รายละเอียดใน [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
