/* Interactive, non-transactional prototype. All records below are fictional. */
const sections = [
  { title: "General", ids: ["p02", "p03", "p04", "p05", "p06"] },
  { title: "Operación y finanzas", ids: ["p07", "p08", "p09", "p10", "p11", "p12", "p13", "p14", "p15"] },
  { title: "Control y reportes", ids: ["p16", "p17", "p18", "p19", "p20", "p21"] },
  { title: "Administración", ids: ["p22", "p23", "p24", "p25", "p26", "p27", "p28", "p29", "p30", "p31", "p01"] }
];

// Each module keeps its own representative records and validation considerations.
const modules = {
  p01: { title: "Acceso y sesión", icon: "◉" },
  p02: { title: "Dashboard", icon: "▦" },
  p03: { title: "Obras y centros de costo", short: "Obras", icon: "▣", description: "Consulta y administra tus obras y centros de costo en un solo lugar.", action: "Nueva obra", target: "p04", columns: ["Obra / centro de costo", "Cliente", "Responsable", "Estado"], rows: [["Local Parque Norte · CC-001", "Grupo Andino", "Camila Rojas", "En ejecución"], ["Oficinas Nueva Vista · CC-002", "Inmobiliaria Central", "Tomás Silva", "En ejecución"], ["Tienda Los Robles · CC-003", "Grupo Andino", "Daniela Soto", "En ejecución"], ["Habilitación Providencia · CC-004", "Comercial Austral", "Javier Díaz", "En cierre"]], notes: ["Ficha integral|Reúne presupuesto, avances y resultado financiero por obra.", "Centros de costo|La estructura y las asignaciones deben validarse durante el levantamiento."] },
  p04: { title: "Alta y edición de obra", short: "Nueva obra", icon: "＋", description: "Define los datos principales, responsables y fechas de una obra.", action: "Guardar obra", form: [["Nombre de la obra", "Ej. Local Parque Norte"], ["Cliente", "Ej. Grupo Andino"], ["Centro de costo", "Ej. CC-001"], ["Responsable", "Ej. Camila Rojas"], ["Fecha de inicio", "date"], ["Fecha de término", "date"]], notes: ["Asignación|Cada obra deberá tener responsables y permisos definidos.", "Validación pendiente|Se deben confirmar los campos obligatorios y reglas de numeración."] },
  p05: { title: "Ficha 360° de la obra", short: "Ficha de obra", icon: "◫", description: "Una vista integral de la operación y la situación financiera del proyecto.", action: "Ver presupuesto", target: "p06", columns: ["Componente", "Referencia", "Detalle", "Estado"], rows: [["Presupuesto aprobado", "Versión 1", "$ 185.000.000", "Aprobado"], ["Órdenes de compra", "12 documentos", "$ 68.500.000", "En seguimiento"], ["Estados de pago", "3 presentados", "$ 92.000.000", "En seguimiento"], ["Documentos pendientes", "2 registros", "Requieren revisión", "Pendiente"]], notes: ["Obra de ejemplo|Local Parque Norte · CC-001", "Visión integral|El vínculo entre documentos e importes requiere datos reales y reglas validadas."] },
  p06: { title: "Presupuesto y partidas", short: "Presupuestos", icon: "▤", description: "Controla el presupuesto aprobado, sus partidas y modificaciones.", action: "Nueva versión", columns: ["Partida", "Presupuesto", "Comprometido", "Estado"], rows: [["Obras preliminares", "$ 18.500.000", "$ 12.400.000", "Aprobado"], ["Instalaciones", "$ 45.000.000", "$ 26.800.000", "Aprobado"], ["Terminaciones", "$ 62.000.000", "$ 29.300.000", "Aprobado"], ["Adicional de obra", "$ 8.000.000", "—", "Pendiente"]], notes: ["Versiones|Las modificaciones del presupuesto requieren revisión y aprobación.", "Control de partidas|Los cupos y reglas de imputación deben definirse antes de operar."] },
  p07: { title: "Estados de pago", short: "Estados de pago", icon: "▧", description: "Haz seguimiento de los avances presentados y sus aprobaciones.", action: "Nuevo estado de pago", target: "p08", columns: ["Estado de pago", "Obra", "Monto", "Estado"], rows: [["EEPP-003", "Local Parque Norte", "$ 32.000.000", "Presentado"], ["EEPP-002", "Oficinas Nueva Vista", "$ 24.500.000", "Aprobado"], ["EEPP-001", "Tienda Los Robles", "$ 18.000.000", "Pendiente"]], notes: ["Flujo de revisión|Preparar, presentar, aprobar o rechazar según las autorizaciones definidas.", "Cobranza|El seguimiento de ingresos se consulta en el módulo de cobranza."] },
  p08: { title: "Detalle y formulario de EEPP", short: "Nuevo EEPP", icon: "▨", description: "Prepara un estado de pago para su posterior revisión.", action: "Guardar borrador", form: [["Obra", "Ej. Local Parque Norte"], ["Número de EEPP", "Ej. EEPP-004"], ["Período", "Ej. Noviembre 2026"], ["Avance acumulado (%)", "Ej. 65"], ["Monto solicitado", "Ej. 32.000.000"], ["Observaciones", "Ej. Avance de terminaciones"]], notes: ["Revisión humana|El envío y la aprobación deben quedar registrados con su responsable.", "Reglas pendientes|Validar cálculo de avances, retenciones y documentos de respaldo."] },
  p09: { title: "Cobranza y pagos de clientes", short: "Cobranza", icon: "↙", description: "Revisa ingresos, abonos y saldos pendientes de clientes.", action: "Registrar ingreso", columns: ["Documento", "Cliente", "Saldo", "Estado"], rows: [["EEPP-003", "Grupo Andino", "$ 32.000.000", "Pendiente"], ["EEPP-002", "Inmobiliaria Central", "$ 8.500.000", "Abono parcial"], ["EEPP-001", "Comercial Austral", "$ 0", "Pagado"]], notes: ["Seguimiento|Cada abono deberá asociarse a su documento de origen.", "Saldos|La aplicación real debe conciliar ingresos y movimientos."] },
  p10: { title: "Órdenes de compra", short: "Órdenes de compra", icon: "▥", description: "Gestiona compras de materiales y órdenes para pagos parciales.", action: "Nueva orden de compra", columns: ["Orden", "Proveedor", "Monto", "Estado"], rows: [["OC-024", "Materiales Cordillera", "$ 12.800.000", "Pendiente"], ["OC-023", "Instalaciones Sur", "$ 8.500.000", "Aprobado"], ["OC-022", "Acabados del Valle", "$ 6.200.000", "Facturado"]], notes: ["Materiales y subcontratos|Una OC puede corresponder a materiales o a un pago parcial de una OT.", "Aprobación|Los límites, responsables y documentos requeridos están pendientes de definición."] },
  p11: { title: "Órdenes de trabajo y subcontratos", short: "Órdenes de trabajo", icon: "◇", description: "Controla subcontratos, hitos y órdenes de compra parciales.", action: "Nueva orden de trabajo", columns: ["Orden", "Contratista", "Monto contratado", "Estado"], rows: [["OT-012", "Instalaciones Sur", "$ 28.000.000", "En ejecución"], ["OT-011", "Servicios Norte", "$ 16.500.000", "En ejecución"], ["OT-010", "Obras y Montajes", "$ 9.800.000", "Finalizado"]], notes: ["Origen|La OT debe generarse desde una cotización aprobada.", "Hitos|Una OT podrá tener varias OC parciales, sujetas al saldo disponible."] },
  p12: { title: "Facturas y documentos de egreso", short: "Facturas", icon: "▱", description: "Consulta documentos, vencimientos y su asociación a órdenes.", action: "Registrar factura", columns: ["Documento", "Proveedor", "Vencimiento", "Estado"], rows: [["F-1045 · $ 12.800.000", "Materiales Cordillera", "20 nov 2026", "Pendiente"], ["F-0892 · $ 8.500.000", "Instalaciones Sur", "25 nov 2026", "En revisión"], ["F-0710 · $ 6.200.000", "Acabados del Valle", "10 nov 2026", "Pagado"]], notes: ["Trazabilidad|Relacionar factura, OC, OT y pagos sin duplicar costos.", "Validaciones|Se requieren reglas tributarias y controles de duplicidad acordados."] },
  p13: { title: "Rendiciones y caja chica", short: "Rendiciones", icon: "◫", description: "Revisa gastos menores, respaldos y rendiciones por obra.", action: "Nueva rendición", columns: ["Rendición", "Responsable", "Monto", "Estado"], rows: [["REN-031", "Camila Rojas", "$ 245.000", "Pendiente"], ["REN-030", "Tomás Silva", "$ 118.500", "En revisión"], ["REN-029", "Daniela Soto", "$ 89.900", "Aprobado"]], notes: ["Rindegastos|El alcance y mecanismo de integración están pendientes de definición.", "Respaldos|Cada rendición deberá conservar sus comprobantes y aprobaciones."] },
  p14: { title: "Mano de obra y cuadrillas", short: "Mano de obra", icon: "♧", description: "Distribuye costos quincenales entre obras y partidas.", action: "Nueva distribución", columns: ["Período", "Cuadrilla", "Costo", "Estado"], rows: [["Primera quincena · nov", "Cuadrilla Norte", "$ 4.500.000", "Pendiente"], ["Segunda quincena · oct", "Cuadrilla Centro", "$ 3.800.000", "Distribuido"], ["Primera quincena · oct", "Cuadrilla Sur", "$ 3.200.000", "Distribuido"]], notes: ["Imputación proporcional|Distribuir por obra y partida con criterios verificables.", "Fuente y criterios|El origen del costo y la base de reparto deben ser validados."] },
  p15: { title: "Gastos administrativos y prorrateos", short: "Gastos administrativos", icon: "◈", description: "Registra gastos generales y revisa su distribución entre obras.", action: "Nuevo prorrateo", columns: ["Concepto", "Período", "Monto", "Estado"], rows: [["Arriendo oficina", "Noviembre 2026", "$ 1.500.000", "Pendiente"], ["Servicios generales", "Octubre 2026", "$ 480.000", "Distribuido"], ["Administración", "Octubre 2026", "$ 2.100.000", "Distribuido"]], notes: ["Criterios de reparto|Definir la base de distribución y las obras participantes.", "Trazabilidad|Los ajustes requieren responsable y respaldo."] },
  p16: { title: "Libro de movimientos", short: "Movimientos", icon: "↔", description: "Consulta ingresos, egresos y ajustes con su documento de origen.", action: "Registrar ajuste", columns: ["Movimiento", "Obra", "Monto", "Estado"], rows: [["Ingreso · EEPP-002", "Oficinas Nueva Vista", "+ $ 16.000.000", "Registrado"], ["Egreso · F-0710", "Tienda Los Robles", "− $ 6.200.000", "Registrado"], ["Ajuste de distribución", "Local Parque Norte", "$ 450.000", "En revisión"]], notes: ["Trazabilidad|Cada movimiento debe identificar su origen y responsable.", "Integridad|Los cambios y ajustes deberán quedar auditados."] },
  p17: { title: "Conciliación y excepciones", short: "Conciliación", icon: "⇄", description: "Detecta diferencias entre órdenes, facturas y pagos.", action: "Revisar conciliación", columns: ["Referencia", "Documentos", "Diferencia", "Estado"], rows: [["OC-024", "Factura pendiente", "$ 12.800.000", "Pendiente"], ["OC-023 / F-0892", "OC y factura", "$ 0", "Conciliado"], ["F-0860", "Posible duplicidad", "Revisar", "Excepción"]], notes: ["Control de duplicidad|Validar folios, proveedores, montos y pagos antes de confirmar.", "Resolución|Las excepciones deben tener responsable y evidencia."] },
  p18: { title: "Resultado financiero por obra", short: "Resultados por obra", icon: "◔", description: "Visualiza ingresos, costos y rentabilidad de cada proyecto.", action: "Generar reporte", columns: ["Obra", "Ingresos", "Costos", "Estado"], rows: [["Local Parque Norte", "$ 92.000.000", "$ 68.500.000", "En ejecución"], ["Oficinas Nueva Vista", "$ 70.000.000", "$ 54.000.000", "En ejecución"], ["Tienda Los Robles", "$ 48.000.000", "$ 39.000.000", "En ejecución"]], notes: ["Resultado|La utilidad y el margen dependerán de criterios financieros acordados.", "Información referencial|Los importes mostrados son ficticios y no representan cálculos reales."] },
  p19: { title: "Cierre financiero de obra", short: "Cierre de obra", icon: "▣", description: "Revisa pendientes y condiciones para el cierre de un proyecto.", action: "Solicitar cierre", columns: ["Obra", "Documentos", "Pendientes", "Estado"], rows: [["Habilitación Providencia", "18 revisados", "2 por revisar", "En revisión"], ["Local Parque Norte", "12 revisados", "4 por revisar", "En ejecución"], ["Tienda Los Robles", "9 revisados", "3 por revisar", "En ejecución"]], notes: ["Lista de control|Confirmar saldos, documentos, pagos y aprobaciones antes del cierre.", "Autorización|El cierre debe ser aprobado por el responsable definido."] },
  p20: { title: "Cierre y consolidado anual", short: "Consolidado anual", icon: "▦", description: "Consolida los resultados financieros por ejercicio.", action: "Preparar cierre", columns: ["Ejercicio", "Obras", "Resultado", "Estado"], rows: [["2026", "4 obras de ejemplo", "Por validar", "En preparación"], ["2025", "3 obras de ejemplo", "Por validar", "Cerrado"]], notes: ["Consolidación|Los criterios de corte y consolidación requieren aprobación contable.", "Cierre anual|Se deben revisar ajustes, obras abiertas y autorizaciones."] },
  p21: { title: "Centro de reportes", short: "Reportes", icon: "▥", description: "Explora informes de gestión, compras, pagos y rentabilidad.", action: "Generar reporte", columns: ["Informe", "Área", "Periodicidad", "Estado"], rows: [["Resultado por obra", "Finanzas", "Mensual", "Disponible"], ["Presupuesto y partidas", "Obras", "A demanda", "Disponible"], ["Compras y compromisos", "Compras", "Semanal", "Disponible"], ["Vencimientos y pagos", "Tesorería", "Semanal", "Disponible"]], notes: ["Plantillas propuestas|El contenido y formato definitivo de cada informe deben validarse.", "Exportación|La generación de archivos requiere implementación posterior."] },
  p22: { title: "Proveedores y contratistas", short: "Proveedores", icon: "♙", description: "Administra el directorio de proveedores y contratistas.", action: "Nuevo proveedor", columns: ["Nombre", "Tipo", "Especialidad", "Estado"], rows: [["Materiales Cordillera", "Proveedor", "Materiales", "Activo"], ["Instalaciones Sur", "Contratista", "Instalaciones", "Activo"], ["Acabados del Valle", "Proveedor", "Terminaciones", "Activo"]], notes: ["Maestro único|Definir identificación, datos bancarios y controles de cambios.", "Migración|La calidad y procedencia de los datos deben revisarse."] },
  p23: { title: "Migración e integraciones", short: "Integraciones", icon: "⇆", description: "Coordina las fuentes de datos y conectores autorizados.", action: "Revisar integración", columns: ["Sistema", "Propósito", "Alcance", "Estado"], rows: [["Laudus", "Migración y transición", "Por levantar", "Pendiente"], ["Rindegastos", "Rendiciones", "Por definir", "Pendiente"], ["Banco", "Planilla de pagos", "Formato por validar", "Pendiente"]], notes: ["Retiro de Laudus|Requiere inventario 1:1, conciliación y validación de continuidad.", "Integraciones|No hay conexiones activas en este prototipo."] },
  p24: { title: "Importación masiva", short: "Importación masiva", icon: "⇧", description: "Prepara la carga de presupuestos y registros desde archivos.", action: "Seleccionar archivo", columns: ["Tipo de carga", "Formato", "Validación", "Estado"], rows: [["Presupuestos", "Excel / CSV", "Partidas y montos", "Por implementar"], ["Proveedores", "Excel / CSV", "Identificación y datos", "Por implementar"], ["Movimientos", "Excel / CSV", "Origen y duplicidad", "Por implementar"]], notes: ["Validación previa|La carga deberá mostrar errores y solicitar confirmación.", "Plantillas|Los formatos y campos se acordarán durante el levantamiento."] },
  p25: { title: "Usuarios, perfiles y permisos", short: "Usuarios y permisos", icon: "♙", description: "Define accesos individuales, roles y permisos por obra.", action: "Nuevo usuario", columns: ["Usuario de ejemplo", "Perfil", "Acceso", "Estado"], rows: [["Camila Rojas", "Jefatura de obra", "Obras asignadas", "Activo"], ["Tomás Silva", "Compras", "Obras asignadas", "Activo"], ["Daniela Soto", "Finanzas", "Según perfil", "Activo"]], notes: ["Seguridad|La matriz de roles y segregación de funciones debe ser aprobada.", "Prototipo|No existen cuentas reales ni control de acceso implementado."] },
  p26: { title: "Auditoría y bitácora", short: "Auditoría", icon: "◷", description: "Consulta la trazabilidad de cambios, aprobaciones y movimientos.", action: "Exportar bitácora", columns: ["Actividad de ejemplo", "Responsable", "Fecha", "Estado"], rows: [["Revisión de OC-023", "Tomás Silva", "14 nov 2026", "Aprobado"], ["Actualización de presupuesto", "Camila Rojas", "12 nov 2026", "Registrado"], ["Revisión de factura", "Daniela Soto", "11 nov 2026", "Registrado"]], notes: ["Bitácora|La implementación deberá registrar actor, fecha, acción y valores relevantes.", "Integridad|Los registros mostrados son ilustrativos, no una auditoría real."] },
  p27: { title: "Parámetros financieros", short: "Parámetros", icon: "⚙", description: "Configura criterios financieros, límites y autorizaciones.", action: "Editar parámetros", columns: ["Parámetro", "Categoría", "Valor", "Estado"], rows: [["Límites de aprobación", "Autorizaciones", "Por definir", "Pendiente"], ["Criterios de prorrateo", "Distribución", "Por definir", "Pendiente"], ["Reglas de cierre", "Finanzas", "Por definir", "Pendiente"]], notes: ["Reglas de negocio|Los valores y responsables deben validarse con cada área.", "Control de cambios|Las modificaciones deberán requerir permisos y auditoría."] },
  p28: { title: "Centro de alertas y tareas", short: "Alertas y tareas", icon: "◉", description: "Revisa vencimientos, aprobaciones e inconsistencias pendientes.", action: "Nueva tarea", columns: ["Alerta", "Referencia", "Responsable", "Estado"], rows: [["Factura próxima a vencer", "F-1045", "Finanzas", "Pendiente"], ["OC pendiente de aprobación", "OC-024", "Compras", "Pendiente"], ["Posible documento duplicado", "F-0860", "Administración", "En revisión"]], notes: ["Seguimiento|Asignar responsables y fechas de atención para cada alerta.", "Notificaciones|Los canales y reglas de envío están pendientes de definición."] },
  p29: { title: "Asistencia documental con IA", short: "Asistencia con IA", icon: "✧", description: "Explora la extracción asistida de documentos para preparar borradores.", action: "Cargar documento", columns: ["Documento", "Tipo", "Revisión humana", "Estado"], rows: [["Factura de ejemplo", "Factura", "Requerida", "Por implementar"], ["Cotización de ejemplo", "Cotización", "Requerida", "Por implementar"]], notes: ["Funcionalidad opcional|La asistencia con IA está sujeta a alcance y aprobación.", "Validación humana|La extracción nunca deberá aprobar ni registrar operaciones automáticamente."] },
  p30: { title: "Aprobación y pagos masivos", short: "Pagos masivos", icon: "⇉", description: "Prepara lotes de pago y revisa documentos sujetos a aprobación.", action: "Preparar lote", columns: ["Documento", "Proveedor", "Monto", "Estado"], rows: [["F-1045", "Materiales Cordillera", "$ 12.800.000", "Pendiente"], ["F-0892", "Instalaciones Sur", "$ 8.500.000", "En revisión"], ["F-0710", "Acabados del Valle", "$ 6.200.000", "Pagado"]], notes: ["Antes de pagar|Validar autorización, saldos y ausencia de pagos duplicados.", "Planilla bancaria|Formato, confirmación y conciliación bancaria deben definirse."] },
  p31: { title: "Colaboración multiusuario", short: "Colaboración", icon: "♧", description: "Coordina tareas y actividad de los equipos por obra.", action: "Asignar tarea", columns: ["Actividad", "Obra", "Responsable", "Estado"], rows: [["Revisar presupuesto", "Local Parque Norte", "Camila Rojas", "Pendiente"], ["Aprobar orden de compra", "Oficinas Nueva Vista", "Tomás Silva", "En revisión"], ["Conciliar factura", "Tienda Los Robles", "Daniela Soto", "Pendiente"]], notes: ["Trabajo simultáneo|La plataforma definitiva requiere control de concurrencia y conflictos.", "Asignación|Las tareas deberán respetar los permisos y accesos por obra."] }
};

const app = document.getElementById("app");
const dialogRoot = document.getElementById("dialog-root");
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const currentId = () => {
  const id = location.hash.slice(1).toLowerCase();
  return Object.prototype.hasOwnProperty.call(modules, id) ? id : "p02";
};
const navigate = id => { location.hash = id; };
const badgeClass = value => /pendiente|revisión|preparación|parcial|implementar/i.test(value) ? "warn" : /excepción|rechazado/i.test(value) ? "danger" : /cerrado|finalizado/i.test(value) ? "neutral" : "";
const badge = value => `<span class="badge ${badgeClass(value)}">${escapeHTML(value)}</span>`;

function sidebar(id) {
  return `<div class="sidebar-overlay" data-action="menu-close"></div><aside class="sidebar" aria-label="Navegación principal">
    <div class="brand"><div class="brand-mark">N</div><div class="brand-name">NÓMADE<small>GESTIÓN DE OBRAS</small></div></div>
    <nav class="side-scroll">${sections.map(section => `<div class="nav-title">${section.title}</div>${section.ids.map(key => {
      const m = modules[key];
      return `<button class="nav-button ${key === id ? "active" : ""}" data-nav="${key}" ${key === id ? 'aria-current="page"' : ""}><span class="nav-icon" aria-hidden="true">${m.icon}</span><span>${escapeHTML(m.short || m.title)}</span><span class="nav-number">${key.toUpperCase()}</span></button>`;
    }).join("")}`).join("")}</nav>
    <div class="side-bottom">◌ &nbsp; Entorno de demostración<br>&nbsp;&nbsp;&nbsp;&nbsp; Datos ficticios · Sin conexión</div>
  </aside>`;
}

function topbar(title) {
  return `<header class="topbar"><div class="breadcrumbs"><button class="mobile-menu" data-action="menu" aria-label="Abrir menú">☰</button><span>Espacio de trabajo &nbsp; / &nbsp; <strong>${escapeHTML(title)}</strong></span></div><div class="top-right"><button class="top-action" data-nav="p28" aria-label="Ver alertas">♧<span class="dot"></span></button><div class="profile"><div class="avatar">DE</div><div class="profile-text"><strong>Usuario demo</strong><small>Vista de demostración</small></div></div></div></header>`;
}

function strip() {
  return `<div class="demo-strip"><span>◈</span><span><strong>Prototipo navegable.</strong> Datos ficticios; no registra operaciones ni protege información real.</span><button data-action="about">Conocer alcance →</button></div>`;
}

function heading(id, title, description, button, target) {
  return `<div class="heading-row"><div><div class="eyebrow">${id.toUpperCase()} &nbsp; / &nbsp; Gestión de obras</div><h1>${escapeHTML(title)}</h1><p>${escapeHTML(description)}</p></div>${button ? `<button class="button primary" ${target ? `data-nav="${target}"` : `data-action="unavailable" data-label="${escapeHTML(button)}"`}>＋ &nbsp; ${escapeHTML(button)}</button>` : ""}</div>`;
}

function stat(label, value, foot, icon) {
  return `<div class="stat"><div class="stat-top"><span>${label}</span><span class="stat-icon">${icon}</span></div><div class="stat-value">${value}</div><div class="stat-foot">${foot}</div></div>`;
}

function dashboard() {
  const rows = [
    ["Local Parque Norte", "CC-001 · Grupo Andino", "Camila Rojas", "72", "$ 92.000.000", "En ejecución"],
    ["Oficinas Nueva Vista", "CC-002 · Inmobiliaria Central", "Tomás Silva", "58", "$ 70.000.000", "En ejecución"],
    ["Tienda Los Robles", "CC-003 · Grupo Andino", "Daniela Soto", "41", "$ 48.000.000", "En ejecución"],
    ["Habilitación Providencia", "CC-004 · Comercial Austral", "Javier Díaz", "95", "$ 36.000.000", "En cierre"]
  ];
  const bars = [["Jun", 45, 28], ["Jul", 62, 42], ["Ago", 55, 37], ["Sep", 76, 52], ["Oct", 68, 49], ["Nov", 90, 67]];
  return `${heading("p02", "Buenos días, equipo 👋", "Aquí tienes un resumen de lo que sucede en tus obras.", "Ver obras", "p03")}${strip()}
    <div class="summary">${stat("Obras activas", "4", '<span class="positive">●</span> Proyectos en seguimiento', "▣")}${stat("Presupuesto total", "$ 456,0M", "Monto referencial aprobado", "▤")}${stat("Ingresos acumulados", "$ 246,0M", "Estados de pago de ejemplo", "↗")}${stat("Costos acumulados", "$ 187,5M", "Costos registrados de ejemplo", "◔")}</div>
    <div class="dashboard-grid"><section class="card"><div class="card-head"><div><h2>Resumen financiero</h2><p>Ingresos y costos de las obras · cifras ilustrativas</p></div><div class="chart-legend"><span><i class="legend-dot" style="background:#83ad83"></i>Ingresos</span><span><i class="legend-dot" style="background:#dce8d9"></i>Costos</span></div></div>
      <div class="chart" role="img" aria-label="Gráfico ilustrativo de ingresos y costos de junio a noviembre"><div class="chart-labels"><span>$ 100M</span><span>$ 75M</span><span>$ 50M</span><span>$ 25M</span><span>$ 0</span></div><div class="chart-body">${bars.map(([month, income, cost]) => `<div class="bar-group"><div class="bar" style="height:${income}%"></div><div class="bar cost" style="height:${cost}%"></div><span class="bar-label">${month}</span></div>`).join("")}</div></div></section>
      <section class="card"><div class="card-head"><div><h2>Distribución de costos</h2><p>Por categoría · datos ilustrativos</p></div><button class="text-link" data-nav="p18">Ver detalle ↗</button></div><div class="distribution"><div class="donut"><div class="donut-center"><strong>100%</strong>del costo</div></div><div class="dist-list"><div class="dist-item"><span><i class="legend-dot" style="background:#668f6d"></i>Materiales</span><strong>43%</strong></div><div class="dist-item"><span><i class="legend-dot" style="background:#a7c69b"></i>Subcontratos</span><strong>29%</strong></div><div class="dist-item"><span><i class="legend-dot" style="background:#eac198"></i>Mano de obra</span><strong>16%</strong></div><div class="dist-item"><span><i class="legend-dot" style="background:#e9eee5"></i>Otros gastos</span><strong>12%</strong></div></div></div></section></div>
    <section class="card"><div class="card-head"><div><h2>Obras en seguimiento</h2><p>Estado general de tus proyectos</p></div><button class="text-link" data-nav="p03">Ver todas las obras →</button></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Obra</th><th>Responsable</th><th>Avance</th><th>Ingresos</th><th>Estado</th></tr></thead><tbody>${rows.map(row => `<tr><td><div class="project-name"><span class="project-icon">▣</span><span>${row[0]}<small>${row[1]}</small></span></div></td><td>${row[2]}</td><td><div class="progress-cell"><div class="progress"><span style="width:${row[3]}%"></span></div><small>${row[3]}%</small></div></td><td>${row[4]}</td><td>${badge(row[5])}</td></tr>`).join("")}</tbody></table></div><div class="table-footer"><span>Mostrando 4 obras de ejemplo</span><button class="text-link" data-nav="p05">Abrir ficha de obra →</button></div></section>`;
}

function renderTable(m) {
  return `<div class="toolbar"><div class="search-wrap"><span>⌕</span><input id="table-search" class="search" type="search" placeholder="Buscar en estos registros..." aria-label="Buscar registros"></div><select id="table-filter" class="filter" aria-label="Filtrar por estado"><option value="">Todos los estados</option>${[...new Set(m.rows.map(row => row[row.length - 1]))].map(state => `<option value="${escapeHTML(state)}">${escapeHTML(state)}</option>`).join("")}</select></div>
    <div class="table-wrap"><table class="data-table"><thead><tr>${m.columns.map(col => `<th scope="col">${escapeHTML(col)}</th>`).join("")}</tr></thead><tbody id="table-body"></tbody></table><div class="empty" id="table-empty" hidden>No hay registros que coincidan con la búsqueda.</div></div><div class="table-footer"><span id="table-count"></span><span>Datos de demostración</span></div>`;
}

function updateTable(m) {
  const search = document.getElementById("table-search").value.trim().toLocaleLowerCase("es");
  const filter = document.getElementById("table-filter").value;
  const rows = m.rows.filter(row => row.join(" ").toLocaleLowerCase("es").includes(search) && (!filter || row[row.length - 1] === filter));
  document.getElementById("table-body").innerHTML = rows.map(row => `<tr>${row.map((cell, index) => `<td>${index === row.length - 1 ? badge(cell) : escapeHTML(cell)}</td>`).join("")}</tr>`).join("");
  document.getElementById("table-empty").hidden = rows.length > 0;
  document.getElementById("table-count").textContent = `${rows.length} ${rows.length === 1 ? "registro" : "registros"} de ejemplo`;
}

function renderForm(m) {
  return `<div class="form-grid">${m.form.map(([label, placeholder], index) => `<div class="field"><label for="field-${index}">${escapeHTML(label)}</label><input id="field-${index}" type="${placeholder === "date" ? "date" : "text"}" ${placeholder === "date" ? "" : `placeholder="${escapeHTML(placeholder)}"`}></div>`).join("")}</div><div class="notice">Los campos son solo ilustrativos. La información ingresada no se guarda ni se envía.</div><div class="form-actions"><button class="button primary" data-action="unavailable" data-label="${escapeHTML(m.action)}">${escapeHTML(m.action)}</button><button class="button" data-nav="${m.title.includes("EEPP") ? "p07" : "p03"}">Volver al listado</button></div>`;
}

function modulePage(id) {
  const m = modules[id];
  return `${heading(id, m.title, m.description, m.form ? null : m.action, m.target)}${strip()}<div class="section-grid"><section class="card"><div class="card-head"><div><h2>${m.form ? "Información general" : "Registros de ejemplo"}</h2><p>${m.form ? "Completa los campos para explorar la pantalla" : "Consulta y filtra la información de esta vista"}</p></div><span class="badge neutral">Vista demo</span></div>${m.form ? renderForm(m) : renderTable(m)}</section><aside class="card"><div class="card-head"><div><h2>Sobre esta pantalla</h2><p>Consideraciones funcionales</p></div></div><ul class="info-list">${m.notes.map(note => { const [title, body] = note.split("|"); return `<li><strong>${escapeHTML(title)}</strong>${escapeHTML(body)}</li>`; }).join("")}</ul><div class="notice">La funcionalidad definitiva está sujeta a levantamiento y aprobación.</div></aside></div>`;
}

function login() {
  return `<div class="login-page"><section class="login-art"><div class="brand-name">NÓMADE <small>GESTIÓN DE OBRAS</small></div><div><h1>Construyamos con más claridad.</h1><p>Una visión integral para acompañar cada etapa de tus obras, desde el presupuesto hasta el resultado.</p></div><small>CONSTRUCTORA NÓMADE &nbsp; · &nbsp; PROTOTIPO</small></section><main class="login-panel"><div class="login-box"><div class="eyebrow">P01 / ACCESO</div><h2>Bienvenido de nuevo</h2><p>Esta es una vista de demostración. No ingreses credenciales ni datos personales reales.</p><label for="demo-user">Usuario de ejemplo</label><input id="demo-user" value="Usuario demo" disabled><label for="demo-password">Contraseña</label><input id="demo-password" value="demostración" disabled><button class="button primary" data-nav="p02">Entrar a la demostración →</button><button class="text-link" data-action="unavailable" data-label="Recuperación de acceso">Recuperar acceso</button><div class="notice">No hay autenticación, sesiones ni permisos reales en esta versión.</div></div></main></div>`;
}

function render() {
  const id = currentId();
  if (id === "p01") { app.innerHTML = login(); return; }
  app.innerHTML = `<div class="app">${sidebar(id)}<main class="main">${topbar(modules[id].title)}<div class="content">${id === "p02" ? dashboard() : modulePage(id)}</div></main></div>`;
  if (modules[id].rows) {
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

document.addEventListener("click", event => {
  const button = event.target.closest("[data-nav], [data-action]");
  if (!button) return;
  if (button.dataset.nav) { navigate(button.dataset.nav); return; }
  const action = button.dataset.action;
  if (action === "menu") { document.querySelector(".sidebar").classList.add("open"); document.querySelector(".sidebar-overlay").classList.add("show"); }
  if (action === "menu-close") { document.querySelector(".sidebar").classList.remove("open"); document.querySelector(".sidebar-overlay").classList.remove("show"); }
  if (action === "about") showDialog("Alcance del prototipo", "Esta versión permite revisar las 31 pantallas con datos ficticios. No cuenta con base de datos, autenticación, permisos, integraciones ni operaciones financieras. El levantamiento de Laudus y las reglas de negocio aún deben validarse.");
  if (action === "unavailable") showDialog(button.dataset.label || "Funcionalidad pendiente", "Esta acción es parte del alcance propuesto y aún no está implementada. No se guardó ni envió información. Su comportamiento y autorizaciones deben definirse antes del desarrollo.");
  if (action === "close" || (action === "backdrop" && event.target === button)) closeDialog();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && dialogRoot.firstChild) closeDialog();
  if (event.key === "Tab" && dialogRoot.firstChild) {
    const buttons = [...dialogRoot.querySelectorAll("button")];
    if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons[buttons.length - 1].focus(); }
    else if (!event.shiftKey && document.activeElement === buttons[buttons.length - 1]) { event.preventDefault(); buttons[0].focus(); }
  }
});
window.addEventListener("hashchange", render);
render();
