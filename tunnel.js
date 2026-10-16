// ====================================================================
// نفق Cloudflare تلقائي (يشتغل فقط لو TUNNEL=1)
// ====================================================================
// ليش موجود؟ استضافات البوت المجانية (Pterodactyl مثل HeavenCloud) ما تعطي
// رابط HTTPS عام، واللوحة /dashboard تحتاج رابط HTTPS لأن ديسكورد يرفض
// redirect_uri غير مشفّر. هذا الملف:
//   1) ينزّل binary cloudflared الرسمي (مجاني، بلا حساب، بلا دومين، بلا بطاقة).
//   2) يشغّله نفق سريع على منفذ البوت → يطلع رابط https://xxx.trycloudflare.com.
//   3) يُبلّغ عن رابط اللوحة (رسالة خاصة + الكونسول) ويسجّله عند ديسكورد.
//      ⚠️ درس مُختبر (١٧ أكتوبر ٢٠٢٦): ديسكورد **لا يطبّق** redirect_uris المبعوثة عبر
//      PATCH /applications/@me (يرجع 200 ويتجاهلها) → تسجيل الدخول يطلع
//      «Invalid OAuth2 redirect_uri» حتى تسجّله يدوياً من بوابة المطورين.
//      لذلك نتحقق بإعادة القراءة، ولو ما انسجّل نطبع الرسالة ونرسل الخطوة اليدوية.
//
// ⚠️ ملف cloudflared ما يُرفع إلى Git أبداً (مستثنى في .gitignore) — يُنزّل عند أول تشغيل.
// ⚠️ على Render أو أي استضافة تعطي HTTPS أصلاً: اترك TUNNEL فارغ (لا نشغّل النفق).
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const IS_WIN = process.platform === 'win32';
const BIN = path.join(__dirname, IS_WIN ? 'cloudflared.exe' : 'cloudflared');
const URL_RE = /https:\/\/[a-z0-9][a-z0-9-]*\.trycloudflare\.com/i;
const DISCORD_API = 'https://discord.com/api/v10';

let proc = null;
let publicUrl = null;
let attempts = 0;

const asset = () => {
    const arm = os.arch() === 'arm64';
    if (IS_WIN) return arm ? 'cloudflared-windows-arm64.exe' : 'cloudflared-windows-amd64.exe';
    return arm ? 'cloudflared-linux-arm64' : 'cloudflared-linux-amd64';
};

// تنزيل cloudflared مرة وحدة (يخزّن جنب المشروع ويبقى بعد إعادة التشغيل)
async function ensureBinary() {
    if (fs.existsSync(BIN) && fs.statSync(BIN).size > 1_000_000) return;
    const url = 'https://github.com/cloudflare/cloudflared/releases/latest/download/' + asset();
    console.log('🌉 تجهيز النفق: أنزّل cloudflared لأول مرة...');
    const res = await fetch(url);
    if (!res.ok) throw new Error('تنزيل cloudflared رجع HTTP ' + res.status);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(BIN, buf);
    try { fs.chmodSync(BIN, 0o755); } catch {}
    console.log(`🌉 تم التنزيل (${(buf.length / 1048576).toFixed(1)} MB)`);
}

// تسجيل رابط اللوحة كـredirect URI عند ديسكورد.
// ⚠️ مُختبر: ديسكورد يرجّع 200 على PATCH بس ما يطبّق redirect_uris → لازم تحقّق + خطوة يدوية.
async function registerRedirect(base) {
    const token = process.env.DISCORD_TOKEN;
    const want = base + '/auth/callback';
    if (!token) return { ok: false, want, reason: 'ما فيه DISCORD_TOKEN' };
    const headers = { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' };
    try {
        const app = await (await fetch(`${DISCORD_API}/applications/@me`, { headers })).json();
        if (!app || !app.id) {
            console.error('🌉 تعذّر قراءة تطبيق ديسكورد:', app && app.message ? app.message : 'رد غير متوقع');
            return { ok: false, want, reason: 'تعذّر قراءة التطبيق' };
        }
        if ((app.redirect_uris || []).includes(want)) {
            console.log('🌉 رابط اللوحة مسجّل عند ديسكورد من قبل ✓');
            return { ok: true, want };
        }
        const list = [...new Set([...(app.redirect_uris || []), want])].slice(-10);   // حد ديسكورد ١٠ روابط
        const r = await fetch(`${DISCORD_API}/applications/@me`, {
            method: 'PATCH', headers, body: JSON.stringify({ redirect_uris: list })
        });
        // نتحقق فعلياً بإعادة القراءة (ديسكورد يرجّع 200 ويتجاهل الحقل)
        const after = await (await fetch(`${DISCORD_API}/applications/@me`, { headers })).json();
        if ((after.redirect_uris || []).includes(want)) {
            console.log('🌉 سجّلت رابط اللوحة عند ديسكورد تلقائياً ✓');
            return { ok: true, want };
        }
        console.warn('🌉 ⚠️ ديسكورد ما طبّق الرابط (كود ' + r.status + ') — سجّله يدوياً:\n' +
            '    OAuth2 → Redirects → Add Redirect → ' + want + ' → Save Changes');
        return { ok: false, want, reason: 'بوابة ديسكورد ما تطبّق redirect_uris عبر الـAPI' };
    } catch (e) {
        console.error('🌉 خطأ تسجيل الرابط عند ديسكورد:', e.message);
        return { ok: false, want, reason: e.message };
    }
}

// تأكيد إن الرابط صار يوصل فعلاً (نطاقات النفق تحتاج ~دقيقة لين تنتشر في DNS)
async function verify(url) {
    for (let i = 1; i <= 20; i++) {
        try {
            const r = await fetch(url + '/health', { signal: AbortSignal.timeout(15_000) });
            if (r.ok) {
                console.log('🌉 ✅ النفق جاهز واللوحة صارت متاحة على الإنترنت');
                return;
            }
        } catch (e) { /* لسا ينتشر — نطاقات النفق تاخذ دقيقة أو دقيقتين أول مرة */ }
        await new Promise((s) => setTimeout(s, 8000));
    }
    console.log('🌉 ⚠️ الرابط طلع بس ما تأكد الوصول — الأسباب المعروفة: VPN شغال (NetShield/ProtonVPN)، أو شبكة تحجب trycloudflare، أو كاش DNS سلبي (انتظر دقيقتين). جرّب من الجوال أو غيّر DNS إلى 1.1.1.1');
}

// تشغيل النفق + قراءة الرابط من مخرجات cloudflared
function spawnTunnel(port, protocol) {
    const args = ['tunnel', '--no-autoupdate', '--url', `http://127.0.0.1:${port}`];
    if (protocol) args.push('--protocol', protocol);
    console.log(`🌉 تشغيل النفق على المنفذ ${port}${protocol ? ' (' + protocol + ')' : ''}...`);
    proc = spawn(BIN, args, { cwd: __dirname, stdio: ['ignore', 'pipe', 'pipe'] });

    let handled = false;
    const onData = (chunk) => {
        const text = chunk.toString();
        const m = text.match(URL_RE);
        if (m && !handled) {
            handled = true;
            publicUrl = m[0];
            process.env.PUBLIC_URL = publicUrl;      // اللوحة تقرأها عشان redirect_uri
            console.log('🌉 رابط اللوحة العام: ' + publicUrl);
            if (typeof module.exports.onUrl === 'function') {
                module.exports.onUrl(publicUrl);
            }
            registerRedirect(publicUrl)
                .then((info) => { if (typeof module.exports.onRedirect === 'function') module.exports.onRedirect(info); })
                .catch((e) => console.error('🌉 خطأ تسجيل الرابط:', e.message));
            verify(publicUrl);
        }
    };
    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);

    proc.on('error', (e) => console.error('🌉 خطأ في تشغيل النفق:', e.message));
    proc.on('exit', (code) => {
        proc = null;
        if (publicUrl) console.log(`🌉 توقف النفق (كود ${code}) — أعيد تشغيله خلال ٣٠ ثانية`);
        // لو طلع الرابط سابقاً → إعادة تشغيل عادية؛ ولو ما طلع → نغيّر البروتوكول ثم نحاول
        setTimeout(() => {
            if (attempts >= 5) return console.error('🌉 توقفت محاولات النفق — اللوحة بلا رابط عام (البوت شغال عادي)');
            attempts++;
            if (publicUrl) spawnTunnel(port, null);
            else if (attempts === 1) spawnTunnel(port, 'http2');
            else spawnTunnel(port, null);
        }, publicUrl ? 30_000 : 5_000);
    });

    // لو ما طلع رابط خلال ٤٥ ثانية → نجرّب بروتوكول http2
    if (!protocol) {
        setTimeout(() => {
            if (!handled && proc) {
                console.error('🌉 ما طلع رابط — أعيد المحاولة ببروتوكول http2');
                try { proc.kill(); } catch {}
            }
        }, 45_000);
    }
}

// نقطة التشغيل: ترجع false لو النفق مطفي
async function start(port) {
    if (String(process.env.TUNNEL ?? '0') !== '1') return false;
    if (process.env.RENDER_EXTERNAL_URL) {
        console.log('🌉 الاستضافة تعطي رابط HTTPS أصلاً — النفق مو لازم (TUNNEL=0 أفضل)');
    }
    try {
        await ensureBinary();
    } catch (err) {
        console.error('🌉 تعذّر تجهيز النفق (البوت يكمل عادي، بس اللوحة بدون رابط عام):', err.message);
        return false;
    }
    spawnTunnel(port, null);
    return true;
}

module.exports = { start, getUrl: () => publicUrl, onUrl: null, onRedirect: null };
