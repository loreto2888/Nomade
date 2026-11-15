const prototypeActions = {
  p17: {
    title: "Revisión de conciliación",
    description: "Prepara los criterios para revisar órdenes, facturas y pagos.",
    fields: [draftText("referencia", "Documento o referencia de ejemplo"), draftSelect("revision", "Tipo de revisión", ["Órdenes y facturas", "Facturas y pagos", "Posibles duplicados"])],
    steps: ["Comparar documentos y montos.", "Revisar diferencias y posibles duplicados.", "Definir responsable y evidencia para cada excepción."]
  },
  p18: {
    title: "Reporte de resultado por obra",
    description: "Define los criterios de un reporte financiero por obra.",
    fields: [draftText("obra", "Obra de referencia"), draftText("periodo", "Período"), draftSelect("detalle", "Nivel de detalle", ["Resumen", "Ingresos y costos", "Detalle por partida"])],
    steps: ["Reunir ingresos y costos verificados.", "Definir criterios de utilidad y margen.", "Validar el resultado antes de exportar."]
  },
  p21: {
    title: "Preparar reporte",
    description: "Selecciona un informe y sus criterios propuestos.",
    fields: [draftSelect("informe", "Informe", ["Resultado por obra", "Presupuesto y partidas", "Compras y compromisos", "Vencimientos y pagos"]), draftText("periodo", "Período"), draftText("obra", "Obra de referencia", false)],
    steps: ["Validar fuentes y filtros.", "Revisar el contenido del informe.", "Definir formato y autorización de exportación."]
  },
  p23: {
    title: "Revisión de integración",
    description: "Documenta una revisión preliminar de una fuente de información.",
    fields: [draftSelect("sistema", "Sistema", ["Laudus", "Rindegastos", "Banco", "Otro"]), draftSelect("objetivo", "Objetivo", ["Migración", "Intercambio de datos", "Planilla de pagos"]), draftNotes("alcance", "Alcance por definir", true)],
    steps: ["Identificar datos y responsables.", "Definir permisos, conectividad y controles.", "Validar pruebas antes de habilitar una conexión."]
  },
  p24: {
    title: "Preparar importación masiva",
    description: "Selecciona un tipo de carga y un archivo para visualizar la propuesta.",
    fields: [draftSelect("tipo", "Tipo de carga", ["Presupuestos", "Proveedores", "Movimientos"]), { name: "archivo", label: "Archivo de ejemplo", type: "file", required: true, accept: ".csv,.xlsx,.xls" }],
    steps: ["Definir plantilla y columnas.", "Revisar validaciones y duplicados.", "Solicitar confirmación antes de importar."]
  },
  p26: {
    title: "Preparar exportación de bitácora",
    description: "Define los filtros propuestos para una futura exportación.",
    fields: [draftDate("desde", "Desde"), draftDate("hasta", "Hasta"), draftText("responsable", "Responsable", false)],
    steps: ["Verificar permisos de acceso.", "Consultar registros de auditoría reales.", "Revisar el contenido antes de exportar."]
  },
  p27: {
    title: "Propuesta de parámetros financieros",
    description: "Explora cómo se podrían proponer cambios a una regla financiera.",
    fields: [draftSelect("parametro", "Parámetro", ["Límites de aprobación", "Criterios de prorrateo", "Reglas de cierre"]), draftText("valor", "Valor propuesto"), draftNotes("motivo", "Motivo del cambio", true)],
    steps: ["Validar la regla con el área responsable.", "Definir autorización y vigencia.", "Registrar y auditar el cambio aprobado."]
  },
  p29: {
    title: "Preparar asistencia documental",
    description: "Selecciona un documento de ejemplo para explorar el flujo propuesto.",
    fields: [draftSelect("tipo", "Tipo de documento", ["Factura", "Cotización", "Otro"]), { name: "archivo", label: "Documento de ejemplo", type: "file", required: true, accept: ".pdf,.png,.jpg,.jpeg" }],
    steps: ["Definir el tratamiento seguro del documento.", "Revisar los datos extraídos por una persona.", "Confirmar un borrador antes de cualquier operación."]
  }
};

function prototypeField(field) {
  if (field.type !== "file") return draftField(field);
  return `<div class="field"><label for="prototype-${field.name}">${escapeHTML(field.label)} *</label><input id="prototype-${field.name}" type="file" name="${field.name}" accept="${field.accept}" required></div>`;
}

function prototypePage(id) {
  const action = prototypeActions[id];
  return `${heading(id, action.title, action.description, null)}${strip()}<div class="section-grid"><section class="card"><div class="card-head"><div><h2>Datos de la propuesta</h2><p>Esta vista es interactiva, pero no guarda ni ejecuta operaciones.</p></div><span class="badge warn">Prototipo</span></div>
    <form class="prototype-form" data-prototype="${id}"><div class="form-grid">${action.fields.map(prototypeField).join("")}</div><div class="notice">No se envían archivos ni datos. La vista previa se pierde al salir de esta pantalla.</div><div class="form-actions"><button class="button primary" type="submit">Ver propuesta</button><button class="button" type="button" data-nav="${id}">Volver</button></div></form><div class="prototype-preview" aria-live="polite"></div></section>
    <aside class="card"><div class="card-head"><div><h2>Flujo por validar</h2><p>Pasos previstos para el desarrollo definitivo.</p></div></div><ul class="info-list">${action.steps.map(step => `<li>${escapeHTML(step)}</li>`).join("")}</ul><div class="notice">No se realiza ninguna conciliación, conexión, carga, extracción ni exportación.</div>${relatedNavigation(id)}</aside></div>`;
}

document.addEventListener("submit", event => {
  const form = event.target;
  if (!form.matches(".prototype-form")) return;
  event.preventDefault();
  const action = prototypeActions[form.dataset.prototype];
  const values = new FormData(form);
  const preview = form.parentElement.querySelector(".prototype-preview");
  preview.innerHTML = `<section class="drafts-card"><div class="card-head"><div><h2>Vista previa de la propuesta</h2><p>No se guardó ni procesó información.</p></div><span class="badge warn">Solo demostración</span></div><dl class="prototype-values">${action.fields.map(field => {
    const value = values.get(field.name);
    const text = value instanceof File ? value.name : value;
    return `<div><dt>${escapeHTML(field.label)}</dt><dd>${escapeHTML(text || "Sin indicar")}</dd></div>`;
  }).join("")}</dl></section>`;
});
