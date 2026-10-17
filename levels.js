// نظام الرتب والمستويات التفصيلي:
//  - خبرة التفاعل الكتابي (Text XP) عن الرسائل.
//  - خبرة التفاعل الصوتي (Voice XP) عن وقت التواجد بالرومات الصوتية.
//  - المجموع (Total XP) = كتابي + صوتي + مكافآت الألعاب/الإدارة.
//  - الترتيب بالسيرفر + أمر /رتبة و /rank وبطاقة صورة احترافية.
// كل المعدلات تتعدل من لوحة التحكم (/dashboard) — صفحة "المستويات".
const { SlashCommandBuilder, MessageFlags, AttachmentBuilder } = require('discord.js');
const store = require('./store');
const points = require('./points');
const art = require('./art');

const DEF = {
    textEnabled: true, textMin: 5, textMax: 15, textCd: 60,      // خبرة كتابية: من/إلى/كل كم ثانية
    voiceEnabled: true, voiceMin: 5, voiceMax: 10, voiceTick: 60, voiceMinMembers: 1,  // خبرة صوتية لكل دورة
    announce: true                                                // إعلان الترقية بالشات
};

const all = () => store.read('rankcfg.json', {});
const get = (gid) => ({ ...DEF, ...(all()[gid] || {}) });

function set(gid, b) {
    const num = (v, a, z, d) => { const n = Math.floor(Number(v)); return Number.isFinite(n) ? Math.min(z, Math.max(a, n)) : d; };
    const cur = get(gid);
    const out = {
        textEnabled: b.textEnabled === undefined ? cur.textEnabled : !!b.textEnabled,
        textMin: num(b.textMin, 1, 1000, cur.textMin),
        textMax: num(b.textMax, 1, 1000, cur.textMax),
        textCd: num(b.textCd, 5, 3600, cur.textCd),
        voiceEnabled: b.voiceEnabled === undefined ? cur.voiceEnabled : !!b.voiceEnabled,
        voiceMin: num(b.voiceMin, 1, 1000, cur.voiceMin),
        voiceMax: num(b.voiceMax, 1, 1000, cur.voiceMax),
        voiceTick: num(b.voiceTick, 10, 3600, cur.voiceTick),
        voiceMinMembers: num(b.voiceMinMembers, 1, 50, cur.voiceMinMembers),
        announce: b.announce === undefined ? cur.announce : !!b.announce
    };
    if (out.textMax < out.textMin) out.textMax = out.textMin;
    if (out.voiceMax < out.voiceMin) out.voiceMax = out.voiceMin;
    const a = all();
    a[gid] = out;
    store.write('rankcfg.json', a);
    return out;
}

const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

// طباعة الخطأ مرة كل ٥ دقايق لكل نوع — لأن الأخطاء هني كانت تنبلع بصمت
// (صار فعلاً إن خبرة الكتابي والصوتي كانت تفشل ٤ أشهر بلا أي أثر بالكونسول)
const lastErr = new Map();
function logErr(what, err) {
    const now = Date.now();
    if (now - (lastErr.get(what) || 0) < 300_000) return;
    lastErr.set(what, now);
    console.error(`❌ ${what}:`, err && err.message ? err.message : err);
}

// ===== خبرة التفاعل الكتابي =====
const chatCd = new Map();
async function onMessage(message) {
    if (!points.ready()) return;
    const cfg = get(message.guild.id);
    if (!cfg.textEnabled || String(message.content || '').trim().length < 3) return;

    const key = `${message.guild.id}:${message.author.id}`;
    const now = Date.now();
    if (now - (chatCd.get(key) || 0) < cfg.textCd * 1000) return;
    chatCd.set(key, now);

    const gain = rand(cfg.textMin, cfg.textMax);
    const doc = await points.addText(message.guild.id, message.author.id, gain).catch((e) => { logErr('حفظ خبرة الكتابي', e); return null; });
    if (!doc) return;
    const before = points.levelOf(doc.points - gain), after = points.levelOf(doc.points);
    if (after > before && cfg.announce) {
        // بطاقة الترقية المصممة (وإلا نص عادي لو الرسم تعطّل)
        if (art.available()) {
            const rank = await points.rankOf(message.guild.id, doc.points).catch(() => 0);
            const png = await art.guard(art.levelUpCard({
                avatarURL: message.author.displayAvatarURL({ extension: 'png', size: 256 }),
                name: message.member ? message.member.displayName : message.author.username,
                level: after, points: doc.points,
                lo: points.needFor(after), hi: points.needFor(after + 1), rank
            }), 6000, 'بطاقة الترقية');
            if (png) {
                await message.channel.send({ content: `${message.author}`, files: [new AttachmentBuilder(png, { name: 'level.png' })] }).catch(() => {});
                return;
            }
        }
        message.channel.send(`🎉 مبروك ${message.author}! وصلت **المستوى ${after}**`).catch(() => {});
    }
}

// تنظيف كولداون الشات القديم
setInterval(() => {
    const limit = Date.now() - 3600_000;
    for (const [id, t] of chatCd) if (t < limit) chatCd.delete(id);
}, 10 * 60_000);

// ===== خبرة التفاعل الصوتي =====
let vclient = null, vguildId = null, vtimer = null;

async function voiceTick() {
    try {
        const cfg = get(vguildId);
        const g = vclient && vclient.guilds.cache.get(vguildId);
        if (cfg.voiceEnabled && g) {
            for (const ch of g.channels.cache.values()) {
                if (!ch.isVoiceBased()) continue;
                if (g.afkChannelId && ch.id === g.afkChannelId) continue;
                const members = [...ch.members.values()].filter(m => !m.user.bot);
                if (members.length < cfg.voiceMinMembers) continue;
                for (const m of members) {
                    const gain = rand(cfg.voiceMin, cfg.voiceMax);
                    await points.addVoice(g.id, m.id, gain).catch((e) => { logErr('حفظ خبرة الصوتي', e); });
                }
            }
        }
    } catch (err) {
        console.error('❌ خبرة صوتية:', err.message);
    } finally {
        scheduleVoice();
    }
}

function scheduleVoice() {
    clearTimeout(vtimer);
    if (!vclient || !vguildId) return;
    const cfg = get(vguildId);
    vtimer = setTimeout(voiceTick, Math.max(10, cfg.voiceTick) * 1000);
}

function init(client, CONFIG) {
    vclient = client;
    vguildId = CONFIG.GUILD_ID;
    // نتأكد إن الرومات محمّلة عشان نعرف أعضاء كل روم صوتي
    const g = client.guilds.cache.get(vguildId);
    if (g) g.channels.fetch().catch(() => {});
    scheduleVoice();
}

// ===== الأمر /رتبة و /rank =====
const commands = [
    new SlashCommandBuilder().setName('رتبة').setDescription('بطاقة رتبتك: كتابي + صوتي + إجمالي + ترتيبك')
        .addUserOption(o => o.setName('عضو').setDescription('عضو آخر')).setDMPermission(false),
    new SlashCommandBuilder().setName('rank').setDescription('Your rank card (text + voice + total + server rank)')
        .addUserOption(o => o.setName('user').setDescription('Another member')).setDMPermission(false)
].map(c => c.toJSON());

const NAMES = ['رتبة', 'rank', 'مستوى'];

async function handle(i, ctx) {
    if (!NAMES.includes(i.commandName)) return false;
    const EPH = MessageFlags.Ephemeral;
    if (!points.ready()) {
        await i.reply({ content: '⚠️ نظام المستويات غير مفعل (قاعدة البيانات غير متصلة).', flags: EPH });
        return true;
    }
    try {
        const u = (i.options.getUser('عضو') || i.options.getUser('user')) || i.user;
        await points.sendRank(i, u, i.guild.id);
    } catch (err) {
        console.error('❌ خطأ أمر الرتبة:', err.message);
        const msg = { content: '⚠️ صار خطأ، حاول مرة ثانية.', flags: EPH };
        if (!i.replied && !i.deferred) i.reply(msg).catch(() => {});
    }
    return true;
}

module.exports = { init, onMessage, get, set, commands, handle, DEF };
