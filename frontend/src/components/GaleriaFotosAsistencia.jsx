import { useEffect, useState, useMemo, useCallback } from 'react';
import s from './GaleriaFotosAsistencia.module.css';

import { API, apiFetch } from '../context/AuthContext';

function get(obj, ...keys) {
  for (const k of keys) if (obj?.[k] !== undefined && obj?.[k] !== null) return obj[k];
  return null;
}

function formatFecha(val) {
  if (!val) return '—';
  if (typeof val === 'string') {
    const soloFecha = val.slice(0, 10);
    const [anio, mes, dia] = soloFecha.split('-');
    if (anio && mes && dia) {
      const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
      return `${dia} ${meses[parseInt(mes,10)-1]} ${anio}`;
    }
  }
  const d = val instanceof Date ? val : new Date(val);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('es-GT', { day:'2-digit', month:'short', year:'numeric' });
}

function nombreArchivo(item) {
  const cliente = (get(item,'cliente') || 'cliente').replace(/[^\w-]+/g, '_');
  const fecha = (get(item,'fecha') || '').toString().slice(0,10) || 'fecha';
  const intento = get(item,'intento') ?? '1';
  return `asistencia_${cliente}_${fecha}_intento${intento}.jpg`;
}

// Intenta forzar la descarga real del archivo; si el origen (Supabase)
// no lo permite por CORS, cae a abrir la imagen en una pestaña nueva.
async function descargarImagen(item) {
  try {
    const res = await fetch(item.url_foto, { mode: 'cors' });
    if (!res.ok) throw new Error('no-ok');
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = nombreArchivo(item);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
  } catch {
    window.open(item.url_foto, '_blank', 'noopener,noreferrer');
  }
}

export default function GaleriaFotosAsistencia({ onBack }) {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [search,        setSearch]        = useState('');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroFecha,   setFiltroFecha]   = useState('');
  const [preview, setPreview] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res  = await apiFetch(`${API}/foto-asistencia/storage/todas`);
      const json = await res.json();
      if (json.ok || json.success) {
        setData(Array.isArray(json.data) ? json.data : []);
      } else {
        setError(json.mensaje || 'Error al cargar las fotos');
      }
    } catch {
      setError('No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const clientes = useMemo(() => {
    const set = new Set(data.map(d => get(d,'cliente')).filter(Boolean));
    return Array.from(set).sort();
  }, [data]);

  const filtered = useMemo(() => {
    let rows = data;
    if (filtroCliente) rows = rows.filter(r => get(r,'cliente') === filtroCliente);
    if (filtroFecha)   rows = rows.filter(r => (get(r,'fecha') || '').toString().slice(0,10) === filtroFecha);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        [get(r,'supervisor'), get(r,'cliente'), get(r,'observacion')]
          .some(v => String(v || '').toLowerCase().includes(q))
      );
    }
    return rows;
  }, [data, filtroCliente, filtroFecha, search]);

  return (
    <div className={s.root}>

      {/* Header */}
      <div className={s.header}>
        <div className={s.breadcrumb}>
          <button className={s.backBtn} onClick={onBack} type="button">
            <span className="material-icons">arrow_back_ios</span> Inicio
          </button>
          <span>/</span>
          <span className={s.bcCur}>Todas las asistencias</span>
        </div>

        <div className={s.titleRow}>
          <div className={s.titleBlock}>
            <div className={s.titleIcon}>
              <span className="material-icons">collections</span>
            </div>
            <div>
              <p className={s.panelLabel}>PANEL ADMINISTRATIVO</p>
              <h1 className={s.pageTitle}>Todas las asistencias</h1>
              <p className={s.pageSubtitle}>
                Todas las fotos de asistencia subidas por los supervisores. Doble clic en una foto para verla o descargarla.
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
              placeholder="Buscar por supervisor, cliente u observación..."
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
            value={filtroCliente}
            onChange={e => setFiltroCliente(e.target.value)}
          >
            <option value="">Todos los clientes</option>
            {clientes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <input
            type="date"
            className={s.filterSelect}
            value={filtroFecha}
            onChange={e => setFiltroFecha(e.target.value)}
          />
          {filtroFecha && (
            <button className={s.clearDateBtn} onClick={() => setFiltroFecha('')} type="button">
              <span className="material-icons">close</span> Fecha
            </button>
          )}
        </div>

        {/* Contador */}
        <div className={s.counter}>
          Mostrando <strong>{filtered.length}</strong> de <strong>{data.length}</strong> fotos
        </div>
      </div>

      {/* Contenido */}
      <div className={s.content}>
        {loading ? (
          <div className={s.center}>
            <div className={s.spinner} />
            <p>Cargando fotos...</p>
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
            <span className="material-icons">photo_library</span>
            <p>Sin fotos que coincidan</p>
            <span>Las fotos de asistencia subidas aparecerán aquí</span>
          </div>
        ) : (
          <div className={s.grid}>
            {filtered.map((item, i) => {
              const cliente    = get(item,'cliente') || '—';
              const supervisor = get(item,'supervisor') || '—';
              const fecha      = formatFecha(get(item,'fecha'));
              const intento    = get(item,'intento');
              const observ     = get(item,'observacion');
              const sinRegistro = item.registrado === false;

              return (
                <div
                  key={item.id ?? i}
                  className={s.card}
                  onDoubleClick={() => window.open(item.url_foto, '_blank', 'noopener,noreferrer')}
                  title="Doble clic para ver en una pestaña nueva"
                >
                  <div className={s.thumbWrap}>
                    <img
                      src={item.url_foto}
                      alt={`Asistencia ${cliente} ${fecha}`}
                      className={s.thumb}
                      loading="lazy"
                      onClick={() => setPreview(item)}
                    />
                    {intento != null && <span className={s.badge}>Intento {intento}</span>}
                    {sinRegistro && <span className={s.badgeWarn}>Sin registro</span>}
                    <div className={s.overlay}>
                                           <button
                        className={s.overlayBtn}
                        type="button"
                        title="Expandir"
                        onClick={(e) => { e.stopPropagation(); setPreview(item); }}
                      >
                        <span className="material-icons">zoom_in</span>
                      </button>
                      <button
                        className={s.overlayBtn}
                        type="button"
                        title="Descargar"
                        onClick={(e) => { e.stopPropagation(); descargarImagen(item); }}
                      >
                        <span className="material-icons">download</span>
                      </button>
                    </div>
                  </div>

                  <div className={s.cardBody}>
                    {sinRegistro ? (
                      <>
                        <p className={s.cardCliente}>Sin registro en el sistema</p>
                        <div className={s.cardMeta}>
                          <span className="material-icons">event</span>
                          <span>Subida: {formatFecha(get(item,'fecha_subida'))}</span>
                        </div>
                        <p className={s.cardObs} title={item.nombre_archivo}>{item.nombre_archivo}</p>
                      </>
                    ) : (
                      <>
                        <p className={s.cardCliente}>{cliente}</p>
                        <p className={s.cardSupervisor}>
                          <span className="material-icons">person_outline</span>
                          {supervisor}
                        </p>
                        <div className={s.cardMeta}>
                          <span className="material-icons">event</span>
                          <span>{fecha}</span>
                        </div>
                        {observ && <p className={s.cardObs}>{observ}</p>}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox simple */}
      {preview && (
        <div className={s.lightbox} onClick={() => setPreview(null)}>
          <div className={s.lightboxTop}>
            <span>
              {preview.registrado === false
                ? `Sin registro · ${preview.nombre_archivo}`
                : `${get(preview,'cliente')} · ${get(preview,'supervisor')} · ${formatFecha(get(preview,'fecha'))}`}
            </span>
            <div className={s.lightboxActions}>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); window.open(preview.url_foto, '_blank', 'noopener,noreferrer'); }}
              >
                <span className="material-icons">open_in_new</span> Ver
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); descargarImagen(preview); }}
              >
                <span className="material-icons">download</span> Descargar
              </button>
              <button type="button" onClick={() => setPreview(null)}>
                <span className="material-icons">close</span>
              </button>
            </div>
          </div>
          <img
            src={preview.url_foto}
            alt="Vista previa"
            className={s.lightboxImg}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={() => window.open(preview.url_foto, '_blank', 'noopener,noreferrer')}
          />
        </div>
      )}
    </div>
  );
}