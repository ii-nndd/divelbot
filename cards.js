// بطاقات صور (مستوى العضو + المتصدرين) بخط "ليلى ثلث" العربي + هوية نوفا (أحمر قرمزي/أسود)
// يحتاج حزمة @napi-rs/canvas (مضافة بـ package.json) وملف الخط Layla-Thuluth.ttf بجذر الريبو
const path = require('path');
let canvasLib = null;
try { canvasLib = require('@napi-rs/canvas'); }
catch { console.error('⚠️ @napi-rs/canvas غير مثبت، البطاقات معطلة (الأوامر ترجع نص عادي بدلها)'); }

const FONT_PATH = path.join(__dirname, 'Layla-Thuluth.ttf');
const FONT_FAMILY = 'Layla';
let fontReady = false;
function ensureFont() {
    if (fontReady || !canvasLib) return;
    try { canvasLib.GlobalFonts.registerFromPath(FONT_PATH, FONT_FAMILY); fontReady = true; }
    catch (err) { console.error('❌ فشل تحميل خط البطاقات (تأكد إن Layla-Thuluth.ttf موجود بجذر الريبو):', err.message); }
}

const available = () => !!canvasLib;

const CRIMSON = '#b3121e', ORANGE = '#ff8a3d', GOLD = '#ffc85a', BG1 = '#17141b', BG2 = '#0a090d';

// نفس معادلة المستويات المستخدمة في points.js (نسخة محلية عشان ما يصير استدعاء دائري)
const levelOf = (p) => Math.floor(Math.sqrt(Math.max(0, p) / 50));
const needFor = (l) => 50 * l * l;

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

// نجوم ثابتة (بذرة شبه عشوائية) عشان نفس الشكل كل مرة وما نحسب عشوائي فعلي كل رسمة
function drawStars(ctx, w, h, n) {
    let seed = 42;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let i = 0; i < n; i++) {
        const x = rnd() * w, y = rnd() * h, r = rnd() * 1.3 + 0.4;
        ctx.globalAlpha = rnd() * 0.5 + 0.25;
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
}

function background(ctx, w, h, glowX) {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, BG1); g.addColorStop(1, BG2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const glow = ctx.createRadialGradient(glowX, h * 0.5, 10, glowX, h * 0.5, w * 0.35);
    glow.addColorStop(0, 'rgba(179,18,30,.38)'); glow.addColorStop(1, 'rgba(179,18,30,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
    // توهّج ذهبي خفيف (نفس هوية art.js)
    const gg = ctx.createRadialGradient(w * .94, h * 1.1, 12, w * .94, h * 1.1, w * .6);
    gg.addColorStop(0, 'rgba(255,200,90,.15)'); gg.addColorStop(1, 'rgba(255,200,90,0)');
    ctx.fillStyle = gg; ctx.fillRect(0, 0, w, h);
    drawStars(ctx, w, h, 45);
    // شريط علوي + إطار وزوايا ذهبية: توحّد شكل كل صور البوت مع art.js
    const bar = ctx.createLinearGradient(0, 0, w, 0);
    bar.addColorStop(0, 'rgba(179,18,30,0)'); bar.addColorStop(.5, CRIMSON); bar.addColorStop(1, 'rgba(179,18,30,0)');
    ctx.fillStyle = bar; ctx.fillRect(0, 0, w, 5);
    const i = 11;
    roundRect(ctx, i, i, w - i * 2, h - i * 2, 24);
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,200,90,.15)'; ctx.stroke();
    const cg = 'rgba(255,200,90,.34)';
    corner(ctx, i + 16, i + 16, 1, 1, 30, cg);
    corner(ctx, w - i - 16, i + 16, -1, 1, 30, cg);
    corner(ctx, i + 16, h - i - 16, 1, -1, 30, cg);
    corner(ctx, w - i - 16, h - i - 16, -1, -1, 30, cg);
}

// قوس زاوية ذهبي (نفس art.js)
function corner(ctx, x, y, sx, sy, len, color) {
    ctx.beginPath();
    ctx.moveTo(x, y + sy * len);
    ctx.lineTo(x, y);
    ctx.lineTo(x + sx * len, y);
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.stroke();
}

async function drawAvatar(ctx, url, cx, cy, r) {
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
    try {
        const img = await canvasLib.loadImage(url);
        ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
    } catch {
        ctx.fillStyle = '#2a2836'; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    ctx.restore();
    ctx.lineWidth = 6; ctx.strokeStyle = CRIMSON;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
}

// ===== شعار نوفا (يستخدم nova-icon.png، وإلا يرسم نجمة احتياطية) =====
const LOGO_PATH = path.join(__dirname, 'nova-icon.png');
let logoImg = null, logoTried = false;
async function loadLogo() {
    if (logoTried) return logoImg;
    logoTried = true;
    try { logoImg = await canvasLib.loadImage(LOGO_PATH); }
    catch { logoImg = null; }
    return logoImg;
}

// نجمة نوفا (نفس شعار اللوحة) — احتياطي لو صورة الشعار ما توفرت
function novaMark(ctx, cx, cy, r, alpha = 1) {
    ctx.save(); ctx.globalAlpha = alpha;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, '#fff6e8'); g.addColorStop(.45, ORANGE); g.addColorStop(1, CRIMSON);
    ctx.fillStyle = g;
    const spikes = 8, inner = r * 0.42;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
        const rad = i % 2 ? inner : r;
        const a = (Math.PI / spikes) * i - Math.PI / 2;
        const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

// يرسم شعار نوفا (صورة إن توفرت، وإلا النجمة)
async function drawLogo(ctx, cx, cy, size, alpha = 1) {
    const img = await loadLogo();
    if (img) {
        ctx.save(); ctx.globalAlpha = alpha;
        ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
        ctx.restore();
    } else {
        novaMark(ctx, cx, cy, size / 2, alpha);
    }
}

function pill(ctx, x, y, w, h, r, fill, stroke) {
    roundRect(ctx, x, y, w, h, r);
    ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.lineWidth = 1.5; ctx.strokeStyle = stroke; ctx.stroke(); }
}

// بطاقة الرتبة الشاملة: كتابي + صوتي + إجمالي + الترتيب + شريط تقدم + شعار نوفا
async function rankCard({ avatarURL, username, displayName, points, textXp = 0, voiceXp = 0, textLevel = 0, voiceLevel = 0, totalXp, totalLevel, lo, hi, rank = 0 }) {
    ensureFont();
    const total = totalXp != null ? totalXp : (points || 0);
    const level = totalLevel != null ? totalLevel : levelOf(total);
    const needLo = lo != null ? lo : needFor(level);
    const needHi = hi != null ? hi : needFor(level + 1);

    const W = 1000, H = 400, PAD = 28;
    const canvas = canvasLib.createCanvas(W, H);
    const ctx = canvas.getContext('2d');
    roundRect(ctx, 0, 0, W, H, 28); ctx.clip();

    const AX = 170, AY = 208, AR = 96;
    background(ctx, W, H, AX);

    // شعار نوفا كبير خفيف بالخلف + هوية الاسم
    await drawLogo(ctx, W - 190, H - 120, 300, 0.07);
    await drawLogo(ctx, 64, 56, 46, 1);
    ctx.textAlign = 'left';
    ctx.fillStyle = GOLD;
    ctx.font = '600 26px ' + FONT_FAMILY;
    ctx.fillText('NOVA', 96, 66);

    // الصورة الشخصية
    await drawAvatar(ctx, avatarURL, AX, AY, AR);

    // اسم العضو + الترتيب (يمين)
    const rightEdge = W - PAD - 20;
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 46px ' + FONT_FAMILY;
    ctx.fillText(displayName || username || 'عضو', rightEdge, 88);

    ctx.font = '28px ' + FONT_FAMILY;
    ctx.fillStyle = GOLD;
    ctx.fillText('الترتيب ' + rank, rightEdge, 132);

    // شريط التقدم (للمستوى الإجمالي)
    const barX = 320, barY = 166, barW = rightEdge - barX, barH = 30;
    ctx.font = '22px ' + FONT_FAMILY;
    ctx.fillStyle = '#9a97a8';
    ctx.fillText('التقدم للمستوى ' + (level + 1), rightEdge, 160);
    roundRect(ctx, barX, barY, barW, barH, 15);
    ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fill();
    const pct = needHi > needLo ? Math.max(0, Math.min(1, (total - needLo) / (needHi - needLo))) : 0;
    if (pct > 0) {
        roundRect(ctx, barX, barY, Math.max(barH, barW * pct), barH, 15);
        const bg = ctx.createLinearGradient(barX, 0, barX + barW, 0);
        bg.addColorStop(0, ORANGE); bg.addColorStop(1, CRIMSON);
        ctx.fillStyle = bg; ctx.fill();
    }
    ctx.font = '22px ' + FONT_FAMILY;
    ctx.fillStyle = '#d8d5e2';
    ctx.fillText(total + ' / ' + needHi + ' XP  (' + Math.round(pct * 100) + '%)', rightEdge, barY + barH + 30);

    // ثلاث بطاقات: كتابي / صوتي / إجمالي
    const pY = 250, pH = 118, gap = 16;
    const areaX = 320, areaW = rightEdge - areaX;
    const pw = (areaW - gap * 2) / 3;
    const stats = [
        { t: 'التفاعل الكتابي', sub: 'المستوى ' + textLevel, val: textXp + ' XP', c: ORANGE },
        { t: 'التفاعل الصوتي', sub: 'المستوى ' + voiceLevel, val: voiceXp + ' XP', c: '#7fe0a5' },
        { t: 'الإجمالي', sub: 'المستوى ' + level, val: total + ' XP', c: GOLD }
    ];
    stats.forEach((s, k) => {
        const x = areaX + k * (pw + gap);
        pill(ctx, x, pY, pw, pH, 18, 'rgba(255,255,255,.05)', 'rgba(255,255,255,.10)');
        ctx.textAlign = 'center';
        ctx.fillStyle = '#9a97a8';
        ctx.font = '22px ' + FONT_FAMILY;
        ctx.fillText(s.t, x + pw / 2, pY + 36);
        ctx.fillStyle = s.c;
        ctx.font = '600 32px ' + FONT_FAMILY;
        ctx.fillText(s.sub, x + pw / 2, pY + 76);
        ctx.fillStyle = '#ffffff';
        ctx.font = '24px ' + FONT_FAMILY;
        ctx.fillText(s.val, x + pw / 2, pY + 106);
    });

    // مستوى إجمالي تحت الصورة
    pill(ctx, AX - 78, 330, 156, 44, 22, CRIMSON, null);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 24px ' + FONT_FAMILY;
    ctx.fillText('المستوى ' + level, AX, 360);

    return canvas.encode('png');
}

// بطاقة المتصدرين (لأمر /المتصدرين) — أعلى 10
async function leaderboardCard(entries, title = 'المتصدرين بنوفا') {
    ensureFont();
    const ROW = 76, PAD = 36, W = 880, HEAD = 96;
    const H = HEAD + ROW * entries.length + PAD;
    const canvas = canvasLib.createCanvas(W, H);
    const ctx = canvas.getContext('2d');
    roundRect(ctx, 0, 0, W, H, 24); ctx.clip();
    background(ctx, W, H, W * 0.5);
    await drawLogo(ctx, W - 58, 54, 54, 1);

    ctx.textAlign = 'right';
    ctx.fillStyle = GOLD;
    ctx.font = '600 42px ' + FONT_FAMILY;
    ctx.fillText(title, W - 100, 68);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#9a97a8';
    ctx.font = '22px ' + FONT_FAMILY;
    ctx.fillText('كتابي + صوتي + إجمالي', PAD, 68);

    const medals = ['#ffd24a', '#d8d8d8', '#c9834a'];
    for (let k = 0; k < entries.length; k++) {
        const e = entries[k];
        const rowY = HEAD + ROW * k;
        pill(ctx, PAD, rowY, W - PAD * 2, ROW - 12, 16, k % 2 ? 'rgba(255,255,255,.02)' : 'rgba(255,255,255,.05)', null);
        const cy = rowY + (ROW - 12) / 2;

        // دائرة الترتيب
        const cx = PAD + 34, r = 26;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = medals[k] || '#2a2836'; ctx.fill();
        ctx.textAlign = 'center'; ctx.fillStyle = k < 3 ? '#1a1500' : '#d8d5e2';
        ctx.font = '600 24px ' + FONT_FAMILY; ctx.fillText(String(k + 1), cx, cy + 9);

        if (e.avatarURL) await drawAvatar(ctx, e.avatarURL, cx + 96, cy, 24);

        ctx.textAlign = 'right'; ctx.fillStyle = '#fff';
        ctx.font = '500 28px ' + FONT_FAMILY;
        ctx.fillText(e.name, W - PAD - 180, cy + 10);

        ctx.textAlign = 'right';
        if (e.totalLevel != null) {
            ctx.fillStyle = GOLD; ctx.font = '22px ' + FONT_FAMILY;
            ctx.fillText('المستوى ' + e.totalLevel, W - PAD - 20, cy - 7);
        }
        ctx.fillStyle = ORANGE; ctx.font = '22px ' + FONT_FAMILY;
        ctx.fillText(e.points + ' XP', W - PAD - 20, cy + 21);
    }

    return canvas.encode('png');
}

// يلف نص طويل على أكثر من سطر ويرسمه بمنتصف نقطة معينة
function wrapCenteredText(ctx, text, cx, cy, maxWidth, lineHeight) {
    const words = String(text).split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
        const test = cur ? cur + ' ' + w : w;
        if (cur && ctx.measureText(test).width > maxWidth) { lines.push(cur); cur = w; }
        else cur = test;
    }
    if (cur) lines.push(cur);
    const startY = cy - (lines.length - 1) * lineHeight / 2;
    lines.forEach((l, i) => ctx.fillText(l, cx, startY + i * lineHeight));
    return lines.length;
}

// بطاقة سؤال/تحدي اللعبة (سرعة الكتابة، الرياضيات، الكلمة المبعثرة)
async function gamePromptCard({ title, mainText, small, seconds }) {
    ensureFont();
    const W = 820, H = 300;
    const canvas = canvasLib.createCanvas(W, H);
    const ctx = canvas.getContext('2d');
    roundRect(ctx, 0, 0, W, H, 24); ctx.clip();
    background(ctx, W, H, W * 0.5);

    ctx.textAlign = 'center';
    ctx.fillStyle = GOLD;
    ctx.font = '600 32px ' + FONT_FAMILY;
    ctx.fillText(title, W / 2, 56);

    ctx.fillStyle = '#ffffff';
    const len = String(mainText).length;
    const size = len > 28 ? 40 : len > 16 ? 54 : 70;
    ctx.font = '600 ' + size + 'px ' + FONT_FAMILY;
    wrapCenteredText(ctx, mainText, W / 2, H / 2 + 14, W - 90, size * 1.15);

    ctx.font = '26px ' + FONT_FAMILY;
    ctx.fillStyle = ORANGE;
    ctx.fillText(small, W / 2, H - 56);

    ctx.font = '22px ' + FONT_FAMILY;
    ctx.fillStyle = '#9a97a8';
    ctx.fillText(`عندك ${seconds} ثانية، أول جواب صح يفوز`, W / 2, H - 24);

    return canvas.encode('png');
}

// بطاقة إعلان الفوز بلعبة (تشتغل لكل الألعاب الأربعة)
async function gameWinCard({ avatarURL, username, gameTitle, seconds, points, totalPoints, leveledUp, level }) {
    ensureFont();
    const W = 820, H = 260;
    const canvas = canvasLib.createCanvas(W, H);
    const ctx = canvas.getContext('2d');
    roundRect(ctx, 0, 0, W, H, 24); ctx.clip();
    const AR = 80, AX = 56 + AR, AY = H / 2;
    background(ctx, W, H, AX);
    await drawAvatar(ctx, avatarURL, AX, AY, AR);

    const rightEdge = W - 46;
    ctx.textAlign = 'right';
    ctx.fillStyle = GOLD;
    ctx.font = '26px ' + FONT_FAMILY;
    ctx.fillText(gameTitle, rightEdge, 60);

    ctx.fillStyle = '#ffffff';
    ctx.font = '600 42px ' + FONT_FAMILY;
    ctx.fillText('🏆 فاز ' + username, rightEdge, 112);

    ctx.font = '28px ' + FONT_FAMILY;
    ctx.fillStyle = '#d8d5e2';
    ctx.fillText(`خلال ${Number(seconds).toFixed(1)} ثانية`, rightEdge, 152);

    if (totalPoints != null) {
        ctx.font = '600 30px ' + FONT_FAMILY;
        ctx.fillStyle = ORANGE;
        ctx.fillText(`+${points} نقطة  •  المجموع ${totalPoints}`, rightEdge, 192);
    }
    if (leveledUp) {
        ctx.font = '26px ' + FONT_FAMILY;
        ctx.fillStyle = GOLD;
        ctx.fillText(`🎉 وصل المستوى ${level}!`, rightEdge, totalPoints != null ? 228 : 192);
    }

    return canvas.encode('png');
}

module.exports = { available, rankCard, leaderboardCard, gamePromptCard, gameWinCard };
