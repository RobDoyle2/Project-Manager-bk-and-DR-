const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});
await p.goto('file:///home/claude/out/Backup-DR-Project.html');await p.waitForSelector('#view .page-head');
await p.screenshot({path:'shots/th-empty.png'});
await p.setInputFiles('#fileInput','/tmp/rich.json');await p.waitForSelector('#confirm[open]');await p.screenshot({path:'shots/th-confirm.png'});await p.click('#confirm [data-confirm=ok]');await p.waitForTimeout(300);
for(const v of ['dashboard','objectives','tasks','risks','dependencies','milestones','reports']){await p.evaluate(v=>{location.hash='#'+v},v);await p.waitForTimeout(200);await p.screenshot({path:`shots/th-${v}.png`,fullPage:v==='dashboard'});}
await p.evaluate(()=>{location.hash='#tasks'});await p.waitForTimeout(150);await p.click('.page-head [data-action=task-new]');await p.waitForTimeout(200);await p.screenshot({path:'shots/th-modal.png'});
await b.close();})();
