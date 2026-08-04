import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import s from './GestionUsuarios.module.css';

import { API, apiFetch } from '../context/AuthContext';

// Roles reales del sistema (coinciden con ROL_A_ID en el backend)
const ROLES = [
  { valor: 'admin',      id: 1, label: 'Administrador', color: '#8B2E2E', bg: '#FFEBEE' },
  { valor: 'supervisor', id: 2, label: 'Supervisor',     color: '#1B2A4D', bg: '#E8EDF5' },
  { valor: 'empleado',   id: 3, label: 'Empleado',       color: '#6B7280', bg: '#F3F4F6' },
];

function getRolPorValor(valor) {
  return ROLES.find(r => r.valor === String(valor || '').toLowerCase()) || ROLES[2];
}

function get(obj, ...keys) {
  for (const k of keys) if (obj?.[k] !== undefined && obj?.[k] !== null) return obj[k];
  return null;
}

export default function GestionUsuarios({ onBack }) {
  const { usuario } = useAuth();
  const [usuarios,    setUsuarios]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [search,      setSearch]      = useState('');
  const [modal,       setModal]       = useState(null);
  const [confirmId,   setConfirmId]   = useState(null);
  const [resetModal,  setResetModal]  = useState(null);  // { id, username }
  const [resetResult, setResetResult] = useState(null);  // { password_temporal, usuario }

  const fetchUsuarios = async () => {
    setLoading(true); setError('');
    try {
      const res  = await apiFetch(`${API}/usuarios`);
      const data = await res.json();
      if (data.ok || data.success) setUsuarios(Array.isArray(data.data) ? data.data : []);
      else setError(data.mensaje || 'Error al cargar usuarios');
    } catch { setError('No se pudo conectar con el servidor'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsuarios(); }, []);

  const handleEliminar = async (id) => {
    try {
      const res  = await apiFetch(`${API}/usuarios/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok || data.success) { setConfirmId(null); fetchUsuarios(); }
      else alert(data.mensaje || 'Error al eliminar');
    } catch { alert('Error de conexión'); }
  };

  const handleResetPassword = async () => {
    if (!resetModal) return;
    try {
      const adminNombre = get(usuario, 'nombre_completo', 'usuario') || 'Admin';
      const adminId     = get(usuario, 'id');
      const res  = await apiFetch(`${API}/usuarios/${resetModal.id}/resetear-password`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario_solicitante_id:     adminId,
          usuario_solicitante_nombre: adminNombre,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setResetModal(null);
        setResetResult({ password_temporal: data.password_temporal, usuario: data.usuario });
      } else {
        alert(data.mensaje || 'Error al resetear contraseña');
      }
    } catch { alert('Error de conexión'); }
  };

  const filtered = search.trim()
    ? usuarios.filter(u =>
        [get(u,'nombre_completo'), get(u,'usuario')]
          .some(v => String(v||'').toLowerCase().includes(search.toLowerCase()))
      )
    : usuarios;

  const myId = get(usuario, 'id');

  return (
    <div className={s.root}>

      {/* Header */}
      <div className={s.header}>
        <div className={s.breadcrumb}>
          <button className={s.backBtn} onClick={onBack} type="button">
            <span className="material-icons">arrow_back_ios</span> Inicio
          </button>
          <span>/</span>
          <span className={s.bcCur}>Gestión de usuarios</span>
        </div>

        <div className={s.titleRow}>
          <div className={s.titleBlock}>
            <div className={s.titleIcon}>
              <span className="material-icons">admin_panel_settings</span>
            </div>
            <div>
              <p className={s.panelLabel}>ADMINISTRADOR</p>
              <h1 className={s.pageTitle}>Gestión de usuarios</h1>
              <p className={s.pageSubtitle}>Crea, edita y administra los accesos del sistema.</p>
            </div>
          </div>
          <div className={s.titleActions}>
            <button className={s.refreshBtn} onClick={fetchUsuarios} type="button" title="Actualizar">
              <span className={s.iconCircle}>
                <span className="material-icons">refresh</span>
              </span>
              <span>Actualizar</span>
            </button>
            <button className={s.btnAdd} onClick={() => setModal('new')} type="button">
              <span className={s.iconCircle}>
                <span className="material-icons">person_add</span>
              </span>
              Nuevo usuario
            </button>
          </div>
        </div>

        <div className={s.toolbar}>
          <div className={s.searchWrap}>
            <span className="material-icons">search</span>
            <input
              placeholder="Buscar por nombre o usuario..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} type="button">
                <span className="material-icons">close</span>
              </button>
            )}
          </div>
          <div className={s.statsWrap}>
            {ROLES.map(r => (
              <div key={r.valor} className={s.rolBadge} style={{ background: r.bg, color: r.color }}>
                <span>{usuarios.filter(u => String(get(u,'rol')||'').toLowerCase() === r.valor).length}</span>
                {r.label}
              </div>
            ))}
            <div className={s.rolBadge} style={{ background:'#E8EDF5', color:'#1B2A4D' }}>
              <span>{usuarios.filter(u => String(get(u,'estado')||'').toLowerCase() === 'activo').length}</span>
              Activos
            </div>
            <div className={s.rolBadge} style={{ background:'#FFEBEE', color:'#8B2E2E' }}>
              <span>{usuarios.filter(u => String(get(u,'estado')||'').toLowerCase() === 'inactivo').length}</span>
              Inactivos
            </div>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <section className={s.contentCard}>
        {loading ? (
          <div className={s.center}>
            <div className={s.spinner} />
            <p>Cargando usuarios...</p>
          </div>
        ) : error ? (
          <div className={s.errBox}>
            <span className="material-icons">wifi_off</span>
            <div>
              <p className={s.errTitle}>Error de conexión</p>
              <p className={s.errMsg}>{error}</p>
            </div>
            <button className={s.btnRetry} onClick={fetchUsuarios} type="button">
              <span className={s.iconCircle}>
                <span className="material-icons">refresh</span>
              </span>
              Reintentar
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className={s.emptyState}>
            <span className="material-icons">group_off</span>
            <p>{search ? `Sin resultados para "${search}"` : 'Sin usuarios registrados'}</p>
          </div>
        ) : (
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Nombre completo</th>
                  <th>Rol</th>
                  <th>Supervisor vinculado</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => {
                  const id       = get(u,'id');
                  const rolVal   = get(u,'rol');
                  const rol      = getRolPorValor(rolVal);
                  const estado   = (get(u,'estado') || 'activo').toUpperCase();
                  const esYo     = String(id) === String(myId);
                  const supNombre = get(u,'supervisor_nombre');
                  return (
                    <tr key={id} className={`${i%2===0?s.rowE:s.rowO} ${esYo?s.rowMe:''}`}>
                      <td>
                        <div className={s.userCell}>
                          <div className={s.avatar} style={{ background: rol.bg, color: rol.color }}>
                            {String(get(u,'nombre_completo')||get(u,'usuario')||'?')[0].toUpperCase()}
                          </div>
                          <span className={s.username}>
                            {get(u,'usuario')}
                            {esYo && <span className={s.meTag}>Tú</span>}
                          </span>
                        </div>
                      </td>
                      <td>{get(u,'nombre_completo') || '—'}</td>
                      <td>
                        <span className={s.rolPill} style={{ background: rol.bg, color: rol.color }}>
                          {rol.label}
                        </span>
                      </td>
                      <td>{rolVal === 'supervisor' ? (supNombre || '—') : '—'}</td>
                      <td>
                        <span className={estado === 'ACTIVO' ? s.estadoActivo : s.estadoInactivo}>
                          {estado}
                        </span>
                      </td>
                      <td>
                        <div className={s.actions}>
                          <button className={s.actionEdit} onClick={() => setModal(u)} title="Editar" type="button">
                            <span className="material-icons">edit</span>
                          </button>
                          {!esYo && (
                            <button
                              className={s.actionEdit}
                              onClick={() => setResetModal({ id, username: get(u,'usuario') || `#${id}` })}
                              title="Resetear contraseña"
                              type="button"
                              style={{ background:'#F1F5F9', color:'#94A3B8', border:'1px solid #E2E8F0' }}
                            >
                              <span className="material-icons">lock_reset</span>
                            </button>
                          )}
                          {!esYo && (
                            <button className={s.actionDelete} onClick={() => setConfirmId(id)} title="Eliminar" type="button">
                              <span className="material-icons">delete_outline</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal usuario */}
      {modal !== null && (
        <ModalUsuario
          editItem={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchUsuarios(); }}
        />
      )}

      {/* Modal confirmar eliminar */}
      {confirmId !== null && (
        <div className={s.overlay} onClick={() => setConfirmId(null)}>
          <div className={s.confirmModal} onClick={e => e.stopPropagation()}>
            <div className={s.confirmIcon}>
              <span className="material-icons">delete_forever</span>
            </div>
            <h3>¿Eliminar usuario?</h3>
            <p>Esta acción desactivará el acceso del usuario al sistema.</p>
            <div className={s.confirmBtns}>
              <button className={s.confirmCancel} onClick={() => setConfirmId(null)} type="button">
                <span className={s.iconCircle}>
                  <span className="material-icons">close</span>
                </span>
                Cancelar
              </button>
              <button className={s.confirmDelete} onClick={() => handleEliminar(confirmId)} type="button">
                <span className={s.iconCircle}>
                  <span className="material-icons">delete</span>
                </span>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar reset contraseña */}
      {resetModal !== null && (
        <div className={s.overlay} onClick={() => setResetModal(null)}>
          <div className={s.confirmModal} onClick={e => e.stopPropagation()}>
            <div className={s.confirmIcon} style={{ background:'#F1F5F9' }}>
              <span className="material-icons" style={{ color:'#94A3B8' }}>lock_reset</span>
            </div>
            <h3>Resetear contraseña</h3>
            <p>Se generará una contraseña temporal para <strong>{resetModal.username}</strong>. La contraseña actual quedará invalidada.</p>
            <div className={s.confirmBtns}>
              <button className={s.confirmCancel} onClick={() => setResetModal(null)} type="button">
                <span className={s.iconCircle}>
                  <span className="material-icons">close</span>
                </span>
                Cancelar
              </button>
              <button
                onClick={handleResetPassword}
                type="button"
                style={{ background:'#94A3B8', color:'#fff', border:'none', borderRadius:10, padding:'9px 16px', cursor:'pointer', fontWeight:700, display:'flex', alignItems:'center', gap:6 }}
              >
                <span style={{ width:22, height:22, borderRadius:'50%', background:'rgba(255,255,255,0.22)', display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
                  <span className="material-icons" style={{ fontSize:14 }}>lock_reset</span>
                </span>
                Generar contraseña
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal mostrar contraseña generada */}
      {resetResult !== null && (
        <div className={s.overlay} onClick={() => setResetResult(null)}>
          <div className={s.confirmModal} onClick={e => e.stopPropagation()}>
            <div className={s.confirmIcon} style={{ background:'#E8EDF5' }}>
              <span className="material-icons" style={{ color:'#2D5A9E' }}>check_circle</span>
            </div>
            <h3>¡Contraseña generada!</h3>
            <p>Usuario: <strong>{resetResult.usuario}</strong></p>
            <div style={{ background:'#F2F4F7', border:'2px solid #DCE3ED', borderRadius:10, padding:'14px 18px', margin:'12px 0 8px', textAlign:'center' }}>
              <p style={{ fontSize:9, color:'#6B7280', marginBottom:6, textTransform:'uppercase', letterSpacing:'.6px', fontWeight:700 }}>Contraseña temporal</p>
              <p style={{ fontSize:24, fontWeight:800, color:'#1B2A4D', letterSpacing:4, fontFamily:'monospace' }}>{resetResult.password_temporal}</p>
            </div>
            <p style={{ fontSize:11, color:'#8B2E2E', marginBottom:16 }}>Copia esta contraseña ahora, no se volverá a mostrar.</p>
            <div className={s.confirmBtns}>
              <button
                type="button"
                style={{ background:'#E8EDF5', color:'#1B2A4D', border:'1px solid #DCE3ED', borderRadius:10, padding:'9px 14px', cursor:'pointer', fontWeight:700, display:'flex', alignItems:'center', gap:6 }}
                onClick={() => { try { navigator.clipboard.writeText(resetResult.password_temporal); } catch(_) {} }}
              >
                <span style={{ width:22, height:22, borderRadius:'50%', background:'rgba(27,42,77,0.10)', display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
                  <span className="material-icons" style={{ fontSize:14 }}>content_copy</span>
                </span>
                Copiar
              </button>
              <button
                type="button"
                style={{ background:'#2D5A9E', color:'#fff', border:'none', borderRadius:10, padding:'9px 16px', cursor:'pointer', fontWeight:700, display:'flex', alignItems:'center', gap:6 }}
                onClick={() => setResetResult(null)}
              >
                <span style={{ width:22, height:22, borderRadius:'50%', background:'rgba(255,255,255,0.22)', display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
                  <span className="material-icons" style={{ fontSize:14 }}>check</span>
                </span>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ── Modal formulario usuario ──────────────────────
function ModalUsuario({ editItem, onClose, onSaved }) {
  const isEdit = !!editItem;

  const [form, setForm] = useState({
    usuario:         editItem?.usuario || '',
    password:        '',
    nombre_completo: editItem?.nombre_completo || '',
    rol:             editItem?.rol || 'empleado',
    estado:          (editItem?.estado || 'activo'),
    supervisor_id:   editItem?.supervisor_id || '',
  });
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');
  const [verPass,     setVerPass]     = useState(false);
  const [supervisores, setSupervisores] = useState([]);
  const [loadingSup,  setLoadingSup]  = useState(false);

  // Cargar lista de supervisores cuando el rol elegido sea "supervisor"
  useEffect(() => {
    if (form.rol !== 'supervisor') return;
    let cancelado = false;
    setLoadingSup(true);
    apiFetch(`${API}/supervisor`)
      .then(r => r.json())
      .then(json => {
        if (!cancelado) setSupervisores(Array.isArray(json.data) ? json.data : []);
      })
      .catch(() => { if (!cancelado) setSupervisores([]); })
      .finally(() => { if (!cancelado) setLoadingSup(false); });
    return () => { cancelado = true; };
  }, [form.rol]);

  const set = (k, v) => {
    if (k === 'usuario') {
      if (!/^[A-Za-z0-9]*$/.test(v)) return;
    }
    if (k === 'nombre_completo') {
      if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]*$/.test(v)) return;
    }
    setForm(f => ({ ...f, [k]: v }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.usuario.trim()) {
      setError('El nombre de usuario es obligatorio');
      return;
    }
    if (!/^[A-Za-z0-9]+$/.test(form.usuario)) {
      setError('El usuario solo puede contener letras y números');
      return;
    }

    if (!isEdit) {
      if (!form.password) {
        setError('La contraseña es obligatoria');
        return;
      }
      if (form.password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres');
        return;
      }
    }

    if (!form.nombre_completo.trim() || form.nombre_completo.trim().length < 3) {
      setError('El nombre completo es obligatorio (mínimo 3 caracteres)');
      return;
    }

    if (form.rol === 'supervisor' && !form.supervisor_id) {
      setError('Debes seleccionar a qué supervisor pertenece este usuario');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const body = {
        usuario: form.usuario.trim(),
        nombre_completo: form.nombre_completo.trim(),
        rol: form.rol,
        estado: form.estado,
        supervisor_id: form.rol === 'supervisor' ? Number(form.supervisor_id) : null,
      };
      if (!isEdit) body.password = form.password;

      const id  = isEdit ? editItem?.id : null;
      const url = isEdit ? `${API}/usuarios/${id}` : `${API}/usuarios`;

      const res = await apiFetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.ok || data.success) {
        onSaved();
      } else {
        setError(data.mensaje || data.message || 'Error al guardar');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={s.modal}>
        <div className={s.modalHeader}>
          <div className={s.modalHeaderMain}>
            <div className={s.modalIcon}>
              <span className="material-icons">{isEdit ? 'manage_accounts' : 'person_add'}</span>
            </div>
            <div>
              <p className={s.modalEyebrow}>{isEdit ? 'EDITAR USUARIO' : 'NUEVO USUARIO'}</p>
              <h3>{isEdit ? 'Editar información' : 'Crear usuario'}</h3>
              <p className={s.modalDesc}>
                {isEdit ? 'Modifica los datos y rol del usuario.' : 'Completa los datos para crear el acceso.'}
              </p>
            </div>
          </div>
          <button className={s.closeBtn} onClick={onClose} type="button">
            <span className="material-icons">close</span>
          </button>
        </div>

        <div className={s.modalBody}>
          <form id="userForm" onSubmit={handleSubmit} noValidate>

            <div className={s.rolSelector}>
              <p className={s.fieldLabel}>Rol de acceso <span className={s.req}>*</span></p>
              <div className={s.rolOptions}>
                {ROLES.map(r => (
                  <label
                    key={r.valor}
                    className={`${s.rolOption} ${form.rol === r.valor ? s.rolOptionActive : ''}`}
                    style={form.rol === r.valor ? { borderColor: r.color, background: r.bg } : {}}
                  >
                    <input
                      type="radio" name="rol" value={r.valor}
                      checked={form.rol === r.valor}
                      onChange={() => set('rol', r.valor)}
                    />
                    <span className="material-icons" style={{ color: form.rol === r.valor ? r.color : 'var(--tierra-calida)', fontSize:18 }}>
                      {r.valor === 'admin' ? 'security' : r.valor === 'supervisor' ? 'supervisor_account' : 'engineering'}
                    </span>
                    <div>
                      <p style={{ fontSize:12, fontWeight:700, color: form.rol === r.valor ? r.color : 'var(--verde-profundo)' }}>{r.label}</p>
                      <p style={{ fontSize:10, color:'var(--tierra-calida)' }}>
                        {r.valor==='admin' ? 'Acceso total al sistema' : r.valor==='supervisor' ? 'Solo ve los datos de sus clientes' : 'Acceso operativo básico'}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {form.rol === 'supervisor' && (
              <div className={s.fieldWrap} style={{ marginBottom: 14 }}>
                <label className={s.fieldLabel}>Supervisor vinculado <span className={s.req}>*</span></label>
                <div className={s.field}>
                  <span className="material-icons">supervisor_account</span>
                  <select
                    value={form.supervisor_id}
                    onChange={e => set('supervisor_id', e.target.value)}
                    style={{ flex:1, border:'none', background:'transparent', outline:'none', fontSize:13, padding:'12px 0' }}
                  >
                    <option value="">{loadingSup ? 'Cargando...' : 'Selecciona...'}</option>
                    {supervisores.map(sv => (
                      <option key={sv.id} value={sv.id}>{sv.nombre}</option>
                    ))}
                  </select>
                </div>
                <span className={s.hint || ''} style={{ fontSize:11, color:'var(--tierra-calida)' }}>
                  Este usuario solo verá los empleados, asistencias y clientes de este supervisor.
                </span>
              </div>
            )}

            <div className={s.formGrid}>
              <div className={s.fieldWrap}>
                <label className={s.fieldLabel}>
                  Usuario <span className={s.req}>*</span>
                  {isEdit && <span className={s.noEditBadge}>No editable</span>}
                </label>
                <div className={`${s.field} ${isEdit ? s.fieldDisabled : ''}`}>
                  <span className="material-icons">alternate_email</span>
                  <input type="text" value={form.usuario} onChange={e => set('usuario', e.target.value)} disabled={isEdit} placeholder="nombre_usuario" />
                </div>
              </div>

              {!isEdit && (
                <div className={s.fieldWrap}>
                  <label className={s.fieldLabel}>Contraseña <span className={s.req}>*</span></label>
                  <div className={s.field}>
                    <span className="material-icons">lock_outline</span>
                    <input type={verPass ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)} placeholder="Mínimo 6 caracteres" />
                    <button type="button" onClick={() => setVerPass(v => !v)}>
                      <span className="material-icons">{verPass ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>
              )}

              <div className={s.fieldWrap}>
                <label className={s.fieldLabel}>Nombre completo</label>
                <div className={s.field}>
                  <span className="material-icons">person_outline</span>
                  <input type="text" value={form.nombre_completo} onChange={e => set('nombre_completo', e.target.value)} placeholder="Nombre completo" />
                </div>
              </div>

              <div className={s.fieldWrap}>
                <label className={s.fieldLabel}>Estado</label>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.estado.toLowerCase() === 'activo'}
                  aria-label="Cambiar estado del usuario"
                  onClick={() => set('estado', form.estado.toLowerCase() === 'activo' ? 'inactivo' : 'activo')}
                  className={`${s.estadoToggle} ${form.estado.toLowerCase() === 'activo' ? s.estadoToggleOn : s.estadoToggleOff}`}
                >
                  <span className={s.estadoSwitch}>
                    <span className={s.estadoSwitchKnob} />
                  </span>
                  <span className={s.estadoToggleText}>
                    {form.estado.toLowerCase() === 'activo' ? 'Activo' : 'Inactivo'}
                  </span>
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className={s.modalFooter}>
          {error ? (
            <p className={s.errorMsg}>
              <span className="material-icons">error_outline</span>
              {error}
            </p>
          ) : (
            <p className={s.helperText}>Los campos con <span>*</span> son obligatorios.</p>
          )}
          <div className={s.modalBtns}>
            <button type="button" className={s.btnCancel} onClick={onClose}>
              <span className={s.iconCircle}>
                <span className="material-icons">close</span>
              </span>
              Cancelar
            </button>
            <button type="submit" form="userForm" className={s.btnSave} disabled={saving}>
              {saving ? (
                <span className={s.spinner} />
              ) : isEdit ? (
                <>
                  <span className={s.iconCircle}>
                    <span className="material-icons">save</span>
                  </span>
                  Guardar cambios
                </>
              ) : (
                <>
                  <span className={s.iconCircle}>
                    <span className="material-icons">person_add</span>
                  </span>
                  Crear usuario
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}