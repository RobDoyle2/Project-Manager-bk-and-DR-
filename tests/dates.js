const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1300,height:900}});
await p.goto('file:///home/claude/out/Backup-DR-Project.html');await p.waitForSelector('#view .page-head');
const today=await p.evaluate(()=>window.BackupDR.today());
await p.click('.head-actions [data-action=obj-new]');
console.log('objective defaults', await p.$eval('#modal [name=startDate]',e=>e.value), await p.$eval('#modal [name=endDate]',e=>e.value),'today',today);
await p.fill('#modal [name=startDate]','2026-12-01');
console.log('end follows start ->', await p.$eval('#modal [name=endDate]',e=>e.value));
await p.fill('#modal [name=endDate]','2026-12-20'); await p.fill('#modal [name=startDate]','2026-12-05');
console.log('end kept when later ->', await p.$eval('#modal [name=endDate]',e=>e.value));
await p.click('#modal [data-modal-close] >> nth=1');
await p.click('.head-actions [data-action=task-new]');
console.log('task defaults', await p.$eval('#modal [name=startDate]',e=>e.value), await p.$eval('#modal [name=endDate]',e=>e.value));
await p.click('#modal [data-modal-close] >> nth=1');
await p.click('.head-actions [data-action=tasks-bulk]');
console.log('bulk defaults', await p.$eval('#modal [name=startDate]',e=>e.value), await p.$eval('#modal [name=endDate]',e=>e.value));
await p.click('#modal [data-modal-close] >> nth=1');
// phone: burger -> every page
await p.setViewportSize({width:390,height:844});
await p.evaluate(()=>{location.hash='#dashboard'});
for (const v of ['objectives','tasks','roadmap','risks','dependencies','milestones','reports','dashboard']){
  await p.click('.hamb'); await p.click(`#nav a[data-nav=${v}]`); await p.waitForTimeout(120);
  const t=await p.innerText('#pageTitle'); const open=await p.$eval('#sidebar',e=>e.classList.contains('open'));
  console.log(v,'->',t,open?'(menu still open!)':'');
}
await b.close();})();
