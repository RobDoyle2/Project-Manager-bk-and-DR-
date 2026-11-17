const { chromium, devices } = require('playwright');
let f = 0, pz = 0; const ok = (c, m) => { c ? pz++ : f++; console.log(c ? '  PASS' : '  FAIL', m) };
(async () => {
  const b = await chromium.launch();
  for (const [name, opts] of [['desktop', { viewport: { width: 1440, height: 900 } }], ['mobile', { ...devices['Pixel 7'] }]]) {
    console.log('--', name);
    const ctx = await b.newContext(opts); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); let popup = null; ctx.on('page', pg => { popup = pg; });
    await p.goto('file:///home/claude/out/Backup-DR-Project.html'); await p.waitForSelector('#brandName');
    if (name === 'mobile') { await p.click('.hamb'); await p.waitForTimeout(400); }
    const r = await p.evaluate(() => { const e = document.querySelector('.info-btn').getBoundingClientRect(), s = document.querySelector('#sidebar').getBoundingClientRect(); return { l: e.left - s.left, fromBottom: s.bottom - e.bottom, w: e.width, label: document.querySelector('.info-btn').getAttribute('aria-label') }; });
    ok(r.l < 30 && r.fromBottom < 30 && r.w <= 40, 'small info icon sits at the bottom-left of the sidebar: ' + JSON.stringify(r));
    await p.click('.info-btn'); await p.waitForSelector('#modal[open] .about');
    const t = await p.innerText('#modal'); const norm = t.replace(/\s+/g, ' ');
    ok(/About Programme Manager/.test(await p.innerText('#modal header')), 'title: About Programme Manager');
    for (const h of ['Getting started', 'Saving your work', 'Opening a project', 'About the JSON file']) ok(new RegExp(h, 'i').test(norm), 'section: ' + h);
    ok(/Save regularly to back up your data/.test(norm), 'says: save regularly to back up your data');
    ok(/lost if you clear your browser data/.test(norm) && /saved JSON file is the reliable backup/i.test(norm), 'says browser backups are lost if data is cleared; JSON is the reliable backup');
    ok(/Your data never leaves your browser or the JSON file you select\. Nothing is sent to a server, unless you choose to share the file yourself\./.test(norm), 'privacy line');
    const bodyT = (await p.innerText('#modal .modal-body')).trim(); ok(/Created by Robert Doyle from nuloha\.com$/.test(bodyT), 'last line of the window: Created by Robert Doyle from nuloha.com');
    const a = await p.$('#modal .about-by a'); ok((await a.getAttribute('href')) === 'https://nuloha.com' && (await a.getAttribute('target')) === '_blank' && /noopener/.test(await a.getAttribute('rel')), 'nuloha.com is a link opening in a new tab');
    ok(await p.$('#modal [data-modal-save]') === null && await p.$('#modal header [data-modal-close]') !== null, 'has an X to close it and nothing to "save"');
    if (name === 'desktop') await p.screenshot({ path: '/tmp/about-desk.png' });
    await p.click('#modal header [data-modal-close]'); await p.waitForTimeout(200); ok(await p.$('#modal[open]') === null, 'X closes it');
    if (name === 'mobile') { await p.click('.hamb'); await p.waitForTimeout(300); }
    await p.click('.info-btn'); await p.waitForSelector('#modal[open] .about'); await p.keyboard.press('Escape'); await p.waitForTimeout(200); ok(await p.$('#modal[open]') === null, 'Esc closes it');
    await p.evaluate(() => window.BackupDR.getData()); const before = await p.evaluate(() => JSON.stringify(window.BackupDR.getData()));
    if (name === 'mobile') { await p.click('.hamb'); await p.waitForTimeout(300); }
    await p.click('.info-btn'); await p.waitForSelector('#modal[open] .about'); await p.keyboard.press('Escape'); ok(before === await p.evaluate(() => JSON.stringify(window.BackupDR.getData())), 'opening/closing changes no data');
    if (name === 'mobile') { await p.click('.hamb'); await p.waitForTimeout(300); await p.click('.info-btn'); await p.waitForSelector('#modal .about'); await p.screenshot({ path: '/tmp/about-mob.png' }); const sc = await p.evaluate(() => { const m = document.querySelector('#modal .modal-body'); return m.scrollHeight > m.clientHeight; }); ok(true, 'mobile: scrollable body = ' + sc); }
    ok(errs.length === 0, 'no JS errors ' + JSON.stringify(errs)); await ctx.close();
  }
  console.log(`RESULT ${pz} passed, ${f} failed`); await b.close(); process.exit(f ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2) });
