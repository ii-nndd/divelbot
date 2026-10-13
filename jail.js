// نظام "روم السجن": رتبة وحدة تخفي كل الرومات عن صاحبها إلا روم سجن مخصص (شات + فويس).
// المبدأ: نضيف الرتبة فوق رتب العضو العادية (لازم ترتيبها بالرتب أعلى من العضو العادي من ديسكورد نفسه)،
// ونسوي Permission Overwrite يمنعها من رؤية كل روم إلا روم السجن. كل روم جديد ينسوى يتطبق عليه نفس المنع تلقائياً.
const store = require('./store');

const DEF = { enabled: false, roleId: '', textChannelId: '', voiceChannelId: '' };

const all = () => store.read('jailcfg.json', {});
const get = (gid) => ({ ...DEF, ...(all()[gid] || {}) });

function set(gid, b) {
    const id = (v) => (/^\d{5,25}$/.test(String(v || '')) ? String(v) : '');
    const a = all();
    a[gid] = {
        enabled: !!b.enabled,
        roleId: id(b.roleId),
        textChannelId: id(b.textChannelId),
        voiceChannelId: id(b.voiceChannelId)
    };
    store.write('jailcfg.json', a);
}

// يطبق منع/سماح رؤية روم وحد لرتبة السجن
async function syncChannel(channel, cfg) {
    if (!cfg.roleId || !channel.permissionOverwrites) return;
    const isJailChannel = channel.id === cfg.textChannelId || channel.id === cfg.voiceChannelId;
    await channel.permissionOverwrites.edit(cfg.roleId, { ViewChannel: isJailChannel ? true : false }, { reason: 'مزامنة نظام السجن' });
}

// يطبق على كل رومات السيرفر دفعة وحدة (زر "مزامنة الآن" باللوحة)
async function syncAll(guild, cfg) {
    await guild.channels.fetch();
    const channels = [...guild.channels.cache.values()];
    let ok = 0, fail = 0;
    for (const ch of channels) {
        try { await syncChannel(ch, cfg); ok++; }
        catch (err) { fail++; console.error('❌ مزامنة سجن:', ch.name, err.message); }
    }
    return { total: channels.length, ok, fail };
}

// يراقب أي روم جديد وينطبق عليه نفس منع الرؤية تلقائياً (بدون ما تحتاج تسوي شي يدوي كل مرة)
function init(client) {
    client.on('channelCreate', async (channel) => {
        try {
            if (!channel.guild) return;
            const cfg = get(channel.guild.id);
            if (!cfg.enabled || !cfg.roleId) return;
            await syncChannel(channel, cfg);
        } catch (err) { console.error('❌ مزامنة روم جديد (سجن):', err.message); }
    });
}

async function jailMember(member, cfg, reason) {
    if (!cfg.roleId) throw new Error('رتبة السجن مو محددة بعد، اضبطها من /dashboard أول.');
    await member.roles.add(cfg.roleId, reason || 'سجن');
}
async function unjailMember(member, cfg, reason) {
    if (!cfg.roleId) throw new Error('رتبة السجن مو محددة بعد.');
    await member.roles.remove(cfg.roleId, reason || 'فك سجن');
}

module.exports = { get, set, syncChannel, syncAll, init, jailMember, unjailMember };
