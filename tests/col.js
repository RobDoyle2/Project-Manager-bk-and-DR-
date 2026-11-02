const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file:///home/claude/out/Backup-DR-Project.html');await p.waitForSelector('#view .page-head');
await p.setInputFiles('#fileInput','/tmp/rich.json');await p.waitForSelector('#confirm[open]');await p.click('#confirm [data-confirm=ok]');await p.waitForTimeout(300);
await p.evaluate(()=>{location.hash='#roadmap'});await p.waitForTimeout(150);
await p.click('[data-action=rm-mode][data-mode=technical]');await p.waitForTimeout(200);await p.screenshot({path:'shots/col-tech.png',fullPage:true});
await p.click('[data-action=rm-mode][data-mode=management]');await p.selectOption('[data-f=rmMgmtColor]','objective');await p.waitForTimeout(200);await p.screenshot({path:'shots/col-mgmt.png'});
console.log('errors',errs);await b.close();})();
