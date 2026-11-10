/* persist.js — membuat galeri tersimpan di server (Vercel Blob / server lokal).
   Dimuat SETELAH script galeri; hanya menimpa bagian penyimpanan, tampilan tidak diubah. */
(function () {
  let pw = '';
  const $ = id => document.getElementById(id);
  const api = (p, o = {}) => fetch(p, { ...o, headers: { ...(o.headers || {}), 'x-password': pw } });

  const toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translate(-50%,20px);z-index:6000;padding:8px 18px;border-radius:20px;background:rgba(30,30,40,.88);color:#fff;font:600 13px system-ui,sans-serif;opacity:0;transition:opacity .3s,transform .3s;pointer-events:none';
  document.body.appendChild(toast);
  let tt;
  function say(t) {
    toast.textContent = t; toast.style.opacity = 1; toast.style.transform = 'translate(-50%,0)';
    clearTimeout(tt); tt = setTimeout(() => { toast.style.opacity = 0; toast.style.transform = 'translate(-50%,20px)'; }, 2400);
  }

  // Login sekarang hanya pakai password (dicek server), kolom ID dibuang
  const idEl = $('adminId'); if (idEl) idEl.remove();
  const pwEl = $('adminPw');
  if (pwEl) { pwEl.placeholder = 'Password'; pwEl.addEventListener('keydown', e => { if (e.key === 'Enter') window.handleLogin(); }); }

  // ---- ambil data dari server (menggantikan IndexedDB) ----
  window.initDB = async () => {};
  window.getAllImages = async () => [];
  window.loadServerData = async (fresh) => {
    try {
      const r = await fetch('/api/gallery' + (fresh ? '?t=' + Date.now() : ''), { cache: 'no-cache' });
      if (!r.ok) return [];
      const a = await r.json();
      return Array.isArray(a) ? a : [];
    } catch (e) { return []; }
  };

  // ---- simpan ke server: dipanggil galeri setiap ada perubahan ----
  let chain = Promise.resolve();
  window.saveImagesToDB = function (images) {
    chain = chain.then(() => doSave(images)).catch(e => { console.error(e); say('Gagal menyimpan'); });
    return chain;
  };
  async function doSave(images) {
    if (!pw) { say('Login dulu'); return; }
    // gambar baru (masih data:) di-upload dulu
    const pending = images.filter(d => typeof d.src === 'string' && d.src.startsWith('data:'));
    const text = $('progressText'), bar = $('progressBar');
    if (bar && pending.length) bar.style.width = '0%';
    let failed = 0;
    for (let i = 0; i < pending.length; i++) {
      const d = pending[i];
      if (text) text.innerText = `Mengupload ${i + 1} dari ${pending.length}...`;
      try {
        const blob = await (await fetch(d.src)).blob();
        const key = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        const r = await api('/api/upload?path=' + encodeURIComponent('images/' + key + '.jpg'),
          { method: 'POST', headers: { 'content-type': 'image/jpeg' }, body: blob });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.status);
        d.src = (await r.json()).url; d.id = key;
      } catch (e) { failed++; d.__bad = true; console.error(e); }
      if (bar) bar.style.width = `${((i + 1) / pending.length) * 100}%`;
    }
    for (let i = images.length - 1; i >= 0; i--) if (images[i].__bad) images.splice(i, 1);

    const body = images.map(d => ({ id: String(d.id), src: d.src, name: d.name || '', scale: d.scale, pctX: d.pctX, pctY: d.pctY }));
    const r = await api('/api/save', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (r.ok) say(failed ? `Tersimpan (${failed} gagal diupload)` : 'Tersimpan ✓');
    else { say('Gagal menyimpan'); alert('Gagal menyimpan: ' + ((await r.json().catch(() => ({}))).error || r.status)); }
  }

  // ---- login lewat server ----
  window.handleLogin = async function () {
    const box = document.querySelector('#loginModal .modal-content');
    let ok = false;
    try { pw = $('adminPw').value; ok = (await api('/api/login', { method: 'POST' })).ok; } catch (e) {}
    if (ok) {
      isAdmin = true; closeModal('loginModal');
      $('bulkUploadBtn').style.display = 'flex';
      imagesData = await window.loadServerData(true);
      renderGrid();
    } else {
      pw = ''; box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake');
    }
  };

  // ---- menu admin (tanpa export/draft yang sudah tidak diperlukan) ----
  window.showAdminMenu = function (px, py) {
    const m = $('contextMenu'); m.innerHTML = '';
    const add = (t, fn, color) => { const d = document.createElement('div'); d.className = 'context-item'; d.innerText = t; if (color) d.style.color = color; d.onclick = fn; m.appendChild(d); };
    if (!isAdmin) add('aram', () => { openModal('loginModal'); closeContextMenu(); });
    else {
      add('Kembali ke home', () => location.reload());
      add('Hapus semua gambar', () => { triggerDeleteAll(); closeContextMenu(); }, '#dc3545');
    }
    openMenu(px - 100, py);
  };
})();
