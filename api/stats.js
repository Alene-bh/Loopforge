const { setJson, getSessionUser, saveUser, normalizeStats } = require("./_lib/redis");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return setJson(res, 405, { error: "Method not allowed" });

  try {
    const user = await getSessionUser(req);
    if (!user) return setJson(res, 401, { error: "No autenticado" });

    const body = typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}");
    const incomingStats = normalizeStats(body.stats);

    user.elo = Math.max(100, Math.floor(Number(body.elo) || user.elo || 100));
    user.placementComplete = !!body.placementComplete;
    user.stats = incomingStats;

    await saveUser(user);
    return setJson(res, 200, { ok: true, user });
  } catch (error) {
    return setJson(res, 500, { error: error.message });
  }
};
