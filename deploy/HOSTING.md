# 🌐 دليل إعادة تشغيل بوت نوفا (بدون بطاقة بنكية)

> آخر تحديث: ١٧ أكتوبر ٢٠٢٦ · اقرأ `AGENTS.md` و`HANDOFF.md` أول.
>
> **الوضع الحالي:** البوت **شغال فعلياً** على **Wispbyte** المجاني (بلا بطاقة) + **MongoDB Atlas** + **نفق Cloudflare** للوحة.
> الطريقة المُجرّبة والمُختبرة بالكامل = **القسم 🅱️** (فيه فخّان مهمّان اكتشفناهما بالتجربة: صورة Node، ومتغيرات البيئة).
>
> **السبب الأصلي للانتقال:** خدمة Render القديمة موقوفة (`Service Suspended`) بعد استهلاك ٧٥٠ ساعة/شهر.
> **القيد:** صاحب المشروع ما عنده بطاقة → Oracle / Google / AWS / Northflank / Fly / Railway **مستثناة**، و**Render للحسابات الجديدة صار يطلب بطاقة** (مُختبر ١٧ أكتوبر) → مستثنى أيضاً.

---

## 🅰️ المسار الأول — حساب Render جديد ⛔ سقط (صار يطلب بطاقة)

> ❌ **مُختبر ١٧ أكتوبر ٢٠٢٦:** Render صار يطلب **بطاقة** حتى لو اخترت الخطة المجانية Free — للحسابات **الجديدة**. لا يصلح لصاحب المشروع.
> ✅ **الحساب القديم وراثي** (بلا بطاقة) وحصته **ترجع ١ نوفمبر** → **لا تحذفه أبداً**، بس احذف **الخدمة** منه. لو احتجنا Render مستقلباً، نستخدمه (بعد إيقاف نسخة Wispbyte، عشان ما يصير بوتين بنفس التوكن).
> ℹ️ باقي التفاصيل تحت للمرجعية فقط (لو تغيّرت سياسة Render لاحقاً).

<details>
<summary>خطوات Render القديمة (للمرجعية)</summary>

### ١) اجمع القيم السرية (قبل أي شي)
انسخها من Render القديم ← خدمة `novabot` ← **Environment**:

| المتغير | من وين تجيبه |
|---|---|
| `DISCORD_TOKEN` | Render القديم · أو Discord Developer Portal ← Bot ← Reset Token |
| `DISCORD_CLIENT_ID` | Discord Developer Portal ← General Information ← Application ID |
| `DISCORD_CLIENT_SECRET` | Discord Developer Portal ← OAuth2 ← Client Secret |
| `ADMIN_PASSWORD` | اللي كنت تستخدمه لـ`/panel` |
| `MONGODB_URI` | نفسه اللي عندك · وإن ما كان → القسم 🅾️ تحت |

> 🔒 **لا ترسل هذي القيم في المحادثة** — تنحط بس في لوحة الاستضافة.

### ٢) أنشئ الخدمة من الـBlueprint
1. <https://dashboard.render.com/register> ← **Sign up with email** (إيميل ثاني) — ⚠️ **لا تسجل بحساب GitHub** لأنه يدخّلك على حسابك القديم.
2. **New ➜ Blueprint** ← اربط `ii-nndd/novabot` (أو **Public Git Repository** والصق `https://github.com/ii-nndd/novabot`).
3. Render يقرأ `render.yaml` ويطلب قيم `sync: false` → عبّيها من فوق. `KEEPALIVE` لازم **`1`** (وإلا الخدمة تنام بعد ١٥ دقيقة سكون).
4. **Apply / Create** ← انتظر ~٣ دقايق.

### ٣) تأكد
`https://<اسم-خدمتك>.onrender.com/health` لازم يرجع **200** والنص فيه **`bot=online`**.

### ٤) Redirect URI
Discord Developer Portal ← OAuth2 ← Redirects ← أضف `https://<اسم-خدمتك>.onrender.com/auth/callback`
(اللوحة تقرأ رابطها من `RENDER_EXTERNAL_URL` تلقائياً — ما تحتاج `PUBLIC_URL`.)

### ٥) ممنوعات
- **لا تضيف خدمة مجانية ثانية** على نفس الحساب (٧٥٠ ساعة للحساب كله والبوت ياكل ~٧٤٤).

</details>

---

## 🅱️ المسار الثاني — Wispbyte ⭐ الطريق المُجرّب (شغّل البوت فعلياً ١٧ أكتوبر ٢٠٢٦)

**المواصفات:** ٥١٢ MB رام · ١ GB قرص · ٣٥٪ معالج · **٢٤/٧ بلا نوم** · نود أوروبا (`FREE-EU-RO-27`) · **بدون بطاقة** ✓ · **بدون ديسكورد** ✓ · ولا ينحذف عند عدم الدخول (يوقف، وبعد ٣٠ يوم ينقل للتخزين).
**المقابل:** دخول للوحة **كل أسبوعين** + **مانع الإعلانات لازم يكون مطفي** على موقعهم (المجاني مدعوم بالإعلانات).

> بديل: **HeavenCloud** (`control.heavencloud.in`) — ٧١٥ MB · تجديد كل ٧ أيام · **إلزامي الانضمام لـ<https://discord.gg/getvps>** لاستلام السيرفر المجاني (كان مضطرباً وقت التجربة: `Could not establish a connection to the machine. Please try again`). نفس الخطوات تحت لأن الاثنين Pterodactyl.

### ١) سجّل وأنشئ السيرفر
1. <https://wispbyte.com/client/register> ← سجّل (زر **Discord** أو Google بنقرة وحدة).
2. **`+ New server`** ← Runtime: **Node.js** (يطلع مختاراً) ← الاسم `NovaBot` ← **`Create server`**.
3. ⚠️ لو ظهرت بوابة **«Adblock detected»**: طفّي مانع الإعلانات لهذا الموقع + أي **VPN/فلتر DNS** على شبكتك (يمنع فحصهم) ← **`Check again`**.

### ٢) ⚠️ اختر صورة Node يدوياً (فخ أول — يقتل الفويس)

في **`Configuration → Startup`** ← قائمة **Docker images**:

- ❌ **لا تختر `nodejs_lts`** — صورة عندهم قديمة وتشغّل **Node 19.9**، و`@discordjs/voice` يحتاج **٢٢.١٢+** → **الفويس ٢٤/٧ ما يشتغل**.
- ✅ اختر **`nodejs_22`** بالضبط ← لازم تنتقل علامة **`Currently Selected`** إليها ← ثم اضغط **`Save Command`**.
- 🔍 تحقق في الكونسول: `Status: Image is up to date for ghcr.io/parkervcp/yolks:nodejs_22` و`v22.x.x`.
- ℹ️ في أول تشغيل تحذيرات `npm WARN EBADENGINE` عن `discord.js`/`@discordjs/voice` = **مجرد تحذيرات**، التركيب ينجح (`added 116 packages`).

### ٣) ارفع الكود
1. GitHub ← مستودع `novabot` ← **Code ➜ Download ZIP** (~٢ MB، بلا `node_modules`).
2. **`Server Management → Files`** ← **`Upload Files`** ← ارفع الـZIP ← **`...` ➜ Unarchive**.
3. ⚠️ الـZIP ينفك داخل مجلد **`novabot-main/`** — إما تنقل محتواه إلى `home/container`، أو (الأسهل والأسرع) **تخلّيه** وتضبط أمر التشغيل بالـ`cd` كما تحت.

### ٤) أمر التشغيل (**Startup Command**)

في **`Configuration → Startup`** ← **`Command Editor`**:

```bash
cd novabot-main && npm install --omit=dev && node index.js
```

- `cd novabot-main` عشان مجلد المشروع بعد فك الـZIP.
- ⚠️ **لا تكتب `\n` داخل أمر التشغيل** — محرر البانل يحوّله إلى **سطر جديد فعلي**، فينكسر الأمر (`SyntaxError: Unexpected end of input`) ويصير **crash loop** يعيد التشغيل بلا توقف.
- لا تضغط **`Reset to Default`** بعدها.
- خانة **`JS file`**: حط `novabot-main/index.js` (احتياط) · و`Additional Node.js Packages` خلها **فاضية**.

### ٥) 🔴 متغيرات البيئة — البانل **لا يمرّرها**! استخدم ملف `.env` (فخ ثاني)

**حقيقة مُختبرة (١٧ أكتوبر ٢٠٢٦):** صفحة **`Configuration → Environment`** في Wispbyte **شكلية** — البوت يستقبل **صفر متغيرات**. فحصناها من داخل السيرفر فطلع:

```
toklen=0  keep=undefined  port=undefined  tun=undefined  mem=undefined
```

…وكل توكن نحطه فيها يطلع `❌ فشل تشغيل البوت: An invalid token was provided.`

✅ **الحل:** البوت يحمّل `.env` تلقائياً (سطر ١ في `index.js`: `require('dotenv').config()`)، فأنشئ الملف **داخل مجلد المشروع**:

1. **`Server Management → Files`** ← **ادخل مجلد `novabot-main`** ← (الشريط فوق لازم يصير `home / container / novabot-main` ومعه `index.js`).
2. **`Create File`** ← الاسم: **`.env`** ← والصق المحتوى:

```ini
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
SESSION_SECRET=
ADMIN_PASSWORD=
MONGODB_URI=
MONGODB_DB=nova
MEMBERS_INTENT=1
KEEPALIVE=0
TUNNEL=1
PORT=3000
DATA_DIR=/home/container/novabot-main/data
```

> 💡 **أضمن طريقة:** أنشئ الملف على جهازك بـ**Notepad** (*Save as type* = **All Files**) ثم **`Upload Files`** وأنت **داخل** `novabot-main`.
> 🔒 `DISCORD_TOKEN` / `DISCORD_CLIENT_SECRET` / `SESSION_SECRET` / `MONGODB_URI` / `ADMIN_PASSWORD` = أسرار → في `.env` فقط، ولا تُكتب في Git ولا في المحادثة ولا في صورة.
> ⚙️ معاني المفاتيح: `MEMBERS_INTENT=1` (بحث بالاسم + ترحيب) · `KEEPALIVE=0` (بلا نبض بقاء — البانل ما ينيّم) · `TUNNEL=1` (رابط HTTPS عام للوحة) · `DATA_DIR` (مسار البيانات داخل مجلد المشروع).

**❌ الأخطاء القاتلة (كلها صارت بالتجربة):**
- الملف في **`home/container`** بدل **`novabot-main`** ← العلامة: الكونسول يبقى يقول `💓 نبض البقاء رجع كود 503` + `invalid token`.
- اسم الملف **`.env.txt`** بدل `.env`.
- مسافات حول `=` أو سطر فاضي جوّد التوكن.
- `DATA_DIR` قديم (`/home/container/data`) بعد ما استقرينا على `novabot-main`.

### ٦) شغّل وتابع

**`Start`** ← تابع **Console**. النجاح يبدو هكذا (هذا اللوج الحقيقي من أول تشغيل ناجح):

```text
💓 نبض البقاء مطفي (KEEPALIVE=0)          ← دليل أن .env انقرأ (الصفحة ما تنقل شي)
🌉 تجهيز النفق: أنزّل cloudflared لأول مرة...
🌐 Web server on port 3000
🤖 Logged in as العبد#0210!               ← البوت أونلاين
🎙️ دخل الفويس بنجاح (🔊┇𝓥𝓸𝓲𝓬𝓮)
🗄️ متصل بقاعدة البيانات
🌉 تم التنزيل (38.4 MB)
🌉 رابط اللوحة العام: https://xxxx.trycloudflare.com
🌉 سجّلت رابط اللوحة عند ديسكورد تلقائياً ✓
🌉 ✅ النفق جاهز واللوحة صارت متاحة على الإنترنت
```

> أول تشغيل ينزّل `cloudflared` (~٣٨–٥٣ MB) → خذ بالك ياخذ دقيقة.
> `@napi-rs/canvas` عنده prebuild لـ`linux-x64-gnu` → يشتغل بلا أي تعديل ✓ (تحققنا من npm).
> ⚠️ لو ما ظهر `💓 نبض البقاء مطفي` فمعناه `.env` **مو بمكانه** — راجع الخطوة ٥.

### ٧) اللوحة — نفق Cloudflare التلقائي ✅ (مبني ومُختبر)

لوحات Pterodactyl المجانية **ما تعطي رابط HTTPS عام**، واللوحة تحتاج HTTPS عشان Discord يقبل `redirect_uri`. الحل مبني في `tunnel.js`:

1. البوت أول ما يشتغل (لو `TUNNEL=1`) **ينزّل `cloudflared`** الرسمي (مجاني · بلا حساب · بلا دومين · بلا بطاقة) ويشغّله نفقاً سريعاً على منفذه.
2. يطلع رابط مثل `https://xxxx.trycloudflare.com` ويحطه في `PUBLIC_URL` تلقائياً.
3. يحاول يسجّل `redirect_uri` عند Discord عبر `PATCH /applications/@me`، **ويتحقق بإعادة القراءة**.
4. ويرسل لك الرابط **برسالة خاصة بالديسكورد**، ويطبعه في الـConsole.

> ⚠️ **درس مُختبر (١٧ أكتوبر ٢٠٢٦):** Discord يرجّع `200` على `PATCH /applications/@me` **ويتجاهل حقل `redirect_uris`** → تسجيل الدخول يطلع **«Invalid OAuth2 redirect_uri»**. يعني **التسجيل الآلي ما ينفع**، ولازم تسجّله يدوياً مرة كل إعادة تشغيل:
>
> **Discord Developer Portal → تطبيق البوت → `OAuth2` → `Redirects` → `Add Redirect`** والصق
> `<رابط النفق>/auth/callback` ثم **`Save Changes`**. (Discord يسمح بـ١٠ روابط — خلّي القديمة، وعلى ١١ احذف أقدم واحد.)

افتح `<الرابط>/dashboard` ← سجّل دخولك ← يشتغل ✅
- الرابط **يتغير كل إعادة تشغيل** (طبيعة النفق المجاني) → بعد أي Restart البوت يرسل لك الرابط الجديد بالخاص **ومعه تنبيه الخطوة اليدوية**، أضفه في `Redirects`.
- لازم يكون الرابط مسجّلاً **بالضبط** (`https` بدون شرطة أخيرة، مع `/auth/callback`).
- أول ما يطلع الرابط، **قد يحتاج دقيقة أو دقيقتين** لين يفتح. البوت يطبع `✅ النفق جاهز` لما يتأكد.
- ⚠️ **لو ما فتح الرابط:** الأسباب المجرّبة — **VPN (ProtonVPN) شغال**، أو الشبكة تحجب `trycloudflare`، أو كاش DNS سلبي → طفّي الـVPN، أو افتحه من الجوال، أو غيّر DNS إلى `1.1.1.1`.
- لو فشل النفق: **البوت يكمل شغال عادي**، بس اللوحة بلا رابط عام. لإلغائه: `TUNNEL=0`.

### ٧-ب) ⭐ رابط ثابت للأبد — Tailscale Funnel (الأفضل)

نفق Cloudflare السريع يعطي **رابط جديد كل إقلاع** → مع درس «Discord لا يطبّق `redirect_uri` آلياً» معناه إعادة تسجيل يدوية كل مرة. الحل النهائي: **Tailscale Funnel** في `tsfunnel.js`:

- 🔒 **رابط ثابت**: `https://<TS_HOSTNAME>.<tailnet>.ts.net` — ما يتغيّر أبداً مهما أعدت التشغيل → تسجّل `redirect_uri` **مرة وحدة**.
- 💳 **مجاني بلا بطاقة** (خطة Personal: ١٠٠ جهاز + Funnel بلا حدود) · 🌐 بلا دومين · 🚫 بلا شاشة تحذير (مو مثل ngrok).
- 🐳 **يشتغل بلا root** عبر `--tun=userspace-networking` (مؤكد من مطوّري Tailscale: *“we regularly use Funnel in userspace mode”*)، والشهادات تُصدر من سيرفراتهم.
- ⛔ المنافذ المسموحة في Funnel: `443` و`8443` و`10000` — نستخدم 443.

**الخطوات (مرة وحدة):**
0. ⚠️ **افحص شبكة جهازك قبل أي شي:** `node deploy/check-net.js` ← لازم يطلع **عنوان الخروج من VPN (مو من مزوّد الخدمة)** + **«كل نطاقات Tailscale تشتغل»**. ولو طلع محجوب: شغّل/صحّح **ProtonVPN** (تأكد أن النفق يمرّر فعلاً — بعض المرات يقول *Connected* وهو ما يمرّر شي) وأعد الفحص. التفاصيل تحت في **استكشاف الأخطاء**.
1. سجّل مجاناً: <https://login.tailscale.com/start> (Google/GitHub).
2. **Admin console → Settings → Keys → Generate auth key** (فعّل *Reusable*) → انسخ المفتاح `tskey-auth-…`
3. أضف في `.env` داخل `novabot-main`:
   ```
   TS_AUTHKEY=tskey-auth-xxxxxxxx
   TS_HOSTNAME=nova-bot
   ```
   ⚠️ المفتاح **سر** — لا يُكتب في Git ولا في المحادثة.
4. **Restart** → الكونسول يطبع:
   - `🌒 متصل ✓ (nova-bot.tailxxxx.ts.net) — أفعّل Funnel...`
   - `🌒 ⚠️ لازم تفعّل Funnel مرة وحدة من هذا الرابط: https://login.tailscale.com/f/funnel?...` ← **اضغطه ووافق** (يوصل نفس الرابط برسالة خاصة).
   - ثم `🌒 🔒 رابط اللوحة الثابت: https://nova-bot.tailxxxx.ts.net` ✅
5. أضف مرة وحدة في Discord: `OAuth2 → Redirects → Add Redirect` ← `https://nova-bot.tailxxxx.ts.net/auth/callback` ← **Save Changes**. خلاص — **ما تحتاج تعيدها أبداً**.

**سلوك البوت:** Tailscale أول، وإذا مو مضبوط/فشل → ينزل تلقائياً لنفق Cloudflare (`tunnel.js`). ولو Funnel ما انفعّل خلال ٦ دقايق يفتح نفق Cloudflare مؤقتاً عشان ما تنقفل اللوحة.

### ٨) تجديد كل أسبوعين

ادخل لوحة Wispbyte **كل أسبوعين** مرة وإلا يتوقف السيرفر (وبعد ٣٠ يوم ينقل للتخزين **بلا حذف**). المجاني عندهم مدعوم بالإعلانات → **مانع الإعلانات مطفي** على موقعهم.

---

## 🅾️ القسم ج — MongoDB Atlas مجاني للأبد (بدون بطاقة) ⭐ مهم

**ليش؟** بدون قاعدة بيانات، كل إعادة نشر/تحديث تعني **ضياع الألوان والردود والمستويات** (تخزين الاستضافة مؤقت). Atlas يعطيك ٥١٢ MB مجاناً للأبد بدون بطاقة، والبيانات تبقى معك مهما انتقلت بين الاستضافات.

1. افتح <https://www.mongodb.com/cloud/atlas/register> وسجّل (إيميل أو Google).
2. **Build a Database ➜ M0 FREE** (ما يسأل عن بطاقة). اختر أقرب منطقة (مثلاً Frankfurt أو Mumbai).
3. **Network Access ➜ Add IP Address ➜ Allow Access from Anywhere** (`0.0.0.0/0`) — لازم، لأن الاستضافة تتغير.
4. **Database Access ➜ Add New Database User** ← اسم مستخدم + كلمة مرور **قوية بلا رموز خاصة** (احفظها).
5. **Connect ➜ Drivers ➜ Node.js** ← انسخ الرابط، وشكله:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. حدّد قاعدة البيانات: إما تضيفها في الرابط قبل `?` → `/nova`، أو تضبط `MONGODB_DB=nova` في `.env` (الأسهل).
7. حطّه في `MONGODB_URI` داخل `.env`، وأعد التشغيل.
8. تحقق: الكونسول يطبع `🗄️ متصل بقاعدة البيانات` ← لو طلع، الاتصال مضبوط.

**تنبيه أمني:** رمز `MONGODB_URI` سر → في `.env` فقط، ولا يُكتب في Git ولا في المحادثة.

---

## ✅ قائمة تحقق نهائية (سوّها بالترتيب)

- [ ] `MONGODB_URI` مضبوط (وإلا البيانات تضيع مع أول إعادة نشر).
- [ ] الخدمة الجديدة تشتغل: `/health` = 200 · والكونسول فيه `🤖 Logged in as`.
- [ ] اللوحة تفتح ويسجّل دخولك (Arthur أو الإيميل المخصص) من رابط النفق.
- [ ] **حذف/إيقاف خدمة Render القديمة** ← الخدمة ← Settings ← **Delete** (وإلا ١ نوفمبر بيشتغل بوتين مع بعض على نفس التوكن = البوت يرد مرتين).
- [ ] لو الحساب القديم فيه **خدمة مجانية ثانية** → احذفها كذلك.
- [ ] `/panel` تشتغل بكلمة المرور.
- [ ] تذكير: **دخول لوحة Wispbyte كل أسبوعين** + مانع الإعلانات مطفي على موقعهم.
- [ ] 🎨 صفحة «رتب الألوان»: حدّد روم قائمة الألوان (المكتشف التلقائي ما لقاه آخر تشغيل: `⚠️ ما لقيت روم ألوان تلقائياً`).

> 📝 لاحظ: أي تعديل بالكود الآن **ما ينشر تلقائياً** مثل Render — لازم تنزّل الـZIP من GitHub وترفعه من جديد (أو تعدّل الملفات من `Files`).

---

## 🧯 استكشاف الأخطاء السريع

| المشكلة | السبب والحل |
|---|---|
| `503 Service Suspended` | خدمة Render موقوفة (ساعات الحساب خلصت) → استخدم Wispbyte. مو خطأ بالكود. |
| `❌ فشل تشغيل البوت: An invalid token was provided` | (١) في Wispbyte: **متغيرات صفحة Environment لا تعمل** → التوكن لازم في `.env` داخل `novabot-main`. (٢) أو الملف بمكان غلط/اسمه `.env.txt`/مسافات. (٣) أو التوكن ملغى → Reset Token من البوابة. |
| `💓 نبض البقاء رجع كود 503` | `KEEPALIVE` مو مساوياً لـ`0` → معناه `.env` **ما انقرأ** (راجع مكان الملف). |
| `v19.9.0` والفويس لا يعمل | صورة Docker قديمة (`nodejs_lts`) → اختر **`nodejs_22`** من `Configuration → Startup`. |
| `SyntaxError: Unexpected end of input` + crash loop | أمر التشغيل فيه سطر جديد (`\n`) ناتج من اللصق → أعد كتابته كسطر واحد. |
| البوت `connecting` وما يتصل | توكن غلط، أو **نسختين شغالين بنفس التوكن** (احذف خدمة Render القديمة)، أو Server Members Intent مطلوب. |
| «فشل تسجيل الدخول (تأكد من Redirect URI)» / **«Invalid OAuth2 redirect_uri»** | Discord **لا يطبّق** `redirect_uris` عبر الـAPI → أضف `<رابط النفق>/auth/callback` يدوياً: `OAuth2 → Redirects → Add Redirect → Save Changes` (وتأكد أنك بالتطبيق الصح = `Application ID` نفسه `DISCORD_CLIENT_ID`). |
| «Unexpected token '<' ... is not valid JSON» باللوحة | الرد رجع **HTML** بدل JSON: (١) الصفحة المفتوحة على **رابط نفق قديم** بعد إعادة تشغيل → افتح الرابط الجديد من الخاص و`Ctrl+F5`. (٢) أو وسيط بالشبكة (VPN/مانع إعلانات) → طفّيه وافتح من الجوال. مسارات اللوحة نفسها **كلها JSON** (فيها حارس يرجّع 401/403/404 JSON). |
| `⛔ هذا الحساب غير مسموح له بدخول اللوحة` | حسابك مو Arthur ولا الإيميل المخصص — حماية مقصودة. |
| المستويات/النقاط كلها أصفار | `MONGODB_URI` مو مضبوط أو IP غير مسموح في Atlas. |
| صورة الألوان ما تطلع | فشل الكانفس → البانل يرجع تلقائياً لقائمة نصية. تأكد من نجاح `npm install` على Linux. |
| البوت يرد مرتين على كل رسالة | **فيه نسختين شغالين** — احذف وحدة (Render القديمة عادة). |
| `tailscale.com` ما يفتح / `0.0.0.0` عند جهاز صاحب المشروع | **حجب المزوّد (OmanTel)**: تسميم DNS + قطع SNI/DPI + حجب DoH. شغّل **`node deploy/check-net.js`**، ولازم الترافيك يمرّ من VPN فعلاً (ملف `hosts` **ما ينفع**). |
| بوابة «Adblock detected» في Wispbyte | طفّي مانع الإعلانات + VPN/أي حجب على شبكتك ← `Check again`. |

---

## 🌐 حجب `tailscale.com` عند صاحب المشروع (مُشخَّص بالتفصيل ١٧ أكتوبر ٢٠٢٦)

**السبب: مزوّد الخدمة `OmanTel` (AS28885، صلالة/عُمان)** — مو NetShield ولا الـVPN. عنده ثلاث طبقات:

| الطبقة | الدليل المُقاس | الملاحظة |
|---|---|---|
| **تسميم DNS** | `tailscale.com` / `login` / `controlplane` / `pkgs` كلها → `0.0.0.0` | حتى مع DNS على `1.1.1.1` (المزوّد يعترض منفذ ٥٣) |
| **فحص SNI (DPI)** | نفس العنوان الحقيقي: **بلا SNI** = SSL ناجح بشهادة Tailscale سليمة، **مع SNI `x.tailscale.com`** = `ECONNRESET` خلال ~٢٠٠ms | يعني **ملف `hosts` ما ينفع** (القطع بالـSNI مو بالـDNS) |
| **حجب DoH** | `dns.google` و`cloudflare-dns.com` ما تفتح | يمنع تحايل المتصفح بـDoH |

**الحل:** **VPN يمرّر الترافيك فعلاً** (ProtonVPN يتخطى الثلاث طبقات — تحققنا: عناوين حقيقية + شهادات سليمة مع SNI).

- ⚠️ **لا تعتمد على كلمة `Connected`** في واجهة ProtonVPN: صادفنا الحالة تقول Connected والواجهة الافتراضية **بلا أي مسار** والترافيك يطلع من IP المزوّد (`85.154.169.183`) → كل نطاقات Tailscale محجوبة.
- ✅ **الأداة:** `node deploy/check-net.js` ← تطبع عنوان الخروج واسم الشركة + DNS + SNI + DoH + `*.ts.net`، وتحكم: «تقدر تسوي الخطوات الآن» أو «شغّل الـVPN».
- ✅ **`*.ts.net` مو محجوب** → بعد ما يطلع الرابط الثابت، اللوحة تفتح من جهازه عادي.
- ✅ **البوت ما يتأثر:** هو على شبكة Wispbyte (مو OmanTel)، فتنزيل `tsfunnel.js` لثنائيات Tailscale والاتصال بـcontrolplane يعمل من السيرفر بلا مشاكل.
- 🔁 **بديل لو الـVPN ما ضبط:** يسوّي خطوات Tailscale (تسجيل + مفتاح + تفعيل Funnel) من **جهاز على شبكة ثانية** — بيانات الجوال على **نفس المزوّد** غالباً محجوبة كذلك.

---

## 🔢 الحقائق اللي بُني عليها هذا الملف (١٧ أكتوبر ٢٠٢٦)

- ✅ **Wispbyte مُجرّب وشغّال:** ٥١٢MB · ١GB · ٣٥٪ CPU · ٢٤/٧ · **بدون بطاقة** · دخول كل أسبوعين · نود `FREE-EU-RO-27` (يصل لديسكورد) · **متغيرات صفحة Environment لا تُمرَّر للبوت** (لازم `.env`) · صورة `nodejs_lts` قديمة (Node 19) → لازم `nodejs_22`.
- HeavenCloud: ٧١٥MB/١GB/٧٥٪ · تجديد ٧ أيام · **بدون بطاقة** ✓ · إلزامي الديسكورد · أعطى `Failed to create: Could not establish a connection to the machine` وقت التجربة (١٧ أكتوبر).
- Render: ٧٥٠ ساعة/شهر **للحساب كله**؛ الإيقاف يعمّ كل الخدمات المجانية؛ **الحسابات الجديدة تطلب بطاقة** ✗ (الحساب القديم وراثي وحصته ترجع ١ نوفمبر).
- Oracle Cloud Free Tier: يطلب بطاقة إلزامية وما يقبل الافتراضية → مستثنى. وكذلك Google Cloud / AWS / Northflank / Fly.io / Railway / Koyeb.
- MongoDB Atlas M0: ٥١٢MB مجاني للأبد · **بدون بطاقة** ✓.
- bot-hosting.net: ٢٥٦MB · تجديد كل ٤ أيام · يعطي **رابط HTTPS** ✓ (الرام ضعيفة على حجم بوتنا).
- 🇴🇲 **شبكة صاحب المشروع (١٧ أكتوبر):** مزوّد الخدمة **OmanTel (AS28885)** يحجب `tailscale.com` بتسميم DNS (`0.0.0.0`) **وفحص SNI/DPI** (`ECONNRESET` مع SNI فيه `tailscale.com`، وبلا SNI نفس العنوان يتصل بشهادة سليمة) **وحجب نطاقات DoH** (`dns.google`/`cloudflare-dns.com`). **NetShield/VPN مو السبب** — بالعكس: **ProtonVPN يتخطى الحجب** إذا كان يمرّر الترافيك فعلاً. أداة الفحص: `deploy/check-net.js`.
- الحجم: `node_modules` = ٦٩ MB · الباقي = ٢ MB · `cloudflared` ≈ ٤٠–٥٣ MB → القرص (١ GB) ليس عقبة.
