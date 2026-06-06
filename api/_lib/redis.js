const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

const KEY_PREFIX = "loopforge:";

function key(name) {
  return `${KEY_PREFIX}${name}`;
}

async function redis(command) {
  if (!REDIS_URL || !REDIS_TOKEN) {
    throw new Error("Redis no configurado. Agregá UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN en Vercel.");
  }

  const response = await fetch(REDIS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(command)
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error || `Redis error ${response.status}`);
  }

  return data.result;
}

function getCookie(req, name) {
  const raw = req.headers.cookie || "";
  const found = raw
    .split(";")
    .map(x => x.trim())
    .find(x => x.startsWith(`${name}=`));

  if (!found) return null;
  return decodeURIComponent(found.slice(name.length + 1));
}

function setJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function getBaseUrl(req) {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");

  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  return `${proto}://${host}`;
}

function getRankName(elo = 100, placementComplete = false) {
  if (!placementComplete) return "Unranked";
  if (elo >= 2700) return "Loopforger";
  if (elo >= 2000) return "Arconte";
  if (elo >= 1500) return "Maestro";
  if (elo >= 1100) return "Diamante";
  if (elo >= 800) return "Platino";
  if (elo >= 550) return "Oro";
  if (elo >= 350) return "Plata";
  if (elo >= 200) return "Bronce";
  return "Hierro";
}

function normalizeStats(stats = {}) {
  return {
    wins: Number(stats.wins) || 0,
    losses: Number(stats.losses) || 0,
    matches: Number(stats.matches) || 0,
    machineUsage: stats.machineUsage && typeof stats.machineUsage === "object" ? stats.machineUsage : {}
  };
}

function getWinrate(stats = {}) {
  stats = normalizeStats(stats);
  if (!stats.matches) return 0;
  return Math.round((stats.wins / stats.matches) * 100);
}

async function getSessionUser(req) {
  const token = getCookie(req, "lf_session");
  if (!token) return null;

  const userId = await redis(["GET", key(`session:${token}`)]);
  if (!userId) return null;

  const raw = await redis(["GET", key(`user:${userId}`)]);
  if (!raw) return null;

  return JSON.parse(raw);
}

async function saveUser(user) {
  user.updatedAt = new Date().toISOString();

  await redis(["SET", key(`user:${user.id}`), JSON.stringify(user)]);
  await redis(["SADD", key("players"), user.id]);
}

module.exports = {
  redis,
  key,
  getCookie,
  setJson,
  getBaseUrl,
  getRankName,
  normalizeStats,
  getWinrate,
  getSessionUser,
  saveUser
};
