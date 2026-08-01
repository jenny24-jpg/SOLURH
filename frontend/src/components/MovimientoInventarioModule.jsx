import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";

import { API, apiFetch } from '../context/AuthContext';
const API_BASE = API;

const C = {
  verdeProfundo:  '#133f83',
  verdeMedio:     '#2b0b81',
  verdeSalvia:    '#11085a',
  verdeMenta:     '#E8F5E9',
  tierraCalida:   '#8B6F47',
  oroForestal:    '#D4A853',
  rojoAlerta:     '#8B2E2E',
  fondoClaro:     '#F2F7F3',
  pergaminoVerde: '#DCEDDF',
  grafito:        '#4A4A4A',
};

// Tipos que requieren fecha de revisión (tratamientos, fertilizantes)
const TIPOS_CON_REVISION = ['TRATAMIENTO','FERTILIZACION','FERTILIZANTE','TRATAMIENTO FITOSANITARIO','APLICACION','APLICACIÓN'];
// Tipos de traslado (solo fecha de traslado)
const TIPOS_TRASLADO = ['TRASLADO','TRANSLADO','MOVIMIENTO','REUBICACION','REUBICACIÓN'];

function get(obj, ...keys) {
  for (const k of keys) if (obj?.[k] !== undefined && obj?.[k] !== null) return obj[k];
  return null;
}

function fmt(val) {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('es-GT', { day:'2-digit', month:'short', year:'numeric' });
}

function fmtFechaInput(fecha) {
  if (!fecha) return '';
  if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha;
  if (typeof fecha === 'string' && /^\d{2}\/\d{2}\/\d{4}/.test(fecha)) {
    const [dia, mes, anio] = fecha.split('/');
    return `${anio}-${mes}-${dia}`;
  }
  const d = new Date(fecha);
  if (isNaN(d)) return '';
  return d.toISOString().slice(0,10);
}

function diasRestantes(fecha) {
  if (!fecha) return null;
  const d = new Date(fecha);
  if (isNaN(d)) return null;
  const hoy = new Date();
  hoy.setHours(0,0,0,0);
  d.setHours(0,0,0,0);
  return Math.ceil((d - hoy) / (1000*60*60*24));
}

function BadgeDias({ fecha }) {
  if (!fecha) return null;
  const dias = diasRestantes(fecha);
  if (dias === null) return null;
  let bg, color, txt;
  if (dias < 0)      { bg='#FFEBEE'; color=C.rojoAlerta; txt=`Vencido hace ${Math.abs(dias)}d`; }
  else if (dias === 0) { bg='#FFF8E1'; color='#E65100'; txt='Hoy'; }
  else if (dias <= 3) { bg='#FFF8E1'; color='#E65100'; txt=`En ${dias}d`; }
  else if (dias <= 7) { bg='#E8F5E9'; color:C.verdeMedio; txt=`En ${dias}d`; }
  else               { bg:C.fondoClaro; color=C.verdeMedio; txt=`En ${dias}d`; }
  return (
    <span style={{background:bg, color, padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:700, whiteSpace:'nowrap'}}>
      {txt}
    </span>
  );
}

const FORM_VACIO = {
  id_movimiento_inventario_arbol: null,
  id_arbol: '',
  id_tipo_movimiento: '',
  id_sector_origen: '',
  id_sector_destino: '',
  fecha_movimiento: '',
  fecha_aplicacion: '',       // Para tratamientos: cuándo se aplicó
  fecha_proxima_revision: '', // Para tratamientos: cuándo volver a checar
  observaciones: '',
  usuario_registro: '',
};

export default function MovimientoInventarioModule() {
  const { usuario, displayName } = useAuth();
  const [movimientos,       setMovimientos]       = useState([]);
  const [arboles,           setArboles]           = useState([]);
  const [sectores,          setSectores]          = useState([]);
  const [tiposMovimiento,   setTiposMovimiento]   = useState([]);
  const [loading,           setLoading]           = useState(false);
  const [saving,            setSaving]            = useState(false);
  const [alerta,            setAlerta]            = useState({ tipo:'', mensaje:'' });
  const [errores,           setErrores]           = useState({});
  const [form,              setForm]              = useState(FORM_VACIO);
  const [editando,          setEditando]          = useState(false);
  const [search,            setSearch]            = useState('');
  const [filtroTipo,        setFiltroTipo]        = useState('');
  const [verDetalle,        setVerDetalle]        = useState(null);

  const nombreUsuario = displayName ||
    get(usuario,'NOMBRES','nombres') ||
    get(usuario,'USERNAME','username') || 'Usuario';

  useEffect(() => { cargarTodo(); }, []);

  const mostrarAlerta = (tipo, mensaje) => {
    setAlerta({ tipo, mensaje });
    setTimeout(() => setAlerta({ tipo:'', mensaje:'' }), 4000);
  };

  const obtenerLista = (data) => Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];

  const cargarTodo = async () => {
    setLoading(true);
    try {
      const [rM, rA, rS, rT] = await Promise.all([
        apiFetch(`${API_BASE}/movimiento-inventario`).then(r => r.json()),
        apiFetch(`${API_BASE}/arbol`).then(r => r.json()),
        apiFetch(`${API_BASE}/sector`).then(r => r.json()),
        apiFetch(`${API_BASE}/tipo-movimiento`).then(r => r.json()),
      ]);
      setMovimientos(obtenerLista(rM));
      setArboles(obtenerLista(rA));
      setSectores(obtenerLista(rS));
      setTiposMovimiento(obtenerLista(rT));
    } catch {
      mostrarAlerta('error', 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  // Detectar si el tipo seleccionado es traslado o tratamiento
  const tipoSeleccionado = useMemo(() => {
    if (!form.id_tipo_movimiento) return 'otro';
    const tipo = tiposMovimiento.find(t =>
      String(get(t,'ID_TIPO_MOVIMIENTO','id_tipo_movimiento')) === String(form.id_tipo_movimiento)
    );
    if (!tipo) return 'otro';
    const nombre = (get(tipo,'NOMBRE_TIPO_MOVIMIENTO','nombre_tipo_movimiento','DESCRIPCION','descripcion') || '').toUpperCase();
    if (TIPOS_TRASLADO.some(k => nombre.includes(k))) return 'traslado';
    if (TIPOS_CON_REVISION.some(k => nombre.includes(k))) return 'tratamiento';
    return 'otro';
  }, [form.id_tipo_movimiento, tiposMovimiento]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setErrores(prev => ({ ...prev, [name]: '' }));
  };

  const validar = () => {
    const err = {};
    if (!form.id_arbol)           err.id_arbol = 'Seleccione un árbol';
    if (!form.id_tipo_movimiento) err.id_tipo_movimiento = 'Seleccione tipo de movimiento';
    if (!form.fecha_movimiento)   err.fecha_movimiento = 'Ingrese la fecha';
    if (tipoSeleccionado === 'traslado') {
      if (!form.id_sector_origen)  err.id_sector_origen = 'Seleccione sector origen';
      if (!form.id_sector_destino) err.id_sector_destino = 'Seleccione sector destino';
      if (form.id_sector_origen && form.id_sector_destino &&
          String(form.id_sector_origen) === String(form.id_sector_destino))
        err.id_sector_destino = 'Destino debe ser diferente al origen';
    }
    setErrores(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validar()) { mostrarAlerta('error', 'Corrige los campos marcados'); return; }
    setSaving(true);
    try {
      const payload = {
        id_arbol:               Number(form.id_arbol),
        id_tipo_movimiento:     Number(form.id_tipo_movimiento),
        id_sector_origen:       form.id_sector_origen ? Number(form.id_sector_origen) : null,
        id_sector_destino:      form.id_sector_destino ? Number(form.id_sector_destino) : null,
        fecha_movimiento:       form.fecha_movimiento || null,
        fecha_aplicacion:       form.fecha_aplicacion || null,
        fecha_proxima_revision: form.fecha_proxima_revision || null,
        observacion:            form.observaciones || null,
        usuario_registro:       nombreUsuario,
      };
      const url    = editando ? `${API_BASE}/movimiento-inventario/${form.id_movimiento_inventario_arbol}` : `${API_BASE}/movimiento-inventario`;
      const method = editando ? 'PUT' : 'POST';
      const res    = await apiFetch(url, { method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
      const data   = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.mensaje || 'Error al guardar');
      mostrarAlerta('success', editando ? 'Movimiento actualizado' : 'Movimiento registrado correctamente');
      limpiar();
      await cargarTodo();
    } catch (err) {
      mostrarAlerta('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const limpiar = () => { setForm({...FORM_VACIO, usuario_registro: nombreUsuario}); setErrores({}); setEditando(false); };

  const handleEditar = (item) => {
    setForm({
      id_movimiento_inventario_arbol: get(item,'ID_MOVIMIENTO_INVENTARIO_ARBOL','id_movimiento_inventario_arbol','ID_MOVIMIENTO','id_movimiento'),
      id_arbol:               String(get(item,'ID_ARBOL','id_arbol') || ''),
      id_tipo_movimiento:     String(get(item,'ID_TIPO_MOVIMIENTO','id_tipo_movimiento') || ''),
      id_sector_origen:       String(get(item,'ID_SECTOR_ORIGEN','id_sector_origen') || ''),
      id_sector_destino:      String(get(item,'ID_SECTOR_DESTINO','id_sector_destino') || ''),
      fecha_movimiento:       fmtFechaInput(get(item,'FECHA_MOVIMIENTO','fecha_movimiento')),
      fecha_aplicacion:       fmtFechaInput(get(item,'FECHA_APLICACION','fecha_aplicacion')),
      fecha_proxima_revision: fmtFechaInput(get(item,'FECHA_PROXIMA_REVISION','fecha_proxima_revision')),
      observaciones:          get(item,'OBSERVACION','observacion','OBSERVACIONES','observaciones') || '',
      usuario_registro:       get(item,'USUARIO_REGISTRO','usuario_registro') || nombreUsuario,
    });
    setErrores({});
    setEditando(true);
    window.scrollTo({ top:0, behavior:'smooth' });
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este movimiento?')) return;
    try {
      const res = await apiFetch(`${API_BASE}/movimiento-inventario/${id}`, { method:'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Error al eliminar');
      mostrarAlerta('success', 'Movimiento eliminado');
      await cargarTodo();
    } catch (err) {
      mostrarAlerta('error', err.message);
    }
  };

  const getText = (obj, ...fields) => {
    for (const f of fields) if (obj?.[f] != null) return obj[f];
    return '';
  };

  // Filtrado de listado
  const movimientosFiltrados = useMemo(() => {
    let rows = movimientos;
    if (filtroTipo) rows = rows.filter(m => String(get(m,'ID_TIPO_MOVIMIENTO','id_tipo_movimiento')) === filtroTipo);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(m =>
        [getText(m,'ARBOL','arbol','NOMBRE_ARBOL','nombre_arbol'),
         getText(m,'TIPO_MOVIMIENTO','tipo_movimiento','NOMBRE_TIPO_MOVIMIENTO','nombre_tipo_movimiento'),
         getText(m,'SECTOR_ORIGEN','sector_origen'),
         getText(m,'SECTOR_DESTINO','sector_destino'),
         getText(m,'USUARIO_REGISTRO','usuario_registro'),
         getText(m,'OBSERVACION','observacion')]
          .some(v => String(v).toLowerCase().includes(q))
      );
    }
    return rows;
  }, [movimientos, filtroTipo, search]);

  // Movimientos próximos a revisión
  const proximosRevision = useMemo(() =>
    movimientos
      .filter(m => get(m,'FECHA_PROXIMA_REVISION','fecha_proxima_revision'))
      .map(m => ({ ...m, _dias: diasRestantes(get(m,'FECHA_PROXIMA_REVISION','fecha_proxima_revision')) }))
      .filter(m => m._dias !== null && m._dias <= 7)
      .sort((a,b) => a._dias - b._dias)
  , [movimientos]);

  const st = estilos;

  return (
    <div style={st.container}>
      {/* Alertas */}
      {proximosRevision.length > 0 && (
        <div style={st.alertaRevision}>
          <span className="material-icons" style={{fontSize:18}}>notifications_active</span>
          <strong>{proximosRevision.length} movimiento(s)</strong> próximos a fecha de revisión
          {proximosRevision.map((m,i) => {
            const id = get(m,'ID_MOVIMIENTO_INVENTARIO_ARBOL','id_movimiento_inventario_arbol','ID_MOVIMIENTO','id_movimiento');
            return (
              <span key={i} style={st.alertaTag}>
                {getText(m,'ARBOL','arbol') || `Árbol #${get(m,'ID_ARBOL','id_arbol')}`} — <BadgeDias fecha={get(m,'FECHA_PROXIMA_REVISION','fecha_proxima_revision')}/>
              </span>
            );
          })}
        </div>
      )}

      {/* Header */}
      <div style={st.header}>
        <div>
          <h2 style={st.title}>Movimientos de Inventario</h2>
          <p style={st.subtitle}>Traslados, tratamientos y otros movimientos de árboles</p>
        </div>
        <button style={st.refreshBtn} onClick={cargarTodo} type="button">
          <span className="material-icons">refresh</span>
        </button>
      </div>

      {/* Alerta de éxito/error */}
      {alerta.mensaje && (
        <div style={{...st.alerta, ...(alerta.tipo==='success' ? st.alertaOk : st.alertaErr)}}>
          <span className="material-icons">{alerta.tipo==='success'?'check_circle':'error_outline'}</span>
          {alerta.mensaje}
        </div>
      )}

      {/* Formulario */}
      <div style={st.card}>
        <h3 style={st.cardTitle}>
          <span className="material-icons" style={{fontSize:18, verticalAlign:'middle', marginRight:6}}>
            {editando ? 'edit' : 'add_circle_outline'}
          </span>
          {editando ? 'Editar movimiento' : 'Registrar nuevo movimiento'}
        </h3>

        <form onSubmit={handleSubmit}>
          <div style={st.grid}>

            {/* Árbol */}
            <div style={st.field}>
              <label style={st.label}>Árbol *</label>
              <select name="id_arbol" value={form.id_arbol} onChange={handleChange}
                style={{...st.input, ...(errores.id_arbol ? st.inputErr : {})}}>
                <option value="">Seleccione un árbol</option>
                {arboles.map(a => (
                  <option key={get(a,'ID_ARBOL','id_arbol')} value={get(a,'ID_ARBOL','id_arbol')}>
                    {getText(a,'CODIGO_ARBOL','codigo_arbol','NOMBRE_ARBOL','nombre_arbol','ID_ARBOL','id_arbol')}
                  </option>
                ))}
              </select>
              {errores.id_arbol && <span style={st.errTxt}>{errores.id_arbol}</span>}
            </div>

            {/* Tipo movimiento */}
            <div style={st.field}>
              <label style={st.label}>Tipo de movimiento *</label>
              <select name="id_tipo_movimiento" value={form.id_tipo_movimiento} onChange={handleChange}
                style={{...st.input, ...(errores.id_tipo_movimiento ? st.inputErr : {})}}>
                <option value="">Seleccione un tipo</option>
                {tiposMovimiento.map(t => (
                  <option key={get(t,'ID_TIPO_MOVIMIENTO','id_tipo_movimiento')} value={get(t,'ID_TIPO_MOVIMIENTO','id_tipo_movimiento')}>
                    {getText(t,'NOMBRE_TIPO_MOVIMIENTO','nombre_tipo_movimiento','DESCRIPCION','descripcion')}
                  </option>
                ))}
              </select>
              {errores.id_tipo_movimiento && <span style={st.errTxt}>{errores.id_tipo_movimiento}</span>}
            </div>

            {/* Fecha del movimiento */}
            <div style={st.field}>
              <label style={st.label}>
                {tipoSeleccionado === 'tratamiento' ? 'Fecha de registro *' : 'Fecha del movimiento *'}
              </label>
              <input type="date" name="fecha_movimiento" value={form.fecha_movimiento} onChange={handleChange}
                style={{...st.input, ...(errores.fecha_movimiento ? st.inputErr : {})}}/>
              {errores.fecha_movimiento && <span style={st.errTxt}>{errores.fecha_movimiento}</span>}
            </div>

            {/* Usuario que registra — se auto-llena */}
            <div style={st.field}>
              <label style={st.label}>Registrado por</label>
              <input type="text" value={nombreUsuario} readOnly
                style={{...st.input, background:C.verdeMenta, color:C.verdeProfundo, fontWeight:600, cursor:'default'}}/>
            </div>

            {/* ── Campos de TRASLADO ── */}
            {(tipoSeleccionado === 'traslado' || tipoSeleccionado === 'otro') && (
              <>
                <div style={st.field}>
                  <label style={st.label}>Sector / Posición origen {tipoSeleccionado==='traslado'?'*':''}</label>
                  <select name="id_sector_origen" value={form.id_sector_origen} onChange={handleChange}
                    style={{...st.input, ...(errores.id_sector_origen ? st.inputErr : {})}}>
                    <option value="">Seleccione origen</option>
                    {sectores.map(s => (
                      <option key={get(s,'ID_SECTOR','id_sector')} value={get(s,'ID_SECTOR','id_sector')}>
                        {getText(s,'NOMBRE_SECTOR','nombre_sector','ID_SECTOR','id_sector')}
                      </option>
                    ))}
                  </select>
                  {errores.id_sector_origen && <span style={st.errTxt}>{errores.id_sector_origen}</span>}
                </div>
                <div style={st.field}>
                  <label style={st.label}>Sector / Posición destino {tipoSeleccionado==='traslado'?'*':''}</label>
                  <select name="id_sector_destino" value={form.id_sector_destino} onChange={handleChange}
                    style={{...st.input, ...(errores.id_sector_destino ? st.inputErr : {})}}>
                    <option value="">Seleccione destino</option>
                    {sectores.map(s => (
                      <option key={get(s,'ID_SECTOR','id_sector')} value={get(s,'ID_SECTOR','id_sector')}>
                        {getText(s,'NOMBRE_SECTOR','nombre_sector','ID_SECTOR','id_sector')}
                      </option>
                    ))}
                  </select>
                  {errores.id_sector_destino && <span style={st.errTxt}>{errores.id_sector_destino}</span>}
                </div>
              </>
            )}

            {/* ── Campos de TRATAMIENTO ── */}
            {tipoSeleccionado === 'tratamiento' && (
              <>
                <div style={st.field}>
                  <label style={st.label}>Fecha de aplicación</label>
                  <input type="date" name="fecha_aplicacion" value={form.fecha_aplicacion} onChange={handleChange} style={st.input}/>
                  <span style={{fontSize:10, color:C.tierraCalida, marginTop:4}}>Cuándo se aplicó el tratamiento</span>
                </div>
                <div style={st.field}>
                  <label style={st.label}>Próxima revisión</label>
                  <input type="date" name="fecha_proxima_revision" value={form.fecha_proxima_revision} onChange={handleChange} style={st.input}/>
                  <span style={{fontSize:10, color:C.tierraCalida, marginTop:4}}>Cuándo volver a aplicar o revisar</span>
                </div>
              </>
            )}

            {/* Observaciones */}
            <div style={{...st.field, gridColumn:'1 / -1'}}>
              <label style={st.label}>Observaciones</label>
              <textarea name="observaciones" value={form.observaciones} onChange={handleChange}
                rows={3} style={st.textarea}
                placeholder={
                  tipoSeleccionado === 'traslado'
                    ? 'Ej: Traslado por reorganización de surco 3 hacia surco 5, finca norte…'
                    : tipoSeleccionado === 'tratamiento'
                    ? 'Ej: Se aplicó fungicida preventivo, dosis 20ml/L, próxima aplicación en 3 semanas…'
                    : 'Describe el motivo o detalles del movimiento…'
                }/>
            </div>
          </div>

          <div style={st.actions}>
            <button type="submit" style={st.btnPrimary} disabled={saving}>
              <span style={{ width:22, height:22, borderRadius:'50%', background:'rgba(255,255,255,0.22)', display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
                <span className="material-icons" style={{fontSize:14}}>{saving?'hourglass_empty':editando?'save':'add'}</span>
              </span>
              {saving ? 'Guardando…' : editando ? 'Actualizar' : 'Registrar movimiento'}
            </button>
            <button type="button" style={{...st.btnSecondary, display:'inline-flex', alignItems:'center', gap:6}} onClick={limpiar}>
              <span style={{ width:22, height:22, borderRadius:'50%', background:'rgba(27,77,42,0.10)', display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
                <span className="material-icons" style={{fontSize:14}}>refresh</span>
              </span>
              Limpiar
            </button>
          </div>
        </form>
      </div>

      {/* Listado */}
      <div style={st.card}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:10}}>
          <h3 style={st.cardTitle}>Listado de movimientos</h3>
          <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
            <div style={st.searchWrap}>
              <span className="material-icons" style={{fontSize:16, color:C.tierraCalida}}>search</span>
              <input style={st.searchInput} placeholder="Buscar…" value={search} onChange={e => setSearch(e.target.value)}/>
            </div>
            <select style={st.sel} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
              <option value="">Todos los tipos</option>
              {tiposMovimiento.map(t => (
                <option key={get(t,'ID_TIPO_MOVIMIENTO','id_tipo_movimiento')} value={get(t,'ID_TIPO_MOVIMIENTO','id_tipo_movimiento')}>
                  {getText(t,'NOMBRE_TIPO_MOVIMIENTO','nombre_tipo_movimiento','DESCRIPCION','descripcion')}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <p style={{color:C.tierraCalida}}>Cargando movimientos…</p>
        ) : movimientosFiltrados.length === 0 ? (
          <p style={{color:C.tierraCalida}}>No hay movimientos registrados.</p>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table style={st.table}>
              <thead>
                <tr>
                 {['Árbol','Tipo','Origen','Destino','Fecha mov.','Fecha aplic.','Próx. revisión','Registrado por','Obs.','Acciones'].map(h => (
                    <th key={h} style={st.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movimientosFiltrados.map((m, i) => {
                  const id = get(m,'ID_MOVIMIENTO_INVENTARIO_ARBOL','id_movimiento_inventario_arbol','ID_MOVIMIENTO','id_movimiento');
                  const fRev = get(m,'FECHA_PROXIMA_REVISION','fecha_proxima_revision');
                  const dias = diasRestantes(fRev);
                  const rowBg = dias !== null && dias <= 3 ? '#FFFDE7' : i%2===0 ? '#fff' : C.fondoClaro;
                  return (
                    <tr key={id} style={{background:rowBg}}>
                      
                      <td style={{...st.td, fontWeight:600, color:C.verdeProfundo}}>
                        {getText(m,'ARBOL','arbol','NOMBRE_ARBOL','nombre_arbol') || getText(m,'ID_ARBOL','id_arbol')}
                      </td>
                      <td style={st.td}>
                        {getText(m,'TIPO_MOVIMIENTO','tipo_movimiento','NOMBRE_TIPO_MOVIMIENTO','nombre_tipo_movimiento')}
                      </td>
                      <td style={st.td}>{getText(m,'SECTOR_ORIGEN','sector_origen','NOMBRE_SECTOR_ORIGEN','nombre_sector_origen') || '—'}</td>
                      <td style={st.td}>{getText(m,'SECTOR_DESTINO','sector_destino','NOMBRE_SECTOR_DESTINO','nombre_sector_destino') || '—'}</td>
                      <td style={st.td}>{fmt(get(m,'FECHA_MOVIMIENTO','fecha_movimiento'))}</td>
                      <td style={st.td}>{fmt(get(m,'FECHA_APLICACION','fecha_aplicacion'))}</td>
                      <td style={st.td}>
                        <div style={{display:'flex', flexDirection:'column', gap:3}}>
                          <span>{fmt(fRev)}</span>
                          <BadgeDias fecha={fRev}/>
                        </div>
                      </td>
                      <td style={{...st.td, color:C.tierraCalida, fontSize:11}}>
                        {get(m,'USUARIO_REGISTRO','usuario_registro') || '—'}
                      </td>
                      <td style={{...st.td, maxWidth:180, fontSize:11}}>
                        {getText(m,'OBSERVACION','observacion','OBSERVACIONES','observaciones') || '—'}
                      </td>
                      <td style={st.td}>
                        <div style={{display:'flex', gap:6}}>
                          <button style={st.btnEdit} onClick={() => handleEditar(m)} title="Editar">
                            <span className="material-icons" style={{fontSize:15}}>edit</span>
                          </button>
                          <button style={st.btnDel} onClick={() => handleEliminar(id)} title="Eliminar">
                            <span className="material-icons" style={{fontSize:15}}>delete</span>
                          </button>
                        </div>
                      </td>
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

const estilos = {
  container: { padding:24, background:C.fondoClaro, minHeight:'100vh' },
  header:    { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 },
  title:     { margin:0, fontSize:26, color:C.verdeProfundo, fontWeight:800 },
  subtitle:  { marginTop:4, color:C.tierraCalida, fontSize:13 },
  refreshBtn:{ background:C.verdeMedio, color:'#fff', border:'none', borderRadius:10, padding:'8px 12px', cursor:'pointer', display:'flex', alignItems:'center', gap:4 },
  card:      { background:'#fff', borderRadius:16, padding:'20px 24px', boxShadow:`0 4px 14px rgba(0,0,0,.07)`, marginBottom:20 },
  cardTitle: { marginTop:0, marginBottom:16, color:C.verdeProfundo, fontSize:16, fontWeight:700, display:'flex', alignItems:'center' },
  grid:      { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:14 },
  field:     { display:'flex', flexDirection:'column' },
  label:     { marginBottom:5, fontWeight:700, color:C.verdeProfundo, fontSize:12 },
  input:     { padding:'9px 12px', borderRadius:10, border:`1px solid ${C.pergaminoVerde}`, outline:'none', fontSize:13, color:C.grafito, background:'#fff' },
  textarea:  { padding:'9px 12px', borderRadius:10, border:`1px solid ${C.pergaminoVerde}`, outline:'none', fontSize:13, resize:'vertical', color:C.grafito },
  inputErr:  { border:`1px solid ${C.rojoAlerta}`, background:'#fff5f5' },
  errTxt:    { marginTop:4, fontSize:11, color:C.rojoAlerta },
  actions:   { display:'flex', gap:10, marginTop:18, flexWrap:'wrap' },
  btnPrimary:{ background:C.verdeMedio, color:'#fff', border:'none', borderRadius:10, padding:'10px 18px', cursor:'pointer', fontWeight:700, display:'flex', alignItems:'center', gap:6 },
  btnSecondary:{ background:C.verdeMenta, color:C.verdeProfundo, border:`1px solid ${C.pergaminoVerde}`, borderRadius:10, padding:'10px 18px', cursor:'pointer', fontWeight:700 },
  alerta:    { padding:'12px 16px', borderRadius:10, marginBottom:14, fontWeight:600, display:'flex', alignItems:'center', gap:8 },
  alertaOk:  { background:'#E8F5E9', color:C.verdeProfundo, border:`1px solid ${C.pergaminoVerde}` },
  alertaErr: { background:'#FFEBEE', color:C.rojoAlerta, border:'1px solid #fcc' },
  alertaRevision: { background:'#FFF8E1', color:'#E65100', border:'1px solid #FFE0B2', borderRadius:12, padding:'12px 16px', marginBottom:16, display:'flex', flexWrap:'wrap', alignItems:'center', gap:10, fontSize:13 },
  alertaTag: { background:'#fff', border:'1px solid #FFE0B2', borderRadius:20, padding:'3px 10px', fontSize:11, display:'flex', alignItems:'center', gap:6 },
  searchWrap:{ display:'flex', alignItems:'center', gap:6, background:'#fff', border:`1px solid ${C.pergaminoVerde}`, borderRadius:8, padding:'5px 10px' },
  searchInput:{ border:'none', outline:'none', fontSize:12, width:160, color:C.grafito },
  sel:       { border:`1px solid ${C.pergaminoVerde}`, borderRadius:8, padding:'6px 10px', fontSize:12, color:C.grafito, background:'#fff' },
  table:     { width:'100%', borderCollapse:'collapse', minWidth:1100 },
  th:        { textAlign:'left', padding:'10px 12px', background:C.verdeProfundo, color:'#fff', fontSize:10, textTransform:'uppercase', letterSpacing:'.5px', fontWeight:700 },
  td:        { padding:'10px 12px', borderBottom:`1px solid ${C.pergaminoVerde}`, verticalAlign:'top', fontSize:12 },
  btnEdit:   { background:'#1976D2', color:'#fff', border:'none', borderRadius:8, padding:'6px 10px', cursor:'pointer' },
  btnDel:    { background:C.rojoAlerta, color:'#fff', border:'none', borderRadius:8, padding:'6px 10px', cursor:'pointer' },
};
