// ============================================================
// controllers/encargadoAreaController.js
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
    const supervisorId = req.usuario?.supervisor_id;

    let query;
    let params;

    if (cliente_id) {
      query = `SELECT ea.*, c.nombre AS cliente_nombre
                FROM encargados_area ea
                LEFT JOIN clientes c ON c.id = ea.cliente_id
                WHERE ea.estado = 'ACTIVO' AND ea.cliente_id = $1`;
      params = [Number(cliente_id)];

      if (esSupervisor && supervisorId) {
        query += ` AND c.supervisor_id = $2`;
        params.push(Number(supervisorId));
      }
      query += ` ORDER BY ea.nombre`;
    } else if (esSupervisor && supervisorId) {
      query = `SELECT ea.*, c.nombre AS cliente_nombre
                FROM encargados_area ea
                LEFT JOIN clientes c ON c.id = ea.cliente_id
                WHERE ea.estado = 'ACTIVO' AND c.supervisor_id = $1
                ORDER BY ea.nombre`;
      params = [Number(supervisorId)];
    } else {
      query = `SELECT ea.*, c.nombre AS cliente_nombre
                FROM encargados_area ea
                LEFT JOIN clientes c ON c.id = ea.cliente_id
                WHERE ea.estado = 'ACTIVO'
                ORDER BY ea.nombre`;
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
  const { id_encargado_area } = req.params;
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.query('SELECT * FROM encargados_area WHERE id = $1', [Number(id_encargado_area)]);
    if (result.rows.length === 0) return res.status(404).json({ ok: false, mensaje: 'Encargado de área no encontrado.' });
    res.status(200).json({ ok: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

// Devuelve la lista de áreas ya usadas anteriormente (sin duplicados),
// para que el frontend pueda sugerirlas al crear un nuevo encargado.
const listarAreas = async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.query(
      `SELECT DISTINCT area FROM encargados_area WHERE area IS NOT NULL AND area <> '' ORDER BY area`
    );
    res.status(200).json({ ok: true, data: result.rows.map(r => r.area) });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

const insertar = async (req, res) => {
  const { nombre, area, cliente_id, telefono } = req.body;

  if (!nombre || String(nombre).trim().length < 3) {
    return res.status(400).json({ ok: false, mensaje: 'El nombre del encargado es requerido (mínimo 3 caracteres).' });
  }
  if (!area || String(area).trim().length < 2) {
    return res.status(400).json({ ok: false, mensaje: 'El área es requerida.' });
  }
  if (!cliente_id) {
    return res.status(400).json({ ok: false, mensaje: 'El cliente es requerido.' });
  }

  let conn;
  try {
    conn = await getConnection();

    const result = await conn.query(
      `INSERT INTO encargados_area (nombre, area, cliente_id, telefono, estado, created_at)
       VALUES ($1, $2, $3, $4, 'ACTIVO', NOW()) RETURNING id`,
      [nombre.trim(), area.trim(), Number(cliente_id), telefono || null]
    );

    await registrarAuditoria(conn, {
      tabla: 'ENCARGADOS_AREA',
      operacion: 'INSERT',
      idRegistro: result.rows[0].id,
      descripcion: `Nuevo encargado de área creado: ${nombre} (${area})`,
      ...usuarioAuditoria(req),
    });

    res.status(201).json({ ok: true, mensaje: 'Encargado de área creado correctamente.', data: { id: result.rows[0].id } });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

const actualizar = async (req, res) => {
  const { id_encargado_area } = req.params;
  const { nombre, area, cliente_id, telefono, estado } = req.body;

  if (!nombre || String(nombre).trim().length < 3) {
    return res.status(400).json({ ok: false, mensaje: 'El nombre del encargado es requerido (mínimo 3 caracteres).' });
  }
  if (!area || String(area).trim().length < 2) {
    return res.status(400).json({ ok: false, mensaje: 'El área es requerida.' });
  }

  let conn;
  try {
    conn = await getConnection();
    await conn.query(
      `UPDATE encargados_area SET nombre=$1, area=$2, cliente_id=$3, telefono=$4, estado=$5 WHERE id=$6`,
      [nombre.trim(), area.trim(), cliente_id || null, telefono || null, estado || 'ACTIVO', Number(id_encargado_area)]
    );

    await registrarAuditoria(conn, {
      tabla: 'ENCARGADOS_AREA',
      operacion: 'UPDATE',
      idRegistro: id_encargado_area,
      descripcion: `Encargado de área ${id_encargado_area} actualizado`,
      ...usuarioAuditoria(req),
    });

    res.status(200).json({ ok: true, mensaje: 'Encargado de área actualizado correctamente.' });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

const eliminar = async (req, res) => {
  const { id_encargado_area } = req.params;
  let conn;
  try {
    conn = await getConnection();
    await conn.query(`UPDATE encargados_area SET estado = 'INACTIVO' WHERE id = $1`, [Number(id_encargado_area)]);

    await registrarAuditoria(conn, {
      tabla: 'ENCARGADOS_AREA',
      operacion: 'DELETE',
      idRegistro: id_encargado_area,
      descripcion: `Encargado de área ${id_encargado_area} eliminado`,
      ...usuarioAuditoria(req),
    });

    res.status(200).json({ ok: true, mensaje: 'Encargado de área eliminado correctamente.' });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

module.exports = { listar, obtenerPorId, listarAreas, insertar, actualizar, eliminar };