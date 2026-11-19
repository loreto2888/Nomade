const draftText = (name, label, required = true) => ({ name, label, type: "text", required, maxLength: 180 });
const draftNotes = (name, label, required = false) => ({ name, label, type: "textarea", required, maxLength: 1000 });
const draftDate = (name, label, required = true) => ({ name, label, type: "date", required });
const draftNumber = (name, label, min = 1, max = Number.MAX_SAFE_INTEGER) => ({ name, label, type: "number", required: true, min, max });
const draftSelect = (name, label, options) => ({ name, label, type: "select", required: true, options });

const draftSchemas = {
  p04: { title: "Borrador de obra", fields: [
    draftText("obra", "Nombre de la obra"), draftText("cliente", "Cliente"),
    draftText("centroCosto", "Centro de costo"), draftText("responsable", "Responsable"),
    draftDate("inicio", "Fecha de inicio"), draftDate("termino", "Fecha de término")
  ] },
  p06: { title: "Borrador de versión de presupuesto", fields: [
    draftText("obra", "Obra (referencia)"), draftText("version", "Identificación de la versión"),
    draftNumber("monto", "Monto total propuesto (CLP)"), draftNotes("partidas", "Partidas y montos propuestos", true),
    draftNotes("motivo", "Motivo o comentarios")
  ] },
  p08: { title: "Borrador de estado de pago", fields: [
    draftText("obra", "Obra (referencia)"), draftText("numero", "Número de EEPP"),
    draftText("periodo", "Período"), draftNumber("avance", "Avance acumulado (%)", 0, 100),
    draftNumber("monto", "Monto solicitado (CLP)"), draftNotes("observaciones", "Observaciones")
  ] },
  p09: { title: "Borrador de ingreso", fields: [
    draftText("documento", "Documento de origen (referencia)"), draftText("cliente", "Cliente"),
    draftNumber("monto", "Monto recibido (CLP)"), draftDate("fecha", "Fecha de ingreso"),
    draftNotes("observaciones", "Observaciones")
  ] },
  p10: { title: "Borrador de orden de compra", fields: [
    draftText("obra", "Obra (referencia)"), draftText("proveedor", "Proveedor (referencia)"),
    draftSelect("tipo", "Tipo de compra", ["Materiales", "Pago parcial de OT"]),
    draftText("ot", "OT asociada (referencia, si corresponde)", false),
    draftNotes("detalle", "Detalle de la compra o pago", true), draftNumber("monto", "Monto propuesto (CLP)")
  ] },
  p11: { title: "Borrador de orden de trabajo", fields: [
    draftText("obra", "Obra (referencia)"), draftText("contratista", "Contratista (referencia)"),
    draftText("cotizacion", "Cotización aprobada (referencia por verificar)"),
    draftNotes("alcance", "Alcance del trabajo", true), draftNumber("monto", "Monto propuesto (CLP)"),
    draftNotes("hitos", "Hitos o pagos propuestos")
  ] },
  p12: { title: "Borrador de factura", fields: [
    draftText("folio", "Folio de factura"), draftText("proveedor", "Proveedor (referencia)"),
    draftText("orden", "OC u OT asociada (referencia)"), draftNumber("monto", "Monto (CLP)"),
    draftDate("vencimiento", "Fecha de vencimiento"), draftNotes("observaciones", "Observaciones")
  ] },
  p13: { title: "Borrador de rendición", fields: [
    draftText("obra", "Obra (referencia)"), draftText("responsable", "Responsable"),
    draftText("concepto", "Concepto"), draftNumber("monto", "Monto (CLP)"),
    draftDate("fecha", "Fecha del gasto"), draftNotes("respaldo", "Referencia del comprobante")
  ] },
  p14: { title: "Borrador de distribución de mano de obra", fields: [
    draftText("periodo", "Quincena o período"), draftText("cuadrilla", "Cuadrilla"),
    draftNumber("costo", "Costo total a distribuir (CLP)"),
    draftNotes("distribucion", "Obras, partidas y proporciones propuestas", true)
  ] },
  p15: { title: "Borrador de prorrateo", fields: [
    draftText("concepto", "Concepto del gasto"), draftText("periodo", "Período"),
    draftNumber("monto", "Monto total (CLP)"), draftNotes("criterio", "Obras y criterio de reparto propuesto", true)
  ] },
  p16: { title: "Borrador de ajuste", fields: [
    draftText("obra", "Obra (referencia)"), draftText("origen", "Documento o movimiento de origen (referencia)"),
    draftSelect("tipo", "Tipo de ajuste", ["Aumento", "Disminución"]),
    draftNumber("monto", "Monto del ajuste (CLP)"), draftNotes("motivo", "Motivo del ajuste", true)
  ] },
  p19: { title: "Borrador de solicitud de cierre", fields: [
    draftText("obra", "Obra (referencia)"), draftText("responsable", "Responsable propuesto"),
    draftNotes("pendientes", "Saldos, documentos y pendientes a revisar", true)
  ] },
  p20: { title: "Borrador de cierre anual", fields: [
    draftNumber("ejercicio", "Ejercicio", 1900, 2200), draftText("responsable", "Responsable propuesto"),
    draftNotes("observaciones", "Obras y pendientes a revisar", true)
  ] },
  p22: { title: "Borrador de proveedor o contratista", fields: [
    draftText("nombre", "Nombre o razón social"), draftText("identificacion", "Identificación tributaria (por validar)"),
    draftSelect("tipo", "Tipo", ["Proveedor", "Contratista"]), draftText("especialidad", "Especialidad"),
    draftText("contacto", "Contacto (opcional)", false)
  ] },
  p28: { title: "Borrador de tarea", fields: [
    draftText("tarea", "Tarea"), draftText("obra", "Obra o referencia"),
    draftText("responsable", "Responsable propuesto"), draftDate("vencimiento", "Fecha propuesta"),
    draftNotes("detalle", "Detalle")
  ] },
  p30: { title: "Borrador de lote de pago", fields: [
    draftText("referencia", "Referencia del lote"), draftDate("fecha", "Fecha de pago propuesta"),
    draftNotes("documentos", "Facturas y montos propuestos (referencias)", true),
    draftNotes("observaciones", "Observaciones")
  ] },
  p31: { title: "Borrador de asignación de tarea", fields: [
    draftText("tarea", "Tarea"), draftText("obra", "Obra (referencia)"),
    draftText("responsable", "Responsable propuesto"), draftDate("vencimiento", "Fecha propuesta"),
    draftNotes("detalle", "Detalle")
  ] }
};

if (typeof module !== "undefined" && module.exports) module.exports = draftSchemas;
