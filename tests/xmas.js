const { chromium } = require('playwright');
let f=0,pz=0;const ok=(c,m)=>{c?pz++:f++;console.log(c?'  PASS':'  FAIL',m)};
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file:///home/claude/out/Backup-DR-Project.html');await p.waitForSelector('#view .page-head');
await p.setInputFiles('#fileInput','/tmp/rich.json');await p.waitForSelector('#confirm[open]');await p.click('#confirm [data-confirm=ok]');await p.waitForTimeout(300);
const geom=async sel=>p.evaluate(sel=>{const x=document.querySelector(sel+' .g-xmas'),g=document.querySelector(sel+' .g-grid');if(!x)return null;const a=x.getBoundingClientRect(),c=g.getBoundingClientRect();return{l:(a.left-c.left)/c.width*100,w:a.width/c.width*100,n:document.querySelectorAll(sel+' .g-xmas').length,txt:x.innerText}},sel);
const exp={l:(dayNum=>dayNum)(0)};
// expected: Dec 24 2026 .. Jan 2 2027 inclusive over 1 Oct 2026 .. 30 Jun 2027 (273 days)
const D=(y,m,d)=>Date.UTC(y,m-1,d)/86400000, start=D(2026,10,1), total=D(2027,6,30)-start+1;
const eL=(D(2026,12,24)-start)/total*100, eW=(D(2027,1,2)-D(2026,12,24)+1)/total*100;
await p.evaluate(()=>{location.hash='#roadmap'});await p.waitForTimeout(200);
let g=await geom('.gantt-mgmt');ok(g&&Math.abs(g.l-eL)<0.15&&Math.abs(g.w-eW)<0.15,`management roadmap band 24 Dec–2 Jan inclusive (left ${g&&g.l.toFixed(2)}% want ${eL.toFixed(2)}, width ${g&&g.w.toFixed(2)}% want ${eW.toFixed(2)} = 10 days)`);
ok(g&&/Christmas break/i.test(g.txt),'band is labelled');
const col=await p.evaluate(()=>getComputedStyle(document.querySelector('.g-xmas')).backgroundColor);ok(/rgba\(148, 158, 152/.test(col),'light grey: '+col);
await p.screenshot({path:'shots/xm-mgmt.png'});
await p.click('[data-action=rm-mode][data-mode=technical]');await p.waitForTimeout(200);
g=await geom('.gantt-tech');ok(g&&Math.abs(g.l-eL)<0.15&&Math.abs(g.w-eW)<0.15,'technical roadmap band identical');await p.screenshot({path:'shots/xm-tech.png'});
await p.evaluate(()=>{location.hash='#dashboard'});await p.waitForTimeout(200);
g=await geom('.gantt.compact');ok(g&&Math.abs(g.l-eL)<0.15&&Math.abs(g.w-eW)<0.15,'dashboard preview band identical');
await p.screenshot({path:'shots/xm-dash.png',fullPage:true});
// print version
await p.evaluate(()=>window.BackupDR.preparePrint('roadmap','management'));g=await geom('#printArea');ok(!!g,'print version includes the band');await p.evaluate(()=>window.BackupDR.endPrint());
// two-year timeline gets two bands
await p.evaluate(()=>{location.hash='#reports'});await p.waitForTimeout(150);
await p.fill('[name=pstart]','2026-10-01');await p.fill('[name=pend]','2028-02-29');await p.click('[data-action=save-settings]');await p.waitForTimeout(150);
await p.evaluate(()=>{location.hash='#roadmap'});await p.waitForTimeout(200);await p.click('[data-action=rm-mode][data-mode=management]');
g=await geom('.gantt-mgmt');ok(g&&g.n===2,'a timeline spanning two Decembers shows two bands ('+(g&&g.n)+')');
ok(errs.length===0,'no JS errors');console.log(`RESULT ${pz} passed, ${f} failed`);await b.close();process.exit(f?1:0);})();
