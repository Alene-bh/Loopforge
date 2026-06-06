const { setJson, getSessionUser } = require("./_lib/redis");

module.exports = async function handler(req, res) {
  try {
    const user = await getSessionUser(req);
    if (!user) return setJson(res, 200, { authenticated: false });
    return setJson(res, 200, { authenticated: true, user });
  } catch (error) {
    return setJson(res, 500, { error: error.message });
  }
};
