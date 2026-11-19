screenGroups.push({
  screens: {
  p03: { title: "Obras y centros de costo", short: "Obras", icon: "▣", description: "Consulta y administra tus obras y centros de costo en un solo lugar.", action: "Nueva obra", target: "p04", columns: ["Obra / centro de costo", "Cliente", "Responsable", "Estado"], rows: [["Local Parque Norte · CC-001", "Grupo Andino", "Camila Rojas", "En ejecución"], ["Oficinas Nueva Vista · CC-002", "Inmobiliaria Central", "Tomás Silva", "En ejecución"], ["Tienda Los Robles · CC-003", "Grupo Andino", "Daniela Soto", "En ejecución"], ["Habilitación Providencia · CC-004", "Comercial Austral", "Javier Díaz", "En cierre"]], notes: ["Ficha integral|Reúne presupuesto, avances y resultado financiero por obra.", "Centros de costo|La estructura y las asignaciones deben validarse durante el levantamiento."] },
  p04: { title: "Alta y edición de obra", short: "Nueva obra", icon: "＋", description: "Define los datos principales, responsables y fechas de una obra.", action: "Guardar obra", form: [["Nombre de la obra", "Ej. Local Parque Norte"], ["Cliente", "Ej. Grupo Andino"], ["Centro de costo", "Ej. CC-001"], ["Responsable", "Ej. Camila Rojas"], ["Fecha de inicio", "date"], ["Fecha de término", "date"]], notes: ["Asignación|Cada obra deberá tener responsables y permisos definidos.", "Validación pendiente|Se deben confirmar los campos obligatorios y reglas de numeración."] },
  p05: { title: "Ficha 360° de la obra", short: "Ficha de obra", icon: "◫", description: "Una vista integral de la operación y la situación financiera del proyecto.", action: "Ver presupuesto", target: "p06", columns: ["Componente", "Referencia", "Detalle", "Estado"], rows: [["Presupuesto aprobado", "Versión 1", "$ 185.000.000", "Aprobado"], ["Órdenes de compra", "12 documentos", "$ 68.500.000", "En seguimiento"], ["Estados de pago", "3 presentados", "$ 92.000.000", "En seguimiento"], ["Documentos pendientes", "2 registros", "Requieren revisión", "Pendiente"]], notes: ["Obra de ejemplo|Local Parque Norte · CC-001", "Visión integral|El vínculo entre documentos e importes requiere datos reales y reglas validadas."] },
  p06: { title: "Presupuesto y partidas", short: "Presupuestos", icon: "▤", description: "Controla el presupuesto aprobado, sus partidas y modificaciones.", action: "Nueva versión", columns: ["Partida", "Presupuesto", "Comprometido", "Estado"], rows: [["Obras preliminares", "$ 18.500.000", "$ 12.400.000", "Aprobado"], ["Instalaciones", "$ 45.000.000", "$ 26.800.000", "Aprobado"], ["Terminaciones", "$ 62.000.000", "$ 29.300.000", "Aprobado"], ["Adicional de obra", "$ 8.000.000", "—", "Pendiente"]], notes: ["Versiones|Las modificaciones del presupuesto requieren revisión y aprobación.", "Control de partidas|Los cupos y reglas de imputación deben definirse antes de operar."] }
  },
  related: {
  p03: ["p04", "p05", "p06", "p18"],
  p04: ["p03", "p05", "p06"],
  p05: ["p03", "p06", "p07", "p10", "p18", "p19"],
  p06: ["p05", "p24", "p10", "p18"]
  }
});

