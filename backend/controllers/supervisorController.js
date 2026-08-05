// ============================================================
// controllers/supervisorController.js
// ============================================================
const { getConnection, closeConnection } = require('../config/db');
const { registrar: registrarAuditoria } = require('./auditoriaController');

function usuarioAuditoria(req) {
  return { usuarioId: req.usuario?.id || null, usuarioNombre: req.usuario?.username || 'Sistema' };
}

const listar = async (req, res) => {
  const { cliente_id } = req.query;
  let conn;
  try {
    conn = await getConnection();

    const esSupervisor = Number(req.usuario?.rol_id) === 2;
    const supervisorIdUsuario = req.usuario?.supervisor_id;

    let query;
    let params;

    if (esSupervisor && supervisorIdUsuario) {
      // Un usuario de tipo supervisor solo ve su propio registro
      query = `SELECT s.*, c.nombre AS cliente_nombre
                FROM supervisores s
                LEFT JOIN clientes c ON c.id = s.cliente_id
                WHERE s.estado = 'ACTIVO' AND s.id = $1
                ORDER BY s.nombre`;
      params = [Number(supervisorIdUsuario)];
    } else if (cliente_id) {
      query = `SELECT s.*, c.nombre AS cliente_nombre
                FROM supervisores s
                LEFT JOIN clientes c ON c.id = s.cliente_id
                WHERE s.estado = 'ACTIVO' AND s.cliente_id = $1
                ORDER BY s.nombre`;
      params = [Number(cliente_id)];
    } else {
      query = `SELECT s.*, c.nombre AS cliente_nombre
                FROM supervisores s
                LEFT JOIN clientes c ON c.id = s.cliente_id
                WHERE s.estado = 'ACTIVO'
                ORDER BY s.nombre`;
      params = [];
    }

    const result = await conn.query(query, params);
    res.status(200).json({ ok: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};


const obtenerPorId = async (req, res) => {
  const { id_supervisor } = req.params;
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.query('SELECT * FROM supervisores WHERE id = $1', [Number(id_supervisor)]);
    if (result.rows.length === 0) return res.status(404).json({ ok: false, mensaje: 'Supervisor no encontrado.' });
    res.status(200).json({ ok: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

const insertar = async (req, res) => {
  const { nombre, telefono, cliente_id } = req.body;
  if (!nombre || String(nombre).trim().length < 3) {
    return res.status(400).json({ ok: false, mensaje: 'El nombre del supervisor es requerido (mínimo 3 caracteres).' });
  }

  let conn;
  try {
    conn = await getConnection();

    const existe = await conn.query('SELECT id FROM supervisores WHERE nombre = $1', [nombre.trim()]);
    if (existe.rows.length > 0) {
      return res.status(409).json({ ok: false, mensaje: 'Ese nombre de supervisor ya existe.' });
    }

    const result = await conn.query(
      `INSERT INTO supervisores (nombre, telefono, cliente_id, estado) VALUES ($1, $2, $3, 'ACTIVO') RETURNING id`,
      [nombre.trim(), telefono || null, cliente_id || null]
    );

    await registrarAuditoria(conn, {
      tabla: 'SUPERVISORES',
      operacion: 'INSERT',
      idRegistro: result.rows[0].id,
      descripcion: `Nuevo supervisor creado: ${nombre}`,
      ...usuarioAuditoria(req),
    });

    res.status(201).json({ ok: true, mensaje: 'Supervisor creado correctamente.', data: { id: result.rows[0].id } });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

const actualizar = async (req, res) => {
  const { id_supervisor } = req.params;
  const { nombre, telefono, cliente_id, estado } = req.body;
  if (!nombre || String(nombre).trim().length < 3) {
    return res.status(400).json({ ok: false, mensaje: 'El nombre del supervisor es requerido (mínimo 3 caracteres).' });
  }

  let conn;
  try {
    conn = await getConnection();
    await conn.query(
      `UPDATE supervisores SET nombre=$1, telefono=$2, cliente_id=$3, estado=$4 WHERE id=$5`,
      [nombre.trim(), telefono || null, cliente_id || null, estado || 'ACTIVO', Number(id_supervisor)]
    );

    await registrarAuditoria(conn, {
      tabla: 'SUPERVISORES',
      operacion: 'UPDATE',
      idRegistro: id_supervisor,
      descripcion: `Supervisor ${id_supervisor} actualizado`,
      ...usuarioAuditoria(req),
    });

    res.status(200).json({ ok: true, mensaje: 'Supervisor actualizado correctamente.' });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

const eliminar = async (req, res) => {
  const { id_supervisor } = req.params;
  let conn;
  try {
    conn = await getConnection();
    await conn.query(`UPDATE supervisores SET estado = 'INACTIVO' WHERE id = $1`, [Number(id_supervisor)]);

    await registrarAuditoria(conn, {
      tabla: 'SUPERVISORES',
      operacion: 'DELETE',
      idRegistro: id_supervisor,
      descripcion: `Supervisor ${id_supervisor} eliminado`,
      ...usuarioAuditoria(req),
    });

    res.status(200).json({ ok: true, mensaje: 'Supervisor eliminado correctamente.' });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

module.exports = { listar, obtenerPorId, insertar, actualizar, eliminar };