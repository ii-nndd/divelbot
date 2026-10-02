// نظام النقاط والمستويات (MongoDB). كل سيرفر له نقاطه المستقلة.
// بدون MONGODB_URI يبقى البوت شغال والنقاط معطلة فقط.
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { MongoClient } = require('mongodb');

let users = null;
const chatCd = new Map();
const levelOf = (p) => Math.floor(Math.sqrt(p / 50));
const needFor = (l) => 50 * l * l;
const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

async function init() {
    const uri = process.env.MONGODB_URI;
    if (!uri) return console.log('⚠️ MONGODB_URI غير مضبوط: النقاط معطلة');
    try {
        const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000 });
        await client.connect();
        users = client.db(process.env.MONGODB_DB || 'divelbot').collection('users');
        await users.createIndex({ guildId: 1, userId: 1 }, { unique: true });
        await users.createIndex({ guildId: 1, points: -1 });
        console.log('🗄️ متصل بقاعدة البيانات');
    } catch (err) {
        users = null;
        console.error('❌ فشل الاتصال بقاعدة البيانات:', err.message);
    }
}

// يضيف (أو يخصم) نقاط ويرجع بيانات العضو بعد التعديل
async function add(guildId, userId, amount) {
    if (!users) return null;
    const doc = await users.findOneAndUpdate(
        { guildId, userId },
        { $inc: { points: amount }, $setOnInsert: { createdAt: new Date() } },
        { upsert: true, returnDocument: 'after' }
    );
    if (doc && doc.points < 0) {
        await users.updateOne({ guildId, userId }, { $set: { points: 0 } });
        doc.points = 0;
    }
    return doc;
}

// نقاط الكلام في الشات (كل 60 ثانية كحد أقصى لكل عضو)
async function onMessage(message, tier) {
    if (!users || message.content.length < 3) return;
    const key = `${message.guild.id}:${message.author.id}`;
    const now = Date.now();
    if (now - (chatCd.get(key) || 0) < 60_000) return;
    chatCd.set(key, now);

    const gain = rand(5, 15);
    const doc = await add(message.guild.id, message.author.id, gain);
    if (!doc) return;
    const before = levelOf(doc.points - gain), after = levelOf(doc.points);
    if (after > before) {
        const royal = tier === 'arthur' ? ' يا مولاي ارثر 👑' : tier === 'ida' ? ' يا ملكة إيدا 🌸' : '';
        message.channel.send(`🎉 مبروك ${message.author}${royal}! وصلت **المستوى ${after}**`).catch(() => {});
    }
}

const commands = [
    new SlashCommandBuilder().setName('نقاطي').setDescription('اعرض نقاطك ومستواك')
        .addUserOption(o => o.setName('عضو').setDescription('عضو آخر')).setDMPermission(false),
    new SlashCommandBuilder().setName('المتصدرين').setDescription('قائمة أعلى 10 أعضاء بالنقاط').setDMPermission(false),
    new SlashCommandBuilder().setName('نقاط_اضافة').setDescription('إضافة أو خصم نقاط (ارثر وإيدا فقط)')
        .addUserOption(o => o.setName('عضو').setDescription('العضو').setRequired(true))
        .addIntegerOption(o => o.setName('العدد').setDescription('رقم سالب للخصم').setRequired(true).setMinValue(-100000).setMaxValue(100000))
        .setDMPermission(false)
].map(c => c.toJSON());

async function handle(i, ctx) {
    if (!['نقاطي', 'المتصدرين', 'نقاط_اضافة'].includes(i.commandName)) return false;
    const EPH = MessageFlags.Ephemeral;
    if (!users) {
        await i.reply({ content: '⚠️ نظام النقاط غير مفعل بعد (قاعدة البيانات غير متصلة).', flags: EPH });
        return true;
    }
    const g = i.guild.id;
    try {
        if (i.commandName === 'نقاطي') {
            const u = i.options.getUser('عضو') || i.user;
            const doc = (await users.findOne({ guildId: g, userId: u.id })) || { points: 0 };
            const lvl = levelOf(doc.points), lo = needFor(lvl), hi = needFor(lvl + 1);
            const filled = Math.round(((doc.points - lo) / (hi - lo)) * 10);
            const rank = (await users.countDocuments({ guildId: g, points: { $gt: doc.points } })) + 1;
            const e = new EmbedBuilder().setColor(0xd4af37).setTitle(u.username)
                .setThumbnail(u.displayAvatarURL())
                .addFields(
                    { name: 'النقاط', value: String(doc.points), inline: true },
                    { name: 'المستوى', value: String(lvl), inline: true },
                    { name: 'الترتيب', value: `#${rank}`, inline: true }
                )
                .setDescription(`${'█'.repeat(filled)}${'░'.repeat(10 - filled)}  ${doc.points}/${hi}`);
            await i.reply({ embeds: [e] });
        } else if (i.commandName === 'المتصدرين') {
            const top = await users.find({ guildId: g, points: { $gt: 0 } }).sort({ points: -1 }).limit(10).toArray();
            const medals = ['🥇', '🥈', '🥉'];
            const lines = top.map((d, k) => `${medals[k] || `**${k + 1}.**`} <@${d.userId}> — ${d.points} (مستوى ${levelOf(d.points)})`);
            const e = new EmbedBuilder().setColor(0xd4af37).setTitle('🏆 المتصدرين')
                .setDescription(lines.join('\n') || 'ما أحد عنده نقاط للحين!');
            await i.reply({ embeds: [e] });
        } else {
            const tier = ctx.getTier(i.user.id, i.member);
            if (tier !== 'arthur' && tier !== 'ida') {
                await i.reply({ content: '⛔ هذا الأمر خاص بمولاي ارثر والملكة إيدا فقط! 👑', flags: EPH });
                return true;
            }
            const u = i.options.getUser('عضو'), n = i.options.getInteger('العدد');
            const doc = await add(g, u.id, n);
            await i.reply(`${n >= 0 ? '➕' : '➖'} ${u}: ${n >= 0 ? '+' : ''}${n} نقطة، المجموع الآن **${doc.points}**`);
        }
    } catch (err) {
        console.error('❌ خطأ نقاط:', err.message);
        if (!i.replied && !i.deferred) i.reply({ content: '⚠️ صار خطأ بقاعدة البيانات.', flags: EPH }).catch(() => {});
    }
    return true;
}

module.exports = { init, add, onMessage, commands, handle, levelOf };
