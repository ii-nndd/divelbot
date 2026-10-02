// التخزين: ملفات محلية + نسخة دائمة في MongoDB (عشان ما تضيع تعديلاتك لما Render يعيد التشغيل)
const fs = require('fs');
const path = require('path');

const DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
try { fs.mkdirSync(DIR, { recursive: true }); } catch {}

const cache = {};   // اسم الملف -> البيانات
let kv = null;      // مجموعة kv في MongoDB

const fileRead = (f) => {
    try { return JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')); }
    catch { return undefined; }
};
const save = (f, obj) =>
    kv.updateOne({ _id: f }, { $set: { data: JSON.stringify(obj), updatedAt: new Date() } }, { upsert: true });

function read(file, fallback) {
    if (file in cache) return cache[file];
    const v = fileRead(file);
    return v === undefined ? fallback : v;
}

function write(file, obj) {
    cache[file] = obj;
    try { fs.writeFileSync(path.join(DIR, file), JSON.stringify(obj, null, 2)); }
    catch (e) { console.error('❌ فشل الحفظ بالملف:', e.message); }
    if (kv) save(file, obj).catch(e => console.error('❌ فشل الحفظ بقاعدة البيانات:', e.message));
}

// يتنادى مرة وحدة عند التشغيل: يحمّل المحفوظ من MongoDB
async function init() {
    const uri = process.env.MONGODB_URI;
    if (!uri) return console.log('⚠️ بدون MONGODB_URI: التعديلات تضيع عند إعادة التشغيل');
    try {
        const { MongoClient } = require('mongodb');
        const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000 });
        await client.connect();
        kv = client.db(process.env.MONGODB_DB || 'divelbot').collection('kv');
        for (const d of await kv.find({}).toArray()) {
            try { cache[d._id] = JSON.parse(d.data); } catch {}
        }
        // لو فيه ملفات محلية ما انحفظت بالقاعدة، ارفعها
        for (const f of ['replies.json', 'warnings.json']) {
            if (!(f in cache)) {
                const v = fileRead(f);
                if (v !== undefined) { cache[f] = v; await save(f, v); }
            }
        }
        console.log('💾 التخزين الدائم جاهز');
    } catch (err) {
        kv = null;
        console.error('❌ فشل التخزين الدائم:', err.message);
    }
}

module.exports = { read, write, init };
