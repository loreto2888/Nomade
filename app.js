/* Interactive, non-transactional prototype. All records below are fictional. */
const sections = [
  { title: "General", ids: ["p02", "p03", "p04", "p05", "p06"] },
  { title: "Operación y finanzas", ids: ["p07", "p08", "p09", "p10", "p11", "p12", "p13", "p14", "p15"] },
  { title: "Control y reportes", ids: ["p16", "p17", "p18", "p19", "p20", "p21"] },
  { title: "Administración", ids: ["p22", "p23", "p24", "p25", "p26", "p27", "p28", "p29", "p30", "p31"] }
];

const modules = Object.assign({}, ...screenGroups.map(group => group.screens));
const relatedScreens = Object.assign({}, ...screenGroups.map(group => group.related));

const app = document.getElementById("app");
const dialogRoot = document.getElementById("dialog-root");
let sessionUser = null;
let sessionReady = false;
let passwordChangeRequested = false;
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const currentId = () => {
  const id = location.hash.slice(1).toLowerCase();
  return Object.prototype.hasOwnProperty.call(modules, id) ? id : "p02";
};
const navigate = id => {
  if (currentId() === id) {
    closeMenu();
    return;
  }
  location.hash = id;
};
const badgeClass = value => /pendiente|revisión|preparación|parcial|implementar/i.test(value) ? "warn" : /excepción|rechazado/i.test(value) ? "danger" : /cerrado|finalizado/i.test(value) ? "neutral" : "";
const badge = value => `<span class="badge ${badgeClass(value)}">${escapeHTML(value)}</span>`;

function sidebar(id) {
  return `<div class="sidebar-overlay" data-action="menu-close"></div><aside id="sidebar" class="sidebar" aria-label="Navegación principal" ${window.matchMedia("(max-width: 760px)").matches ? "inert" : ""}>
    <div class="brand"><div class="brand-mark">N</div><div class="brand-name">NÓMADE<small>GESTIÓN DE OBRAS</small></div></div>
    <nav class="side-scroll">${sections.map(section => `<div class="nav-title">${section.title}</div>${section.ids.filter(key => key !== "p25" || sessionUser.role === "admin").map(key => {
      const m = modules[key];
      return `<a href="#${key}" class="nav-button ${key === id ? "active" : ""}" data-nav="${key}" ${key === id ? 'aria-current="page"' : ""}><span class="nav-icon" aria-hidden="true">${m.icon}</span><span>${escapeHTML(m.short || m.title)}</span><span class="nav-number">${key.toUpperCase()}</span></a>`;
    }).join("")}`).join("")}</nav>
    <div class="side-bottom">◌ &nbsp; Entorno de demostración<br>&nbsp;&nbsp;&nbsp;&nbsp; Datos operativos ficticios</div>
  </aside>`;
}

function topbar(title) {
  return `<header class="topbar"><div class="breadcrumbs"><button class="mobile-menu" data-action="menu" aria-label="Abrir menú" aria-expanded="false" aria-controls="sidebar">☰</button><span>Espacio de trabajo &nbsp; / &nbsp; <strong>${escapeHTML(title)}</strong></span></div><div class="top-right"><button class="top-action" data-nav="p28" aria-label="Ver alertas">♧<span class="dot"></span></button><div class="profile"><div class="avatar">${escapeHTML(sessionUser.displayName.slice(0, 2).toUpperCase())}</div><div class="profile-text"><strong>${escapeHTML(sessionUser.displayName)}</strong><small>${sessionUser.role === "admin" ? "Administrador" : "Usuario"}</small></div></div><button class="text-link" data-action="change-password">Clave</button><button class="text-link" data-action="logout">Salir</button></div></header>`;
}

function relatedNavigation(id) {
  return `<nav class="related" aria-label="Pantallas relacionadas"><div class="related-heading">Continuar en</div><div class="related-links">${relatedScreens[id].filter(key => key !== "p25" || sessionUser.role === "admin").map(key => `<a href="#${key}" data-nav="${key}"><span>${escapeHTML(modules[key].short || modules[key].title)}</span><span aria-hidden="true">→</span></a>`).join("")}</div></nav>`;
}

function strip() {
  return `<div class="demo-strip"><span>◈</span><span><strong>Prototipo navegable.</strong> Datos operativos ficticios; no registra operaciones financieras.</span><button data-action="about">Conocer alcance →</button></div>`;
}

function heading(id, title, description, button, target) {
  return `<div class="heading-row"><div><div class="eyebrow">${id.toUpperCase()} &nbsp; / &nbsp; Gestión de obras</div><h1>${escapeHTML(title)}</h1><p>${escapeHTML(description)}</p></div>${button ? `<button class="button primary" ${target ? `data-nav="${target}"` : `data-action="unavailable" data-label="${escapeHTML(button)}"`}>＋ &nbsp; ${escapeHTML(button)}</button>` : ""}</div>`;
}

function stat(label, value, foot, icon) {
  return `<div class="stat"><div class="stat-top"><span>${label}</span><span class="stat-icon">${icon}</span></div><div class="stat-value">${value}</div><div class="stat-foot">${foot}</div></div>`;
}

function renderTable(m) {
  return `<div class="toolbar"><div class="search-wrap"><span>⌕</span><input id="table-search" class="search" type="search" placeholder="Buscar en estos registros..." aria-label="Buscar registros"></div><select id="table-filter" class="filter" aria-label="Filtrar por estado"><option value="">Todos los estados</option>${[...new Set(m.rows.map(row => row[row.length - 1]))].map(state => `<option value="${escapeHTML(state)}">${escapeHTML(state)}</option>`).join("")}</select></div>
    <div class="table-wrap"><table class="data-table"><thead><tr>${m.columns.map(col => `<th scope="col">${escapeHTML(col)}</th>`).join("")}</tr></thead><tbody id="table-body"></tbody></table><div class="empty" id="table-empty" hidden>No hay registros que coincidan con la búsqueda.</div></div><div class="table-footer"><span id="table-count"></span><span>Datos de demostración</span></div>`;
}

function updateTable(m) {
  const search = document.getElementById("table-search").value.trim().toLocaleLowerCase("es");
  const filter = document.getElementById("table-filter").value;
  const rows = m.rows.filter(row => row.join(" ").toLocaleLowerCase("es").includes(search) && (!filter || row[row.length - 1] === filter));
  document.getElementById("table-body").innerHTML = rows.map(row => `<tr>${row.map((cell, index) => {
    if (index === row.length - 1) return `<td>${badge(cell)}</td>`;
    const exampleWork = currentId() === "p03" && index === 0 && row[0].startsWith("Local Parque Norte");
    const componentTargets = { "Presupuesto aprobado": "p06", "Órdenes de compra": "p10", "Estados de pago": "p07", "Documentos pendientes": "p28" };
    const target = exampleWork ? "p05" : currentId() === "p05" && index === 0 ? componentTargets[cell] : null;
    return `<td>${target ? `<a class="record-link" href="#${target}" data-nav="${target}">${escapeHTML(cell)}</a>` : escapeHTML(cell)}</td>`;
  }).join("")}</tr>`).join("");
  document.getElementById("table-empty").hidden = rows.length > 0;
  document.getElementById("table-count").textContent = `${rows.length} ${rows.length === 1 ? "registro" : "registros"} de ejemplo`;
}

function renderForm(m) {
  return `<div class="form-grid">${m.form.map(([label, placeholder], index) => `<div class="field"><label for="field-${index}">${escapeHTML(label)}</label><input id="field-${index}" type="${placeholder === "date" ? "date" : "text"}" ${placeholder === "date" ? "" : `placeholder="${escapeHTML(placeholder)}"`}></div>`).join("")}</div><div class="notice">Los campos son solo ilustrativos. La información ingresada no se guarda ni se envía.</div><div class="form-actions"><button class="button primary" data-action="unavailable" data-label="${escapeHTML(m.action)}">${escapeHTML(m.action)}</button><button class="button" data-nav="${m.title.includes("EEPP") ? "p07" : "p03"}">Volver al listado</button></div>`;
}

function modulePage(id) {
  const m = modules[id];
  return `${heading(id, m.title, m.description, m.form ? null : m.action, m.target)}${strip()}<div class="section-grid"><section class="card"><div class="card-head"><div><h2>${m.form ? "Información general" : "Registros de ejemplo"}</h2><p>${m.form ? "Completa los campos para explorar la pantalla" : "Consulta y filtra la información de esta vista"}</p></div><span class="badge neutral">Vista demo</span></div>${m.form ? renderForm(m) : renderTable(m)}</section><aside class="card"><div class="card-head"><div><h2>Sobre esta pantalla</h2><p>Consideraciones funcionales</p></div></div><ul class="info-list">${m.notes.map(note => { const [title, body] = note.split("|"); return `<li><strong>${escapeHTML(title)}</strong>${escapeHTML(body)}</li>`; }).join("")}</ul><div class="notice">La funcionalidad definitiva está sujeta a levantamiento y aprobación.</div>${relatedNavigation(id)}</aside></div>`;
}

function render() {
  if (!sessionReady) return;
  if (!sessionUser || sessionUser.mustChangePassword || passwordChangeRequested) {
    app.innerHTML = login(Boolean(sessionUser));
    return;
  }
  let id = currentId();
  if (id === "p01" || (id === "p25" && sessionUser.role !== "admin")) {
    id = "p02";
    history.replaceState(null, "", "#p02");
  }
  app.innerHTML = `<div class="app">${sidebar(id)}<main class="main">${topbar(modules[id].title)}<div class="content">${id === "p02" ? dashboard() : id === "p25" ? usersPage() : modulePage(id)}</div></main></div>`;
  if (id === "p25") loadUsers();
  else if (modules[id].rows) {
    updateTable(modules[id]);
    document.getElementById("table-search").addEventListener("input", () => updateTable(modules[id]));
    document.getElementById("table-filter").addEventListener("change", () => updateTable(modules[id]));
  }
  window.scrollTo(0, 0);
}

let lastFocused;
function showDialog(title, body) {
  lastFocused = document.activeElement;
  dialogRoot.innerHTML = `<div class="dialog-backdrop" data-action="backdrop"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div class="dialog-head"><h2 id="dialog-title">${escapeHTML(title)}</h2><button class="close" data-action="close" aria-label="Cerrar">×</button></div><p>${escapeHTML(body)}</p><button class="button primary" data-action="close">Entendido</button></section></div>`;
  dialogRoot.querySelector(".close").focus();
}
function closeDialog() {
  dialogRoot.innerHTML = "";
  if (lastFocused && lastFocused.isConnected) lastFocused.focus();
}

function closeMenu() {
  const sidebar = document.querySelector(".sidebar");
  if (!sidebar) return;
  sidebar.classList.remove("open");
  document.querySelector(".sidebar-overlay").classList.remove("show");
  const isMobile = window.matchMedia("(max-width: 760px)").matches;
  sidebar.inert = isMobile;
  document.querySelector(".mobile-menu").setAttribute("aria-expanded", "false");
}

document.addEventListener("click", event => {
  const button = event.target.closest("[data-nav], [data-action]");
  if (!button) return;
  if (button.dataset.nav) {
    if (button.tagName === "A" && (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0)) return;
    event.preventDefault();
    navigate(button.dataset.nav);
    return;
  }
  const action = button.dataset.action;
  if (action === "menu") {
    const sidebar = document.querySelector(".sidebar");
    if (sidebar.classList.contains("open")) closeMenu();
    else {
      sidebar.inert = false;
      sidebar.classList.add("open");
      document.querySelector(".sidebar-overlay").classList.add("show");
      button.setAttribute("aria-expanded", "true");
    }
  }
  if (action === "menu-close") closeMenu();
  if (action === "about") showDialog("Alcance del prototipo", "El acceso y la administración de cuentas son reales. Las pantallas operativas usan datos ficticios y no registran operaciones financieras. Las integraciones y reglas de negocio aún deben validarse.");
  if (action === "unavailable") showDialog(button.dataset.label || "Funcionalidad pendiente", "Esta acción es parte del alcance propuesto y aún no está implementada. No se guardó ni envió información. Su comportamiento y autorizaciones deben definirse antes del desarrollo.");
  if (action === "logout") logout();
  if (action === "change-password") { passwordChangeRequested = true; render(); }
  if (action === "cancel-password") { passwordChangeRequested = false; render(); }
  if (action === "close" || (action === "backdrop" && event.target === button)) closeDialog();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && dialogRoot.firstChild) closeDialog();
  else if (event.key === "Escape" && document.querySelector(".sidebar.open")) {
    closeMenu();
    document.querySelector(".mobile-menu").focus();
  }
  if (event.key === "Tab" && dialogRoot.firstChild) {
    const buttons = [...dialogRoot.querySelectorAll("button")];
    if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons[buttons.length - 1].focus(); }
    else if (!event.shiftKey && document.activeElement === buttons[buttons.length - 1]) { event.preventDefault(); buttons[0].focus(); }
  }
});
window.addEventListener("resize", closeMenu);
window.addEventListener("hashchange", render);
startSession();
