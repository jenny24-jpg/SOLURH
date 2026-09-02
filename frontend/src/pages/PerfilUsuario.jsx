import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import s from './PerfilUsuario.module.css';

import { API, apiFetch } from '../context/AuthContext';

export default function PerfilUsuario({ onBack }) {
  const { usuario, actualizarPerfil, loading, displayName, rolLabel } = useAuth();

  // ── Datos personales ──────────────────────────────
  const [form, setForm] = useState({
    nombres:   usuario?.NOMBRES   ?? usuario?.nombres   ?? '',
    apellidos: usuario?.APELLIDOS ?? usuario?.apellidos ?? '',
    email:     usuario?.EMAIL     ?? usuario?.email     ?? '',
    telefono:  usuario?.TELEFONO  ?? usuario?.telefono  ?? '',
    username:  usuario?.USERNAME  ?? usuario?.username  ?? '',
  });
  const [exitoInfo, setExitoInfo] = useState('');
  const [errorInfo, setErrorInfo] = useState('');
  const [savingInfo, setSavingInfo] = useState(false);

  // ── Cambio de contraseña ──────────────────────────
  const [pass, setPass] = useState({
    actual: '', nueva: '', confirmar: '',
  });
  const [verActual,    setVerActual]    = useState(false);
  const [verNueva,     setVerNueva]     = useState(false);
  const [verConfirmar, setVerConfirmar] = useState(false);
  const [exitoPass, setExitoPass] = useState('');
  const [errorPass, setErrorPass] = useState('');
  const [savingPass, setSavingPass] = useState(false);

  const setP = (k, v) => {
    setPass(p => ({ ...p, [k]: v }));
    setExitoPass(''); setErrorPass('');
  };

const setF = (k, v) => {

  // Teléfono: solo números
  if (k === 'telefono' && !/^\d*$/.test(v)) return;

  // Correo: solo caracteres válidos
  if (k === 'email' && !/^[A-Za-z0-9@._-]*$/.test(v)) return;

  setForm(f => ({ ...f, [k]: v }));

  if (
  form.email &&
  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
) {
  setErrorInfo('Ingresa un correo electrónico válido');
  return;
}
  setExitoInfo('');
  setErrorInfo('');
};

  // ── Submit datos personales ───────────────────────
  const handleInfoSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombres.trim()) { setErrorInfo('El nombre es obligatorio'); return; }
    setErrorInfo(''); setExitoInfo(''); setSavingInfo(true);
    const res = await actualizarPerfil({
      nombres:   form.nombres.trim()   || null,
      apellidos: form.apellidos.trim() || null,
      email:     form.email.trim()     || null,
      telefono:  form.telefono.trim()  || null,
    });
    setSavingInfo(false);
    if (res.ok) setExitoInfo('Perfil actualizado correctamente');
    else setErrorInfo(res.mensaje);
  };

  // ── Submit cambio contraseña ──────────────────────
  const handlePassSubmit = async (e) => {
    e.preventDefault();
    if (!pass.actual)    { setErrorPass('Ingresa tu contraseña actual'); return; }
    if (!pass.nueva)     { setErrorPass('Ingresa la nueva contraseña'); return; }
    if (pass.nueva.length < 8) { setErrorPass('La contraseña debe tener al menos 8 caracteres'); return; }
    if (!/[A-Z]/.test(pass.nueva)) { setErrorPass('La contraseña debe tener al menos una mayúscula'); return; }
    if (!/[a-z]/.test(pass.nueva)) { setErrorPass('La contraseña debe tener al menos una minúscula'); return; }
    if (!/[0-9]/.test(pass.nueva)) { setErrorPass('La contraseña debe tener al menos un número'); return; }
    if (pass.nueva !== pass.confirmar) { setErrorPass('Las contraseñas no coinciden'); return; }

    const id = usuario?.ID_USUARIO ?? usuario?.id_usuario;
    if (!id) { setErrorPass('No se pudo identificar el usuario'); return; }

    setErrorPass(''); setExitoPass(''); setSavingPass(true);
    try {
      // Primero verificamos la contraseña actual haciendo login
      const loginRes = await fetch(`${API}/usuarios/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario: usuario?.USERNAME ?? usuario?.username,
          password: pass.actual,
        }),
      });
      const loginData = await loginRes.json();
      if (!loginData.ok) {
        setErrorPass('La contraseña actual es incorrecta');
        setSavingPass(false);
        return;
      }

      // Cambiar contraseña
      const res  = await apiFetch(`${API}/usuarios/${id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password_actual: pass.actual, password_nueva: pass.nueva }),
      });
      const data = await res.json();

      if (data.ok || data.success) {
        setExitoPass('Contraseña actualizada correctamente');
        setPass({ actual: '', nueva: '', confirmar: '' });
      } else {
        setErrorPass(data.mensaje ?? data.message ?? 'Error al cambiar contraseña');
      }
    } catch {
      setErrorPass('Error de conexión con el servidor');
    } finally {
      setSavingPass(false);
    }
  };

  const inicial = (form.nombres?.[0] ?? displayName?.[0] ?? 'U').toUpperCase();

  return (
    <div className={s.root}>

      {/* Breadcrumb */}
      <div className={s.breadcrumb}>
        <button className={s.backBtn} onClick={onBack} type="button">
          <span className="material-icons">arrow_back_ios</span>
          Inicio
        </button>
        <span>/</span>
        <span className={s.bcCur}>Mi perfil</span>
      </div>

      <div className={s.content}>

        {/* Avatar card */}
        <div className={s.avatarCard}>
          <div className={s.avatarCircle}>{inicial}</div>
          <div>
            <h2 className={s.avatarName}>{form.nombres || displayName}</h2>
            <span className={s.avatarRole}>{rolLabel}</span>
          </div>
          <div className={s.avatarMeta}>
            <div className={s.metaItem}>
              <span className="material-icons">person_outline</span>
              <span>{form.username || '—'}</span>
            </div>
            <div className={s.metaItem}>
              <span className="material-icons">email</span>
              <span>{form.email || 'Sin correo registrado'}</span>
            </div>
            <div className={s.metaItem}>
              <span className="material-icons">phone</span>
              <span>{form.telefono || 'Sin teléfono registrado'}</span>
            </div>
          </div>
        </div>

        {/* ── Datos personales ─────────────────────── */}
        <div className={s.formCard}>
          <div className={s.formHeader}>
            <span className="material-icons">edit</span>
            <div>
              <h3>Editar información</h3>
              <p>Actualiza tus datos personales</p>
            </div>
          </div>

          <form onSubmit={handleInfoSubmit} noValidate>
            <div className={s.row2}>
              <div className={s.fieldWrap}>
                <label className={s.label}>
                  Nombres <span className={s.req}>*</span>
                </label>
                <div className={s.field}>
                  <span className="material-icons">person_outline</span>
                  <input type="text" placeholder="Tu nombre"
                    value={form.nombres} onChange={e => setF('nombres', e.target.value)} />
                </div>
              </div>
              <div className={s.fieldWrap}>
                <label className={s.label}>Apellidos</label>
                <div className={s.field}>
                  <span className="material-icons">person_outline</span>
                  <input type="text" placeholder="Tus apellidos"
                    value={form.apellidos} onChange={e => setF('apellidos', e.target.value)} />
                </div>
              </div>
            </div>

            <div className={s.fieldWrap}>
              <label className={s.label}>
                Nombre de usuario
                <span className={s.badge}>No editable</span>
              </label>
              <div className={`${s.field} ${s.fieldDisabled}`}>
                <span className="material-icons">alternate_email</span>
                <input type="text" value={form.username} disabled />
              </div>
            </div>

            <div className={s.fieldWrap}>
              <label className={s.label}>Correo electrónico</label>
              <div className={s.field}>
                <span className="material-icons">email</span>
                <input type="email" placeholder="correo@ejemplo.com"
                  value={form.email} onChange={e => setF('email', e.target.value)} />
              </div>
            </div>

            <div className={s.fieldWrap}>
              <label className={s.label}>Teléfono</label>
              <div className={s.field}>
                <span className="material-icons">phone</span>
                <input type="tel" placeholder="Ingresa tu número de teléfono"
                  value={form.telefono} onChange={e => setF('telefono', e.target.value)} />
              </div>
            </div>

            {errorInfo && <p className={s.error}>{errorInfo}</p>}
            {exitoInfo && <p className={s.exito}>{exitoInfo}</p>}

            <div className={s.actions}>
              <button type="button" className={s.btnCancel} onClick={onBack}>Cancelar</button>
              <button type="submit" className={s.btnSave} disabled={savingInfo || loading}>
                {(savingInfo || loading)
                  ? <span className={s.spinner} />
                  : <><span className="material-icons">save</span> Guardar cambios</>
                }
              </button>
            </div>
          </form>
        </div>

        {/* ── Cambio de contraseña ─────────────────── */}
        <div className={s.formCard}>
          <div className={s.formHeader}>
            <span className="material-icons">lock</span>
            <div>
              <h3>Cambiar contraseña</h3>
              <p>Por seguridad, ingresa tu contraseña actual antes de cambiarla</p>
            </div>
          </div>

          <form onSubmit={handlePassSubmit} noValidate>

            {/* Contraseña actual */}
            <div className={s.fieldWrap}>
              <label className={s.label}>Contraseña actual <span className={s.req}>*</span></label>
              <div className={s.field}>
                <span className="material-icons">lock_outline</span>
                <input
                  type={verActual ? 'text' : 'password'}
                  placeholder="Tu contraseña actual"
                  value={pass.actual}
                  onChange={e => setP('actual', e.target.value)}
                />
                <button type="button" onClick={() => setVerActual(v => !v)}>
                  <span className="material-icons">{verActual ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            <div className={s.passDivider}>
              <span>Nueva contraseña</span>
            </div>

            <div className={s.row2}>
              {/* Nueva contraseña */}
              <div className={s.fieldWrap}>
                <label className={s.label}>Nueva contraseña <span className={s.req}>*</span></label>
                <div className={s.field}>
                  <span className="material-icons">lock_reset</span>
                  <input
                    type={verNueva ? 'text' : 'password'}
                    placeholder="Mínimo 8 caracteres, con mayúscula, minúscula y número"
                    value={pass.nueva}
                    onChange={e => setP('nueva', e.target.value)}
                  />
                  <button type="button" onClick={() => setVerNueva(v => !v)}>
                    <span className="material-icons">{verNueva ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              {/* Confirmar contraseña */}
              <div className={s.fieldWrap}>
                <label className={s.label}>Confirmar contraseña <span className={s.req}>*</span></label>
                <div className={`${s.field} ${pass.confirmar && pass.nueva !== pass.confirmar ? s.fieldError : ''}`}>
                  <span className="material-icons">lock_reset</span>
                  <input
                    type={verConfirmar ? 'text' : 'password'}
                    placeholder="Repite la nueva contraseña"
                    value={pass.confirmar}
                    onChange={e => setP('confirmar', e.target.value)}
                  />
                  <button type="button" onClick={() => setVerConfirmar(v => !v)}>
                    <span className="material-icons">{verConfirmar ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
                {pass.confirmar && pass.nueva !== pass.confirmar && (
                  <p className={s.fieldHint}>Las contraseñas no coinciden</p>
                )}
                {pass.confirmar && pass.nueva === pass.confirmar && pass.nueva && (
                  <p className={s.fieldHintOk}>✓ Las contraseñas coinciden</p>
                )}
              </div>
            </div>

            {/* Indicador de fortaleza */}
            {pass.nueva && (
              <div className={s.strengthWrap}>
                <div className={s.strengthBar}>
                  <div className={`${s.strengthFill} ${
                    pass.nueva.length < 6 ? s.strengthWeak :
                    pass.nueva.length < 8 ? s.strengthMedium :
                    s.strengthStrong
                  }`} />
                </div>
                <span className={s.strengthLabel}>
                  {pass.nueva.length < 6 ? 'Débil' :
                   pass.nueva.length < 8 ? 'Regular' : 'Fuerte'}
                </span>
              </div>
            )}

            {errorPass && <p className={s.error}>{errorPass}</p>}
            {exitoPass && <p className={s.exito}>{exitoPass}</p>}

            <div className={s.actions}>
              <button type="button" className={s.btnCancel}
                onClick={() => { setPass({ actual:'', nueva:'', confirmar:'' }); setErrorPass(''); setExitoPass(''); }}>
                Limpiar
              </button>
              <button type="submit" className={s.btnSave} disabled={savingPass}>
                {savingPass
                  ? <span className={s.spinner} />
                  : <><span className="material-icons">lock</span> Cambiar contraseña</>
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}