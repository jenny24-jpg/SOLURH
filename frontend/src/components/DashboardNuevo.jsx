import { useEffect, useMemo, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { NAV_SECTIONS } from '../config/modulesNuevo';
import s from './DashboardNuevo.module.css';

import { API, apiFetch } from '../context/AuthContext';

const QUICK_KEYS = [
  'empleados',
  'asistencias',
  'horas-extras',
  'clientes',
  'supervisores'
];

const SECTION_META = {
  Catálogos: {
    title: 'Catálogos',
    description: 'Administra la información base del sistema.'
  },
  Colaboradores: {
    title: 'Gestión de colaboradores',
    description: 'Administra empleados, supervisores y usuarios.'
  },
  Operativo: {
    title: 'Control operativo',
    description: 'Gestiona asistencias, horas extras y documentos del personal.'
  },
  Registros: {
    title: 'Reportes e historial',
    description: 'Consulta historial, estadísticas y registros del sistema.'
  }
};

function diasDesde(fechaStr) {
  if (!fechaStr) return null;
  const d = fechaStr instanceof Date ? fechaStr : new Date(fechaStr);
  if (isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

function get(obj, ...keys) {
  for (const k of keys) {
    if (obj?.[k] !== undefined && obj?.[k] !== null) {
      return obj[k];
    }
  }
  return null;
}

export default function DashboardNuevo({ onSelect }) {
  const { displayName, rolLabel } = useAuth();

  const [empleados, setEmpleados] = useState([]);
  const [asistencias, setAsistencias] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [supervisores, setSupervisores] = useState([]);
  const [horasExtras, setHorasExtras] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchAll = async () => {
      try {
        const [
          rEmpleados,
          rAsistencias,
          rClientes,
          rSupervisores,
          rHorasExtras,
        ] = await Promise.all([
          apiFetch(`${API}/empleado`).then(r => r.json()),
          apiFetch(`${API}/asistencia`).then(r => r.json()),
          apiFetch(`${API}/cliente`).then(r => r.json()),
          apiFetch(`${API}/supervisor`).then(r => r.json()),
          apiFetch(`${API}/horas-extra`).then(r => r.json()),
        ]);

        if (!mounted) return;

        const rows = (json) =>
          json?.ok || json?.success
            ? Array.isArray(json.data)
              ? json.data
              : []
            : [];

        setEmpleados(rows(rEmpleados));
        setAsistencias(rows(rAsistencias));
        setClientes(rows(rClientes));
        setSupervisores(rows(rSupervisores));
        setHorasExtras(rows(rHorasExtras));
      } catch (error) {
        console.error('Error al cargar la información del dashboard:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchAll();
    return () => { mounted = false; };
  }, []);

  // ── Colaboradores por Supervisor ──────────────────────────
  const empleadosPorSupervisor = useMemo(() => {
    const map = {};
    (Array.isArray(empleados) ? empleados : []).forEach((emp) => {
      const idSup = get(emp, 'supervisor_id');
      if (!idSup) return;
      map[idSup] = (map[idSup] || 0) + 1;
    });

    return Object.entries(map)
      .map(([idSup, cnt]) => {
        const supervisor = supervisores.find(
          (sup) => String(get(sup, 'id')) === String(idSup)
        );
        return {
          id: idSup,
          nombre: get(supervisor, 'nombre') || `Supervisor #${idSup}`,
          cnt,
        };
      })
      .sort((a, b) => b.cnt - a.cnt)
      .slice(0, 4);
  }, [empleados, supervisores]);

  const maxEmp = empleadosPorSupervisor.length ? empleadosPorSupervisor[0].cnt : 1;

  // ── IDs de empleados activos (para filtrar asistencias/horas extra) ──
  const empleadosActivosIds = useMemo(() => {
    return new Set(
      (Array.isArray(empleados) ? empleados : [])
        .filter((e) => get(e, 'estado') === 'ACTIVO')
        .map((e) => String(get(e, 'id')))
    );
  }, [empleados]);

  const asistenciasActivas = useMemo(() => {
    return (Array.isArray(asistencias) ? asistencias : []).filter((a) =>
      empleadosActivosIds.has(String(get(a, 'empleado_id')))
    );
  }, [asistencias, empleadosActivosIds]);

  const horasExtrasActivas = useMemo(() => {
    return (Array.isArray(horasExtras) ? horasExtras : []).filter((h) =>
      empleadosActivosIds.has(String(get(h, 'empleado_id')))
    );
  }, [horasExtras, empleadosActivosIds]);

  // ── Asistencias recientes ─────────────────────────────────
  const asistenciasRecientes = useMemo(() => {
    return [...asistenciasActivas]
      .sort((a, b) => new Date(get(b, 'fecha') || 0) - new Date(get(a, 'fecha') || 0))
      .slice(0, 3);
  }, [asistenciasActivas]);

  // ── Horas extras recientes ────────────────────────────────
  const horasExtrasRecientes = useMemo(() => {
    return [...horasExtrasActivas]
      .sort((a, b) => new Date(get(b, 'fecha') || 0) - new Date(get(a, 'fecha') || 0))
      .slice(0, 3);
  }, [horasExtrasActivas]);

  // ── Colaboradores por Cliente ──────────────────────────────
  const empleadosPorCliente = useMemo(() => {
    const map = {};
    (Array.isArray(empleados) ? empleados : []).forEach((emp) => {
      const idCliente = get(emp, 'cliente_id');
      if (!idCliente) return;
      map[idCliente] = (map[idCliente] || 0) + 1;
    });

    return Object.entries(map)
      .map(([idCliente, cnt]) => {
        const cliente = clientes.find(
          (c) => String(get(c, 'id')) === String(idCliente)
        );
        return {
          id: idCliente,
          nombre: get(cliente, 'nombre') || `Cliente #${idCliente}`,
          cnt,
        };
      })
      .sort((a, b) => b.cnt - a.cnt)
      .slice(0, 4);
  }, [empleados, clientes]);

  const maxEmpCliente = empleadosPorCliente.length ? empleadosPorCliente[0].cnt : 1;

  // ── Módulos de acceso rápido ───────────────────────────────
  const quickModules = useMemo(() => {
    return NAV_SECTIONS.flatMap((section) => section.entries).filter((entry) =>
      QUICK_KEYS.includes(entry.key)
    );
  }, []);

  // ── Secciones agrupadas ────────────────────────────────────
  const groupedSections = useMemo(() => {
    return NAV_SECTIONS.map((section) => ({
      ...section,
      entries: section.entries.filter((entry) => !QUICK_KEYS.includes(entry.key)),
    })).filter((section) => section.entries.length > 0);
  }, []);

  return (
    <>
      {/* Hero */}
      <div className={s.hero}>
        <div className={s.heroContent}>
          <p className={s.pageLabel}>SISTEMA DE GESTIÓN DE COLABORADORES</p>
          <h1 className={s.pageTitle}>Panel de Control</h1>
          <p className={s.pageSubtitle}>
            Consulta rápidamente la información de colaboradores, asistencias, horas extras,
            clientes, supervisores, documentos y demás módulos del sistema desde un solo lugar.
          </p>
        </div>

        <div className={s.userBadge}>
          <div className={s.badgeAvatar}>{displayName?.[0]?.toUpperCase() || 'U'}</div>
          <div>
            <p>{displayName}</p>
            <span>{rolLabel}</span>
          </div>
        </div>
      </div>

      {/* ── KPI Grid ── */}
      <div className={s.kpiGrid}>
        {/* CARD 1 — Total Empleados */}
        <div className={`${s.kpiCard} ${s.kpiCard1}`}>
          <div className={s.kpiTop}>
            <div className={s.kpiIcon} style={{ background: 'rgba(33,150,243,.10)' }}>
              <span className="material-icons" style={{ color: '#2196F3' }}>groups</span>
            </div>
            <div className={`${s.kpiTrend} ${s.kpiTrendUp}`}>
              <span className="material-icons">north</span>
            </div>
          </div>

          <div className={s.kpiInfo}>
            <p className={s.kpiLabel}>Total de Colaboradores</p>
            <p className={s.kpiVal} style={{ color: '#2196F3' }}>
              {loading ? <span className={s.kpiSkeleton} /> : empleados.length}
            </p>
          </div>

          {!loading && empleadosPorSupervisor.length > 0 && (
            <>
              <div className={s.kpiDivider} />
              <p className={s.kpiDetailTitle}>Colaboradores por Supervisor</p>
              {empleadosPorSupervisor.map(({ id, nombre, cnt }) => (
                <div key={id} className={s.kpiRow}>
                  <span>{nombre}</span>
                  <div className={s.kpiBar}>
                    <div
                      className={s.kpiBarFill}
                      style={{ width: `${Math.round((cnt / maxEmp) * 100)}%`, background: '#2196F3' }}
                    />
                  </div>
                  <strong>{cnt}</strong>
                </div>
              ))}
            </>
          )}

          {!loading && empleadosPorSupervisor.length === 0 && (
            <p className={s.kpiEmpty}>No hay colaboradores registrados.</p>
          )}
        </div>

        {/* CARD 2 — Asistencias recientes */}
        <div className={`${s.kpiCard} ${s.kpiCard2}`}>
          <div className={s.kpiTop}>
            <div className={s.kpiIcon} style={{ background: 'rgba(76,175,80,.10)' }}>
              <span className="material-icons" style={{ color: '#4CAF50' }}>fact_check</span>
            </div>
            <div className={`${s.kpiTrend} ${s.kpiTrendUp}`}>
              <span className="material-icons">north</span>
            </div>
          </div>

          <div className={s.kpiInfo}>
            <p className={s.kpiLabel}>Asistencias recientes</p>
            <p className={s.kpiVal} style={{ color: '#1b3d9c' }}>
              {loading ? <span className={s.kpiSkeleton} /> : asistenciasActivas.length}
            </p>
          </div>

          {!loading && asistenciasRecientes.length > 0 && (
            <>
              <div className={s.kpiDivider} />
              <p className={s.kpiDetailTitle}>Últimos registros</p>
              {asistenciasRecientes.map((asistencia, index) => {
                const nombres = get(asistencia, 'nombres') || '';
                const apellidos = get(asistencia, 'apellidos') || '';
                const nombre = `${nombres} ${apellidos}`.trim() || `Empleado #${get(asistencia,'empleado_id')}`;
                const fecha = get(asistencia, 'fecha');

                return (
                  <div key={index} className={s.plagaRow}>
                    <div className={s.plagaLeft}>
                      <span className={s.plagaArbol}>{nombre}</span>
                      <span className={s.plagaSub}>
                        {fecha ? `${diasDesde(fecha)} días` : 'Fecha no registrada'}
                      </span>
                    </div>
                    <span className={s.badgeOk}>✓ Registrada</span>
                  </div>
                );
              })}
            </>
          )}

          {!loading && asistenciasRecientes.length === 0 && (
            <p className={s.kpiEmpty}>No hay asistencias registradas.</p>
          )}
        </div>

        {/* CARD 3 — Clientes */}
        <div className={`${s.kpiCard} ${s.kpiCard3}`}>
          <div className={s.kpiTop}>
            <div className={s.kpiIcon} style={{ background: 'rgba(255,152,0,.10)' }}>
              <span className="material-icons" style={{ color: '#FF9800' }}>business</span>
            </div>
            <div className={`${s.kpiTrend} ${s.kpiTrendUp}`}>
              <span className="material-icons">north</span>
            </div>
          </div>

          <div className={s.kpiInfo}>
            <p className={s.kpiLabel}>Clientes registrados</p>
            <p className={s.kpiVal} style={{ color: '#FF9800' }}>
              {loading ? <span className={s.kpiSkeleton} /> : clientes.length}
            </p>
          </div>

          {!loading && empleadosPorCliente.length > 0 && (
            <>
              <div className={s.kpiDivider} />
              <p className={s.kpiDetailTitle}>Colaboradores por cliente</p>
              {empleadosPorCliente.map(({ id, nombre, cnt }) => (
                <div key={id} className={s.kpiRow}>
                  <span>{nombre}</span>
                  <div className={s.kpiBar}>
                    <div
                      className={s.kpiBarFill}
                      style={{ width: `${Math.round((cnt / maxEmpCliente) * 100)}%`, background: '#FF9800' }}
                    />
                  </div>
                  <span>{cnt}</span>
                </div>
              ))}
            </>
          )}

          {!loading && empleadosPorCliente.length === 0 && (
            <p className={s.kpiEmpty}>No hay clientes con colaboradores asignados.</p>
          )}
        </div>

        {/* CARD 4 — Horas Extras */}
        <div className={`${s.kpiCard} ${s.kpiCard4}`}>
          <div className={s.kpiTop}>
            <div className={s.kpiIcon} style={{ background: 'rgba(156,39,176,.10)' }}>
              <span className="material-icons" style={{ color: '#9C27B0' }}>schedule</span>
            </div>
            <div className={`${s.kpiTrend} ${s.kpiTrendUp}`}>
              <span className="material-icons">north</span>
            </div>
          </div>

          <div className={s.kpiInfo}>
            <p className={s.kpiLabel}>Horas extras</p>
            <p className={s.kpiVal} style={{ color: '#9C27B0' }}>
              {loading ? <span className={s.kpiSkeleton} /> : horasExtrasActivas.length}
            </p>
          </div>

          {!loading && horasExtrasRecientes.length > 0 && (
            <>
              <div className={s.kpiDivider} />
              <p className={s.kpiDetailTitle}>Últimos registros</p>
              {horasExtrasRecientes.map((hora, index) => {
                const nombres = get(hora, 'nombres') || '';
                const apellidos = get(hora, 'apellidos') || '';
                const nombre = `${nombres} ${apellidos}`.trim() || `Empleado #${get(hora,'empleado_id')}`;
                const horas = get(hora, 'horas') ?? '--';

                return (
                  <div key={index} className={s.plagaRow}>
                    <div className={s.plagaLeft}>
                      <span className={s.plagaArbol}>{nombre}</span>
                      <span className={s.plagaSub}>Horas extras registradas</span>
                    </div>
                    <span className={s.badgeOk}>{horas} h</span>
                  </div>
                );
              })}
            </>
          )}

          {!loading && horasExtrasRecientes.length === 0 && (
            <p className={s.kpiEmpty}>No hay horas extras registradas.</p>
          )}
        </div>
      </div>

      {/* Acciones rápidas */}
      <section className={s.sectionBlock}>
        <div className={s.sectionHeader}>
          <div>
            <p className={s.sectionEyebrow}>ATAJOS</p>
            <h2 className={s.sectionTitle}>Acciones rápidas</h2>
          </div>
          <p className={s.sectionDescription}>
            Accesos directos a los módulos más utilizados del sistema.
          </p>
        </div>

        <div className={s.quickGrid}>
          {quickModules.map((m) => (
            <ModCard key={m.key} label={m.label} icon={m.icon} compact={false} onClick={() => onSelect(m.key)} />
          ))}
        </div>
      </section>

      {/* Secciones agrupadas */}
      <div className={s.sectionsGrid}>
        {groupedSections.map((section) => {
          const meta = SECTION_META[section.title] || { title: section.title, description: '' };
          return (
            <section key={section.title} className={s.groupCard}>
              <div className={s.groupHeader}>
                <div>
                  <p className={s.groupEyebrow}>MÓDULOS</p>
                  <h3 className={s.groupTitle}>{meta.title}</h3>
                </div>
                {meta.description && <p className={s.groupDescription}>{meta.description}</p>}
              </div>

              <div className={s.moduleGrid}>
                {section.entries.map((m) => (
                  <ModCard key={m.key} label={m.label} icon={m.icon} compact onClick={() => onSelect(m.key)} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Resumen general */}
      <section className={s.sectionBlock}>
        <div className={s.sectionHeader}>
          <div>
            <p className={s.sectionEyebrow}>RESUMEN GENERAL</p>
            <h2 className={s.sectionTitle}>Estado del sistema</h2>
          </div>
          <p className={s.sectionDescription}>
            Información general de colaboradores, clientes y operaciones registradas.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5,1fr)',
            gap: 8,
          }}
        >
          {[
            { label: 'Empleados', val: loading ? '…' : empleados.length, color: '#2563EB', bg: '#DBEAFE', icon: 'groups' },
            { label: 'Clientes', val: loading ? '…' : clientes.length, color: '#EA580C', bg: '#FFEDD5', icon: 'business' },
            { label: 'Supervisores', val: loading ? '…' : supervisores.length, color: '#7C3AED', bg: '#EDE9FE', icon: 'supervisor_account' },
            { label: 'Asistencias', val: loading ? '…' : asistenciasActivas.length, color: '#16A34A', bg: '#DCFCE7', icon: 'fact_check' },
            { label: 'Horas Extras', val: loading ? '…' : horasExtrasActivas.length, color: '#DC2626', bg: '#FEE2E2', icon: 'schedule' },
          ].map(({ label, val, color, bg, icon }) => (
            <div key={label} style={{ background: bg, borderRadius: 10, padding: '12px', textAlign: 'center' }}>
              <span className="material-icons" style={{ color, fontSize: 26, marginBottom: 4 }}>{icon}</span>
              <div style={{ fontSize: 18, fontWeight: 700, color }}>{val}</div>
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16, padding: 12, borderRadius: 10, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
          <p style={{ margin: 0, fontWeight: 600, color: '#374151' }}>Panel de Gestión de Colaboradores</p>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: '#6B7280' }}>
            Desde este panel puedes consultar rápidamente el estado de los colaboradores, clientes,
            supervisores, asistencias y horas extras registradas en el sistema.
          </p>
        </div>
      </section>
    </>
  );
}

function ModCard({ label, icon, onClick, compact = false }) {
  return (
    <button type="button" className={`${s.modCard} ${compact ? s.modCardCompact : ''}`} onClick={onClick}>
      {icon}
      <div>
        <h4>{label}</h4>
        {!compact && <span>Abrir módulo</span>}
      </div>
      <span className={`material-icons ${s.modArrow}`}>arrow_forward</span>
    </button>
  );
}