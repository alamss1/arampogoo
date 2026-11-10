// Menyimpan urutan, nama, zoom & posisi sorotan. Juga membersihkan gambar yang sudah dihapus.
const { isAdmin, deny } = require('./_auth');
const ID = /^[a-z0-9]{6,40}$/;
const num = (v, d, lo, hi) => { v = Number(v); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  if (!isAdmin(req)) return deny(res);
  try {
    if (!Array.isArray(req.body) || req.body.length > 3000) return res.status(400).json({ error: 'data tidak valid' });
    const items = [];
    for (const d of req.body) {
      const id = String(d.id), src = String(d.src);
      let host = ''; try { host = new URL(src).hostname; } catch {}
      if (!ID.test(id) || !host.endsWith('.blob.vercel-storage.com')) return res.status(400).json({ error: 'item tidak valid' });
      items.push({ id, src, name: String(d.name || '').slice(0, 120),
        scale: num(d.scale, 1, 1, 3), pctX: num(d.pctX, 0, -3000, 3000), pctY: num(d.pctY, 0, -3000, 3000) });
    }
    const { put, list, del } = await import('@vercel/blob');
    const key = 'meta/' + String(Date.now()).padStart(15, '0') + '.json';
    await put(key, JSON.stringify(items), { access: 'public', addRandomSuffix: false, contentType: 'application/json' });

    // hapus manifest lama + gambar yatim (tidak dipakai & lebih tua dari 2 menit)
    const used = new Set(items.map(i => 'images/' + i.id + '.jpg'));
    const old = [];
    for (const prefix of ['meta/', 'images/']) {
      let cursor;
      do {
        const r = await list({ prefix, cursor, limit: 1000 });
        for (const b of r.blobs) {
          if (prefix === 'meta/' && b.pathname !== key) old.push(b.url);
          if (prefix === 'images/' && !used.has(b.pathname) && Date.now() - new Date(b.uploadedAt) > 120000) old.push(b.url);
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
