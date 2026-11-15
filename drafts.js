const draftLists = { p03: "p04", p07: "p08" };

function draftField(field) {
  const id = `draft-${field.name}`;
  const required = field.required ? "required" : "";
  const label = `<label for="${id}">${escapeHTML(field.label)}${field.required ? " *" : ""}</label>`;
  if (field.type === "textarea") {
    return `<div class="field">${label}<textarea id="${id}" name="${field.name}" maxlength="${field.maxLength}" ${required}></textarea></div>`;
  }
  if (field.type === "select") {
    return `<div class="field">${label}<select id="${id}" name="${field.name}" ${required}><option value="">Selecciona una opción</option>${field.options.map(option => `<option value="${escapeHTML(option)}">${escapeHTML(option)}</option>`).join("")}</select></div>`;
  }
  const limits = field.type === "number" ? `min="${field.min}" max="${field.max}" step="1"` : field.maxLength ? `maxlength="${field.maxLength}"` : "";
  return `<div class="field">${label}<input id="${id}" name="${field.name}" type="${field.type}" ${limits} ${required}></div>`;
}

function draftForm(id, inline = false) {
  const schema = draftSchemas[id];
  return `<form class="draft-form" data-draft="${id}"><div class="form-grid">${schema.fields.map(draftField).join("")}</div>
    <div class="notice">Solo se guarda un borrador. Las referencias son texto y no se validan ni vinculan; no se aprueba, asigna, paga ni cierra nada.</div>
    <p class="form-message" role="status"></p><div class="form-actions"><button class="button primary" type="submit">Guardar borrador</button>${inline ? `<button class="button" type="button" data-nav="${id === "p04" ? "p03" : "p07"}">Volver al listado</button>` : '<button class="button" type="button" data-action="close">Cancelar</button>'}</div></form>`;
}

function draftList(id) {
  return `<section class="card drafts-card" data-draft-list="${id}"><div class="card-head"><div><h2>Borradores guardados</h2><p>${sessionUser.role === "admin" ? "Como administrador puedes revisar los borradores de todos los usuarios." : "Solo puedes revisar tus propios borradores; el administrador también puede verlos."}</p></div><span class="badge warn">Sin aprobar</span></div><div class="draft-list-content"><p class="form-hint">Cargando borradores...</p></div></section>`;
}

function showDraftForm(id) {
  if (!Object.hasOwn(draftSchemas, id)) {
    showDialog("Borrador no disponible", "No se encontró el formulario solicitado.");
    return;
  }
  lastFocused = document.activeElement;
  dialogRoot.innerHTML = `<div class="dialog-backdrop" data-action="backdrop"><section class="dialog draft-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div class="dialog-head"><h2 id="dialog-title">${escapeHTML(draftSchemas[id].title)}</h2><button class="close" type="button" data-action="close" aria-label="Cerrar">×</button></div><p>Completa la información para revisión posterior.</p>${draftForm(id)}</section></div>`;
  dialogRoot.querySelector("input, select, textarea").focus();
}

async function loadDrafts(id, success = false) {
  const container = document.querySelector(`[data-draft-list="${id}"] .draft-list-content`);
  if (!container) return;
  try {
    const result = await requestApi(`/api/drafts/${id}`);
    if (!container.isConnected) return;
    const schema = draftSchemas[id];
    container.innerHTML = `${success ? '<p class="draft-success" role="status">Borrador guardado correctamente.</p>' : ""}${result.drafts.length ? result.drafts.map(draft => {
      const description = draft.data[schema.fields[0].name];
      return `<details class="draft-item"><summary><span><strong>${escapeHTML(description)}</strong><small>Borrador #${draft.id} · ${escapeHTML(draft.author)} · ${escapeHTML(new Date(draft.createdAt).toLocaleString("es-CL"))}</small></span><span class="badge warn">Borrador</span></summary><dl>${schema.fields.filter(field => draft.data[field.name]).map(field => `<div><dt>${escapeHTML(field.label)}</dt><dd>${escapeHTML(draft.data[field.name])}</dd></div>`).join("")}</dl></details>`;
    }).join("") : '<p class="form-hint">Aún no hay borradores guardados.</p>'}`;
  } catch (error) {
    if (container.isConnected) container.innerHTML = `<p class="form-message" role="alert">${escapeHTML(error.message)}</p>`;
  }
}

document.addEventListener("submit", async event => {
  const form = event.target;
  if (!form.matches(".draft-form")) return;
  event.preventDefault();
  const id = form.dataset.draft;
  const message = form.querySelector(".form-message");
  const button = form.querySelector('button[type="submit"]');
  const data = Object.fromEntries(new FormData(form));
  message.textContent = "";
  button.disabled = true;
  try {
    await requestApi(`/api/drafts/${id}`, { method: "POST", body: JSON.stringify({ data }) });
    form.reset();
    if (dialogRoot.contains(form)) closeDialog();
    else if (form.isConnected) message.textContent = "Borrador guardado correctamente.";
    await loadDrafts(id, true);
  } catch (error) {
    if (form.isConnected) message.textContent = error.message;
    else showDialog("No se pudo guardar el borrador", error.message);
  } finally {
    button.disabled = false;
  }
});
