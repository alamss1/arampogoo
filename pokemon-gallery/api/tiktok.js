// Mengambil ID video dari link TikTok (termasuk link pendek vt.tiktok.com / vm.tiktok.com). Hanya admin.
const { isAdmin, deny } = require('./_auth');
const HOST = /(^|\.)tiktok\.com$/i;
const FIND = /\/(?:video|player\/v1|embed\/v2|embed)\/(\d{10,25})/;
module.exports = async (req, res) => {
  if (!isAdmin(req)) return deny(res);
  try {
    let u; try { u = new URL(String(req.query.url || '').trim()); } catch { return res.status(400).json({ error: 'link tidak valid' }); }
    if (!HOST.test(u.hostname)) return res.status(400).json({ error: 'bukan link TikTok' });
    let m = FIND.exec(u.href);
    if (!m) {
      const r = await fetch(u.href, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36' } });
      if (!HOST.test(new URL(r.url).hostname)) return res.status(400).json({ error: 'link dialihkan ke situs lain' });
      m = FIND.exec(r.url);
      if (!m) m = /\/video\/(\d{15,25})/.exec((await r.text()).slice(0, 300000));
    }
    if (!m) return res.status(422).json({ error: 'ID video tidak ditemukan' });
    res.status(200).json({ id: m[1] });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
};
