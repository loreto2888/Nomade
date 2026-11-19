"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { once } = require("node:events");
const draftSchemas = require("../draft-schemas.js");

test("administra cuentas, protege sesiones y exige cambiar la contraseña temporal", async () => {
  const reservation = net.createServer();
  reservation.listen(0, "127.0.0.1");
  await once(reservation, "listening");
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const origin = `http://127.0.0.1:${port}`;
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "nomade-test-"));
  const adminPassword = crypto.randomBytes(24).toString("base64url");
  const temporaryPassword = crypto.randomBytes(24).toString("base64url");
  const newPassword = crypto.randomBytes(24).toString("base64url");
  Object.assign(process.env, {
    PORT: String(port), HOST: "127.0.0.1", APP_ORIGIN: origin,
    DATA_DIR: dataDir, ADMIN_USERNAME: "admin_test", ADMIN_PASSWORD: adminPassword
  });
  let { server, db } = require("../server.js");
  await once(server, "listening");
  async function request(url, { method = "GET", data, cookie, requestOrigin = origin } = {}) {
    const response = await fetch(origin + url, {
      method,
      headers: { "Content-Type": "application/json", Connection: "close", Origin: requestOrigin, ...(cookie ? { Cookie: cookie } : {}) },
      ...(data ? { body: JSON.stringify(data) } : {})
    });
    const body = response.headers.get("content-type")?.includes("application/json") ? await response.json() : null;
    return { status: response.status, body, cookie: response.headers.get("set-cookie")?.split(";")[0] };
  }
  try {
    assert.equal((await request("/api/users")).status, 401);
    assert.equal((await fetch(`${origin}/prototype-actions.js`)).status, 200);
    assert.equal((await request("/data/nomade.sqlite")).status, 404);
    assert.equal((await request("/api/login", { method: "POST", requestOrigin: "https://otro.example", data: {} })).status, 403);
    assert.equal((await request("/api/login", { method: "POST", data: { username: "admin_test", password: adminPassword, role: "user" } })).status, 401);
    const admin = await request("/api/login", { method: "POST", data: { username: "admin_test", password: adminPassword, role: "admin" } });
    assert.equal(admin.status, 200);
    assert.equal(admin.body.user.role, "admin");
    const created = await request("/api/users", { method: "POST", cookie: admin.cookie, data: { username: "usuario_test", displayName: "Usuario Prueba", password: temporaryPassword } });
    assert.equal(created.status, 201);
    assert.equal((await request("/api/users", { method: "POST", cookie: admin.cookie, data: { username: "USUARIO_TEST", displayName: "Otro Usuario", password: temporaryPassword } })).status, 409);
    assert.equal((await request("/api/users", { cookie: admin.cookie })).body.users.length, 2);
    const user = await request("/api/login", { method: "POST", data: { username: "usuario_test", password: temporaryPassword, role: "user" } });
    assert.equal(user.status, 200);
    assert.equal(user.body.user.mustChangePassword, true);
    assert.equal((await request("/api/users", { cookie: user.cookie })).status, 403);
    assert.equal((await request("/api/drafts/p06", { cookie: user.cookie })).status, 403);
    assert.equal((await request("/api/password", { method: "POST", cookie: user.cookie, data: { currentPassword: temporaryPassword, newPassword } })).body.user.mustChangePassword, false);
    assert.equal((await request("/api/users", { cookie: user.cookie })).status, 403);
    assert.equal((await request("/api/users", { method: "POST", cookie: user.cookie, data: { username: "otro", displayName: "Otro Usuario", password: temporaryPassword } })).status, 403);
    assert.equal((await request("/api/logout", { method: "POST", cookie: user.cookie })).status, 200);
    assert.equal((await request("/api/session", { cookie: user.cookie })).body.user, null);
    assert.equal((await request("/api/login", { method: "POST", data: { username: "usuario_test", password: temporaryPassword, role: "user" } })).status, 401);
    const activeUser = await request("/api/login", { method: "POST", data: { username: "usuario_test", password: newPassword, role: "user" } });
    assert.equal(activeUser.status, 200);
    const valuesFor = schema => Object.fromEntries(schema.fields.map(field => [
      field.name,
      field.type === "date" ? "2026-11-15" : field.type === "number" ? String(Math.max(1, field.min)) : field.type === "select" ? field.options[0] : "Referencia de prueba"
    ]));
    assert.equal((await request("/api/drafts/p06")).status, 401);
    assert.equal((await request("/api/drafts/p99", { cookie: admin.cookie })).status, 404);
    for (const [screen, schema] of Object.entries(draftSchemas)) {
      const saved = await request(`/api/drafts/${screen}`, { method: "POST", cookie: admin.cookie, data: { data: valuesFor(schema) } });
      assert.equal(saved.status, 201, screen);
      assert.equal((await request(`/api/drafts/${screen}`, { cookie: admin.cookie })).body.drafts.length, 1, screen);
    }
    const budget = valuesFor(draftSchemas.p06);
    assert.equal((await request("/api/drafts/p06", { method: "POST", cookie: activeUser.cookie, data: { data: { ...budget, monto: "-3" } } })).status, 400);
    assert.equal((await request("/api/drafts/p06", { method: "POST", cookie: activeUser.cookie, data: { data: { ...budget, extra: "x" } } })).status, 400);
    const invalidWork = { ...valuesFor(draftSchemas.p04), inicio: "2026-12-01", termino: "2026-11-01" };
    assert.equal((await request("/api/drafts/p04", { method: "POST", cookie: activeUser.cookie, data: { data: invalidWork } })).status, 400);
    const partialOrder = { ...valuesFor(draftSchemas.p10), tipo: "Pago parcial de OT", ot: "" };
    assert.equal((await request("/api/drafts/p10", { method: "POST", cookie: activeUser.cookie, data: { data: partialOrder } })).status, 400);
    assert.equal((await request("/api/drafts/p06", { cookie: activeUser.cookie })).body.drafts.length, 0);
    assert.equal((await request("/api/drafts/p06", { method: "POST", cookie: activeUser.cookie, data: { data: budget } })).status, 201);
    assert.equal((await request("/api/drafts/p06", { cookie: activeUser.cookie })).body.drafts.length, 1);
    assert.equal((await request("/api/drafts/p06", { cookie: admin.cookie })).body.drafts.length, 2);
    await new Promise(resolve => server.close(resolve));
    db.close();
    delete require.cache[require.resolve("../server.js")];
    delete process.env.ADMIN_USERNAME;
    delete process.env.ADMIN_PASSWORD;
    ({ server, db } = require("../server.js"));
    await once(server, "listening");
    assert.equal((await request("/api/session", { cookie: admin.cookie })).body.user.role, "admin");
    assert.equal((await request("/api/users", { cookie: admin.cookie })).body.users.length, 2);
    assert.equal((await request("/api/drafts/p06", { cookie: admin.cookie })).body.drafts.length, 2);
  } finally {
    await new Promise(resolve => server.close(resolve));
    db.close();
    fs.unlinkSync(path.join(dataDir, "nomade.sqlite"));
    fs.rmdirSync(dataDir);
  }
});
