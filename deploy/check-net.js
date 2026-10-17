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
const DOH_HOSTS = ['dns.google', 'cloudflare-dns.com'];
const IPINFO = 'https://ipinfo.io/json';

const C = { ok: '\u2705', no: '\u274c', warn: '\u26a0\ufe0f', dot: '\u2022' };

function httpGet(url, timeout = 15000) {
    return new Promise((res) => {
        const req = https.get(url, { timeout, headers: { 'user-agent': 'node-check', accept: 'application/json' } }, (r) => {
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
    let org = '', ip = '';
    try {
        const j = JSON.parse(info.body);
        ip = j.ip; org = (j.org || '') + ' — ' + (j.city || '') + ' ' + (j.country || '');
    } catch { org = 'تعذّر الفحص (' + info.status + ')'; }
    const vpn = /proton|m247|datacamp|leaseweb|choopa|vultr|cogent|nordvpn|surfshark|mullvad|ovh|hetzner|amazon|cloudflare|warp/i.test(org);
    console.log('   ' + C.dot + ' الخروج: ' + (ip || '?') + '  |  ' + org);
    console.log('   ' + (vpn ? C.ok + ' يبدو VPN شغال (الترافيك مو من مزوّدك مباشرة)' : C.no + ' الترافيك من مزوّد الخدمة مباشرة (VPN مو شغال فعلاً)'));

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

    // ٣) هل وصول DoH محجوب أيضاً؟
    console.log('\n٣) نطاقات DoH (يستخدمها المتصفح للتحايل على DNS) :');
    for (const h of DOH_HOSTS) {
        const t0 = Date.now();
        const r = await httpGet('https://' + h + '/dns-query?name=example.com&type=A');
        console.log('   ' + (r.status === 200 ? C.ok : C.no) + ' ' + h.padEnd(24) + ' → ' + r.status + ' (' + (Date.now() - t0) + 'ms)');
    }

    // ٤) نطاق الرابط الثابت *.ts.net (هل يفتح من جهتك بدون VPN؟)
    console.log('\n٤) نطاق الرابط الثابت (*.ts.net):');
    const fakeTsNet = 'nova-bot-probe.tail0abc.ts.net';
    const tsnetDns = await resolve(fakeTsNet);
    const tsnetSni = await sniTest(fakeTsNet, (tsnetDns && tsnetDns[0]) || '1.1.1.1');
    const tsnetReset = tsnetSni === 'reset';
    console.log('   ' + (tsnetReset ? C.no + ' يقطع اتصالات *.ts.net (اللوحة راح تحتاج VPN)' : C.ok + ' ما يقطع اتصالات *.ts.net → رابط اللوحة الثابت يفتح بدون VPN') + '  [' + (tsnetDns ? tsnetDns[0] : 'اسم تجريبي بلا DNS (طبيعي)') + ' / TLS=' + tsnetSni + ']');
    console.log('     ' + C.warn + ' فحص تقريبي: نتأكد أن فحص SNI ما يقطع نطاق *.ts.net (الاسم التجريبي مو موجود فما ينتظر منه رد).');

    // ٥) الحكم
    console.log('\n------------------------------------- النتيجة -------------------------------------');
    if (usable === TS_HOSTS.length) {
        console.log(C.ok + ' كل نطاقات Tailscale تشتغل من جهتك — سوِّ خطوات الرابط الثابت الآن:');
        console.log('   1) https://login.tailscale.com/start ← سجّل');
        console.log('   2) Settings → Keys → Generate auth key (فعّل Reusable)');
        console.log('   3) الصق TS_AUTHKEY و TS_HOSTNAME في .env داخل novabot-main ← Restart');
    } else {
        console.log(C.no + ' محجوب: ' + blocked + ' من ' + TS_HOSTS.length + ' نطاقات.');
        console.log('   الحل: ' + (vpn ? 'أعد الاتصال بالـVPN (نفق مو شغال صح) أو جرّب سيرفر ثاني.' : 'شغّل ProtonVPN وتأكد أن الترافيك يمر منه، ثم أعد هذا الفحص.'));
        console.log('   بديل: سوِّ الخطوات من الجوال على بيانات شبكة ثانية (مو نفس المزوّد) — أو من شبكة فيها VPN شغال.');
    }
    console.log('\n' + C.warn + ' ملاحظة: الحجب على جهازك فقط — البوت على Wispbyte يتصل بـTailscale عادي (شبكتهم مو محجوبة).\n');
})();
