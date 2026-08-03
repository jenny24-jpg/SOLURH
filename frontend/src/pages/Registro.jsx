import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import s from './Registro.module.css';

const usernameRegex = /^[a-zA-Z0-9]+$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const nameRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;
const phoneRegex = /^\d+$/;

export default function Registro({ onLogin }) {
  const { registrar, loading } = useAuth();

  const [form, setForm] = useState({
    username: '',
    email: '',
    password_hash: '',
    nombres: '',
    apellidos: '',
    telefono: ''
  });

  const [verPass, setVerPass] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [exito, setExito] = useState('');

  const set = (k, v) => {
    if (k === 'username') {
      if (!/^[a-zA-Z0-9]*$/.test(v)) return;
    }

    if (k === 'nombres' || k === 'apellidos') {
      if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]*$/.test(v)) return;
    }

    if (k === 'telefono') {
      if (!/^\d*$/.test(v)) return;
    }

    setForm(f => ({
      ...f,
      [k]: v
    }));

    setErrors(prev => ({
      ...prev,
      [k]: ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = {};

    if (!form.username.trim()) {
      validationErrors.username = 'El usuario es obligatorio';
    } else if (!usernameRegex.test(form.username)) {
      validationErrors.username = 'El usuario solo puede contener letras y números';
    }

    if (!form.email.trim()) {
      validationErrors.email = 'El correo es obligatorio';
    } else if (!emailRegex.test(form.email)) {
      validationErrors.email = 'Ingrese un correo electrónico válido';
    }

    if (!form.password_hash.trim()) {
      validationErrors.password_hash = 'La contraseña es obligatoria';
    } else if (!passwordRegex.test(form.password_hash)) {
      validationErrors.password_hash =
        'La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula y un número';
    }

    if (form.nombres.trim() && !nameRegex.test(form.nombres)) {
      validationErrors.nombres = 'Los nombres solo pueden contener letras';
    }

    if (form.apellidos.trim() && !nameRegex.test(form.apellidos)) {
      validationErrors.apellidos = 'Los apellidos solo pueden contener letras';
    }

    if (form.telefono.trim() && !phoneRegex.test(form.telefono)) {
      validationErrors.telefono = 'El teléfono solo puede contener números';
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setError('');
      return;
    }

    setErrors({});
    setError('');
    setExito('');

    const res = await registrar({
      ...form,
      username: form.username.trim(),
      email: form.email.trim(),
      nombres: form.nombres.trim(),
      apellidos: form.apellidos.trim(),
      telefono: form.telefono.trim(),
      rol_id: 3,
      estado: 'ACTIVO'
    });

    if (res.ok) {
      setExito('Cuenta creada. Ahora puedes iniciar sesión.');
      setTimeout(onLogin, 1800);
    } else {
      setError(res.mensaje);
    }
  };

  return (
    <div className={s.root}>
      <div className={s.card}>
        <div className={s.header}>
          <div className={s.logo}>
            <span className="material-icons">badge</span>
          </div>

          <div>
            <h2>Nueva cuenta</h2>
            <p>Completa tus datos para acceder al sistema</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <p className={s.secTitle}>
            <span className="material-icons">lock_outline</span>
            Datos de acceso
          </p>

          <Field
            icon="person_outline"
            ph="Nombre de usuario"
            value={form.username}
            onChange={v => set('username', v)}
          />
          {errors.username && <p className={s.error}>{errors.username}</p>}

          <Field
            icon="email"
            ph="Correo electrónico"
            type="email"
            value={form.email}
            onChange={v => set('email', v)}
          />
          {errors.email && <p className={s.error}>{errors.email}</p>}

          <div style={{ position: 'relative' }}>
            <Field
              icon="lock_outline"
              ph="Contraseña"
              type={verPass ? 'text' : 'password'}
              value={form.password_hash}
              onChange={v => set('password_hash', v)}
            />

            <button
              type="button"
              className={s.eye}
              onClick={() => setVerPass(v => !v)}
            >
              <span className="material-icons">
                {verPass ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
          {errors.password_hash && (
            <p className={s.error}>{errors.password_hash}</p>
          )}

          <p className={s.secTitle} style={{ marginTop: 18 }}>
            <span className="material-icons">badge</span>
            Datos personales
          </p>

          <div className={s.row2}>
            <div>
              <Field
                icon="person_outline"
                ph="Nombres"
                value={form.nombres}
                onChange={v => set('nombres', v)}
              />
              {errors.nombres && <p className={s.error}>{errors.nombres}</p>}
            </div>

            <div>
              <Field
                icon="person_outline"
                ph="Apellidos"
                value={form.apellidos}
                onChange={v => set('apellidos', v)}
              />
              {errors.apellidos && <p className={s.error}>{errors.apellidos}</p>}
            </div>
          </div>

          <Field
            icon="phone"
            ph="Teléfono (opcional)"
            value={form.telefono}
            onChange={v => set('telefono', v)}
          />
          {errors.telefono && <p className={s.error}>{errors.telefono}</p>}

          {error && <p className={s.error}>{error}</p>}
          {exito && <p className={s.exito}>{exito}</p>}

          <button type="submit" className={s.btn} disabled={loading}>
            {loading ? <span className={s.spinner} /> : 'CREAR CUENTA'}
          </button>
        </form>

        <p className={s.loginRow}>
          ¿Ya tienes cuenta?{' '}
          <button type="button" onClick={onLogin}>
            Inicia sesión
          </button>
        </p>
      </div>
    </div>
  );
}

function Field({ icon, ph, type = 'text', value, onChange }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: 'var(--fondo-claro)',
        border: '1px solid var(--pergamino-verde)',
        borderRadius: 'var(--radius-md)',
        padding: '0 14px',
        marginBottom: 10
      }}
    >
      <span
        className="material-icons"
        style={{
          fontSize: 17,
          color: 'var(--verde-medio)',
          flexShrink: 0
        }}
      >
        {icon}
      </span>

      <input
        type={type}
        placeholder={ph}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          flex: 1,
          border: 'none',
          background: 'transparent',
          padding: '12px 0',
          fontSize: 13,
          color: 'var(--verde-profundo)',
          fontWeight: 500,
          outline: 'none'
        }}
      />
    </div>
  );
}