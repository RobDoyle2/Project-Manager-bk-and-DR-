const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{
 const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1300,height:900}});
 fs.writeFileSync('/home/claude/out/_host.html','<iframe id=f src="Backup-DR-Project.html" sandbox="allow-scripts allow-same-origin" style="width:1280px;height:880px;border:0"></iframe>');
 await p.goto('file:///home/claude/out/_host.html'); const fr=p.frameLocator('#f'); const F=()=>p.frames()[1];
 await fr.locator('#view .page-head').waitFor();
 const click=async s=>{await fr.locator(s).first().click();await p.waitForTimeout(200)};
 await click('.head-actions [data-action=obj-new]'); await fr.locator('#modal [name=name]').fill('Obj'); await fr.locator('#modal [name=name]').press('Enter'); await p.waitForTimeout(200);
 await click('.head-actions [data-action=task-new]'); await fr.locator('#modal [name=name]').fill('Task'); await click('#modal [data-modal-save]');
 await click('.head-actions [data-action=tasks-bulk]'); await fr.locator('#modal [name=names]').fill('a\nb'); await click('#modal [data-modal-save]');
 await F().evaluate(()=>{location.hash='#objectives'}); await p.waitForTimeout(200); await click('[data-action=obj-del]'); await click('#confirm [data-confirm=ok]');
 const d=await F().evaluate(()=>{const x=window.BackupDR.getData();return x.objectives.map(o=>o.id+':'+o.tasks.length)});
 console.log('after obj via Enter, task, bulk(2), then delete obj in sandbox:',JSON.stringify(d));
 await b.close(); fs.unlinkSync('/home/claude/out/_host.html');
})();
