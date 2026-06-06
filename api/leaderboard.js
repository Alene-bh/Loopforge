const { redis, key, setJson, getSessionUser, getRankName, getWinrate } = require("./_lib/redis");

module.exports = async function handler(req, res) {
  try {
    const me = await getSessionUser(req);
    if (!me) return setJson(res, 401, { error: "No autenticado" });

    const ids = await redis(["SMEMBERS", key("players")]);
    const players = [];

    for (const id of ids || []) {
      const raw = await redis(["GET", key(`user:${id}`)]);
      if (!raw) continue;

      const user = JSON.parse(raw);
      const stats = user.stats || {};

      players.push({
        id: user.id,
        name: user.username,
        avatar: user.avatar,
        rank: getRankName(user.elo, user.placementComplete),
        winrate: getWinrate(stats),
        matches: Number(stats.matches) || 0,
        elo: Number(user.elo) || 100,
        isYou: user.id === me.id
      });
    }

    players.sort((a, b) => {
      if (b.winrate !== a.winrate) return b.winrate - a.winrate;
      if (b.elo !== a.elo) return b.elo - a.elo;
      return b.matches - a.matches;
    });

    return setJson(res, 200, { players: players.slice(0, 50) });
  } catch (error) {
    return setJson(res, 500, { error: error.message });
  }
};
