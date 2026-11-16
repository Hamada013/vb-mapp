'use strict';
// Writes docs/SOUND-SCRIPT.pdf: a printable recording sheet for the touch-game prompts.
// Uses Chrome through Playwright (dev dependency) so Arabic is shaped correctly. Run: npm run build:sounds:pdf
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {chromium}=require(process.env.VBMAPP_PLAYWRIGHT||'playwright');
const root=path.resolve(__dirname,'..'),context={};context.window=context;vm.createContext(context);
for(const f of ['stimulus-data','examples-data','games-data'])vm.runInContext(fs.readFileSync(path.join(root,`assets/${f}.js`),'utf8'),context);
const G=context.VB_GAMES,esc=v=>String(v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
const sections=[[1,99,'تعليمات عامة','Instructions'],[100,199,'المستمع: «وين ال…؟»','Listener'],[200,229,'تكملة الجمل (LRFFC) — مسودة، راجعها قبل التسجيل','LRFFC fill-ins (draft)'],[230,259,'أسئلة (LRFFC) — مسودة، راجعها قبل التسجيل','LRFFC questions (draft)'],[260,269,'الأصوات','Sounds'],[270,279,'أكل وشرب','Food and drink'],[280,299,'الألوان والأشكال','Colours and shapes'],[300,329,'الحروف الإنجليزية الكبيرة (للواجهة الإنجليزية؛ قل اسم الحرف بالإنجليزية)','Uppercase letters'],[330,339,'الأرقام','Numbers'],[340,349,'العد','Counting out'],[350,369,'المقارنات','Comparisons'],[370,389,'تعليمات الظروف (ينفّذها الطفل)','Adverb instructions'],[390,399,'أسئلة البطاقات ولوحة الطلب','Card and board questions'],[400,499,'المستمع 2-7: صور إضافية','Listener 2-7 extra pictures'],[500,529,'الحروف العربية (للواجهة العربية)','Arabic letters']];
const draft=n=>n>=200&&n<260;
const rows=list=>list.map(c=>`<div class="row${draft(c.n)?' draft':''}"><div class="num">${String(c.n).padStart(3,'0')}</div><div class="line">${esc(c.ar)}</div><div class="side"><span class="file">${String(c.n).padStart(3,'0')}.mp3</span><span class="box"></span></div></div>`).join('');
const body=sections.map(([a,b,ar,en])=>{const list=G.clips.filter(c=>c.n>=a&&c.n<=b);return list.length?`<section><h2><span>${esc(ar)}</span><small>${a}–${b} · ${list.length}</small></h2>${rows(list)}</section>`:'';}).join('');
const html=`<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><style>
@page{size:A4;margin:14mm 13mm 16mm}
body{margin:0;font-family:"SF Arabic","Geeza Pro","Noto Naskh Arabic","Arial",sans-serif;color:#14303c}
.cover{page-break-after:always;padding-top:20mm}
.cover h1{font-size:30pt;margin:0 0 4mm;color:#246b86}
.cover .sub{font-size:13pt;color:#4a6572;margin:0 0 10mm}
.cover ol{font-size:13.5pt;line-height:1.9;padding-inline-start:7mm;margin:0}
.cover .stat{display:flex;gap:6mm;margin:10mm 0}
.cover .stat div{flex:1;border:1px solid #cfe0e8;border-radius:4mm;padding:4mm;text-align:center;font-size:11pt;color:#4a6572}
.cover .stat b{display:block;font-size:22pt;color:#14303c}
.legend{display:flex;gap:4mm;align-items:center;font-size:11pt;color:#4a6572;margin-top:8mm}
.legend .box{display:inline-block}
h2{display:flex;justify-content:space-between;align-items:baseline;font-size:15pt;margin:7mm 0 3mm;padding:2mm 4mm;background:#eef6f8;border-radius:2.5mm;break-after:avoid}
h2 small{font-size:10pt;color:#4a6572;direction:ltr}
.row{display:flex;align-items:center;gap:4mm;padding:2.6mm 1mm;border-bottom:.3mm solid #e3ebf0;break-inside:avoid}
.num{flex:none;width:15mm;height:11mm;display:grid;place-items:center;border-radius:2.5mm;background:#246b86;color:#fff;font:700 14pt/1 "SF Mono","Menlo",monospace;direction:ltr}
.line{flex:1;font-size:21pt;font-weight:600;line-height:1.35}
.side{flex:none;display:flex;flex-direction:column;align-items:center;gap:1.5mm}
.file{font:9.5pt "SF Mono","Menlo",monospace;color:#7a8e9b;direction:ltr}
.box{width:7mm;height:7mm;border:.5mm solid #246b86;border-radius:1.5mm}
.draft .num{background:#b7791f}
.draft .line::after{content:"مسودة";font-size:9pt;font-weight:600;color:#b7791f;border:.3mm solid #b7791f;border-radius:1.5mm;padding:.3mm 1.5mm;margin-inline-start:3mm;vertical-align:middle}
</style><body>
<div class="cover"><h1>نص التسجيلات الصوتية</h1><p class="sub">ألعاب اللمس في تقييم VB-MAPP · ${G.clips.length} جملة مرقّمة</p>
<div class="stat"><div><b>${G.clips.length}</b>جملة</div><div><b>${G.clips.filter(c=>draft(c.n)).length}</b>مسودة للمراجعة</div><div><b dir="ltr">audio/</b>مكان الملفات</div></div>
<ol><li>سجّل كل سطر بصوتك، جملة قصيرة وواضحة في غرفة هادئة.</li><li>احفظ التسجيل باسم الرقم المكتوب بجانبه، مثل <b dir="ltr">101.mp3</b>.</li><li>ضع الملفات في مجلد <b dir="ltr">audio</b> داخل مستودع التقييم، ثم شغّل <b dir="ltr">npm run build</b> ليعمل بدون إنترنت.</li><li>اترك أقل من ربع ثانية صمت في أول وآخر كل تسجيل.</li><li>الأسطر البرتقالية مسودات صياغة: راجعها أو عدّلها قبل التسجيل.</li><li>ضع علامة في المربع بعد تسجيل كل سطر.</li></ol>
<div class="legend"><span class="box"></span> تمّ التسجيل</div></div>
${body}</body></html>`;
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.VBMAPP_ENGINE==='webkit'?{}:{channel:'chrome'})}),page=await browser.newPage();
 await page.setContent(html,{waitUntil:'load'});
 await page.pdf({path:path.join(root,'docs/SOUND-SCRIPT.pdf'),format:'A4',printBackground:true,preferCSSPageSize:true,displayHeaderFooter:true,headerTemplate:'<span></span>',footerTemplate:'<div style="width:100%;font-size:8pt;color:#7a8e9b;text-align:center;font-family:Menlo,monospace"><span class="pageNumber"></span> / <span class="totalPages"></span></div>'});
 await browser.close();console.log('Sound script PDF → docs/SOUND-SCRIPT.pdf');
})().catch(e=>{console.error(e);process.exitCode=1;});
