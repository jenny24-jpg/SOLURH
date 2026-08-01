import { useEffect, useState, useMemo, useCallback } from 'react';
import s from './HistorialCambios.module.css';

import { API, apiFetch } from '../context/AuthContext';

const TABLAS = [
  { key:'',                     label:'Todas las tablas'      },
  { key:'CLIENTES',             label:'Clientes'              },
  { key:'SUPERVISORES',         label:'Supervisores'          },
  { key:'EMPLEADOS',            label:'Empleados'             },
  { key:'ASISTENCIAS',          label:'Asistencias'           },
  { key:'HORAS_EXTRA',          label:'Horas extras'          },
  { key:'DOCUMENTOS_EMPLEADO',  label:'Documentos'            },
  { key:'FOTOS_ASISTENCIA',     label:'Fotos de asistencia'   },
  { key:'USUARIOS',             label:'Usuarios'              },
];


const OP_COLOR = {
  INSERT: { bg:'#E8F5E9', color:'#241b75', icon:'add_circle' },
  UPDATE: { bg:'#FFF8E1', color:'#0f00e6', icon:'edit'       },
  DELETE: { bg:'#FFEBEE', color:'#17157e', icon:'delete'     },
};

function formatFecha(val) {
  if (!val) return '—';
  // Si viene como string puro de fecha (sin hora real), mostrar solo fecha
  if (typeof val === 'string') {
    // Extraer solo YYYY-MM-DD ignorando la parte de hora
    const soloFecha = val.slice(0, 10); // "2024-04-22"
    const [anio, mes, dia] = soloFecha.split('-');
    if (anio && mes && dia) {
      const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
      return `${dia} ${meses[parseInt(mes,10)-1]} ${anio}`;
    }
  }
  const d = val instanceof Date ? val : new Date(val);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('es-GT', {
    day:'2-digit', month:'short', year:'numeric'
  });
}

function get(obj, ...keys) {
  for (const k of keys) if (obj?.[k] !== undefined && obj?.[k] !== null) return obj[k];
  return null;
}

export default function HistorialCambios({ onBack }) {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [filtroTabla, setFiltroTabla] = useState('');
  const [filtroOp,    setFiltroOp]    = useState('');
  const [search,      setSearch]      = useState('');
  const [limite,      setLimite]      = useState(100);

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const url = filtroTabla
        ? `${API}/auditoria/tabla/${filtroTabla}`
        : `${API}/auditoria/recientes?limite=${limite}`;
      const res  = await apiFetch(url);
      const json = await res.json();
      if (json.success || json.ok) {
        setData(Array.isArray(json.data) ? json.data : []);
      } else {
        setError(json.message || 'Error al cargar historial');
      }
    } catch {
      setError('No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  }, [filtroTabla, limite]);

  useEffect(() => {
  fetchData();
}, [fetchData]);

  const filtered = useMemo(() => {
    let rows = data;
    if (filtroOp) rows = rows.filter(r => get(r,'OPERACION','operacion') === filtroOp);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        [get(r,'TABLA','tabla'), get(r,'DESCRIPCION','descripcion'),
         get(r,'USUARIO_NOMBRE','usuario_nombre')]
          .some(v => String(v||'').toLowerCase().includes(q))
      );
    }
    return rows;
  }, [data, filtroOp, search]);

  return (
    <div className={s.root}>

      {/* Header */}
      <div className={s.header}>
        <div className={s.breadcrumb}>
          <button className={s.backBtn} onClick={onBack} type="button">
            <span className="material-icons">arrow_back_ios</span> Inicio
          </button>
          <span>/</span>
          <span className={s.bcCur}>Historial de cambios</span>
        </div>

        <div className={s.titleRow}>
          <div className={s.titleBlock}>
            <div className={s.titleIcon}>
              <span className="material-icons">history</span>
            </div>
            <div>
              <p className={s.panelLabel}>AUDITORÍA DEL SISTEMA</p>
              <h1 className={s.pageTitle}>Historial de cambios</h1>
              <p className={s.pageSubtitle}>
                Registro de todas las operaciones realizadas en el sistema.
              </p>
            </div>
          </div>
          <button className={s.refreshBtn} onClick={fetchData} type="button">
            <span className={s.iconCircle}>
              <span className="material-icons">refresh</span>
            </span>
            <span>Actualizar</span>
          </button>
        </div>

        {/* Filtros */}
        <div className={s.filters}>
          <div className={s.searchWrap}>
            <span className="material-icons">search</span>
            <input
              placeholder="Buscar por tabla, descripción o usuario..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} type="button">
                <span className="material-icons">close</span>
              </button>
            )}
          </div>

          <select
            className={s.filterSelect}
            value={filtroTabla}
            onChange={e => setFiltroTabla(e.target.value)}
          >
            {TABLAS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>

          <select
            className={s.filterSelect}
            value={filtroOp}
            onChange={e => setFiltroOp(e.target.value)}
          >
            <option value="">Todas las operaciones</option>
            <option value="INSERT">Creación</option>
            <option value="UPDATE">Edición</option>
            <option value="DELETE">Eliminación</option>
          </select>

          <select
            className={s.filterSelect}
            value={limite}
            onChange={e => setLimite(Number(e.target.value))}
          >
            <option value={50}>Últimos 50</option>
            <option value={100}>Últimos 100</option>
            <option value={200}>Últimos 200</option>
          </select>
        </div>

        {/* Contador */}
        <div className={s.counter}>
          Mostrando <strong>{filtered.length}</strong> de <strong>{data.length}</strong> registros
        </div>
      </div>

      {/* Contenido */}
      <div className={s.content}>
        {loading ? (
          <div className={s.center}>
            <div className={s.spinner} />
            <p>Cargando historial...</p>
          </div>
        ) : error ? (
          <div className={s.errBox}>
            <span className="material-icons">wifi_off</span>
            <div>
              <p className={s.errTitle}>Error de conexión</p>
              <p className={s.errMsg}>{error}</p>
            </div>
            <button className={s.btnRetry} onClick={fetchData} type="button">
              <span className={s.iconCircle}>
                <span className="material-icons">refresh</span>
              </span>
              Reintentar
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className={s.empty}>
            <span className="material-icons">history_toggle_off</span>
            <p>Sin registros en el historial</p>
            <span>Las operaciones del sistema aparecerán aquí</span>
          </div>
        ) : (
          <div className={s.timeline}>
            {filtered.map((row, i) => {
              const op      = get(row,'OPERACION','operacion') || 'UPDATE';
              const opInfo  = OP_COLOR[op] || OP_COLOR.UPDATE;
              const tabla   = get(row,'TABLA','tabla') || '—';
              const desc    = get(row,'DESCRIPCION','descripcion') || '—';
              const usuario = get(row,'USUARIO_NOMBRE','usuario_nombre') || 'Sistema';
              const fecha   = formatFecha(get(row,'FECHA','fecha'));
              const idReg   = get(row,'ID_REGISTRO','id_registro');

              return (
                <div key={i} className={s.item}>
                  <div className={s.itemIcon} style={{ background: opInfo.bg }}>
                    <span className="material-icons" style={{ color: opInfo.color }}>
                      {opInfo.icon}
                    </span>
                  </div>

                  <div className={s.itemBody}>
                    <div className={s.itemTop}>
                      <span className={s.itemTabla}>{tabla}</span>
                      <span className={s.itemOp} style={{ background: opInfo.bg, color: opInfo.color }}>
                        {op === 'INSERT' ? 'Creación' : op === 'UPDATE' ? 'Edición' : 'Eliminación'}
                      </span>
                      {idReg && <span className={s.itemId}>#{idReg}</span>}
                    </div>
                    <p className={s.itemDesc}>{desc}</p>
                    <div className={s.itemMeta}>
                      <span className="material-icons">person_outline</span>
                      <span>{usuario}</span>
                      <span className={s.metaDot}>·</span>
                      <span className="material-icons">schedule</span>
                      <span>{fecha}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
