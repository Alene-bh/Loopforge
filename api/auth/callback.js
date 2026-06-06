const crypto = require("crypto");
const { redis, key, getBaseUrl, saveUser, normalizeStats } = require("../_lib/redis");

module.exports = async function handler(req, res) {
  const baseUrl = getBaseUrl(req);
  const code = req.query?.code;

  if (!code) {
    res.statusCode = 302;
    res.setHeader("Location", `${baseUrl}/?discord=missing_code`);
    res.end();
    return;
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    res.statusCode = 500;
    res.end("Faltan DISCORD_CLIENT_ID o DISCORD_CLIENT_SECRET en Vercel.");
    return;
  }

  const redirectUri = `${baseUrl}/api/auth/callback`;
  const params = new URLSearchParams();
  params.set("client_id", clientId);
  params.set("client_secret", clientSecret);
  params.set("grant_type", "authorization_code");
  params.set("code", code);
  params.set("redirect_uri", redirectUri);

  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params
  });

  const tokenData = await tokenRes.json();

  if (!tokenRes.ok) {
    res.statusCode = 302;
    res.setHeader("Location", `${baseUrl}/?discord=token_error`);
    res.end();
    return;
  }

  const userRes = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  });

  const discord = await userRes.json();

  if (!userRes.ok || !discord.id) {
    res.statusCode = 302;
    res.setHeader("Location", `${baseUrl}/?discord=user_error`);
    res.end();
    return;
  }

  const defaultAvatarIndex = Number(discord.discriminator || 0) % 5;
  const avatar = discord.avatar
    ? `https://cdn.discordapp.com/avatars/${discord.id}/${discord.avatar}.png?size=128`
    : `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;

  const rawExisting = await redis(["GET", key(`user:${discord.id}`)]).catch(() => null);
  const existing = rawExisting ? JSON.parse(rawExisting) : {};

  const user = {
    id: discord.id,
    username: discord.global_name || discord.username || "Jugador Discord",
    avatar,
    elo: Number(existing.elo) || 100,
    placementComplete: !!existing.placementComplete,
    stats: normalizeStats(existing.stats),
    createdAt: existing.createdAt || new Date().toISOString()
  };

  await saveUser(user);

  const sessionToken = crypto.randomBytes(32).toString("hex");
  await redis(["SET", key(`session:${sessionToken}`), discord.id, "EX", 60 * 60 * 24 * 30]);

  res.statusCode = 302;
  res.setHeader(
    "Set-Cookie",
    `lf_session=${encodeURIComponent(sessionToken)}; Path=/; Max-Age=${60 * 60 * 24 * 30}; HttpOnly; SameSite=Lax; Secure`
  );
  res.setHeader("Location", `${baseUrl}/?discord=ok`);
  res.end();
};
