import { useState } from 'react';
import s from './ExportarBtn.module.css';

// ── Paleta oficial SoluRH ──────────────────────────────────
const COLORES = {
  verdeProfundo:  '#1B2A4D',
  verdeMedio:     '#2D5A9E',
  verdeSalvia:    '#4C8FB9',
  verdeMenta:     '#E8EDF5',
  tierraCalida:   '#6B7280',
  oroForestal:    '#94A3B8',
  rojoAlerta:     '#8B2E2E',
  fondoClaro:     '#F2F4F7',
  pergaminoVerde: '#DCE3ED',
  grafito:        '#4A4A4A',
};

// ── CSV ─────────────────────────────────────────────────────
function exportCSV(data, cols, title) {
  if (!data.length) return;
  const header = cols.join(',');
  const rows   = data.map(row =>
    cols.map(col => {
      const val = String(row[col] ?? '').replace(/"/g, '""');
      return `"${val}"`;
    }).join(',')
  );
  const csv  = [header, ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${title}_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Generar SVG de gráfico de barras ───────────────────────
function generarBarChart(data, cols, maxBarras = 10) {
  if (!data.length || cols.length < 1) return '';

  // Tomamos los primeros maxBarras registros y la primera columna numérica
  const labelCol = cols[0];
  const valueCol = cols.find((c, i) => i > 0 && data.some(r => !isNaN(Number(r[c] ?? '')))) || cols[1];
  if (!valueCol) return '';

  const slice  = data.slice(0, maxBarras);
  const values = slice.map(r => Number(r[valueCol] ?? 0) || 0);
  const maxVal = Math.max(...values, 1);

  const W = 520, H = 160, pad = { top: 10, right: 10, bottom: 40, left: 45 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;
  const barW   = Math.floor(chartW / slice.length) - 4;

  const barras = slice.map((row, i) => {
    const val    = values[i];
    const bh     = Math.round((val / maxVal) * chartH);
    const x      = pad.left + i * (chartW / slice.length) + 2;
    const y      = pad.top + chartH - bh;
    const label  = String(row[labelCol] ?? '').slice(0, 10);
    const color  = i % 2 === 0 ? COLORES.verdeMedio : COLORES.oroForestal;

    return `
      <rect x="${x}" y="${y}" width="${barW}" height="${bh}" fill="${color}" rx="3"/>
      <text x="${x + barW/2}" y="${pad.top + chartH + 14}" text-anchor="middle"
            font-size="7" fill="${COLORES.grafito}" transform="rotate(-30,${x + barW/2},${pad.top + chartH + 14})">${label}</text>
      <text x="${x + barW/2}" y="${y - 3}" text-anchor="middle" font-size="7" fill="${COLORES.verdeProfundo}" font-weight="bold">${val}</text>
    `;
  }).join('');

  // Líneas de guía
  const guias = [0, 0.25, 0.5, 0.75, 1].map(p => {
    const yg  = pad.top + chartH - Math.round(p * chartH);
    const val = Math.round(p * maxVal);
    return `
      <line x1="${pad.left}" y1="${yg}" x2="${W - pad.right}" y2="${yg}" stroke="${COLORES.pergaminoVerde}" stroke-width="1"/>
      <text x="${pad.left - 4}" y="${yg + 3}" text-anchor="end" font-size="7" fill="${COLORES.grafito}">${val}</text>
    `;
  }).join('');

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <rect width="${W}" height="${H}" fill="${COLORES.fondoClaro}" rx="6"/>
      ${guias}
      ${barras}
      <text x="${pad.left}" y="${H - 2}" font-size="8" fill="${COLORES.tierraCalida}">${valueCol.replace(/_/g,' ')}</text>
    </svg>`;
}

// ── Generar SVG de gráfico de pastel ───────────────────────
function generarPieChart(data, cols, maxSlices = 6) {
  if (!data.length || cols.length < 2) return '';

  const labelCol = cols[0];
  const valueCol = cols.find((c, i) => i > 0 && data.some(r => !isNaN(Number(r[c] ?? ''))));
  if (!valueCol) return '';

  const slice  = data.slice(0, maxSlices);
  const values = slice.map(r => Math.abs(Number(r[valueCol] ?? 0)) || 0);
  const total  = values.reduce((a, b) => a + b, 0) || 1;

  const pieColors = [
    COLORES.verdeMedio, COLORES.oroForestal, COLORES.tierraCalida,
    COLORES.verdeSalvia, COLORES.rojoAlerta, COLORES.verdeProfundo,
  ];

  const R = 60, cx = 80, cy = 80, W = 340, H = 180;
  let startAngle = -Math.PI / 2;

  const sectors = slice.map((row, i) => {
    const angle = (values[i] / total) * 2 * Math.PI;
    const x1 = cx + R * Math.cos(startAngle);
    const y1 = cy + R * Math.sin(startAngle);
    const x2 = cx + R * Math.cos(startAngle + angle);
    const y2 = cy + R * Math.sin(startAngle + angle);
    const large = angle > Math.PI ? 1 : 0;
    const color = pieColors[i % pieColors.length];
    const path  = `M${cx},${cy} L${x1},${y1} A${R},${R} 0 ${large},1 ${x2},${y2} Z`;
    const pct   = Math.round((values[i] / total) * 100);
    const lx    = cx + (R + 18) * Math.cos(startAngle + angle / 2);
    const ly    = cy + (R + 18) * Math.sin(startAngle + angle / 2);
    startAngle += angle;
    return { path, color, label: String(row[labelCol] ?? '').slice(0,12), pct, lx, ly };
  });

  const slices = sectors.map(({ path, color }) =>
    `<path d="${path}" fill="${color}" stroke="white" stroke-width="1.5"/>`
  ).join('');

  const labels = sectors
    .filter(s => s.pct >= 5)
    .map(({ lx, ly, pct }) =>
      `<text x="${lx}" y="${ly}" text-anchor="middle" font-size="7.5" fill="white" font-weight="bold">${pct}%</text>`
    ).join('');

  const legend = sectors.map(({ color, label, pct }, i) => {
    const lx = 165, ly = 14 + i * 25;
    return `
      <rect x="${lx}" y="${ly}" width="10" height="10" fill="${color}" rx="2"/>
      <text x="${lx + 14}" y="${ly + 8}" font-size="8" fill="${COLORES.grafito}">${label} (${pct}%)</text>`;
  }).join('');

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <rect width="${W}" height="${H}" fill="${COLORES.fondoClaro}" rx="6"/>
      ${slices}
      ${labels}
      ${legend}
    </svg>`;
}

// ── Exportar PDF visual ─────────────────────────────────────
function exportPDF(data, cols, title, { chartType = 'bar' } = {}) {
  if (!data.length) return;

  const fecha  = new Date().toLocaleDateString('es-GT', { year:'numeric', month:'long', day:'numeric' });
  const barSVG = generarBarChart(data, cols);
  const pieSVG = chartType === 'pie' ? generarPieChart(data, cols) : '';

  // Convertir SVG a dataURL para incrustarlos inline
  const svgToDataUrl = (svg) =>
    svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : '';

  const barUrl = svgToDataUrl(barSVG);
  const pieUrl = svgToDataUrl(pieSVG);

  const thead = cols.map(c => `<th>${c.replace(/_/g,' ')}</th>`).join('');
  const tbody = data.map((row, idx) =>
    `<tr class="${idx % 2 === 0 ? '' : 'alt'}">${cols.map(col => `<td>${row[col] ?? '—'}</td>`).join('')}</tr>`
  ).join('');

  const html = `
    <!DOCTYPE html><html lang="es"><head>
    <meta charset="UTF-8"/>
    <title>${title}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap');

      * { box-sizing: border-box; margin:0; padding:0; }
      body {
        font-family: 'Nunito', Arial, sans-serif;
        font-size: 11px;
        color: ${COLORES.grafito};
        background: #fff;
        padding: 0;
      }

      /* ── Encabezado decorativo ── */
      .header {
        background: linear-gradient(135deg, ${COLORES.verdeProfundo} 0%, ${COLORES.verdeMedio} 100%);
        color: #fff;
        padding: 22px 30px 18px;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }
      .header-left { display: flex; align-items: center; gap: 14px; }
      .header-icon {
        width: 48px; height: 48px; background: rgba(255,255,255,.18);
        border-radius: 12px; display: flex; align-items: center; justify-content: center;
        font-size: 26px; flex-shrink: 0;
      }
      .header h1 { font-size: 20px; font-weight: 800; letter-spacing: -.3px; }
      .header .sub { font-size: 10px; opacity: .8; margin-top: 3px; }
      .header .badge {
        background: rgba(255,255,255,.15); border: 1px solid rgba(255,255,255,.3);
        border-radius: 20px; padding: 6px 14px; font-size: 10px;
        text-align: right; white-space: nowrap;
      }
      .header .badge strong { display:block; font-size: 14px; font-weight:800; }

      /* ── Cuerpo ── */
      .body { padding: 20px 28px; }

      /* ── KPIs ── */
      .kpis {
        display: grid; grid-template-columns: repeat(3, 1fr);
        gap: 12px; margin-bottom: 20px;
      }
      .kpi {
        background: ${COLORES.fondoClaro};
        border: 1px solid ${COLORES.pergaminoVerde};
        border-radius: 10px; padding: 12px 14px;
        border-left: 4px solid ${COLORES.verdeMedio};
      }
      .kpi .kpi-label { font-size: 9px; color: ${COLORES.tierraCalida}; text-transform: uppercase; letter-spacing: .6px; font-weight: 700; }
      .kpi .kpi-val   { font-size: 20px; font-weight: 800; color: ${COLORES.verdeProfundo}; margin-top: 2px; }

      /* ── Sección ── */
      .section { margin-bottom: 20px; }
      .section-title {
        font-size: 11px; font-weight: 800; color: ${COLORES.verdeProfundo};
        text-transform: uppercase; letter-spacing: .8px; margin-bottom: 10px;
        padding-bottom: 5px; border-bottom: 2px solid ${COLORES.pergaminoVerde};
        display: flex; align-items: center; gap: 6px;
      }
      .section-title::before {
        content: ''; display: inline-block;
        width: 4px; height: 14px; background: ${COLORES.verdeMedio};
        border-radius: 2px; flex-shrink: 0;
      }

      /* ── Gráficos ── */
      .charts { display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
      .chart-box {
        flex: 1; min-width: 200px;
        background: ${COLORES.fondoClaro};
        border: 1px solid ${COLORES.pergaminoVerde};
        border-radius: 10px; padding: 12px;
      }
      .chart-box h3 { font-size: 9px; color: ${COLORES.tierraCalida}; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 8px; }
      .chart-box img { width: 100%; height: auto; display: block; }

      /* ── Tabla ── */
      table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
      thead tr { background: ${COLORES.verdeProfundo}; }
      th {
        color: #fff; padding: 8px 10px; text-align: left;
        font-size: 8.5px; text-transform: uppercase; letter-spacing: .5px; font-weight: 700;
      }
      td { padding: 7px 10px; border-bottom: 1px solid ${COLORES.pergaminoVerde}; vertical-align: top; }
      tr.alt td { background: ${COLORES.fondoClaro}; }
      tr:last-child td { border-bottom: none; }
      tbody tr:hover td { background: ${COLORES.verdeMenta}; }

      /* ── Footer ── */
      .footer {
        margin-top: 24px; padding: 14px 28px;
        background: ${COLORES.fondoClaro};
        border-top: 2px solid ${COLORES.pergaminoVerde};
        display: flex; justify-content: space-between; align-items: center;
        font-size: 8.5px; color: ${COLORES.tierraCalida};
      }
      .footer strong { color: ${COLORES.verdeProfundo}; }

      @media print {
        body { padding: 0; }
        .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        thead tr { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .kpi, .chart-box { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    </style>
    </head><body>

    <!-- Encabezado -->
    <div class="header">
      <div class="header-left">
        <div class="header-icon">👥</div>
        <div>
          <h1>${title}</h1>
          <div class="sub">Generado el ${fecha} · SoluRH — Sistema de Gestión de Personal</div>
        </div>
      </div>
      <div class="badge">
        <span>Total registros</span>
        <strong>${data.length}</strong>
      </div>
    </div>

    <div class="body">

      <!-- KPIs rápidos -->
      <div class="kpis">
        <div class="kpi">
          <div class="kpi-label">Registros totales</div>
          <div class="kpi-val">${data.length}</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Columnas</div>
          <div class="kpi-val">${cols.length}</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Fecha exportación</div>
          <div class="kpi-val" style="font-size:12px">${fecha}</div>
        </div>
      </div>

      <!-- Gráficos -->
      ${(barUrl || pieUrl) ? `
      <div class="section">
        <div class="section-title">Visualización de datos</div>
        <div class="charts">
          ${barUrl ? `
          <div class="chart-box">
            <h3>Distribución por cantidad</h3>
            <img src="${barUrl}" alt="Gráfico de barras"/>
          </div>` : ''}
          ${pieUrl ? `
          <div class="chart-box" style="max-width:360px">
            <h3>Proporción por categoría</h3>
            <img src="${pieUrl}" alt="Gráfico circular"/>
          </div>` : ''}
        </div>
      </div>` : ''}

      <!-- Detalle de datos -->
      <div class="section">
        <div class="section-title">Detalle de registros</div>
        <table>
          <thead><tr>${thead}</tr></thead>
          <tbody>${tbody}</tbody>
        </table>
      </div>

    </div>

    <!-- Footer -->
    <div class="footer">
      <span>👥 <strong>SoluRH</strong> — Reporte generado automáticamente</span>
      <span>${data.length} registros · ${cols.length} campos · ${fecha}</span>
    </div>

    </body></html>
  `;

  const win = window.open('', '_blank');
  if (!win) { alert('Permite ventanas emergentes para exportar a PDF'); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 600);
}

// ── Componente botón ────────────────────────────────────────
export default function ExportarBtn({ data = [], cols = [], title = 'Reporte' }) {
  const [open, setOpen] = useState(false);

  if (!data.length) return null;

  return (
    <div className={s.wrap}>
      <button
        type="button"
        className={`${s.btn} ${open ? s.btnOpen : ''}`}
        onClick={() => setOpen(o => !o)}
        title="Exportar"
      >
        <span className="material-icons">download</span>
        <span className={s.label}>Exportar</span>
        <span className="material-icons" style={{fontSize:16}}>expand_more</span>
      </button>

      {open && (
        <div className={s.menu} onMouseLeave={() => setOpen(false)}>
          <button
            type="button"
            className={s.menuItem}
            onClick={() => { exportCSV(data, cols, title); setOpen(false); }}
          >
            <span className="material-icons">table_view</span>
            <div>
              <p>Excel / CSV</p>
              <span>Abrir en Excel o Sheets</span>
            </div>
          </button>
          <button
            type="button"
            className={s.menuItem}
            onClick={() => { exportPDF(data, cols, title, { chartType: 'bar' }); setOpen(false); }}
          >
            <span className="material-icons">picture_as_pdf</span>
            <div>
              <p>PDF con gráfico de barras</p>
              <span>Reporte visual completo</span>
            </div>
          </button>
          <button
            type="button"
            className={s.menuItem}
            onClick={() => { exportPDF(data, cols, title, { chartType: 'pie' }); setOpen(false); }}
          >
            <span className="material-icons">donut_large</span>
            <div>
              <p>PDF con gráfico circular</p>
              <span>Vista proporcional por categoría</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}