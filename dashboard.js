// لوحة التحكم الكاملة: /dashboard
// تسجيل دخول بحساب ديسكورد، ويسمح فقط لآي دي ارثر وإيدا.
// المتغيرات المطلوبة: DISCORD_CLIENT_ID و DISCORD_CLIENT_SECRET و SESSION_SECRET
const crypto = require('crypto');
const { ChannelType, EmbedBuilder } = require('discord.js');
const store = require('./store');
const welcome = require('./welcome');
const tickets = require('./tickets');

const BASE = process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || 'https://divelbot.onrender.com';
const SECRET = process.env.SESSION_SECRET;
const CID = process.env.DISCORD_CLIENT_ID;
const CSEC = process.env.DISCORD_CLIENT_SECRET;
const WEEK = 7 * 24 * 3600 * 1000;

const hmac = (b) => crypto.createHmac('sha256', SECRET).update(b).digest('base64url');
const sign = (p) => { const b = Buffer.from(JSON.stringify(p)).toString('base64url'); return b + '.' + hmac(b); };
function verify(t) {
    if (!t || !SECRET) return null;
    const [b, h] = t.split('.');
    if (!b || !h) return null;
    const e = hmac(b);
    if (h.length !== e.length || !crypto.timingSafeEqual(Buffer.from(h), Buffer.from(e))) return null;
    try { const p = JSON.parse(Buffer.from(b, 'base64url').toString()); return p.exp > Date.now() ? p : null; }
    catch { return null; }
}
const cookies = (req) => Object.fromEntries((req.headers.cookie || '').split(';')
    .map(c => c.trim().split(/=(.*)/s).slice(0, 2)).filter(x => x[0]));
const setCookie = (res, n, v, age) =>
    res.append('Set-Cookie', `${n}=${v}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`);

const clean = (s) => String(s || '').trim().slice(0, 100);
const hex = (s) => (/^#[0-9a-fA-F]{6}$/.test(s) ? s : null);

const PAGE = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>لوحة دايڤل الملكية</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box}body{margin:0;font-family:'IBM Plex Sans Arabic',Tahoma,sans-serif;background:#0f0e14;color:#edebf2}
.app{display:flex;min-height:100vh}.sb{width:230px;background:#14131b;border-left:1px solid #2a2836;padding:22px 14px;display:flex;flex-direction:column;gap:6px;flex-shrink:0}
.logo{font-size:20px;font-weight:700;color:#d4af37;margin-bottom:18px}
.nav{padding:12px 14px;border-radius:10px;color:#9a97a8;font-size:15px;cursor:pointer;border:0;background:none;text-align:right;font:inherit}
.nav.on{background:#2a2410;color:#d4af37}.main{flex:1;padding:26px;max-width:960px}
.card{background:#181720;border:1px solid #2a2836;border-radius:14px;padding:18px;margin-bottom:16px}
h1{margin:0 0 4px;font-size:25px}.mut{color:#9a97a8;font-size:14px}.row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
input,select,textarea{background:#0f0e14;color:#edebf2;border:1px solid #33314a;border-radius:10px;padding:11px;font:inherit;min-height:44px}
textarea{width:100%;min-height:130px}input[type=color]{padding:3px;width:48px}
button.btn,button.b2,button.dn{border:0;border-radius:10px;padding:10px 16px;font:inherit;cursor:pointer;min-height:44px}
.btn{background:#d4af37;color:#1a1500;font-weight:700}.b2{background:#22212c;color:#edebf2;border:1px solid #2a2836!important}
.dn{background:#22212c;color:#ff8a8a;border:1px solid #6b2a2a!important}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}.big{font-size:30px;font-weight:700;color:#d4af37}
.item{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #2a2836;flex-wrap:wrap}
.item .nm{flex:1;min-width:120px}.tag{background:#22212c;border:1px solid #33314a;border-radius:20px;padding:2px 10px;font-size:12px;color:#c9c6d6}
.cat{color:#d4af37;font-weight:600;margin:14px 0 4px}.sw{width:18px;height:18px;border-radius:50%;border:1px solid #444}
#toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:#1f6f3f;padding:10px 18px;border-radius:10px;opacity:0;transition:.3s;pointer-events:none}
#toast.err{background:#9b2020}#toast.on{opacity:1}a.btn{display:inline-block;text-decoration:none;padding:12px 20px;border-radius:10px}
@media(max-width:800px){.app{flex-direction:column}.sb{width:auto;flex-direction:row;overflow-x:auto;padding:12px}.logo{display:none}.nav{white-space:nowrap}.main{padding:16px}}
</style></head><body><div id="root"></div><div id="toast"></div>
<script>
var $=function(i){return document.getElementById(i)};
function el(t,p,k){var e=document.createElement(t);p=p||{};for(var a in p){if(a==='text')e.textContent=p[a];else if(a==='on'){for(var v in p.on)e.addEventListener(v,p.on[v])}else if(a==='value')e.value=p[a];else e.setAttribute(a,p[a])}(k||[]).forEach(function(c){if(c)e.appendChild(c)});return e}
function opt(v,t){return el('option',{value:v,text:t})}
function toast(m,e){var t=$('toast');t.textContent=m;t.className=(e?'err ':'')+'on';setTimeout(function(){t.className=''},2400)}
function api(p,b){return fetch('/dashboard/api/'+p,{method:b?'POST':'GET',headers:{'Content-Type':'application/json','x-dash':'1'},body:b?JSON.stringify(b):undefined}).then(function(r){return r.json().then(function(j){if(!r.ok){if(r.status===401)location.reload();throw new Error(j.error||'خطأ')}return j})})}
function card(title,child){return el('div',{class:'card'},[title?el('div',{class:'cat',text:title}):null,child])}
function row(k){return el('div',{class:'row'},k)}
function go(fn,msg,page){fn.then(function(){toast(msg||'تم ✅');if(page)show(page)}).catch(function(e){toast(e.message,1)})}
var pages={},cur='overview';
var NAV=[['overview','نظرة عامة'],['channels','الرومات'],['roles','الرتب'],['members','الأعضاء'],['members','الأعضاء'],['welcome','الترحيب'],['tickets','التذاكر'],['announce','الإعلانات'],['log','السجل']];
function show(p){cur=p;var m=$('main');m.innerHTML='';[].forEach.call(document.querySelectorAll('.nav'),function(n){n.className='nav'+(n.dataset.p===p?' on':'')});pages[p](m).catch(function(e){toast(e.message,1)})}
pages.overview=function(m){return api('overview').then(function(d){m.appendChild(el('h1',{text:d.name}));m.appendChild(el('div',{class:'mut',text:'تحكم كامل بالسيرفر، والتعديل ينفذ فور الضغط'}));
var s=el('div',{class:'stats'});[['الأعضاء',d.members],['الرومات',d.channels],['الرتب',d.roles]].forEach(function(x){s.appendChild(el('div',{class:'card'},[el('div',{class:'mut',text:x[0]}),el('div',{class:'big',text:String(x[1])})]))});m.appendChild(s)})};
pages.channels=function(m){return api('channels').then(function(d){
m.appendChild(el('h1',{text:'الرومات'}));var cats=d.channels.filter(function(c){return c.type==='category'});
var name=el('input',{placeholder:'الاسم'}),type=el('select',{},[opt('text','روم نصي'),opt('voice','روم فويس'),opt('category','قسم')]),par=el('select',{},[opt('','بدون قسم')].concat(cats.map(function(c){return opt(c.id,c.name)})));
m.appendChild(card('إنشاء جديد',row([name,type,par,el('button',{class:'btn',text:'إنشاء',on:{click:function(){go(api('channels/create',{name:name.value,type:type.value,parentId:par.value}),'تم الإنشاء ✅','channels')}}})])));
function line(c){var k=[el('span',{class:'tag',text:c.type==='text'?'نصي':c.type==='voice'?'فويس':'قسم'}),el('span',{class:'nm',text:c.name}),
el('button',{class:'b2',text:'تسمية',on:{click:function(){var n=prompt('الاسم الجديد',c.name);if(n)go(api('channels/edit',{id:c.id,name:n}),'تم ✅','channels')}}})];
if(c.type!=='category'){var s=el('select',{},[opt('','بدون قسم')].concat(cats.map(function(x){return opt(x.id,x.name)})));s.value=c.parentId||'';s.addEventListener('change',function(){go(api('channels/edit',{id:c.id,parentId:s.value}),'تم النقل ✅','channels')});k.push(s)}
k.push(el('button',{class:'dn',text:'حذف',on:{click:function(){if(confirm('تأكيد حذف: '+c.name+' ؟ ما ينرجع'))go(api('channels/delete',{id:c.id,confirm:true}),'تم الحذف','channels')}}}));return el('div',{class:'item'},k)}
var box=el('div',{class:'card'});var none=d.channels.filter(function(c){return c.type!=='category'&&!c.parentId});
if(none.length){box.appendChild(el('div',{class:'cat',text:'بدون قسم'}));none.forEach(function(c){box.appendChild(line(c))})}
cats.forEach(function(g){box.appendChild(el('div',{class:'cat',text:'قسم'}));box.appendChild(line(g));d.channels.filter(function(c){return c.parentId===g.id}).forEach(function(c){box.appendChild(line(c))})});m.appendChild(box)})};
pages.roles=function(m){return api('roles').then(function(d){
m.appendChild(el('h1',{text:'الرتب'}));var name=el('input',{placeholder:'اسم الرتبة'}),col=el('input',{type:'color',value:'#d4af37'});
m.appendChild(card('رتبة جديدة',row([name,col,el('button',{class:'btn',text:'إنشاء',on:{click:function(){go(api('roles/create',{name:name.value,color:col.value}),'تم الإنشاء ✅','roles')}}})])));
var box=el('div',{class:'card'});d.roles.forEach(function(r){var k=[el('span',{class:'sw',style:'background:'+r.color}),el('span',{class:'nm',text:r.name})];
if(r.editable){var c=el('input',{type:'color',value:r.color});c.addEventListener('change',function(){go(api('roles/edit',{id:r.id,color:c.value}),'تم تغيير اللون ✅','roles')});k.push(c);
k.push(el('button',{class:'b2',text:'تسمية',on:{click:function(){var n=prompt('الاسم الجديد',r.name);if(n)go(api('roles/edit',{id:r.id,name:n}),'تم ✅','roles')}}}));
k.push(el('button',{class:'dn',text:'حذف',on:{click:function(){if(confirm('تأكيد حذف الرتبة: '+r.name+' ؟'))go(api('roles/delete',{id:r.id,confirm:true}),'تم الحذف','roles')}}}))}else k.push(el('span',{class:'tag',text:'محمية'}));
box.appendChild(el('div',{class:'item'},k))});m.appendChild(box)})};
pages.announce=function(m){return api('channels').then(function(d){m.appendChild(el('h1',{text:'الإعلانات'}));
var ch=el('select',{},d.channels.filter(function(c){return c.type==='text'}).map(function(c){return opt(c.id,'# '+c.name)})),t=el('input',{placeholder:'العنوان (اختياري)',style:'width:100%;margin:10px 0'}),x=el('textarea',{placeholder:'نص الإعلان'});
m.appendChild(card('',el('div',{},[ch,t,x,el('div',{style:'margin-top:10px'},[el('button',{class:'btn',text:'إرسال الإعلان',on:{click:function(){go(api('announce',{channelId:ch.value,title:t.value,text:x.value}),'انرسل ✅')}}})])])))})};
pages.members=function(m){m.appendChild(el('h1',{text:'الأعضاء'}));
var q=el('input',{placeholder:'ابحث بالاسم',style:'flex:1;min-width:160px'}),box=el('div',{class:'card'});
function act(path,body,msg){go(api(path,body),msg,null);setTimeout(load,900)}
function load(){box.innerHTML='';box.appendChild(el('div',{class:'mut',text:'جاري البحث...'}));
api('members?q='+encodeURIComponent(q.value)).then(function(d){box.innerHTML='';if(!d.members.length)box.appendChild(el('div',{class:'mut',text:'ما لقيت أحد'}));
d.members.forEach(function(u){var k=[el('img',{src:u.avatar,width:'36',height:'36',style:'border-radius:50%'}),el('span',{class:'nm',text:u.name+(u.bot?' (بوت)':'')})];
u.roles.forEach(function(r){k.push(el('span',{class:'tag',text:r}))});
k.push(el('button',{class:'b2',text:'ميوت',on:{click:function(){var n=prompt('كم دقيقة؟ (0 لفك الميوت)','10');if(n!==null)act('members/timeout',{id:u.id,minutes:Number(n)},'تم ✅')}}}));
k.push(el('button',{class:'dn',text:'طرد',on:{click:function(){if(confirm('تأكيد طرد '+u.name+' ؟'))act('members/kick',{id:u.id,confirm:true},'تم الطرد')}}}));
k.push(el('button',{class:'dn',text:'حظر',on:{click:function(){if(confirm('تأكيد حظر '+u.name+' ؟'))act('members/ban',{id:u.id,confirm:true},'تم الحظر')}}}));
box.appendChild(el('div',{class:'item'},k))})}).catch(function(e){box.innerHTML='';box.appendChild(el('div',{class:'mut',text:e.message}))})}
m.appendChild(card('',row([q,el('button',{class:'btn',text:'بحث',on:{click:load}})])));m.appendChild(box);load();return Promise.resolve()};
pages.welcome=function(m){return api('welcome').then(function(d){var c=d.config;
m.appendChild(el('h1',{text:'الترحيب'}));m.appendChild(el('div',{class:'mut',text:'المتغيرات: {user} المنشن، {name} الاسم، {server} اسم السيرفر، {count} رقم العضو'}));
function lab(t,k){return el('label',{class:'row',style:'margin:10px 0'},[k,el('span',{text:t})])}
var en=el('input',{type:'checkbox'});en.checked=c.enabled;
var ch=el('select',{},[opt('','اختر روم الترحيب')].concat(d.channels.map(function(x){return opt(x.id,'# '+x.name)})));ch.value=c.channelId;
var ti=el('input',{style:'width:100%',value:c.title}),ms=el('textarea',{});ms.value=c.message;
var le=el('input',{type:'checkbox'});le.checked=c.leaveEnabled;var lm=el('input',{style:'width:100%',value:c.leaveMessage});
var rl=el('select',{},[opt('','بدون رتبة تلقائية')].concat(d.roles.map(function(x){return opt(x.id,x.name)})));rl.value=c.autoRoleId;
function body(){return{enabled:en.checked,channelId:ch.value,title:ti.value,message:ms.value,leaveEnabled:le.checked,leaveMessage:lm.value,autoRoleId:rl.value}}
m.appendChild(card('ترحيب الداخلين',el('div',{},[lab('تفعيل الترحيب',en),ch,el('p'),ti,el('p'),ms])));
m.appendChild(card('رسالة الوداع (نفس الروم)',el('div',{},[lab('تفعيل رسالة الوداع',le),lm])));
m.appendChild(card('رتبة تلقائية للداخلين',rl));
m.appendChild(row([el('button',{class:'btn',text:'حفظ',on:{click:function(){go(api('welcome/save',body()),'انحفظ ✅',null)}}}),
el('button',{class:'b2',text:'جرّب الترحيب',on:{click:function(){api('welcome/save',body()).then(function(){return api('welcome/test',{})}).then(function(){toast('انرسلت رسالة تجربة ✅')}).catch(function(e){toast(e.message,1)})}}})]))})};
pages.tickets=function(m){return api('tickets').then(function(d){var c=d.config;
m.appendChild(el('h1',{text:'التذاكر'}));m.appendChild(el('div',{class:'mut',text:'التذاكر المفتوحة الآن: '+d.open+' • المتغير {user} في رسالة الترحيب يمنشن صاحب التذكرة'}));
function lab(t,k){return el('label',{class:'row',style:'margin:10px 0'},[k,el('span',{text:t})])}
function sel(first,list,val){var s=el('select',{},[opt('',first)].concat(list.map(function(x){return opt(x.id,x.name)})));s.value=val||'';return s}
var en=el('input',{type:'checkbox'});en.checked=c.enabled;
var cat=sel('بدون قسم (أنشئ الروم برا الأقسام)',d.categories,c.categoryId),st=sel('بدون رتبة دعم',d.roles,c.staffRoleId),lg=sel('بدون سجل',d.channels,c.logChannelId);
var pt=el('input',{style:'width:100%',value:c.panelTitle}),px=el('textarea',{}),bl=el('input',{style:'width:100%',value:c.buttonLabel}),wt=el('textarea',{}),mx=el('input',{type:'number',min:'1',max:'5',value:String(c.maxOpen)});
px.value=c.panelText;wt.value=c.welcomeText;
function body(){return{enabled:en.checked,categoryId:cat.value,staffRoleId:st.value,logChannelId:lg.value,panelTitle:pt.value,panelText:px.value,buttonLabel:bl.value,welcomeText:wt.value,maxOpen:mx.value}}
m.appendChild(card('الإعدادات',el('div',{},[lab('تفعيل نظام التذاكر',en),el('div',{class:'mut',text:'القسم اللي تنفتح فيه التذاكر'}),cat,el('p'),el('div',{class:'mut',text:'رتبة الدعم (تشوف كل التذاكر)'}),st,el('p'),el('div',{class:'mut',text:'روم سجل التذاكر (تنحفظ فيه نسخة المحادثة عند الإغلاق)'}),lg,el('p'),el('div',{class:'mut',text:'أقصى عدد تذاكر مفتوحة لكل عضو'}),mx])));
m.appendChild(card('شكل لوحة التذاكر',el('div',{},[pt,el('p'),px,el('p'),bl])));
m.appendChild(card('رسالة داخل التذكرة',wt));
var pc=sel('اختر الروم اللي تنرسل فيه اللوحة',d.channels,'');pc.firstChild.value='';
m.appendChild(row([el('button',{class:'btn',text:'حفظ',on:{click:function(){go(api('tickets/save',body()),'انحفظ ✅',null)}}})]));
m.appendChild(card('إرسال لوحة التذاكر',row([pc,el('button',{class:'b2',text:'أرسل اللوحة',on:{click:function(){if(!pc.value)return toast('اختر الروم أول',1);api('tickets/save',body()).then(function(){return api('tickets/panel',{channelId:pc.value})}).then(function(){toast('انرسلت اللوحة ✅')}).catch(function(e){toast(e.message,1)})}}})])))})};
pages.log=function(m){return api('log').then(function(d){m.appendChild(el('h1',{text:'السجل'}));var b=el('div',{class:'card'});
if(!d.log.length)b.appendChild(el('div',{class:'mut',text:'ما فيه إجراءات للحين'}));d.log.forEach(function(l){b.appendChild(el('div',{class:'item'},[el('span',{class:'nm',text:l.msg}),el('span',{class:'mut',text:l.by+' • '+new Date(l.at).toLocaleString('ar')})]))});m.appendChild(b)})};
pages.members=function(m){m.appendChild(el('h1',{text:'الأعضاء'}));
var q=el('input',{placeholder:'آي دي العضو أو اسمه',style:'flex:1;min-width:200px'}),out=el('div',{});
function find(v){out.innerHTML='';Promise.all([api('members/search?q='+encodeURIComponent(v)),api('roles')]).then(function(r){
if(!r[0].members.length){out.appendChild(card('',el('div',{class:'mut',text:'ما فيه نتائج'})));return}
r[0].members.forEach(function(x){out.appendChild(mcard(x,r[1].roles.filter(function(y){return y.editable})))})}).catch(function(e){toast(e.message,1)})}
function mcard(x,roles){var c=el('div',{class:'card'});
c.appendChild(el('div',{class:'row'},[el('img',{src:x.avatar,width:'44',height:'44',style:'border-radius:50%'}),el('div',{},[el('div',{text:x.name+(x.bot?' (بوت)':'')}),el('div',{class:'mut',text:x.user+' • '+x.id})])]));
var rl=el('div',{class:'row',style:'margin:10px 0'});x.roles.forEach(function(r){rl.appendChild(el('span',{class:'tag',text:r.name}))});if(x.timedOut)rl.appendChild(el('span',{class:'tag',text:'مكتوم'}));c.appendChild(rl);
if(x.owner){c.appendChild(el('div',{class:'mut',text:'محمي 👑'}));return c}
function act(a,ex,msg,gone){api('members/action',Object.assign({id:x.id,action:a},ex||{})).then(function(){toast(msg||'تم ✅');if(gone)out.innerHTML='';else find(x.id)}).catch(function(e){toast(e.message,1)})}
var mins=el('input',{type:'number',value:'10',min:'1',style:'width:90px'}),nick=el('input',{placeholder:'اللقب الجديد'}),rs=el('select',{},roles.map(function(r){return opt(r.id,r.name)}));
c.appendChild(row([mins,el('button',{class:'b2',text:'كتم بالدقائق',on:{click:function(){act('timeout',{minutes:Number(mins.value)},'تم الكتم ✅')}}}),el('button',{class:'b2',text:'فك الكتم',on:{click:function(){act('untimeout',{},'تم فك الكتم ✅')}}})]));
c.appendChild(el('p'));c.appendChild(row([nick,el('button',{class:'b2',text:'تغيير اللقب',on:{click:function(){act('nick',{nick:nick.value})}}})]));
c.appendChild(el('p'));c.appendChild(row([rs,el('button',{class:'b2',text:'إضافة رتبة',on:{click:function(){act('addrole',{roleId:rs.value})}}}),el('button',{class:'b2',text:'سحب رتبة',on:{click:function(){act('removerole',{roleId:rs.value})}}})]));
c.appendChild(el('p'));c.appendChild(row([el('button',{class:'dn',text:'طرد',on:{click:function(){if(confirm('تأكيد طرد '+x.name+' ؟'))act('kick',{confirm:true},'تم الطرد',true)}}}),el('button',{class:'dn',text:'حظر',on:{click:function(){if(confirm('تأكيد حظر '+x.name+' ؟'))act('ban',{confirm:true},'تم الحظر',true)}}})]));return c}
m.appendChild(card('بحث',row([q,el('button',{class:'btn',text:'بحث',on:{click:function(){if(q.value.trim())find(q.value.trim())}}})])));
m.appendChild(el('div',{class:'mut',text:'الآي دي يشتغل دايماً. البحث بالاسم يحتاج تفعيل MEMBERS_INTENT.',style:'margin-bottom:12px'}));m.appendChild(out);return Promise.resolve()};
function boot(){api('me').then(function(d){var r=$('root');
if(!d.enabled){r.appendChild(el('div',{class:'main'},[card('',el('div',{text:'اللوحة غير مفعلة: ناقص DISCORD_CLIENT_ID أو DISCORD_CLIENT_SECRET أو SESSION_SECRET في Render'}))]));return}
if(!d.user){r.appendChild(el('div',{class:'main'},[el('h1',{text:'لوحة دايڤل الملكية'}),el('div',{class:'mut',text:'سجّل دخولك بحساب ديسكورد (ارثر وإيدا فقط)'}),el('p'),el('a',{class:'btn',href:'/auth/login',text:'تسجيل الدخول بديسكورد'})]));return}
var sb=el('div',{class:'sb'},[el('div',{class:'logo',text:'دايڤل الملكية'})].concat(NAV.map(function(n){var b=el('button',{class:'nav',text:n[1],'data-p':n[0]});b.addEventListener('click',function(){show(n[0])});return b})).concat([el('a',{class:'nav',href:'/auth/logout',text:'خروج ('+d.user.name+')',style:'text-decoration:none'})]));
r.appendChild(el('div',{class:'app'},[sb,el('div',{class:'main',id:'main'})]));show('overview')}).catch(function(e){document.body.textContent=e.message})}
boot();
</script></body></html>`;

module.exports = function mountDashboard(app, express, client, CONFIG) {
    const enabled = !!(SECRET && CID && CSEC);
    const owners = new Set([CONFIG.ARTHUR_ID, CONFIG.SPECIAL_USER_ID]);
    const session = (req) => verify(cookies(req).dash);
    const redirectUri = BASE + '/auth/callback';

    app.get('/dashboard', (req, res) => res.type('html').send(PAGE));

    app.get('/auth/login', (req, res) => {
        if (!enabled) return res.status(503).send('اللوحة غير مفعلة');
        const state = crypto.randomBytes(16).toString('hex');
        setCookie(res, 'oauth_state', state, 600);
        res.redirect('https://discord.com/oauth2/authorize?' + new URLSearchParams({
            client_id: CID, response_type: 'code', scope: 'identify', redirect_uri: redirectUri, state
        }));
    });

    app.get('/auth/callback', async (req, res) => {
        try {
            if (!enabled) return res.status(503).send('اللوحة غير مفعلة');
            const { code, state } = req.query;
            if (!code || !state || state !== cookies(req).oauth_state) return res.status(400).send('طلب غير صالح، جرب مرة ثانية');
            const tr = await fetch('https://discord.com/api/oauth2/token', {
                method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ client_id: CID, client_secret: CSEC, grant_type: 'authorization_code', code: String(code), redirect_uri: redirectUri })
            });
            const tok = await tr.json();
            if (!tok.access_token) return res.status(400).send('فشل تسجيل الدخول (تأكد من Redirect URI في موقع المطورين)');
            const u = await (await fetch('https://discord.com/api/users/@me', { headers: { Authorization: 'Bearer ' + tok.access_token } })).json();
            if (!u.id || !owners.has(u.id)) return res.status(403).send('⛔ هذا الحساب غير مسموح له بدخول اللوحة');
            setCookie(res, 'dash', sign({ id: u.id, name: u.global_name || u.username, exp: Date.now() + WEEK }), WEEK / 1000);
            setCookie(res, 'oauth_state', '', 0);
            res.redirect('/dashboard');
        } catch (e) {
            console.error('❌ OAuth:', e.message);
            res.status(500).send('صار خطأ بتسجيل الدخول');
        }
    });

    app.get('/auth/logout', (req, res) => { setCookie(res, 'dash', '', 0); res.redirect('/dashboard'); });

    const api = express.Router();
    api.use(express.json({ limit: '100kb' }));
    api.get('/me', (req, res) => { const s = session(req); res.json({ enabled, user: s ? { id: s.id, name: s.name } : null }); });
    api.use((req, res, next) => {
        const s = enabled && session(req);
        if (!s) return res.status(401).json({ error: 'سجّل دخولك أول' });
        if (req.method !== 'GET' && req.get('x-dash') !== '1') return res.status(403).json({ error: 'طلب مرفوض' });
        req.user = s;
        next();
    });

    const note = (req, msg) => {
        const l = store.read('dashlog.json', []);
        l.unshift({ at: Date.now(), by: req.user.name, msg });
        store.write('dashlog.json', l.slice(0, 100));
    };
    const h = (fn) => async (req, res) => {
        try {
            const g = client.guilds.cache.get(CONFIG.GUILD_ID);
            if (!g) return res.status(503).json({ error: 'البوت مو متصل بالسيرفر' });
            res.json((await fn(g, req.body || {}, req)) || { ok: true });
        } catch (e) {
            const msg = e.code === 50013 ? 'البوت ما عنده صلاحية، ارفع رتبته أو أعطه الصلاحية' : String(e.message || 'خطأ').slice(0, 150);
            res.status(400).json({ error: msg });
        }
    };
    const chan = (g, id) => { const c = g.channels.cache.get(String(id)); if (!c) throw new Error('الروم مو موجود'); return c; };
    const role = (g, id) => { const r = g.roles.cache.get(String(id)); if (!r || r.id === g.id) throw new Error('الرتبة مو موجودة'); return r; };
    const isCat = (c) => c.type === ChannelType.GuildCategory;

    api.get('/overview', h(async (g) => ({ name: g.name, members: g.memberCount, channels: g.channels.cache.size, roles: g.roles.cache.size })));
    api.get('/log', h(async () => ({ log: store.read('dashlog.json', []) })));

    api.get('/channels', h(async (g) => {
        await g.channels.fetch();
        return {
            channels: [...g.channels.cache.values()].filter(c => !c.isThread())
                .sort((a, b) => a.rawPosition - b.rawPosition)
                .map(c => ({ id: c.id, name: c.name, parentId: c.parentId, type: isCat(c) ? 'category' : c.isVoiceBased() ? 'voice' : 'text' }))
        };
    }));
    api.post('/channels/create', h(async (g, b, req) => {
        const name = clean(b.name);
        const type = { text: ChannelType.GuildText, voice: ChannelType.GuildVoice, category: ChannelType.GuildCategory }[b.type];
        if (!name || type === undefined) throw new Error('البيانات ناقصة');
        const o = { name, type };
        if (b.parentId && type !== ChannelType.GuildCategory) { const p = chan(g, b.parentId); if (!isCat(p)) throw new Error('القسم غير صالح'); o.parent = p.id; }
        const c = await g.channels.create(o);
        note(req, `إنشاء ${b.type === 'category' ? 'قسم' : 'روم'}: ${c.name}`);
    }));
    api.post('/channels/edit', h(async (g, b, req) => {
        const c = chan(g, b.id);
        if (b.name !== undefined) { if (!clean(b.name)) throw new Error('الاسم فاضي'); await c.setName(clean(b.name)); note(req, `تغيير اسم روم إلى: ${clean(b.name)}`); }
        if (b.parentId !== undefined && !isCat(c)) {
            if (b.parentId && !isCat(chan(g, b.parentId))) throw new Error('القسم غير صالح');
            await c.setParent(b.parentId || null, { lockPermissions: false });
            note(req, `نقل الروم ${c.name}`);
        }
    }));
    api.post('/channels/delete', h(async (g, b, req) => {
        if (b.confirm !== true) throw new Error('يحتاج تأكيد');
        const c = chan(g, b.id);
        if (c.id === CONFIG.VOICE_CHANNEL_ID) throw new Error('هذا روم الفويس حق البوت، ما أحذفه');
        const n = c.name; await c.delete('من لوحة التحكم'); note(req, `حذف: ${n}`);
    }));

    api.get('/roles', h(async (g) => {
        await g.roles.fetch();
        return { roles: [...g.roles.cache.values()].filter(r => r.id !== g.id).sort((a, b) => b.position - a.position)
            .map(r => ({ id: r.id, name: r.name, color: r.hexColor === '#000000' ? '#99aab5' : r.hexColor, editable: r.editable && !r.managed })) };
    }));
    api.post('/roles/create', h(async (g, b, req) => {
        const name = clean(b.name); if (!name) throw new Error('الاسم فاضي');
        const r = await g.roles.create({ name, color: hex(b.color) || '#99aab5', reason: 'من لوحة التحكم' });
        note(req, `إنشاء رتبة: ${r.name}`);
    }));
    api.post('/roles/edit', h(async (g, b, req) => {
        const r = role(g, b.id); if (!r.editable || r.managed) throw new Error('ما أقدر أعدل هذي الرتبة');
        const o = {}; if (b.name !== undefined && clean(b.name)) o.name = clean(b.name); if (b.color && hex(b.color)) o.color = b.color;
        await r.edit({ ...o, reason: 'من لوحة التحكم' }); note(req, `تعديل رتبة: ${r.name}`);
    }));
    api.post('/roles/delete', h(async (g, b, req) => {
        if (b.confirm !== true) throw new Error('يحتاج تأكيد');
        const r = role(g, b.id);
        if (!r.editable || r.managed) throw new Error('ما أقدر أحذف هذي الرتبة');
        if (r.id === CONFIG.ROYAL_ROLE_ID) throw new Error('هذي الرتبة الملكية، محمية من الحذف');
        const n = r.name; await r.delete('من لوحة التحكم'); note(req, `حذف رتبة: ${n}`);
    }));

    api.post('/announce', h(async (g, b, req) => {
        const c = chan(g, b.channelId);
        if (!c.isTextBased() || c.isVoiceBased()) throw new Error('اختر روم نصي');
        const text = String(b.text || '').trim().slice(0, 1800); if (!text) throw new Error('النص فاضي');
        await c.send({ embeds: [new EmbedBuilder().setColor(0xd4af37).setTitle(clean(b.title) || '📢 إعلان ملكي').setDescription(text).setFooter({ text: `بأمر ${req.user.name}` }).setTimestamp()] });
        note(req, `إعلان في #${c.name}`);
    }));

    const mInfo = (m) => ({
        id: m.id, name: m.displayName, user: m.user.username, bot: m.user.bot, owner: owners.has(m.id),
        avatar: m.displayAvatarURL({ size: 64 }),
        timedOut: !!(m.communicationDisabledUntilTimestamp && m.communicationDisabledUntilTimestamp > Date.now()),
        roles: [...m.roles.cache.values()].filter(r => r.id !== m.guild.id).map(r => ({ id: r.id, name: r.name }))
    });
    const getMember = (g, id) => g.members.fetch(String(id)).catch(() => { throw new Error('ما لقيت العضو بالسيرفر'); });

    api.get('/members/search', h(async (g, b, req) => {
        const q = String(req.query.q || '').trim();
        const id = (q.match(/\d{17,20}/) || [])[0];
        if (id) return { members: [mInfo(await getMember(g, id))] };
        if (process.env.MEMBERS_INTENT !== '1') throw new Error('البحث بالاسم غير مفعل: ابحث بالآي دي، أو أضف MEMBERS_INTENT=1');
        if (q.length < 2) throw new Error('اكتب حرفين على الأقل');
        return { members: [...(await g.members.search({ query: q, limit: 10 })).values()].map(mInfo) };
    }));

    api.post('/members/action', h(async (g, b, req) => {
        const m = await getMember(g, b.id);
        if (owners.has(m.id)) throw new Error('ما أمس الملوك 👑');
        if (m.id === client.user.id) throw new Error('ما أسوي هذا بنفسي');
        const why = clean(b.reason) || 'من لوحة التحكم';
        const no = (t) => { throw new Error(t); };
        switch (b.action) {
            case 'kick':
                if (b.confirm !== true) no('يحتاج تأكيد'); if (!m.kickable) no('ما أقدر أطرده (رتبته أعلى مني أو ما عندي صلاحية)');
                await m.kick(why); note(req, `طرد: ${m.user.username}`); break;
            case 'ban':
                if (b.confirm !== true) no('يحتاج تأكيد'); if (!m.bannable) no('ما أقدر أحظره (رتبته أعلى مني أو ما عندي صلاحية)');
                await g.members.ban(m.id, { reason: why }); note(req, `حظر: ${m.user.username}`); break;
            case 'timeout': {
                const mins = Number(b.minutes);
                if (!Number.isInteger(mins) || mins < 1 || mins > 40320) no('المدة من 1 إلى 40320 دقيقة');
                if (!m.moderatable) no('ما أقدر أكتمه (رتبته أعلى مني أو ما عندي صلاحية)');
                await m.timeout(mins * 60_000, why); note(req, `كتم ${m.user.username} لمدة ${mins} دقيقة`); break;
            }
            case 'untimeout':
                if (!m.moderatable) no('ما أقدر أعدل عليه'); await m.timeout(null, why); note(req, `فك كتم: ${m.user.username}`); break;
            case 'nick':
                if (!m.manageable) no('ما أقدر أغير لقبه'); await m.setNickname(clean(b.nick) || null, why); note(req, `تغيير لقب: ${m.user.username}`); break;
            case 'addrole': case 'removerole': {
                const r = role(g, b.roleId);
                if (!r.editable || r.managed) no('ما أقدر أتحكم بهذي الرتبة');
                if (b.action === 'addrole') await m.roles.add(r, why); else await m.roles.remove(r, why);
                note(req, `${b.action === 'addrole' ? 'إعطاء' : 'سحب'} رتبة ${r.name}: ${m.user.username}`); break;
            }
            default: no('إجراء غير معروف');
        }
    }));

    const target = async (g, id) => {
        const m = await g.members.fetch(String(id)).catch(() => null);
        if (!m) throw new Error('العضو مو موجود');
        if (owners.has(m.id)) throw new Error('ما أمس الملوك 👑');
        if (m.id === client.user.id) throw new Error('ما أقدر أسوي هذا بنفسي');
        return m;
    };
    api.get('/members', h(async (g, b, req) => {
        const list = await g.members.fetch({ query: String(req.query.q || '').slice(0, 32), limit: 25 })
            .catch(() => { throw new Error('فعّل Server Members Intent من موقع المطورين ثم أعد تشغيل البوت'); });
        return { members: [...list.values()].map(m => ({
            id: m.id, name: m.displayName, bot: m.user.bot, avatar: m.displayAvatarURL({ size: 64 }),
            roles: m.roles.cache.filter(r => r.id !== g.id).map(r => r.name).slice(0, 4)
        })) };
    }));
    api.post('/members/kick', h(async (g, b, req) => {
        if (b.confirm !== true) throw new Error('يحتاج تأكيد');
        const m = await target(g, b.id); if (!m.kickable) throw new Error('رتبة البوت أقل من العضو');
        await m.kick('من لوحة التحكم'); note(req, `طرد: ${m.user.username}`);
    }));
    api.post('/members/ban', h(async (g, b, req) => {
        if (b.confirm !== true) throw new Error('يحتاج تأكيد');
        const m = await target(g, b.id); if (!m.bannable) throw new Error('رتبة البوت أقل من العضو');
        await m.ban({ reason: 'من لوحة التحكم' }); note(req, `حظر: ${m.user.username}`);
    }));
    api.post('/members/timeout', h(async (g, b, req) => {
        const mins = Math.floor(Number(b.minutes));
        if (!(mins >= 0 && mins <= 40320)) throw new Error('المدة من 0 إلى 40320 دقيقة');
        const m = await target(g, b.id); if (!m.moderatable) throw new Error('ما أقدر أكتم هذا العضو');
        await m.timeout(mins ? mins * 60_000 : null, 'من لوحة التحكم');
        note(req, mins ? `ميوت ${mins} دقيقة: ${m.user.username}` : `فك ميوت: ${m.user.username}`);
    }));

    api.get('/welcome', h(async (g) => {
        await g.channels.fetch(); await g.roles.fetch();
        return {
            config: welcome.get(g.id),
            channels: [...g.channels.cache.values()].filter(c => c.type === ChannelType.GuildText).map(c => ({ id: c.id, name: c.name })),
            roles: [...g.roles.cache.values()].filter(r => r.id !== g.id && !r.managed && r.editable)
                .sort((a, b) => b.position - a.position).map(r => ({ id: r.id, name: r.name }))
        };
    }));
    api.post('/welcome/save', h(async (g, b, req) => { welcome.set(g.id, b); note(req, 'تعديل إعدادات الترحيب'); }));
    api.post('/welcome/test', h(async (g, b, req) => {
        const cfg = welcome.get(g.id);
        if (!cfg.channelId) throw new Error('اختر روم الترحيب واحفظ أول');
        const c = chan(g, cfg.channelId);
        await c.send(welcome.build(cfg, { id: req.user.id, mention: `<@${req.user.id}>`, name: req.user.name, server: g.name, count: g.memberCount }));
        note(req, 'تجربة رسالة الترحيب');
    }));

    api.get('/tickets', h(async (g) => {
        await g.channels.fetch(); await g.roles.fetch();
        const ch = [...g.channels.cache.values()];
        return {
            config: tickets.get(g.id), open: tickets.openCount(g.id),
            categories: ch.filter(c => isCat(c)).map(c => ({ id: c.id, name: c.name })),
            channels: ch.filter(c => c.type === ChannelType.GuildText).map(c => ({ id: c.id, name: '# ' + c.name })),
            roles: [...g.roles.cache.values()].filter(r => r.id !== g.id && !r.managed).sort((a, b) => b.position - a.position).map(r => ({ id: r.id, name: r.name }))
        };
    }));
    api.post('/tickets/save', h(async (g, b, req) => { tickets.set(g.id, b); note(req, 'تعديل إعدادات التذاكر'); }));
    api.post('/tickets/panel', h(async (g, b, req) => {
        const c = chan(g, b.channelId);
        if (c.type !== ChannelType.GuildText) throw new Error('اختر روم نصي');
        await c.send(tickets.panelMessage(tickets.get(g.id)));
        note(req, `إرسال لوحة التذاكر في #${c.name}`);
    }));

    app.use('/dashboard/api', api);
};
