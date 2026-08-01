import { useEffect, useState, useRef } from 'react';
import s from './NotificacionesPanel.module.css';
import { API, apiFetch } from '../context/AuthContext';

const DIAS_RECIENTE_BAJA = 7;

function get(obj, ...keys) {
  for (const k of keys) {
    if (obj?.[k] !== undefined && obj?.[k] !== null) return obj[k];
  }
  return null;
}

function diasDesde(val) {
  if (!val) return null;
  const d = val instanceof Date ? val : new Date(val);
  if (isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
}

function fmtFecha(val) {
  if (!val) return '—';
  const soloFecha = String(val).slice(0, 10);
  const [anio, mes, dia] = soloFecha.split('-');
  if (anio && mes && dia) {
    const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    return `${dia} ${meses[parseInt(mes,10)-1]} ${anio}`;
  }
  return String(val);
}

function normalizarRows(json) {
  if (!json) return [];
  if (Array.isArray(json)) return json;
  if (json.ok || json.success) return Array.isArray(json.data) ? json.data : [];
  return [];
}

export default function NotificacionesPanel({ onSelect }) {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(false);

  const [leidas, setLeidas] = useState(() => {
    try {
      return new Set(JSON.parse(sessionStorage.getItem('notifs_leidas') || '[]'));
    } catch {
      return new Set();
    }
  });

  const ref = useRef(null);

  useEffect(() => {
    const handler = e => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);

      try {
        const [rHoras, rBajas] = await Promise.all([
          apiFetch(`${API}/horas-extra`).then(r => r.json()),
          apiFetch(`${API}/historial-empleado`).then(r => r.json()),
        ]);

        if (!mounted) return;

        const horas = normalizarRows(rHoras);
        const bajas = normalizarRows(rBajas);

        const lista = [];

        // ── Horas extra pendientes de aprobar ──
        horas.forEach(h => {
          const aprobado = get(h, 'aprobado');
          if (aprobado === true) return; // ya aprobada, no notificar

          const idRegistro = get(h, 'id');
          const nombres = get(h, 'nombres') || '';
          const apellidos = get(h, 'apellidos') || '';
          const nombreEmpleado = `${nombres} ${apellidos}`.trim() || `Empleado #${get(h,'empleado_id')}`;
          const cantidadHoras = get(h, 'horas');
          const fecha = get(h, 'fecha');

          lista.push({
            id: `hora-extra-${idRegistro}`,
            tipo: 'alerta',
            icon: 'schedule',
            titulo: nombreEmpleado,
            mensaje: `${cantidadHoras}h registradas el ${fmtFecha(fecha)}`,
            detalle: 'Pendiente de aprobación',
            tratado: false,
            sector: get(h, 'motivo') || '',
            destino: 'horas-extras',
          });
        });

        // ── Bajas recientes (últimos 7 días) ──
        bajas.forEach(b => {
          const fechaBaja = get(b, 'fecha_baja');
          const dias = diasDesde(fechaBaja);
          if (dias === null || dias > DIAS_RECIENTE_BAJA) return;

          const idEmpleado = get(b, 'empleado_id') || get(b, 'id');
          const nombres = get(b, 'nombres') || '';
          const apellidos = get(b, 'apellidos') || '';
          const nombreEmpleado = `${nombres} ${apellidos}`.trim() || `Empleado #${idEmpleado}`;
          const motivo = get(b, 'motivo_baja') || 'Sin motivo especificado';

          lista.push({
            id: `baja-${idEmpleado}-${fechaBaja}`,
            tipo: 'critico',
            icon: 'person_off',
            titulo: nombreEmpleado,
            mensaje: `Baja registrada el ${fmtFecha(fechaBaja)}`,
            detalle: motivo,
            tratado: true,
            sector: dias === 0 ? 'Hoy' : `Hace ${dias} día(s)`,
            destino: 'historial-empleado',
          });
        });

        lista.sort((a, b) => {
          const peso = { critico: 3, alerta: 2, seguimiento: 1 };
          return peso[b.tipo] - peso[a.tipo];
        });

        setNotifs(lista);
      } catch (err) {
        console.error('Error cargando notificaciones:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    const timer = setInterval(load, 60000);

    const actualizarNotificaciones = () => {
      load();
    };

    window.addEventListener('horas-extra-actualizadas', actualizarNotificaciones);
    window.addEventListener('bajas-actualizadas', actualizarNotificaciones);

    return () => {
      mounted = false;
      clearInterval(timer);
      window.removeEventListener('horas-extra-actualizadas', actualizarNotificaciones);
      window.removeEventListener('bajas-actualizadas', actualizarNotificaciones);
    };
  }, []);

  const noLeidas = notifs.filter(n => !leidas.has(n.id)).length;

  const marcarLeida = id => {
    setLeidas(prev => {
      const next = new Set(prev);
      next.add(id);

      try {
        sessionStorage.setItem('notifs_leidas', JSON.stringify([...next]));
      } catch {}

      return next;
    });
  };

  const marcarTodas = () => {
    const ids = notifs.map(n => n.id);

    setLeidas(prev => {
      const next = new Set([...prev, ...ids]);

      try {
        sessionStorage.setItem('notifs_leidas', JSON.stringify([...next]));
      } catch {}

      return next;
    });
  };

  const irSeguimiento = (n) => {
    marcarLeida(n.id);
    setOpen(false);

    if (typeof onSelect === 'function') {
      onSelect(n.destino);
    }
  };

  return (
    <div className={s.wrap} ref={ref}>
      <button
        className={`${s.bell} ${open ? s.bellOpen : ''}`}
        onClick={() => setOpen(o => !o)}
        type="button"
        title="Notificaciones"
      >
        <span className="material-icons">notifications</span>

        {noLeidas > 0 && (
          <span className={s.badge}>
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {open && (
        <div className={s.panel}>
          <div className={s.panelHeader}>
            <div>
              <h3 className={s.panelTitle}>Notificaciones de RRHH</h3>
              <p className={s.panelSub}>
                {notifs.length === 0
                  ? 'Todo en orden'
                  : `${notifs.length} pendiente(s)`}
              </p>
            </div>

            {noLeidas > 0 && (
              <button className={s.markAll} onClick={marcarTodas} type="button">
                <span className={s.iconCircle}>
                  <span className="material-icons">done_all</span>
                </span>
                Marcar todas
              </button>
            )}
          </div>

          <div className={s.list}>
            {loading ? (
              <div className={s.center}>
                <div className={s.spinner} />
                <p>Verificando pendientes...</p>
              </div>
            ) : notifs.length === 0 ? (
              <div className={s.empty}>
                <span className="material-icons">check_circle</span>
                <p>Sin pendientes</p>
                <span>No hay horas extra por aprobar ni bajas recientes</span>
              </div>
            ) : (
              notifs.map(n => (
                <div
                  key={n.id}
                  className={`${s.item} ${
                    n.tipo === 'critico'
                      ? s.itemCritico
                      : n.tipo === 'alerta'
                        ? s.itemAlerta
                        : s.itemSeguimiento
                  } ${leidas.has(n.id) ? s.itemLeida : ''}`}
                  onClick={() => marcarLeida(n.id)}
                >
                  <div className={`${s.itemIcon} ${
                    n.tipo === 'critico'
                      ? s.iconCritico
                      : n.tipo === 'alerta'
                        ? s.iconAlerta
                        : s.iconSeguimiento
                  }`}>
                    <span className="material-icons">{n.icon}</span>
                  </div>

                  <div className={s.itemContent}>
                    <div className={s.itemTop}>
                      <span className={s.itemTitle}>{n.titulo}</span>

                      <span className={`${s.itemTipo} ${
                        n.tipo === 'critico'
                          ? s.tipoCritico
                          : n.tipo === 'alerta'
                            ? s.tipoAlerta
                            : s.tipoSeguimiento
                      }`}>
                        {n.tipo === 'critico'
                          ? 'Baja'
                          : n.tipo === 'alerta'
                            ? 'Pendiente'
                            : 'Info'}
                      </span>
                    </div>

                    <p className={s.itemMsg}>{n.mensaje}</p>
                    <p className={s.itemSector}>{n.sector}</p>

                    <p className={`${s.itemDetalle} ${n.tratado ? s.detalleOk : s.detalleWarn}`}>
                      {n.tratado ? '✓' : '✗'} {n.detalle}
                    </p>

                    <button
                      type="button"
                      className={s.followBtn}
                      onClick={e => {
                        e.stopPropagation();
                        irSeguimiento(n);
                      }}
                    >
                      <span className={s.iconCircle}>
                        <span className="material-icons">visibility</span>
                      </span>
                      Ver detalle
                    </button>
                  </div>

                  {!leidas.has(n.id) && <div className={s.dot} />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}