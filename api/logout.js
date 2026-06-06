const { setJson } = require("./_lib/redis");

module.exports = async function handler(req, res) {
  res.setHeader("Set-Cookie", "lf_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure");
  return setJson(res, 200, { ok: true });
};
