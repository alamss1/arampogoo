/* accounts.js — halaman Account: satu akun = satu baris (bisa digeser ke samping),
   isinya gambar Pokémon + video TikTok. Dimuat otomatis oleh persist.js. */
(function () {
  const $ = id => document.getElementById(id);
  const api = (p, o) => window.__pgApi(p, o);
  const say = t => window.__pgSay && window.__pgSay(t);
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const isShiny = n => /shiny/i.test(n || '');
  const PLAYER = id => 'https://www.tiktok.com/player/v1/' + id + '?music_info=1&description=1&autoplay=1&muted=1';
  let accounts = [], loaded = false, open = false, saving = Promise.resolve(), pickFor = null, edit = null, vw = null;

  function el(tag, cls, text, attrs) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  // ---------- gaya ----------
  const css = document.createElement('style');
  css.textContent = `
#galleryContainer{margin-top:16px}
.acc-toggle{position:fixed;left:12px;top:calc(50px + env(safe-area-inset-top,0px));z-index:1100;height:28px;padding:0 14px;border-radius:20px;
  font-weight:700;font-size:12px;font-family:inherit;color:var(--text-color);background:var(--glass-bg);border:1px solid var(--glass-border);
  box-shadow:var(--glass-shadow);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);cursor:pointer}
.acc-toggle.active{background:#4a90e2;color:#fff}
html.pg-lite .acc-toggle:not(.active),html.no-fx .acc-toggle:not(.active){backdrop-filter:none;-webkit-backdrop-filter:none;background:rgba(255,255,255,.75)}
@media (max-width:600px){.acc-toggle{left:8px;top:calc(49px + env(safe-area-inset-top,0px));height:26px;font-size:11px;padding:0 12px}}
.acc-view{display:none;padding:28px 12px 90px;max-width:1400px;margin:0 auto}
.acc-view.on{display:block}
.acc-row{margin:0 0 14px;padding:10px 12px 8px;border-radius:16px;background:var(--glass-bg);border:1px solid var(--glass-border);box-shadow:0 2px 10px rgba(31,38,135,.12)}
.acc-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px}
.acc-name{font-weight:800;font-size:16px}
.acc-meta{font-size:12px;opacity:.7}
.acc-tools{margin-left:auto;display:flex;gap:6px;flex-wrap:wrap}
.acc-btn{border:1px solid var(--glass-border);background:rgba(255,255,255,.55);color:var(--text-color);border-radius:10px;padding:5px 10px;font-weight:600;font-size:12px;font-family:inherit;cursor:pointer}
.acc-strip{display:flex;gap:8px;overflow-x:auto;padding-bottom:8px;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain}
.acc-tile{position:relative;flex:0 0 auto;width:150px;aspect-ratio:1;border-radius:12px;overflow:hidden;background:rgba(255,255,255,.4);border:1px solid var(--glass-border);cursor:pointer}
@media (max-width:700px){.acc-tile{width:112px}}
.acc-tile img{position:absolute;pointer-events:none;transform-origin:top left}
.acc-tile.shiny{box-shadow:0 0 0 2px rgba(255,200,0,.9),0 0 10px rgba(255,190,0,.45)}
.acc-badge{position:absolute;top:5px;left:5px;padding:1px 5px;border-radius:4px;font-weight:800;font-size:7px;font-style:italic;color:#4a2c00;background:linear-gradient(110deg,#ffd700,#ffaa00)}
.acc-tile.vid{background:linear-gradient(135deg,#0d0d12,#2a2a38);display:flex;align-items:center;justify-content:center}
.acc-play{color:#fff;font-size:28px;width:54px;height:54px;border-radius:50%;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;padding-left:4px}
.acc-none{opacity:.5;font-size:13px;padding:8px 2px}
.acc-bar{margin:0 0 12px}
.acc-empty{opacity:.6;text-align:center;padding:30px 0}
.acc-viewer{display:none;position:fixed;inset:0;z-index:4500;background:rgba(0,0,0,.92);align-items:center;justify-content:center}
.acc-viewer.on{display:flex}
.acc-stage{display:flex;align-items:center;justify-content:center;max-width:100%;max-height:100%}
.acc-stage img{max-width:94vw;max-height:88vh;max-height:88dvh;border-radius:14px}
.acc-stage iframe{height:min(86vh,760px);height:min(86dvh,760px);aspect-ratio:9/16;max-width:94vw;border:0;border-radius:14px;background:#000}
.acc-vx,.acc-vn{position:absolute;border:0;border-radius:50%;background:rgba(255,255,255,.16);color:#fff;cursor:pointer;width:46px;height:46px;font-size:26px;line-height:46px;padding:0}
.acc-vx{top:calc(14px + env(safe-area-inset-top,0px));right:14px}
.acc-vn{top:50%;margin-top:-23px}.acc-vn.l{left:12px}.acc-vn.r{right:12px}
@media (max-width:700px){.acc-vn{background:rgba(0,0,0,.4);width:40px;height:40px;line-height:40px;font-size:22px;margin-top:-20px}}
`;
  document.head.appendChild(css);

  // ---------- elemen ----------
  const grid = $('galleryContainer');
  const btn = el('button', 'acc-toggle', 'Account', { type: 'button', id: 'accBtn' });
  const view = el('section', 'acc-view', null, { id: 'accView' });
  const file = el('input', null, null, { type: 'file', id: 'accFile', accept: 'image/*', multiple: '' }); file.style.display = 'none';
  const viewer = el('div', 'acc-viewer', null, { id: 'accViewer' });
  viewer.innerHTML = '<button class="acc-vx" aria-label="Tutup">×</button><button class="acc-vn l" aria-label="Sebelumnya">‹</button><div id="accStage" class="acc-stage"></div><button class="acc-vn r" aria-label="Berikutnya">›</button>';
  document.body.append(btn, file, viewer);
  grid.parentNode.insertBefore(view, grid.nextSibling);

  // ---------- data ----------
  async function load(fresh) {
    try {
      const r = await fetch('/api/accounts' + (fresh ? '?t=' + Date.now() : ''), { cache: 'no-cache' });
      const j = await r.json(); accounts = Array.isArray(j) ? j : []; loaded = true;
    } catch (e) { accounts = []; }
  }
  function saveAcc() {
    saving = saving.then(async () => {
      const r = await api('/api/accounts-save', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(accounts) });
      if (r.ok) say('Tersimpan ✓');
      else { const j = await r.json().catch(() => ({})); say('Gagal menyimpan'); alert('Gagal menyimpan: ' + (j.error || r.status)); }
    }).catch(e => { console.error(e); say('Gagal menyimpan'); });
    return saving;
  }

  // ---------- tampilan ----------
  function fit(img, it) {
    const a = img.naturalWidth / img.naturalHeight; let bw, bh;
    if (a > 1) { bh = 100; bw = 100 * a; } else { bw = 100; bh = 100 / a; }
    img.style.width = bw * it.scale + '%'; img.style.height = bh * it.scale + '%';
    img.style.left = it.pctX + '%'; img.style.top = it.pctY + '%';
  }
  function tile(a, it, ii) {
    const shiny = it.t === 'p' && isShiny(it.name);
    const t = el('div', 'acc-tile' + (shiny ? ' shiny' : '') + (it.t === 'v' ? ' vid' : ''));
    if (it.t === 'p') {
      const img = new Image(); img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
      img.style.width = '100%'; img.style.height = '100%'; img.style.left = '0'; img.style.top = '0';
      img.onload = () => fit(img, it); img.src = it.thumb; t.appendChild(img);
      if (shiny) t.appendChild(el('span', 'acc-badge', 'SHINY'));
    } else t.appendChild(el('span', 'acc-play', '▶'));
    t.onclick = e => { e.stopPropagation(); isAdmin ? itemMenu(e, a, ii) : openViewer(a, ii); };
    t.oncontextmenu = e => { if (isAdmin) { e.preventDefault(); itemMenu(e, a, ii); } };
    return t;
  }
  function row(a, ai) {
    const r = el('section', 'acc-row'), head = el('div', 'acc-head');
    head.appendChild(el('span', 'acc-name', a.name || 'Tanpa nama'));
    const pk = a.items.filter(i => i.t === 'p'), vd = a.items.filter(i => i.t === 'v'), sh = pk.filter(i => isShiny(i.name)).length;
    const meta = [pk.length + ' Pokémon']; if (sh) meta.push(sh + ' SHINY'); if (vd.length) meta.push(vd.length + ' video');
    head.appendChild(el('span', 'acc-meta', meta.join(' · ')));
    if (isAdmin) {
      const tools = el('span', 'acc-tools');
      [['+ Gambar', 'Tambah gambar', () => { pickFor = a; file.click(); }], ['+ Video', 'Tambah video TikTok', () => addVideo(a)],
       ['✎', 'Ganti nama', () => rename(a)], ['▲', 'Naikkan', () => moveAcc(ai, -1)], ['▼', 'Turunkan', () => moveAcc(ai, 1)],
       ['🗑', 'Hapus akun', () => delAcc(ai)]].forEach(([t, ttl, f]) => { const b = el('button', 'acc-btn', t, { title: ttl, 'aria-label': ttl, type: 'button' }); b.onclick = f; tools.appendChild(b); });
      head.appendChild(tools);
    }
    const strip = el('div', 'acc-strip');
    a.items.forEach((it, ii) => strip.appendChild(tile(a, it, ii)));
    if (!a.items.length) strip.appendChild(el('span', 'acc-none', 'Kosong'));
    r.append(head, strip); return r;
  }
  function render() {
    view.textContent = '';
    if (isAdmin) { const bar = el('div', 'acc-bar'), b = el('button', 'acc-btn', '+ Akun', { type: 'button' }); b.onclick = addAccount; bar.appendChild(b); view.appendChild(bar); }
    accounts.forEach((a, ai) => view.appendChild(row(a, ai)));
    if (!accounts.length && isAdmin) view.appendChild(el('p', 'acc-empty', 'Belum ada akun. Klik "+ Akun".'));
  }

  // ---------- buka / tutup halaman ----------
  async function toggle(force) {
    open = force === undefined ? !open : force;
    grid.style.display = open ? 'none' : '';
    view.classList.toggle('on', open);
    $('searchContainer').style.visibility = open ? 'hidden' : '';
    const up = $('bulkUploadBtn'); if (up) up.style.visibility = open ? 'hidden' : '';
    btn.textContent = open ? '← Galeri' : 'Account'; btn.classList.toggle('active', open);
    try { history.replaceState(null, '', open ? '#account' : location.pathname + location.search); } catch (e) {}
    scrollTo(0, 0);
    if (open) { if (!loaded) await load(isAdmin); render(); }
  }
  btn.onclick = () => toggle();
  addEventListener('pg-login', async () => { if (open) { await load(true); render(); } else loaded = false; });
  if (location.hash === '#account') toggle(true);

  // ---------- kelola akun & isi (admin) ----------
  function addAccount() { const n = prompt('Nama akun:'); if (!n || !n.trim()) return; accounts.unshift({ id: newId(), name: n.trim().slice(0, 60), items: [] }); render(); saveAcc(); }
  function rename(a) { const n = prompt('Nama akun:', a.name); if (!n || !n.trim()) return; a.name = n.trim().slice(0, 60); render(); saveAcc(); }
  function delAcc(i) { if (!confirm('Hapus akun "' + accounts[i].name + '" beserta isinya?')) return; accounts.splice(i, 1); render(); saveAcc(); }
  function moveAcc(i, d) { const j = i + d; if (j < 0 || j >= accounts.length) return; [accounts[i], accounts[j]] = [accounts[j], accounts[i]]; render(); saveAcc(); }
  function moveItem(a, i, d) { const j = i + d; if (j < 0 || j >= a.items.length) return; [a.items[i], a.items[j]] = [a.items[j], a.items[i]]; render(); saveAcc(); }
  function delItem(a, i) { if (!confirm('Hapus item ini?')) return; a.items.splice(i, 1); render(); saveAcc(); }
  function itemMenu(e, a, ii) {
    const it = a.items[ii], m = $('contextMenu'); m.textContent = '';
    const add = (t, f, c) => { const d = el('div', 'context-item', t); if (c) d.style.color = c; d.onclick = () => { closeContextMenu(); f(); }; m.appendChild(d); };
    add('Lihat', () => openViewer(a, ii));
    if (it.t === 'p') add('Edit sorotan', () => openEdit(a, it));
    add('Geser ke kiri', () => moveItem(a, ii, -1)); add('Geser ke kanan', () => moveItem(a, ii, 1));
    add('Hapus', () => delItem(a, ii), '#dc3545');
    openMenu(e.pageX, e.pageY);
  }

  // video TikTok: ambil ID dari link
  async function ttId(link) {
    const m = /\/(?:video|player\/v1|embed\/v2|embed)\/(\d{10,25})/.exec(link);
    if (m) return m[1];
    if (/^\d{10,25}$/.test(link)) return link;
    const r = await api('/api/tiktok?url=' + encodeURIComponent(link)), j = await r.json().catch(() => ({}));
    if (!r.ok || !j.id) throw new Error(j.error || 'gagal');
    return j.id;
  }
  async function addVideo(a) {
    const link = prompt('Tempel link video TikTok (videonya harus publik):'); if (!link || !link.trim()) return;
    try { const tt = await ttId(link.trim()); a.items.push({ t: 'v', id: newId(), tt }); render(); await saveAcc(); }
    catch (e) { alert('Link tidak bisa dibaca (' + e.message + ').\nCoba tempel link panjang: tiktok.com/@nama/video/angka (dari address bar browser).'); }
  }

  // upload gambar ke akun: versi besar (maks 1400px, dari galeri) + versi kecil untuk baris
  function shrink(dataUrl, side, q) {
    return new Promise((ok, no) => {
      const im = new Image();
      im.onload = () => {
        const k = Math.min(1, side / Math.min(im.width, im.height)), c = document.createElement('canvas');
        c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
        const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
        c.toBlob(b => b ? ok(b) : no(new Error('gagal memperkecil')), 'image/jpeg', q);
      };
      im.onerror = () => no(new Error('bukan gambar')); im.src = dataUrl;
    });
  }
  async function up(path, blob) {
    const r = await api('/api/upload?path=' + encodeURIComponent(path), { method: 'POST', headers: { 'content-type': 'image/jpeg' }, body: blob });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.status);
    return (await r.json()).url;
  }
  file.onchange = async e => {
    const a = pickFor, files = [...e.target.files].filter(f => f.type.startsWith('image/')); e.target.value = '';
    if (!a || !files.length) return;
    const modal = $('progressModal'), text = $('progressText'), bar = $('progressBar');
    modal.style.display = 'flex'; bar.style.width = '0%'; let fail = 0;
    for (let i = 0; i < files.length; i++) {
      text.innerText = `Mengupload ${i + 1} dari ${files.length}...`;
      try {
        const { src, pctY } = await resizeImageForDB(files[i]);
        const full = await (await fetch(src)).blob(), small = await shrink(src, 420, 0.8), id = newId();
        const u1 = await up('acc/' + id + '.jpg', full), u2 = await up('acc/' + id + 't.jpg', small);
        a.items.push({ t: 'p', id, src: u1, thumb: u2, name: formatName(files[i].name), scale: 1, pctX: 0, pctY });
      } catch (err) { fail++; console.error(err); }
      bar.style.width = ((i + 1) / files.length * 100) + '%';
    }
    modal.style.display = 'none'; render(); await saveAcc();
    if (fail) alert(fail + ' gambar gagal diupload.');
  };

  // edit sorotan: memakai jendela "Edit Sorotan" yang sama dengan galeri
  function openEdit(a, it) {
    edit = { a, it }; const img = $('previewImg');
    img.src = it.src; $('imgNameInput').value = it.name || '';
    currentImgScale = it.scale || 1; currentImgPctX = it.pctX || 0; currentImgPctY = it.pctY || 0;
    $('zoomSlider').value = currentImgScale;
    img.onload = () => { currentAspect = img.naturalWidth / img.naturalHeight; updatePreviewImg(); };
    openModal('editModal');
  }
  const _save = window.saveEdit, _apply = window.applyToAll, _close = window.closeModal;
  window.saveEdit = async function () {
    if (!edit) return _save.apply(this, arguments);
    const { it } = edit; it.name = $('imgNameInput').value; it.scale = currentImgScale; it.pctX = currentImgPctX; it.pctY = currentImgPctY;
    render(); closeModal('editModal'); await saveAcc();
  };
  window.applyToAll = async function () {
    if (!edit) return _apply.apply(this, arguments);
    if (!confirm('Terapkan zoom & posisi ini ke SEMUA gambar di akun ini?')) return;
    const { a } = edit; a.items.forEach(i => { if (i.t === 'p') { i.scale = currentImgScale; i.pctX = currentImgPctX; i.pctY = currentImgPctY; } });
    render(); closeModal('editModal'); await saveAcc();
  };
  window.closeModal = function (id) { if (id === 'editModal') edit = null; return _close.apply(this, arguments); };

  // ---------- pemutar: gambar penuh atau video TikTok ----------
  function showViewer() {
    const it = vw.a.items[vw.i], st = $('accStage'); st.textContent = '';
    if (it.t === 'p') {
      const im = new Image(); im.alt = ''; im.src = it.thumb; st.appendChild(im);
      const big = new Image(); big.onload = () => { if (vw && vw.a.items[vw.i] === it) im.src = it.src; }; big.src = it.src;
    } else {
      const f = document.createElement('iframe'); f.src = PLAYER(it.tt);
      f.allow = 'autoplay; fullscreen; encrypted-media; picture-in-picture; clipboard-write'; f.setAttribute('allowfullscreen', '');
      st.appendChild(f);
    }
    viewer.classList.add('on'); document.body.style.overflow = 'hidden';
  }
  function openViewer(a, i) { vw = { a, i }; showViewer(); }
  function closeViewer() { vw = null; $('accStage').textContent = ''; viewer.classList.remove('on'); document.body.style.overflow = ''; }
  function nav(d) { if (!vw) return; const n = vw.a.items.length; vw.i = (vw.i + d + n) % n; showViewer(); }
  viewer.querySelector('.acc-vx').onclick = closeViewer;
  viewer.querySelector('.acc-vn.l').onclick = () => nav(-1);
  viewer.querySelector('.acc-vn.r').onclick = () => nav(1);
  viewer.addEventListener('click', e => { if (e.target === viewer || e.target.id === 'accStage') closeViewer(); });
  addEventListener('keydown', e => {
    if (!vw) return;
    if (e.key === 'Escape') closeViewer(); if (e.key === 'ArrowRight') nav(1); if (e.key === 'ArrowLeft') nav(-1);
  });
})();
