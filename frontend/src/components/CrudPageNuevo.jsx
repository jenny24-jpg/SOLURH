import { useEffect, useState, useCallback, useMemo } from 'react';
import { MODULES, MODULE_PK, colLabel, HIDDEN_COLS } from '../config/modulesNuevo';
import CrudFormNuevo from './CrudFormNuevo';
import s from './CrudPageNuevo.module.css';
import ExportarBtn from './ExportarBtn';
import { Joyride } from 'react-joyride';
import { API, apiFetch } from '../context/AuthContext';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

// ── Skeleton de carga (filas fantasma animadas) ──────────────
// Usa las clases definidas en src/mejoras.css
function SkeletonTable({ columns = 5, rows = 6 }) {
  const cells = Math.min(Math.max(columns, 3), 6); // entre 3 y 6 columnas visibles
  return (
    <div className="skeletonWrap" aria-busy="true" aria-label="Cargando datos">
      <div className="skeletonRow skeletonHeader">
        {Array.from({ length: cells }).map((_, i) => (
          <div key={`h${i}`} className="skeletonCell" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="skeletonRow">
          {Array.from({ length: cells }).map((_, c) => (
            <div key={c} className="skeletonCell" />
          ))}
        </div>
      ))}
    </div>
  );
}

const formatDateOnly = (value) => {
  if (!value) return '—';

  if (typeof value === 'string') {
    if (value.includes('T')) {
      const [datePart] = value.split('T');
      const [year, month, day] = datePart.split('-');
      return `${day}/${month}/${year}`;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-');
      return `${day}/${month}/${year}`;
    }
  }

  return value;
};

const isDateColumn = (col) => {
  const k = col.toLowerCase();
  return (
    k.includes('fecha') ||
    k.includes('deteccion') ||
    k.includes('resolucion')
  );
};


// Lee respuestas JSON sin romper la aplicación cuando el servidor devuelve HTML o una respuesta vacía.
async function readResponseBody(res) {
  const text = await res.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function getRowValue(row, field) {
  if (!row || !field) return undefined;

  const exactKey = Object.keys(row).find(
    key => key.toLowerCase() === String(field).toLowerCase()
  );

  return exactKey ? row[exactKey] : undefined;
}

export default function CrudPageNuevo({ moduleKey, onBack }) {
  const cfg = MODULES[moduleKey];
  const { title, endpoint, icon = 'dataset' } = cfg;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filtroSupervisor, setFiltroSupervisor] = useState('');
const [filtroArea, setFiltroArea] = useState('');
  const [modal, setModal] = useState(null);
  const [confirmRow, setConfirmRow] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageTourRun, setPageTourRun] = useState(false);

  const TOUR_MODULES = [
    'supervisores',
    'clientes',
    'empleados',
    'asistencias',
    'horas-extras',
    'documentos-empleado',
    'fotos-asistencia',
    'historial-empleado',
  ];
  const runTour = TOUR_MODULES.includes(moduleKey);

  useEffect(() => {
    if (runTour && modal === null) {
      setPageTourRun(false);
      setTimeout(() => setPageTourRun(true), 800);
    }
  }, [moduleKey, runTour, modal]);

  const tourSteps = [
    {
      target: '.tour-buscar',
      content: `Aquí puedes buscar registros de ${title.toLowerCase()}.`,
    },
    {
      target: '.tour-agregar',
      content: `Haz clic aquí para agregar un nuevo registro de ${title.toLowerCase()}.`,
    },
    {
      target: '.tour-tabla',
      content: `Aquí aparecerán los registros de ${title.toLowerCase()}.`,
    },
  ];

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const res = await apiFetch(`${API}${endpoint}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) throw new Error(`Error ${res.status}`);

      const json = await res.json();

      if (json.ok === true || json.success === true) {
        setData(Array.isArray(json.data) ? json.data : []);
        setPage(1);
      } else {
        setError(json.mensaje ?? json.message ?? 'Error al cargar los datos');
      }
    } catch {
      setError('No se pudo conectar con el servidor. Verifica que el backend esté activo.');
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
  setPage(1);
}, [search, filtroSupervisor, filtroArea]);

  const cols = data.length > 0
    ? Object.keys(data[0]).filter(
        k => !HIDDEN_COLS.has(k) && !HIDDEN_COLS.has(k.toLowerCase())
      )
    : [];

  // Obtiene correctamente la llave primaria aunque el backend devuelva ID_CLIENTE,
  // id_cliente, ID_EMPLEADO, etc.
  const pkVal = row => {
    if (!row || typeof row !== 'object') return null;

    const pkField = MODULE_PK[moduleKey];
    const candidates = [
      pkField,
      'id',
      `id_${moduleKey.replace(/-/g, '_')}`,
    ].filter(Boolean);

    for (const field of candidates) {
      const value = getRowValue(row, field);
      if (value !== undefined && value !== null && value !== '') return value;
    }

    // Prioridad para llaves comunes de la API.
    const preferred = [
      'id_cliente',
      'id_empleado',
      'id_supervisor',
      'id_encargado_area',
      'id_asistencia',
      'id_hora_extra',
      'id_documento',
      'id_foto',
      'id_historial',
      'id_usuario',
    ];

    for (const field of preferred) {
      const value = getRowValue(row, field);
      if (value !== undefined && value !== null && value !== '') return value;
    }

    const dynamicKey = Object.keys(row).find(key => {
      const normalized = key.toLowerCase();
      return normalized.startsWith('id_') || normalized.endsWith('_id');
    });

    if (dynamicKey) return row[dynamicKey];

    return null;
  };
  // ── Filtros disponibles para Asistencias ─────────────

const supervisoresDisponibles = useMemo(() => {
  return [...new Set(
    data
      .map(r => r.supervisor)
      .filter(Boolean)
  )].sort();
}, [data]);


const areasDisponibles = useMemo(() => {
  return [...new Set(
    data
      .filter(r =>
        !filtroSupervisor ||
        String(r.supervisor) === String(filtroSupervisor)
      )
      .map(r => r.area)
      .filter(Boolean)
  )].sort();
}, [data, filtroSupervisor]);

  const filtered = useMemo(() => {
  let resultados = [...data];

  // 🔎 Búsqueda general
  if (search.trim()) {
    const texto = search.toLowerCase();

    resultados = resultados.filter(r =>
      Object.values(r).some(v =>
        String(v ?? '').toLowerCase().includes(texto)
      )
    );
  }

  // 👤 Filtrar por supervisor
  if (moduleKey === 'asistencias' && filtroSupervisor) {
    resultados = resultados.filter(r =>
      String(r.supervisor ?? '') === String(filtroSupervisor)
    );
  }

  // 🏢 Filtrar por área
  if (moduleKey === 'asistencias' && filtroArea) {
    resultados = resultados.filter(r =>
      String(r.area ?? '') === String(filtroArea)
    );
  }

  return resultados;

}, [data, search, moduleKey, filtroSupervisor, filtroArea]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const pageStart = filtered.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const pageEnd = Math.min(page * pageSize, filtered.length);

  const goPage = (p) => setPage(Math.max(1, Math.min(p, totalPages)));

  const pageRange = useMemo(() => {
    const range = [];
    const delta = 1;

    for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) {
      range.push(i);
    }

    return range;
  }, [page, totalPages]);

  const handleDelete = async row => {
    const id = pkVal(row);

    if (id === null || id === undefined || id === '') {
      alert('No se puede identificar el ID del registro que deseas eliminar.');
      return;
    }

    const baseEndpoint = String(endpoint || '').replace(/\/$/, '');
    const deleteUrl = `${API}${baseEndpoint}/${encodeURIComponent(String(id))}`;

    try {
      const res = await apiFetch(deleteUrl, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      });

      const json = await readResponseBody(res);

      // Algunos controladores responden 200 con ok/success y otros pueden responder 204.
      const deleted =
        res.ok &&
        (res.status === 204 || json.ok === true || json.success === true || !Object.keys(json).length);

      if (deleted) {
        setConfirmRow(null);
        setData(prev => prev.filter(item => String(pkVal(item)) !== String(id)));

        window.dispatchEvent(new Event('plagas-actualizadas'));
        window.dispatchEvent(new Event('arbol_actualizado'));
        return;
      }

      if (res.status === 404) {
        alert(
          `No se encontró la ruta para eliminar este registro.\n\n` +
          `URL solicitada: ${deleteUrl}\n\n` +
          `El frontend está funcionando, pero el backend publicado no tiene disponible esa ruta DELETE o está desactualizado.`
        );
        return;
      }

      alert(
        json.mensaje ||
        json.message ||
        json.error ||
        `No se pudo eliminar el registro (status ${res.status}).`
      );
    } catch (error) {
      console.error('Error eliminando registro:', error);
      alert('Error de conexión al eliminar el registro.');
    }
  };

  const renderCell = (col, val) => {
    const formattedValue = isDateColumn(col) ? formatDateOnly(val) : (val ?? '—');
    const v = String(formattedValue ?? '—');
    const k = col.toLowerCase();

    const isBadge = k.includes('riesgo') || k === 'tipo_plaga' || k === 'es_productivo' || k === 'estado_empleado';

    if (!isBadge) {
      return (
        <span title={v.length > 42 ? v : ''} className={s.cellText}>
          {v.length > 42 ? `${v.slice(0, 42)}…` : v}
        </span>
      );
    }

    let cls = s.badgeN;

    if (['ALTO', 'PLAGA', 'S', 'INACTIVO'].includes(v)) cls = s.badgeD;
    if (['BAJO', 'N', 'ACTIVO'].includes(v)) cls = s.badgeS;
    if (v === 'MEDIO') cls = s.badgeW;

    return <span className={cls}>{v}</span>;
  };

  return (
    <div className={s.root}>
      {runTour && (
        <Joyride
          key={`${moduleKey}-${pageTourRun}`}
          steps={tourSteps}
          run={pageTourRun && modal === null}
          continuous
          showSkipButton
          showProgress
          disableScrolling
          callback={(data) => {
            if (data.status === 'finished' || data.status === 'skipped') {
              setPageTourRun(false);
            }
          }}
          locale={{
            back: 'Atrás',
            close: 'Cerrar',
            last: 'Finalizar',
            next: 'Siguiente',
            skip: 'Saltar',
          }}
          styles={{
            options: {
              zIndex: 10000,
              primaryColor: '#14532d',
            },
          }}
        />
      )}

      <div className={s.pageShell}>
        <header className={s.headerCard}>
          <div className={s.breadcrumb}>
            <button className={s.backBtn} onClick={onBack} type="button">
              <span className="material-icons">arrow_back_ios</span>
              Inicio
            </button>
            <span className={s.bcSep}>/</span>
            <span className={s.bcCur}>{title}</span>
          </div>

          <div className={s.titleRow}>
            <div className={s.titleBlock}>
              <div className={s.titleIcon}>
                <span className="material-icons">{icon}</span>
              </div>
              <div>
                <p className={s.panelLabel}>PANEL ADMINISTRATIVO</p>
                <h1 className={s.pageTitle}>{title}</h1>
                <p className={s.pageSubtitle}>
                  Consulta, filtra y administra los registros del módulo seleccionado.
                </p>
              </div>
            </div>

            <button
              className={s.refreshBtn}
              onClick={() => {
                setPageTourRun(false);
                setTimeout(() => setPageTourRun(true), 100);
              }}
              type="button"
            >
              <span className="material-icons">help_outline</span>
              <span className={s.btnLabel}>Mini tutorial</span>
            </button>

            <div className={s.titleActions}>
              <button className={s.refreshBtn} onClick={fetchData} title="Actualizar" type="button">
                <span className={s.iconCircle}>
                  <span className="material-icons">refresh</span>
                </span>
                <span className={s.btnLabel}>Actualizar</span>
              </button>

              <ExportarBtn data={filtered} cols={cols} title={title} />

              <button className={`${s.btnAdd} tour-agregar`} onClick={() => setModal('new')} type="button">
                <span className={s.iconCircle}>
                  <span className="material-icons">add</span>
                </span>
                <span className={s.btnLabel}>Agregar registro</span>
              </button>
            </div>
          </div>

          <div className={s.toolbar}>
            <div className={`${s.searchWrap} tour-buscar`}>
              <span className="material-icons">search</span>
              <input
                placeholder={`Buscar en ${title.toLowerCase()}...`}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch('')} type="button">
                  <span className="material-icons">close</span>
                </button>
              )}
            </div>

            {moduleKey === 'asistencias' && (
  <div className={s.filtersWrap}>

    {/* 👤 FILTRO SUPERVISOR */}
    <select
      className={s.filterSelect}
      value={filtroSupervisor}
      onChange={(e) => {
        setFiltroSupervisor(e.target.value);
        setFiltroArea('');
      }}
    >
      <option value="">Todos los supervisores</option>

      {supervisoresDisponibles.map((supervisor) => (
        <option key={supervisor} value={supervisor}>
          {supervisor}
        </option>
      ))}
    </select>


    {/* 🏢 FILTRO ÁREA */}
    <select
      className={s.filterSelect}
      value={filtroArea}
      onChange={(e) => setFiltroArea(e.target.value)}
    >
      <option value="">Todas las áreas</option>

      {areasDisponibles.map((area) => (
        <option key={area} value={area}>
          {area}
        </option>
      ))}
    </select>

  </div>
)}

            <div className={s.statsWrap}>
              <div className={s.counterCard}>
                <span className={s.counterLabel}>Visibles</span>
                <strong className={s.counterValue}>{filtered.length}</strong>
              </div>
              <div className={s.counterCard}>
                <span className={s.counterLabel}>Total</span>
                <strong className={s.counterValue}>{data.length}</strong>
              </div>
            </div>
          </div>
        </header>

        <section className={s.contentCard}>
          {loading ? (
            <SkeletonTable columns={(cols?.length || 4) + 1} rows={6} />
          ) : error ? (
            <div className={s.errBox}>
              <div className={s.errIcon}>
                <span className="material-icons">wifi_off</span>
              </div>
              <div className={s.errContent}>
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
            <div className={s.emptyState}>
              <div className={s.emptyIcon}>
                <span className="material-icons">inbox</span>
              </div>
              <p className={s.emptyTitle}>
                {search ? `Sin resultados para "${search}"` : 'Sin registros disponibles'}
              </p>
              <p className={s.emptyText}>
                {search
                  ? 'Prueba con otro término o limpia el filtro.'
                  : 'Aún no hay datos. Puedes crear el primer registro.'}
              </p>
              {!search && (
                <button className={s.emptyBtn} onClick={() => setModal('new')} type="button">
                  <span className={s.iconCircle}>
                    <span className="material-icons">add</span>
                  </span>
                  Crear primer registro
                </button>
              )}
            </div>
          ) : (
            <>
              <div className={`${s.tableWrap} tour-tabla`}>
                <table className={s.table}>
                  <thead>
                    <tr>
                      {cols.map(c => <th key={c}>{colLabel(c)}</th>)}
                      <th className={s.actionsCol}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? s.rowE : s.rowO}>
                        {cols.map(c => <td key={c}>{renderCell(c, row[c])}</td>)}
                        <td>
                          <div className={s.actions}>
                            <ABtn icon="edit" tip="Editar" variant="edit" onClick={() => setModal(row)} />
                            <ABtn icon="delete_outline" tip="Eliminar" variant="delete" onClick={() => setConfirmRow(row)} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={s.pagination}>
                <div className={s.pageInfo}>
                  Mostrando <strong>{pageStart}–{pageEnd}</strong> de <strong>{filtered.length}</strong> registros
                </div>

                <div className={s.pageControls}>
                  <div className={s.pageSizeWrap}>
                    <span className={s.pageSizeLabel}>Por página:</span>
                    <select
                      value={pageSize}
                      onChange={e => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                      className={s.pageSizeSelect}
                    >
                      {PAGE_SIZE_OPTIONS.map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>

                  <div className={s.pageBtns}>
                    <button className={s.pageBtn} onClick={() => goPage(1)} disabled={page === 1} title="Primera página" type="button">
                      <span className="material-icons">first_page</span>
                    </button>

                    <button className={s.pageBtn} onClick={() => goPage(page - 1)} disabled={page === 1} title="Página anterior" type="button">
                      <span className="material-icons">chevron_left</span>
                    </button>

                    {pageRange[0] > 1 && (
                      <>
                        <button className={s.pageBtn} onClick={() => goPage(1)} type="button">1</button>
                        {pageRange[0] > 2 && <span className={s.pageDots}>…</span>}
                      </>
                    )}

                    {pageRange.map(p => (
                      <button
                        key={p}
                        className={`${s.pageBtn} ${p === page ? s.pageBtnActive : ''}`}
                        onClick={() => goPage(p)}
                        type="button"
                      >
                        {p}
                      </button>
                    ))}

                    {pageRange[pageRange.length - 1] < totalPages && (
                      <>
                        {pageRange[pageRange.length - 1] < totalPages - 1 && <span className={s.pageDots}>…</span>}
                        <button className={s.pageBtn} onClick={() => goPage(totalPages)} type="button">
                          {totalPages}
                        </button>
                      </>
                    )}

                    <button className={s.pageBtn} onClick={() => goPage(page + 1)} disabled={page === totalPages} title="Página siguiente" type="button">
                      <span className="material-icons">chevron_right</span>
                    </button>

                    <button className={s.pageBtn} onClick={() => goPage(totalPages)} disabled={page === totalPages} title="Última página" type="button">
                      <span className="material-icons">last_page</span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {modal !== null && (
        <CrudFormNuevo
          config={cfg}
          editItem={modal === 'new' ? null : modal}
          editId={modal === 'new' ? null : pkVal(modal)}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            fetchData();
          }}
        />
      )}

      {confirmRow !== null && (
        <div className={s.overlay} onClick={() => setConfirmRow(null)}>
          <div className={s.confirmModal} onClick={e => e.stopPropagation()}>
            <div className={s.confirmIcon}>
              <span className="material-icons">delete_forever</span>
            </div>
            <h3 className={s.confirmTitle}>¿Eliminar registro?</h3>
            <p className={s.confirmMsg}>Esta acción no se puede deshacer.</p>
            <div className={s.confirmBtns}>
              <button className={s.confirmCancel} onClick={() => setConfirmRow(null)} type="button">
                <span className={s.iconCircle}>
                  <span className="material-icons">close</span>
                </span>
                Cancelar
              </button>
              <button className={s.confirmDelete} onClick={() => handleDelete(confirmRow)} type="button">
                <span className={s.iconCircle}>
                  <span className="material-icons">delete</span>
                </span>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ABtn({ icon, tip, onClick, variant = 'edit' }) {
  return (
    <button
      title={tip}
      onClick={onClick}
      type="button"
      className={`${s.actionBtn} ${variant === 'delete' ? s.actionDelete : s.actionEdit}`}
    >
      <span className="material-icons">{icon}</span>
    </button>
  );
}