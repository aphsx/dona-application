# dona farmer (web)

แอปเว็บสำหรับเกษตรกร (Next.js) — หน้าตาอิง Dona-application

## Env

คัดลอกแล้วแก้ค่า:

```bash
cp .env.example .env
```

| ตัวแปร | ความหมาย |
|---|---|
| `DONA_API_URL` | origin ของ Go API (server-only, ใช้ใน rewrite) |
| `PORT` | พอร์ต listen (dev/start) |

Production ต้องตั้ง `DONA_API_URL` ชัดเจน — ไม่มี fallback

## Scripts

```bash
npm run dev        # http://localhost:3001 (จาก PORT ใน .env)
npm run build
npm run start
npm run typecheck
```

API ต้องรันที่ `DONA_API_URL` เช่น `:8080`
