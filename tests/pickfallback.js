const { chromium } = require('playwright'); const { spawn } = require('child_process');
let f = 0, pz = 0; const ok = (c, m) => { c ? pz++ : f++; console.log(c ? '  PASS' : '  FAIL', m) };
// Simulates browsers that refuse part of the options passed to showSaveFilePicker / showOpenFilePicker
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', '8773', '--directory', '/home/claude/out'], { stdio: 'ignore' }); await new Promise(r => setTimeout(r, 800));
  const b = await chromium.launch();
  const run = async (label, rule, check) => {
    const ctx = await b.newContext({ acceptDownloads: true, viewport: { width: 1300, height: 800 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(rule => {
      window.__tries = []; const bad = new Function('o', rule);
      const mk = n => async o => { window.__tries.push([n, !!o.startIn, !!o.types]); const e = bad(o); if (e) throw Object.assign(new Error(e), { name: e }); const d = await navigator.storage.getDirectory(); return n === 'save' ? d.getFileHandle('x.json', { create: true }) : [await d.getFileHandle('x.json', { create: true })]; };
      window.showSaveFilePicker = mk('save'); window.showOpenFilePicker = mk('open');
    }, rule);
    await p.goto('http://localhost:8773/Backup-DR-Project.html'); await p.waitForSelector('#brandName');
    await p.setInputFiles('#fileInput', '/tmp/rich2.json'); await p.waitForTimeout(500);
    let dl = false; p.on('download', () => { dl = true; });
    await p.click('.topbar [data-action=export-json]'); await p.waitForTimeout(900);
    const tries = await p.evaluate(() => window.__tries); const toast = await p.innerText('#toasts');
    await check(label, { tries, dl, toast, p }); ok(errs.length === 0, label + ': no JS errors ' + JSON.stringify(errs)); await ctx.close();
  };
  await run('refuses startIn with a non-TypeError (e.g. OneDrive-redirected Downloads)', "if (o.startIn) return 'NotFoundError';", async (l, r) => {
    ok(r.tries.length === 2 && r.tries[0][1] && !r.tries[1][1], l + ': retried without startIn: ' + JSON.stringify(r.tries)); ok(!r.dl && /Exported to x\.json/.test(r.toast), l + ': the save-as window still worked, no download');
  });
  await run('refuses the file-type filter too', "if (o.startIn || o.types) return 'DataError';", async (l, r) => {
    ok(r.tries.length === 3 && !r.tries[2][2], l + ': third attempt without filter'); ok(!r.dl && /Exported to x\.json/.test(r.toast), l + ': save-as still worked');
  });
  await run('picker blocked completely (viewer / policy)', "return 'NotAllowedError';", async (l, r) => {
    ok(r.dl, l + ': falls back to a download'); ok(/NotAllowedError/.test(r.toast) && /save-as window/.test(r.toast), l + ': toast says why: ' + r.toast.replace(/\s+/g, ' ').slice(0, 130));
  });
  await run('normal browser', "return null;", async (l, r) => { ok(r.tries.length === 1 && !r.dl, l + ': one attempt, startIn hint used, no download'); });
  console.log(`RESULT ${pz} passed, ${f} failed`); await b.close(); srv.kill(); process.exit(f ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2) });
