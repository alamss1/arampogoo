// Menyimpan akun (urutan, nama, isi). Juga membersihkan gambar akun yang sudah dihapus.
const { isAdmin, deny } = require('./_auth');
const ID = /^[a-z0-9]{6,40}$/, TT = /^\d{10,25}$/;
const num = (v, d, lo, hi) => { v = Number(v); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
const blobUrl = s => { try { return new URL(s).hostname.endsWith('.blob.vercel-storage.com') ? s : null; } catch { return null; } };
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  if (!isAdmin(req)) return deny(res);
  const bad = m => res.status(400).json({ error: m });
  try {
    if (!Array.isArray(req.body) || req.body.length > 300) return bad('data tidak valid');
    const accounts = [];
    for (const a of req.body) {
      const id = String(a.id);
      if (!ID.test(id) || !Array.isArray(a.items) || a.items.length > 500) return bad('akun tidak valid');
      const items = [];
      for (const it of a.items) {
        const iid = String(it.id);
        if (!ID.test(iid)) return bad('item tidak valid');
        if (it.t === 'p') {
          const src = blobUrl(String(it.src)), thumb = blobUrl(String(it.thumb));
          if (!src || !thumb) return bad('gambar tidak valid');
          items.push({ t: 'p', id: iid, src, thumb, name: String(it.name || '').slice(0, 120),
            scale: num(it.scale, 1, 1, 3), pctX: num(it.pctX, 0, -3000, 3000), pctY: num(it.pctY, 0, -3000, 3000) });
        } else if (it.t === 'v') {
          if (!TT.test(String(it.tt))) return bad('video tidak valid');
          items.push({ t: 'v', id: iid, tt: String(it.tt) });
        } else return bad('jenis item tidak valid');
      }
      accounts.push({ id, name: String(a.name || '').slice(0, 60), items });
    }
    const { put, list, del } = await import('@vercel/blob');
    const key = 'accmeta/' + String(Date.now()).padStart(15, '0') + '.json';
    await put(key, JSON.stringify(accounts), { access: 'public', addRandomSuffix: false, contentType: 'application/json' });

    // hapus manifest lama + gambar akun yang tidak dipakai lagi (dan lebih tua dari 2 menit)
    const used = new Set();
    accounts.forEach(a => a.items.forEach(i => { if (i.t === 'p') { used.add('acc/' + i.id + '.jpg'); used.add('acc/' + i.id + 't.jpg'); } }));
    const old = [];
    for (const prefix of ['accmeta/', 'acc/']) {
      let cursor;
      do {
        const r = await list({ prefix, cursor, limit: 1000 });
        for (const b of r.blobs) {
          if (prefix === 'accmeta/' && b.pathname !== key) old.push(b.url);
          if (prefix === 'acc/' && !used.has(b.pathname) && Date.now() - new Date(b.uploadedAt) > 120000) old.push(b.url);
        }
        cursor = r.hasMore ? r.cursor : undefined;
      } while (cursor);
    }
    if (old.length) await del(old);
    res.status(200).json({ ok: true, removed: old.length });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
};
