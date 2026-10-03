// نظام الترحيب: رسالة عند دخول عضو، رسالة وداع، ورتبة تلقائية.
// الإعدادات لكل سيرفر وتتعدل من /dashboard (صفحة الترحيب).
const { EmbedBuilder } = require('discord.js');
const store = require('./store');

const DEFAULT = {
    enabled: false,
    channelId: '',
    title: 'حياك الله في {server} 🌹',
    message: 'يا هلا ومرحبا {user}! نورت السيرفر، أنت العضو رقم **{count}**',
    leaveEnabled: false,
    leaveMessage: '👋 {name} غادر السيرفر',
    autoRoleId: ''
};

const all = () => store.read('welcome.json', {});
const get = (gid) => ({ ...DEFAULT, ...(all()[gid] || {}) });

function set(gid, b) {
    const id = (v) => (/^\d{5,25}$/.test(String(v || '')) ? String(v) : '');
    const a = all();
    a[gid] = {
        enabled: !!b.enabled,
        channelId: id(b.channelId),
        title: String(b.title || DEFAULT.title).slice(0, 100),
        message: String(b.message || DEFAULT.message).slice(0, 1000),
        leaveEnabled: !!b.leaveEnabled,
        leaveMessage: String(b.leaveMessage || DEFAULT.leaveMessage).slice(0, 300),
        autoRoleId: id(b.autoRoleId)
    };
    store.write('welcome.json', a);
}

const fill = (t, v) => String(t)
    .replace(/\{user\}/g, v.mention).replace(/\{name\}/g, v.name)
    .replace(/\{server\}/g, v.server).replace(/\{count\}/g, String(v.count));

// يبني رسالة الترحيب (تُستخدم عند الدخول الحقيقي وعند زر الاختبار)
function build(cfg, v) {
    const e = new EmbedBuilder().setColor(0xd4af37)
        .setTitle(fill(cfg.title, v).slice(0, 256))
        .setDescription(fill(cfg.message, v).slice(0, 4000))
        .setFooter({ text: `العضو رقم ${v.count}` }).setTimestamp();
    if (v.avatar) e.setThumbnail(v.avatar);
    return { content: v.mention, embeds: [e], allowedMentions: { users: v.id ? [v.id] : [] } };
}

function init(client) {
    client.on('guildMemberAdd', async (m) => {
        try {
            const cfg = get(m.guild.id);
            if (cfg.autoRoleId) await m.roles.add(cfg.autoRoleId, 'رتبة تلقائية').catch(() => {});
            if (!cfg.enabled || !cfg.channelId) return;
            const ch = await m.guild.channels.fetch(cfg.channelId).catch(() => null);
            if (!ch || !ch.isTextBased()) return;
            await ch.send(build(cfg, {
                id: m.id, mention: `<@${m.id}>`, name: m.displayName, server: m.guild.name,
                count: m.guild.memberCount, avatar: m.user.displayAvatarURL()
            }));
        } catch (err) { console.error('❌ ترحيب:', err.message); }
    });

    client.on('guildMemberRemove', async (m) => {
        try {
            const cfg = get(m.guild.id);
            if (!cfg.leaveEnabled || !cfg.channelId) return;
            const ch = await m.guild.channels.fetch(cfg.channelId).catch(() => null);
            if (!ch || !ch.isTextBased()) return;
            const name = (m.user && m.user.username) || 'عضو';
            await ch.send({
                content: fill(cfg.leaveMessage, { mention: name, name, server: m.guild.name, count: m.guild.memberCount }).slice(0, 1900),
                allowedMentions: { parse: [] }
            });
        } catch (err) { console.error('❌ وداع:', err.message); }
    });
}

module.exports = { init, get, set, build };
