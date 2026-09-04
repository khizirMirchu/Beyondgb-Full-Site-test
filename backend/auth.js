const crypto = require("crypto");
const db = require("./database");

const SESSION_COOKIE = "beyondgb_admin_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt}$${derived.toString("hex")}`;
}

function verifyPassword(password, stored) {
  try {
    const [scheme, n, r, p, salt, hash] = stored.split("$");
    if (scheme !== "scrypt" || !n || !r || !p || !salt || !hash) return false;
    const derived = crypto.scryptSync(password, salt, 64, {
      N: Number(n), r: Number(r), p: Number(p)
    });
    const expected = Buffer.from(hash, "hex");
    return expected.length === derived.length && crypto.timingSafeEqual(expected, derived);
  } catch (_) {
    return false;
  }
}

function parseCookies(header = "") {
  return Object.fromEntries(header.split(";").map((part) => {
    const index = part.indexOf("=");
    if (index < 0) return ["", ""];
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }).filter(([key]) => key));
}

function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_MS / 1000}${secure}`);
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}

function createSession(adminId) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  db.prepare("INSERT INTO admin_sessions (admin_id, token_hash, expires_at) VALUES (?, ?, ?)").run(adminId, tokenHash, expiresAt);
  return token;
}

function destroySession(token) {
  if (!token) return;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  db.prepare("DELETE FROM admin_sessions WHERE token_hash = ?").run(tokenHash);
}

function getAdminFromRequest(req) {
  const cookies = parseCookies(req.headers.cookie || "");
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const row = db.prepare(`
    SELECT a.id, a.username, s.expires_at
    FROM admin_sessions s
    JOIN admins a ON a.id = s.admin_id
    WHERE s.token_hash = ? AND s.expires_at > CURRENT_TIMESTAMP
  `).get(tokenHash);

  if (!row) return null;
  return { id: row.id, username: row.username, token };
}

function requireAdmin(req, res, next) {
  const admin = getAdminFromRequest(req);
  if (!admin) return res.status(401).json({ success: false, message: "Admin authentication required." });
  req.admin = admin;
  next();
}

module.exports = {
  SESSION_COOKIE,
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  setSessionCookie,
  clearSessionCookie,
  getAdminFromRequest,
  requireAdmin
};
