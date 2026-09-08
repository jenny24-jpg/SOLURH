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

// Colores del top 3, luego repite en tono neutro para el resto.
function colorPorPosicion(i) {
  if (i === 0) return C.verdeMedio;
  if (i === 1) return C.verdeSalvia;
  if (i === 2) return C.oroForestal;
  return C.pergaminoVerde;
}

export default function ReportePersonalPorCliente({ onBack }) {
  const { isDark } = useTheme();

  const [empleados, setEmpleados] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [search,    setSearch]    = useState('');

  const cargar = async () => {
    setLoading(true); setError('');
    try {
      const r = await apiFetch(`${API}/empleado`).then(res => res.json());
      setEmpleados(Array.isArray(r.data) ? r.data : []);
    } catch {
      setError('No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  // ── Agrupa empleados activos por cliente ───────────────────
  const porCliente = useMemo(() => {
    const map = new Map();

    empleados.forEach(e => {
      const cliente = get(e, 'cliente') || 'Sin cliente asignado';
      const supervisor = get(e, 'supervisor') || 'Sin supervisor asignado';
      const estado = String(get(e, 'estado') || '').toUpperCase();
      if (estado === 'INACTIVO') return;

      if (!map.has(cliente)) {
        map.set(cliente, { cliente, count: 0, supervisores: new Map() });
      }
      const grupo = map.get(cliente);
      grupo.count += 1;
      grupo.supervisores.set(
        supervisor,
        (grupo.supervisores.get(supervisor) || 0) + 1
      );
    });

    return Array.from(map.values())
      .map(g => {
        // Si un cliente llegara a tener más de un supervisor asociado
        // entre sus empleados, mostramos el que más se repite.
        const supervisorPrincipal = Array.from(g.supervisores.entries())
          .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Sin supervisor asignado';
        return { cliente: g.cliente, count: g.count, supervisor: supervisorPrincipal };
      })
      .sort((a, b) => b.count - a.count);
  }, [empleados]);

  const filtrado = useMemo(() => {
    if (!search.trim()) return porCliente;
    const q = search.toLowerCase();
    return porCliente.filter(g =>
      g.cliente.toLowerCase().includes(q) || g.supervisor.toLowerCase().includes(q)
    );
  }, [porCliente, search]);

  const maxCount = Math.max(...porCliente.map(g => g.count), 1);
  const top = porCliente[0];
  const totalClientes = porCliente.length;
  const totalEmpleados = porCliente.reduce((acc, g) => acc + g.count, 0);

  const st = {
    root:       { minHeight:'100vh', background: isDark ? '#0f1117' : C.fondoClaro },
    header:     { background: isDark ? '#1a1f2e' : '#fff', borderBottom: isDark ? '1px solid rgba(255,255,255,0.07)' : `2px solid ${C.pergaminoVerde}`, padding:'20px 28px 12px' },
    breadcrumb: { display:'flex', alignItems:'center', gap:8, fontSize:12, color: isDark ? '#64748b' : C.tierraCalida, marginBottom:12 },
    backBtn:    { background:'none', border:'none', cursor:'pointer', color: isDark ? '#93c5fd' : C.verdeMedio, fontWeight:700, display:'flex', alignItems:'center', gap:2, fontSize:12 },
    sep:        { color: isDark ? 'rgba(255,255,255,0.18)' : C.pergaminoVerde },
    bcCur:      { color: isDark ? '#93c5fd' : C.verdeProfundo, fontWeight:700 },
    titleRow:   { display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:14, flexWrap:'wrap' },
    titleBlock: { display:'flex', alignItems:'center', gap:14 },
    titleIcon:  { width:48, height:48, background: isDark ? 'rgba(37,99,235,0.12)' : C.verdeMenta, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', color: isDark ? '#60a5fa' : C.verdeProfundo, fontSize:26, flexShrink:0 },
    panelLabel: { fontSize:9, fontWeight:800, color: isDark ? '#60a5fa' : C.tierraCalida, textTransform:'uppercase', letterSpacing:'.8px', margin:0 },
    pageTitle:  { fontSize:22, fontWeight:800, color: isDark ? '#e2e8f0' : C.verdeProfundo, margin:0 },
    pageSub:    { fontSize:11, color: isDark ? '#64748b' : C.tierraCalida, marginTop:2 },
    refreshBtn: { background:C.verdeMedio, color:'#fff', border:'none', borderRadius:10, padding:'8px 14px', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:700 },
    searchWrap: { display:'flex', alignItems:'center', gap:6, background: isDark ? 'rgba(255,255,255,0.05)' : C.fondoClaro, border: isDark ? '1px solid rgba(255,255,255,0.10)' : `1px solid ${C.pergaminoVerde}`, borderRadius:8, padding:'6px 10px', maxWidth:340 },
    searchInput:{ border:'none', background:'none', outline:'none', fontSize:12, flex:1, color: isDark ? '#e2e8f0' : C.grafito },

    kpiRow:     { display:'flex', gap:12, margin:'16px 20px 0', flexWrap:'wrap' },
    kpiCard:    { flex:'1 1 200px', background: isDark ? '#1a1f2e' : '#fff', borderRadius:12, padding:'14px 18px', boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.35)' : `0 2px 8px rgba(27,42,77,.06)`, border: isDark ? '1px solid rgba(255,255,255,0.07)' : 'none' },
    kpiLabel:   { fontSize:10, fontWeight:700, color: isDark ? '#64748b' : C.tierraCalida, textTransform:'uppercase', letterSpacing:'.4px', marginBottom:6 },
    kpiValue:   { fontSize:20, fontWeight:800, color: isDark ? '#e2e8f0' : C.verdeProfundo },
    kpiSub:     { fontSize:11, color: isDark ? '#94a3b8' : C.tierraCalida, marginTop:2, display:'flex', alignItems:'center', gap:4 },

    heroCard:   { margin:'16px 20px 0', background: isDark ? 'linear-gradient(135deg,#16213a,#1a1f2e)' : `linear-gradient(135deg, ${C.verdeProfundo}, ${C.verdeMedio})`, borderRadius:16, padding:'20px 24px', color:'#fff', display:'flex', alignItems:'center', gap:18, boxShadow:'0 8px 24px rgba(27,42,77,.22)' },
    heroIcon:   { width:56, height:56, borderRadius:16, background:'rgba(255,255,255,0.16)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, flexShrink:0 },
    heroLabel:  { fontSize:10, fontWeight:800, opacity:.85, textTransform:'uppercase', letterSpacing:'.6px', marginBottom:4 },
    heroName:   { fontSize:20, fontWeight:800, marginBottom:4 },
    heroMeta:   { fontSize:12, opacity:.9, display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' },
    heroCount:  { marginLeft:'auto', textAlign:'center', flexShrink:0 },
    heroCountVal: { fontSize:32, fontWeight:800, lineHeight:1 },
    heroCountLbl: { fontSize:10, opacity:.85, textTransform:'uppercase', letterSpacing:'.4px' },

    content:    { padding:'16px 20px' },
    listCard:   { background: isDark ? '#1a1f2e' : '#fff', borderRadius:16, padding:'16px 20px', boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.35)' : `0 2px 8px rgba(27,42,77,.06)`, border: isDark ? '1px solid rgba(255,255,255,0.07)' : 'none' },
    listTitle:  { fontSize:11, fontWeight:800, color: isDark ? '#93c5fd' : C.verdeProfundo, textTransform:'uppercase', letterSpacing:'.6px', marginBottom:14 },

    row:        { display:'flex', alignItems:'center', gap:14, padding:'10px 0', borderBottom: isDark ? '1px solid rgba(255,255,255,0.05)' : `1px solid ${C.pergaminoVerde}` },
    rank:       { width:26, height:26, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#fff', flexShrink:0 },
    info:       { width:220, flexShrink:0, overflow:'hidden' },
    clientName: { fontSize:13, fontWeight:700, color: isDark ? '#e2e8f0' : C.verdeProfundo, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
    supName:    { fontSize:11, color: isDark ? '#94a3b8' : C.tierraCalida, display:'flex', alignItems:'center', gap:4, marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
    barTrack:   { flex:1, height:14, background: isDark ? 'rgba(255,255,255,0.06)' : C.pergaminoVerde, borderRadius:7, overflow:'hidden' },
    barFill:    { height:'100%', borderRadius:7, transition:'width .5s ease' },
    count:      { width:34, fontSize:13, fontWeight:800, color: isDark ? '#93c5fd' : C.verdeProfundo, textAlign:'right', flexShrink:0 },

    center:     { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 0', color: isDark ? '#64748b' : C.tierraCalida, gap:12 },
    spinner:    { width:32, height:32, border: isDark ? '3px solid rgba(255,255,255,0.10)' : `3px solid ${C.pergaminoVerde}`, borderTopColor:C.verdeMedio, borderRadius:'50%', animation:'spin 1s linear infinite' },
    errBox:     { display:'flex', alignItems:'center', gap:12, background: isDark ? 'rgba(239,68,68,0.10)' : '#fff5f5', border: isDark ? '1px solid rgba(239,68,68,0.25)' : `1px solid #fcc`, borderRadius:12, padding:'16px 20px', color: isDark ? '#fca5a5' : '#8B2E2E' },
    empty:      { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 0', color: isDark ? '#64748b' : C.tierraCalida, gap:8 },
  };

  return (
    <div style={st.root}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Encabezado */}
      <div style={st.header}>
        <div style={st.breadcrumb}>
          <button style={st.backBtn} onClick={onBack} type="button">
            <span className="material-icons" style={{fontSize:16}}>arrow_back_ios</span> Inicio
          </button>
          <span style={st.sep}>/</span>
          <span style={st.bcCur}>Reporte: Personal por Cliente</span>
        </div>

        <div style={st.titleRow}>
          <div style={st.titleBlock}>
            <div style={st.titleIcon}>
              <span className="material-icons">groups</span>
            </div>
            <div>
              <p style={st.panelLabel}>REPORTES</p>
              <h1 style={st.pageTitle}>Personal por cliente</h1>
              <p style={st.pageSub}>Cuántos empleados tiene cada cliente y quién es su supervisor</p>
            </div>
          </div>

          <button style={st.refreshBtn} onClick={cargar} type="button">
            <span style={{ width:22, height:22, borderRadius:'50%', background:'rgba(255,255,255,0.22)', display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
              <span className="material-icons" style={{fontSize:14}}>refresh</span>
            </span>
            Actualizar
          </button>
        </div>

        <div style={st.searchWrap}>
          <span className="material-icons" style={{color:C.tierraCalida, fontSize:18}}>search</span>
          <input
            style={st.searchInput}
            placeholder="Buscar cliente o supervisor…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Contenido */}
      <div style={st.content}>
        {loading ? (
          <div style={st.center}>
            <div style={st.spinner} />
            <p>Cargando datos...</p>
          </div>
        ) : error ? (
          <div style={{...st.errBox, margin:0}}>
            <span className="material-icons">wifi_off</span>
            <div>
              <p style={{fontWeight:700, margin:0}}>Error de conexión</p>
              <p style={{margin:0, fontSize:12}}>{error}</p>
            </div>
          </div>
        ) : porCliente.length === 0 ? (
          <div style={st.empty}>
            <span className="material-icons" style={{fontSize:40, color:C.pergaminoVerde}}>groups</span>
            <p>Sin empleados activos registrados todavía</p>
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div style={{...st.kpiRow, margin:0, marginBottom:16}}>
              <div style={st.kpiCard}>
                <div style={st.kpiLabel}>Clientes activos</div>
                <div style={st.kpiValue}>{totalClientes}</div>
              </div>
              <div style={st.kpiCard}>
                <div style={st.kpiLabel}>Empleados activos</div>
                <div style={st.kpiValue}>{totalEmpleados}</div>
              </div>
              <div style={st.kpiCard}>
                <div style={st.kpiLabel}>Promedio por cliente</div>
                <div style={st.kpiValue}>{(totalEmpleados / totalClientes).toFixed(1)}</div>
              </div>
            </div>

            {/* Destacado: cliente con más personal */}
            {top && (
              <div style={{...st.heroCard, marginLeft:0, marginRight:0, marginBottom:16}}>
                <div style={st.heroIcon}>🏆</div>
                <div>
                  <p style={st.heroLabel}>Cliente con más personal</p>
                  <p style={st.heroName}>{top.cliente}</p>
                  <div style={st.heroMeta}>
                    <span><span className="material-icons" style={{fontSize:14, verticalAlign:'middle'}}>supervisor_account</span> {top.supervisor}</span>
                  </div>
                </div>
                <div style={st.heroCount}>
                  <div style={st.heroCountVal}>{top.count}</div>
                  <div style={st.heroCountLbl}>Empleados</div>
                </div>
              </div>
            )}

            {/* Lista completa con barras */}
            <div style={{...st.listCard, marginLeft:0, marginRight:0}}>
              <p style={st.listTitle}>Personal por cliente {search && `· resultados para "${search}"`}</p>

              {filtrado.length === 0 ? (
                <p style={{fontSize:12, color: isDark ? '#64748b' : C.tierraCalida}}>Sin resultados para tu búsqueda.</p>
              ) : (
                filtrado.map((g, i) => (
                  <div key={g.cliente} style={{...st.row, borderBottom: i === filtrado.length - 1 ? 'none' : st.row.borderBottom}}>
                    <div style={{...st.rank, background: colorPorPosicion(porCliente.indexOf(g))}}>{porCliente.indexOf(g) + 1}</div>
                    <div style={st.info}>
                      <div style={st.clientName} title={g.cliente}>{g.cliente}</div>
                      <div style={st.supName} title={g.supervisor}>
                        <span className="material-icons" style={{fontSize:12}}>supervisor_account</span>
                        {g.supervisor}
                      </div>
                    </div>
                    <div style={st.barTrack}>
                      <div style={{
                        ...st.barFill,
                        width: `${(g.count / maxCount) * 100}%`,
                        background: colorPorPosicion(porCliente.indexOf(g)),
                      }}/>
                    </div>
                    <div style={st.count}>{g.count}</div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}