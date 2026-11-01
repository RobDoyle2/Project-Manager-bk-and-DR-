const { chromium } = require('playwright');
(async()=>{
 const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1300,height:900}});
 fs=require('fs'); fs.writeFileSync('/home/claude/out/_host.html','<iframe id=f src="Backup-DR-Project.html" sandbox="allow-scripts allow-same-origin allow-popups" style="width:1280px;height:880px;border:0"></iframe>');
 await p.goto('file:///home/claude/out/_host.html'); const fr=p.frameLocator('#f');
 await fr.locator('#view .page-head').waitFor();
 await fr.locator('.onboard [data-action=obj-new]').click(); await fr.locator('#modal [name=name]').fill('X');
 await fr.locator('#modal button[type=submit], #modal [data-modal-save]').click(); await p.waitForTimeout(400);
 const n=await p.frames()[1].evaluate(()=>window.BackupDR.getData().objectives.length);
 console.log('objectives created in sandboxed iframe (no allow-forms):',n);
 await b.close(); fs.unlinkSync('/home/claude/out/_host.html');
})();
