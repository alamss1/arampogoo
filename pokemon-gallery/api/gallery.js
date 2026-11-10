// Mengambil daftar gambar + pengaturan sorotan (manifest terbaru di Blob)
module.exports = async (req, res) => {
  try {
    const { list } = await import('@vercel/blob');
    const r = await list({ prefix: 'meta/', limit: 1000 });
    const newest = r.blobs.sort((a, b) => b.pathname.localeCompare(a.pathname))[0];
    let data = [];
    if (newest) { const f = await fetch(newest.url); if (f.ok) data = await f.json(); }
    res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=50');
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
};
