const crypto = require('crypto');
const h = s => crypto.createHash('sha256').update(String(s)).digest();
exports.isAdmin = req => {
  const pw = process.env.ADMIN_PASSWORD;
  const given = req.headers['x-password'];
  if (!pw || !given) return false;
  return crypto.timingSafeEqual(h(pw), h(given));
};
exports.deny = async res => {
  await new Promise(r => setTimeout(r, 700)); // memperlambat tebak-tebakan password
  res.status(401).json({ error: 'password salah' });
};
