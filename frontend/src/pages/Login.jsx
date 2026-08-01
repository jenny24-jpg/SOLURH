import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import s from './Login.module.css';

export default function Login({ onRegistro }) {
  const { login, loading } = useAuth();
  const { isDark, toggle } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [verPass,  setVerPass]  = useState(false);
  const [error,    setError]    = useState('');
  const passRef = useRef(null);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!username || !password) { setError('Completa todos los campos'); return; }
    setError('');
    const res = await login(username, password);
    if (!res.ok) setError(res.mensaje);
  };

  const handleKey = (e, next) => {
    if (e.key !== 'Enter') return;
    if (next === 'pass') passRef.current?.focus();
    else handleSubmit();
  };

  return (
    <div className={s.root}>

      {/* ── Lado verde ─────────────────────────── */}
      <div className={s.left}>
        <div className={s.lines} />

       <div className={s.features}>
  {[
    { icon: 'groups', label: 'Gestión de colaboradores' },
    { icon: 'badge', label: 'Control de personal' },
    { icon: 'apartment', label: 'Departamentos' },
    { icon: 'supervisor_account', label: 'Supervisores' },
    { icon: 'analytics', label: 'Reportes y estadísticas' },
  ].map((f) => (
    <div key={f.icon} className={s.feature}>
      <div className={s.featIcon}>
        <span className="material-icons">{f.icon}</span>
      </div>
      <span>{f.label}</span>
    </div>
  ))}
</div>

       <div className={s.branding}>
    <h1>SoluRH</h1>
    <p>Sistema Integral de Recursos Humanos</p>
</div>

<img
    src="/images/logo-soluservis.png"
    alt="Soluservis"
    className={s.logoLeft}
/>
      </div>

      {/* ── Lado blanco ────────────────────────── */}
      <div className={s.right}>
        <div className={s.dots} />

        <div className={s.card}>
          {/* Header */}
          <div className={s.cardHeader}>
           <div className={s.logo}>
  <img
    src="/images/logo-soluservis.png"
    alt="Soluservis"
    className={s.logoImage}
  />
</div>
            <div>
              <h2>Bienvenido</h2>
           <p>Sistema de Gestión de Colaboradores</p>
            </div>
          </div>

          <div className={s.divider} />

          {/* Formulario */}
          <form onSubmit={handleSubmit} noValidate>
            <div className={s.field}>
              <span className="material-icons">person_outline</span>
              <input
                type="text" placeholder="Usuario"
                value={username} autoFocus
                onChange={e => setUsername(e.target.value)}
                onKeyDown={e => handleKey(e, 'pass')}
              />
            </div>

            <div className={s.field}>
              <span className="material-icons">lock_outline</span>
              <input
                ref={passRef}
                type={verPass ? 'text' : 'password'}
                placeholder="Contraseña"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => handleKey(e, 'submit')}
              />
              <button type="button" onClick={() => setVerPass(v => !v)}>
                <span className="material-icons">
                  {verPass ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>

            {error && <p className={s.error}>{error}</p>}

            <button type="submit" className={s.btnPrimary} disabled={loading}>
              {loading ? <span className={s.spinner} /> : 'INGRESAR'}
            </button>
          </form>

          <div className={s.orRow}>
            <div className={s.orLine} /><span>o</span><div className={s.orLine} />
          </div>

          <p className={s.registerRow}>
            ¿No tienes cuenta?{' '}
            <button type="button" onClick={onRegistro}>Regístrate</button>
          </p>

          {/* Links footer */}
          <div className={s.cardFooterLinks}>
            <a href="mailto:contabilidad@soluservis.com">
              Atención y soporte
            </a>
            <div className={s.cardFooterSep} />
            <a href="/privacidad.html" target="_blank" rel="noopener noreferrer">
              Privacidad
            </a>
            <div className={s.cardFooterSep} />
            <button
              type="button"
              onClick={toggle}
              title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              style={{
                display:'flex', alignItems:'center', gap:5,
                background:'none', border:'none', cursor:'pointer',
                fontSize:11, fontWeight:600,
                color: isDark ? '#86efac' : '#6B7280',
                padding:'2px 4px', borderRadius:6,
              }}
            >
              <span className="material-icons" style={{ fontSize:15 }}>
                {isDark ? 'light_mode' : 'dark_mode'}
              </span>
              {isDark ? 'Claro' : 'Oscuro'}
            </button>
          </div>
        </div>
      </div>

      <p className={s.footer}>
        © {new Date().getFullYear()} Soluservis, S.A.
      </p>
    </div>
  );
}
