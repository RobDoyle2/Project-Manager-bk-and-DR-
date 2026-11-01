const { chromium } = require('playwright');
const fs = require('fs');
const URL = 'file:///home/claude/out/Backup-DR-Project.html';
(async () => {
  fs.writeFileSync('/tmp/rich.json', JSON.stringify(require('./rich.js')));
  const b = await chromium.launch();
  const errs = [];
  for (const [label, vp] of [['desk', { width: 1440, height: 900 }], ['mob', { width: 390, height: 844 }]]) {
    const ctx = await b.newContext({ viewport: vp, hasTouch: label === 'mob', isMobile: label === 'mob' });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(label + ' PAGEERROR ' + e.message));
    p.on('console', m => { if (m.type() === 'error') errs.push(label + ' CONSOLE ' + m.text()); });
    await p.goto(URL); await p.waitForSelector('#view .page-head');
    await p.setInputFiles('#fileInput', '/tmp/rich.json');
    await p.waitForSelector('#confirm[open]');
    await p.click('#confirm button[value=ok]'); await p.waitForTimeout(300);
    for (const v of ['dashboard','objectives','tasks','roadmap','risks','dependencies','milestones','reports']) {
      await p.evaluate(v => { location.hash = '#' + v; }, v); await p.waitForTimeout(200);
      await p.screenshot({ path: `shots/${label}-${v}.png`, fullPage: true });
      const ov = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
      if (ov.sw > ov.iw + 1) errs.push(`${label} ${v}: horizontal overflow ${ov.sw} > ${ov.iw}`);
    }
    // technical roadmap
    await p.evaluate(() => { location.hash = '#roadmap'; }); await p.waitForTimeout(100);
    await p.click('[data-action=rm-mode][data-mode=technical]'); await p.waitForTimeout(200);
    await p.screenshot({ path: `shots/${label}-roadmap-tech.png`, fullPage: true });
    await ctx.close();
  }
  console.log(errs.length ? errs.join('\n') : 'no errors / no overflow');
  await b.close();
})();
