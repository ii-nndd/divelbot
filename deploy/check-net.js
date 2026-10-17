// ====================================================================
// فحص شبكة جهازك قبل خطوات الرابط الثابت (Tailscale Funnel)
// ====================================================================
// ليش؟ اكتشفنا (١٧ أكتوبر ٢٠٢٦) أن **مزوّد الخدمة نفسه** (OmanTel، AS28885) يحجب
// نطاقات tailscale.com بطريقتين:
//   ١) تسميم DNS → يرجّع `0.0.0.0`
//   ٢) فحص SNI (DPI) → يقطع أي اتصال TLS باسم فيه `tailscale.com` (ECONNRESET)
// …ويحجب كذلك نطاقات DoH الشهيرة (dns.google / cloudflare-dns.com) عشان يمنع التحايل.
// ✅ ProtonVPN **يتخطى** الحجب كله — بشرط أن النفق **شغال فعلاً** (كثير يصير الواجهة
//    تطلع «Connected» والترافيك يمر من المزوّد، فنتحقق من **عنوان الخروج**).
//
// الاستخدام:  node deploy/check-net.js
const dns = require('dns');
const https = require('https');
const tls = require('tls');

const TS_HOSTS = ['tailscale.com', 'login.tailscale.com', 'controlplane.tailscale.com', 'pkgs.tailscale.com'];
const IPINFO = 'https://ipinfo.io/json';

const C = { ok: '\u2705', no: '\u274c', warn: '\u26a0\ufe0f', dot: '\u2022' };

function httpGet(url, timeout = 15000, accept = 'application/json') {
    return new Promise((res) => {
        const req = https.get(url, { timeout, headers: { 'user-agent': 'node-check', accept } }, (r) => {
            let b = '';
            r.on('data', (c) => (b += c));
            r.on('end', () => res({ status: r.statusCode, body: b }));
        });
        req.on('timeout', () => { req.destroy(); res({ status: 'timeout' }); });
        req.on('error', (e) => res({ status: 'err:' + (e.code || e.message) }));
    });
}

const resolve = (h) => new Promise((r) => dns.resolve4(h, (e, a) => r(e ? null : a)));

function sniTest(host, ip) {
    return new Promise((res) => {
        const s = tls.connect({ host: ip, port: 443, servername: host, timeout: 10000, rejectUnauthorized: false }, () => {
            res('ok');
            s.end();
        });
        s.on('timeout', () => { s.destroy(); res('timeout'); });
        s.on('error', (e) => res(e.code === 'ECONNRESET' ? 'reset' : 'err:' + (e.code || e.message)));
    });
}

(async () => {
    console.log('\n==================== فحص الشبكة (Tailscale / الرابط الثابت) ====================\n');

    // ١) عنوان الخروج = هل VPN شغال فعلاً؟
    console.log('١) الترافيك يمر من وين؟');
    const info = await httpGet(IPINFO);
    let org = '', ip = '', country = '', city = '';
    try {
        const j = JSON.parse(info.body);
        ip = j.ip; org = j.org || ''; country = j.country || ''; city = j.city || '';
    } catch { org = 'تعذّر الفحص (' + info.status + ')'; }
    // الحكم: لو الخروج من عُمان = مازلنا على مزوّدنا (VPN ما يمرّر). وغير كذا = شبكة خارجية (VPN شغال غالباً).
    const localIsp = /^OM$/i.test(country) || /omantel|ooredoo|as28885|awasr/i.test(org);
    const vpnKnown = /proton|nforce|serverius|datacamp|m247|leaseweb|choopa|vultr|cogent|nord|surfshark|mullvad|ovh|hetzner|cloudflare|warp|zenlayer|gcore|melbicom|misaka|perfect privacy|flokinet/i.test(org);
    const vpn = vpnKnown || (!localIsp && !!country);
    console.log('   ' + C.dot + ' الخروج: ' + (ip || '?') + '  |  ' + org + (city ? ' — ' + city : '') + (country ? ' ' + country : ''));
    console.log('   ' + (vpn ? C.ok + ' الترافيك يمر من شبكة خارجية مو مزوّدك (VPN شغال ✓)' : C.no + ' الترافيك من مزوّدك مباشرة (VPN ما يمرّر — أعد تشغيله)'));

    // ٢) نطاقات Tailscale: DNS + SNI
    console.log('\n٢) نطاقات Tailscale:');
    let blocked = 0, usable = 0;
    for (const h of TS_HOSTS) {
        const ips = await resolve(h);
        const dnsPoison = !ips || ips.includes('0.0.0.0');
        const realIp = dnsPoison ? null : ips[0];
        let sni = 'لم يُفحص';
        if (realIp) {
            const r = await sniTest(h, realIp);
            sni = r === 'ok' ? 'يشتغل ✓' : r === 'reset' ? 'محجوب بفحص SNI ❌' : r;
        }
        const ok = realIp && sni.startsWith('يشتغل');
        ok ? usable++ : blocked++;
        console.log('   ' + (ok ? C.ok : C.no) + ' ' + h.padEnd(28) +
            ' DNS=' + (dnsPoison ? '0.0.0.0 (مسموم)' : ips.slice(0, 2).join(',')) + ' | TLS=' + sni);
    }

    // ٣) هل وصول DoH محجوب أيضاً؟ (كل نطاق بنقطته الصحيحة)
    console.log('\n٣) نطاقات DoH (يستخدمها المتصفح للتحايل على DNS) :');
    const DOH_URLS = [
        ['dns.google', 'https://dns.google/resolve?name=example.com&type=A', 'application/dns-json'],
        ['cloudflare-dns.com', 'https://cloudflare-dns.com/dns-query?name=example.com&type=A', 'application/dns-json']
    ];
    for (const [h, url, accept] of DOH_URLS) {
        const t0 = Date.now();
        const r = await httpGet(url, 15000, accept);
        const ok = r.status === 200;
        console.log('   ' + (ok ? C.ok : C.no) + ' ' + h.padEnd(24) + ' → ' + r.status + ' (' + (Date.now() - t0) + 'ms)');
    }

    // ٤) بدائل متاحة لو الـVPN ما ضبط (تُفحص من نفس الشبكة)
    console.log('\n٤) بدائل مجانية بلا حساب (تُستخدم لو الـVPN ما ضبط):');
    const ALTS = [
        ['engage.cloudflareclient.com', 'Cloudflare WARP — تطبيق 1.1.1.1 المجاني (المسار الأسهل)'],
        ['one.one.one.one', 'صفحة تنزيل تطبيق 1.1.1.1'],
        ['dash.cloudflare.com', 'لوحة Cloudflare (لخطة رابط ثابت عبر Workers لاحقاً)']
    ];
    for (const [h, what] of ALTS) {
        const ips = await resolve(h);
        const poisoned = !ips || ips.includes('0.0.0.0');
        const t = poisoned ? null : await sniTest(h, ips[0]);
        const ok = !poisoned && t === 'ok';
        console.log('   ' + (ok ? C.ok : C.no) + ' ' + h.padEnd(30) + (ok ? 'متاح ✓' : 'محجوب') + ' — ' + what);
    }

    // ٥) نطاق الرابط الثابت *.ts.net (هل يفتح من جهتك بدون VPN؟)
    console.log('\n٥) نطاق الرابط الثابت (*.ts.net):');
    const fakeTsNet = 'nova-bot-probe.tail0abc.ts.net';
    const tsnetDns = await resolve(fakeTsNet);
    const tsnetSni = await sniTest(fakeTsNet, (tsnetDns && tsnetDns[0]) || '1.1.1.1');
    const tsnetReset = tsnetSni === 'reset';
    console.log('   ' + (tsnetReset ? C.no + ' يقطع اتصالات *.ts.net (اللوحة راح تحتاج VPN)' : C.ok + ' ما يقطع اتصالات *.ts.net → رابط اللوحة الثابت يفتح بدون VPN') + '  [' + (tsnetDns ? tsnetDns[0] : 'اسم تجريبي بلا DNS (طبيعي)') + ' / TLS=' + tsnetSni + ']');
    console.log('     ' + C.warn + ' فحص تقريبي: نتأكد أن فحص SNI ما يقطع نطاق *.ts.net (الاسم التجريبي مو موجود فما ينتظر منه رد).');

    // ٦) الحكم
    console.log('\n------------------------------------- النتيجة -------------------------------------');
    if (usable === TS_HOSTS.length) {
        console.log(C.ok + ' كل نطاقات Tailscale تشتغل من جهتك — سوِّ خطوات الرابط الثابت الآن:');
        console.log('   1) https://login.tailscale.com/start ← سجّل');
        console.log('   2) Settings → Keys → Generate auth key (فعّل Reusable)');
        console.log('   3) الصق TS_AUTHKEY و TS_HOSTNAME في .env داخل novabot-main ← Restart');
    } else {
        console.log(C.no + ' محجوب: ' + blocked + ' من ' + TS_HOSTS.length + ' نطاقات.');
        console.log('   الحلول بالترتيب (الأسهل أولاً):');
        console.log('   1) أعد تشغيل ProtonVPN وتأكد أن الترافيك يمر منه فعلاً (كرّر هذا الأمر).');
        console.log('   2) ثبّت تطبيق **1.1.1.1 (Cloudflare WARP)** من <https://one.one.one.one> — مجاني بلا حساب وبلا بطاقة،');
        console.log('      ونقطة اتصاله مفتوحة عندك (شوف القسم ٤ فوق) → شغّله ثم أعد هذا الفحص.');
        console.log('   3) سوِّ خطوات Tailscale من شبكة ثانية (بيانات/راوتر مزوّد آخر) — الشبكة نفسها غالباً محجوبة.');
    }
    console.log('\n' + C.warn + ' ملاحظة: الحجب على جهازك فقط — البوت على Wispbyte يتصل بـTailscale عادي (شبكتهم مو محجوبة).\n');
})();
