// ============================================================
// middleware/auth.js — Verificación de token JWT
// ============================================================
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'gestion_arboles_secret_2024';

// Generar token
const generarToken = (usuario) => {
  return jwt.sign(
    {
      id:            usuario.ID_USUARIO ?? usuario.id_usuario,
      username:      usuario.USERNAME   ?? usuario.username,
      rol_id:        usuario.ROL_ID     ?? usuario.rol_id ?? 3,
      supervisor_id: usuario.SUPERVISOR_ID ?? usuario.supervisor_id ?? null,
    },
    SECRET,
    { expiresIn: '8h' }
  );
};

// Middleware verificar token
const verificarToken = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, mensaje: 'Token requerido' });
  }
  const token = auth.split(' ')[1];
  try {
    req.usuario = jwt.verify(token, SECRET);
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError'
      ? 'Sesión expirada, inicia sesión nuevamente'
      : 'Token inválido';
    return res.status(401).json({ ok: false, mensaje: msg });
  }
};

// Middleware opcional: si hay token valido, carga req.usuario; si no hay token, deja continuar.
const verificarTokenOpcional = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) return next();

  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, mensaje: 'Token inválido' });
  }

  try {
    const token = auth.split(' ')[1];
    req.usuario = jwt.verify(token, SECRET);
    return next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError'
      ? 'Sesión expirada, inicia sesión nuevamente'
      : 'Token inválido';
    return res.status(401).json({ ok: false, mensaje: msg });
  }
};

// Middleware verificar rol mínimo
const requiereRol = (rolMinimo) => (req, res, next) => {
  if (!req.usuario) return res.status(401).json({ ok: false, mensaje: 'No autenticado' });
  if ((req.usuario.rol_id ?? 3) > rolMinimo) {
    return res.status(403).json({ ok: false, mensaje: 'No tienes permisos para esta acción' });
  }
  next();
};

module.exports = { generarToken, verificarToken, verificarTokenOpcional, requiereRol };
