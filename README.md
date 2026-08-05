# UPPMS-Project

**University Project & Progress Management System (UPPMS)** — منصة لإدارة مشاريع التخرج والمسارات الأكاديمية والجدولة والمناقشات.

| الجزء | المجلد | التقنية |
|--------|--------|---------|
| Backend API | `backend last/` | Laravel (PHP 8.1+) |
| Frontend SPA | `frontend/` | React + Vite + MUI |

الإصدار الحالي في هذا الفرع: **v6.3**

---

## المتطلبات

| الأداة | الإصدار |
|--------|---------|
| PHP | 8.1+ (`mbstring`, `pdo_mysql`, `openssl`, `tokenizer`, `xml`, `ctype`, `json`, `bcmath`) |
| Composer | 2.x |
| Node.js | 18+ |
| npm | 9+ |
| MySQL | 8.x |

---

## Setup السريع

### 1) قاعدة البيانات

```sql
CREATE DATABASE pms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2) Backend

```bash
cd "backend last"
composer install
copy .env.example .env
php artisan key:generate
```

عدّل `.env`:

```env
APP_URL=http://127.0.0.1:8000
FRONTEND_URL=http://localhost:5173

DB_DATABASE=pms
DB_USERNAME=root
DB_PASSWORD=your_password
```

ثم:

```bash
php artisan migrate --seed
php artisan storage:link
php artisan serve
```

الـ API: `http://127.0.0.1:8000`

> مهم: استخدم `migrate --seed` حتى يُنشأ حساب Super Admin.

### 3) Frontend

في terminal جديد:

```bash
cd frontend
npm install
copy .env.example .env
```

محتوى `frontend/.env`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

```bash
npm run dev
```

افتح: `http://localhost:5173`

---

## حساب الدخول الافتراضي

بعد `php artisan migrate --seed`:

| الحقل | القيمة |
|-------|--------|
| البريد | `superadmin@pms.local` |
| كلمة المرور | `password` |
| الدور | Super Admin |

> غيّر كلمة المرور فوراً في بيئة الإنتاج.

---

## بيانات تجريبية (اختياري)

من مجلد `backend last/`:

```bash
# حرم SPU كامل (طلاب، مشرفين، مسار، مشاريع)
php artisan db:seed --class=SpuCampusDemoSeeder

# جدولة / مسار / نتائج مناقشة (حسب الحاجة)
php artisan db:seed --class=SchedulingDemoSeeder
php artisan db:seed --class=TrackWorkflowDemoSeeder
php artisan db:seed --class=DefenseResultDemoSeeder
```

حسابات الديمو غالباً بكلمة المرور: `password`

---

## هيكل المشروع باختصار

```
UPPMS-Project/
├── backend last/     # Laravel API (Controllers/Services حسب الدومين)
├── frontend/         # React SPA
├── docs/             # توثيق إضافي (اختياري)
└── README.md         # هذا الملف
```

- خريطة الـ Backend: `backend last/app/DOMAINS.md`
- خريطة الـ Frontend: `frontend/src/DOMAINS.md`
- تفاصيل أطول: `SETUP.md`

---

## استكشاف أخطاء شائعة

| المشكلة | الحل |
|---------|------|
| لا يوجد Super Admin | `php artisan db:seed` أو `migrate:fresh --seed` |
| Network / CORS من المتصفح | تأكد `FRONTEND_URL` في backend و`VITE_API_BASE_URL` في frontend |
| فشل اتصال MySQL | راجع `DB_*` في `.env` وأن MySQL يعمل |
| AI لا يعمل | أضف `GEMINI_API_KEY` في backend `.env` (اختياري) |

---

## أوامر مفيدة

```bash
# Backend
cd "backend last"
php artisan migrate:status
php artisan route:list
php artisan test

# Frontend
cd frontend
npm run build
npm run lint
```
