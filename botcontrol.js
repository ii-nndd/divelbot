// التحكم بوجود البوت (Dynamic Channel Control):
// 1) "الرومات المسموح للبوت بالتفاعل فيها" + مفتاح تفعيل/تعطيل البوت في أي روم بنقرة وحدة.
// 2) الروم الصوتي اللي يجلس فيه البوت + مفتاح إدخال/إخراج البوت من الفويس.
// الإعدادات لكل سيرفر وتتعدل من /dashboard (صفحة "التحكم بالبوت") أو بأوامر الكلام.
//
// مهم: هذا الملف مستقل تماماً عن trap.js (روم الفخ / الحظر التلقائي).
// الحظر التلقائي له listener منفصل بملف trap.js، فتعطيل البوت بروم ما يوقف الباند التلقائي أبداً.
const store = require('./store');

const DEF = {
    restrict: false,     // وضع "الرومات المحددة فقط": البوت يتجاهل أي روم غير المفعّل صراحة
    enabled: {},         // { channelId: true|false } تجاوز لكل روم (تفعيل/تعطيل بنقرة)
    voiceEnabled: true,  // البوت يبقى بالروم الصوتي (24/7)
    voiceChannelId: ''   // الروم الصوتي اللي يجلس فيه البوت (فاضي = الروم الافتراضي من index.js)
};

const isId = (v) => (/^\d{5,25}$/.test(String(v || '')) ? String(v) : '');

const all = () => store.read('botcfg.json', {});

// إعدادات سيرفر (مع نسخة جديدة من خريطة الرومات عشان ما نعدل الكاش بالغلط)
const get = (gid) => {
    const c = all()[gid] || {};
    return { ...DEF, ...c, enabled: { ...(c.enabled || {}) } };
};

function writeCfg(gid, cfg) {
    const a = all();
    a[gid] = cfg;
    store.write('botcfg.json', a);
    return cfg;
}

// حفظ جزئي: أي حقل غير مُرسل يبقى مثل ما هو
function set(gid, b = {}) {
    const cfg = get(gid);
    if (b.restrict !== undefined) cfg.restrict = !!b.restrict;
    if (b.voiceEnabled !== undefined) cfg.voiceEnabled = !!b.voiceEnabled;
    if (b.voiceChannelId !== undefined) cfg.voiceChannelId = isId(b.voiceChannelId);
    if (b.enabled && typeof b.enabled === 'object' && !Array.isArray(b.enabled)) {
        const map = {};
        for (const [k, v] of Object.entries(b.enabled)) {
            const id = isId(k);
            if (id && typeof v === 'boolean') map[id] = v;
        }
        cfg.enabled = map;
    }
    return writeCfg(gid, cfg);
}

// الحالة الفعلية: هل البوت يتفاعل في هذا الروم؟
// - فيه تفعيل صريح للروم؟ نستخدمه (true/false يفوز دايماً).
// - ما فيه تفعيل صريح؟ نرجع لوضع السيرفر: "كل الرومات" مفعّل، أو "المحددة فقط" معطّل.
function effective(gid, channelId) {
    const cfg = get(gid);
    const st = cfg.enabled[channelId];
    if (st === true) return true;
    if (st === false) return false;
    return !cfg.restrict;
}
const canInteract = (gid, channelId) => (channelId ? effective(gid, channelId) : true);

// تبديل روم وحد: لو forceBoolean موجود نستخدمه، وإلا نعكس الحالة الفعلية ونخزنها صراحة
function toggleChannel(gid, channelId, forceBoolean) {
    const id = isId(channelId);
    if (!id) throw new Error('آيدي الروم غير صالح');
    const cfg = get(gid);
    cfg.enabled[id] = typeof forceBoolean === 'boolean' ? forceBoolean : !effective(gid, id);
    writeCfg(gid, cfg);
    return cfg.enabled[id];
}

// تفعيل/تعطيل مجموعة رومات دفعة وحدة (أزرار "تفعيل الكل" / "تعطيل الكل")
function setManyChannels(gid, ids, value) {
    const cfg = get(gid);
    let n = 0;
    for (const raw of (Array.isArray(ids) ? ids : [])) {
        const id = isId(raw);
        if (!id) continue;
        cfg.enabled[id] = !!value;
        n++;
    }
    writeCfg(gid, cfg);
    return n;
}

// مسح كل التجاوزات اليدوية (رجوع للوضع الافتراضي)
function clearOverrides(gid) {
    const cfg = get(gid);
    cfg.enabled = {};
    return writeCfg(gid, cfg);
}

// الروم الصوتي المستهدف (فاضي/غير محدد = الروم الافتراضي)
const voiceChannelId = (gid, fallback = '') => get(gid).voiceChannelId || fallback || '';
const voiceEnabled = (gid) => get(gid).voiceEnabled;

// هوك يعيّنه index.js: ينفذ الدخول/الخروج الفعلي من الفويس فوراً من اللوحة
let voiceHook = null;
const onVoiceChange = (fn) => { voiceHook = fn; };
const applyVoice = (gid) => {
    try { if (voiceHook) return voiceHook(gid); }
    catch (e) { console.error('❌ تطبيق إعدادات الفويس:', e.message); }
};

module.exports = {
    DEF, get, set, effective, canInteract, toggleChannel, setManyChannels,
    clearOverrides, voiceChannelId, voiceEnabled, onVoiceChange, applyVoice
};
