/* =====================================================================
   Linked project file (File System Access API)
   - "Import JSON" (upload arrow) -> dialog: browse for a file, or create a new one (you choose name + place)
   - the status chip in the top bar then writes the latest data back to that same file
   Works in Chrome / Edge / Opera on a computer. Elsewhere (Firefox, Safari, phones, embedded viewers)
   the normal import / download is used instead.
   ===================================================================== */
const FSA = { open: typeof window.showOpenFilePicker === 'function', save: typeof window.showSaveFilePicker === 'function' };
const JSON_TYPES = [{ description: 'Backup & DR project (JSON)', accept: { 'application/json': ['.json'] } }];
let linked = null;               // { handle, name, savedAt }

/* ---- remember the chosen file between visits (IndexedDB can hold file handles) ---- */
function idbOpen() {
  return new Promise((res, rej) => {
    try { const r = indexedDB.open('backupdr.files', 1); r.onupgradeneeded = () => r.result.createObjectStore('handles'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch (e) { rej(e); }
  });
}
async function idbDo(mode, fn) {
  const db = await idbOpen();
  return new Promise((res, rej) => { const tx = db.transaction('handles', mode); const rq = fn(tx.objectStore('handles')); tx.oncomplete = () => { db.close(); res(rq && rq.result); }; tx.onerror = tx.onabort = () => { db.close(); rej(tx.error); }; });
}
const persistLink = () => { if (!linked) return idbDo('readwrite', s => s.delete('linked')).catch(() => {}); return idbDo('readwrite', s => s.put({ handle: linked.handle, savedAt: linked.savedAt }, 'linked')).catch(() => {}); };
async function loadLink() {
  if (!FSA.open && !FSA.save) return;
  try {
    const rec = await idbDo('readonly', s => s.get('linked'));
    if (rec && rec.handle) { linked = { handle: rec.handle, name: rec.handle.name, savedAt: rec.savedAt || null }; updateSaveChip(); }
  } catch (e) { /* storage unavailable: no remembered file */ }
}
function setLink(handle, savedAt) { linked = { handle, name: handle.name, savedAt: savedAt || new Date().toISOString() }; persistLink(); render(); }
function unlinkFile() { linked = null; persistLink(); render(); }
const fileDirty = () => !!linked && (!linked.savedAt || data.meta.modifiedAt > linked.savedAt);

/* ---- writing ---- */
async function ensureWritable(handle) {
  const o = { mode: 'readwrite' };
  if (handle.queryPermission && (await handle.queryPermission(o)) === 'granted') return true;
  if (handle.requestPermission) return (await handle.requestPermission(o)) === 'granted';
  return true;
}
async function writeToHandle(handle) {
  const text = exportText();
  const w = await handle.createWritable();
  try { await w.write(text); await w.close(); } catch (e) { try { await w.abort(); } catch (x) { /* ignore */ } throw e; }
}
function pickerFailed(e, kind) {
  if (e && e.name === 'AbortError') return;                 // the user closed the picker
  if (kind === 'open') { toast('This viewer does not allow choosing a file location, so the normal file chooser is used instead.', 'warn', 6000); classicImport(); }
  else { toast('This viewer does not allow choosing a file location, so the file is downloaded instead.', 'warn', 6000); downloadExport(); }
}
function classicImport() { const fi = $('#fileInput'); fi.value = ''; fi.click(); }

async function saveToLinkedFile() {
  if (!linked) { fileDialog(); return; }
  try {
    if (!(await ensureWritable(linked.handle))) { toast('Permission to change that file was not given, so nothing was written.', 'warn', 6000); return; }
    await writeToHandle(linked.handle);
    linked.savedAt = new Date().toISOString(); persistLink(); renderNav(); updateSaveChip();
    toast(`Saved to ${linked.name}.`, 'ok');
  } catch (e) {
    if (e && (e.name === 'NotFoundError' || e.name === 'InvalidStateError')) {
      const again = await confirmDialog({ title: 'The linked file can’t be found', okLabel: 'Choose a file…', message: `<b>${esc(linked.name)}</b> has been moved, renamed or deleted, so it can’t be updated. Choose a new name and location?` });
      if (again) createNewFile(); else unlinkFile();
    } else toast('Could not write to the file: ' + (e && e.message ? e.message : e), 'error', 8000);
  }
}
async function browseForFile() {
  let hs;
  try { hs = await window.showOpenFilePicker({ types: JSON_TYPES, multiple: false }); } catch (e) { return pickerFailed(e, 'open'); }
  const handle = hs[0];
  let text, file;
  try { file = await handle.getFile(); text = await file.text(); } catch (e) { toast('Could not read that file.', 'error'); return; }
  const imported = await handleImportText(text, file.name);
  if (imported) { setLink(handle, new Date().toISOString()); toast(`Linked to ${handle.name}. Press the button in the top bar to save your changes back to it.`, 'ok', 6000); }
}
async function createNewFile() {
  let handle;
  try { handle = await window.showSaveFilePicker({ suggestedName: 'Backup-DR-Data.json', types: JSON_TYPES }); } catch (e) { return pickerFailed(e, 'save'); }
  try { await writeToHandle(handle); } catch (e) { toast('Could not write to that file: ' + (e && e.message ? e.message : e), 'error', 8000); return; }
  setLink(handle, new Date().toISOString()); render();
  toast(`Saved to ${handle.name}. Press the button in the top bar any time to update it.`, 'ok', 6000);
}

/* Export JSON: browse for the folder and file name instead of dropping a file into Downloads (a copy; the linked file, if any, is unchanged) */
async function exportToChosenFile() {
  let handle;
  try { handle = await window.showSaveFilePicker({ suggestedName: stampName('Backup-DR-Data', 'json'), types: JSON_TYPES }); } catch (e) { return pickerFailed(e, 'save'); }
  try { await writeToHandle(handle); } catch (e) { toast('Could not write to that file: ' + (e && e.message ? e.message : e), 'error', 8000); return; }
  render(); toast(`Exported to ${handle.name}.`, 'ok', 4500);
}

/* ---- dialog behind the upload arrow ---- */
function fileDialog() {
  const cur = linked ? `<div class="fl-cur"><div><small>Linked file</small><b>${esc(linked.name)}</b><span>${fileDirty() ? 'Has changes not yet written to the file' : 'Up to date' + (linked.savedAt ? ' · saved ' + esc(fmtStamp(new Date(linked.savedAt))) : '')}</span></div>
      <div class="btn-row">${btn('Update file now', 'file-save', '', 'primary', 'save')}${btn('Stop linking', 'file-unlink', '', 'ghost')}</div></div>` : '';
  openModal({
    title: 'Project file', hideSave: true, cancelLabel: 'Close',
    html: `<p class="muted small">Choose a real file on this computer. After that, the button in the top bar (next to Import JSON) writes your latest changes straight back to it.</p>${cur}
      <div class="fl-opts">
        <button type="button" class="fl-opt" data-action="file-browse">${icon('upload', 22)}<span><b>Browse for an existing file…</b><small>Pick a project JSON file. It replaces the current data after you confirm, then stays linked for saving.</small></span></button>
        <button type="button" class="fl-opt" data-action="file-new">${icon('save', 22)}<span><b>Save as a new file…</b><small>Choose the folder <em>and the file name</em>. The current project is written there and stays linked.</small></span></button>
        <button type="button" class="fl-opt" data-action="file-classic">${icon('report', 22)}<span><b>Import once, without linking</b><small>The usual file chooser; the file is not kept linked afterwards.</small></span></button>
      </div>`
  });
}
Object.assign(ACTIONS, {
  'import-json': () => { if (FSA.open || FSA.save) fileDialog(); else classicImport(); },
  'file-dialog': () => fileDialog(),
  'file-browse': () => { closeModal(); browseForFile(); },
  'file-new': () => { closeModal(); createNewFile(); },
  'file-classic': () => { closeModal(); classicImport(); },
  'file-save': () => { closeModal(); saveToLinkedFile(); },
  'file-unlink': () => { unlinkFile(); closeModal(); toast('No longer linked to a file. Autosave in the browser carries on.'); },
  'file-chip': () => { if (linked) saveToLinkedFile(); else if (FSA.save || FSA.open) fileDialog(); else downloadExport(); }
});
