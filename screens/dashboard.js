screenGroups.push({
  screens: {
  p02: { title: "Dashboard", icon: "▦" }
  },
  related: {
  p02: ["p03", "p07", "p10", "p28"]
  }
});

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
    <section class="card"><div class="card-head"><div><h2>Obras en seguimiento</h2><p>Estado general de tus proyectos</p></div><button class="text-link" data-nav="p03">Ver todas las obras →</button></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Obra</th><th>Responsable</th><th>Avance</th><th>Ingresos</th><th>Estado</th></tr></thead><tbody>${rows.map((row, index) => `<tr><td><div class="project-name"><span class="project-icon">▣</span><span>${index === 0 ? `<a class="record-link" href="#p05" data-nav="p05">${row[0]}</a>` : row[0]}<small>${row[1]}</small></span></div></td><td>${row[2]}</td><td><div class="progress-cell"><div class="progress"><span style="width:${row[3]}%"></span></div><small>${row[3]}%</small></div></td><td>${row[4]}</td><td>${badge(row[5])}</td></tr>`).join("")}</tbody></table></div><div class="table-footer"><span>Mostrando 4 obras de ejemplo</span><button class="text-link" data-nav="p05">Abrir ficha de ejemplo →</button></div></section>${relatedNavigation("p02")}`;
}

