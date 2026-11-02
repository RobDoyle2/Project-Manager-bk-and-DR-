const { chromium } = require('playwright'); const fs=require('fs');
let f=0,pz=0;const ok=(c,m)=>{c?pz++:f++;console.log(c?'  PASS':'  FAIL',m)};
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file:///home/claude/out/Backup-DR-Project.html');await p.waitForSelector('#view .page-head');
const data=()=>p.evaluate(()=>JSON.parse(JSON.stringify(window.BackupDR.getData())));
const go=async v=>{await p.evaluate(v=>{location.hash='#'+v},v);await p.waitForTimeout(150)};
const save=async()=>{await p.click('#modal [data-modal-save]');await p.waitForTimeout(150)};
// objective with two links
await go('objectives');await p.click('.page-head [data-action=obj-new]');await p.fill('#modal [name=name]','Obj with links');
await p.click('#modal [data-action=link-row-add]');await p.fill('#modal [name=lName]','Design doc');await p.fill('#modal [name=lUrl]','https://example.com/design');
await p.click('#modal [data-action=link-row-add]');const rows=await p.$$('#modal .link-row');await (await rows[1].$('[name=lName]')).fill('Wiki');await (await rows[1].$('[name=lUrl]')).fill('www.contoso.com/wiki');
const side=await p.evaluate(()=>{const r=document.querySelector('#modal .link-row'),a=r.querySelector('[name=lName]').getBoundingClientRect(),c=r.querySelector('[name=lUrl]').getBoundingClientRect();return Math.abs(a.top-c.top)<2&&c.left>a.right-1});
ok(side,'friendly name and link sit side by side');
await save();let d=await data();ok(JSON.stringify(d.objectives[0].links)===JSON.stringify([{name:'Design doc',url:'https://example.com/design'},{name:'Wiki',url:'https://www.contoso.com/wiki'}]),'objective links stored (www. address gets https://): '+JSON.stringify(d.objectives[0].links));
const href=await p.$eval('.obj-card a.lnk',e=>[e.href,e.target,e.rel,e.innerText.trim()]);ok(href[0]==='https://example.com/design'&&href[1]==='_blank'&&/noopener/.test(href[2])&&href[3]==='Design doc','objective card shows clickable friendly-name chip opening in a new tab');
// validation
await p.click('.obj-card [data-action=obj-edit]');await p.click('#modal [data-action=link-row-add]');const rs=await p.$$('#modal .link-row');await (await rs[2].$('[name=lName]')).fill('No url');await save();
ok(/needs a web address/.test(await p.innerText('#formError')),'name without a link is rejected with a clear message');
await (await rs[2].$('[name=lUrl]')).fill('javascript:alert(1)');await save();ok(/not allowed/.test(await p.innerText('#formError')),'javascript: links are blocked');
await (await rs[2].$('[name=lUrl]')).fill('\\\\fileserver\\dr\\runbook.docx');await (await rs[2].$('[name=lName]')).fill('Runbook (file share)');await save();
d=await data();ok(d.objectives[0].links.length===3&&d.objectives[0].links[2].url==='\\\\fileserver\\dr\\runbook.docx','UNC file-share path accepted as-is');
ok((await p.$$eval('.obj-card .lnk',e=>e.length))===3&&(await p.$$eval('.obj-card button.lnk.plain',e=>e.length))===1,'non-web path shown as a copy button, not a broken link');
// task + subtask
await go('tasks');await p.click('.page-head [data-action=task-new]');await p.fill('#modal [name=name]','Task A');await p.click('#modal [data-action=link-row-add]');await p.fill('#modal [name=lUrl]','https://tickets.example.com/T-1');await save();
d=await data();const t=d.objectives.flatMap(o=>o.tasks).find(x=>x.name==='Task A');ok(t.links.length===1&&t.links[0].name==='tickets.example.com','blank friendly name falls back to the site name: '+JSON.stringify(t.links));
ok((await p.$$eval('.t-row a.lnk',e=>e.length))===1,'link chip shown on the task row');
await p.click('[data-action=sub-new]');await p.fill('#modal [name=name]','Sub A');await p.click('#modal [data-action=link-row-add]');await p.fill('#modal [name=lName]','Checklist');await p.fill('#modal [name=lUrl]','https://example.com/c');await save();
d=await data();ok(d.objectives.flatMap(o=>o.tasks).flatMap(x=>x.subtasks)[0].links[0].name==='Checklist','subtask link stored');
// remove a link and edit
await p.click('.icon-btn[data-action=task-edit] >> nth=0');await p.click('#modal [data-action=link-row-del]');await save();d=await data();ok(d.objectives.flatMap(o=>o.tasks).find(x=>x.name==='Task A').links.length===0,'link removed');
// export / import round trip + malicious import
const [dl]=await Promise.all([p.waitForEvent('download'),p.click('.topbar [data-action=export-json]')]);await dl.saveAs('/tmp/links.json');const ej=JSON.parse(fs.readFileSync('/tmp/links.json','utf8'));
ok(ej.objectives[0].links.length===3,'links included in the exported JSON');
ej.objectives[0].links.push({name:'evil',url:'javascript:alert(1)'},{name:'empty'});fs.writeFileSync('/tmp/links2.json',JSON.stringify(ej));
await go('reports');await p.setInputFiles('#fileInput','/tmp/links2.json');await p.waitForSelector('#confirm[open]');const msg=await p.innerText('#confirm');await p.click('#confirm [data-confirm=ok]');await p.waitForTimeout(250);
d=await data();ok(d.objectives[0].links.length===3&&/disallowed|without a web address/.test(msg),'import drops dangerous / empty links with a warning, keeps the good ones');
await go('objectives');await p.screenshot({path:'shots/links-obj.png'});
await go('tasks');await p.screenshot({path:'shots/links-tasks.png'});
ok(errs.length===0,'no JS errors '+JSON.stringify(errs));console.log(`RESULT ${pz} passed, ${f} failed`);await b.close();process.exit(f?1:0);})().catch(e=>{console.error('CRASH',e);process.exit(2)});
