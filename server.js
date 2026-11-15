"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const express = require("express");
const helmet = require("helmet");

const root = __dirname;
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "127.0.0.1";
const origin = process.env.APP_ORIGIN || `http://127.0.0.1:${port}`;
const originUrl = new URL(origin);
if (originUrl.origin !== origin || !["http:", "https:"].includes(originUrl.protocol)) {
  throw new Error("APP_ORIGIN debe ser un origen HTTP o HTTPS, sin ruta ni barra final.");
}
if (process.env.NODE_ENV === "production" && originUrl.protocol !== "https:") {
  throw new Error("En producción, APP_ORIGIN debe usar HTTPS.");
}

const dataDir = path.resolve(process.env.DATA_DIR || path.join(root, "data"));
fs.mkdirSync(dataDir, { recursive: true });
const db = new DatabaseSync(path.join(dataDir, "nomade.sqlite"));
db.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL COLLATE NOCASE UNIQUE,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
    password_salt TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    must_change_password INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
`);

function validUsername(value) {
  return typeof value === "string" && /^[a-zA-Z0-9._-]{3,64}$/.test(value);
}
function validPassword(value) {
  return typeof value === "string" && value.length >= 12 && Buffer.byteLength(value, "utf8") <= 256;
}
function passwordHash(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}
function makePassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  return { salt, hash: passwordHash(password, salt) };
}
function passwordMatches(password, salt, hash) {
  const candidate = Buffer.from(passwordHash(password, salt), "hex");
  return crypto.timingSafeEqual(candidate, Buffer.from(hash, "hex"));
}
function publicUser(user) {
  return { id: user.id, username: user.username, displayName: user.display_name, role: user.role, mustChangePassword: Boolean(user.must_change_password) };
}

if (db.prepare("SELECT COUNT(*) AS count FROM users").get().count === 0) {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!validUsername(username) || !validPassword(password)) {
    throw new Error("Configure ADMIN_USERNAME (3-64 caracteres) y ADMIN_PASSWORD (mínimo 12 caracteres) para crear el primer administrador.");
  }
  const credentials = makePassword(password);
  db.prepare("INSERT INTO users (username, display_name, role, password_salt, password_hash) VALUES (?, ?, 'admin', ?, ?)")
    .run(username, "Administrador", credentials.salt, credentials.hash);
}

const app = express();
app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: { directives: { styleSrc: ["'self'", "'unsafe-inline'"] } }
}));
app.use(express.json({ limit: "16kb" }));
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  if (req.method !== "GET" && req.get("origin") !== origin) {
    return res.status(403).json({ error: "Origen no autorizado." });
  }
  next();
});

const sessionDuration = 8 * 60 * 60 * 1000;
const secureCookie = originUrl.protocol === "https:";
const cookieOptions = { httpOnly: true, sameSite: "strict", secure: secureCookie, path: "/" };
const dummySalt = "00000000000000000000000000000000";
const dummyHash = passwordHash("not-a-real-password", dummySalt);
const attempts = new Map();
const attemptWindow = 15 * 60 * 1000;

function sessionToken(req) {
  const match = /(?:^|;\s*)nomade_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || "");
  return match && match[1];
}
function tokenHash(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
function authenticatedUser(req) {
  const token = sessionToken(req);
  if (!token) return null;
  return db.prepare(`SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?`).get(tokenHash(token), Date.now()) || null;
}
function requireUser(req, res, next) {
  const user = authenticatedUser(req);
  if (!user) return res.status(401).json({ error: "Inicia sesión para continuar." });
  req.user = user;
  if (user.must_change_password) return res.status(403).json({ error: "Debes cambiar tu contraseña temporal." });
  next();
}
function requireAdmin(req, res, next) {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Solo el administrador puede realizar esta acción." });
  next();
}

app.get("/api/session", (req, res) => {
  const user = authenticatedUser(req);
  res.json({ user: user ? publicUser(user) : null });
});

app.post("/api/login", (req, res) => {
  const now = Date.now();
  for (const [key, timestamps] of attempts) {
    if (timestamps.every(timestamp => now - timestamp >= attemptWindow)) attempts.delete(key);
  }
  const key = req.ip;
  const recent = (attempts.get(key) || []).filter(timestamp => now - timestamp < attemptWindow);
  if (recent.length >= 10) return res.status(429).json({ error: "Demasiados intentos. Espera 15 minutos." });
  const { username, password, role } = req.body || {};
  const safeUsername = validUsername(username) ? username : "";
  const safePassword = typeof password === "string" && Buffer.byteLength(password, "utf8") <= 256 ? password : "";
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(safeUsername);
  const matches = passwordMatches(safePassword, user ? user.password_salt : dummySalt, user ? user.password_hash : dummyHash);
  if (!user || !matches || !["admin", "user"].includes(role) || user.role !== role) {
    recent.push(now);
    attempts.set(key, recent);
    return res.status(401).json({ error: "Usuario, contraseña o tipo de acceso incorrectos." });
  }
  attempts.delete(key);
  const previous = sessionToken(req);
  if (previous) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash(previous));
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(now);
  const token = crypto.randomBytes(32).toString("hex");
  db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").run(tokenHash(token), user.id, now + sessionDuration);
  res.cookie("nomade_session", token, { ...cookieOptions, maxAge: sessionDuration });
  res.json({ user: publicUser(user) });
});

app.post("/api/logout", (req, res) => {
  const token = sessionToken(req);
  if (token) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash(token));
  res.clearCookie("nomade_session", cookieOptions);
  res.json({ ok: true });
});

app.post("/api/password", (req, res) => {
  const user = authenticatedUser(req);
  if (!user) return res.status(401).json({ error: "Inicia sesión para continuar." });
  const { currentPassword, newPassword } = req.body || {};
  if (typeof currentPassword !== "string" || Buffer.byteLength(currentPassword, "utf8") > 256 ||
      !passwordMatches(currentPassword, user.password_salt, user.password_hash)) {
    return res.status(400).json({ error: "La contraseña actual es incorrecta." });
  }
  if (!validPassword(newPassword) || currentPassword === newPassword) {
    return res.status(400).json({ error: "Usa una contraseña distinta de al menos 12 caracteres." });
  }
  const credentials = makePassword(newPassword);
  db.exec("BEGIN");
  try {
    db.prepare("UPDATE users SET password_salt = ?, password_hash = ?, must_change_password = 0 WHERE id = ?").run(credentials.salt, credentials.hash, user.id);
    db.prepare("DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?").run(user.id, tokenHash(sessionToken(req)));
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  res.json({ user: publicUser({ ...user, must_change_password: 0 }) });
});

app.get("/api/users", requireUser, requireAdmin, (req, res) => {
  const users = db.prepare("SELECT id, username, display_name, role, must_change_password FROM users ORDER BY id").all();
  res.json({ users: users.map(publicUser) });
});

app.post("/api/users", requireUser, requireAdmin, (req, res) => {
  const { username, displayName, password } = req.body || {};
  if (!validUsername(username) || typeof displayName !== "string" || displayName.trim().length < 2 || displayName.trim().length > 100 || !validPassword(password)) {
    return res.status(400).json({ error: "Ingresa un usuario válido, nombre y contraseña temporal de al menos 12 caracteres." });
  }
  if (db.prepare("SELECT id FROM users WHERE username = ?").get(username)) {
    return res.status(409).json({ error: "Este nombre de usuario ya existe." });
  }
  const credentials = makePassword(password);
  db.prepare("INSERT INTO users (username, display_name, role, password_salt, password_hash, must_change_password) VALUES (?, ?, 'user', ?, ?, 1)")
    .run(username, displayName.trim(), credentials.salt, credentials.hash);
  res.status(201).json({ ok: true });
});

app.get("/", (req, res) => res.sendFile(path.join(root, "index.html")));
app.get("/index.html", (req, res) => res.sendFile(path.join(root, "index.html")));
app.get("/app.js", (req, res) => res.sendFile(path.join(root, "app.js")));
app.get("/styles.css", (req, res) => res.sendFile(path.join(root, "styles.css")));
app.use("/screens", express.static(path.join(root, "screens"), { index: false, dotfiles: "deny" }));
app.use((error, req, res, next) => {
  console.error("Error en el servidor:", error);
  if (res.headersSent) return next(error);
  const status = error.status === 400 || error.status === 413 ? error.status : 500;
  res.status(status).json({ error: status === 500 ? "Error interno del servidor." : "Solicitud inválida o demasiado grande." });
});

const server = app.listen(port, host, () => console.log(`Nómade disponible en ${origin}`));
module.exports = { server, db };
