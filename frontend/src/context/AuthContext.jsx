import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const AuthCtx = createContext(null);

// ── Helper fetch con token automatico ────────────────────
export async function apiFetch(url, options = {}) {
  const token = sessionStorage.getItem('ga_token');
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let res;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (err) {
    // Sin conexion al servidor
    throw new Error('No se pudo conectar con el servidor. Verifica tu conexion a internet.');
  }

  // Sesion expirada o token invalido
  if (res.status === 401) {
    sessionStorage.removeItem('ga_token');
    sessionStorage.removeItem('ga_usuario');
    window.location.reload();
    return res;
  }

  return res;
}

// ── Helper: extraer mensaje de error de una respuesta ────
// Intenta leer el JSON, si falla devuelve un mensaje generico
export async function extraerMensajeError(res, mensajePorDefecto = 'Ocurrio un error inesperado') {
  try {
    const data = await res.json();
    return data.mensaje || data.error || data.message || mensajePorDefecto;
  } catch {
    if (res.status === 404) return 'El recurso solicitado no existe';
    if (res.status === 403) return 'No tienes permisos para realizar esta accion';
    if (res.status === 500) return 'Error interno del servidor. Intenta de nuevo mas tarde';
    return mensajePorDefecto;
  }
}

export function AuthProvider({ children }) {
  const [loading,   setLoading]   = useState(false);
  const [iniciando, setIniciando] = useState(true);

  const [usuario, setUsuario] = useState(() => {
    try {
      const token = sessionStorage.getItem('ga_token');
      const saved = sessionStorage.getItem('ga_usuario');
      if (token && saved) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 > Date.now()) return JSON.parse(saved);
      }
    } catch {}
    return null;
  });

  useEffect(() => { setIniciando(false); }, []);

  // ── Login ─────────────────────────────────────────────
  const login = useCallback(async (username, password) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/usuarios/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: username, password }),
      });

      // Manejar rate limiting
      if (res.status === 429) {
        return { ok: false, mensaje: 'Demasiados intentos fallidos. Espera 15 minutos antes de intentar de nuevo.' };
      }

      const data = await res.json();

      if (!res.ok) {
        return { ok: false, mensaje: data.mensaje || data.error || 'Credenciales incorrectas' };
      }

      if (!data.ok) {
        return { ok: false, mensaje: data.mensaje || 'Credenciales incorrectas' };
      }

      if (data.token) sessionStorage.setItem('ga_token', data.token);

      const usuarioBase = data.usuario ?? data.data ?? {};
      const usuarioCompleto = {
        ...usuarioBase,
        ID_USUARIO: usuarioBase.id ?? usuarioBase.ID_USUARIO ?? usuarioBase.id_usuario,
        USERNAME:   usuarioBase.usuario ?? usuarioBase.USERNAME ?? usuarioBase.username,
        NOMBRES:    usuarioBase.nombre_completo ?? usuarioBase.NOMBRES ?? usuarioBase.nombres,
        ROL_ID:     usuarioBase.rol_id ?? usuarioBase.ROL_ID,
        ESTADO:     usuarioBase.estado ?? usuarioBase.ESTADO ?? 'ACTIVO',
      };

      setUsuario(usuarioCompleto);
      try { sessionStorage.setItem('ga_usuario', JSON.stringify(usuarioCompleto)); } catch {}
      return { ok: true };
    } catch (err) {
      return { ok: false, mensaje: err.message || 'Error de conexion con el servidor' };
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Registro ──────────────────────────────────────────
  const registrar = useCallback(async (datos) => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/usuarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        return { ok: false, mensaje: data.mensaje || data.error || 'Error al registrar usuario' };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, mensaje: err.message || 'Error de conexion con el servidor' };
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Actualizar perfil ─────────────────────────────────
  const actualizarPerfil = useCallback(async (datos) => {
    if (!usuario) return { ok: false, mensaje: 'No hay sesion activa' };
    const id = usuario.ID_USUARIO ?? usuario.id_usuario;
    if (!id) return { ok: false, mensaje: 'No se pudo identificar el usuario' };

    setLoading(true);
    try {
      const res = await apiFetch(`${API}/usuarios/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          rol_id:    usuario.ROL_ID   ?? usuario.rol_id   ?? 3,
          username:  usuario.USERNAME ?? usuario.username,
          nombres:   datos.nombres   || null,
          apellidos: datos.apellidos || null,
          email:     datos.email     || null,
          telefono:  datos.telefono  || null,
          estado:    usuario.ESTADO  ?? usuario.estado ?? 'ACTIVO',
        }),
      });
      const data = await res.json();

      if (!res.ok || (!data.ok && !data.success)) {
        return { ok: false, mensaje: data.mensaje || data.error || 'Error al actualizar perfil' };
      }

      const updated = {
        ...usuario,
        NOMBRES: datos.nombres,   APELLIDOS: datos.apellidos,
        EMAIL:   datos.email,     TELEFONO:  datos.telefono,
        nombres: datos.nombres,   apellidos: datos.apellidos,
        email:   datos.email,     telefono:  datos.telefono,
      };
      setUsuario(updated);
      try { sessionStorage.setItem('ga_usuario', JSON.stringify(updated)); } catch {}
      return { ok: true };

    } catch (err) {
      return { ok: false, mensaje: err.message || 'Error de conexion con el servidor' };
    } finally {
      setLoading(false);
    }
  }, [usuario]);

  // ── Logout ────────────────────────────────────────────
  const logout = useCallback(() => {
    setUsuario(null);
    try {
      sessionStorage.removeItem('ga_usuario');
      sessionStorage.removeItem('ga_token');
    } catch {}
  }, []);

  const getToken = () => {
    try { return sessionStorage.getItem('ga_token') || null; } catch { return null; }
  };

  const rolIdActual = usuario?.ROL_ID ?? usuario?.rol_id ?? 3;
  const isAdmin      = rolIdActual === 1;
  const isSupervisor = rolIdActual === 2;
  const displayName = usuario?.NOMBRES ?? usuario?.nombres ?? usuario?.USERNAME ?? usuario?.username ?? 'Usuario';
  const rolLabel    = isAdmin ? 'Administrador' : isSupervisor ? 'Supervisor' : 'Empleado';

  return (
    <AuthCtx.Provider value={{
      usuario, loading, iniciando,
      isLoggedIn: !!usuario,
      isAdmin, isSupervisor, displayName, rolLabel,
      login, registrar, logout, actualizarPerfil, getToken,
      API,
      // Helper exportado para que cualquier componente pueda usarlo
      extraerMensajeError,
    }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
export { API };