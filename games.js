// الألعاب: سرعة الكتابة، رياضيات، كلمة مبعثرة، أعلام. كل فوز يعطي نقاط.
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const points = require('./points');

const EPH = MessageFlags.Ephemeral;
const active = new Set();      // رومات فيها لعبة شغالة
const startCd = new Map();     // كولداون بدء اللعبة لكل عضو
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

// توحيد النص العربي للمقارنة
const norm = (s) => String(s)
    .replace(/[\u064B-\u0652\u0640]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ').trim().toLowerCase();
const loose = (s) => norm(s).replace(/^ال/, '').replace(/ /g, '');
const digits = (s) => String(s).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).trim();

const SENTENCES = [
    'سيرفر دايڤل اقوى سيرفر بالعالم', 'الصبر مفتاح الفرج', 'من جد وجد ومن زرع حصد',
    'العلم نور والجهل ظلام', 'الوقت كالسيف ان لم تقطعه قطعك', 'القهوة العربية تجمع الاحبة',
    'الصديق وقت الضيق', 'كل تاخيرة فيها خيرة', 'ارثر وايدا ملوك دايڤل', 'اللي يزرع الخير يحصده',
    'الدنيا دوارة يوم لك ويوم عليك', 'العجلة من الشيطان والتاني من الرحمن'
];
const WORDS = ['كمبيوتر', 'ديسكورد', 'سيرفر', 'مطبخ', 'سيارة', 'مدرسة', 'طيارة', 'شوكولاتة',
    'برمجة', 'قهوة', 'صحراء', 'مكتبة', 'نخلة', 'بحيرة', 'حديقة', 'تلفزيون', 'مستشفى', 'جامعة'];
const FLAGS = [
    ['🇸🇦', ['السعودية']], ['🇰🇼', ['الكويت']], ['🇦🇪', ['الامارات']], ['🇶🇦', ['قطر']],
    ['🇧🇭', ['البحرين']], ['🇴🇲', ['عمان', 'سلطنة عمان']], ['🇪🇬', ['مصر']], ['🇮🇶', ['العراق']],
    ['🇯🇴', ['الاردن']], ['🇱🇧', ['لبنان']], ['🇸🇾', ['سوريا']], ['🇵🇸', ['فلسطين']],
    ['🇾🇪', ['اليمن']], ['🇲🇦', ['المغرب']], ['🇩🇿', ['الجزائر']], ['🇹🇳', ['تونس']],
    ['🇱🇾', ['ليبيا']], ['🇸🇩', ['السودان']], ['🇹🇷', ['تركيا']], ['🇯🇵', ['اليابان']],
    ['🇧🇷', ['البرازيل']], ['🇫🇷', ['فرنسا']], ['🇩🇪', ['المانيا']], ['🇮🇹', ['ايطاليا']],
    ['🇪🇸', ['اسبانيا']], ['🇬🇧', ['بريطانيا', 'انجلترا']], ['🇺🇸', ['امريكا', 'الولايات المتحدة']],
    ['🇨🇦', ['كندا']], ['🇷🇺', ['روسيا']], ['🇨🇳', ['الصين']], ['🇰🇷', ['كوريا', 'كوريا الجنوبية']],
    ['🇮🇳', ['الهند']], ['🇦🇷', ['الارجنتين']], ['🇲🇽', ['المكسيك']], ['🇵🇹', ['البرتغال']]
];

const games = {
    سرعة() {
        const s = pick(SENTENCES);
        return {
            title: '⌨️ سرعة الكتابة', body: `اكتب الجملة بأسرع ما تقدر:\n\n## ${s}`, seconds: 30, answer: s,
            check: (t) => norm(t) === norm(s), pts: (sec) => Math.max(5, Math.round(20 - sec))
        };
    },
    رياضيات() {
        const op = pick(['+', '-', '×']);
        let a = rand(10, 99), b = rand(10, 99);
        if (op === '×') { a = rand(2, 12); b = rand(2, 12); }
        if (op === '-' && b > a) [a, b] = [b, a];
        const ans = op === '+' ? a + b : op === '-' ? a - b : a * b;
        return {
            title: '🧮 رياضيات سريعة', body: `كم ناتج:\n\n## ${a} ${op} ${b}`, seconds: 15, answer: ans,
            check: (t) => digits(t) === String(ans), pts: (sec) => (sec < 5 ? 15 : 10)
        };
    },
    مبعثرة() {
        const w = pick(WORDS);
        let sc = w;
        while (sc === w) sc = [...w].sort(() => Math.random() - 0.5).join('');
        return {
            title: '🔤 الكلمة المبعثرة', body: `رتّب الحروف وكوّن الكلمة:\n\n## ${[...sc].join('  ')}`, seconds: 20, answer: w,
            check: (t) => norm(t) === norm(w), pts: () => 10
        };
    },
    اعلام() {
        const [emoji, names] = pick(FLAGS);
        return {
            title: '🏳️ خمّن العلم', body: `وش اسم هالدولة؟\n\n# ${emoji}`, seconds: 20, answer: names[0],
            check: (t) => names.some(n => loose(n) === loose(t)), pts: () => 10
        };
    }
};

const commands = [
    ['سرعة', 'لعبة سرعة الكتابة'], ['رياضيات', 'لعبة الرياضيات السريعة'],
    ['مبعثرة', 'رتّب الحروف المبعثرة'], ['اعلام', 'خمّن العلم']
].map(([n, d]) => new SlashCommandBuilder().setName(n).setDescription(d).setDMPermission(false).toJSON());

async function play(i, ctx, g) {
    const ch = i.channel;
    if (active.has(ch.id)) return i.reply({ content: '⏳ فيه لعبة شغالة بالروم، انتظر تخلص.', flags: EPH });
    if (Date.now() - (startCd.get(i.user.id) || 0) < 15_000)
        return i.reply({ content: '⏳ استنى شوي قبل لعبة جديدة.', flags: EPH });
    startCd.set(i.user.id, Date.now());
    active.add(ch.id);
    try {
        await i.reply({ embeds: [new EmbedBuilder().setColor(0xd4af37).setTitle(g.title)
            .setDescription(g.body).setFooter({ text: `عندك ${g.seconds} ثانية، أول جواب صح يفوز` })] });
        const t0 = Date.now();
        const got = await ch.awaitMessages({
            filter: (m) => !m.author.bot && g.check(m.content), max: 1, time: g.seconds * 1000
        });
        if (!got.size) return ch.send(`⌛ انتهى الوقت! الجواب: **${g.answer}**`);

        const m = got.first(), sec = (Date.now() - t0) / 1000, pts = g.pts(sec);
        const tier = ctx.getTier(m.author.id, m.member);
        const icon = tier === 'arthur' ? '👑' : tier === 'ida' ? '🌸' : '🏆';
        let extra = '';
        const doc = await points.add(m.guild.id, m.author.id, pts).catch(() => null);
        if (doc) {
            extra = ` (+${pts} نقطة، المجموع ${doc.points})`;
            const lv = points.levelOf(doc.points);
            if (lv > points.levelOf(doc.points - pts)) extra += `\n🎉 مبروك وصلت **المستوى ${lv}**!`;
        }
        await m.reply(`${icon} فاز ${m.author} خلال **${sec.toFixed(1)}** ثانية!${extra}`);
    } catch (err) {
        console.error('❌ خطأ لعبة:', err.message);
    } finally {
        active.delete(ch.id);
    }
}

async function handle(i, ctx) {
    if (!games[i.commandName]) return false;
    await play(i, ctx, games[i.commandName]());
    return true;
}

module.exports = { commands, handle };
