const { isAdmin, deny } = require('./_auth');
module.exports = async (req, res) => {
  if (!isAdmin(req)) return deny(res);
  res.status(200).json({ ok: true });
};
