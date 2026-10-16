// توليد صورة لوحة الألوان (Canvas / @napi-rs/canvas):
//   شبكة دوائر ممتلئة بأكواد الألوان (Hex) مع رقم كل لون (1، 2، 3…) تحت الدائرة،
//   بخلفية غامقة احترافية بنفس هوية نوفا (أحمر قرمزي + نجوم + توهّج).
//   المخرج: Buffer PNG يُرسل كـ Attachment مع رسالة البانل (الصورة الرئيسية للـ Embed).
const path = require('path');

let canvasLib = null;
try { canvasLib = require('@napi-rs/canvas'); }
catch { console.error('⚠️ @napi-rs/canvas غير مثبت، صورة الألوان معطّلة (يُرسل البانل بدون صورة)'); }

const FONT_PATH = path.join(__dirname, 'Layla-Thuluth.ttf');
const FAMILY = 'Layla';
let fontTried = false, hasFont = false;
function ensureFont() {
    if (fontTried || !canvasLib) return;
    fontTried = true;
    try { canvasLib.GlobalFonts.registerFromPath(FONT_PATH, FAMILY); hasFont = true; }
    catch (e) { console.error('❌ فشل تحميل خط صورة الألوان:', e.message); hasFont = false; }
}
const F = (w, s) => `${w ? w + ' ' : ''}${s}px ${hasFont ? FAMILY + ', ' : ''}sans-serif`;

const available = () => !!canvasLib;

// هوية نوفا
const BG1 = '#1a1622', BG2 = '#0a090d';
const CRIMSON = '#b3121e', ORANGE = '#ff8a3d';
const TXT = '#f4f1fa', MUT = '#a9a4bb';

// مقاسات الشبكة
const CELL_W = 132, CELL_H = 164, R = 44, PAD = 48, HEAD = 180, FOOT = 108;

// توزيع الألوان على أعمدة/صفوف (نخلي الشكل قريب من المربع عشان الصورة تبان كاملة بديسكورد)
function layout(n) {
    const count = Math.max(1, n);
    const cols = Math.max(5, Math.min(10, Math.ceil(Math.sqrt(count * 1.5))));
    const rows = Math.max(1, Math.ceil(count / cols));
    return { cols, rows, w: PAD * 2 + cols * CELL_W, h: HEAD + rows * CELL_H + FOOT };
}

const hexRgb = (h) => {
    const s = String(h || '#000000').replace('#', '');
    const v = s.length === 3 ? s.split('').map((c) => c + c).join('') : s.padEnd(6, '0').slice(0, 6);
    return { r: parseInt(v.slice(0, 2), 16) || 0, g: parseInt(v.slice(2, 4), 16) || 0, b: parseInt(v.slice(4, 6), 16) || 0 };
};
const rgba = (h, a) => { const c = hexRgb(h); return `rgba(${c.r},${c.g},${c.b},${a})`; };
const lum = (h) => { const c = hexRgb(h); return (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255; };

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

// نجوم ثابتة (نفس أسلوب بطاقات الرتب) عشان الخلفية ما تكون ميّتة
function drawStars(ctx, w, h, n) {
    let seed = 7;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let i = 0; i < n; i++) {
        const x = rnd() * w, y = rnd() * h, r = rnd() * 1.4 + 0.4;
        ctx.globalAlpha = rnd() * 0.5 + 0.22;
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
}

function background(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, BG1); g.addColorStop(1, BG2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const glow = ctx.createRadialGradient(w / 2, -h * 0.15, 20, w / 2, -h * 0.15, w * 0.85);
    glow.addColorStop(0, 'rgba(179,18,30,.34)'); glow.addColorStop(1, 'rgba(179,18,30,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
    const glow2 = ctx.createRadialGradient(w * 0.85, h * 1.05, 20, w * 0.85, h * 1.05, w * 0.7);
    glow2.addColorStop(0, 'rgba(255,138,61,.16)'); glow2.addColorStop(1, 'rgba(255,138,61,0)');
    ctx.fillStyle = glow2; ctx.fillRect(0, 0, w, h);
    drawStars(ctx, w, h, Math.round(w * h / 12000));
}

// رسم البانل: الصورة كاملة
async function render(cfg, opts = {}) {
    if (!canvasLib) throw new Error('مكتبة الرسم (@napi-rs/canvas) غير مثبتة على السيرفر');
    ensureFont();
    const roles = (Array.isArray(cfg.roles) ? cfg.roles : []).filter((r) => r && r.id);
    const L = layout(roles.length);
    const cv = canvasLib.createCanvas(L.w, L.h);
    const ctx = cv.getContext('2d');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // العربي يُرسم من اليمين لليسار (بدون هذا يطلع ترتيب الكلمات مقلوب)
    ctx.direction = hasFont ? 'rtl' : 'ltr';
    background(ctx, L.w, L.h);

    // ===== الهيدر =====
    const title = hasFont ? (opts.title || 'لوحة ألوان السيرفر') : (opts.titleEn || 'SERVER COLORS');
    ctx.fillStyle = TXT;
    ctx.font = F(700, 46);
    ctx.fillText(title, L.w / 2, 66);

    const line = ctx.createLinearGradient(L.w / 2 - 130, 0, L.w / 2 + 130, 0);
    line.addColorStop(0, 'rgba(179,18,30,0)'); line.addColorStop(.5, CRIMSON); line.addColorStop(1, 'rgba(255,138,61,0)');
    ctx.fillStyle = line; ctx.fillRect(L.w / 2 - 130, 100, 260, 4);

    ctx.fillStyle = MUT;
    ctx.font = F(500, 26);
    // نصوص عربية صافية (بدون أرقام/شرطات) عشان ما يصير خلل باتجاه النص (bidi)
    const sub = hasFont
        ? (roles.length ? 'شوف الرقم تحت كل دائرة واختره من القائمة' : 'ما فيه ألوان مضافة حالياً')
        : (roles.length ? 'Find the number under each circle, then pick it in the menu' : 'No colors yet');
    ctx.fillText(sub, L.w / 2, 130);

    // ===== بانل الشبكة =====
    roundRect(ctx, PAD - 20, HEAD - 26, L.w - (PAD - 20) * 2, L.rows * CELL_H + 40, 26);
    ctx.fillStyle = 'rgba(255,255,255,.028)'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.stroke();

    // ===== الدوائر والأرقام =====
    roles.forEach((r, i) => {
        const col = i % L.cols, row = Math.floor(i / L.cols);
        const cx = PAD + col * CELL_W + CELL_W / 2;
        const cy = HEAD + row * CELL_H + R + 6;

        // توهّج اللون
        ctx.save();
        ctx.shadowColor = rgba(r.color, 0.55);
        ctx.shadowBlur = 26;
        ctx.shadowOffsetY = 6;
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.fillStyle = r.color; ctx.fill();
        ctx.restore();

        // إطار واضح (مهم للأبيض والأسود على الخلفية الغامقة)
        ctx.lineWidth = 3;
        ctx.strokeStyle = lum(r.color) > 0.82 ? 'rgba(0,0,0,.45)' : 'rgba(255,255,255,.42)';
        ctx.beginPath(); ctx.arc(cx, cy, R - 1, 0, Math.PI * 2); ctx.stroke();

        // لمعة خفيفة أعلى الدائرة
        const sh = ctx.createLinearGradient(0, cy - R, 0, cy + R);
        sh.addColorStop(0, 'rgba(255,255,255,.22)'); sh.addColorStop(.55, 'rgba(255,255,255,0)');
        ctx.fillStyle = sh;
        ctx.beginPath(); ctx.arc(cx, cy, R - 2, 0, Math.PI * 2); ctx.fill();

        // رقم اللون تحت الدائرة فقط (1، 2، 3…)
        ctx.fillStyle = TXT;
        ctx.font = F(700, 34);
        ctx.direction = 'ltr';
        ctx.fillText(String(i + 1), cx, cy + R + 40);
    });

    // ===== الفوتر =====
    const foot = hasFont ? 'اختر رقم لونك من القائمة تحت' : 'Pick your color number from the menu below';
    ctx.fillStyle = MUT;
    ctx.font = F(500, 26);
    ctx.direction = hasFont ? 'rtl' : 'ltr';
    ctx.fillText(foot, L.w / 2, L.h - FOOT / 2 - 6);

    return cv.toBuffer('image/png');
}

module.exports = { available, render, layout, FONT_PATH };
