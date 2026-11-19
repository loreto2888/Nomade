"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("las acciones abren pantallas independientes y permiten volver", () => {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, { innerHTML: "", value: "", addEventListener() {} });
    return elements.get(id);
  };
  const context = vm.createContext({
    document: { getElementById: element, querySelector: () => null, addEventListener() {} },
    window: { matchMedia: () => ({ matches: false }), addEventListener() {}, scrollTo() {} },
    location: { hash: "" },
    history: { replaceState() {} },
    fetch: () => new Promise(() => {}),
    console
  });
  for (const file of [
    "screens/registro.js", "screens/acceso.js", "screens/dashboard.js", "screens/obras.js",
    "screens/pagos-compras.js", "screens/control-reportes.js", "screens/administracion.js",
    "draft-schemas.js", "drafts.js", "prototype-actions.js", "app.js"
  ]) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), context, { filename: file });
  }
  vm.runInContext('sessionReady = true; sessionUser = { role: "admin", displayName: "Prueba" }', context);
  const ids = vm.runInContext("Object.keys(draftSchemas)", context);
  for (const id of ids) {
    context.location.hash = `#${id}${id === "p04" || id === "p08" ? "" : "/nuevo"}`;
    vm.runInContext("render()", context);
    assert.match(element("app").innerHTML, new RegExp(`<form class="draft-form" data-draft="${id}">`), id);
    assert.doesNotMatch(element("app").innerHTML, /dialog-backdrop/, id);
    if (id !== "p04" && id !== "p08") {
      vm.runInContext(`navigate("${id}")`, context);
      assert.equal(context.location.hash, id, id);
    }
  }
  for (const id of vm.runInContext("Object.keys(prototypeActions)", context)) {
    context.location.hash = `#${id}/prototipo`;
    vm.runInContext("render()", context);
    assert.match(element("app").innerHTML, new RegExp(`<form class="prototype-form" data-prototype="${id}">`), id);
    assert.match(element("app").innerHTML, /No se envían archivos ni datos/, id);
    vm.runInContext(`navigate("${id}")`, context);
    assert.equal(context.location.hash, id, id);
  }
});
