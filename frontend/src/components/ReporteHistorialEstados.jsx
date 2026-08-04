import { useTheme } from '../context/ThemeContext';
import { useState, useEffect, useMemo } from 'react';

import { API, apiFetch } from '../context/AuthContext';

const C = {
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

function get(obj, ...keys) {
  for (const k of keys) if (obj?.[k] !== undefined && obj?.[k] !== null) return obj[k];
  return null;
}

function fmt(val) {
  if (!val) return '—';
  if (typeof val === 'string') {
    const soloFecha = val.slice(0, 10);
    const [anio, mes, dia] = soloFecha.split('-');
    if (anio && mes && dia) {
      const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
      return `${dia} ${meses[parseInt(mes,10)-1]} ${anio}`;
    }
  }
  const d = new Date(val);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('es-GT', { day:'2-digit', month:'short', year:'numeric' });
}

// ── Generador de PDF de historial ─────────────────────────────
function generarPDFHistorial(datos) {
  const fecha = new Date().toLocaleDateString('es-GT', { year:'numeric', month:'long', day:'numeric' });

  const nombreEmpleado = (r) => {
    const nombres   = get(r,'nombres');
    const apellidos = get(r,'apellidos');
    const id        = get(r,'empleado_id');
    if (nombres || apellidos) return `${nombres || ''} ${apellidos || ''}`.trim();
    return `Empleado #${id}`;
  };

  // Estadísticas del top 5
  const conteos = {};
  datos.forEach(r => {
    const emp = nombreEmpleado(r);
    conteos[emp] = (conteos[emp] || 0) + 1;
  });
  const top5 = Object.entries(conteos)
    .sort((a,b) => b[1] - a[1])
    .slice(0,5);
  const maxCount = Math.max(...top5.map(([,c]) => c), 1);

  const CHART_W = 480, CHART_H = 140;
  const pad = { top:10, right:10, bottom:36, left:40 };
  const bW = Math.floor((CHART_W - pad.left - pad.right) / top5.length) - 6;
  const cH = CHART_H - pad.top - pad.bottom;
  const pieColors = ['#2D5A9E','#94A3B8','#6B7280','#4C8FB9','#1B2A4D'];

  const barrasTop5 = top5.map(([label, count], i) => {
    const bh = Math.round((count / maxCount) * cH);
    const x  = pad.left + i * ((CHART_W - pad.left - pad.right) / top5.length) + 3;
    const y  = pad.top + cH - bh;
    const color = pieColors[i % pieColors.length];
    const lbl = label.slice(0,14);
    return `
      <rect x="${x}" y="${y}" width="${bW}" height="${bh}" fill="${color}" rx="3"/>
      <text x="${x+bW/2}" y="${pad.top+cH+13}" text-anchor="middle" font-size="7"
            fill="#4A4A4A" transform="rotate(-30,${x+bW/2},${pad.top+cH+13})">${lbl}</text>
      <text x="${x+bW/2}" y="${y-3}" text-anchor="middle" font-size="7" font-weight="bold" fill="#1B2A4D">${count}</text>`;
  }).join('');

  const guias = [0,0.5,1].map(p => {
    const yg = pad.top + cH - Math.round(p*cH);
    const v  = Math.round(p*maxCount);
    return `<line x1="${pad.left}" y1="${yg}" x2="${CHART_W-pad.right}" y2="${yg}" stroke="#DCE3ED" stroke-width="1"/>
      <text x="${pad.left-4}" y="${yg+3}" text-anchor="end" font-size="6.5" fill="#4A4A4A">${v}</text>`;
  }).join('');

  const chartSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${CHART_W}" height="${CHART_H}" viewBox="0 0 ${CHART_W} ${CHART_H}">
    <rect width="${CHART_W}" height="${CHART_H}" fill="#F2F4F7" rx="6"/>
    ${guias}${barrasTop5}
  </svg>`;
  const chartUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(chartSVG)}`;

  const campoConteos = {};
  datos.forEach(r => {
    const campo = get(r,'campo_modificado') || '?';
    campoConteos[campo] = (campoConteos[campo] || 0) + 1;
  });
  const campoTop = Object.entries(campoConteos).sort((a,b)=>b[1]-a[1])[0];
  const empleadoTop = top5[0];

  const filas = datos.map((r, idx) => {
    const emp      = nombreEmpleado(r);
    const campo    = get(r,'campo_modificado') || '—';
    const valAnt   = get(r,'valor_anterior') || '—';
    const valNuevo = get(r,'valor_nuevo') || '—';
    const fechaCam = fmt(get(r,'fecha'));
    const modPor   = get(r,'usuario_nombre') || 'Sistema';
    return `<tr class="${idx%2===0?'':'alt'}">
      <td>${idx+1}</td>
      <td><strong>${emp}</strong></td>
      <td>${campo}</td>
      <td>${valAnt}</td>
      <td><span style="background:#E8EDF5;color:#1B2A4D;padding:2px 6px;border-radius:10px;font-size:8.5px;font-weight:700">${valNuevo}</span></td>
      <td>${fechaCam}</td>
      <td style="color:#6B7280">${modPor}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
  <title>Historial de Cambios — SoluRH</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Nunito',Arial,sans-serif;font-size:11px;color:#4A4A4A;background:#fff}
    .header{background:linear-gradient(135deg,#1B2A4D 0%,#2D5A9E 100%);color:#fff;padding:22px 30px 18px;display:flex;align-items:flex-start;justify-content:space-between}
    .header-left{display:flex;align-items:center;gap:14px}
    .h-icon{width:48px;height:48px;background:rgba(255,255,255,.18);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0}
    .header h1{font-size:19px;font-weight:800;letter-spacing:-.3px}
    .header .sub{font-size:10px;opacity:.8;margin-top:3px}
    .badge{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);border-radius:20px;padding:6px 14px;font-size:10px;text-align:right;white-space:nowrap}
    .badge strong{display:block;font-size:18px;font-weight:800}
    .body{padding:20px 28px}
    .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px}
    .kpi{background:#F2F4F7;border:1px solid #DCE3ED;border-radius:10px;padding:10px 12px;border-left:4px solid #2D5A9E}
    .kpi-label{font-size:8.5px;color:#6B7280;text-transform:uppercase;letter-spacing:.6px;font-weight:700}
    .kpi-val{font-size:18px;font-weight:800;color:#1B2A4D;margin-top:2px}
    .section{margin-bottom:18px}
    .sec-title{font-size:10px;font-weight:800;color:#1B2A4D;text-transform:uppercase;letter-spacing:.8px;margin-bottom:10px;padding-bottom:5px;border-bottom:2px solid #DCE3ED;display:flex;align-items:center;gap:6px}
    .sec-title::before{content:'';display:inline-block;width:4px;height:14px;background:#2D5A9E;border-radius:2px;flex-shrink:0}
    .chart-box{background:#F2F4F7;border:1px solid #DCE3ED;border-radius:10px;padding:12px;margin-bottom:16px}
    .chart-box h3{font-size:9px;color:#6B7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px}
    .chart-box img{width:100%;max-width:500px;height:auto}
    table{width:100%;border-collapse:collapse;font-size:9.5px}
    thead tr{background:#1B2A4D}
    th{color:#fff;padding:8px 10px;text-align:left;font-size:8.5px;text-transform:uppercase;letter-spacing:.5px;font-weight:700}
    td{padding:7px 10px;border-bottom:1px solid #DCE3ED;vertical-align:top}
    tr.alt td{background:#F2F4F7}
    tr:last-child td{border-bottom:none}
    .footer{margin-top:20px;padding:14px 28px;background:#F2F4F7;border-top:2px solid #DCE3ED;display:flex;justify-content:space-between;align-items:center;font-size:8.5px;color:#6B7280}
    .footer strong{color:#1B2A4D}
    @media print{body{padding:0}.header,.sec-title::before,thead tr{-webkit-print-color-adjust:exact;print-color-adjust:exact}.kpi,.chart-box{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style></head><body>
  <div class="header">
    <div class="header-left">
      <div class="h-icon">👥</div>
      <div>
        <h1>Historial de Cambios de Empleados</h1>
        <div class="sub">Generado el ${fecha} · SoluRH</div>
      </div>
    </div>
    <div class="badge"><span>Total cambios</span><strong>${datos.length}</strong></div>
  </div>
  <div class="body">
    <div class="kpis">
      <div class="kpi"><div class="kpi-label">Total cambios</div><div class="kpi-val">${datos.length}</div></div>
      <div class="kpi"><div class="kpi-label">Empleados únicos</div><div class="kpi-val">${Object.keys(conteos).length}</div></div>
      <div class="kpi"><div class="kpi-label">Campo más modificado</div><div class="kpi-val" style="font-size:12px">${campoTop?.[0]||'—'}</div></div>
      <div class="kpi"><div class="kpi-label">Empleado con más cambios</div><div class="kpi-val" style="font-size:11px">${empleadoTop?.[0]?.slice(0,16)||'—'}</div></div>
    </div>
    <div class="section">
      <div class="sec-title">Top 5 empleados con más cambios</div>
      <div class="chart-box">
        <h3>Cantidad de cambios por empleado</h3>
        <img src="${chartUrl}" alt="Gráfico top 5"/>
      </div>
    </div>
    <div class="section">
      <div class="sec-title">Detalle completo del historial</div>
      <table>
        <thead><tr><th>#</th><th>Empleado</th><th>Campo</th><th>Valor anterior</th><th>Valor nuevo</th><th>Fecha</th><th>Modificado por</th></tr></thead>
        <tbody>${filas}</tbody>
      </table>
    </div>
  </div>
  <div class="footer">
    <span>👥 <strong>SoluRH</strong> — Reporte de historial de cambios</span>
    <span>${datos.length} cambios registrados · ${fecha}</span>
  </div>
  </body></html>`;

  const win = window.open('', '_blank');
  if (!win) { alert('Permite ventanas emergentes para exportar'); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 600);
}

// ── Componente principal ──────────────────────────────────────
export default function ReporteHistorialEstados({ onBack }) {
  const { isDark } = useTheme();

  const [historial, setHistorial] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  const [filtroEmpleado, setFiltroEmpleado] = useState('');
  const [filtroCampo,    setFiltroCampo]    = useState('');
  const [search,         setSearch]         = useState('');
  const [fechaDesde,     setFechaDesde]     = useState('');
  const [fechaHasta,     setFechaHasta]     = useState('');

  const cargar = async () => {
    setLoading(true); setError('');
    try {
      const rH = await apiFetch(`${API}/historial-empleado/cambios/todos`).then(r => r.json());
      setHistorial(Array.isArray(rH.data) ? rH.data : []);
    } catch (e) {
      setError('No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const nombreEmpleadoDeRegistro = (r) => {
    const nombres   = get(r,'nombres');
    const apellidos = get(r,'apellidos');
    const id        = get(r,'empleado_id');
    if (nombres || apellidos) return `${nombres || ''} ${apellidos || ''}`.trim();
    return `Empleado #${id}`;
  };

  const filtrado = useMemo(() => {
    let rows = historial;
    if (filtroEmpleado) rows = rows.filter(r => String(get(r,'empleado_id')) === filtroEmpleado);
    if (filtroCampo)    rows = rows.filter(r => get(r,'campo_modificado') === filtroCampo);
    if (fechaDesde) {
      rows = rows.filter(r => {
        const fechaRaw = get(r,'fecha');
        if (!fechaRaw) return false;
        return String(fechaRaw).slice(0, 10) >= fechaDesde;
      });
    }
    if (fechaHasta) {
      rows = rows.filter(r => {
        const fechaRaw = get(r,'fecha');
        if (!fechaRaw) return false;
        return String(fechaRaw).slice(0, 10) <= fechaHasta;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        [nombreEmpleadoDeRegistro(r),
         get(r,'campo_modificado'),
         get(r,'valor_anterior'),
         get(r,'valor_nuevo')]
          .some(v => String(v||'').toLowerCase().includes(q))
      );
    }
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historial, filtroEmpleado, filtroCampo, search, fechaDesde, fechaHasta]);

  const top5 = useMemo(() => {
    const c = {};
    const nombres = {};
    historial.forEach(r => {
      const id = get(r,'empleado_id');
      c[id] = (c[id] || 0) + 1;
      if (!nombres[id]) nombres[id] = nombreEmpleadoDeRegistro(r);
    });
    return Object.entries(c)
      .sort((a,b) => b[1] - a[1])
      .slice(0,5)
      .map(([id, count]) => ({ nombre: nombres[id] || `#${id}`, count }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historial]);

  const maxTop = Math.max(...top5.map(t => t.count), 1);

  const empleadosDelHistorial = useMemo(() => {
    const vistos = new Map();
    historial.forEach(r => {
      const id = get(r,'empleado_id');
      if (id == null) return;
      if (!vistos.has(id)) {
        vistos.set(id, { nombre: nombreEmpleadoDeRegistro(r), conteo: 1 });
      } else {
        vistos.get(id).conteo++;
      }
    });
    return Array.from(vistos.entries())
      .map(([id, d]) => ({ id, nombre: d.nombre, conteo: d.conteo }))
      .sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historial]);

  const camposDelHistorial = useMemo(() => {
    const vistos = new Set();
    historial.forEach(r => {
      const campo = get(r,'campo_modificado');
      if (campo) vistos.add(campo);
    });
    return Array.from(vistos).sort();
  }, [historial]);

  const st = {
    root:       { minHeight:'100vh', background: isDark ? '#0f1117' : C.fondoClaro },
    header:     { background: isDark ? '#1a1f2e' : '#fff', borderBottom: isDark ? '1px solid rgba(255,255,255,0.07)' : `2px solid ${C.pergaminoVerde}`, padding:'20px 28px 12px' },
    breadcrumb: { display:'flex', alignItems:'center', gap:8, fontSize:12, color: isDark ? '#64748b' : C.tierraCalida, marginBottom:12 },
    backBtn:    { background:'none', border:'none', cursor:'pointer', color: isDark ? '#93c5fd' : C.verdeMedio, fontWeight:700, display:'flex', alignItems:'center', gap:2, fontSize:12 },
    sep:        { color: isDark ? 'rgba(255,255,255,0.18)' : C.pergaminoVerde },
    bcCur:      { color: isDark ? '#93c5fd' : C.verdeProfundo, fontWeight:700 },
    titleRow:   { display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:14 },
    titleBlock: { display:'flex', alignItems:'center', gap:14 },
    titleIcon:  { width:48, height:48, background: isDark ? 'rgba(37,99,235,0.12)' : C.verdeMenta, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', color: isDark ? '#60a5fa' : C.verdeProfundo, fontSize:26 },
    panelLabel: { fontSize:9, fontWeight:800, color: isDark ? '#60a5fa' : C.tierraCalida, textTransform:'uppercase', letterSpacing:'.8px', margin:0 },
    pageTitle:  { fontSize:22, fontWeight:800, color: isDark ? '#e2e8f0' : C.verdeProfundo, margin:0 },
    pageSub:    { fontSize:11, color: isDark ? '#64748b' : C.tierraCalida, marginTop:2 },
    refreshBtn: { background:C.verdeMedio, color:'#fff', border:'none', borderRadius:10, padding:'8px 14px', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:700 },
    filters:    { display:'flex', flexWrap:'wrap', gap:8, marginBottom:10 },
    searchWrap: { display:'flex', alignItems:'center', gap:6, background: isDark ? 'rgba(255,255,255,0.05)' : C.fondoClaro, border: isDark ? '1px solid rgba(255,255,255,0.10)' : `1px solid ${C.pergaminoVerde}`, borderRadius:8, padding:'6px 10px', flex:1, minWidth:200 },
    searchInput:{ border:'none', background:'none', outline:'none', fontSize:12, flex:1, color: isDark ? '#e2e8f0' : C.grafito },
    sel:        { border: isDark ? '1px solid rgba(255,255,255,0.10)' : `1px solid ${C.pergaminoVerde}`, borderRadius:8, padding:'6px 10px', fontSize:12, color: isDark ? '#e2e8f0' : C.grafito, background: isDark ? 'rgba(255,255,255,0.05)' : '#fff', cursor:'pointer' },
    counter:    { fontSize:12, color: isDark ? '#64748b' : C.tierraCalida },
    topCard:    { background: isDark ? '#1a1f2e' : '#fff', borderRadius:12, margin:'16px 20px 0', padding:'16px 20px', boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.35)' : `0 2px 8px rgba(27,42,77,.06)`, border: isDark ? '1px solid rgba(255,255,255,0.07)' : 'none' },
    topTitle:   { fontSize:11, fontWeight:800, color: isDark ? '#93c5fd' : C.verdeProfundo, textTransform:'uppercase', letterSpacing:'.6px', marginBottom:12 },
    topBars:    { display:'flex', flexDirection:'column', gap:8 },
    topItem:    { display:'flex', alignItems:'center', gap:10 },
    topLabel:   { width:140, fontSize:11, fontWeight:600, color: isDark ? '#94a3b8' : C.grafito, flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
    topBarTrack:{ flex:1, height:12, background: isDark ? 'rgba(255,255,255,0.06)' : C.pergaminoVerde, borderRadius:6, overflow:'hidden' },
    topBarFill: { height:'100%', borderRadius:6, transition:'width .4s' },
    topCount:   { width:24, fontSize:11, fontWeight:800, color: isDark ? '#93c5fd' : C.verdeProfundo, textAlign:'right' },
    content:    { padding:'16px 20px' },
    center:     { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 0', color: isDark ? '#64748b' : C.tierraCalida, gap:12 },
    spinner:    { width:32, height:32, border: isDark ? '3px solid rgba(255,255,255,0.10)' : `3px solid ${C.pergaminoVerde}`, borderTopColor:C.verdeMedio, borderRadius:'50%', animation:'spin 1s linear infinite' },
    errBox:     { display:'flex', alignItems:'center', gap:12, background: isDark ? 'rgba(239,68,68,0.10)' : '#fff5f5', border: isDark ? '1px solid rgba(239,68,68,0.25)' : `1px solid #fcc`, borderRadius:12, padding:'16px 20px', color: isDark ? '#fca5a5' : '#8B2E2E' },
    empty:      { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 0' },
    table:      { width:'100%', borderCollapse:'collapse', background: isDark ? '#1a1f2e' : '#fff', borderRadius:12, overflow:'hidden', boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.35)' : `0 2px 8px rgba(27,42,77,.06)` },
    th:         { background: isDark ? 'rgba(37,99,235,0.08)' : C.verdeProfundo, color: isDark ? '#93c5fd' : '#fff', padding:'10px 12px', textAlign:'left', fontSize:10, textTransform:'uppercase', letterSpacing:'.5px', fontWeight:700 },
    td:         { padding:'10px 12px', borderBottom: isDark ? '1px solid rgba(255,255,255,0.05)' : `1px solid ${C.pergaminoVerde}`, fontSize:12, color: isDark ? '#cbd5e1' : 'inherit' },
  };

  return (
    <div style={st.root}>
      {/* Encabezado */}
      <div style={st.header}>
        <div style={st.breadcrumb}>
          <button style={st.backBtn} onClick={onBack} type="button">
            <span className="material-icons" style={{fontSize:16}}>arrow_back_ios</span> Inicio
          </button>
          <span style={st.sep}>/</span>
          <span style={st.bcCur}>Reporte: Historial de Cambios</span>
        </div>
        <div style={st.titleRow}>
          <div style={st.titleBlock}>
            <div style={st.titleIcon}>
              <span className="material-icons">timeline</span>
            </div>
            <div>
              <p style={st.panelLabel}>REPORTES</p>
              <h1 style={st.pageTitle}>Historial de cambios</h1>
              <p style={st.pageSub}>Evolución de datos de cada empleado con fechas y observaciones</p>
            </div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button style={st.refreshBtn} onClick={cargar} type="button">
              <span style={{ width:22, height:22, borderRadius:'50%', background:'rgba(255,255,255,0.22)', display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
                <span className="material-icons" style={{fontSize:14}}>refresh</span>
              </span>
              Actualizar
            </button>
            <button
              style={{...st.refreshBtn, background:C.oroForestal}}
              onClick={() => generarPDFHistorial(filtrado)}
              type="button"
            >
              <span style={{ width:22, height:22, borderRadius:'50%', background:'rgba(255,255,255,0.22)', display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
                <span className="material-icons" style={{fontSize:14}}>picture_as_pdf</span>
              </span>
              Exportar PDF
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div style={st.filters}>
          <div style={st.searchWrap}>
            <span className="material-icons" style={{color:C.tierraCalida}}>search</span>
            <input
              style={st.searchInput}
              placeholder="Buscar empleado, campo, valor…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select style={st.sel} value={filtroEmpleado} onChange={e => setFiltroEmpleado(e.target.value)}>
            <option value="">— Todos los empleados —</option>
            {empleadosDelHistorial.map(({ id, nombre, conteo }) => (
              <option key={id} value={id}>{nombre}  ({conteo} cambio{conteo !== 1 ? 's' : ''})</option>
            ))}
          </select>
          <select style={st.sel} value={filtroCampo} onChange={e => setFiltroCampo(e.target.value)}>
            <option value="">Todos los campos</option>
            {camposDelHistorial.map(campo => (
              <option key={campo} value={campo}>{campo}</option>
            ))}
          </select>
          <input type="date" style={st.sel} value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} title="Desde"/>
          <input type="date" style={st.sel} value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} title="Hasta"/>
        </div>
        <div style={st.counter}>
          Mostrando <strong>{filtrado.length}</strong> de <strong>{historial.length}</strong> registros
        </div>
      </div>

      {/* Top 5 */}
      {top5.length > 0 && (
        <div style={st.topCard}>
          <p style={st.topTitle}>Top 5 — Empleados con más cambios</p>
          <div style={st.topBars}>
            {top5.map(({ nombre, count }, i) => (
              <div key={i} style={st.topItem}>
                <div style={st.topLabel}>{nombre}</div>
                <div style={st.topBarTrack}>
                  <div style={{
                    ...st.topBarFill,
                    width: `${(count / maxTop) * 100}%`,
                    background: i === 0 ? C.verdeMedio : i === 1 ? C.oroForestal : C.tierraCalida,
                  }}/>
                </div>
                <div style={st.topCount}>{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contenido */}
      <div style={st.content}>
        {loading ? (
          <div style={st.center}>
            <div style={st.spinner}/>
            <p>Cargando historial…</p>
          </div>
        ) : error ? (
          <div style={st.errBox}>
            <span className="material-icons">wifi_off</span>
            <p>{error}</p>
            <button onClick={cargar} style={st.refreshBtn}>
              <span style={{ width:22, height:22, borderRadius:'50%', background:'rgba(255,255,255,0.22)', display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
                <span className="material-icons" style={{fontSize:14}}>refresh</span>
              </span>
              Reintentar
            </button>
          </div>
        ) : filtrado.length === 0 ? (
          <div style={st.empty}>
            <span className="material-icons" style={{fontSize:40, color:C.pergaminoVerde}}>history_toggle_off</span>
            <p style={{color:C.tierraCalida, marginTop:8}}>Sin registros</p>
          </div>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table style={st.table}>
              <thead>
                <tr>
                  {['#','Empleado','Campo','Valor anterior','Valor nuevo','Fecha','Modificado por'].map(h => (
                    <th key={h} style={st.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrado.map((row, i) => {
                  const emp    = nombreEmpleadoDeRegistro(row);
                  const campo  = get(row,'campo_modificado') || '—';
                  const valAnt = get(row,'valor_anterior') || '—';
                  const valNvo = get(row,'valor_nuevo') || '—';
                  const fReg   = fmt(get(row,'fecha'));
                  const modPor = get(row,'usuario_nombre') || 'Sistema';
                  return (
                    <tr key={i} style={i%2===0
                      ? { background: isDark ? '#1a1f2e' : '#fff' }
                      : { background: isDark ? 'rgba(255,255,255,0.03)' : C.fondoClaro }}>
                      <td style={st.td}>{i+1}</td>
                      <td style={{...st.td, fontWeight:600, color: isDark ? '#93c5fd' : C.verdeProfundo}}>{emp}</td>
                      <td style={{...st.td, color: isDark ? '#94a3b8' : C.tierraCalida}}>{campo}</td>
                      <td style={{...st.td, color: isDark ? '#94a3b8' : C.tierraCalida}}>{valAnt}</td>
                      <td style={st.td}>
                        <span style={{background: isDark ? 'rgba(37,99,235,0.12)' : C.verdeMenta, color: isDark ? '#93c5fd' : C.verdeProfundo,
                          padding:'3px 8px', borderRadius:20, fontSize:11, fontWeight:700}}>
                          {valNvo}
                        </span>
                      </td>
                      <td style={st.td}>{fReg}</td>
                      <td style={{...st.td, color: isDark ? '#64748b' : C.tierraCalida, fontSize:11}}>{modPor}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}