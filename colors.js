// نظام رتب الألوان (Color Roles) — لوحة ألوان كاملة بروم مخصص:
//  1) قائمة ألوان لكل سيرفر (رتب لون) تُدار بالكامل من لوحة التحكم /dashboard → صفحة "رتب الألوان".
//  2) بانل بروم مخصص: Embed + قائمة اختيار (StringSelectMenu) — العضو يختار لونه فينعطى الرتبة
//     وتنشال عنه باقي ألوان السيرفر تلقائياً (لون واحد لكل عضو).
//  3) زر تحديث/إعادة إرسال البانل بنقرة وحدة من اللوحة.
//  4) إزالة شاملة: سحب كل رتب الألوان من جميع الأعضاء بضغطة وحدة (تشتغل بالخلفية مع تتبع التقدم).
// كل الإعدادات محفوظة في store (ملف محلي + نسخة دائمة MongoDB).
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, MessageFlags } = require('discord.js');
const store = require('./store');

const FILE = 'colors.json';
const MENU_ID = 'nova_colors';
const MAX = 125;      // أقصى عدد ألوان: 5 قوائم × 25 خيار (حد ديسكورد لكل رسالة)
const PER_MENU = 25;  // حد ديسكورد الواحد: 25 خيار بأي قائمة اختيار
const MAX_MENUS = 5;  // حد ديسكورد: 5 صفوف (قوائم) بالرسالة الوحدة
const EPH = MessageFlags.Ephemeral;

const DEF = {
    channelId: '',          // روم قائمة الألوان
    title: 'ألوان السيرفر 🎨',
    desc: 'اختر لونك من القائمة تحت. لو غيّرت رايك اختر لون ثاني وتتبدل رتبتك تلقائياً — لون واحد لكل عضو.',
    messageId: '',          // رسالة البانل (عشان نعدلها بدل ما نرسل من جديد)
    presetDone: false,      // هل جهزنا الألوان الصريحة الأساسية؟
    roles: []               // [{ id, key, name, en, color }]
};

// الألوان الصريحة الأساسية (Standard Colors) — تُنشأ كرتب بالسيرفر بهذي الأكواد بالضبط
const PRESETS = [
    { key: 'black',      ar: 'أسود',        en: 'Black',      hex: '#010101' },
    { key: 'white',      ar: 'أبيض',        en: 'White',      hex: '#FFFFFF' },
    { key: 'red',        ar: 'أحمر',        en: 'Red',        hex: '#FF0000' },
    { key: 'darkblue',   ar: 'أزرق غامق',   en: 'Dark Blue',  hex: '#002244' },
    { key: 'lightblue',  ar: 'أزرق فاتح',   en: 'Light Blue', hex: '#1ABC9C' },
    { key: 'green',      ar: 'أخضر',        en: 'Green',      hex: '#2ECC71' },
    { key: 'yellow',     ar: 'أصفر',        en: 'Yellow',     hex: '#F1C40F' },
    { key: 'orange',     ar: 'برتقالي',     en: 'Orange',     hex: '#D35400' },
    { key: 'purple',     ar: 'بنفسجي',      en: 'Purple',     hex: '#8E44AD' },
    { key: 'pink',       ar: 'وردي',        en: 'Pink',       hex: '#FF69B4' },
    { key: 'brown',      ar: 'بني',         en: 'Brown',      hex: '#795548' },
    { key: 'gray',       ar: 'رمادي',       en: 'Gray',       hex: '#4A4A4A' },
    { key: 'navy',       ar: 'كحلي',        en: 'Navy',       hex: '#2A085C' },
    { key: 'burgundy',   ar: 'عنابي',       en: 'Burgundy',   hex: '#800020' }
];
const presetLabel = (p) => `${p.ar} — ${p.en}`;

const isId = (v) => (/^\d{5,25}$/.test(String(v || '')) ? String(v) : '');
const hex = (s) => (/^#[0-9a-fA-F]{6}$/.test(String(s || '')) ? String(s) : '');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const all = () => store.read(FILE, {});

const get = (gid) => {
    const c = all()[gid] || {};
    return {
        ...DEF, ...c,
        roles: (Array.isArray(c.roles) ? c.roles : [])
            .filter((r) => r && isId(r.id))
            .map((r) => ({
                id: String(r.id),
                key: r.key ? String(r.key) : '',
                name: String(r.name || '').slice(0, 100),
                en: r.en ? String(r.en).slice(0, 40) : '',
                color: hex(r.color) || '#99aab5'
            }))
    };
};

function writeCfg(gid, cfg) {
    const a = all();
    a[gid] = cfg;
    store.write(FILE, a);
    return cfg;
}

// حفظ جزئي لإعدادات الروم والنصوص (الألوان لها دوالها تحت)
function set(gid, b = {}) {
    const cfg = get(gid);
    if (b.channelId !== undefined) cfg.channelId = isId(b.channelId);
    if (b.title !== undefined) cfg.title = String(b.title).trim().slice(0, 200) || DEF.title;
    if (b.desc !== undefined) cfg.desc = String(b.desc).trim().slice(0, 1500) || DEF.desc;
    return writeCfg(gid, cfg);
}

// ===== بانل الألوان (Embed + القائمة/القوائم) =====
function panel(cfg) {
    const n = cfg.roles.length;
    const e = new EmbedBuilder().setColor(0xb3121e).setTitle(cfg.title || DEF.title).setDescription(cfg.desc || DEF.desc);

    if (n) {
        // نوزّع أسماء الألوان على حقول (كل حقل حتى 1000 حرف) عشان ما تنقص أي ألوان
        const fields = [];
        let cur = '';
        for (const r of cfg.roles) {
            const line = '• ' + r.name + '\n';
            if ((cur + line).length > 1000) { fields.push(cur.trim()); cur = ''; }
            cur += line;
        }
        if (cur.trim()) fields.push(cur.trim());
        fields.slice(0, 20).forEach((v, i) => e.addFields({ name: i === 0 ? `الألوان المتاحة (${n})` : '\u200b', value: v }));
        e.setFooter({ text: n > PER_MENU ? `الألوان موزعة على ${Math.min(Math.ceil(n / PER_MENU), MAX_MENUS)} قوائم — اختر لونك من القوائم تحت 👇` : 'اختَر لونك من القائمة تحت 👇' });
    } else {
        e.setFooter({ text: 'ما فيه ألوان مضافة حالياً — تُضاف من لوحة التحكم.' });
    }

    const comps = [];
    const menus = Math.min(Math.ceil(n / PER_MENU) || 0, MAX_MENUS);
    for (let m = 0; m < menus; m++) {
        const chunk = cfg.roles.slice(m * PER_MENU, (m + 1) * PER_MENU);
        const menu = new StringSelectMenuBuilder()
            .setCustomId(menus > 1 ? `${MENU_ID}:${m}` : MENU_ID)
            .setPlaceholder(menus > 1 ? `🎨 اختر لونك (${m + 1}/${menus})` : '🎨 اختر لونك')
            .setMinValues(1).setMaxValues(1)
            .addOptions(chunk.map((r) => ({
                label: (r.name || 'لون').slice(0, 100),
                value: r.id,
                description: ((r.en ? r.en + ' • ' : '') + r.color).slice(0, 100)
            })));
        comps.push(new ActionRowBuilder().addComponents(menu));
    }
    return { embeds: [e], components: comps };
}

// إرسال/تحديث البانل بالروم المحدد. resend=true يعني رسالة جديدة (وتنحذف القديمة)
async function sendPanel(g, gid, opts = {}) {
    const cfg = get(gid);
    if (!cfg.channelId) throw new Error('حدّد روم قائمة الألوان أول');
    const ch = g.channels.cache.get(cfg.channelId) || await g.channels.fetch(cfg.channelId).catch(() => null);
    if (!ch || !ch.isTextBased() || ch.isVoiceBased()) throw new Error('روم الألوان مو موجود أو مو روم نصي');
    const payload = panel(cfg);

    if (cfg.messageId && !opts.resend) {
        const m = await ch.messages.fetch(cfg.messageId).catch(() => null);
        if (m) { await m.edit(payload); return { messageId: m.id, channelId: ch.id, edited: true }; }
    }
    if (opts.resend && cfg.messageId) {
        const old = await ch.messages.fetch(cfg.messageId).catch(() => null);
        if (old) await old.delete().catch(() => {});
    }
    const sent = await ch.send(payload);
    cfg.messageId = sent.id;
    writeCfg(gid, cfg);
    return { messageId: sent.id, channelId: ch.id, edited: false };
}

// تحديث صامت بعد أي تعديل على الألوان (عشان القائمة تتبدل فوراً في السيرفر)
const refreshQuiet = (g, gid) => sendPanel(g, gid).catch(() => null);

// ===== تجهيز الألوان الصريحة (Standard Colors) =====
const canManage = (g) => !!(g.members.me && g.members.me.permissions.has('ManageRoles'));

// روم الألوان المحتمل (لو ما تحدد باللوحة) — ندوّر روم نصي باسم فيه "الوان" أو "color"
function findColorChannel(g) {
    return [...g.channels.cache.values()].find((c) =>
        !c.isThread() && c.isTextBased() && !c.isVoiceBased() && /الوان|اللوان|رتب[-_ ]?الوان|colors?/i.test(c.name)) || null;
}

// ينشئ/يصحّح الألوان الصريحة الـ14 بالسيرفر ويخلي قائمة الألوان عليهم بالضبط
async function applyPreset(g, gid, opts = {}) {
    if (!canManage(g)) throw new Error('البوت يحتاج صلاحية Manage Roles لتجهيز الألوان');
    const cfg = get(gid);
    await g.roles.fetch();
    const top = g.members.me ? g.members.me.roles.highest.position : 0;
    const out = [], warn = [];
    let created = 0, fixed = 0;

    for (const p of PRESETS) {
        const label = presetLabel(p);
        // ندوّر الرتبة: بالاسم الصريح أول، وإلا بالربط السابق (المفتاح)
        let r = g.roles.cache.find((x) => x.name === label) || null;
        if (!r) {
            const linked = cfg.roles.find((x) => x.key === p.key);
            if (linked) r = g.roles.cache.get(linked.id) || null;
        }
        if (!r) {
            r = await g.roles.create({ name: label, color: p.hex, reason: 'تجهيز ألوان السيرفر الصريحة' });
            created++;
        } else if (!r.managed && String(r.hexColor || '').toLowerCase() !== p.hex.toLowerCase()) {
            await r.edit({ color: p.hex, reason: 'تصحيح كود اللون الصريح' });
            fixed++;
        }
        if (r.position >= top) warn.push(`رتبتي لازم تكون أعلى من «${p.ar}» عشان أقدر أعطيها وأشيلها`);
        out.push({ id: r.id, key: p.key, name: r.name, en: p.en, color: p.hex });
    }

    // الألوان القديمة: اللي كانت بالقائمة ومو ضمن الألوان الصريحة
    const old = cfg.roles.filter((x) => !out.some((y) => y.id === x.id));
    const deleted = [];
    if (opts.deleteOld === true) {
        for (const o of old) {
            const r = g.roles.cache.get(o.id);
            if (!r) continue;
            try { await r.delete('حذف ألوان قديمة (تجهيز الألوان الصريحة)'); deleted.push(r.name); }
            catch { warn.push(`ما قدرت أحذف «${o.name}»`); }
        }
    }

    cfg.roles = out;
    writeCfg(gid, cfg);
    await refreshQuiet(g, gid);
    return { roles: cfg.roles, created, fixed, oldCount: old.length, deleted: deleted.length, warn };
}

// ===== إدارة الألوان =====
async function addRole(g, gid, b = {}) {
    const cfg = get(gid);
    if (cfg.roles.length >= MAX) throw new Error(`الحد الأقصى ${MAX} لون`);
    let r = null;
    if (b.roleId) {
        r = g.roles.cache.get(String(b.roleId)) || await g.roles.fetch(String(b.roleId)).catch(() => null);
        if (!r || r.id === g.id) throw new Error('الرتبة مو موجودة');
        if (r.managed) throw new Error('هذي رتبة بوت/تكامل، ما تنفع كلون');
    } else {
        const name = String(b.name || '').trim().slice(0, 100);
        const color = hex(b.color);
        if (!name) throw new Error('اكتب اسم اللون');
        if (!color) throw new Error('اختر لون صحيح (مثال: #ff0055)');
        r = await g.roles.create({ name, color, reason: 'إضافة لون من لوحة التحكم' });
    }
    if (cfg.roles.some((x) => x.id === r.id)) throw new Error('هذا اللون مضاف من قبل');
    const top = g.members.me ? g.members.me.roles.highest.position : 0;
    if (r.position >= top) throw new Error('رتبتي لازم تكون أعلى من رتبة اللون عشان أقدر أتحكم فيها');
    cfg.roles.push({ id: r.id, name: r.name, color: hex(r.hexColor) || hex(b.color) || '#99aab5' });
    writeCfg(gid, cfg);
    await refreshQuiet(g, gid);
    return { roles: cfg.roles };
}

async function editRole(g, gid, b = {}) {
    const cfg = get(gid);
    const item = cfg.roles.find((x) => x.id === String(b.id));
    if (!item) throw new Error('اللون مو موجود بالقائمة');
    const r = g.roles.cache.get(item.id) || await g.roles.fetch(item.id).catch(() => null);
    if (!r) throw new Error('الرتبة محذوفة من السيرفر — احذفها من القائمة');

    const name = b.name === undefined ? '' : String(b.name).trim().slice(0, 100);
    const color = hex(b.color);
    if ((name || color) && !r.managed) {
        const o = {};
        if (name) o.name = name;
        if (color) o.color = color;
        await r.edit({ ...o, reason: 'تعديل لون من لوحة التحكم' });
    }
    if (name) item.name = name;
    if (color) item.color = color;
    item.name = r.name || item.name;
    item.color = hex(r.hexColor) || item.color;
    writeCfg(gid, cfg);
    await refreshQuiet(g, gid);
    return { roles: cfg.roles };
}

async function delRole(g, gid, b = {}) {
    if (b.confirm !== true) throw new Error('يحتاج تأكيد');
    const cfg = get(gid);
    const i = cfg.roles.findIndex((x) => x.id === String(b.id));
    if (i < 0) throw new Error('اللون مو موجود بالقائمة');
    const item = cfg.roles[i];
    let deleted = false;
    if (b.deleteRole === true) {
        const r = g.roles.cache.get(item.id) || await g.roles.fetch(item.id).catch(() => null);
        if (r) {
            const top = g.members.me ? g.members.me.roles.highest.position : 0;
            if (r.position >= top) throw new Error('رتبتي لازم تكون أعلى من رتبة اللون');
            await r.delete('حذف لون من لوحة التحكم');
            deleted = true;
        }
    }
    cfg.roles.splice(i, 1);
    writeCfg(gid, cfg);
    await refreshQuiet(g, gid);
    return { roles: cfg.roles, deleted };
}

// ===== قائمة الاختيار: العضو ياخذ لونه وتنشال عنه باقي الألوان =====
async function handleSelect(i) {
    if (!i.isStringSelectMenu() || !String(i.customId).startsWith(MENU_ID)) return false;
    try {
        const cfg = get(i.guildId);
        const wanted = cfg.roles.find((r) => r.id === String(i.values[0]));
        if (!wanted) { await i.reply({ content: '⚠️ هذا اللون مو موجود حالياً، جرّب مرة ثانية.', flags: EPH }); return true; }

        const me = i.guild.members.me;
        const role = i.guild.roles.cache.get(wanted.id) || await i.guild.roles.fetch(wanted.id).catch(() => null);
        const top = me ? me.roles.highest.position : 0;
        if (!role || role.position >= top) {
            await i.reply({ content: '⚠️ ما أقدر أعطيك هذا اللون (رتبتي لازم تكون أعلى من رتب الألوان).', flags: EPH });
            return true;
        }

        await i.deferReply({ flags: EPH });
        const others = cfg.roles.filter((r) => r.id !== role.id && i.member.roles.cache.has(r.id)).map((r) => r.id);
        if (others.length) await i.member.roles.remove(others, 'تبديل لون من قائمة ألوان السيرفر').catch(() => {});
        if (!i.member.roles.cache.has(role.id)) await i.member.roles.add(role, 'اختيار لون من قائمة ألوان السيرفر');
        const n = others.length ? ` (وشلنا عنك ${others.length} لون قديم)` : '';
        await i.editReply({ content: `🎨 تم تخصيص لونك: **${role.name}**${n}` });
    } catch (err) {
        console.error('❌ قائمة الألوان:', err.message);
        const msg = { content: '⚠️ ما قدرت أخصص اللون، تأكد إن عندي صلاحية Manage Roles ورتبتي أعلى من رتب الألوان.', flags: EPH };
        if (i.deferred) i.editReply(msg).catch(() => {}); else i.reply(msg).catch(() => {});
    }
    return true;
}

// ===== إزالة شاملة: سحب رتب الألوان من كل الأعضاء (بالخلفية) =====
let job = { running: false, startedAt: 0, finishedAt: 0, total: 0, scanned: 0, touched: 0, removed: 0, failed: 0, roleNames: [], error: '' };
const clearStatus = () => ({ ...job });

function startClear(g, gid, b = {}) {
    if (job.running) throw new Error('فيه عملية إزالة شغالة حالياً — انتظر لين تخلص');
    if (b.confirm !== true) throw new Error('يحتاج تأكيد');
    const cfg = get(gid);
    if (!cfg.roles.length) throw new Error('ما فيه ألوان مضافة');
    const want = Array.isArray(b.roleIds) && b.roleIds.length ? b.roleIds.map(String) : null;
    const pick = want ? cfg.roles.filter((r) => want.includes(r.id)) : cfg.roles;
    const roles = pick.map((x) => g.roles.cache.get(x.id)).filter(Boolean);
    if (!roles.length) throw new Error('رتب الألوان مو موجودة بالسيرفر');

    job = { running: true, startedAt: Date.now(), finishedAt: 0, total: 0, scanned: 0, touched: 0, removed: 0, failed: 0, roleNames: roles.map((r) => r.name), error: '' };
    runClear(g, roles).catch((e) => { job.error = e.message; job.running = false; job.finishedAt = Date.now(); });
    return clearStatus();
}

async function runClear(g, roles) {
    const members = await g.members.fetch();
    job.total = members.size;
    let n = 0;
    for (const m of members.values()) {
        n++;
        job.scanned = n;
        if (m.user.bot) continue;                       // البوتات ما نحسبها
        const has = roles.filter((r) => m.roles.cache.has(r.id));
        if (!has.length) continue;
        try {
            await m.roles.remove(has, 'إزالة شاملة لألوان السيرفر (لوحة التحكم)');
            job.touched++;
            job.removed += has.length;
        } catch { job.failed++; }
        if (n % 20 === 0) await wait(1000);             // تهدئة عشان حدود ديسكورد
    }
    job.running = false;
    job.finishedAt = Date.now();
    console.log(`🧹 إزالة الألوان: ${job.removed} لون من ${job.touched} عضو (فشل ${job.failed})`);
}

// عدد الأعضاء اللي شايلين كل لون (يستخدمها الداشبورد)
async function stats(g, gid) {
    const cfg = get(gid);
    await g.members.fetch();
    const out = { members: g.members.cache.size, withAny: 0, roles: {} };
    for (const m of g.members.cache.values()) {
        if (m.user.bot) continue;
        let has = false;
        for (const r of cfg.roles) if (m.roles.cache.has(r.id)) { out.roles[r.id] = (out.roles[r.id] || 0) + 1; has = true; }
        if (has) out.withAny++;
    }
    return out;
}

// ===== ربط النظام بالبوت =====
function init(client, CONFIG) {
    ensure(client, CONFIG);
}

// كل ما يرجع البوت أونلاين: نجهّز الألوان الصريحة (مرة وحدة) ونتأكد إن البانل موجود ومحدّث
function ensure(client, CONFIG, delay = 10_000) {
    const gid = CONFIG.GUILD_ID;
    setTimeout(async () => {
        try {
            const g = client.guilds.cache.get(gid);
            if (!g || !client.isReady()) return;

            // 1) تجهيز الألوان الصريحة تلقائياً أول مرة (لو ما فيه ألوان مضافة)
            let cfg = get(gid);
            if (!cfg.presetDone && cfg.roles.length === 0) {
                try {
                    const r = await applyPreset(g, gid, { deleteOld: false });
                    cfg = get(gid); cfg.presetDone = true; writeCfg(gid, cfg);
                    console.log(`🎨 تجهيز الألوان الصريحة: ${r.roles.length} لون (جديد ${r.created} • مصحّح ${r.fixed})`);
                    r.warn.forEach((w) => console.warn('⚠️ ' + w));
                } catch (e) { console.error('❌ تجهيز الألوان الصريحة:', e.message); }
            }

            // 2) تحديد روم الألوان تلقائياً لو ما تحدد من اللوحة
            cfg = get(gid);
            if (!cfg.channelId) {
                await g.channels.fetch().catch(() => null);
                const ch = findColorChannel(g);
                if (ch) { cfg.channelId = ch.id; writeCfg(gid, cfg); console.log(`🎨 روم الألوان: #${ch.name}`); }
            }

            // 3) إرسال/تحديث البانل
            if (get(gid).channelId) {
                const r = await sendPanel(g, gid);
                console.log(`🎨 بانل الألوان ${r.edited ? 'انحدّث' : 'انرسل'}`);
            }
        } catch (e) { console.error('❌ بانل الألوان:', e.message); }
    }, delay);
}

module.exports = {
    FILE, MENU_ID, MAX, PER_MENU, MAX_MENUS, DEF, PRESETS, presetLabel,
    get, set, panel, sendPanel, refreshQuiet, ensure, init,
    addRole, editRole, delRole, handleSelect, applyPreset, findColorChannel,
    startClear, clearStatus, stats
};
