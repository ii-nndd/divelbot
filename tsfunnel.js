// ====================================================================
// رابط لوحة ثابت للأبد عبر Tailscale Funnel (يشتغل لو TS_AUTHKEY مضبوط)
// ====================================================================
// ليش؟ نفق Cloudflare السريع (tunnel.js) يعطي رابط عشوائي جديد كل إقلاع، ولأن
// Discord ما يطبّق redirect_uri عبر الـAPI → لازم نسجّله يدوياً كل مرة.
// Tailscale Funnel يعطي **رابط ثابت** `https://<hostname>.<tailnet>.ts.net`
// (مجاني · بلا بطاقة · بلا دومين · بلا شاشة تحذير) → نسجّل redirect_uri مرة وحدة وننسى.
//
// ⚠️ مُختبر من مطوّري Tailscale: Funnel يشتغل مع `--tun=userspace-networking`
//    (بلا root وبلا /dev/net/tun) — شهادات HTTPS تُصدر من سيرفرات Tailscale.
// ⚠️ الثنائيات تُنزّل وقت أول تشغيل إلى مجلد `tailscale/` (مستثنى من Git).
const { execFileSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const DIR = path.join(__dirname, 'tailscale');
const BIN = path.join(DIR, 'tailscale');
const DAEMON = path.join(DIR, 'tailscaled');
const SOCK = path.join(DIR, 'ts.sock');
const STATE = path.join(DIR, 'state');
const TGZ = path.join(DIR, 'tailscale.tgz');

let daemon = null;
let url = null;
let enableLink = null;
let lastError = null;
let funnelDone = false;
let attempts = 0;

const arch = () => (process.arch === 'arm64' ? 'arm64' : 'amd64');
const sleep = (ms) => new Promise((s) => setTimeout(s, ms));
const log = (m) => console.log('🌒 ' + m);

// ترتيب الإصدارات: 1.80.3 > 1.80.2
function newer(a, b) {
    const x = a.split('.').map(Number), y = b.split('.').map(Number);
    for (let i = 0; i < Math.max(x.length, y.length); i++) {
        if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0) ? a : b;
    }
    return a;
}

// نلقى آخر إصدار من صفحة/واجهة Tailscale (تشتغل على HTML و JSON بنفس التعابير)
function pickTarball(text, want) {
    const re = new RegExp('(https://pkgs\\.tailscale\\.com/stable/)?tailscale_([0-9.]+)_' + want + '\\.tgz', 'g');
    let m, best = null, ver = null;
    while ((m = re.exec(text))) {
        const link = (m[1] || 'https://pkgs.tailscale.com/stable/') + 'tailscale_' + m[2] + '_' + want + '.tgz';
        if (!ver || newer(m[2], ver) === m[2]) { ver = ver ? newer(m[2], ver) : m[2]; best = link; }
    }
    return best;
}

// استخراج ملفين من أرشيف tar.gz (احتياطي لو `tar` مو موجود)
function untar(buf, want) {
    const out = {};
    let off = 0;
    while (off + 512 <= buf.length) {
        const h = buf.subarray(off, off + 512);
        const name = h.subarray(0, 100).toString('utf8').replace(/\0[\s\S]*$/, '');
        if (!name) break;
        const size = parseInt(h.subarray(124, 136).toString('utf8').replace(/\0[\s\S]*$/, '').trim(), 8) || 0;
        const data = off + 512;
        const base = name.split('/').pop();
        if (want.includes(base)) out[base] = buf.subarray(data, data + size);
        off = data + Math.ceil(size / 512) * 512;
    }
    return out;
}

async function ensureBinaries() {
    if (fs.existsSync(BIN) && fs.existsSync(DAEMON) && fs.statSync(DAEMON).size > 1_000_000) return true;
    fs.mkdirSync(DIR, { recursive: true });
    const want = arch();
    log('أجهّز Tailscale لأول مرة (تنزيل الثنائيات)...');
    let link = null;
    for (const u of ['https://pkgs.tailscale.com/stable/?mode=json', 'https://pkgs.tailscale.com/stable/']) {
        try {
            const r = await fetch(u, { signal: AbortSignal.timeout(30_000) });
            if (!r.ok) continue;
            link = pickTarball(await r.text(), want);
            if (link) break;
        } catch (e) { lastError = e.message; }
    }
    if (!link) throw new Error('ما لقيت رابط تنزيل Tailscale (تحقق من الوصول لـpkgs.tailscale.com)');
    const res = await fetch(link, { signal: AbortSignal.timeout(180_000) });
    if (!res.ok) throw new Error('تنزيل Tailscale رجع HTTP ' + res.status);
    const buf = Buffer.from(await res.arrayBuffer());
    log(`تم التنزيل (${(buf.length / 1048576).toFixed(1)} MB) — أفك الضغط...`);
    fs.writeFileSync(TGZ, buf);
    let done = false;
    try {
        const inner = path.join(DIR, path.basename(link).replace(/\.tgz$/, ''));
        execFileSync('tar', ['-xzf', TGZ, '-C', DIR], { stdio: 'ignore' });
        for (const f of ['tailscale', 'tailscaled']) {
            fs.copyFileSync(path.join(inner, f), path.join(DIR, f));
            fs.chmodSync(path.join(DIR, f), 0o755);
        }
        fs.rmSync(inner, { recursive: true, force: true });
        done = true;
    } catch (e) {
        log('tar مو متاح — أفك الأرشيف داخلياً...');
        const files = untar(zlib.gunzipSync(buf), ['tailscale', 'tailscaled']);
        for (const f of ['tailscale', 'tailscaled']) {
            if (!files[f]) throw new Error('الأرشيف ما يحتوي ' + f);
            fs.writeFileSync(path.join(DIR, f), files[f]);
            fs.chmodSync(path.join(DIR, f), 0o755);
        }
        done = true;
    }
    try { fs.rmSync(TGZ, { force: true }); } catch {}
    log(done ? 'الثنائيات جاهزة ✓' : 'تعذّر تجهيز الثنائيات');
    return done;
}

function spawnDaemon() {
    log('أشغّل tailscaled (userspace-networking — بلا root)...');
    daemon = spawn(DAEMON, [
        '--tun=userspace-networking',
        '--socket=' + SOCK,
        '--statedir=' + STATE,
        '--no-logs-no-support'
    ], { cwd: __dirname, stdio: ['ignore', 'pipe', 'pipe'] });
    daemon.stdout.on('data', (c) => { const s = c.toString().trim(); if (s) console.log('🌒 ' + s.split('\n').slice(-1)[0].slice(0, 200)); });
    daemon.stderr.on('data', (c) => { const s = c.toString().trim(); if (s) console.log('🌒 ' + s.split('\n').slice(-1)[0].slice(0, 200)); });
    daemon.on('exit', (code) => { daemon = null; log('توقف tailscaled (كود ' + code + ')'); });
}

// تشغيل أمر tailscale عبر السوكيت المحلي
function ts(args, timeout = 90_000) {
    try {
        const out = execFileSync(BIN, ['--socket=' + SOCK, ...args], { timeout, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
        return { code: 0, out: String(out || '') };
    } catch (e) {
        return { code: e.status || 1, out: String((e.stdout || '') + (e.stderr || '') || e.message) };
    }
}

async function waitSocket(ms = 45_000) {
    for (let i = 0; i < ms / 500; i++) {
        if (fs.existsSync(SOCK)) return true;
        await sleep(500);
    }
    return false;
}

// تفعيل Funnel الرابط الثابت
let lastFunnelMsg = null;   // آخر سبب فشل (نطبعه مرة وحدة بدل ٢٠ مرة)
function enableFunnel(port) {
    const target = 'http://127.0.0.1:' + port;   // توثيق Tailscale: البروكسي يدعم http://127.0.0.1 فقط
    const tries = [
        ['funnel', '--bg', '--https=443', target],
        ['funnel', '--bg', '--https=443', String(port)],
        ['funnel', '--bg', String(port)]
    ];
    for (const args of tries) {
        const r = ts(args, 60_000);
        const text = r.out || '';
        const m = text.match(/https:\/\/login\.tailscale\.com\/[^\s'"]+/);
        if (m && !enableLink) {
            enableLink = m[0];
            log('⚠️ لازم تفعّل Funnel مرة وحدة من هذا الرابط:\n    ' + enableLink);
            if (typeof module.exports.onNeedFunnel === 'function') module.exports.onNeedFunnel(enableLink);
        }
        if (r.code === 0 && !/error|not enabled/i.test(text)) return true;
        // نطبع سبب الفشل من الـCLI (مثلاً HTTPS مو مفعّل) — مفيد جداً لتشخيص اللوحة
        if (text && !m) {
            const line = text.split('\n').map((s) => s.trim()).filter(Boolean).slice(-1)[0].slice(0, 240);
            if (line && line !== lastFunnelMsg) { lastFunnelMsg = line; log('Funnel ما انفعّل بعد: ' + line); }
        }
    }
    return false;
}

async function loop(port, dnsName) {
    for (let i = 0; i < 20; i++) {
        if (enableFunnel(port)) {
            url = 'https://' + dnsName.replace(/\.$/, '');
            funnelDone = true;
            log('🔒 رابط اللوحة الثابت: ' + url);
            process.env.PUBLIC_URL = url;
            verify(url);
            if (typeof module.exports.onUrl === 'function') module.exports.onUrl(url);
            return;
        }
        if (i === 2 && typeof module.exports.onFallback === 'function') {
            log('ما انفعّل Funnel للحين — أشغّل نفق Cloudflare مؤقتاً عشان ما تنقفل اللوحة');
            module.exports.onFallback();
        }
        await sleep(120_000);
    }
    lastError = lastError || 'ما قدرت أفعّل Funnel';
    log('توقفت محاولات الفتح — فعّل Funnel من الرابط أعلاه وأعد تشغيل البوت');
}

// التأكد من الوصول للرابط الثابت.
// ⚠️ توثيق Tailscale: سجلات DNS العامة للرابط قد تتأخر **حتى ١٠ دقايق** → نتحقق بصبر
// (كان ٩٦ ثانية بس → يطلع تحذير كاذب «ما تأكد» قبل ما ينتشر الـDNS).
async function verify(base) {
    for (let i = 0; i < 40; i++) {
        try {
            const r = await fetch(base + '/health', { signal: AbortSignal.timeout(15_000) });
            if (r.ok) { log('✅ الرابط الثابت يشتغل'); return; }
        } catch {}
        if (i && i % 8 === 0) log('… اللوحة للحين ما انتشرت (DNS قد يحتاج دقايق) — أكمل الفحص بالخلفية');
        await sleep(15_000);
    }
    log('⚠️ ما تأكد الرابط بعد ~١٠ دقايق — تأكد أن Funnel مفعّل ثم افتح ' + base + '/health');
}

// نقطة التشغيل: true = Tailscale شغال (نتجاهل Cloudflare)، false = جرّب Cloudflare
async function start(port) {
    const key = String(process.env.TS_AUTHKEY || '').trim();
    if (!key) return false;
    if (process.platform === 'win32') { log('التشغيل المحلي (ويندوز) — رابط Tailscale مو مدعوم هنا'); return false; }
    try {
        await ensureBinaries();
    } catch (e) {
        lastError = e.message;
        log('تعذّر تجهيز Tailscale: ' + e.message + ' — نكمل بنفق Cloudflare');
        return false;
    }
    try {
        spawnDaemon();
        if (!(await waitSocket())) { log('tailscaled ما جهّز السوكيت — أتراجع'); try { daemon && daemon.kill(); } catch {} return false; }
        const host = String(process.env.TS_HOSTNAME || 'nova-bot').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 40) || 'nova-bot';
        log(`أتصل بالـtailnet باسم ${host}...`);
        const up = ts(['up', '--authkey=' + key, '--hostname=' + host, '--accept-dns=false', '--accept-routes=false', '--ssh=false'], 120_000);
        if (up.code !== 0 && !/already logged in|Logged in/i.test(up.out)) {
            lastError = up.out.slice(0, 200);
            log('تعذّر الاتصال بالـtailnet: ' + lastError);
            if (/expired|invalid|authkey/i.test(up.out)) log('🔑 مفتاح TS_AUTHKEY غلط أو منتهي — ولّد مفتاح جديد من Tailscale');
            return false;
        }
        const st = ts(['status', '--json'], 30_000);
        let dnsName = null;
        try { dnsName = JSON.parse(st.out).Self.DNSName; } catch (e) { lastError = 'ما قدرت أقرأ حالة Tailscale'; }
        if (!dnsName) { log('ما لقيت اسم الجهاز بالـtailnet — أتراجع'); return false; }
        log('متصل ✓ (' + dnsName.replace(/\.$/, '') + ') — أفعّل Funnel...');
        loop(port, dnsName);      // بالخلفية: تعيد المحاولة لين ينفعّل Funnel
        return true;
    } catch (e) {
        lastError = e.message;
        log('خطأ Tailscale: ' + e.message);
        return false;
    }
}

module.exports = { start, getUrl: () => url, getEnableLink: () => enableLink, getError: () => lastError, isOn: () => funnelDone, onUrl: null, onNeedFunnel: null, onFallback: null };
module.exports._test = { untar, pickTarball, newer };   // للاختبارات المحلية فقط
