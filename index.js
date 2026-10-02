require('dotenv').config();
const {
    Client, GatewayIntentBits, SlashCommandBuilder, MessageFlags
} = require('discord.js');
const {
    joinVoiceChannel, entersState, VoiceConnectionStatus
} = require('@discordjs/voice');
const express = require('express');
const R = require('./replies');
const store = require('./store');
const mountDashboard = require('./dashboard');
const admin = require('./admin');
const points = require('./points');
const games = require('./games');
const mountPanel = require('./panel');

// ====================================================================
// 1. الإعدادات (عدل الآي ديهات هنا فقط)
// ====================================================================
const CONFIG = {
    GUILD_ID: '1545100203751645224',
    VOICE_CHANNEL_ID: '1545729488938205274',
    ARTHUR_ID: '848996426918002731',
    ROYAL_ROLE_ID: '1554207336967446608',
    SPECIAL_USER_ID: '1542941271205875812',
    // اختياري: آي دي روم الكتابة اللي يرسل فيه ترحيب دخول ارثر وإيدا (اتركه فاضي لتعطيله)
    WELCOME_TEXT_CHANNEL_ID: '',
    // اختياري: آي دي روم يسجل فيه البوت كل أوامر الإدارة (اتركه فاضي لتعطيله)
    LOG_CHANNEL_ID: ''
};

// ====================================================================
// 2. سيرفر الويب (للفحص المستمر من الاستضافة)
// ====================================================================
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Voice Keeper Bot is running 24/7!'));
mountPanel(app, express, R);
app.listen(PORT, () => console.log(`🌐 Web server on port ${PORT}`));

// ====================================================================
// 3. العميل
// ====================================================================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ====================================================================
// 4. أدوات مساعدة
// ====================================================================
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rp = (key) => pick(R.get(key));

// لوحة التحكم الكاملة (/dashboard)
mountDashboard(app, express, client, CONFIG);

function getTier(userId, member) {
    if (userId === CONFIG.ARTHUR_ID) return 'arthur';
    if (userId === CONFIG.SPECIAL_USER_ID) return 'ida';
    if (member && member.roles && member.roles.cache.has(CONFIG.ROYAL_ROLE_ID)) return 'royal';
    return 'peasant';
}
const hasAccess = (tier) => tier !== 'peasant';

// كولداون لكل مستخدم (ثواني)
const cooldowns = new Map();
function onCooldown(userId, seconds = 5) {
    const now = Date.now();
    const last = cooldowns.get(userId) || 0;
    if (now - last < seconds * 1000) return true;
    cooldowns.set(userId, now);
    return false;
}
// تنظيف الكولداون القديم كل 10 دقايق
setInterval(() => {
    const limit = Date.now() - 60_000;
    for (const [id, t] of cooldowns) if (t < limit) cooldowns.delete(id);
}, 10 * 60_000);

// ====================================================================
// 5. الفويس + إعادة الاتصال التلقائي
// ====================================================================
let connection = null;
let manualLeave = false;
let connecting = false;

async function connectToVoice() {
    if (connecting) return;
    connecting = true;
    let conn = null;
    try {
        const channel = await client.channels.fetch(CONFIG.VOICE_CHANNEL_ID);
        if (!channel || !channel.isVoiceBased()) return;

        if (connection) {
            try { connection.destroy(); } catch {}
        }

        conn = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: true
        });
        connection = conn;

        conn.on(VoiceConnectionStatus.Disconnected, async () => {
            try {
                // لو ديسكورد نقله أو يحاول يرجعه نعطيه فرصة
                await Promise.race([
                    entersState(conn, VoiceConnectionStatus.Signalling, 5_000),
                    entersState(conn, VoiceConnectionStatus.Connecting, 5_000)
                ]);
            } catch {
                try { conn.destroy(); } catch {}
            }
        });

        conn.on(VoiceConnectionStatus.Destroyed, () => {
            if (connection === conn) connection = null;
        });

        await entersState(conn, VoiceConnectionStatus.Ready, 20_000);
        console.log('🎙️ دخل الفويس بنجاح');
    } catch (err) {
        console.error('❌ فشل الدخول للفويس:', err.message);
        // تنظيف المحاولة الفاشلة عشان الحارس يقدر يعيد المحاولة
        try { if (conn) conn.destroy(); } catch {}
        if (connection === conn) connection = null;
        if (!manualLeave) setTimeout(connectToVoice, 15_000);
    } finally {
        connecting = false;
    }
}

function disconnectFromVoice() {
    manualLeave = true;
    if (connection) {
        try { connection.destroy(); } catch {}
        connection = null;
    }
}

// حارس: كل دقيقة يتأكد إن البوت بالفويس، وإلا يرجعه
setInterval(() => {
    if (manualLeave || connecting) return;
    const dead = !connection || connection.state.status === VoiceConnectionStatus.Destroyed;
    if (dead) {
        console.log('🔁 البوت مو بالفويس، أعيد الاتصال...');
        connectToVoice();
    }
}, 60_000);

// ====================================================================
// 6. تعريف أوامر السلاش
// ====================================================================
const commands = [
    new SlashCommandBuilder().setName('تعال').setDescription('يدخل البوت الفويس (للملكيين فقط)'),
    new SlashCommandBuilder().setName('اطلع').setDescription('يطلع البوت من الفويس (للملكيين فقط)'),
    new SlashCommandBuilder().setName('حالة').setDescription('حالة البوت'),
    new SlashCommandBuilder().setName('نكتة').setDescription('نكتة من دايڤل'),
    new SlashCommandBuilder().setName('تنبيه').setDescription('تنبيه ملكي (للملكيين فقط)'),
    new SlashCommandBuilder().setName('فلوس').setDescription('اسأل عن راتبك'),
    new SlashCommandBuilder().setName('سيرفر').setDescription('نبذة عن سيرفر دايڤل'),
    new SlashCommandBuilder().setName('شعر').setDescription('شعر ملكي (للملكيين فقط)'),
    new SlashCommandBuilder().setName('اكل').setDescription('اطلب أكل من العبد (للملكيين فقط)'),
    new SlashCommandBuilder().setName('بينج').setDescription('سرعة البوت'),
    new SlashCommandBuilder().setName('عملة').setDescription('ارمي عملة'),
    new SlashCommandBuilder().setName('نرد').setDescription('ارمي نرد')
        .addIntegerOption(o => o.setName('اوجه').setDescription('عدد أوجه النرد (الافتراضي 6)').setMinValue(2).setMaxValue(1000)),
    new SlashCommandBuilder().setName('اختار').setDescription('البوت يختار لك من بين خيارات')
        .addStringOption(o => o.setName('خيارات').setDescription('افصل بينها بفاصلة، مثال: بيتزا, برجر, كبسة').setRequired(true)),
    new SlashCommandBuilder().setName('حجر').setDescription('حجر ورقة مقص ضد البوت')
        .addStringOption(o => o.setName('اختيارك').setDescription('اختر').setRequired(true)
            .addChoices(
                { name: 'حجر 🪨', value: 'rock' },
                { name: 'ورقة 📄', value: 'paper' },
                { name: 'مقص ✂️', value: 'scissors' }
            )),
    new SlashCommandBuilder().setName('تخمين').setDescription('خمن الرقم من 1 إلى 10')
        .addIntegerOption(o => o.setName('رقم').setDescription('تخمينك').setRequired(true).setMinValue(1).setMaxValue(10)),
    new SlashCommandBuilder().setName('حب').setDescription('نسبة التوافق بين شخصين')
        .addUserOption(o => o.setName('الاول').setDescription('الشخص الأول').setRequired(true))
        .addUserOption(o => o.setName('الثاني').setDescription('الشخص الثاني (الافتراضي أنت)')),
    new SlashCommandBuilder().setName('كرة').setDescription('كرة الحظ، اسأل سؤال')
        .addStringOption(o => o.setName('سؤال').setDescription('سؤالك').setRequired(true)),
    new SlashCommandBuilder().setName('مساعدة').setDescription('قائمة الأوامر')
].map(c => c.toJSON()).concat(admin.commands, points.commands, games.commands);

// ====================================================================
// 7. تشغيل البوت
// ====================================================================
client.once('clientReady', async () => {
    console.log(`🤖 Logged in as ${client.user.tag}!`);
    try {
        const guild = await client.guilds.fetch(CONFIG.GUILD_ID);
        await guild.commands.set(commands);
        console.log('✅ تم تسجيل أوامر السلاش');
    } catch (err) {
        console.error('❌ فشل تسجيل الأوامر:', err.message);
    }
    await store.init();
    R.reload();
    points.init();
    connectToVoice();
});

// ====================================================================
// 8. معالج أوامر السلاش
// ====================================================================
const eightBall = [
    'أكيد! ✅', 'بدون شك 👌', 'الأمور تبشر بخير 🌟', 'يمكن 🤔',
    'اسأل بعدين ⏳', 'ما أتوقع ❌', 'لا والله 🚫', 'مستحيل 💀'
];
const rpsNames = { rock: '🪨 حجر', paper: '📄 ورقة', scissors: '✂️ مقص' };
const rpsBeats = { rock: 'scissors', paper: 'rock', scissors: 'paper' };

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (await games.handle(interaction, { getTier, CONFIG, pick })) return;
    if (await points.handle(interaction, { getTier, CONFIG, pick })) return;
    if (await admin.handle(interaction, { getTier, CONFIG, pick })) return;

    const tier = getTier(interaction.user.id, interaction.member);
    const name = interaction.commandName;
    const denied = () => interaction.reply({
        content: '❌ هذا الأمر خاص بمولاي ارثر والملكة إيدا وأصحاب الرتب بس! 💅',
        flags: MessageFlags.Ephemeral
    });

    try {
        switch (name) {
            case 'تعال':
                if (!hasAccess(tier)) return denied();
                manualLeave = false;
                connectToVoice();
                return interaction.reply('🫡 أبشر يا طويل العمر، دخلت الفويس بأمرك السامي! 🎙️');

            case 'اطلع':
                if (!hasAccess(tier)) return denied();
                disconnectFromVoice();
                return interaction.reply('👋 سمعاً وطاعة، طلعت من الفويس يا طويل العمر! 🚪');

            case 'حالة': {
                const inVoice = connection && connection.state.status === VoiceConnectionStatus.Ready;
                return interaction.reply(`${rp('status.'+tier)}\n📡 الفويس: ${inVoice ? 'متصل ✅' : 'غير متصل ❌'}`);
            }

            case 'نكتة':
                return interaction.reply(`🎭 ${rp('jokes')}`);

            case 'تنبيه':
                if (!hasAccess(tier)) return denied();
                return interaction.reply(rp('alerts'));

            case 'فلوس':
                return interaction.reply(
                    (tier === 'arthur' || tier === 'ida')
                        ? '💰 يا فخامة المقام، خزينة دايڤل كلها تحت أمرك، تبي نحول لك مليار دولار الحين؟ 🪙👑'
                        : '💸 راتبك في دايڤل هو كف محترم لو عدت تسأل أسئلة مالها داعي! 😂'
                );

            case 'سيرفر':
                return interaction.reply('🌟 سيرفر دايڤل أطخم وأفخم سيرفر بالديسكورد بفضل وجود مولاي ارثر والملكة إيدا على عرشه! 🔥👑');

            case 'شعر':
                if (!hasAccess(tier)) return denied();
                return interaction.reply(rp('poems'));

            case 'اكل':
                if (!hasAccess(tier)) return denied();
                return interaction.reply(rp('food.'+tier));

            case 'بينج': {
                const sent = await interaction.reply({ content: '🏓 ...', fetchReply: true });
                const latency = sent.createdTimestamp - interaction.createdTimestamp;
                return interaction.editReply(`🏓 بونغ! التأخير: **${latency}ms** | الويب سوكت: **${client.ws.ping}ms**`);
            }

            case 'عملة':
                return interaction.reply(Math.random() < 0.5 ? '🪙 طلعت: **صورة**' : '🪙 طلعت: **كتابة**');

            case 'نرد': {
                const sides = interaction.options.getInteger('اوجه') ?? 6;
                return interaction.reply(`🎲 رميت نرد (${sides} وجه) وطلع: **${1 + Math.floor(Math.random() * sides)}**`);
            }

            case 'اختار': {
                const opts = interaction.options.getString('خيارات')
                    .split(/[,،]/).map(s => s.trim()).filter(Boolean);
                if (opts.length < 2) {
                    return interaction.reply({ content: '⚠️ اكتب خيارين على الأقل وافصل بينها بفاصلة.', flags: MessageFlags.Ephemeral });
                }
                return interaction.reply(`🤔 اخترت لك: **${pick(opts)}**`);
            }

            case 'حجر': {
                const mine = interaction.options.getString('اختيارك');
                const bot = pick(['rock', 'paper', 'scissors']);
                let result = 'تعادل 🤝';
                if (rpsBeats[mine] === bot) result = 'فزت! 🎉';
                else if (rpsBeats[bot] === mine) result = 'خسرت! 😂';
                return interaction.reply(`أنت: ${rpsNames[mine]}\nأنا: ${rpsNames[bot]}\n**${result}**`);
            }

            case 'تخمين': {
                const guess = interaction.options.getInteger('رقم');
                const num = 1 + Math.floor(Math.random() * 10);
                return interaction.reply(
                    guess === num
                        ? `🎯 الرقم كان **${num}**، خمنت صح! 🎉`
                        : `❌ الرقم كان **${num}**، حاول مرة ثانية!`
                );
            }

            case 'حب': {
                const a = interaction.options.getUser('الاول');
                const b = interaction.options.getUser('الثاني') ?? interaction.user;
                const percent = Number((BigInt(a.id) + BigInt(b.id)) % 101n);
                return interaction.reply(`💘 نسبة التوافق بين ${a} و ${b}: **${percent}%**`);
            }

            case 'كرة':
                return interaction.reply(`🔮 سؤالك: ${interaction.options.getString('سؤال')}\nالجواب: **${pick(eightBall)}**`);

            case 'مساعدة':
                return interaction.reply(
                    '**🛠️ أوامر البوت:**\n' +
                    '👑 **ملكية:** `/تعال` `/اطلع` `/تنبيه` `/شعر` `/اكل`\n' +
                    '🎮 **ترفيه:** `/نكتة` `/نرد` `/عملة` `/اختار` `/حجر` `/تخمين` `/حب` `/كرة` `/سرعة` `/رياضيات` `/مبعثرة` `/اعلام` `/نقاطي` `/المتصدرين`\n' +
                    '📊 **عام:** `/حالة` `/بينج` `/فلوس` `/سيرفر`\n' +
                    '🛡️ **إدارة:** `/طرد` `/حظر` `/فك_حظر` `/ميوت` `/فك_ميوت` `/مسح` `/قفل` `/فتح` `/بطيء` `/رتبة_اضافة` `/رتبة_ازالة` `/لقب` `/صوت` `/نقل` `/اعلان` `/تحذير` `/تحذيرات` `/معلومات_عضو` `/معلومات_سيرفر`\n' +
                    '💬 أو نادني بالكلام: **يا عبد نكتة** / **يا عبد سرعة** / **يا عبد نقاطي** / **يا عبد نرد 20**، أو ارد على رسالتي واكتب الأمر. أوامر الإدارة بالسلاش فقط.'
                );
        }
    } catch (err) {
        console.error('❌ خطأ في الأمر:', name, err);
        if (!interaction.replied && !interaction.deferred) {
            interaction.reply({ content: '⚠️ صار خطأ، حاول مرة ثانية.', flags: MessageFlags.Ephemeral }).catch(() => {});
        }
    }
});

// ====================================================================
// 9. الردود النصية (لما أحد ينادي البوت فقط)
// ====================================================================
// كلمات مطابقة كاملة (تفادي التفعيل بالغلط مثل "كفاية" أو "جبل")
const HIT_WORDS = ['اضربك', 'ضربك', 'كف', 'طراق', 'طق', 'ادقك', 'تسطير'];
const RUDE_WORDS = ['غبي', 'حمار', 'انقلع', 'جب', 'زق'];
const FOOD_WORDS = ['جوعان', 'اكل', 'أكل', 'جوعانين'];
const THANKS_WORDS = ['شكرا', 'شكراً', 'مشكور', 'يعطيك', 'يسلمو'];
const WHERE_WORDS = ['وينك', 'وينكم'];
const MOVE_WORDS = ['قوم', 'تحرك'];
const HELP_WORDS = ['اوامر', 'أوامر', 'مساعدة'];
const POEM_WORDS = ['شعر', 'قصيدة'];

function tokenize(text) {
    return text.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
}

// توحيد النص العربي (أ/إ/آ=ا، ة=ه، ى=ي، بدون تشكيل) لمطابقة الأوامر
const nz = (t) => t.replace(/[\u064B-\u0652\u0640]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').toLowerCase();

// يحوّل رسالة عادية لشكل شبيه بالسلاش عشان نستخدم نفس كود الألعاب والنقاط
const asInteraction = (message, name) => ({
    commandName: name, client, channel: message.channel, guild: message.guild,
    user: message.author, member: message.member, replied: false, deferred: false,
    options: { getUser: () => null, getInteger: () => null, getString: () => null },
    reply: (o) => message.reply(typeof o === 'string' ? o : { ...o, flags: undefined })
});

const TEXT_GAMES = { 'سرعه': 'سرعة', 'رياضيات': 'رياضيات', 'مبعثره': 'مبعثرة', 'اعلام': 'اعلام' };

// البوت ينادى فقط بـ: يا عبد / عبد / منشن / الرد على رسالته
async function isCalled(message, tokens, content) {
    if (message.mentions.has(client.user, { ignoreEveryone: true, ignoreRoles: true }) ||
        content.includes('يا عبد') || tokens.includes('عبد') || tokens.includes('العبد')) return true;
    if (message.reference && message.reference.messageId) {
        const ref = await message.fetchReference().catch(() => null);
        return !!ref && ref.author.id === client.user.id;
    }
    return false;
}

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    points.onMessage(message, getTier(message.author.id, message.member)).catch(() => {});

    const content = message.content.trim();
    if (!content) return;

    const tokens = tokenize(content);
    if (!(await isCalled(message, tokens, content))) return;   // بدون نداء: ما يرد أبداً
    if (onCooldown(message.author.id)) return;

    const tier = getTier(message.author.id, message.member);
    const access = hasAccess(tier);
    const ctx = { getTier, CONFIG, pick };
    const ntok = tokens.map(nz).filter(t => !['يا', 'عبد', 'العبد'].includes(t));
    const w = (...list) => ntok.some(t => list.includes(t));
    const deny = () => message.reply('❌ هذا الأمر خاص بمولاي ارثر والملكة إيدا وأصحاب الرتب بس! 💅');

    // الكلمات الخاصة (من اللوحة)
    if (access) {
        const matches = [...R.get('custom.' + tier), ...R.get('custom.all')]
            .map(l => l.split('=>').map(x => x.trim()))
            .filter(([k, r]) => k && r && content.includes(k));
        if (matches.length) return message.reply(pick(matches)[1]);
    }

    // أوامر بالكلام: يا عبد + اسم الأمر
    if (w('تعال', 'ادخل', 'دخلني')) {
        if (!access) return deny();
        manualLeave = false; connectToVoice();
        return message.reply('🫡 أبشر يا طويل العمر، دخلت الفويس بأمرك السامي! 🎙️');
    }
    if (w('اطلع', 'اخرج')) {
        if (!access) return deny();
        disconnectFromVoice();
        return message.reply('👋 سمعاً وطاعة، طلعت من الفويس يا طويل العمر! 🚪');
    }
    if (w('تنبيه')) { if (!access) return deny(); return message.reply(rp('alerts')); }
    if (w('نكته')) return message.reply(`🎭 ${rp('jokes')}`);
    if (w('عمله')) return message.reply(Math.random() < 0.5 ? '🪙 طلعت: **صورة**' : '🪙 طلعت: **كتابة**');
    if (w('نرد')) {
        const sides = tokens.map(Number).find(n => Number.isInteger(n) && n >= 2 && n <= 1000) || 6;
        return message.reply(`🎲 رميت نرد (${sides} وجه) وطلع: **${1 + Math.floor(Math.random() * sides)}**`);
    }
    if (w('حاله', 'status')) {
        const inVoice = connection && connection.state.status === VoiceConnectionStatus.Ready;
        return message.reply(`${rp('status.' + tier)}\n📡 الفويس: ${inVoice ? 'متصل ✅' : 'غير متصل ❌'}`);
    }
    if (w('فلوس', 'راتب')) {
        return message.reply((tier === 'arthur' || tier === 'ida')
            ? '💰 يا فخامة المقام، خزينة دايڤل كلها تحت أمرك، تبي نحول لك مليار دولار الحين؟ 🪙👑'
            : '💸 راتبك في دايڤل هو كف محترم لو عدت تسأل أسئلة مالها داعي! 😂');
    }
    if (w('سيرفر')) return message.reply('🌟 سيرفر دايڤل أطخم وأفخم سيرفر بالديسكورد بفضل وجود مولاي ارثر والملكة إيدا على عرشه! 🔥👑');
    if (w('مساعده', 'اوامر')) return message.reply(rp('help'));
    for (const [word, name] of Object.entries(TEXT_GAMES)) {
        if (w(word)) return games.handle(asInteraction(message, name), ctx);
    }
    if (w('نقاطي')) return points.handle(asInteraction(message, 'نقاطي'), ctx);
    if (w('المتصدرين')) return points.handle(asInteraction(message, 'المتصدرين'), ctx);

    // لو فيه لعبة شغالة بالروم، ردك عليها (الجواب) ما يعتبر كلام مع البوت
    if (games.isActive(message.channel.id)) return;

    const has = (list) => tokens.some(t => list.includes(t));

    // ضرب
    if (has(HIT_WORDS)) return message.reply(rp('hit.' + tier));

    // العشوائي
    if (!access) {
        return message.reply(has(RUDE_WORDS) ? rp('rude') : rp('greet.peasant'));
    }

    if (has(FOOD_WORDS)) return message.reply(rp('food.' + tier));
    if (has(THANKS_WORDS)) return message.reply(rp('thanks.' + tier));
    if (has(WHERE_WORDS)) return message.reply(rp('where.' + tier));
    if (has(MOVE_WORDS)) return message.reply(rp('move.' + tier));
    if (has(POEM_WORDS)) return message.reply(rp('poems'));

    return message.reply(rp('greet.' + tier));
});

// ====================================================================
// 10. ترحيب تلقائي عند دخول ارثر أو إيدا الفويس
// ====================================================================
const welcomeCooldown = new Map();
client.on('voiceStateUpdate', async (oldState, newState) => {
    try {
        if (!CONFIG.WELCOME_TEXT_CHANNEL_ID) return;
        if (newState.channelId !== CONFIG.VOICE_CHANNEL_ID || oldState.channelId === CONFIG.VOICE_CHANNEL_ID) return;

        const id = newState.id;
        const key = id === CONFIG.ARTHUR_ID ? 'arthur' : id === CONFIG.SPECIAL_USER_ID ? 'ida' : null;
        if (!key) return;

        const last = welcomeCooldown.get(id) || 0;
        if (Date.now() - last < 10 * 60_000) return;
        welcomeCooldown.set(id, Date.now());

        const ch = await client.channels.fetch(CONFIG.WELCOME_TEXT_CHANNEL_ID);
        if (ch && ch.isTextBased()) ch.send(rp('welcome.'+key));
    } catch (err) {
        console.error('❌ ترحيب:', err.message);
    }
});

// ====================================================================
// 11. الأمان: منع الكراش + تنبيه الذاكرة
// ====================================================================
process.on('unhandledRejection', (err) => console.error('⚠️ unhandledRejection:', err));
process.on('uncaughtException', (err) => console.error('⚠️ uncaughtException:', err));

setInterval(() => {
    const mb = process.memoryUsage().heapUsed / 1024 / 1024;
    if (mb > 200) console.log(`🧠 استهلاك الذاكرة: ${mb.toFixed(2)} MB`);
}, 30 * 60_000);

client.login(process.env.DISCORD_TOKEN);
