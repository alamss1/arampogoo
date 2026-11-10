const { isAdmin, deny } = require('./_auth');
const MAX = 4.4 * 1024 * 1024; // batas body fungsi Vercel ~4.5MB
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  if (!isAdmin(req)) return deny(res);
  const path = String(req.query.path || '');
  if (!/^images\/[a-z0-9]{6,40}\.jpg$/.test(path)) return res.status(400).json({ error: 'path tidak valid' });
  try {
    const chunks = []; let size = 0;
    for await (const c of req) {
      size += c.length;
      if (size > MAX) return res.status(413).json({ error: 'file terlalu besar' });
      chunks.push(c);
    }
    const { put } = await import('@vercel/blob');
    const blob = await put(path, Buffer.concat(chunks), {
      access: 'public', addRandomSuffix: false, contentType: 'image/jpeg'
    });
    res.status(200).json({ url: blob.url });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
};
