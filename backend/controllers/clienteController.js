// ============================================================
// controllers/clienteController.js
// ============================================================
const { getConnection, closeConnection } = require('../config/db');
const { registrar: registrarAuditoria } = require('./auditoriaController');

function usuarioAuditoria(req) {
  return { usuarioId: req.usuario?.id || null, usuarioNombre: req.usuario?.username || 'Sistema' };
}

const listar = async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.query(
      `SELECT c.*, s.nombre AS supervisor_nombre
       FROM clientes c
       LEFT JOIN supervisores s ON s.id = c.supervisor_id
       WHERE c.estado = 'ACTIVO'
       ORDER BY c.nombre`
    );
    res.status(200).json({ ok: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};


const obtenerPorId = async (req, res) => {
  const { id_cliente } = req.params;
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.query('SELECT * FROM clientes WHERE id = $1', [Number(id_cliente)]);
    if (result.rows.length === 0) return res.status(404).json({ ok: false, mensaje: 'Cliente no encontrado.' });
    res.status(200).json({ ok: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

const insertar = async (req, res) => {
  const { nombre, supervisor_id } = req.body;
  if (!nombre || String(nombre).trim().length < 3) {
    return res.status(400).json({ ok: false, mensaje: 'El nombre del cliente es requerido (mínimo 3 caracteres).' });
  }

  let conn;
  try {
    conn = await getConnection();

    const existe = await conn.query('SELECT id FROM clientes WHERE nombre = $1', [nombre.trim()]);
    if (existe.rows.length > 0) {
      return res.status(409).json({ ok: false, mensaje: 'Ese nombre de cliente ya existe.' });
    }

    const result = await conn.query(
      `INSERT INTO clientes (nombre, estado, supervisor_id) VALUES ($1, 'ACTIVO', $2) RETURNING id`,
      [nombre.trim(), supervisor_id || null]
    );

    await registrarAuditoria(conn, {
      tabla: 'CLIENTES',
      operacion: 'INSERT',
      idRegistro: result.rows[0].id,
      descripcion: `Nuevo cliente creado: ${nombre}`,
      ...usuarioAuditoria(req),
    });

    res.status(201).json({ ok: true, mensaje: 'Cliente creado correctamente.', data: { id: result.rows[0].id } });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

const actualizar = async (req, res) => {
  const { id_cliente } = req.params;
  const { nombre, estado, supervisor_id } = req.body;
  if (!nombre || String(nombre).trim().length < 3) {
    return res.status(400).json({ ok: false, mensaje: 'El nombre del cliente es requerido (mínimo 3 caracteres).' });
  }

  let conn;
  try {
    conn = await getConnection();
    await conn.query(
      `UPDATE clientes SET nombre=$1, estado=$2, supervisor_id=$3 WHERE id=$4`,
      [nombre.trim(), estado || 'ACTIVO', supervisor_id || null, Number(id_cliente)]
    );

    await registrarAuditoria(conn, {
      tabla: 'CLIENTES',
      operacion: 'UPDATE',
      idRegistro: id_cliente,
      descripcion: `Cliente ${id_cliente} actualizado`,
      ...usuarioAuditoria(req),
    });

    res.status(200).json({ ok: true, mensaje: 'Cliente actualizado correctamente.' });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

const eliminar = async (req, res) => {
  const { id_cliente } = req.params;
  let conn;
  try {
    conn = await getConnection();
    await conn.query(`UPDATE clientes SET estado = 'INACTIVO' WHERE id = $1`, [Number(id_cliente)]);

    await registrarAuditoria(conn, {
      tabla: 'CLIENTES',
      operacion: 'DELETE',
      idRegistro: id_cliente,
      descripcion: `Cliente ${id_cliente} eliminado`,
      ...usuarioAuditoria(req),
    });

    res.status(200).json({ ok: true, mensaje: 'Cliente eliminado correctamente.' });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

module.exports = { listar, obtenerPorId, insertar, actualizar, eliminar };