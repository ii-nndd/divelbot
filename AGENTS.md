# AGENTS.md — سياق مشروع بوت نوفا (اقرأني قبل أي تعديل)

> هذا الملف يُقرأ تلقائياً في كل جلسة جديدة. اقرأه بالكامل قبل أي تعديل أو نشر.

## 1. هوية المشروع

- **الاسم**: بوت نوفا الملكية (Nova) — بوت ديسكورد عربي + لوحة تحكم ويب.
- **مجلد العمل**: `C:\Users\dlel\Desktop\new bot`
- **التقنيات**: Node.js ≥ 20 (المثبت v24)، `discord.js` v14، CommonJS (`require`)، Express، MongoDB، `@napi-rs/canvas`.
- **البنية**: ملفات مسطّحة بجذر المشروع (لا يوجد `src/`).
- **اللغة**: كل الواجهات والردود والأوامر بالعربي. اكتب الأكواد والتعليقات بنفس أسلوب الملفات الموجودة.

## 2. الملفات الأساسية

| الملف | الدور |
|---|---|
| `index.js` | القلب: `CONFIG` (الآي ديهات)، تشغيل Express، تعريف أوامر السلاش، معالج التفاعلات، معالج الرسائل، الفويس 24/7، حماية ارثر/إيدا |
| `dashboard.js` | لوحة `/dashboard` كاملة (OAuth2 + SPA داخل قالب نصي) وكل مسارات `/dashboard/api/*` |
| `panel.js` | لوحة `/panel` لتحرير الردود (كلمة مرور `ADMIN_PASSWORD`) |
| `botcontrol.js` | تفعيل/تعطيل البوت لكل روم + الروم الصوتي (يُعدّل من اللوحة ويُطبّق فوراً) |
| `store.js` | تخزين JSON محلي + نسخة دائمة MongoDB (مجموعة `kv`) |
| `points.js` | النقاط/XP (مجموعة `users`)، المستويات، الترتيب، بطاقات Canvas |
| `levels.js` | معدلات الخبرة الكتابية/الصوتية + أمر `/رتبة` `/rank` |
| `cards.js` | رسم بطاقات الرتبة والمتصدرين |
| `admin.js` / `nlcommands.js` | أوامر الإدارة بالسلاش / بالكلام الطبيعي |
| `economy.js` `games.js` `gamedata.js` `giveaway.js` `selfroles.js` `tickets.js` `jail.js` `trap.js` `welcome.js` `replies*.js` | بقية الأنظمة |
| `AGENTS.md` `.env.example` `README.md` | التوثيق وسياق المشروع |

**روم الفخ (`trap.js`) نظام مستقل تماماً** — الحظر التلقائي ما يتأثر بتعطيل البوت في الروم.

## 3. النشر والاستضافة

- **GitHub**: `https://github.com/ii-nndd/novabot` — الفرع `main`.
- **Render**: `https://divelbot.onrender.com` — **Auto-Deploy مفعّل**: أي push على `main` ينشر تلقائياً.
- **لا يوجد مستودع/فرع آخر**؛ الرفع دائماً على `main`.

### أوامر النشر (بيئة هذا الجهاز)
```powershell
$env:PATH = "C:\Program Files\Git\cmd;" + $env:PATH
git add -A; git commit -m "<وصف التعديل>"; git push origin main
```
- `git` **ليس في PATH** → استخدم `C:\Program Files\Git\cmd\git.exe` أو أضف المجلد للـ PATH أولاً كما فوق.
- `gh` (GitHub CLI) في `C:\Program Files\GitHub CLI\gh.exe` — **مسجّل دخول بالفعل** كـ `ii-nndd` (مفتاح في keyring) و`gh auth setup-git` مطبّق، فالرفع لا يحتاج تسجيل دخول جديد.
- `npm` مباشرة محجوب بسبب Execution Policy → استخدم **`npm.cmd`**.

### التحقق من نجاح النشر (بعد الـ push بـ ~2-3 دقائق)
```powershell
curl.exe -s -o NUL -w "HTTP:%{http_code}`n" https://divelbot.onrender.com/health
curl.exe -s -w "`nHTTP:%{http_code}`n" https://divelbot.onrender.com/dashboard/api/levels/me
```
- الأول لازم يرجع `200`، والثاني `401 سجّل دخولك أول` (ولو رجع `404` فالنشر ما وصل بعد).

## 4. متغيرات البيئة (تُضبط في Render → Environment، وليست في المستودع)

| المتغير | الوصف | إلزامي |
|---|---|---|
| `DISCORD_TOKEN` | توكن البوت | ✅ |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | OAuth2 للوحة | للوحة |
| `SESSION_SECRET` | توقيع جلسات اللوحة | للوحة |
| `PUBLIC_URL` / `RENDER_EXTERNAL_URL` | رابط النشر (Redirect URI) | للوحة |
| `MONGODB_URI` / `MONGODB_DB` | التخزين الدائم (بدونها تضيع التعديلات عند كل restart) | مستحسن |
| `ADMIN_PASSWORD` | `/panel` | للوحة الردود |
| `MEMBERS_INTENT=1` | البحث بالاسم + الترحيب | اختياري |
| `PORT` / `DATA_DIR` | منفذ الويب ومجلد البيانات | اختياري |

## 5. Discord Developer Portal

- **Intents**: `Guilds`, `GuildVoiceStates`, `GuildMessages`, `MessageContent`, `GuildMembers` (Privileged — الكود يتعامل معه بذكاء لو كان مطفي).
- **OAuth2 Redirect**: `https://divelbot.onrender.com/auth/callback`
- الداشبورد محصورة على `ARTHUR_ID` و`SPECIAL_USER_ID` المحددين في `CONFIG` داخل `index.js` (معرّفات السيرفر والرومات كلها في نفس المكان).

## 6. قواعد مهمة عند التعديل

1. **ممنوع** رفع `.env` أو أي سر (توكن/سيكرت) إلى Git أو كتابته في المحادثة. `.gitignore` يستثني `.env` و`node_modules/` و`data/`.
2. واجهة الداشبورد مبنية كقالب نصي `PAGE = \`...\`` داخل `dashboard.js`:
   - **لا تستخدم backticks ولا `${}`** داخل `PAGE` (تكسر القالب) — استخدم دمج النصوص `'+x+'`.
   - استخدم الدوال المساعدة الموجودة: `el()`, `row()`, `card()`, `opt()`, `sw()`, `toast()`, `api()`, `go()`, `show()`، وأصناف CSS: `.card .cat .item .nm .tag .tag.on .tag.off .mut .row .btn .b2 .dn .bar .av .ov .ovc`.
3. كل مسارات الـ API داخل `dashboard.js` تُكتب داخل الراوتر `api` عبر الغلاف `h(async (g, b, req) => ...)` — وترجع كائن JSON.
4. أي مسار GET يستخدم `req.query`، وأي POST يحتاج هيدر `x-dash: 1` (يتولاه `api()` في الواجهة).
5. الإعدادات الديناميكية تمر عبر `botcontrol.js` (وليس تعديل `CONFIG` مباشرة).
6. `data/` مستثنى من Git (بيانات تشغيل مؤقتة) — لا تعتمد عليه للحفظ الدائم.

## 7. طريقة اختبار واجهة الداشبورد قبل النشر (مهمة)

اللوحة تحتاج توكن/MongoDB، لذا تُختبر محاكاةً:

1. ثبّت `jsdom` في مجلد مؤقت (خارج المشروع):
   `npm.cmd install jsdom --prefix C:\Users\dlel\AppData\Local\Temp\opencode\domtest`
2. اقرأ ملف `dashboard.js` واستخرج قيمة `PAGE` (بين `const PAGE = \`` و`\`;\n\nmodule.exports`).
3. شغّل الصفحة داخل jsdom مع `runScripts:'dangerously'` مع تجهيز دالة `fetch` وهمية ترجع ردود `/dashboard/api/*` (خصوصاً `me`, `levels`, `levels/me`, `levels/member`)، ثم نفّذ الضغط على الأزرار وتأكد أن العناصر تظهر بدون أخطاء JS.
4. تحقق من صحة الصيغة دائماً: `node --check dashboard.js`.
5. لتوثيق الشكل للمستخدم: اكتب `mock.html` من `document.documentElement.outerHTML` واعرضه بـ `browser.preview`.

## 8. الحالة الحالية

**منجز ومُتحقق منه على الموقع الحقيقي:**
- إصلاح صفحة «المستويات»: زر «تعديل» كان يعرض النتيجة أسفل قائمة الـ25 متصدر (خارج الشاشة) → صار يفتح **نافذة منبثقة** (`openModal`) فيها المستوى، الترتيب، أشرطة تقدم (إجمالي/كتابي/صوتي) وباقي XP للمستوى القادم، مع أزرار حفظ/إضافة/خصم XP.
- إضافة بطاقة **«حسابي 👤»** تُحمّل مستوى المستخدم المسجّل تلقائياً.
- إضافة مسار **`GET /dashboard/api/levels/me`**.
- إضافة `.gitignore` و`.env.example` و`README.md`، وتهيئة Git وربطه بمستودع GitHub.
- آخر Commit منشور: `c143174` على `main`.

**لم يُنفّذ بعد (عند الطلب):**
- توحيد `"name"` في `package.json` من `voice-keeper-bot` إلى `nova`.
- `render.yaml` كـ Blueprint، وملف `assetlinks.json` لربط APK.
- لم يتم تشغيل `npm install` محلياً (لا يوجد `node_modules`).
- غير مؤكد: هل `MONGODB_URI` مضبوط على Render (إذا لا، النقاط والمستويات ترجع أصفار).

## 9. أسلوب العمل مع صاحب المشروع

- يتكلم بالعربي، ويطلب التعديل مباشرة ثم النشر («انشره»).
- بعد أي تعديل: اختبره، ثم نفّذ النشر على `main` وتأكد من الموقع، وأخبره بالنتيجة ورقم الـ commit.
- لا تطلب منه التوكنات في المحادثة أبداً؛ ضع أماكنها في `.env.example` وعلى Render.
