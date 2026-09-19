# Deploy คู่มือ: Minoza Store บน Vercel + Supabase

โค้ดถูกเตรียมพร้อม deploy แล้ว (ดู commit แรกใน git log) ขั้นตอนที่เหลือต้องทำผ่านบัญชี Vercel/Supabase/Stripe/Meta ของคุณเอง เพราะ Claude ไม่มีสิทธิ์เข้าบัญชีเหล่านี้แทนคุณได้

## สิ่งที่เตรียมให้แล้ว
- ย้ายระบบเก็บข้อมูล (products / orders / site settings / รูปที่อัปโหลด) จากไฟล์ JSON ไปใช้ Supabase ได้ — จำเป็นเพราะ Vercel เป็น serverless เขียนไฟล์ถาวรไม่ได้
- ถ้ายังไม่ตั้งค่า Supabase ระบบจะ fallback ไปใช้ไฟล์ JSON เดิมอัตโนมัติ (ใช้ตอน dev บนเครื่องได้เลย)
- โครงสร้างสำหรับ Vercel (`api/index.js`, `vercel.json`) พร้อมแล้ว
- `supabase/schema.sql` มีตารางที่ต้องสร้างครบ
- git repo init และ commit เรียบร้อย, `.env` ไม่ถูกใส่เข้า git

## ขั้นตอนที่คุณต้องทำเอง

### 1. สร้างโปรเจกต์ Supabase
1. ไปที่ https://supabase.com → New project
2. เปิด SQL Editor → วางไฟล์ `supabase/schema.sql` ทั้งไฟล์ → Run
3. ไปที่ Storage → New bucket → ชื่อ `uploads` → เปิด **Public bucket**
4. ไปที่ Project Settings → API → คัดลอก:
   - `Project URL` → ใช้เป็น `SUPABASE_URL`
   - `service_role` secret key → ใช้เป็น `SUPABASE_SERVICE_KEY` (**ห้ามเผยแพร่คีย์นี้**)

### 2. เตรียมคีย์จริงสำหรับ Stripe / Meta / LINE
ตอนนี้ `.env` ยังเป็นค่าทดสอบ/placeholder ทั้งหมด ต้องเปลี่ยนก่อนเปิดขายจริง:
- **Stripe**: dashboard.stripe.com → Developers → API keys → คัดลอก Publishable key + Secret key
- **Stripe Webhook**: ยังตั้งไม่ได้จนกว่าจะมี URL จริงจาก Vercel (ทำหลัง deploy ครั้งแรก ดูข้อ 5)
- **Meta CAPI**: Meta Events Manager → เลือก Pixel → Settings → Conversions API → Generate access token
- **LINE Notify**: notify-bot.line.me → ออก token สำหรับกลุ่ม/แชทที่จะรับแจ้งเตือนออเดอร์

### 3. Push ขึ้น GitHub (แนะนำ — ทำให้ deploy ซ้ำ/auto-deploy ได้ง่าย)
```bash
# สร้าง repo เปล่าบน GitHub ก่อน แล้วรัน
git remote add origin https://github.com/<your-username>/<repo-name>.git
git branch -M main
git push -u origin main
```

### 4. เชื่อม Vercel
1. ไปที่ https://vercel.com/new → Import จาก GitHub repo ที่เพิ่ง push
2. Framework Preset เลือก "Other" (ไม่ใช่ Next.js)
3. ใส่ Environment Variables (Project Settings → Environment Variables) ให้ครบตาม `.env.example`:
   `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `META_PIXEL_ID`, `META_CAPI_ACCESS_TOKEN`, `LINE_NOTIFY_TOKEN`
4. Deploy

หรือถ้าไม่อยากใช้ GitHub: รัน `npx vercel login` แล้ว `npx vercel --prod` จากโฟลเดอร์นี้ (ต้อง login ด้วยบัญชี Vercel ของคุณเอง เพราะ Claude รันแบบ non-interactive ล็อกอินแทนไม่ได้)

### 5. ตั้งค่า Stripe Webhook ให้ชี้มาที่เว็บจริง
หลัง deploy จะได้โดเมนจาก Vercel เช่น `https://minoza-store.vercel.app`
1. Stripe Dashboard → Developers → Webhooks → Add endpoint
2. URL: `https://<โดเมนของคุณ>/api/webhook/stripe`
3. Event: เลือก `payment_intent.succeeded`
4. คัดลอก Signing secret → ใส่เป็น `STRIPE_WEBHOOK_SECRET` ใน Vercel env vars → Redeploy

### 6. (ถ้ามี) ผูกโดเมนของร้าน
Vercel → Project → Settings → Domains → เพิ่มโดเมนที่คุณมี แล้วตั้งค่า DNS ตามที่ Vercel บอก

## หลัง deploy ตรวจสอบอะไรบ้าง
- เปิดหน้าแรก และหน้า `/admin` ให้ทำงานปกติ
- ลองเพิ่ม/แก้ไขสินค้าใน `/admin` แล้วรีเฟรชหน้าเว็บ ข้อมูลต้องอยู่ (ถ้าหายแปลว่า Supabase env vars ยังไม่ถูกตั้ง)
- ลองอัปโหลดรูปสินค้าใน admin แล้วดูว่า URL ที่ได้เป็นลิงก์ Supabase Storage
- ทำรายการสั่งซื้อทดสอบ (Stripe test mode ก่อน) แล้วเช็คว่า `/api/orders` มีออเดอร์ใหม่ และ log ฝั่ง Vercel ขึ้น CAPI dispatch
- เมื่อพร้อมขายจริง ค่อยสลับ Stripe key จาก test เป็น live
