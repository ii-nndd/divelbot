// نظام القرعات: زر "دخول القرعة"، واختيار فائز/فائزين تلقائي عند انتهاء الوقت.
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const store = require('./store');

const EPH = MessageFlags.Ephemeral;
const timers = new Map(); // messageId -> Timeout

const allGw = () => store.read('giveaways.json', {});
const save = (all) => store.write('giveaways.json', all);

function pickWinners(entrants, n) {
    const pool = [...entrants];
    const winners = [];
    while (pool.length && winners.length < n) winners.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    return winners;
}

async function endGiveaway(client, messageId) {
    const all = allGw();
    const gw = all[messageId];
    if (!gw || gw.ended) return;
    gw.ended = true;
    save(all);
    timers.delete(messageId);
    try {
        const ch = await client.channels.fetch(gw.channelId).catch(() => null);
        if (!ch) return;
        const msg = await ch.messages.fetch(messageId).catch(() => null);
        const winners = pickWinners(gw.entrants, gw.winners);
        const text = winners.length ? winners.map(id => `<@${id}>`).join(' ، ') : 'ما فيه أحد دخل القرعة 😢';
        const e = new EmbedBuilder().setColor(0xb3121e).setTitle(`🎉 انتهت القرعة: ${gw.prize}`)
            .setDescription(`الفايز${gw.winners > 1 ? 'ين' : ''}: ${text}`);
        if (msg) await msg.edit({ embeds: [e], components: [] }).catch(() => {});
        if (winners.length) await ch.send({ content: `🎉 مبروك ${text}! فزتوا بـ **${gw.prize}**`, allowedMentions: { users: winners } });
    } catch (err) { console.error('❌ قرعة:', err.message); }
}

// يعيد جدولة القرعات اللي ما خلصت لو البوت انعاد تشغيله
function reschedule(client) {
    const all = allGw();
    for (const [id, gw] of Object.entries(all)) {
        if (gw.ended) continue;
        const left = gw.endsAt - Date.now();
        if (left <= 0) endGiveaway(client, id);
        else timers.set(id, setTimeout(() => endGiveaway(client, id), left));
    }
}

const commands = [
    new SlashCommandBuilder().setName('قرعة_بدء').setDescription('بدء قرعة جديدة (ارثر وإيدا والرتبة الملكية)')
        .addStringOption(o => o.setName('الجائزة').setDescription('وش الجائزة').setRequired(true).setMaxLength(200))
        .addIntegerOption(o => o.setName('الدقائق').setDescription('مدة القرعة بالدقائق').setRequired(true).setMinValue(1).setMaxValue(10080))
        .addIntegerOption(o => o.setName('الفائزين').setDescription('عدد الفائزين (افتراضي 1)').setMinValue(1).setMaxValue(10))
        .setDMPermission(false),
    new SlashCommandBuilder().setName('قرعة_انهاء').setDescription('إنهاء قرعة قبل وقتها')
        .addStringOption(o => o.setName('الايدي').setDescription('آي دي رسالة القرعة').setRequired(true))
        .setDMPermission(false)
].map(c => c.toJSON());

async function handle(i, ctx) {
    if (!['قرعة_بدء', 'قرعة_انهاء'].includes(i.commandName)) return false;
    const tier = ctx.getTier(i.user.id, i.member);
    if (tier !== 'arthur' && tier !== 'ida' && tier !== 'royal') {
        await i.reply({ content: '⛔ هذا الأمر خاص بأهل الرتبة الملكية فصاعداً!', flags: EPH });
        return true;
    }
    try {
        if (i.commandName === 'قرعة_بدء') {
            const prize = i.options.getString('الجائزة');
            const mins = i.options.getInteger('الدقائق');
            const winners = i.options.getInteger('الفائزين') || 1;
            const endsAt = Date.now() + mins * 60_000;
            const e = new EmbedBuilder().setColor(0xb3121e).setTitle(`🎉 قرعة: ${prize}`)
                .setDescription(`اضغط الزر عشان تدخل القرعة!\nعدد الفائزين: **${winners}**\nتنتهي: <t:${Math.floor(endsAt / 1000)}:R>`)
                .setFooter({ text: `بدأها ${i.user.username}` });
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('gw_join').setLabel('🎉 دخول القرعة').setStyle(ButtonStyle.Success));
            await i.reply({ embeds: [e], components: [row] });
            const msg = await i.fetchReply();
            const all = allGw();
            all[msg.id] = { guildId: i.guild.id, channelId: i.channel.id, prize, winners, endsAt, entrants: [], ended: false };
            save(all);
            timers.set(msg.id, setTimeout(() => endGiveaway(i.client, msg.id), mins * 60_000));
        } else {
            const id = i.options.getString('الايدي').trim();
            const all = allGw();
            if (!all[id]) return i.reply({ content: '⚠️ ما لقيت قرعة بهذا الآي دي.', flags: EPH });
            if (timers.has(id)) { clearTimeout(timers.get(id)); timers.delete(id); }
            await i.reply('✅ جاري إنهاء القرعة...');
            await endGiveaway(i.client, id);
        }
    } catch (err) {
        console.error('❌ خطأ قرعة:', err.message);
        if (!i.replied && !i.deferred) i.reply({ content: '⚠️ صار خطأ.', flags: EPH }).catch(() => {});
    }
    return true;
}

async function handleButton(i) {
    if (i.customId !== 'gw_join') return false;
    const all = allGw();
    const gw = all[i.message.id];
    if (!gw || gw.ended) { await i.reply({ content: '⚠️ القرعة خلصت.', flags: EPH }); return true; }
    const idx = gw.entrants.indexOf(i.user.id);
    if (idx === -1) { gw.entrants.push(i.user.id); save(all); await i.reply({ content: '✅ دخلت القرعة بالتوفيق! 🎉', flags: EPH }); }
    else { gw.entrants.splice(idx, 1); save(all); await i.reply({ content: '❌ طلعت من القرعة.', flags: EPH }); }
    return true;
}

module.exports = { commands, handle, handleButton, reschedule };
