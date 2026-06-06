const { getBaseUrl } = require("../_lib/redis");

module.exports = async function handler(req, res) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) {
    res.statusCode = 500;
    res.end("Falta DISCORD_CLIENT_ID en Vercel.");
    return;
  }

  const redirectUri = `${getBaseUrl(req)}/api/auth/callback`;
  const url = new URL("https://discord.com/api/oauth2/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "identify");
  url.searchParams.set("prompt", "none");

  res.statusCode = 302;
  res.setHeader("Location", url.toString());
  res.end();
};
