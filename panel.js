// لوحة تحكم الردود: تفتحها من رابط البوت + /panel
// تحتاج متغير بيئة اسمه ADMIN_PASSWORD
const crypto = require('crypto');

const PAGE = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>لوحة دايڤل الملكية</title>
<style>
*{box-sizing:border-box}body{margin:0;font-family:system-ui,Tahoma,sans-serif;background:#0d0d12;color:#eee;padding:16px}
.card{max-width:760px;margin:0 auto;background:#17171f;border:1px solid #2c2c3a;border-radius:16px;padding:18px}
h1{margin:0 0 4px;font-size:22px;color:#d4af37}p.sub{margin:0 0 16px;color:#999;font-size:14px}
select,textarea,input[type=password]{width:100%;background:#0d0d12;color:#eee;border:1px solid #33334a;border-radius:10px;padding:12px;font:inherit;font-size:15px}
textarea{min-height:300px;line-height:1.7;resize:vertical;margin-top:10px}
.row{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
button,.btn{background:#8b0000;color:#fff;border:0;border-radius:10px;padding:11px 16px;font:inherit;cursor:pointer}
button.sec,.btn{background:#2c2c3a}button:disabled{opacity:.5}
#hint{color:#d4af37;font-size:13px;margin:8px 0 0;min-height:18px}
#toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:#1f6f3f;padding:10px 18px;border-radius:10px;opacity:0;transition:.3s;pointer-events:none}
#toast.err{background:#9b2020}#toast.on{opacity:1}
</style></head><body><div class="card">
<h1>👑 لوحة دايڤل الملكية</h1><p class="sub">عدّل ردود البوت: كل سطر = رد، والبوت يختار واحد عشوائي</p>
<div id="login"><input type="password" id="pw" placeholder="كلمة المرور"><div class="row"><button id="go">دخول</button></div></div>
<div id="app" hidden>
<select id="key"></select>
<div id="hint"></div>
<textarea id="txt" spellcheck="false"></textarea>
<div class="row"><button id="save">💾 حفظ</button><button class="sec" id="reset">↩️ الافتراضي</button></div>
<div class="row"><button class="sec" id="exp">⬇️ نسخة احتياطية</button><label class="btn">⬆️ استيراد<input type="file" id="imp" accept=".json" hidden></label></div>
</div></div><div id="toast"></div>
<script>
var L={greet:'ترحيب',food:'أكل',hit:'ضرب',rude:'إهانة',thanks:'شكر',where:'وينك',move:'قوم/تحرك',status:'الحالة',help:'مساعدة',poems:'شعر',jokes:'نكت',alerts:'تنبيهات',welcome:'ترحيب الفويس',custom:'كلمات خاصة',games:'الألعاب'};
var T={arthur:'ارثر',ida:'إيدا',royal:'الرتبة الملكية',peasant:'العشوائيين',all:'الكل',sentences:'جمل سرعة الكتابة',words:'كلمات المبعثرة',flags:'الأعلام'};
var $=function(i){return document.getElementById(i)},D={};
function label(k){var p=k.split('.');return (L[p[0]]||p[0])+(p[1]?' ← '+(T[p[1]]||p[1]):'')}
function toast(m,e){var t=$('toast');t.textContent=m;t.className=(e?'err ':'')+'on';setTimeout(function(){t.className=''},2200)}
function api(path,body){
  return fetch('/panel/api/'+path,{method:body?'POST':'GET',headers:{'x-pass':sessionStorage.pw||'','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined})
  .then(function(r){return r.json().then(function(j){if(!r.ok)throw new Error(j.error||'خطأ');return j})});
}
function show(){var k=$('key').value;$('txt').value=(D.all[k]||[]).join('\\n');
  $('hint').textContent=k.indexOf('custom.')===0?'الصيغة: الكلمة => الرد   (مثال: صباح الخير => صباح النور)':k==='games.flags'?'الصيغة: العلم => اسم الدولة | اسم ثاني   (مثال: 🇸🇦 => السعودية)':k.indexOf('games.')===0?'كل سطر = عنصر واحد، بدون تشكيل':''}
function load(){return api('replies').then(function(j){D=j;var s=$('key'),cur=s.value;s.innerHTML='';
  Object.keys(j.all).forEach(function(k){var o=document.createElement('option');o.value=k;o.textContent=label(k);s.appendChild(o)});
  if(cur)s.value=cur;$('login').hidden=true;$('app').hidden=false;show()})}
$('go').onclick=function(){sessionStorage.pw=$('pw').value;load().catch(function(e){toast(e.message,1)})};
$('key').onchange=show;
$('save').onclick=function(){api('replies',{key:$('key').value,lines:$('txt').value.split('\\n')}).then(load).then(function(){toast('تم الحفظ ✅')}).catch(function(e){toast(e.message,1)})};
$('reset').onclick=function(){if(!confirm('رجوع للردود الافتراضية؟'))return;api('reset',{key:$('key').value}).then(load).then(function(){toast('تم الرجوع للافتراضي')}).catch(function(e){toast(e.message,1)})};
$('exp').onclick=function(){var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(D.custom,null,2)],{type:'application/json'}));a.download='replies-backup.json';a.click()};
$('imp').onchange=function(e){var f=e.target.files[0];if(!f)return;var r=new FileReader();r.onload=function(){try{api('import',{map:JSON.parse(r.result)}).then(load).then(function(){toast('تم الاستيراد ✅')}).catch(function(x){toast(x.message,1)})}catch(x){toast('ملف غير صالح',1)}};r.readAsText(f)};
if(sessionStorage.pw)load().catch(function(){});
</script></body></html>`;

module.exports = function mountPanel(app, express, R) {
    const pass = process.env.ADMIN_PASSWORD;
    const fails = new Map();
    const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();
    app.set('trust proxy', 1);

    const auth = (req, res, next) => {
        if (!pass) return res.status(503).json({ error: 'ADMIN_PASSWORD غير مضبوط في الاستضافة' });
        const f = fails.get(req.ip) || { n: 0, t: Date.now() };
        if (Date.now() - f.t > 15 * 60_000) { f.n = 0; f.t = Date.now(); }
        if (f.n >= 10) return res.status(429).json({ error: 'محاولات كثيرة، انتظر 15 دقيقة' });
        if (!crypto.timingSafeEqual(sha(req.get('x-pass') || ''), sha(pass))) {
            f.n++; fails.set(req.ip, f);
            return res.status(401).json({ error: 'كلمة المرور غلط' });
        }
        next();
    };

    app.get('/panel', (req, res) => res.type('html').send(PAGE));

    const api = express.Router();
    api.use(express.json({ limit: '500kb' }));
    api.use(auth);
    api.get('/replies', (q, s) => s.json({ all: R.all(), custom: R.overrides() }));
    api.post('/replies', (q, s) => {
        const { key, lines } = q.body || {};
        if (typeof key !== 'string' || !Array.isArray(lines) || !R.set(key, lines))
            return s.status(400).json({ error: 'طلب غير صالح' });
        s.json({ ok: true });
    });
    api.post('/reset', (q, s) => { R.reset(String((q.body || {}).key)); s.json({ ok: true }); });
    api.post('/import', (q, s) => s.json({ ok: true, imported: R.importAll((q.body || {}).map) }));
    app.use('/panel/api', api);
};
