const { chromium } = require('playwright'); const { spawn } = require('child_process');
let f = 0, pz = 0; const ok = (c, m) => { c ? pz++ : f++; console.log(c ? '  PASS' : '  FAIL', m) };
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', '8774', '--directory', '/home/claude/out'], { stdio: 'ignore' }); await new Promise(r => setTimeout(r, 800));
  const b = await chromium.launch();
  for (const [name, ua, re] of [['Firefox', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0', /Always ask you where to save files/], ['Safari', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15', /Ask for each download/], ['other', 'SomeBrowser/1.0', /Ask where to save each file/]]) {
    const ctx = await b.newContext({ userAgent: ua, acceptDownloads: true }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(() => { delete window.showSaveFilePicker; delete window.showOpenFilePicker; });
    await p.goto('http://localhost:8774/Backup-DR-Project.html'); await p.waitForSelector('#brandName');
    const dl = p.waitForEvent('download', { timeout: 3000 }).then(() => true, () => false);
    await p.click('.topbar [data-action=export-json]'); const got = await dl; await p.waitForTimeout(300);
    const t = await p.innerText('#toasts'); ok(got, name + ': file is downloaded'); ok(re.test(t), name + ': toast explains how to get a Save-as window: ' + t.replace(/\s+/g, ' ').slice(0, 150)); ok(errs.length === 0, name + ': no JS errors');
    await ctx.close();
  }
  const ctx = await b.newContext({ acceptDownloads: true }); const p = await ctx.newPage();   // Chrome/Edge-like: API present -> no hint needed
  await p.addInitScript(() => { window.showSaveFilePicker = async () => (await navigator.storage.getDirectory()).getFileHandle('z.json', { create: true }); });
  await p.goto('http://localhost:8774/Backup-DR-Project.html'); await p.waitForSelector('#brandName'); await p.click('.topbar [data-action=export-json]'); await p.waitForTimeout(700);
  ok(/Exported to z\.json/.test(await p.innerText('#toasts')) && !/Always ask/.test(await p.innerText('#toasts')), 'Edge/Chrome: save-as window path unchanged');
  console.log(`RESULT ${pz} passed, ${f} failed`); await b.close(); srv.kill(); process.exit(f ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2) });
