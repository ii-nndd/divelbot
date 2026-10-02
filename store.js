const fs = require('fs');
const path = require('path');

// لو عندك Disk دائم في الاستضافة، حط مساره في المتغير DATA_DIR
const DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
try { fs.mkdirSync(DIR, { recursive: true }); } catch {}

const read = (file, fallback) => {
    try { return JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8')); }
    catch { return fallback; }
};
const write = (file, obj) => {
    try { fs.writeFileSync(path.join(DIR, file), JSON.stringify(obj, null, 2)); }
    catch (e) { console.error('❌ فشل الحفظ:', e.message); }
};

module.exports = { read, write };
