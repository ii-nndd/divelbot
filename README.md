# 👑 بوت نوفا الملكية + لوحة التحكم

بوت ديسكورد عربي (Nova) مع لوحة تحكم ويب كاملة ونظام مستويات/اقتصاد/تذاكر/سجن/فخ/ترحيب.

---

## المكوّنات

| الملف | الوظيفة |
|---|---|
| `index.js` | القلب: العميل، الأوامر، الفويس 24/7، معالج الرسائل، سيرفر الويب |
| `dashboard.js` | لوحة التحكم `/dashboard` (OAuth2 ديسكورد) + مسارات API |
| `panel.js` | لوحة تحرير الردود `/panel` (كلمة مرور) |
| `botcontrol.js` | تفعيل/تعطيل البوت لكل روم + الروم الصوتي (يعدله الداشبورد فوراً) |
| `store.js` | تخزين JSON محلي + نسخة دائمة MongoDB |
| `points.js` / `levels.js` | النقاط والمستويات (كتابي/صوتي/إجمالي) + بطاقات Canvas |
| `cards.js` | رسم بطاقات الرتبة والمتصدرين (Canvas) |
| `admin.js` / `nlcommands.js` | أوامر الإدارة بالسلاش وبالكلام الطبيعي |
| `economy.js` `games.js` `gamedata.js` `giveaway.js` `selfroles.js` `tickets.js` `jail.js` `trap.js` `welcome.js` `replies*.js` | بقية الأنظمة |

---

## التشغيل محلياً

```bash
npm install
copy .env.example .env     # ثم عبّي القيم
npm start
```

- لوحة التحكم: http://localhost:3000/dashboard
- لوحة الردود: http://localhost:3000/panel
- فحص الصحة: http://localhost:3000/health

يتطلب Node.js 20 أو أحدث.

---

## البقاء أونلاين 24/7

البوت مصمم بحيث **ما يصير أوفلاين ولا يتسكّر**:

- **نبض بقاء (Keep-Alive)**: يفتح `/health` كل 5 دقايق عشان استضافة Render المجانية ما تنيّم الخدمة.
- **إعادة اتصال تلقائية**: لو انقطع الاتصال أو انتهت صلاحية الجلسة يعيد تسجيل الدخول لحاله، ومع تكرار الفشل يباعد المحاولات (2 → 32 دقيقة) بدل ما يعتمد على خراب.
- **منع الكراش**: `unhandledRejection` و`uncaughtException` و`client error` تتسجل فقط ولا توقف العملية.
- **فويس مستمر**: حارس كل دقيقة يرجّع البوت للروم الصوتي (يشتغل فقط بعد تسجيل الدخول).
- **الحالة دائمة أونلاين**: الحالة تُضبط على `online` عند كل اتصال حتى ما يبيّن أوفلاين.

للتحقق: `curl https://<رابط-النشر>/health` لازم يرجع `200` مع `bot=online`.

---

## متغيرات البيئة

| المتغير | الوصف | إلزامي |
|---|---|---|
| `DISCORD_TOKEN` | توكن البوت | ✅ |
| `DISCORD_CLIENT_ID` | OAuth2 Client ID | للوحة |
| `DISCORD_CLIENT_SECRET` | OAuth2 Client Secret | للوحة |
| `SESSION_SECRET` | مفتاح توقيع الجلسات | للوحة |
| `PUBLIC_URL` / `RENDER_EXTERNAL_URL` | رابط النشر (Redirect URI) | للوحة |
| `MONGODB_URI` / `MONGODB_DB` | التخزين الدائم للنقاط والإعدادات | مستحسن |
| `ADMIN_PASSWORD` | كلمة مرور `/panel` | للوحة الردود |
| `MEMBERS_INTENT` | `1` لتفعيل البحث بالاسم والترحيب | اختياري |
| `PORT`, `DATA_DIR` | منفذ الويب ومجلد البيانات | اختياري |

---

## إعداد Discord Developer Portal

1. **Bot** → انسخ التوكن إلى `DISCORD_TOKEN`.
2. **Privileged Gateway Intents** → فعّل:
   - `SERVER MEMBERS INTENT` (للترحيب وصفحة الأعضاء والبحث بالاسم)
   - `MESSAGE CONTENT INTENT` (لأوامر الكلام الطبيعي والردود)
3. **OAuth2 → Redirects** → أضف:
   `https://<رابط-النشر>/auth/callback`
4. لوحة التحكم محصورة تلقائياً على حسابي ارثر وإيدا (المعرّفان في `CONFIG` داخل `index.js`).

---

## النشر على Render

1. أنشئ **Web Service** جديد واربطه بمستودع GitHub هذا.
2. Build: `npm install` — Start: `npm start`.
3. أضف متغيرات البيئة من الجدول أعلاه (من **Environment**).
4. فعّل **Auto-Deploy**: أي `git push` على الفرع الرئيسي ينشر تلقائياً.
5. أضف قاعدة بيانات MongoDB (Atlas أو Render) وحطّ رابطها في `MONGODB_URI` — بدونها تضيع التعديلات عند كل إعادة تشغيل.

---

## الأمان

- ملف `.env` ومجلد `node_modules/` وملفات `data/*.json` **مستثناة** من Git عبر `.gitignore`.
- لا ترفع التوكن أو `CLIENT_SECRET` أو `SESSION_SECRET` إلى المستودع أبداً.
