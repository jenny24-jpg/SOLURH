// ============================================================
// controllers/usuarioController.js
// ============================================================
const bcrypt = require('bcrypt');
const { getConnection, closeConnection } = require('../config/db');
const { generarToken } = require('../middleware/auth');
const { registrar: registrarAuditoria } = require('./auditoriaController');

function usuarioAuditoria(req) {
  return { usuarioId: req.usuario?.id || null, usuarioNombre: req.usuario?.username || 'Sistema' };
}

const ROL_A_ID = { admin: 1, administrador: 1, supervisor: 2, empleado: 3 };
const rolTextoAId = (rolTexto) => ROL_A_ID[String(rolTexto || '').toLowerCase()] ?? 3;

const login = async (req, res) => {
  const { usuario, password } = req.body;
  if (!usuario || !password) {
    return res.status(400).json({ ok: false, mensaje: 'Usuario y contraseña son requeridos.' });
  }

  let conn;
  try {
    conn = await getConnection();
    const result = await conn.query('SELECT * FROM usuarios WHERE usuario = $1', [usuario]);

    if (result.rows.length === 0) {
      return res.status(401).json({ ok: false, mensaje: 'Usuario o contraseña incorrectos.' });
    }

    const fila = result.rows[0];

    if (fila.estado && fila.estado.toLowerCase() !== 'activo') {
      return res.status(403).json({ ok: false, mensaje: 'Este usuario está inactivo.' });
    }

    const passwordValida = await bcrypt.compare(password, fila.password);
    if (!passwordValida) {
      return res.status(401).json({ ok: false, mensaje: 'Usuario o contraseña incorrectos.' });
    }

    const rol_id = rolTextoAId(fila.rol);
    const token = generarToken({ id_usuario: fila.id, username: fila.usuario, rol_id });

    res.status(200).json({
      ok: true,
      token,
      usuario: {
        id: fila.id,
        usuario: fila.usuario,
        nombre_completo: fila.nombre_completo,
        rol: fila.rol,
        rol_id,
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

const listar = async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.query(
      `SELECT id, usuario, nombre_completo, rol, estado, fecha_creacion
       FROM usuarios ORDER BY nombre_completo`
    );
    res.status(200).json({ ok: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

const obtenerPorId = async (req, res) => {
  const { id_usuario } = req.params;
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.query(
      `SELECT id, usuario, nombre_completo, rol, estado, fecha_creacion
       FROM usuarios WHERE id = $1`,
      [Number(id_usuario)]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado.' });
    }
    res.status(200).json({ ok: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

const insertar = async (req, res) => {
  const { usuario, password, nombre_completo, rol } = req.body;

  if (!usuario || String(usuario).trim().length < 3) {
    return res.status(400).json({ ok: false, mensaje: 'El usuario es requerido (mínimo 3 caracteres).' });
  }
  if (!password || String(password).length < 6) {
    return res.status(400).json({ ok: false, mensaje: 'La contraseña debe tener al menos 6 caracteres.' });
  }
  if (!nombre_completo || String(nombre_completo).trim().length < 3) {
    return res.status(400).json({ ok: false, mensaje: 'El nombre completo es requerido.' });
  }

  let conn;
  try {
    conn = await getConnection();

    const existe = await conn.query('SELECT id FROM usuarios WHERE usuario = $1', [usuario.trim()]);
    if (existe.rows.length > 0) {
      return res.status(409).json({ ok: false, mensaje: 'Ese nombre de usuario ya existe.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await conn.query(
      `INSERT INTO usuarios (usuario, password, nombre_completo, rol, estado, fecha_creacion)
       VALUES ($1, $2, $3, $4, 'activo', NOW()) RETURNING id`,
      [usuario.trim(), passwordHash, nombre_completo.trim(), rol || 'empleado']
    );

    await registrarAuditoria(conn, {
      tabla: 'USUARIOS',
      operacion: 'INSERT',
      idRegistro: result.rows[0].id,
      descripcion: `Nuevo usuario creado: ${usuario}`,
      ...usuarioAuditoria(req),
    });

    res.status(201).json({ ok: true, mensaje: 'Usuario creado correctamente.' });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

const actualizar = async (req, res) => {
  const { id_usuario } = req.params;
  const { nombre_completo, rol, estado } = req.body;

  if (!nombre_completo || String(nombre_completo).trim().length < 3) {
    return res.status(400).json({ ok: false, mensaje: 'El nombre completo es requerido.' });
  }

  let conn;
  try {
    conn = await getConnection();
    await conn.query(
      `UPDATE usuarios SET nombre_completo = $1, rol = $2, estado = $3 WHERE id = $4`,
      [nombre_completo.trim(), rol || 'empleado', estado || 'activo', Number(id_usuario)]
    );

    await registrarAuditoria(conn, {
      tabla: 'USUARIOS',
      operacion: 'UPDATE',
      idRegistro: id_usuario,
      descripcion: `Usuario ${id_usuario} actualizado`,
      ...usuarioAuditoria(req),
    });

    res.status(200).json({ ok: true, mensaje: 'Usuario actualizado correctamente.' });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

const cambiarPassword = async (req, res) => {
  const { id_usuario } = req.params;
  const { password_actual, password_nueva } = req.body;

  if (!password_nueva || String(password_nueva).length < 6) {
    return res.status(400).json({ ok: false, mensaje: 'La nueva contraseña debe tener al menos 6 caracteres.' });
  }

  let conn;
  try {
    conn = await getConnection();

    const result = await conn.query('SELECT password FROM usuarios WHERE id = $1', [Number(id_usuario)]);
    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado.' });
    }

    const passwordValida = await bcrypt.compare(password_actual || '', result.rows[0].password);
    if (!passwordValida) {
      return res.status(401).json({ ok: false, mensaje: 'La contraseña actual es incorrecta.' });
    }

    const nuevoHash = await bcrypt.hash(password_nueva, 10);
    await conn.query('UPDATE usuarios SET password = $1 WHERE id = $2', [nuevoHash, Number(id_usuario)]);

    await registrarAuditoria(conn, {
      tabla: 'USUARIOS',
      operacion: 'UPDATE',
      idRegistro: id_usuario,
      descripcion: `Usuario ${id_usuario} cambió su contraseña`,
      ...usuarioAuditoria(req),
    });

    res.status(200).json({ ok: true, mensaje: 'Contraseña actualizada correctamente.' });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

const resetearPassword = async (req, res) => {
  const { id_usuario } = req.params;
  const { password_nueva } = req.body;

  if (!password_nueva || String(password_nueva).length < 6) {
    return res.status(400).json({ ok: false, mensaje: 'La nueva contraseña debe tener al menos 6 caracteres.' });
  }

  let conn;
  try {
    conn = await getConnection();
    const nuevoHash = await bcrypt.hash(password_nueva, 10);

    const result = await conn.query('UPDATE usuarios SET password = $1 WHERE id = $2', [nuevoHash, Number(id_usuario)]);
    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado.' });
    }

    await registrarAuditoria(conn, {
      tabla: 'USUARIOS',
      operacion: 'UPDATE',
      idRegistro: id_usuario,
      descripcion: `Contraseña de usuario ${id_usuario} reseteada por un administrador`,
      ...usuarioAuditoria(req),
    });

    res.status(200).json({ ok: true, mensaje: 'Contraseña reseteada correctamente.' });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

const eliminar = async (req, res) => {
  const { id_usuario } = req.params;
  let conn;
  try {
    conn = await getConnection();
    await conn.query(`UPDATE usuarios SET estado = 'inactivo' WHERE id = $1`, [Number(id_usuario)]);

    await registrarAuditoria(conn, {
      tabla: 'USUARIOS',
      operacion: 'DELETE',
      idRegistro: id_usuario,
      descripcion: `Usuario ${id_usuario} desactivado`,
      ...usuarioAuditoria(req),
    });

    res.status(200).json({ ok: true, mensaje: 'Usuario desactivado correctamente.' });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

module.exports = {
  login,
  listar,
  obtenerPorId,
  insertar,
  actualizar,
  cambiarPassword,
  resetearPassword,
  eliminar,
};
