const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto('file:///home/claude/out/Backup-DR-Project.html'); await p.waitForSelector('#view .page-head');
  await p.setInputFiles('#fileInput', '/tmp/rich.json'); await p.waitForSelector('#confirm[open]'); await p.click('#confirm button[value=ok]'); await p.waitForTimeout(300);
  for (const [k, m, f, land] of [['roadmap','management','print-mgmt',true],['roadmap','technical','print-tech',true],['report',undefined,'print-report',false]]) {
    await p.evaluate(([k,m]) => window.BackupDR.preparePrint(k,m), [k,m]);
    await p.emulateMedia({ media: 'print' });
    await p.pdf({ path: `/tmp/${f}.pdf`, preferCSSPageSize: true, printBackground: true });
    await p.emulateMedia({ media: 'screen' });
    await p.evaluate(() => window.BackupDR.endPrint());
  }
  await b.close();
})();
