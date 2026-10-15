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
    drawStars(ctx, w, h, 45);
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

// بطاقة مستوى/نقاط عضو وحد (لأمر /نقاطي)
async function rankCard({ avatarURL, username, points, level, lo, hi, rank }) {
    ensureFont();
    const W = 934, H = 282;
    const canvas = canvasLib.createCanvas(W, H);
    const ctx = canvas.getContext('2d');
    roundRect(ctx, 0, 0, W, H, 24); ctx.clip();

    const AR = 90, AX = 56 + AR, AY = H / 2;
    background(ctx, W, H, AX);
    await drawAvatar(ctx, avatarURL, AX, AY, AR);

    const rightEdge = W - 46;
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 42px ' + FONT_FAMILY;
    ctx.fillText(username, rightEdge, 88);

    ctx.font = '30px ' + FONT_FAMILY;
    ctx.fillStyle = GOLD;
    ctx.fillText(`المستوى ${level}   •   الترتيب #${rank}`, rightEdge, 130);

    const barX = AX + AR + 40, barY = 178, barW = rightEdge - barX, barH = 28;
    roundRect(ctx, barX, barY, barW, barH, 14);
    ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fill();
    const pct = hi > lo ? Math.max(0, Math.min(1, (points - lo) / (hi - lo))) : 0;
    if (pct > 0) {
        roundRect(ctx, barX, barY, Math.max(barH, barW * pct), barH, 14);
        const bg = ctx.createLinearGradient(barX, 0, barX + barW, 0);
        bg.addColorStop(0, ORANGE); bg.addColorStop(1, CRIMSON);
        ctx.fillStyle = bg; ctx.fill();
    }

    ctx.font = '24px ' + FONT_FAMILY;
    ctx.fillStyle = '#d8d5e2';
    ctx.fillText(`${points} / ${hi} نقطة`, rightEdge, barY + barH + 34);

    return canvas.encode('png');
}

// بطاقة المتصدرين (لأمر /المتصدرين) — أعلى 10
async function leaderboardCard(entries) {
    ensureFont();
    const ROW = 72, PAD = 36, W = 820;
    const H = PAD * 2 + 70 + ROW * entries.length;
    const canvas = canvasLib.createCanvas(W, H);
    const ctx = canvas.getContext('2d');
    roundRect(ctx, 0, 0, W, H, 24); ctx.clip();
    background(ctx, W, H, W * 0.5);

    ctx.textAlign = 'center';
    ctx.fillStyle = GOLD;
    ctx.font = '600 44px ' + FONT_FAMILY;
    ctx.fillText('🏆 المتصدرين بنوفا', W / 2, 62);

    const medals = ['#ffd24a', '#d8d8d8', '#c9834a'];
    let y = 70 + PAD;
    for (let k = 0; k < entries.length; k++) {
        const e = entries[k];
        const rowY = y + ROW * k;
        roundRect(ctx, PAD, rowY, W - PAD * 2, ROW - 14, 16);
        ctx.fillStyle = k % 2 === 0 ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.02)';
        ctx.fill();

        // دائرة الترتيب
        const cx = PAD + 34, cy = rowY + (ROW - 14) / 2, r = 26;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = medals[k] || '#2a2836'; ctx.fill();
        ctx.fillStyle = k < 3 ? '#1a1500' : '#d8d5e2';
        ctx.font = '600 24px ' + FONT_FAMILY; ctx.textAlign = 'center';
        ctx.fillText(String(k + 1), cx, cy + 9);

        if (e.avatarURL) await drawAvatar(ctx, e.avatarURL, cx + 90, cy, 24);

        ctx.textAlign = 'right';
        ctx.fillStyle = '#fff';
        ctx.font = '500 28px ' + FONT_FAMILY;
        ctx.fillText(e.name, W - PAD - 20, cy + 10);

        ctx.font = '22px ' + FONT_FAMILY;
        ctx.fillStyle = ORANGE;
        ctx.fillText(`${e.points} نقطة`, W - PAD - 20, cy - 16);
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
