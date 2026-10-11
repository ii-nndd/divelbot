// نظام اقتصاد نوفا: عملة يومية + رصيد + تحويل + متجر رتب (MongoDB عبر store.js)
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const store = require('./store');

const EPH = MessageFlags.Ephemeral;
const COIN = '🪙';
const DAILY_MIN = 100, DAILY_MAX = 250, DAILY_COOLDOWN = 20 * 3600_000; // 20 ساعة

const allBal = () => store.read('economy.json', {});
function get(gid, uid) {
    const a = allBal();
    return (a[gid] && a[gid][uid]) || { balance: 0, lastDaily: 0 };
}
function save(gid, uid, patch) {
    const a = allBal();
    a[gid] = a[gid] || {};
    a[gid][uid] = { ...get(gid, uid), ...patch };
    store.write('economy.json', a);
    return a[gid][uid];
}
function addBalance(gid, uid, amount) {
    const cur = get(gid, uid);
    return save(gid, uid, { balance: Math.max(0, cur.balance + amount) });
}

const shopAll = () => store.read('shop.json', {});
const shopFor = (gid) => shopAll()[gid] || [];
function shopSave(gid, items) { const a = shopAll(); a[gid] = items; store.write('shop.json', a); }

const owner = (tier) => tier === 'arthur' || tier === 'ida';

const commands = [
    new SlashCommandBuilder().setName('يومي').setDescription(`استلم ${COIN} عملتك اليومية`).setDMPermission(false),
    new SlashCommandBuilder().setName('رصيد').setDescription('اعرض رصيدك أو رصيد عضو')
        .addUserOption(o => o.setName('عضو').setDescription('عضو آخر')).setDMPermission(false),
    new SlashCommandBuilder().setName('تحويل').setDescription('حوّل عملة لعضو آخر')
        .addUserOption(o => o.setName('عضو').setDescription('المستلم').setRequired(true))
        .addIntegerOption(o => o.setName('المبلغ').setDescription('المبلغ').setRequired(true).setMinValue(1))
        .setDMPermission(false),
    new SlashCommandBuilder().setName('المتجر').setDescription('اعرض متجر الرتب').setDMPermission(false),
    new SlashCommandBuilder().setName('شراء').setDescription('اشترِ رتبة من المتجر')
        .addIntegerOption(o => o.setName('رقم').setDescription('رقم العنصر في /المتجر').setRequired(true).setMinValue(1))
        .setDMPermission(false),
    new SlashCommandBuilder().setName('متجر_اضافة').setDescription('إضافة رتبة للمتجر (ارثر وإيدا فقط)')
        .addRoleOption(o => o.setName('الرتبة').setDescription('الرتبة').setRequired(true))
        .addIntegerOption(o => o.setName('السعر').setDescription(`السعر بالـ${COIN}`).setRequired(true).setMinValue(1))
        .setDMPermission(false),
    new SlashCommandBuilder().setName('متجر_حذف').setDescription('حذف عنصر من المتجر (ارثر وإيدا فقط)')
        .addIntegerOption(o => o.setName('رقم').setDescription('رقم العنصر').setRequired(true).setMinValue(1))
        .setDMPermission(false)
].map(c => c.toJSON());

const NAMES = ['يومي', 'رصيد', 'تحويل', 'المتجر', 'شراء', 'متجر_اضافة', 'متجر_حذف'];

async function handle(i, ctx) {
    if (!NAMES.includes(i.commandName)) return false;
    const g = i.guild.id;
    try {
        switch (i.commandName) {
            case 'يومي': {
                const cur = get(g, i.user.id);
                const left = DAILY_COOLDOWN - (Date.now() - cur.lastDaily);
                if (left > 0) {
                    const h = Math.max(1, Math.ceil(left / 3600_000));
                    return i.reply({ content: `⏳ خذيت راتبك اليوم! رجع بعد حوالي **${h}** ساعة.`, flags: EPH });
                }
                const amount = DAILY_MIN + Math.floor(Math.random() * (DAILY_MAX - DAILY_MIN + 1));
                const doc = save(g, i.user.id, { balance: cur.balance + amount, lastDaily: Date.now() });
                return i.reply(`${COIN} استلمت راتبك اليومي: **+${amount}**\nرصيدك الآن: **${doc.balance}** ${COIN}`);
            }
            case 'رصيد': {
                const u = i.options.getUser('عضو') || i.user;
                const doc = get(g, u.id);
                return i.reply(`${COIN} رصيد ${u}: **${doc.balance}**`);
            }
            case 'تحويل': {
                const u = i.options.getUser('عضو');
                const amt = i.options.getInteger('المبلغ');
                if (u.id === i.user.id) return i.reply({ content: '⚠️ ما تقدر تحول لنفسك!', flags: EPH });
                if (u.bot) return i.reply({ content: '⚠️ ما تقدر تحول لبوت!', flags: EPH });
                const me = get(g, i.user.id);
                if (me.balance < amt) return i.reply({ content: `⚠️ رصيدك ما يكفي (${me.balance} ${COIN}).`, flags: EPH });
                save(g, i.user.id, { balance: me.balance - amt });
                addBalance(g, u.id, amt);
                return i.reply(`✅ حولت **${amt}** ${COIN} لـ ${u}`);
            }
            case 'المتجر': {
                const items = shopFor(g);
                if (!items.length) return i.reply({ content: '🛒 المتجر فاضي حالياً.', flags: EPH });
                const lines = items.map((it, k) => `**${k + 1}.** <@&${it.roleId}> — ${it.price} ${COIN}`);
                return i.reply({ embeds: [new EmbedBuilder().setColor(0xb3121e).setTitle('🛒 متجر نوفا').setDescription(lines.join('\n'))] });
            }
            case 'شراء': {
                const idx = i.options.getInteger('رقم') - 1;
                const items = shopFor(g);
                const item = items[idx];
                if (!item) return i.reply({ content: '⚠️ ما فيه عنصر بهذا الرقم.', flags: EPH });
                if (i.member.roles.cache.has(item.roleId)) return i.reply({ content: '⚠️ الرتبة عندك خلاص!', flags: EPH });
                const me = get(g, i.user.id);
                if (me.balance < item.price) return i.reply({ content: `⚠️ رصيدك ما يكفي (تحتاج ${item.price} ${COIN}).`, flags: EPH });
                await i.member.roles.add(item.roleId, 'شراء من متجر نوفا');
                save(g, i.user.id, { balance: me.balance - item.price });
                return i.reply(`✅ مبروك! اشتريت <@&${item.roleId}>`);
            }
            case 'متجر_اضافة': {
                if (!owner(ctx.getTier(i.user.id, i.member))) return i.reply({ content: '⛔ خاص بمولاي ارثر والملكة إيدا فقط!', flags: EPH });
                const role = i.options.getRole('الرتبة'), price = i.options.getInteger('السعر');
                const items = shopFor(g);
                items.push({ roleId: role.id, price });
                shopSave(g, items);
                return i.reply(`✅ ضفت **${role.name}** للمتجر بسعر ${price} ${COIN}`);
            }
            case 'متجر_حذف': {
                if (!owner(ctx.getTier(i.user.id, i.member))) return i.reply({ content: '⛔ خاص بمولاي ارثر والملكة إيدا فقط!', flags: EPH });
                const idx = i.options.getInteger('رقم') - 1;
                const items = shopFor(g);
                if (!items[idx]) return i.reply({ content: '⚠️ ما فيه عنصر بهذا الرقم.', flags: EPH });
                items.splice(idx, 1);
                shopSave(g, items);
                return i.reply('✅ تم الحذف من المتجر');
            }
        }
    } catch (err) {
        console.error('❌ خطأ اقتصاد:', err.message);
        if (!i.replied && !i.deferred) i.reply({ content: '⚠️ صار خطأ، حاول مرة ثانية.', flags: EPH }).catch(() => {});
    }
    return true;
}

module.exports = { commands, handle, get, addBalance };
