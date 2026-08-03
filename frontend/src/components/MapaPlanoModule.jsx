import React, { useEffect, useMemo, useState, useRef } from "react";
import { Joyride } from 'react-joyride';
import { API, apiFetch } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

/* ══════════════════════════════════════════════════════════
   DESIGN TOKENS  — light premium theme
══════════════════════════════════════════════════════════ */
const C = {
  bg:        "#f0f4f8",
  bgCard:    "#ffffff",
  bgSidebar: "#ffffff",
  border:    "#e2e8f0",
  borderHi:  "#cbd5e1",
  text:      "#1e293b",
  textSub:   "#475569",
  textMuted: "#94a3b8",
  accent:    "#0ea5e9",
  accentBg:  "#f0f9ff",

  /* estado palettes — exact colors per user spec */
  CRECIMIENTO: { base:"#38bdf8", dark:"#0284c7", glow:"rgba(56,189,248,0.30)",  bg:"#f0f9ff", border:"#bae6fd", text:"#0369a1", label:"#e0f2fe" },
  PRODUCCION:  { base:"#3b82f6", dark:"#1d4ed8", glow:"rgba(59,130,246,0.30)", bg:"#eff6ff", border:"#bfdbfe", text:"#1d4ed8", label:"#dbeafe" },
  "PRODUCCIÓN":{ base:"#3b82f6", dark:"#1d4ed8", glow:"rgba(59,130,246,0.30)", bg:"#eff6ff", border:"#bfdbfe", text:"#1d4ed8", label:"#dbeafe" },
  ENFERMO:     { base:"#f97316", dark:"#ea580c", glow:"rgba(249,115,22,0.30)", bg:"#fff7ed", border:"#fed7aa", text:"#c2410c", label:"#ffedd5" },
  MUERTO:      { base:"#ef4444", dark:"#dc2626", glow:"rgba(239,68,68,0.30)",  bg:"#fef2f2", border:"#fecaca", text:"#b91c1c", label:"#fee2e2" },
  RESIEMBRA:   { base:"#a855f7", dark:"#7e22ce", glow:"rgba(168,85,247,0.30)", bg:"#faf5ff", border:"#e9d5ff", text:"#7e22ce", label:"#f3e8ff" },
  /* all other states (Declinacion, Poda, En Tratamiento, etc.) → neutral gray */
  DEFAULT:     { base:"#64748b", dark:"#334155", glow:"rgba(100,116,139,0.20)", bg:"#f8fafc", border:"#e2e8f0", text:"#334155", label:"#f1f5f9" },
};

const RIESGO_COLOR = { ALTO:"#ef4444", MEDIO:"#f97316", BAJO:"#eab308" };
const VISTA = { MAPA:"mapa", ALERTAS:"alertas", RESIEMBRA:"resiembra" };
const HOY = () => new Date().toISOString().slice(0, 10);
const AREA_POR_ARBOL_M2 = 4;

/* ══════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════ */
const getColor = (nombre) => {
  const key = String(nombre || "").toUpperCase().trim();
  // Exact match first
  if (C[key]) return C[key];
  // Fuzzy match — catch variants like "PRODUCCIÓN", "EN CRECIMIENTO", etc.
  if (key.includes("CRECIMIENTO")) return C.CRECIMIENTO;
  if (key.includes("PRODUCCI"))    return C.PRODUCCION;   // PRODUCCION / PRODUCCIÓN
  if (key.includes("ENFERMO") || key.includes("ENFERMA")) return C.ENFERMO;
  if (key.includes("MUERTO") || key.includes("MUERTA"))   return C.MUERTO;
  if (key.includes("RESIEMBRA"))   return C.RESIEMBRA;
  return C.DEFAULT;
};

const getPlagasActivas = (arbol) =>
  Array.isArray(arbol?.PLAGAS)
    ? arbol.PLAGAS.filter(p => {
        const fr = p.FECHA_RESOLUCION || p.fecha_resolucion ||
                   p.FECHA_RESOLUCION_PLAGA || p.fecha_resolucion_plaga;
        return !fr;
      })
    : [];

const formatFecha = (f) => {
  if (!f) return "—";
  const d = new Date(f);
  return isNaN(d) ? String(f) : d.toLocaleDateString("es-GT");
};

const getResiembraVisual = (nombreEstado) => {
  const e = String(nombreEstado || "").toUpperCase().trim();
  if (e === "MUERTO")    return { bg:"#fef2f2", border:"#fecaca", text:"#b91c1c", soft:"#b91c1c", buttonBg:"#ef4444", buttonText:"#fff", rowBg:"#fef9f9" };
  if (e === "RESIEMBRA") return { bg:"#faf5ff", border:"#e9d5ff", text:"#7e22ce", soft:"#7e22ce", buttonBg:"#a855f7", buttonText:"#fff", rowBg:"#fdf8ff" };
  return { bg:"#f0f9ff", border:"#bae6fd", text:"#0369a1", soft:"#0369a1", buttonBg:"#38bdf8", buttonText:"#fff", rowBg:"#f8feff" };
};

const getNumeroPosicionArbol = (arbol) => Math.max(Number(arbol?.POSICION_Y || 1), 1);

/* ══════════════════════════════════════════════════════════
   TREE SVG — game-style isometric, large soil disc
══════════════════════════════════════════════════════════ */
const TreeSVG = ({ estado, active, size = 52, pulsing = false, hovered = false }) => {
  const cc = getColor(estado);
  const sz = size;
  const isDead = String(estado || "").toUpperCase().trim() === "MUERTO";

  const cTop  = cc.base;
  const cMid  = cc.dark;
  const cBot  = cc.dark;

  if (isDead) {
    return (
      <svg width={sz} height={sz} viewBox="0 0 80 80"
        style={{ display:"block", overflow:"visible",
          filter: active
            ? `drop-shadow(0 4px 10px ${cc.base}bb) drop-shadow(0 0 18px ${cc.base}55)`
            : `drop-shadow(0 3px 6px rgba(0,0,0,0.45))` }}>
        <rect x="33" y="48" width="14" height="30" rx="4" fill="#3d1f08"/>
        <rect x="35" y="48" width="5"  height="30" rx="3" fill="#6B3A15" opacity="0.55"/>
        <ellipse cx="40" cy="48" rx="7" ry="2.5" fill="#6B3A15"/>
        <line x1="40" y1="48" x2="20" y2="28" stroke="#3d1f08" strokeWidth="5" strokeLinecap="round"/>
        <line x1="40" y1="42" x2="60" y2="24" stroke="#3d1f08" strokeWidth="5" strokeLinecap="round"/>
        <line x1="40" y1="36" x2="24" y2="20" stroke="#3d1f08" strokeWidth="3.5" strokeLinecap="round"/>
        <line x1="40" y1="34" x2="56" y2="18" stroke="#3d1f08" strokeWidth="3.5" strokeLinecap="round"/>
        <line x1="20" y1="28" x2="12" y2="18" stroke="#3d1f08" strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="60" y1="24" x2="68" y2="14" stroke="#3d1f08" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    );
  }

  return (
    <svg width={sz} height={sz * 1.0} viewBox="0 0 80 80"
      style={{ display:"block", overflow:"visible",
        filter: active
          ? `drop-shadow(0 5px 14px ${cc.base}cc) drop-shadow(0 0 22px ${cc.base}66)`
          : hovered
          ? `drop-shadow(0 4px 10px ${cc.base}99)`
          : `drop-shadow(0 3px 8px rgba(0,0,0,0.38))` }}>

      <rect x="33" y="54" width="14" height="24" rx="4" fill="#3d1f08"/>
      <rect x="35" y="54" width="5"  height="24" rx="3" fill="#7a4018" opacity="0.6"/>
      <ellipse cx="40" cy="54" rx="7" ry="2.5" fill="#9e5a25"/>

      <ellipse cx="40" cy="48" rx="30" ry="12" fill={cBot} opacity="0.85"/>
      <ellipse cx="40" cy="46" rx="26" ry="10" fill={cMid} opacity="0.95"/>
      <ellipse cx="40" cy="44" rx="22" ry="8.5" fill={cTop}/>

      <ellipse cx="40" cy="33" rx="22" ry="11" fill={cBot} opacity="0.85"/>
      <ellipse cx="40" cy="31" rx="18" ry="9"  fill={cMid} opacity="0.95"/>
      <ellipse cx="40" cy="29" rx="15" ry="7.5" fill={cTop}/>

      <ellipse cx="40" cy="19" rx="13" ry="7.5" fill={cBot} opacity="0.85"/>
      <ellipse cx="40" cy="17" rx="10" ry="6"   fill={cMid} opacity="0.95"/>
      <ellipse cx="40" cy="15" rx="8"  ry="5"   fill={cTop}/>

      <ellipse cx="32" cy="12" rx="5"   ry="3"   fill="white" opacity="0.30"/>
      <ellipse cx="30" cy="26" rx="6"   ry="3"   fill="white" opacity="0.20"/>
      <ellipse cx="29" cy="40" rx="7"   ry="3.5" fill="white" opacity="0.14"/>
    </svg>
  );
};

/* ══════════════════════════════════════════════════════════
   MAP POSITION HELPERS
══════════════════════════════════════════════════════════ */
const getSectorBox = (_sector, idx, total) => {
  const count = Math.max(Number(total || 1), 1);
  let cols = Math.ceil(Math.sqrt(count)), rows = Math.ceil(count / cols);
  if (count === 1) { cols=1; rows=1; }
  if (count === 2) { cols=2; rows=1; }
  if (count === 3 || count === 4) { cols=2; rows=Math.ceil(count/cols); }
  if (count >= 5 && count <= 6)   { cols=3; rows=Math.ceil(count/cols); }
  const outerLeft=3, outerTop=4, outerWidth=94, outerHeight=88, gapX=2, gapY=2;
  const cellWidth  = (outerWidth  - gapX*(cols-1)) / cols;
  const cellHeight = (outerHeight - gapY*(rows-1)) / rows;
  const col = idx % cols, row = Math.floor(idx / cols);
  return { left: outerLeft + col*(cellWidth+gapX), top: outerTop + row*(cellHeight+gapY), width: cellWidth, height: cellHeight };
};

const getArbolPosition = (arbol, arboles, sectores) => {
  const idxSector = sectores.findIndex(s => String(s.ID_SECTOR) === String(arbol.ID_SECTOR));
  const sector = sectores[idxSector];
  if (!sector) return { left:50, top:50 };
  const box = getSectorBox(sector, idxSector, sectores.length);

  const PL=8, PR=8, PT=38, PB=8;
  const usableW = Math.max(100-PL-PR, 1);
  const usableH = Math.max(100-PT-PB, 1);

  const arbolesDelSector = arboles.filter(a => String(a.ID_SECTOR) === String(sector.ID_SECTOR));
  const maxSurco = Math.max(
    Number(sector.NUMERO_SURCOS||1),
    arbolesDelSector.reduce((mx,a)=>Math.max(mx,Number(a.NUMERO_SURCO||1)),1)
  );
  const maxPos = Math.max(
    Number(sector.POSICIONES_POR_SURCO||1),
    arbolesDelSector.reduce((mx,a)=>Math.max(mx,Number(a.POSICION_Y||1)),1)
  );

  const stepX = usableW / maxSurco;
  const stepY = usableH / maxPos;

  const sIdx = Math.max(Number(arbol.NUMERO_SURCO||1),1)-1;
  const pIdx = Math.max(Number(arbol.POSICION_Y||1),1)-1;

  const relX = PL + sIdx*stepX + stepX/2;
  const relY = PT + pIdx*stepY + stepY/2;

  return {
    left: box.left + (box.width  * relX) / 100,
    top:  box.top  + (box.height * relY) / 100,
  };
};

/* ══════════════════════════════════════════════════════════
   SMALL REUSABLE COMPONENTS
══════════════════════════════════════════════════════════ */
const Badge = ({ estado }) => {
  const cc = getColor(estado);
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 10px", borderRadius:20,
      fontSize:11, fontWeight:600, background:cc.label, color:cc.text, border:`1px solid ${cc.border}` }}>
      {estado||"—"}
    </span>
  );
};

const StatCard = ({ label, value, sub, color, icon, onClick, active, isDark }) => (
  <button onClick={onClick} style={{
    background: active ? color+"12" : isDark ? "rgba(255,255,255,0.04)" : "#fff",
    border: `1.5px solid ${active ? color+"55" : isDark ? "rgba(255,255,255,0.07)" : C.border}`,
    borderRadius:16, padding:"16px 18px",
    cursor: onClick?"pointer":"default", textAlign:"left",
    transition:"all .2s", boxShadow: active ? `0 0 0 4px ${color}18` : isDark ? "0 4px 20px rgba(0,0,0,0.35)" : "0 1px 4px rgba(0,0,0,0.06)",
  }}>
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
      <span style={{ fontSize:20 }}>{icon}</span>
      <span style={{ fontSize:11, color:C.textMuted, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.07em" }}>{label}</span>
    </div>
    <div style={{ fontSize:30, fontWeight:800, color:color||C.text, lineHeight:1 }}>{value}</div>
    {sub && <div style={{ fontSize:11, color:C.textMuted, marginTop:5 }}>{sub}</div>}
  </button>
);

const ActionBtn = ({ children, onClick, color, outline, small }) => (
  <button onClick={onClick} style={{
    padding: small ? "6px 12px" : "10px 16px",
    borderRadius:10,
    border:`1.5px solid ${color}${outline?"66":"00"}`,
    background: outline ? `${color}0e` : `linear-gradient(135deg,${color},${color}cc)`,
    color: outline ? color : "#fff",
    fontSize: small ? 11 : 12, fontWeight:700, cursor:"pointer", width:"100%",
    transition:"all .15s",
    boxShadow: outline ? "none" : `0 4px 14px ${color}44`,
  }}>{children}</button>
);

const FieldLabel = ({ children }) => (
  <label style={{ fontSize:11, color:C.textSub, fontWeight:600, display:"block", marginBottom:4, marginTop:10 }}>{children}</label>
);

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function MapaPlanoModule() {
  const { isDark } = useTheme();
  const css = makeCss(isDark);
  const mS  = makeMStyle(isDark);

  const [fincas,                    setFincas]                    = useState([]);
  const [fincaSeleccionada,         setFincaSeleccionada]         = useState("");
  const [sectorFiltro,              setSectorFiltro]              = useState("");
  const [estadoFiltro,              setEstadoFiltro]              = useState("");
  const [datosPlano,                setDatosPlano]                = useState(null);
  const [arbolSeleccionado,         setArbolSeleccionado]         = useState(null);
  const [cargando,                  setCargando]                  = useState(false);
  const [vista,                     setVista]                     = useState(VISTA.MAPA);
  const [tooltip,                   setTooltip]                   = useState(null);
  const [zoom,                      setZoom]                      = useState(1);
  const [errorMsg,                  setErrorMsg]                  = useState(null);
  const [hoveredArbol,              setHoveredArbol]              = useState(null);
  const [mostrarAlertaEspacios,     setMostrarAlertaEspacios]     = useState(false);
  const [mapTourRun,                setMapTourRun]                = useState(false);
  const [nuevoArbolTourRun,         setNuevoArbolTourRun]         = useState(false);
  const [catalogos,                 setCatalogos]                 = useState({ estados:[], variedades:[], plagas:[], sectores:[] });
  const [modal,                     setModal]                     = useState({ tipo:null, loading:false, error:"" });
  const [nuevoArbolForm,            setNuevoArbolForm]            = useState({ id_sector:"", id_tipo_variedad_arbol:"", id_estado:"", numero_surco:"", descripcion:"", posicion:"" });
  const [estadoForm,                setEstadoForm]                = useState({ id_estado_nuevo:"", fecha_cambio:HOY(), observaciones:"" });
  const [alertaForm,                setAlertaForm]                = useState({ id_plaga:"", fecha_deteccion:HOY(), fecha_resolucion:"", observaciones:"" });
  const [resiembraForm,             setResiembraForm]             = useState({ fecha_resiembra:HOY(), motivo:"" });

  const mapTourSteps = [
    { target:'.tour-mapa-finca',       content:'Aquí seleccionas la finca.' },
    { target:'.tour-mapa-tabs',        content:'Aquí cambias entre Mapa, Alertas y Gestión de resiembra.' },
    { target:'.tour-mapa-diagnostico', content:'Aquí ves el diagnóstico general de los árboles.' },
    { target:'.tour-mapa-filtros',     content:'Aquí puedes filtrar por sector o estado.' },
    { target:'.tour-mapa-plano',       content:'Aquí se muestra el mapa visual de árboles.' },
    { target:'.tour-mapa-detalle',     content:'Aquí verás el detalle del árbol seleccionado.' },
  ];
  const nuevoArbolTourSteps = [
    { target:'.tour-nuevo-sector',      content:'Selecciona el sector donde estará ubicado el árbol.' },
    { target:'.tour-nuevo-variedad',    content:'Selecciona la variedad del árbol.' },
    { target:'.tour-nuevo-estado',      content:'Selecciona el estado inicial del árbol.' },
    { target:'.tour-nuevo-surco',       content:'Ingresa el número de surco.' },
    { target:'.tour-nuevo-posicion',    content:'Ingresa la posición del árbol dentro del surco.' },
    { target:'.tour-nuevo-descripcion', content:'Agrega una descripción si es necesario.' },
    { target:'.tour-nuevo-guardar',     content:'Cuando termines, presiona aquí para guardar el árbol.' },
  ];

  useEffect(() => { cargarFincas(); cargarCatalogos(); }, []);
  useEffect(() => {
    if (datosPlano && vista === VISTA.MAPA) { setMapTourRun(false); setTimeout(() => setMapTourRun(true), 800); }
  }, [datosPlano, vista]);
  useEffect(() => {
    if (fincaSeleccionada) { setArbolSeleccionado(null); setSectorFiltro(""); setEstadoFiltro(""); setErrorMsg(null); cargarPlano(fincaSeleccionada); }
  }, [fincaSeleccionada]);
  useEffect(() => {
    const h = () => { if (fincaSeleccionada) cargarPlano(fincaSeleccionada); };
    window.addEventListener("arbol_actualizado", h);
    return () => window.removeEventListener("arbol_actualizado", h);
  }, [fincaSeleccionada]);

  const cargarFincas = async () => {
    try {
      const json = await apiFetch(`${API}/finca`).then(r=>r.json());
      const lista = Array.isArray(json.data) ? json.data : json.data?.data || json.data?.rows || [];
      setFincas(lista);
      if (lista.length > 0) setFincaSeleccionada(String(lista[0].ID_FINCA));
    } catch(e) { console.error(e); }
  };
  const cargarCatalogos = async () => {
    try {
      const [eR,vR,pR,sR] = await Promise.all([
        apiFetch(`${API}/estado-arbol`).then(r=>r.json()),
        apiFetch(`${API}/tipos-variedad`).then(r=>r.json()),
        apiFetch(`${API}/plaga-enfermedad`).then(r=>r.json()),
        apiFetch(`${API}/sector`).then(r=>r.json()),
      ]);
      setCatalogos({ estados:eR.data||[], variedades:vR.data||[], plagas:pR.data||[], sectores:sR.data||[] });
    } catch(e) { console.error(e); }
  };
  const cargarPlano = async (id) => {
    try {
      setCargando(true);
      const json = await apiFetch(`${API}/mapa-plano/${id}`).then(r=>r.json());
      if (json.success) { setDatosPlano(json); setErrorMsg(null); }
      else { setErrorMsg(json.message||"Error al cargar"); setDatosPlano(null); }
    } catch { setErrorMsg("No se pudo conectar con el servidor"); setDatosPlano(null); }
    finally { setCargando(false); }
  };
  const refrescarTodo = () => Promise.all([cargarPlano(fincaSeleccionada), cargarCatalogos()]);

  const finca     = datosPlano?.finca || null;
  const sectores  = useMemo(()=> Array.isArray(datosPlano?.sectores) ? datosPlano.sectores : [], [datosPlano]);
  const arboles   = useMemo(()=> Array.isArray(datosPlano?.arboles)  ? datosPlano.arboles  : [], [datosPlano]);
  const anchoFinca = Number(finca?.ANCHO || 100);
  const largoFinca = Number(finca?.LARGO || 200);

  const resumenEspacio = useMemo(() => {
    const aT = anchoFinca * largoFinca;
    const aS = arboles.length;
    const mO = aS * AREA_POR_ARBOL_M2;
    const cT = Math.floor(aT / AREA_POR_ARBOL_M2);
    return { areaTotal:aT, arbolesSembrados:aS, metrosOcupados:mO, metrosDisponibles:Math.max(aT-mO,0), capacidadTotal:cT, espaciosDisponibles:Math.max(cT-aS,0) };
  }, [anchoFinca, largoFinca, arboles.length]);

  const estadosUnicos      = useMemo(()=> [...new Set(arboles.map(a=>a.NOMBRE_ESTADO).filter(Boolean))], [arboles]);
  const arbolesFiltrados   = useMemo(()=> arboles.filter(a => {
    const ok1 = sectorFiltro ? String(a.ID_SECTOR)===String(sectorFiltro) : true;
    const ok2 = estadoFiltro ? String(a.NOMBRE_ESTADO||"").toUpperCase().trim()===String(estadoFiltro).toUpperCase().trim() : true;
    return ok1 && ok2;
  }), [arboles, sectorFiltro, estadoFiltro]);

  const stats = useMemo(() => {
    const conteo = {};
    arboles.forEach(a => { const k=String(a.NOMBRE_ESTADO||"SIN ESTADO").toUpperCase().trim(); conteo[k]=(conteo[k]||0)+1; });
    return { total:arboles.length, conteo, alertas:(conteo.ENFERMO||0)+(conteo.MUERTO||0) };
  }, [arboles]);

  const arbolesConPlagas       = useMemo(()=> arboles.filter(a=>getPlagasActivas(a).length>0), [arboles]);
  const arbolesAlerta          = useMemo(()=> arboles.filter(a=>["ENFERMO","MUERTO"].includes(String(a.NOMBRE_ESTADO||"").toUpperCase().trim())), [arboles]);
  const arbolesMuertosParaResiembra = useMemo(()=> arboles.filter(a=>String(a.NOMBRE_ESTADO||"").toUpperCase().trim()==="MUERTO"), [arboles]);
  const arbolesYaResiembrados  = useMemo(()=> arboles.filter(a=>String(a.NOMBRE_ESTADO||"").toUpperCase().trim()==="RESIEMBRA"), [arboles]);
  const arbolesResiembra       = useMemo(()=>[...arbolesMuertosParaResiembra,...arbolesYaResiembrados], [arbolesMuertosParaResiembra, arbolesYaResiembrados]);
  const sectoresDeLaFinca      = useMemo(()=> (catalogos.sectores||[]).filter(s=> !fincaSeleccionada || String(s.ID_FINCA)===String(fincaSeleccionada)), [catalogos.sectores, fincaSeleccionada]);

  const openModal = (tipo) => {
    setModal({ tipo, loading:false, error:"" });
    if (tipo==="nuevo_arbol")       setNuevoArbolForm({ id_sector:sectorFiltro||"", id_tipo_variedad_arbol:"", id_estado:"", numero_surco:"", descripcion:"", posicion:"" });
    if (tipo==="actualizar_estado") setEstadoForm({ id_estado_nuevo:"", fecha_cambio:HOY(), observaciones:"" });
    if (tipo==="registrar_alerta")  setAlertaForm({ id_plaga:"", fecha_deteccion:HOY(), fecha_resolucion:"", observaciones:"" });
    if (tipo==="resiembra")         setResiembraForm({ fecha_resiembra:HOY(), motivo:"" });
  };
  const closeModal = () => setModal({ tipo:null, loading:false, error:"" });

  const submitNuevoArbol = async (e) => {
    e.preventDefault();
    try {
      setModal(m=>({...m,loading:true,error:""}));
      const res  = await apiFetch(`${API}/arbol`, { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ id_sector:Number(nuevoArbolForm.id_sector), id_tipo_variedad_arbol:Number(nuevoArbolForm.id_tipo_variedad_arbol), id_estado:Number(nuevoArbolForm.id_estado), numero_surco:nuevoArbolForm.numero_surco?Number(nuevoArbolForm.numero_surco):null, posicion_x:nuevoArbolForm.numero_surco?Number(nuevoArbolForm.numero_surco):null, posicion_y:nuevoArbolForm.posicion?Number(nuevoArbolForm.posicion):null, descripcion:nuevoArbolForm.descripcion||null }) });
      const json = await res.json();
      if (!(json.success===true||json.ok===true)) throw new Error(json.message||json.mensaje||"No se pudo crear el árbol.");
      await refrescarTodo(); closeModal();
    } catch(err) { setModal(m=>({...m,loading:false,error:err.message||"No se pudo crear el árbol."})); }
  };
  const submitActualizarEstado = async (e) => {
    e.preventDefault(); if (!arbolSeleccionado) return;
    try {
      setModal(m=>({...m,loading:true,error:""}));
      await apiFetch(`${API}/historial-estado`, { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ id_arbol:Number(arbolSeleccionado.ID_ARBOL), id_estado_nuevo:Number(estadoForm.id_estado_nuevo), fecha_cambio:estadoForm.fecha_cambio, observaciones:estadoForm.observaciones||null }) });
      await refrescarTodo(); closeModal();
    } catch(err) { setModal(m=>({...m,loading:false,error:err.message||"No se pudo actualizar el estado."})); }
  };
  const submitRegistrarAlerta = async (e) => {
    e.preventDefault(); if (!arbolSeleccionado) return;
    try {
      setModal(m=>({...m,loading:true,error:""}));
      await apiFetch(`${API}/registro-plaga`, { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ id_arbol:Number(arbolSeleccionado.ID_ARBOL), id_plaga:Number(alertaForm.id_plaga), fecha_deteccion:alertaForm.fecha_deteccion, fecha_resolucion:alertaForm.fecha_resolucion||null, observaciones:alertaForm.observaciones||null }) });
      await refrescarTodo(); closeModal();
    } catch(err) { setModal(m=>({...m,loading:false,error:err.message||"No se pudo registrar la alerta."})); }
  };
  const submitResiembra = async (e) => {
    e.preventDefault(); if (!arbolSeleccionado) return;
    try {
      setModal(m=>({...m,loading:true,error:""}));
      await apiFetch(`${API}/resiembra`, { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ id_arbol_nuevo:Number(arbolSeleccionado.ID_ARBOL), fecha_resiembra:resiembraForm.fecha_resiembra, motivo:resiembraForm.motivo||null }) });
      await refrescarTodo(); closeModal();
    } catch(err) { setModal(m=>({...m,loading:false,error:err.message||"No se pudo registrar la resiembra."})); }
  };

  return (
    <div style={css.root}>
      <style>{`
        .tree-btn { cursor:pointer; background:none; border:none; padding:0; }
        .tree-btn:hover { z-index:30 !important; }
        .sector-cell:hover { border-color:#38bdf8 !important; box-shadow: inset 0 0 0 2px #38bdf822 !important; }
        .tab-btn:hover { background:${isDark?"rgba(56,189,248,0.08)":"#f0f9ff"} !important; color:${isDark?"#7dd3fc":"#0284c7"} !important; }
        .alert-card:hover { transform:translateY(-3px); box-shadow:0 8px 28px rgba(0,0,0,0.12) !important; }
        .row-hover:hover  { background:${isDark?"rgba(56,189,248,0.06)":"#f8fafc"} !important; }
        input, select, textarea { transition: border-color .15s; }
        input:focus, select:focus, textarea:focus { border-color: #38bdf8 !important; outline:none; }
        select option { background:${isDark?"#1a1f2e":"#fff"}; color:${isDark?"#e2e8f0":"#1e293b"}; }
        @keyframes spin { to { transform:rotate(360deg) } }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulseRing { 0%{transform:scale(1);opacity:0.7} 70%{transform:scale(1.9);opacity:0} 100%{transform:scale(1.9);opacity:0} }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-track { background:${isDark?"#0f1117":"#f1f5f9"}; }
        ::-webkit-scrollbar-thumb { background:${isDark?"#2d3748":"#cbd5e1"}; border-radius:4px; }
      `}</style>

      <Joyride steps={mapTourSteps} run={mapTourRun} continuous showSkipButton showProgress disableScrolling
        callback={d=>{ if(d.status==="finished"||d.status==="skipped") setMapTourRun(false); }}
        floaterProps={{ offset:60 }}
        locale={{ back:'Atrás', close:'Cerrar', last:'Finalizar', next:'Siguiente', skip:'Saltar' }}
        styles={{ options:{ zIndex:30000, primaryColor:'#0ea5e9' } }}/>
      <Joyride steps={nuevoArbolTourSteps} run={nuevoArbolTourRun} continuous showSkipButton showProgress disableScrolling
        callback={d=>{ if(d.status==="finished"||d.status==="skipped") setNuevoArbolTourRun(false); }}
        locale={{ back:'Atrás', close:'Cerrar', last:'Finalizar', next:'Siguiente', skip:'Saltar' }}
        styles={{ options:{ zIndex:50000, primaryColor:'#0ea5e9' } }}/>

      <header style={css.topBar}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={css.logoBox}>
            <svg width="20" height="20" viewBox="0 0 24 24">
              <polygon points="12,2 20,14 4,14"  fill="#fff" opacity="0.95"/>
              <polygon points="12,6 21,18 3,18"  fill="#fff" opacity="0.7"/>
              <rect x="10" y="18" width="4" height="4" rx="1" fill="#fff" opacity="0.8"/>
            </svg>
          </div>
          <div>
            <div style={{ fontWeight:800, fontSize:15, color:C.text }}>{finca?.NOMBRE_FINCA || "Inventario Agrícola"}</div>
            <div style={{ fontSize:11, color:C.textMuted }}>
              {finca ? `${anchoFinca}m × ${largoFinca}m · ${sectores.length} sectores · ${arboles.length} árboles` : "Selecciona una finca"}
            </div>
          </div>
        </div>

        <nav className="tour-mapa-tabs" style={{ display:"flex", gap:4 }}>
          {[
            { id:VISTA.MAPA,      label:"Mapa",     icon:"🗺" , count:0 },
            { id:VISTA.ALERTAS,   label:"Alertas",  icon:"⚠️" , count:stats.alertas },
            { id:VISTA.RESIEMBRA, label:"Resiembra",icon:"🌿" , count:arbolesResiembra.length },
          ].map(t=>(
            <button key={t.id} className="tab-btn" onClick={()=>setVista(t.id)}
              style={{ ...css.tab, ...(vista===t.id ? css.tabActive : {}) }}>
              <span>{t.icon}</span> {t.label}
              {t.count>0 && <span style={{ fontSize:10, padding:"1px 7px", borderRadius:20,
                background:vista===t.id?"#0284c7":(isDark?"rgba(239,68,68,0.20)":"#fef2f2"), color:vista===t.id?"#fff":(isDark?"#fca5a5":"#b91c1c"),
                fontWeight:700 }}>{t.count}</span>}
            </button>
          ))}
        </nav>

        <select className="tour-mapa-finca" value={fincaSeleccionada} onChange={e=>setFincaSeleccionada(e.target.value)} style={css.fincaSelect}>
          {fincas.map(f=><option key={f.ID_FINCA} value={f.ID_FINCA}>{f.NOMBRE_FINCA}</option>)}
        </select>
      </header>

      <div style={css.statsRow}>
        <StatCard label="Total Árboles"    value={stats.total}                                         icon="🌳" color="#0ea5e9" sub={`${sectores.length} sectores activos`} isDark={isDark}/>
        <StatCard label="En Producción"    value={stats.conteo.PRODUCCION||stats.conteo["PRODUCCIÓN"]||0} icon="🍊" color="#3b82f6" sub={`${Math.round(((stats.conteo.PRODUCCION||0)/Math.max(stats.total,1))*100)}% del total`} isDark={isDark}/>
        <StatCard label="Con Alertas"      value={stats.alertas}                                       icon="⚠️" color="#f97316" onClick={()=>setVista(VISTA.ALERTAS)} active={vista===VISTA.ALERTAS} sub={`${arbolesConPlagas.length} con plagas activas`} isDark={isDark}/>
        <StatCard label="Esp. Disponibles" value={resumenEspacio.espaciosDisponibles}                  icon="🌱" color="#a855f7" sub={`${resumenEspacio.metrosDisponibles} m² libres`} isDark={isDark}/>
      </div>

      <div style={css.layout}>

        <aside style={css.sidebar}>

          <div className="tour-mapa-diagnostico" style={css.card}>
            <p style={css.cardTitle}>Diagnóstico General</p>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px", borderRadius:10, background:"#f0f9ff", border:"1px solid #bae6fd", marginBottom:6 }}>
              <span style={{ fontSize:12, color:C.textSub }}>Total árboles</span>
              <strong style={{ fontSize:22, color:"#0284c7" }}>{stats.total}</strong>
            </div>
            {estadosUnicos.map(nombre=>{
              const cc=getColor(nombre), cnt=stats.conteo[String(nombre).toUpperCase().trim()]||0;
              const pct=Math.round((cnt/Math.max(stats.total,1))*100);
              const isAct=estadoFiltro===nombre;
              return (
                <div key={nombre} onClick={()=>setEstadoFiltro(isAct?"":nombre)}
                  style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 10px", borderRadius:10,
                    marginBottom:4, cursor:"pointer", transition:"all .15s",
                    background:isAct?cc.bg:"transparent",
                    border:`1px solid ${isAct?cc.border:"transparent"}` }}>
                  <TreeSVG estado={nombre} size={22}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:11, fontWeight:600, color:isAct?cc.text:C.text }}>{nombre}</div>
                    <div style={{ height:4, borderRadius:4, background: isDark ? "rgba(255,255,255,0.08)" : "#f1f5f9", marginTop:3, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${pct}%`, background:cc.base, borderRadius:4, transition:"width .5s" }}/>
                    </div>
                  </div>
                  <strong style={{ fontSize:18, color:cc.text }}>{cnt}</strong>
                </div>
              );
            })}
            {arbolesConPlagas.length>0 && (
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px", borderRadius:10, background: isDark ? "rgba(249,115,22,0.08)" : "#fff7ed", border: isDark ? "1px solid rgba(249,115,22,0.25)" : "1px solid #fed7aa", marginTop:4 }}>
                <span style={{ fontSize:12, color:C.textSub }}>🦠 Plagas activas</span>
                <strong style={{ fontSize:18, color:"#c2410c" }}>{arbolesConPlagas.length}</strong>
              </div>
            )}
          </div>

          <div className="tour-mapa-filtros" style={css.card}>
            <p style={css.cardTitle}>Filtros</p>
            <label style={css.label}>Sección</label>
            <select style={css.select} value={sectorFiltro} onChange={e=>setSectorFiltro(e.target.value)}>
              <option value="">Todos los sectores</option>
              {sectores.map(s=><option key={s.ID_SECTOR} value={s.ID_SECTOR}>{s.NOMBRE_SECTOR}</option>)}
            </select>
            <label style={css.label}>Estado del árbol</label>
            <select style={css.select} value={estadoFiltro} onChange={e=>setEstadoFiltro(e.target.value)}>
              <option value="">Todos</option>
              {estadosUnicos.map(n=><option key={n} value={n}>{n}</option>)}
            </select>
            {(sectorFiltro||estadoFiltro) && (
              <button style={css.clearBtn} onClick={()=>{ setSectorFiltro(""); setEstadoFiltro(""); }}>
                ✕ Limpiar · {arbolesFiltrados.length} resultado(s)
              </button>
            )}
          </div>

          <div style={css.card}>
            <p style={css.cardTitle}>Resumen</p>
            {[
              { l:"Finca",              v:finca?.NOMBRE_FINCA||"—" },
              { l:"Área",               v:finca?`${anchoFinca}m × ${largoFinca}m`:"—" },
              { l:"Área total",         v:`${resumenEspacio.areaTotal} m²` },
              { l:"Metros ocupados",    v:`${resumenEspacio.metrosOcupados} m²` },
              { l:"Metros disponibles", v:`${resumenEspacio.metrosDisponibles} m²` },
              { l:"Sectores",           v:sectores.length },
              { l:"Árboles",            v:arboles.length },
              { l:"Espacios dispo.",    v:resumenEspacio.espaciosDisponibles, hi:true },
              { l:"Con alertas",        v:stats.alertas, warn:stats.alertas>0 },
              { l:"Con plagas",         v:arbolesConPlagas.length, warn:arbolesConPlagas.length>0 },
            ].map(({l,v,warn,hi})=>(
              <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:"1px solid #f1f5f9" }}>
                <span style={{ fontSize:11, color:C.textMuted }}>{l}</span>
                <strong style={{ fontSize:12, color:warn?"#b91c1c":hi?"#0284c7":C.text }}>{v}</strong>
              </div>
            ))}
          </div>

          {sectores.length>0 && (
            <div style={css.card}>
              <p style={css.cardTitle}>Sectores</p>
              {sectores.map(sec=>{
                const cnt=arboles.filter(a=>String(a.ID_SECTOR)===String(sec.ID_SECTOR)).length;
                const active=String(sectorFiltro)===String(sec.ID_SECTOR);
                return (
                  <div key={sec.ID_SECTOR} onClick={()=>setSectorFiltro(active?"":String(sec.ID_SECTOR))}
                    style={{ padding:"8px 10px", borderRadius:10, marginBottom:4, cursor:"pointer",
                      background: active ? (isDark ? "rgba(56,189,248,0.10)" : "#f0f9ff") : (isDark ? "rgba(255,255,255,0.03)" : "#f8fafc"),
                      border:`1px solid ${active ? (isDark ? "rgba(56,189,248,0.30)" : "#7dd3fc") : C.border}`, transition:"all .15s" }}>
                    <div style={{ fontSize:12, fontWeight:700, color:active?"#0284c7":C.text }}>{sec.NOMBRE_SECTOR}</div>
                    <div style={{ fontSize:10, color:C.textMuted, marginTop:2 }}>
                      {sec.TIPO_CULTIVO}{sec.AREA_HECTAREAS?` · ${sec.AREA_HECTAREAS} ha`:""} · <b style={{ color:"#0ea5e9" }}>{cnt}</b> árboles
                    </div>
                    <div style={{ fontSize:10, color:C.textMuted }}>{sec.NUMERO_SURCOS||"—"} surcos</div>
                  </div>
                );
              })}
            </div>
          )}
        </aside>

        <main style={css.center}>

          {vista===VISTA.MAPA && (
            <div style={css.card}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14, flexWrap:"wrap", gap:10 }}>
                <div>
                  <p style={{ ...css.cardTitle, margin:0 }}>Mapa de Árboles</p>
                  {finca && <span style={{ fontSize:11, color:C.textMuted }}>{finca.NOMBRE_FINCA} · {anchoFinca}m × {largoFinca}m</span>}
                  <div style={{ marginTop:8 }}>
                    <button style={{ background:"#0ea5e9", color:"#fff", border:"none", borderRadius:8, padding:"7px 14px", fontSize:12, fontWeight:700, cursor:"pointer", boxShadow:"0 2px 8px rgba(14,165,233,0.3)" }}
                      onClick={()=>setMostrarAlertaEspacios(true)}>🌱 Espacios dispo.</button>
                  </div>
                  <div style={{ marginTop:5, fontSize:11, color:C.textMuted }}>
                    Área total: {resumenEspacio.areaTotal} m² · Ocupados: {resumenEspacio.metrosOcupados} m² · Disponibles: {resumenEspacio.metrosDisponibles} m²
                  </div>
                  <div style={{ fontSize:11, color:"#0284c7", fontWeight:700 }}>
                    Árboles sembrados: {resumenEspacio.arbolesSembrados} · Espacios disponibles: {resumenEspacio.espaciosDisponibles}
                  </div>
                </div>
                <div className="tour-mapa-controles" style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
                  {[
                    { l:"−", a:()=>setZoom(z=>Math.max(z-0.25,0.5)) },
                    { l:`${Math.round(zoom*100)}%`, a:null },
                    { l:"+", a:()=>setZoom(z=>Math.min(z+0.25,2.5)) },
                    { l:"↺", a:()=>setZoom(1) },
                  ].map((b,i)=>(
                    <button key={i} onClick={b.a} disabled={!b.a}
                      style={{ padding:"5px 11px", borderRadius:8, border:`1px solid ${C.border}`, background: isDark ? "rgba(255,255,255,0.06)" : "#fff", color:C.textSub, fontSize:12, cursor:b.a?"pointer":"default", fontWeight:600 }}>
                      {b.l}
                    </button>
                  ))}
                  <button style={css.btnPrimary} onClick={()=>{ setMapTourRun(false); setNuevoArbolTourRun(false); openModal("nuevo_arbol"); setTimeout(()=>setNuevoArbolTourRun(true),800); }}>
                    + Nuevo Árbol
                  </button>
                  <button style={css.btnSecondary} onClick={()=>{ setNuevoArbolTourRun(false); setMapTourRun(false); setTimeout(()=>setMapTourRun(true),300); }}>
                    Mini tutorial
                  </button>
                </div>
              </div>

              <div className="tour-mapa-plano" style={{ position:"relative", width:"100%", height:480, borderRadius:16, overflow:"hidden", border:`1px solid ${C.border}`, boxShadow:"0 4px 20px rgba(0,0,0,0.12)" }}>
                <div style={{ position:"absolute", inset:0,
                  background:"linear-gradient(160deg, #7dd3fc 0%, #38bdf8 20%, #0ea5e9 45%, #0284c7 70%, #075985 100%)" }}/>
                <div style={{ position:"absolute", inset:0, pointerEvents:"none",
                  background:`
                    radial-gradient(ellipse 55% 40% at 20% 30%, rgba(186,230,253,0.28) 0%, transparent 70%),
                    radial-gradient(ellipse 40% 35% at 75% 20%, rgba(200,236,255,0.22) 0%, transparent 65%),
                    radial-gradient(ellipse 50% 45% at 60% 75%, rgba(170,224,250,0.20) 0%, transparent 70%),
                    radial-gradient(ellipse 35% 30% at 10% 80%, rgba(190,228,252,0.18) 0%, transparent 60%)
                  ` }}/>
                <div style={{ position:"absolute", inset:0, pointerEvents:"none",
                  backgroundImage:`repeating-linear-gradient(
                    90deg,
                    transparent 0px, transparent 11px,
                    rgba(0,0,0,0.04) 11px, rgba(0,0,0,0.04) 12px
                  )` }}/>
                <div style={{ position:"absolute", inset:0, pointerEvents:"none",
                  backgroundImage:`repeating-linear-gradient(
                    0deg,
                    transparent 0px, transparent 23px,
                    rgba(0,0,0,0.03) 23px, rgba(0,0,0,0.03) 24px
                  )` }}/>
                <div style={{ position:"absolute", inset:0, pointerEvents:"none",
                  background:"radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.18) 100%)" }}/>

                {mostrarAlertaEspacios && (
                  <div style={{ position:"absolute", top:14, right:14, zIndex:40, width:300,
                    background: isDark ? "#1a1f2e" : "#fff", borderRadius:16, padding:"16px 18px",
                    boxShadow: isDark ? "0 16px 48px rgba(0,0,0,0.55)" : "0 16px 48px rgba(15,23,42,0.18)", border: isDark ? "1px solid rgba(255,255,255,0.08)" : `1px solid ${C.border}`,
                    animation:"fadeIn .2s ease" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10, marginBottom:14 }}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:800, color:C.text, marginBottom:3 }}>🌱 Espacios disponibles</div>
                        <div style={{ fontSize:11, color:C.textMuted }}>Capacidad actual de siembra en esta finca.</div>
                      </div>
                      <button onClick={()=>setMostrarAlertaEspacios(false)}
                        style={{ background: isDark ? "rgba(255,255,255,0.08)" : "#f1f5f9", color:C.textMuted, border:"none", width:28, height:28, borderRadius:8, cursor:"pointer", fontWeight:700, flexShrink:0 }}>✕</button>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                      {[
                        { l:"Espacios libres",  v:resumenEspacio.espaciosDisponibles, color:"#38bdf8" },
                        { l:"Capacidad total",  v:resumenEspacio.capacidadTotal,       color:"#3b82f6" },
                      ].map(({l,v,color})=>(
                        <div key={l} style={{ background: isDark ? "rgba(255,255,255,0.05)" : "#f8fafc", border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #e2e8f0", borderRadius:10, padding:"10px 12px" }}>
                          <div style={{ fontSize:10, color:C.textMuted, marginBottom:4 }}>{l}</div>
                          <div style={{ fontSize:22, fontWeight:800, color }}>{v}</div>
                        </div>
                      ))}
                      <div style={{ gridColumn:"1/-1", background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:10, padding:"10px 12px" }}>
                        <div style={{ fontSize:10, color:C.textMuted, marginBottom:4 }}>Metros disponibles</div>
                        <div style={{ fontSize:20, fontWeight:800, color:"#a855f7" }}>{resumenEspacio.metrosDisponibles} m²</div>
                      </div>
                    </div>
                  </div>
                )}

                {cargando ? (
                  <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:14, background:"rgba(255,255,255,0.7)" }}>
                    <div style={{ fontSize:32, animation:"spin 1s linear infinite" }}>🌿</div>
                    <span style={{ fontSize:13, fontWeight:600, color:C.textSub }}>Cargando mapa agrícola...</span>
                  </div>
                ) : errorMsg ? (
                  <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12 }}>
                    <span style={{ fontSize:32 }}>⚠️</span>
                    <span style={{ fontSize:13, color:"#c2410c", fontWeight:600 }}>{errorMsg}</span>
                    <button style={css.btnPrimary} onClick={()=>cargarPlano(fincaSeleccionada)}>↺ Reintentar</button>
                  </div>
                ) : (
                  <div style={{ position:"absolute", inset:0, transform:`scale(${zoom})`, transformOrigin:"top left", width:`${100/zoom}%`, height:`${100/zoom}%` }}>

                    {sectores.map((sector, i) => {
                      const pos = getSectorBox(sector, i, sectores.length);
                      const active = String(sectorFiltro)===String(sector.ID_SECTOR);
                      const arbolesEnSector = arboles.filter(a=>String(a.ID_SECTOR)===String(sector.ID_SECTOR));
                      const cnt = arbolesEnSector.length;
                      const maxSurcoArboles = arbolesEnSector.reduce((mx,a)=>Math.max(mx,Number(a.NUMERO_SURCO||1)),1);
                      const totalSurcos = Math.max(Number(sector.NUMERO_SURCOS||1), maxSurcoArboles, 1);
                      const PL=10, PR=6, usableW=100-PL-PR;
                      const surcosDibujables = Math.min(totalSurcos, 24);
                      const stepDibujo = usableW / surcosDibujables;
                      return (
                        <div key={sector.ID_SECTOR} className="sector-cell"
                          onClick={()=>setSectorFiltro(active?"":String(sector.ID_SECTOR))}
                          style={{ position:"absolute", left:`${pos.left}%`, top:`${pos.top}%`, width:`${pos.width}%`, height:`${pos.height}%`,
                            borderRadius:14,
                            border:`2px dashed ${active?"rgba(255,255,255,0.85)":"rgba(255,255,255,0.45)"}`,
                            background: active ? "rgba(0,40,80,0.18)" : "rgba(0,30,60,0.12)",
                            backgroundImage:`
                              linear-gradient(rgba(0,0,0,0.08) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(0,0,0,0.08) 1px, transparent 1px)
                            `,
                            backgroundSize:"32px 32px",
                            boxShadow: active ? "inset 0 0 0 2px rgba(255,255,255,0.20)" : "none",
                            cursor:"pointer", transition:"all .25s", zIndex:1 }}>
                          <div style={{ position:"absolute", top:7, left:7,
                            background:"rgba(255,255,255,0.95)", backdropFilter:"blur(6px)",
                            borderRadius:8, padding:"4px 9px",
                            boxShadow:"0 2px 8px rgba(0,0,0,0.14)",
                            maxWidth:"calc(100% - 16px)", overflow:"hidden", zIndex:5 }}>
                            <div style={{ fontWeight:700, color:"#0284c7", fontSize:10, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{sector.NOMBRE_SECTOR}</div>
                            <div style={{ color:"#64748b", fontSize:9, whiteSpace:"nowrap" }}>{sector.TIPO_CULTIVO} · {cnt} árboles{sector.AREA_HECTAREAS?` · ${sector.AREA_HECTAREAS} ha`:""}</div>
                          </div>
                        </div>
                      );
                    })}

                    {arbolesFiltrados.map(arbol=>{
                      const pos    = getArbolPosition(arbol, arboles, sectores);
                      const active = arbolSeleccionado?.ID_ARBOL===arbol.ID_ARBOL;
                      const hov    = hoveredArbol===arbol.ID_ARBOL;
                      const hasAlert = ["ENFERMO","MUERTO"].includes(String(arbol.NOMBRE_ESTADO||"").toUpperCase().trim());
                      const conPlaga = getPlagasActivas(arbol).length>0;
                      const cc = getColor(arbol.NOMBRE_ESTADO);
                      const sc = active ? 1.22 : hov ? 1.1 : 1;
                      return (
                        <div key={arbol.ID_ARBOL}
                          style={{ position:"absolute", left:`${pos.left}%`, top:`${pos.top}%`,
                            transform:`translate(-50%,-50%) scale(${sc})`,
                            transformOrigin:"50% 50%",
                            zIndex:active?30:hov?25:10,
                            transition:"transform .2s cubic-bezier(.34,1.56,.64,1)",
                            cursor:"pointer",
                            display:"flex", flexDirection:"column", alignItems:"center" }}
                          onClick={()=>setArbolSeleccionado(arbol)}
                          onMouseEnter={()=>{ setTooltip(arbol); setHoveredArbol(arbol.ID_ARBOL); }}
                          onMouseLeave={()=>{ setTooltip(null); setHoveredArbol(null); }}>

                          <TreeSVG estado={arbol.NOMBRE_ESTADO} active={active} hovered={hov} size={48} pulsing={hasAlert&&!active}/>

                          <div style={{
                            marginTop: -8,
                            width: active ? 52 : hov ? 46 : 40,
                            height: active ? 16 : hov ? 14 : 12,
                            borderRadius:"50%",
                            background:`radial-gradient(ellipse at 40% 40%,
                              #d4914a 0%,
                              #9e5520 35%,
                              #6b3210 65%,
                              #3a1a06 100%)`,
                            boxShadow: active
                              ? `0 2px 0 rgba(0,0,0,0.25), 0 0 0 3px ${cc.base}88`
                              : hov
                              ? `0 2px 0 rgba(0,0,0,0.25), 0 0 0 2px ${cc.base}55`
                              : "0 2px 0 rgba(0,0,0,0.22)",
                            transition:"all .2s",
                          }}/>

                          {hasAlert && !active && (
                            <div style={{
                              position:"absolute", bottom:-2,
                              width:48, height:16, borderRadius:"50%",
                              border:`2px solid ${cc.base}`,
                              opacity:0.6,
                              animation:"pulseRing 1.8s ease-out infinite",
                            }}/>
                          )}

                          {conPlaga && <div style={{ position:"absolute", top:4, right:4, width:10, height:10, borderRadius:"50%", background:"#f97316", boxShadow:"0 0 6px #f97316cc", border:"2px solid #fff" }}/>}
                        </div>
                      );
                    })}

                    {tooltip && (()=>{
                      const pos=getArbolPosition(tooltip, arboles, sectores);
                      const cc=getColor(tooltip.NOMBRE_ESTADO);
                      return (
                        <div style={{ position:"absolute", left:`${pos.left}%`, top:`${pos.top}%`, transform:"translate(22px,-50%)",
                          background: isDark ? "rgba(15,20,30,0.97)" : "#fff", borderRadius:12, padding:"10px 14px",
                          boxShadow: isDark ? "0 8px 28px rgba(0,0,0,0.55)" : "0 8px 28px rgba(15,23,42,0.18)", border: isDark ? "1px solid rgba(255,255,255,0.09)" : `1px solid ${C.border}`,
                          zIndex:50, pointerEvents:"none", minWidth:175, animation:"fadeIn .12s ease" }}>
                          <div style={{ fontSize:12, fontWeight:700, color:C.text, marginBottom:3 }}>
                            {tooltip.NOMBRE_ARBOL||"Árbol"} <span style={{ color:cc.text }}>#{tooltip.ID_ARBOL}</span>
                          </div>
                          <Badge estado={tooltip.NOMBRE_ESTADO}/>
                          <div style={{ fontSize:10, color:C.textMuted, marginTop:5 }}>{tooltip.NOMBRE_SECTOR}</div>
                          <div style={{ fontSize:10, color:C.textMuted }}>Surco {tooltip.NUMERO_SURCO||"—"} · Pos {getNumeroPosicionArbol(tooltip)}</div>
                        </div>
                      );
                    })()}
                  </div>
                )}
                <div style={{ position:"absolute", bottom:8, right:10, fontSize:9, color:"rgba(255,255,255,0.5)", fontWeight:600 }}>{anchoFinca}m × {largoFinca}m</div>
              </div>

              <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap", alignItems:"center" }}>
                <span style={{ fontSize:11, color:C.textMuted, fontWeight:600 }}>Estados:</span>
                {estadosUnicos.map(nombre=>{
                  const cc=getColor(nombre), active=estadoFiltro===nombre;
                  return (
                    <button key={nombre} onClick={()=>setEstadoFiltro(active?"":nombre)} style={{
                      display:"flex", alignItems:"center", gap:6, padding:"4px 12px", borderRadius:20,
                      background:active?cc.bg:(isDark?"rgba(255,255,255,0.04)":"#f8fafc"), border:`1px solid ${active?cc.border:C.border}`,
                      cursor:"pointer", fontSize:11, color:active?cc.text:C.textSub, fontWeight:600, transition:"all .15s" }}>
                      <div style={{ width:9, height:9, borderRadius:String(nombre).toUpperCase()==="MUERTO"?2:"50%", background:cc.base }}/>
                      {nombre}
                    </button>
                  );
                })}
                {arbolesConPlagas.length>0 && <span style={{ fontSize:11, color:C.textMuted }}>· punto naranja = plaga activa</span>}
              </div>
            </div>
          )}

          {vista===VISTA.ALERTAS && (
            <div style={css.card}>
              <p style={css.cardTitle}>⚠️ Árboles que requieren atención <span style={{ fontSize:11, fontWeight:400, color:C.textMuted }}>({arbolesAlerta.length} árbol(es))</span></p>
              {arbolesAlerta.length===0 ? (
                <div style={{ textAlign:"center", padding:"48px 0", color:C.textMuted }}>
                  <div style={{ fontSize:36, marginBottom:12 }}>✅</div>
                  <div style={{ fontSize:13, fontWeight:600 }}>No hay árboles con alertas activas</div>
                </div>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:10 }}>
                  {arbolesAlerta.map(arbol=>{
                    const cc=getColor(arbol.NOMBRE_ESTADO);
                    return (
                      <div key={arbol.ID_ARBOL} className="alert-card"
                        onClick={()=>{ setArbolSeleccionado(arbol); setVista(VISTA.MAPA); }}
                        style={{ background:cc.bg, border:`1px solid ${cc.border}`, borderLeft:`4px solid ${cc.base}`, borderRadius:12, padding:"14px 16px", cursor:"pointer", transition:"all .2s", boxShadow:"0 2px 10px rgba(0,0,0,0.06)" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                          <strong style={{ fontSize:13, color:C.text }}>{arbol.NOMBRE_ARBOL||"Árbol"} #{arbol.ID_ARBOL}</strong>
                          <Badge estado={arbol.NOMBRE_ESTADO}/>
                        </div>
                        <div style={{ fontSize:11, color:C.textMuted, marginTop:4 }}>📍 {arbol.NOMBRE_SECTOR} · Surco {arbol.NUMERO_SURCO||"—"}</div>
                        <div style={{ fontSize:11, color:C.textMuted }}>Posición {getNumeroPosicionArbol(arbol)}</div>
                        <div style={{ display:"flex", gap:6, marginTop:10 }}>
                          <button style={{ flex:1, padding:"6px 10px", borderRadius:8, border:"none", background:cc.base, color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer" }}
                            onClick={e=>{ e.stopPropagation(); setArbolSeleccionado(arbol); openModal("actualizar_estado"); }}>Actualizar estado</button>
                          <button style={{ flex:1, padding:"6px 10px", borderRadius:8, border:`1px solid ${cc.border}`, background:"transparent", color:cc.text, fontSize:11, fontWeight:700, cursor:"pointer" }}
                            onClick={e=>{ e.stopPropagation(); setArbolSeleccionado(arbol); openModal("registrar_alerta"); }}>Seguimiento</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {vista===VISTA.RESIEMBRA && (
            <div style={css.card}>
              <p style={css.cardTitle}>🌿 Gestión de Resiembra <span style={{ fontSize:11, fontWeight:400, color:C.textMuted }}>({arbolesResiembra.length} registro(s))</span></p>
              <p style={{ fontSize:12, color:C.textMuted, marginBottom:14, lineHeight:1.7 }}>
                Aquí se muestran tanto los árboles con oportunidad de resiembra (<strong>MUERTO</strong>) como los árboles ya marcados en estado <strong>RESIEMBRA</strong>.
              </p>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))", gap:10, marginBottom:16 }}>
                {[
                  { label:"Oportunidades pendientes", value:arbolesMuertosParaResiembra.length, color:"#ef4444", sub:"Árboles en estado MUERTO" },
                  { label:"Ya en resiembra",           value:arbolesYaResiembrados.length,        color:"#a855f7", sub:"Estado RESIEMBRA" },
                  { label:"Total en seguimiento",      value:arbolesResiembra.length,             color:"#38bdf8", sub:"Muertos + Resiembra" },
                ].map(card=>(
                  <div key={card.label} style={{ background: isDark ? "rgba(255,255,255,0.04)" : "#fff", border:`1.5px solid ${card.color}33`, borderRadius:12, padding:"14px 16px", boxShadow: isDark ? "0 4px 16px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.05)" }}>
                    <div style={{ fontSize:11, color:card.color, fontWeight:700, marginBottom:6 }}>{card.label}</div>
                    <div style={{ fontSize:28, fontWeight:800, color:card.color }}>{card.value}</div>
                    <div style={{ fontSize:10, color:C.textMuted, marginTop:4 }}>{card.sub}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:8, marginBottom:16 }}>
                {sectores.map(sec=>{
                  const registrosSector = arbolesResiembra.filter(a=>String(a.ID_SECTOR)===String(sec.ID_SECTOR));
                  if (!registrosSector.length) return null;
                  const surcos = [...new Set(registrosSector.map(a=>a.NUMERO_SURCO).filter(Boolean))];
                  const tieneMuerto = registrosSector.some(a=>String(a.NOMBRE_ESTADO||"").toUpperCase().trim()==="MUERTO");
                  const v=getResiembraVisual(tieneMuerto?"MUERTO":"RESIEMBRA");
                  return (
                    <div key={sec.ID_SECTOR} style={{ background:v.bg, borderRadius:12, border:`1px solid ${v.border}`, padding:"12px 14px" }}>
                      <div style={{ fontWeight:700, fontSize:13, color:v.text }}>{sec.NOMBRE_SECTOR}</div>
                      <div style={{ fontSize:26, fontWeight:700, color:v.text, margin:"4px 0" }}>{registrosSector.length}</div>
                      <div style={{ fontSize:11, color:v.soft }}>{tieneMuerto?"oportunidades":"registros"}</div>
                      <div style={{ fontSize:10, color:v.soft, marginTop:4 }}>{sec.TIPO_CULTIVO}{surcos.length>0?` · Surcos: ${surcos.join(", ")}`:""}</div>
                    </div>
                  );
                })}
                {arbolesResiembra.length===0 && (
                  <div style={{ gridColumn:"1/-1", textAlign:"center", padding:"40px 0", color:C.textMuted, fontSize:13 }}>No hay árboles registrados para gestión de resiembra</div>
                )}
              </div>
              {arbolesResiembra.length>0 && (
                <div style={{ overflowX:"auto" }}>
                  <table style={css.table}>
                    <thead><tr style={{ background:"#f3e8ff" }}>
                      {["ID","Sector","Surco","Posición","Estado","Variedad","Último tratamiento","Acción"].map(h=>(
                        <th key={h} style={{ ...css.th, color:"#7e22ce" }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {arbolesResiembra.map(a=>{
                        const v=getResiembraVisual(a.NOMBRE_ESTADO);
                        return (
                          <tr key={a.ID_ARBOL} className="row-hover" onClick={()=>{ setArbolSeleccionado(a); setVista(VISTA.MAPA); }}
                            style={{ cursor:"pointer", background:v.rowBg, borderLeft:`4px solid ${v.text}` }}>
                            <td style={css.td}>{a.ID_ARBOL}</td>
                            <td style={css.td}>{a.NOMBRE_SECTOR}</td>
                            <td style={css.td}>{a.NUMERO_SURCO||"—"}</td>
                            <td style={{ ...css.td, fontFamily:"monospace", fontSize:11, color:C.textMuted }}>Pos {getNumeroPosicionArbol(a)}</td>
                            <td style={css.td}><Badge estado={a.NOMBRE_ESTADO}/></td>
                            <td style={css.td}>{a.NOMBRE_ARBOL||"—"}</td>
                            <td style={{ ...css.td, fontSize:11 }}>
                              {a.NOMBRE_TRATAMIENTO ? <>{a.NOMBRE_TRATAMIENTO}<br/><span style={{ color:C.textMuted }}>{formatFecha(a.FECHA_APLICACION)}</span></>
                                : <span style={{ color:v.text }}>{String(a.NOMBRE_ESTADO||"").toUpperCase().trim()==="MUERTO"?"Pendiente":"Sin registro"}</span>}
                            </td>
                            <td style={css.td}>
                              <button style={{ padding:"5px 12px", borderRadius:8, border:`1px solid ${v.border}`, background:v.buttonBg, color:v.buttonText, fontSize:11, fontWeight:700, cursor:"pointer" }}
                                onClick={e=>{ e.stopPropagation(); setArbolSeleccionado(a); openModal("resiembra"); }}>
                                {String(a.NOMBRE_ESTADO||"").toUpperCase().trim()==="MUERTO"?"🌿 Resembrar":"🌿 Gestionar"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div style={{ ...css.card, marginTop:12 }}>
            <p style={{ ...css.cardTitle, marginBottom:10 }}>Listado de Árboles <span style={{ fontSize:11, fontWeight:400, color:C.textMuted }}>({arbolesFiltrados.length} de {arboles.length})</span></p>
            <div style={{ overflowX:"auto" }}>
              <table style={css.table}>
                <thead><tr style={{ background:"#f0f9ff" }}>
                  {["ID","Sector · Surco","Estado","Variedad","Posición en surco","Último tratamiento","Plagas activas"].map(h=>(
                    <th key={h} style={css.th}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {arbolesFiltrados.length===0 ? (
                    <tr><td colSpan={7} style={{ textAlign:"center", padding:28, color:C.textMuted, fontSize:13 }}>No hay árboles con los filtros seleccionados</td></tr>
                  ) : arbolesFiltrados.map(a=>{
                    const cc=getColor(a.NOMBRE_ESTADO), active=arbolSeleccionado?.ID_ARBOL===a.ID_ARBOL;
                    const plagasActivas=getPlagasActivas(a);
                    return (
                      <tr key={a.ID_ARBOL} className="row-hover" onClick={()=>setArbolSeleccionado(a)}
                        style={{ cursor:"pointer", background:active?(isDark?"rgba(56,189,248,0.07)":"#f0f9ff"):(isDark?"transparent":"white"), borderBottom:`1px solid ${C.border}` }}>
                        <td style={css.td}><strong style={{ color:C.text }}>{a.ID_ARBOL}</strong></td>
                        <td style={css.td}><span style={{ fontSize:12 }}>{a.NOMBRE_SECTOR}</span>{a.NUMERO_SURCO&&<span style={{ fontSize:11, color:C.textMuted }}> · Surco {a.NUMERO_SURCO}</span>}</td>
                        <td style={css.td}><Badge estado={a.NOMBRE_ESTADO}/></td>
                        <td style={css.td}>{a.NOMBRE_ARBOL||"—"}</td>
                        <td style={{ ...css.td, fontFamily:"monospace", fontSize:11, color:C.textMuted }}>Surco {a.NUMERO_SURCO||"—"} · Pos {getNumeroPosicionArbol(a)}</td>
                        <td style={{ ...css.td, fontSize:11 }}>
                          {a.NOMBRE_TRATAMIENTO
                            ? <>{a.NOMBRE_TRATAMIENTO}{a.NOMBRE_FERTILIZANTE&&<span style={{ color:"#1d4ed8" }}> + {a.NOMBRE_FERTILIZANTE}</span>}<br/><span style={{ color:C.textMuted }}>{formatFecha(a.FECHA_APLICACION)}</span></>
                            : <span style={{ color:"#d1d5db" }}>—</span>}
                        </td>
                        <td style={css.td}>
                          {plagasActivas.length>0
                            ? plagasActivas.map((p,i)=><span key={i} style={{ display:"inline-block", fontSize:10, marginRight:3, padding:"2px 7px", borderRadius:20, background:RIESGO_COLOR[p.NIVEL_RIESGO]||"#64748b", color:"#fff" }}>{p.NOMBRE_PLAGA}</span>)
                            : <span style={{ color:"#d1d5db", fontSize:11 }}>Sin plagas</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </main>

        <aside style={{ ...css.sidebar, maxWidth:230 }}>
          <div className="tour-mapa-detalle" style={css.card}>
            <p style={css.cardTitle}>Detalle del Árbol</p>
            {!arbolSeleccionado ? (
              <div style={{ textAlign:"center", padding:"28px 12px", color:C.textMuted }}>
                <div style={{ fontSize:40, marginBottom:12 }}>🌲</div>
                <div style={{ fontSize:12, lineHeight:1.7 }}>Haz clic en un árbol del mapa o de la tabla para ver su información completa.</div>
              </div>
            ) : (()=>{
              const cc=getColor(arbolSeleccionado.NOMBRE_ESTADO);
              const est=String(arbolSeleccionado.NOMBRE_ESTADO||"").toUpperCase().trim();
              const plagasAct=getPlagasActivas(arbolSeleccionado);
              return (
                <>
                  <div style={{ background:cc.bg, border:`1px solid ${cc.border}`, borderRadius:12, padding:"12px 14px", display:"flex", alignItems:"center", gap:12, marginBottom:12, boxShadow:`0 2px 12px ${cc.glow}` }}>
                    <TreeSVG estado={arbolSeleccionado.NOMBRE_ESTADO} active size={32}/>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:cc.text }}>{arbolSeleccionado.NOMBRE_ESTADO||"Sin estado"}</div>
                      <div style={{ fontSize:11, color:C.textMuted }}>árbol #{arbolSeleccionado.ID_ARBOL}</div>
                    </div>
                  </div>
                  {[
                    { l:"ID",       v:arbolSeleccionado.ID_ARBOL },
                    { l:"Variedad", v:arbolSeleccionado.NOMBRE_ARBOL||"—" },
                    { l:"Sector",   v:arbolSeleccionado.NOMBRE_SECTOR||"—" },
                    { l:"Surco",    v:arbolSeleccionado.NUMERO_SURCO||"—" },
                    { l:"Posición", v:getNumeroPosicionArbol(arbolSeleccionado) },
                  ].map(({l,v})=>(
                    <div key={l} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid #f1f5f9" }}>
                      <span style={{ fontSize:11, color:C.textMuted }}>{l}</span>
                      <strong style={{ fontSize:12, color:C.text }}>{v}</strong>
                    </div>
                  ))}
                  {arbolSeleccionado.NOMBRE_TRATAMIENTO && (
                    <div style={{ marginTop:10, background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:10, padding:"10px 12px", fontSize:11 }}>
                      <div style={{ fontWeight:700, color:"#1d4ed8", marginBottom:3 }}>💊 Último tratamiento</div>
                      <div style={{ color:"#1d4ed8" }}>{arbolSeleccionado.NOMBRE_TRATAMIENTO}</div>
                      {arbolSeleccionado.NOMBRE_FERTILIZANTE && <div style={{ color:"#1d4ed8" }}>+ {arbolSeleccionado.NOMBRE_FERTILIZANTE}</div>}
                      <div style={{ color:"#93c5fd", marginTop:2 }}>{formatFecha(arbolSeleccionado.FECHA_APLICACION)}</div>
                      {arbolSeleccionado.OBS_TRATAMIENTO && <div style={{ color:C.textMuted, marginTop:3, fontStyle:"italic", fontSize:10 }}>{arbolSeleccionado.OBS_TRATAMIENTO}</div>}
                    </div>
                  )}
                  {plagasAct.length>0 && (
                    <div style={{ marginTop:8, background: isDark ? "rgba(249,115,22,0.08)" : "#fff7ed", border: isDark ? "1px solid rgba(249,115,22,0.25)" : "1px solid #fed7aa", borderRadius:10, padding:"10px 12px" }}>
                      <div style={{ fontWeight:700, color:"#c2410c", fontSize:11, marginBottom:4 }}>🦠 Plagas activas ({plagasAct.length})</div>
                      {plagasAct.map((p,i)=>(
                        <div key={i} style={{ fontSize:10, color:"#9a3412", marginBottom:3 }}>
                          <span style={{ background:RIESGO_COLOR[p.NIVEL_RIESGO]||"#64748b", color:"#fff", fontSize:9, padding:"1px 6px", borderRadius:20, marginRight:4 }}>{p.NIVEL_RIESGO||"?"}</span>
                          {p.NOMBRE_PLAGA}
                          {p.TIPO_PLAGA && <span style={{ color:C.textMuted }}> · {p.TIPO_PLAGA}</span>}
                          {p.OBSERVACIONES && <div style={{ color:C.textMuted, fontStyle:"italic", marginTop:1 }}>{p.OBSERVACIONES}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                  {arbolSeleccionado.DESCRIPCION && (
                    <p style={{ marginTop:8, fontSize:11, color:C.textMuted, lineHeight:1.6, borderTop: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid #f1f5f9", paddingTop:8 }}>{arbolSeleccionado.DESCRIPCION}</p>
                  )}
                  <div style={{ marginTop:12, display:"flex", flexDirection:"column", gap:6 }}>
                    <ActionBtn color="#38bdf8" onClick={()=>openModal("actualizar_estado")}>⚡ Actualizar estado</ActionBtn>
                    {["ENFERMO","MUERTO"].includes(est) && <ActionBtn color="#f97316" outline onClick={()=>openModal("registrar_alerta")}>⚠️ Registrar alerta</ActionBtn>}
                    {est==="MUERTO" && <ActionBtn color="#a855f7" outline onClick={()=>openModal("resiembra")}>🌿 Marcar para resiembra</ActionBtn>}
                  </div>
                </>
              );
            })()}
          </div>
        </aside>
      </div>

      {modal.tipo && (
        <div style={mS.overlay} onClick={closeModal}>
          <div style={mS.modal} onClick={e=>e.stopPropagation()}>
            <div style={mS.header}>
              <h3 style={mS.title}>
                {modal.tipo==="nuevo_arbol"      && "🌱 Nuevo árbol"}
                {modal.tipo==="actualizar_estado" && "🔄 Actualizar estado"}
                {modal.tipo==="registrar_alerta" && "⚠️ Registrar alerta"}
                {modal.tipo==="resiembra"        && "🌿 Registrar resiembra"}
              </h3>
              <button style={mS.closeBtn} onClick={closeModal}>✕</button>
            </div>
            {modal.error && <div style={mS.err}>⚠️ {modal.error}</div>}

            {modal.tipo==="nuevo_arbol" && (
              <form onSubmit={submitNuevoArbol} style={mS.form}>
                <FieldLabel>Sector</FieldLabel>
                <select className="tour-nuevo-sector" style={mS.input} value={nuevoArbolForm.id_sector} onChange={e=>setNuevoArbolForm(f=>({...f,id_sector:e.target.value}))} required>
                  <option value="">Selecciona...</option>
                  {sectoresDeLaFinca.map(s=><option key={s.ID_SECTOR} value={s.ID_SECTOR}>{s.NOMBRE_SECTOR}</option>)}
                </select>
                <FieldLabel>Variedad</FieldLabel>
                <select className="tour-nuevo-variedad" style={mS.input} value={nuevoArbolForm.id_tipo_variedad_arbol} onChange={e=>setNuevoArbolForm(f=>({...f,id_tipo_variedad_arbol:e.target.value}))} required>
                  <option value="">Selecciona...</option>
                  {catalogos.variedades.map(v=><option key={v.ID_TIPO_VARIEDAD_ARBOL||v.ID_TIPO_ARBOL} value={v.ID_TIPO_VARIEDAD_ARBOL||v.ID_TIPO_ARBOL}>{v.NOMBRE_ARBOL||v.nombre_arbol}</option>)}
                </select>
                <FieldLabel>Estado inicial</FieldLabel>
                <select className="tour-nuevo-estado" style={mS.input} value={nuevoArbolForm.id_estado} onChange={e=>setNuevoArbolForm(f=>({...f,id_estado:e.target.value}))} required>
                  <option value="">Selecciona...</option>
                  {catalogos.estados.map(x=><option key={x.ID_ESTADO} value={x.ID_ESTADO}>{x.NOMBRE_ESTADO||x.nombre_estado}</option>)}
                </select>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <div><FieldLabel>Surco</FieldLabel><input className="tour-nuevo-surco" style={mS.input} type="number" min="1" value={nuevoArbolForm.numero_surco} onChange={e=>setNuevoArbolForm(f=>({...f,numero_surco:e.target.value}))} required/></div>
                  <div><FieldLabel>Posición en surco</FieldLabel><input className="tour-nuevo-posicion" style={mS.input} type="number" min="1" placeholder="Posición" value={nuevoArbolForm.posicion} onChange={e=>setNuevoArbolForm(f=>({...f,posicion:e.target.value}))} required/></div>
                </div>
                <FieldLabel>Descripción</FieldLabel>
                <textarea className="tour-nuevo-descripcion" style={{ ...mS.input, minHeight:80, resize:"vertical" }} value={nuevoArbolForm.descripcion} onChange={e=>setNuevoArbolForm(f=>({...f,descripcion:e.target.value}))}/>
                <div style={mS.footer}>
                  <button type="button" style={mS.btnCancel} onClick={closeModal}>Cancelar</button>
                  <button type="submit" className="tour-nuevo-guardar" style={mS.btnOk} disabled={modal.loading}>{modal.loading?"⏳ Guardando...":"🌳 Guardar árbol"}</button>
                </div>
              </form>
            )}

            {modal.tipo==="actualizar_estado" && arbolSeleccionado && (
              <form onSubmit={submitActualizarEstado} style={mS.form}>
                <div style={mS.readonly}>Árbol: <strong style={{ color:"#0284c7" }}>{arbolSeleccionado.NOMBRE_ARBOL} · {arbolSeleccionado.NOMBRE_SECTOR}</strong></div>
                <FieldLabel>Nuevo estado</FieldLabel>
                <select style={mS.input} value={estadoForm.id_estado_nuevo} onChange={e=>setEstadoForm(f=>({...f,id_estado_nuevo:e.target.value}))} required>
                  <option value="">Selecciona...</option>
                  {catalogos.estados.map(x=><option key={x.ID_ESTADO} value={x.ID_ESTADO}>{x.NOMBRE_ESTADO||x.nombre_estado}</option>)}
                </select>
                <FieldLabel>Fecha</FieldLabel>
                <input style={mS.input} type="date" value={estadoForm.fecha_cambio} onChange={e=>setEstadoForm(f=>({...f,fecha_cambio:e.target.value}))} required/>
                <FieldLabel>Observaciones</FieldLabel>
                <textarea style={{ ...mS.input, minHeight:80, resize:"vertical" }} value={estadoForm.observaciones} onChange={e=>setEstadoForm(f=>({...f,observaciones:e.target.value}))}/>
                <div style={mS.footer}>
                  <button type="button" style={mS.btnCancel} onClick={closeModal}>Cancelar</button>
                  <button type="submit" style={mS.btnOk} disabled={modal.loading}>{modal.loading?"⏳ Guardando...":"✓ Actualizar estado"}</button>
                </div>
              </form>
            )}

            {modal.tipo==="registrar_alerta" && arbolSeleccionado && (
              <form onSubmit={submitRegistrarAlerta} style={mS.form}>
                <div style={mS.readonly}>Árbol: <strong style={{ color:"#c2410c" }}>{arbolSeleccionado.NOMBRE_ARBOL} · {arbolSeleccionado.NOMBRE_SECTOR}</strong></div>
                <FieldLabel>Plaga / enfermedad</FieldLabel>
                <select style={mS.input} value={alertaForm.id_plaga} onChange={e=>setAlertaForm(f=>({...f,id_plaga:e.target.value}))} required>
                  <option value="">Selecciona...</option>
                  {catalogos.plagas.map(p=><option key={p.ID_PLAGA} value={p.ID_PLAGA}>{p.NOMBRE_PLAGA||p.nombre_plaga}</option>)}
                </select>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <div><FieldLabel>Fecha detección</FieldLabel><input style={mS.input} type="date" value={alertaForm.fecha_deteccion} onChange={e=>setAlertaForm(f=>({...f,fecha_deteccion:e.target.value}))} required/></div>
                  <div><FieldLabel>Fecha resolución</FieldLabel><input style={mS.input} type="date" value={alertaForm.fecha_resolucion} onChange={e=>setAlertaForm(f=>({...f,fecha_resolucion:e.target.value}))}/></div>
                </div>
                <FieldLabel>Observaciones</FieldLabel>
                <textarea style={{ ...mS.input, minHeight:80, resize:"vertical" }} value={alertaForm.observaciones} onChange={e=>setAlertaForm(f=>({...f,observaciones:e.target.value}))}/>
                <div style={mS.footer}>
                  <button type="button" style={mS.btnCancel} onClick={closeModal}>Cancelar</button>
                  <button type="submit" style={mS.btnOk} disabled={modal.loading}>{modal.loading?"⏳ Guardando...":"⚠️ Registrar alerta"}</button>
                </div>
              </form>
            )}

            {modal.tipo==="resiembra" && arbolSeleccionado && (
              <form onSubmit={submitResiembra} style={mS.form}>
                <div style={mS.readonly}>Árbol: <strong style={{ color:"#7e22ce" }}>{arbolSeleccionado.NOMBRE_ARBOL} · {arbolSeleccionado.NOMBRE_SECTOR}</strong></div>
                <FieldLabel>Fecha resiembra</FieldLabel>
                <input style={mS.input} type="date" value={resiembraForm.fecha_resiembra} onChange={e=>setResiembraForm(f=>({...f,fecha_resiembra:e.target.value}))} required/>
                <FieldLabel>Motivo</FieldLabel>
                <textarea style={{ ...mS.input, minHeight:80, resize:"vertical" }} value={resiembraForm.motivo} onChange={e=>setResiembraForm(f=>({...f,motivo:e.target.value}))}/>
                <div style={mS.footer}>
                  <button type="button" style={mS.btnCancel} onClick={closeModal}>Cancelar</button>
                  <button type="submit" style={mS.btnOk} disabled={modal.loading}>{modal.loading?"⏳ Guardando...":"🌿 Registrar resiembra"}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   STYLESHEET — theme-aware
══════════════════════════════════════════════════════════ */
const makeCss = (isDark) => ({
  root:      { background: isDark ? "#0f1117" : "#f0f4f8", minHeight:"100%", fontFamily:"'Segoe UI',system-ui,sans-serif", color: isDark ? "#e2e8f0" : "#1e293b", overflowY:"auto" },
  topBar:    { background: isDark ? "#1a1f2e" : "#fff", borderBottom: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid #e2e8f0", padding:"10px 20px", display:"flex", alignItems:"center", gap:16, flexWrap:"wrap", justifyContent:"space-between", position:"sticky", top:0, zIndex:100, boxShadow: isDark ? "0 1px 6px rgba(0,0,0,0.35)" : "0 1px 6px rgba(0,0,0,0.06)" },
  logoBox:   { width:40, height:40, background:"linear-gradient(135deg,#38bdf8,#0284c7)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 12px rgba(56,189,248,0.35)" },
  tab:       { display:"flex", alignItems:"center", gap:5, padding:"7px 14px", borderRadius:10, border:"1px solid transparent", background:"transparent", fontSize:12, fontWeight:600, cursor:"pointer", color: isDark ? "#64748b" : "#64748b", transition:"all .15s" },
  tabActive: { background: isDark ? "rgba(56,189,248,0.10)" : "#f0f9ff", color: isDark ? "#7dd3fc" : "#0284c7", border: isDark ? "1px solid rgba(56,189,248,0.25)" : "1px solid #bae6fd" },
  fincaSelect:{ height:36, border: isDark ? "1px solid rgba(255,255,255,0.10)" : "1px solid #e2e8f0", borderRadius:10, padding:"0 12px", fontSize:12, background: isDark ? "rgba(255,255,255,0.04)" : "#f8fafc", color: isDark ? "#e2e8f0" : "#1e293b", outline:"none" },
  statsRow:  { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, padding:"16px 20px 0" },
  layout:    { display:"grid", gridTemplateColumns:"200px 1fr 228px", gap:12, padding:16, alignItems:"start" },
  sidebar:   { display:"flex", flexDirection:"column", gap:10 },
  center:    { display:"flex", flexDirection:"column", minWidth:0 },
  card:      { background: isDark ? "#1a1f2e" : "#fff", border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid #e2e8f0", borderRadius:16, padding:16, boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.35)" : "0 1px 6px rgba(0,0,0,0.05)" },
  cardTitle: { margin:"0 0 10px", color: isDark ? "#7dd3fc" : "#0284c7", fontSize:13, fontWeight:700 },
  label:     { display:"block", fontWeight:600, fontSize:11, color: isDark ? "#94a3b8" : "#475569", marginBottom:3, marginTop:8 },
  select:    { width:"100%", height:34, border: isDark ? "1.5px solid rgba(255,255,255,0.10)" : "1.5px solid #e2e8f0", borderRadius:8, padding:"0 10px", fontSize:12, background: isDark ? "rgba(255,255,255,0.04)" : "#f8fafc", color: isDark ? "#e2e8f0" : "#1e293b", outline:"none" },
  clearBtn:  { marginTop:10, width:"100%", padding:"6px 0", fontSize:11, color: isDark ? "#64748b" : "#64748b", background:"transparent", border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #e2e8f0", borderRadius:8, cursor:"pointer" },
  btnPrimary:  { padding:"7px 16px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#38bdf8,#0ea5e9)", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", boxShadow:"0 4px 14px rgba(56,189,248,0.35)", transition:"all .15s" },
  btnSecondary:{ padding:"7px 14px", borderRadius:10, border: isDark ? "1px solid rgba(255,255,255,0.10)" : "1px solid #e2e8f0", background: isDark ? "rgba(255,255,255,0.04)" : "#fff", color: isDark ? "#94a3b8" : "#475569", fontSize:12, fontWeight:600, cursor:"pointer" },
  table:     { width:"100%", borderCollapse:"collapse", fontSize:12 },
  th:        { padding:"9px 10px", textAlign:"left", fontWeight:700, color: isDark ? "#7dd3fc" : "#0284c7", fontSize:11, borderBottom: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid #e2e8f0", background: isDark ? "rgba(56,189,248,0.05)" : "transparent" },
  td:        { padding:"9px 10px", borderBottom: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid #f1f5f9", verticalAlign:"middle", color: isDark ? "#e2e8f0" : "#1e293b" },
});

/* Modal styles — also theme-aware */
const makeMStyle = (isDark) => ({
  overlay:  { position:"fixed", inset:0, background: isDark ? "rgba(0,0,0,0.78)" : "rgba(15,23,42,0.45)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 },
  modal:    { width:"100%", maxWidth:540, background: isDark ? "#1a1f2e" : "#fff", borderRadius:20, border: isDark ? "1px solid rgba(255,255,255,0.10)" : "1px solid #e2e8f0", overflow:"hidden", boxShadow: isDark ? "0 32px 100px rgba(0,0,0,0.65)" : "0 24px 80px rgba(15,23,42,0.22)" },
  header:   { padding:"18px 20px", borderBottom: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid #f1f5f9", display:"flex", justifyContent:"space-between", alignItems:"center", background: isDark ? "#141820" : "#f8fafc" },
  title:    { margin:0, fontSize:17, color: isDark ? "#e2e8f0" : "#1e293b", fontWeight:800 },
  closeBtn: { background:"none", border:"none", color: isDark ? "#64748b" : "#94a3b8", cursor:"pointer", fontSize:20, lineHeight:1, padding:4 },
  form:     { padding:20, display:"flex", flexDirection:"column", gap:4 },
  input:    { width:"100%", boxSizing:"border-box", background: isDark ? "rgba(255,255,255,0.04)" : "#f8fafc", border: isDark ? "1.5px solid rgba(255,255,255,0.10)" : "1.5px solid #e2e8f0", borderRadius:10, padding:"10px 14px", fontSize:13, color: isDark ? "#e2e8f0" : "#1e293b", outline:"none", fontFamily:"inherit" },
  infoBox:  { background: isDark ? "rgba(56,189,248,0.06)" : "#f0f9ff", border: isDark ? "1px solid rgba(56,189,248,0.20)" : "1px solid #bae6fd", borderRadius:10, padding:"10px 14px", fontSize:12, color: isDark ? "#94a3b8" : "#475569" },
  footer:   { display:"flex", justifyContent:"flex-end", gap:10, marginTop:14, paddingTop:14, borderTop: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid #f1f5f9" },
  btnCancel:{ padding:"9px 20px", borderRadius:10, border: isDark ? "1.5px solid rgba(255,255,255,0.10)" : "1.5px solid #e2e8f0", background: isDark ? "rgba(255,255,255,0.04)" : "#fff", color: isDark ? "#94a3b8" : "#475569", fontSize:12, fontWeight:600, cursor:"pointer" },
  btnOk:    { padding:"9px 24px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#38bdf8,#0ea5e9)", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", boxShadow:"0 4px 14px rgba(56,189,248,.35)" },
  err:      { margin:"0 20px 0", padding:"10px 14px", background: isDark ? "rgba(239,68,68,0.10)" : "#fef2f2", border: isDark ? "1px solid rgba(239,68,68,0.25)" : "1px solid #fecaca", borderRadius:10, fontSize:12, color: isDark ? "#fca5a5" : "#b91c1c" },
  readonly: { background: isDark ? "rgba(255,255,255,0.03)" : "#f8fafc", border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid #e2e8f0", borderRadius:10, padding:12, fontSize:13, color: isDark ? "#94a3b8" : "#475569" },
});