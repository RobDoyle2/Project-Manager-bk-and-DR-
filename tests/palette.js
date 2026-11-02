const { chromium } = require('playwright'); const fs=require('fs');
const URL='file:///home/claude/out/Backup-DR-Project.html';
let f=0,pz=0; const ok=(c,m)=>{c?pz++:f++;console.log(c?'  PASS':'  FAIL',m)};
const rgb=h=>{const n=parseInt(h.slice(1),16);return `rgb(${n>>16}, ${(n>>8)&255}, ${n&255})`};
const P=[['#006B5B','#C0DDD6'],['#315DA8','#C6D3E9'],['#65449A','#D3C7E5'],['#C45B32','#EED0C1'],['#147E91','#C0DDE1'],['#A17A20','#E8DDBB'],['#526B82','#C9D4DC'],['#963E60','#E6C6D2']];
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1500,height:950}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(URL);await p.waitForSelector('#view .page-head');
const data=()=>p.evaluate(()=>JSON.parse(JSON.stringify(window.BackupDR.getData())));
const go=async v=>{await p.evaluate(v=>{location.hash='#'+v},v);await p.waitForTimeout(150)};
// 10 objectives, each with 1 task + 2 subtasks, created through the UI (bulk for tasks)
for(let k=1;k<=10;k++){await go('objectives');await p.click('.page-head [data-action=obj-new]');await p.fill('#modal [name=name]','Objective '+k);await p.fill('#modal [name=startDate]','2026-10-05');await p.fill('#modal [name=endDate]','2027-05-28');await p.click('#modal [data-modal-save]');await p.waitForTimeout(80);}
let d=await data(); ok(d.objectives.map(o=>o.colorIndex).join()==='0,1,2,3,4,5,6,7,8,9','new objectives get colour slots 0..9 in order: '+d.objectives.map(o=>o.colorIndex).join());
await go('tasks');
for(let k=1;k<=10;k++){await p.click('.page-head [data-action=tasks-bulk]');await p.selectOption('#modal [name=parent]','OBJ-'+String(k).padStart(3,'0'));await p.fill('#modal [name=names]','Task '+k+'\n  Sub '+k+'a\n  Sub '+k+'b');await p.click('#modal [data-modal-save]');await p.waitForTimeout(80);}
await go('roadmap');
for (const mode of ['management','technical']){
  if(mode==='technical'){await p.click('[data-action=rm-mode][data-mode=technical]');await p.waitForTimeout(150);}
  const r=await p.evaluate(()=>({o:[...document.querySelectorAll('.bar.oc-o')].map(e=>getComputedStyle(e).backgroundColor),
     t:[...document.querySelectorAll('.bar.oc-t')].map(e=>getComputedStyle(e).backgroundColor),
     txt:[...document.querySelectorAll('.bar.oc-o .bar-txt')].map(e=>getComputedStyle(e).color)}));
  ok(P.every((c,i)=>r.o[i]===rgb(c[0])),`${mode}: objectives 1-8 use exact primary hex colours`);
  if(mode==='technical'){
   ok(P.every((c,i)=>r.t.slice(i*3,i*3+3).every(x=>x===rgb(c[1]))),'technical: every task and subtask uses its objective\'s exact lighter hex (same shade for all)');
   ok(new Set(r.o).size===10,'10 objectives -> 10 distinct colours (palette extended beyond 8)');
   ok(r.txt.every(c=>c==='rgb(255, 255, 255)'),'objective bar text is white');
   const lab=await p.evaluate(()=>[...document.querySelectorAll('.g-row.t-r.lvl-0 .g-lab')].slice(0,2).map(e=>[getComputedStyle(e).backgroundColor,getComputedStyle(e.querySelector('b')).color,getComputedStyle(e.querySelector('b')).fontWeight,getComputedStyle(e).boxShadow]));
   ok(lab[0][0]!==rgb(P[0][0])&&lab[0][1]!=='rgb(255, 255, 255)'&&+lab[0][2]>=700&&lab[0][3].includes(rgb(P[0][0])),'objective label is NOT filled: dark bold name with a coloured stripe');
   const sub=await p.evaluate(()=>getComputedStyle(document.querySelector('.bar.oc-t .bar-txt')).color);ok(sub==='rgb(31, 41, 55)','task/subtask text is dark charcoal');
  }
  await p.screenshot({path:`shots/pal-${mode}.png`,fullPage:true});
}
// deletion must not recolour others; new objective takes the freed slot
await go('objectives');await p.click('[data-action=obj-del][data-id=OBJ-003]');await p.click('#confirm [data-confirm=ok]');await p.waitForTimeout(150);
d=await data();ok(d.objectives.map(o=>o.colorIndex).join()==='0,1,3,4,5,6,7,8,9','deleting OBJ-003 leaves every other colour unchanged');
await p.click('.page-head [data-action=obj-new]');await p.fill('#modal [name=name]','Replacement');await p.click('#modal [data-modal-save]');await p.waitForTimeout(100);
d=await data();ok(d.objectives.at(-1).colorIndex===2,'new objective takes the freed slot ('+d.objectives.at(-1).colorIndex+', not similar to its neighbour)');
// export/import keeps colours
const [dl]=await Promise.all([p.waitForEvent('download'),p.click('.topbar [data-action=export-json]')]);await dl.saveAs('/tmp/pal.json');
const ej=JSON.parse(fs.readFileSync('/tmp/pal.json','utf8'));ok(ej.objectives.every(o=>Number.isInteger(o.colorIndex)),'colour assignment is stored in the JSON');
// reorder in JSON then import: colours stay with objectives
ej.objectives.reverse();fs.writeFileSync('/tmp/pal2.json',JSON.stringify(ej));
await go('reports');await p.setInputFiles('#fileInput','/tmp/pal2.json');await p.waitForSelector('#confirm[open]');await p.click('#confirm [data-confirm=ok]');await p.waitForTimeout(250);
d=await data();ok(d.objectives.map(o=>o.name+':'+o.colorIndex).join()===ej.objectives.map(o=>o.name+':'+o.colorIndex).join(),'reordered objectives keep their own colours after import');
// older data with no colorIndex gets assigned automatically
const old=JSON.parse(fs.readFileSync('/tmp/rich.json','utf8'));fs.writeFileSync('/tmp/old.json',JSON.stringify(old));
await p.setInputFiles('#fileInput','/tmp/old.json');await p.waitForSelector('#confirm[open]');await p.click('#confirm [data-confirm=ok]');await p.waitForTimeout(250);
d=await data();ok(d.objectives.filter(o=>!o.system).map(o=>o.colorIndex).join()==='0,1,2,3,4','existing project without colours is assigned 0..4 automatically');
// task moved to another objective takes its colour
await go('tasks');await p.click('.icon-btn[data-action=task-edit][data-id=TSK-012]');await p.selectOption('#modal [name=parent]','OBJ-001');await p.click('#modal [data-modal-save]');await p.waitForTimeout(150);
const rowc=await p.evaluate(()=>getComputedStyle(document.querySelector('.t-row:has([data-id="TSK-012"])')).borderLeftColor);ok(rowc===rgb(P[0][1]),'moved task row now shows its new objective\'s lighter colour');
await go('dashboard');await p.screenshot({path:'shots/pal-dash.png',fullPage:true});
await go('tasks');await p.screenshot({path:'shots/pal-tasks.png'});
await go('objectives');await p.screenshot({path:'shots/pal-obj.png'});
ok(errs.length===0,'no JS errors '+JSON.stringify(errs));
console.log(`RESULT ${pz} passed, ${f} failed`);await b.close();process.exit(f?1:0);})().catch(e=>{console.error('CRASH',e);process.exit(2)});
