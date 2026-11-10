// Server lokal untuk mencoba website tanpa Vercel. Jalankan: node server.js
// Data disimpan di folder ./local-data (tidak ikut ke Vercel/GitHub).
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const PORT = process.env.PORT || 3000;
const PW = process.env.ADMIN_PASSWORD || 'admin';   // password lokal; ganti: ADMIN_PASSWORD=... node server.js
const ROOT = __dirname, DATA = path.join(ROOT, 'local-data'), IMG = path.join(DATA, 'images'), GAL = path.join(DATA, 'gallery.json');
fs.mkdirSync(IMG, { recursive: true });

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const json = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(obj)); };
const sha = s => crypto.createHash('sha256').update(String(s)).digest();
const isAdmin = req => { const g = req.headers['x-password']; return !!g && crypto.timingSafeEqual(sha(g), sha(PW)); };
const body = req => new Promise((ok, no) => {
  const c = []; let n = 0;
  req.on('data', d => { n += d.length; if (n > 20e6) { no(new Error('terlalu besar')); req.destroy(); } else c.push(d); });
  req.on('end', () => ok(Buffer.concat(c))); req.on('error', no);
});
const ID = /^[a-z0-9]{6,40}$/;

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost'), p = url.pathname;

    if (p === '/api/gallery' && req.method === 'GET')
      return json(res, 200, fs.existsSync(GAL) ? JSON.parse(fs.readFileSync(GAL, 'utf8')) : []);

    if (p.startsWith('/api/')) {
      if (req.method !== 'POST') return json(res, 405, { error: 'method' });
      if (!isAdmin(req)) return json(res, 401, { error: 'password salah' });
      if (p === '/api/login') return json(res, 200, { ok: true });
      if (p === '/api/upload') {
        const m = /^images\/([a-z0-9]{6,40})\.jpg$/.exec(String(url.searchParams.get('path') || ''));
        if (!m) return json(res, 400, { error: 'path tidak valid' });
        fs.writeFileSync(path.join(IMG, m[1] + '.jpg'), await body(req));
        return json(res, 200, { url: '/local-data/images/' + m[1] + '.jpg' });
      }
      if (p === '/api/save') {
        const arr = JSON.parse((await body(req)).toString());
        if (!Array.isArray(arr) || arr.some(d => !ID.test(String(d.id)))) return json(res, 400, { error: 'data tidak valid' });
        fs.writeFileSync(GAL, JSON.stringify(arr));
        const used = new Set(arr.map(d => d.id + ".jpg")); // gambar yatim >2 menit dihapus, seperti di Vercel
        for (const f of fs.readdirSync(IMG))
          if (!used.has(f) && Date.now() - fs.statSync(path.join(IMG, f)).mtimeMs > 120000) fs.rmSync(path.join(IMG, f), { force: true });
        return json(res, 200, { ok: true });
      }
      return json(res, 404, { error: 'tidak ada' });
    }

    let rel = decodeURIComponent(p);
    if (rel === '/') rel = '/index.html';
    const file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT + path.sep) || /(^|[\\/])\./.test(rel) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404); return res.end('404');
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  } catch (e) { json(res, 500, { error: String(e.message || e) }); }
}).listen(PORT, () => console.log(`\nGaleri : http://localhost:${PORT}\nAdmin  : klik kanan (atau tekan lama) pojok kanan atas halaman -> menu -> login (password: ${PW === 'admin' ? 'admin' : 'dari ADMIN_PASSWORD'})\n`));
