const { chromium, devices } = require('playwright');
let f = 0, pz = 0; const ok = (c, m) => { c ? pz++ : f++; console.log(c ? '  PASS' : '  FAIL', m) };
const rgb = s => (s.match(/[\d.]+/g) || []).map(Number);
const yellowish = c => { const [r, g, b] = rgb(c); return r >= 250 && g >= 240 && b >= 200 && b < r - 8; };   // light yellow tint, not white/grey
(async () => {
  const b = await chromium.launch();
  for (const [name, opts] of [['desktop', { viewport: { width: 1440, height: 900 } }], ['mobile', { ...devices['Pixel 7'] }]]) {
    console.log('--', name);
    const ctx = await b.newContext(opts); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('file:///home/claude/out/Backup-DR-Project.html'); await p.waitForSelector('#brandName');
    await p.evaluate(() => { delete window.showOpenFilePicker; delete window.showSaveFilePicker; });
    await p.setInputFiles('#fileInput', '/tmp/rich2.json'); await p.waitForTimeout(600);
    if (name === 'mobile') { await p.click('.hamb'); await p.waitForTimeout(300); }
    await p.click('#nav [data-nav=tasks]'); await p.waitForTimeout(300);
    for (const e of await p.$$('button.chev:not(.open)')) { try { await e.click(); } catch (x) { } } await p.waitForTimeout(300);
    // ---- task form ----
    await p.click('[data-action=task-edit][data-id=TSK-002]'); await p.waitForSelector('#modal[open] .subs-box');
    const r = await p.evaluate(() => {
      const box = document.querySelector('#modal .subs-box'), cs = getComputedStyle(box), ta = box.querySelector('textarea[name=quickSubs]');
      const notes = document.querySelector('#modal textarea[name=newNote]').closest('.fld'), ncs = getComputedStyle(notes);
      return { bg: cs.backgroundColor, bl: cs.borderLeftWidth, blc: cs.borderLeftColor, label: box.querySelector('.subs-label').innerText.replace(/\s+/g, ' '), icon: !!box.querySelector('.subs-label svg'), hint: box.querySelector('.hint').innerText.replace(/\s+/g, ' '), ta: !!ta, notesInside: box.contains(notes), nbg: ncs.backgroundColor, nbl: ncs.borderLeftWidth, order: !!(box.compareDocumentPosition(notes) & Node.DOCUMENT_POSITION_FOLLOWING) };
    });
    ok(yellowish(r.bg), 'Subtasks box has a light yellow background: ' + r.bg);
    ok(parseFloat(r.bl) >= 4 && rgb(r.blc)[0] > 180 && rgb(r.blc)[2] < 80, `coloured (amber) line down its left edge: ${r.bl} ${r.blc}`);
    ok(/Subtasks/.test(r.label) && r.icon, 'has a "Subtasks" label with an icon: ' + r.label);
    ok(/Each line creates a separate subtask/.test(r.hint) && /Notes go in the Notes section below/.test(r.hint), 'hint says each line is a separate subtask and notes go below: ' + r.hint.slice(0, 110));
    ok(r.ta && !r.notesInside && r.order, 'quick-add textarea is inside the box; Notes sits below, outside it');
    ok(!yellowish(r.nbg) && r.nbl === '0px', `Notes section stays plain (bg ${r.nbg}, no side line)`);
    if (name === 'desktop') { await p.evaluate(() => document.querySelector('#modal .subs-box').scrollIntoView({ block: 'center' })); await p.waitForTimeout(150); await p.screenshot({ path: '/tmp/sc-form.png' }); }
    // behaviour unchanged: two lines -> two subtasks, a note typed in Notes is a note
    const nSub = () => p.evaluate(() => window.BackupDR.getData().objectives.flatMap(o => o.tasks).find(t => t.id === 'TSK-002').subtasks.length);
    const nNote = () => p.evaluate(() => window.BackupDR.getData().objectives.flatMap(o => o.tasks).find(t => t.id === 'TSK-002').notes.length);
    const s0 = await nSub(), n0 = await nNote();
    await p.fill('#modal textarea[name=quickSubs]', 'Colour test one\nColour test two'); await p.fill('#modal textarea[name=newNote]', 'This is a note'); await p.click('#modal [data-modal-save]'); await p.waitForTimeout(500);
    ok(await nSub() === s0 + 2 && await nNote() === n0 + 1, 'quick-add still creates one subtask per line, and the Notes box still saves a note');
    // new task form also has it; subtask form does not
    await p.click('[data-action=task-new], [data-action=obj-add-task] >> nth=0').catch(() => { }); 
    if (await p.$('#modal[open]')) { ok(!!(await p.$('#modal .subs-box')), 'new task form has the box'); await p.click('#modal header [data-modal-close]'); await p.waitForTimeout(200); }
    for (const e of await p.$$('button.chev:not(.open)')) { try { await e.click(); } catch (x) { } } await p.waitForTimeout(300);
    await p.click('[data-action=sub-edit][data-id=SUB-004]'); await p.waitForSelector('#modal[open]'); ok(await p.$('#modal .subs-box') === null, 'subtask edit form has no Subtasks box'); await p.click('#modal header [data-modal-close]'); await p.waitForTimeout(200);
    // ---- Tasks list rows ----
    const rows = await p.evaluate(() => {
      const g = el => { const cs = getComputedStyle(el); return { bg: cs.backgroundColor, bl: cs.borderLeftWidth, blc: cs.borderLeftColor }; };
      const sub = [...document.querySelectorAll('.t-row.lvl-2:not(.is-blocked)')], tsk = [...document.querySelectorAll('.t-row.lvl-1:not(.is-blocked)')];
      return { nSub: sub.length, nTask: tsk.length, subBg: sub.map(e => g(e).bg), taskBg: tsk.map(e => g(e).bg), subStripe: sub.map(e => g(e).bl), subName: sub.map(e => g(e.querySelector('.t-name')))
        , stripeColour: sub[0] && getComputedStyle(sub[0]).borderLeftColor };
    });
    ok(rows.nSub >= 4 && rows.subBg.every(yellowish), `all ${rows.nSub} subtask rows have the light yellow background`);
    ok(rows.nTask >= 2 && rows.taskBg.every(c => !yellowish(c)), 'task rows are not yellow, so they look different');
    ok(rows.subName.every(n => n.bl === '3px' && rgb(n.blc)[0] > 180 && rgb(n.blc)[2] < 80), 'each subtask name has the amber line beside it');
    ok(rows.subStripe.every(w => w === '5px') && rgb(rows.stripeColour)[3] !== 0, 'objective colour stripe on the row edge is kept: ' + rows.stripeColour);
    if (name === 'desktop') await p.screenshot({ path: '/tmp/sc-list.png', clip: { x: 256, y: 120, width: 1184, height: 560 } }); else await p.screenshot({ path: '/tmp/sc-list-m.png' });
    // hover keeps it yellow; blocked subtask still red
    const sub0 = await p.$('.t-row.lvl-2'); await sub0.hover(); await p.waitForTimeout(150);
    ok(yellowish(await sub0.evaluate(e => getComputedStyle(e).backgroundColor)), 'hover keeps the yellow tint');
    ok(await p.evaluate(() => { const r = document.createElement('div'); r.className = 't-row lvl-2 is-blocked'; document.body.appendChild(r); const c = getComputedStyle(r).backgroundColor.match(/\d+/g).map(Number); r.remove(); return c[0] > 240 && c[1] < 250 && c[2] < 250 && c[0] - c[2] > 4 && c[1] === c[2]; }), 'a blocked subtask still shows the red blocked tint (not overridden)');
    ok(errs.length === 0, 'no JS errors ' + JSON.stringify(errs)); await ctx.close();
  }
  console.log(`RESULT ${pz} passed, ${f} failed`); await b.close(); process.exit(f ? 1 : 0);
})().catch(e => { console.error('CRASH', e.message); process.exit(2) });
