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

/* ===== Perbaikan HP: kurangi efek berat supaya gambar tidak kedip (desktop tidak berubah) ===== */
(function () {
  const css = `
@media (hover: none) and (pointer: coarse) {
  html:not(.no-fx) body { animation: none; background-attachment: scroll; background-size: 100% 100%; }
  html:not(.no-fx) .blob { animation: none; filter: blur(40px); }
  html:not(.no-fx) .glass-card, html:not(.no-fx) .glass-card.shiny {
    backdrop-filter: none; -webkit-backdrop-filter: none; transform: none; transition: none; animation: pg-in .45s ease backwards; }
  html:not(.no-fx) .glass-card.shiny { box-shadow: 0 0 0 2px rgba(255,200,0,.9), 0 0 14px rgba(255,190,0,.55); }
  html:not(.no-fx) .glass-card.shiny::before, html:not(.no-fx) .glass-card::after, html:not(.no-fx) .glass-card .sweep { display: none; }
  html:not(.no-fx) .glass-card img, html:not(.no-fx) .glass-card:hover img { filter: none; transition: none; image-rendering: auto; }
  html:not(.no-fx) .shiny-badge { animation: none; }
  html:not(.no-fx) .star { filter: none; }
  html:not(.no-fx) .star:nth-of-type(n+4) { display: none; }
  html:not(.no-fx) #searchContainer { animation: none; }
  html:not(.no-fx) #searchInput, html:not(.no-fx) #searchInput:focus, html:not(.no-fx) #fxToggle, html:not(.no-fx) .bulk-upload-btn {
    animation: none; backdrop-filter: none; -webkit-backdrop-filter: none; background: rgba(255,255,255,.75); }
  html:not(.no-fx) .modal, html:not(.no-fx) #progressModal { backdrop-filter: none; -webkit-backdrop-filter: none; background: rgba(0,0,0,.6); }
  html:not(.no-fx) #lightbox.active { backdrop-filter: none; -webkit-backdrop-filter: none; background: rgba(0,0,0,.92); }
  html:not(.no-fx) #lbCaption, html:not(.no-fx) .lb-nav-btn, html:not(.no-fx) .lb-nav-close { backdrop-filter: none; -webkit-backdrop-filter: none; }
  html:not(.no-fx) #contextMenu { backdrop-filter: none; -webkit-backdrop-filter: none; background: rgba(255,255,255,.97); }
}
@keyframes pg-in { from { opacity: 0; transform: translateY(14px); } }
.glass-card { -webkit-touch-callout: none; }
.glass-card.pg-armed { scale: 1.05; box-shadow: 0 10px 28px rgba(31,38,135,.35); }
.glass-card.pg-drag { z-index: 60 !important; --s: 1 !important; --rx: 0deg !important; --ry: 0deg !important; scale: 1.07; opacity: .96;
  box-shadow: 0 26px 50px rgba(20,20,60,.45) !important; animation: none !important; }
body.pg-dragging, body.pg-dragging * { cursor: grabbing !important; }
`;
  const st = document.createElement('style'); st.id = 'persist-style'; st.textContent = css; document.head.appendChild(st);
})();

/* ===== Geser untuk mengurutkan: animasi bergeser, auto-scroll, jalan di mouse & layar sentuh ===== */
(function () {
  const grid = document.getElementById('galleryContainer');
  const coarse = matchMedia('(hover: none) and (pointer: coarse)').matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let st = null, busy = false, blockUntil = 0;

  function slotAt(px, py, g) {
    const col = clamp(Math.floor((px - g.ox) / g.sx), 0, g.cols - 1);
    const row = clamp(Math.floor((py - g.oy) / g.sy), 0, g.rows - 1);
    return Math.min(row * g.cols + col, g.n - 1);
  }
  window.__pgSlotAt = slotAt;
  const pos = i => ({ x: st.g.ox + (i % st.g.cols) * st.g.sx, y: st.g.oy + Math.floor(i / st.g.cols) * st.g.sy });
  const curT = c => { const t = getComputedStyle(c).translate; if (!t || t === 'none') return [0, 0]; const p = t.split(' '); return [parseFloat(p[0]) || 0, parseFloat(p[1]) || 0]; };
  const tr = (c, v) => c.style.setProperty('transition', v, 'important'); // tetap jalan walau Effect OFF

  // matikan drag bawaan HTML5 (diganti sistem ini)
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.classList && n.classList.contains('glass-card')) n.draggable = false; })))
    .observe(grid, { childList: true });

  grid.addEventListener('pointerdown', e => {
    if (busy || st || !isAdmin || (e.pointerType === 'mouse' && e.button !== 0) || currentSearch()) return;
    const el = e.target.closest('.glass-card'); if (!el) return;
    st = { el, pid: e.pointerId, touch: e.pointerType !== 'mouse', sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY,
      armed: false, dragging: false, timer: 0, raf: 0, edge: 0, last: 0 };
    if (st.touch) st.timer = setTimeout(arm, 320);          // HP: tahan sebentar dulu supaya scroll biasa tetap bisa
    addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', up);
  });

  function arm() {
    if (!st) return; st.armed = true; tr(st.el, 'scale .15s ease, box-shadow .15s'); st.el.classList.add('pg-armed');
    try { navigator.vibrate && navigator.vibrate(15); } catch (e) {}
  }
  function move(e) {
    if (!st || e.pointerId !== st.pid) return;
    st.x = e.clientX; st.y = e.clientY;
    if (st.dragging) return;
    const d = Math.hypot(st.x - st.sx, st.y - st.sy);
    if (st.touch) { if (!st.armed) { if (d > 10) cancelPress(); } else if (d > 5) startDrag(); }
    else if (d > 6) startDrag();
  }
  function unlisten() { removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); }
  function cancelPress() {
    clearTimeout(st.timer); unlisten();
    st.el.classList.remove('pg-armed'); st.el.style.removeProperty('transition'); st = null;
  }

  function startDrag() {
    clearTimeout(st.timer);
    const el = st.el, cards = [...grid.querySelectorAll('.glass-card')];
    const cs = getComputedStyle(grid), cols = cs.gridTemplateColumns.split(' ').length, gr = grid.getBoundingClientRect();
    const gx = parseFloat(cs.columnGap) || 0, gy = parseFloat(cs.rowGap) || gx;
    st.g = { cols, n: cards.length, rows: Math.ceil(cards.length / cols),
      ox: gr.left + scrollX + (parseFloat(cs.paddingLeft) || 0), oy: gr.top + scrollY + (parseFloat(cs.paddingTop) || 0),
      sx: cards[0].offsetWidth + gx, sy: cards[0].offsetHeight + gy };
    st.order = cards; st.slot = cards.indexOf(el); st.dragging = true;
    const b = pos(st.slot); st.grabX = st.sx + scrollX - b.x; st.grabY = st.sy + scrollY - b.y;
    el.classList.remove('pg-armed'); el.classList.add('pg-drag'); tr(el, 'scale .15s ease, box-shadow .15s');
    document.body.classList.add('pg-dragging');
    st.raf = requestAnimationFrame(tick);
  }

  function tick(t) {
    if (!st || !st.dragging) return;
    const dt = st.last ? Math.min(50, t - st.last) : 16; st.last = t;
    // auto-scroll saat jari/kursor di dekat tepi atas atau bawah layar (makin lama makin cepat)
    const TOP = 110, BOT = 90; let v = 0;
    if (st.y < TOP) v = -clamp((TOP - st.y) / TOP, 0, 1); else if (st.y > innerHeight - BOT) v = clamp((st.y - (innerHeight - BOT)) / BOT, 0, 1);
    if (v) { st.edge += dt; scrollBy(0, Math.sign(v) * (5 + 28 * v * v) * (1 + Math.min(2, st.edge / 900)) * dt / 16.7); } else st.edge = 0;
    const px = st.x + scrollX, py = st.y + scrollY;
    const s = slotAt(px, py, st.g); if (s !== st.slot) reorder(s);
    const b = pos(st.slot);
    st.el.style.translate = (px - st.grabX - b.x) + 'px ' + (py - st.grabY - b.y) + 'px';
    st.raf = requestAnimationFrame(tick);
  }

  // pindahkan posisi di DOM, kartu lain meluncur ke tempat barunya (FLIP)
  function reorder(ns) {
    const el = st.el, old = st.order.slice();
    st.order.splice(st.order.indexOf(el), 1); st.order.splice(ns, 0, el);
    const lo = Math.min(st.slot, ns), hi = Math.max(st.slot, ns), moves = [];
    for (let i = lo; i <= hi; i++) {
      const c = st.order[i]; if (c === el) continue;
      const a = pos(old.indexOf(c)), b = pos(i), ct = curT(c);
      moves.push([c, a.x + ct[0] - b.x, a.y + ct[1] - b.y]);
    }
    grid.insertBefore(el, st.order[ns + 1] || null);
    for (const [c, dx, dy] of moves) { tr(c, 'none'); c.style.translate = dx + 'px ' + dy + 'px'; }
    void grid.offsetWidth;
    for (const [c] of moves) { tr(c, 'translate .28s cubic-bezier(.2,.8,.3,1)'); c.style.translate = '0px 0px'; }
    st.slot = ns;
  }

  function up(e) {
    if (!st || e.pointerId !== st.pid) return;
    unlisten(); clearTimeout(st.timer);
    const s = st;
    if (!s.dragging) {                                   // tidak jadi geser
      s.el.classList.remove('pg-armed'); s.el.style.removeProperty('transition'); st = null;
      if (s.touch && s.armed && e.type === 'pointerup') { // HP: tahan lalu lepas tanpa geser = menu hapus
        blockUntil = Date.now() + 500; ignoreClickUntil = Date.now() + 700;
        showDeleteMenu(e.clientX + scrollX, e.clientY + scrollY, +s.el.dataset.i);
      }
      return;
    }
    cancelAnimationFrame(s.raf); st = null; busy = true; blockUntil = Date.now() + 600;
    document.body.classList.remove('pg-dragging');
    const el = s.el; tr(el, 'translate .22s ease, scale .22s ease, box-shadow .22s');
    el.style.zIndex = '60'; el.style.translate = '0px 0px'; el.classList.remove('pg-drag');
    setTimeout(() => commit(s), 250);
  }

  async function commit(s) {
    const order = s.order.map(c => +c.dataset.i);
    if (order.some((v, i) => v !== i)) {
      imagesData.splice(0, imagesData.length, ...order.map(i => imagesData[i]));
      renderGrid();
      // tampilkan ulang tanpa animasi masuk, supaya tidak "meledak" lagi
      grid.querySelectorAll('.glass-card').forEach(c => { c.style.animationName = (!coarse && c.classList.contains('shiny')) ? 'none, shinyGlow' : 'none'; });
      busy = false;
      await saveImagesToDB(imagesData);
    } else {
      s.order.forEach(c => { c.style.removeProperty('transition'); c.style.translate = ''; c.style.zIndex = ''; });
      busy = false;
    }
  }

  // saat dalam mode geser: jangan scroll lewat sentuhan, jangan munculkan menu klik-kanan/tahan, dan jangan buka editor
  document.addEventListener('touchmove', e => { if (st && (st.armed || st.dragging) && e.cancelable) e.preventDefault(); }, { passive: false });
  document.addEventListener('contextmenu', e => { if ((st && (st.armed || st.dragging)) || Date.now() < blockUntil) { e.preventDefault(); e.stopPropagation(); } }, true);
  grid.addEventListener('click', e => { if (Date.now() < blockUntil) { e.stopPropagation(); e.preventDefault(); } }, true);
})();
