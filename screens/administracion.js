screenGroups.push({
  screens: {
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
  },
  related: {
  p22: ["p10", "p11", "p24"],
  p23: ["p24", "p13", "p26"],
  p24: ["p06", "p22", "p23"],
  p25: ["p26", "p27", "p31"],
  p26: ["p25", "p27", "p28"],
  p27: ["p25", "p26", "p30"],
  p28: ["p07", "p12", "p17", "p31"],
  p29: ["p12", "p11", "p23"],
  p30: ["p10", "p12", "p17", "p16"],
  p31: ["p03", "p25", "p26", "p28"]
  }
});

function usersPage() {
  return `${heading("p25", "Usuarios, perfiles y permisos", "Crea cuentas individuales para el equipo.", null)}${strip()}
    <div class="section-grid"><section class="card"><div class="card-head"><div><h2>Usuarios registrados</h2><p>Solo los administradores pueden consultar y crear cuentas.</p></div></div>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>Usuario</th><th>Nombre</th><th>Perfil</th><th>Contraseña</th></tr></thead><tbody id="users-body"></tbody></table></div><p id="users-status" class="form-message" role="status">Cargando usuarios...</p></section>
    <aside class="card"><div class="card-head"><div><h2>Crear usuario</h2><p>El usuario deberá cambiar su contraseña al ingresar.</p></div></div>
    <form id="create-user-form" class="account-form"><label for="new-username">Usuario</label><input id="new-username" name="username" minlength="3" maxlength="64" pattern="(?:[A-Za-z0-9._]|-)+" autocomplete="off" required><label for="display-name">Nombre</label><input id="display-name" name="displayName" minlength="2" maxlength="100" required><label for="temporary-password">Contraseña temporal</label><input id="temporary-password" name="password" type="password" minlength="12" maxlength="128" autocomplete="new-password" required><p class="form-hint">Mínimo 12 caracteres. Entrégala por un canal seguro.</p><p class="form-message" role="status"></p><button class="button primary" type="submit">Crear usuario</button></form>
    <div class="notice">Las restricciones por obra y la recuperación de cuentas requieren desarrollo adicional.</div>${relatedNavigation("p25")}</aside></div>`;
}

async function loadUsers() {
  try {
    const result = await requestApi("/api/users");
    const body = document.getElementById("users-body");
    const status = document.getElementById("users-status");
    if (!body || !status) return;
    body.innerHTML = result.users.map(user => `<tr><td>${escapeHTML(user.username)}</td><td>${escapeHTML(user.displayName)}</td><td>${user.role === "admin" ? "Administrador" : "Usuario"}</td><td>${user.mustChangePassword ? "Cambio pendiente" : "Configurada"}</td></tr>`).join("");
    status.textContent = `${result.users.length} ${result.users.length === 1 ? "usuario registrado" : "usuarios registrados"}`;
  } catch (error) {
    const status = document.getElementById("users-status");
    if (status) status.textContent = error.message;
  }
}

