// مدير الردود: يقرأ الافتراضي من replies.base.js ويدمج عليه تعديلاتك من لوحة التحكم
const store = require('./store');
const base = require('./replies.base');

// تسطيح الردود إلى مفاتيح مثل greet.arthur
const defaults = {};
for (const [cat, val] of Object.entries(base)) {
    if (Array.isArray(val)) defaults[cat] = val;
    else for (const [sub, v] of Object.entries(val)) defaults[`${cat}.${sub}`] = Array.isArray(v) ? v : [v];
}

// كلمات خاصة: كل سطر بصيغة  كلمة => الرد
Object.assign(defaults, {
    'custom.arthur': [
        'صباح الخير => صباح النور والسرور يا مولاي ارثر ☀️👑 يومك ملكي إن شاء الله!',
        'تصبح على خير => تصبح على خير يا تاج راسنا 🌙 العبد يحرس الفويس وانت نام قرير العين.',
        'احبك => وأنا أحبك يا مولاي، العبد مخلص لك للأبد 🖤',
        'مين الملك => إنت يا ارثر، والكل يعرف! 👑🔥'
    ],
    'custom.ida': [
        'صباح الخير => صباح الورد والياسمين يا ملكتنا إيدا 🌸☀️ نورتي يومنا!',
        'تصبحين على خير => تصبحين على ألف خير يا سمو الملكة 🌙✨ أحلام سعيدة!',
        'احبك => ونحنا نحبك يا ملكة قلوبنا، العبد فدا طلتك 💖',
        'مين الملكة => إنتي يا إيدا، ملكة دايڤل بلا منازع! 🌸👑'
    ],
    'custom.royal': [
        'صباح الخير => صباح النور يا أهل الرتبة، يومكم سعيد! ☀️'
    ],
    // كلمات تشتغل للملكيين فقط عند مناداة البوت (يا عبد ...)
    'custom.all': []
});

// قوائم الألعاب (تتعدل من اللوحة). الأعلام بصيغة:  🇸🇦 => السعودية | اسم ثاني
const gd = require('./gamedata');
defaults['games.sentences'] = gd.SENTENCES;
defaults['games.words'] = gd.WORDS;
defaults['games.flags'] = gd.FLAGS.map(([e, n]) => `${e} => ${n.join(' | ')}`);

// ردودك المحفوظة داخل الريبو (replies.seed.json): تصير الافتراضي الجديد وما تضيع مع Render
try {
    const seed = require('./replies.seed.json');
    for (const [k, v] of Object.entries(seed)) {
        if (k in defaults && Array.isArray(v) && (v.length || k.startsWith('custom.'))) defaults[k] = v;
    }
} catch {}

let overrides = store.read('replies.json', {});

const isCustom = (k) => k.startsWith('custom.');

module.exports = {
    defaults,
    // يرجع ردود المفتاح (المعدلة إن وجدت، وإلا الافتراضية)
    get(key) {
        const v = overrides[key];
        if (Array.isArray(v) && (v.length || isCustom(key))) return v;
        return defaults[key] || [];
    },
    all() {
        const out = {};
        for (const k of Object.keys(defaults)) out[k] = this.get(k);
        return out;
    },
    overrides: () => overrides,
    reload() { overrides = store.read('replies.json', {}); },
    set(key, lines) {
        if (!(key in defaults)) return false;
        const clean = lines.map(s => String(s).trim().slice(0, 500)).filter(Boolean).slice(0, 200);
        if (!clean.length && !isCustom(key)) delete overrides[key];
        else overrides[key] = clean;
        store.write('replies.json', overrides);
        return true;
    },
    reset(key) {
        delete overrides[key];
        store.write('replies.json', overrides);
    },
    importAll(map) {
        let n = 0;
        for (const [k, v] of Object.entries(map || {})) if (Array.isArray(v) && this.set(k, v)) n++;
        return n;
    }
};
