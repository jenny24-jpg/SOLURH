// ============================================================
// controllers/asistenciaController.js
// ============================================================
const { getConnection, closeConnection } = require('../config/db');
const { registrar: registrarAuditoria } = require('./auditoriaController');

function usuarioAuditoria(req) {
  return { usuarioId: req.usuario?.id || null, usuarioNombre: req.usuario?.username || 'Sistema' };
}

const SELECT_BASE = `
  SELECT a.*, e.nombres, e.apellidos, c.nombre AS cliente, s.nombre AS supervisor
  FROM asistencias a
  LEFT JOIN empleados e ON e.id = a.empleado_id
  LEFT JOIN clientes c ON c.id = e.cliente_id
  LEFT JOIN supervisores s ON s.id = e.supervisor_id
`;

const listar = async (req, res) => {
  const { supervisor_id } = req.query;
  let conn;
  try {
    conn = await getConnection();

    const query = supervisor_id
      ? `${SELECT_BASE} WHERE e.supervisor_id = $1 ORDER BY a.fecha DESC, a.hora_entrada DESC`
      : `${SELECT_BASE} ORDER BY a.fecha DESC, a.hora_entrada DESC`;

    const params = supervisor_id ? [Number(supervisor_id)] : [];

    const result = await conn.query(query, params);
    res.status(200).json({ ok: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

const obtenerPorId = async (req, res) => {
  const { id_asistencia } = req.params;
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.query(`${SELECT_BASE} WHERE a.id = $1`, [Number(id_asistencia)]);
    if (result.rows.length === 0) return res.status(404).json({ ok: false, mensaje: 'Asistencia no encontrada.' });
    res.status(200).json({ ok: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

const listarPorEmpleado = async (req, res) => {
  const { empleado_id } = req.params;
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.query(
      `${SELECT_BASE} WHERE a.empleado_id = $1 ORDER BY a.fecha DESC`,
      [Number(empleado_id)]
    );
    res.status(200).json({ ok: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

const insertar = async (req, res) => {
  const { empleado_id, fecha, hora_entrada, hora_salida, estado, observaciones } = req.body;

  if (!empleado_id) {
    return res.status(400).json({ ok: false, mensaje: 'El empleado es requerido.' });
  }
  if (!fecha) {
    return res.status(400).json({ ok: false, mensaje: 'La fecha es requerida.' });
  }

  let conn;
  try {
    conn = await getConnection();
    const result = await conn.query(
      `INSERT INTO asistencias (empleado_id, fecha, hora_entrada, hora_salida, estado, observaciones, created_at)
       VALUES ($1,$2,$3,$4,$5,$6, NOW()) RETURNING id`,
      [
        Number(empleado_id),
        fecha,
        hora_entrada || null,
        hora_salida || null,
        estado || 'PRESENTE',
        observaciones || null,
      ]
    );

    await registrarAuditoria(conn, {
      tabla: 'ASISTENCIAS',
      operacion: 'INSERT',
      idRegistro: result.rows[0].id,
      descripcion: `Asistencia registrada para empleado ${empleado_id} el ${fecha}`,
      ...usuarioAuditoria(req),
    });

    res.status(201).json({ ok: true, mensaje: 'Asistencia registrada correctamente.' });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

const marcarSalida = async (req, res) => {
  const { id_asistencia } = req.params;
  const { hora_salida } = req.body;

  if (!hora_salida) {
    return res.status(400).json({ ok: false, mensaje: 'La hora de salida es requerida.' });
  }

  let conn;
  try {
    conn = await getConnection();
    const result = await conn.query(
      `UPDATE asistencias SET hora_salida = $1 WHERE id = $2 RETURNING id`,
      [hora_salida, Number(id_asistencia)]
    );
    if (result.rowCount === 0) return res.status(404).json({ ok: false, mensaje: 'Asistencia no encontrada.' });

    await registrarAuditoria(conn, {
      tabla: 'ASISTENCIAS',
      operacion: 'UPDATE',
      idRegistro: id_asistencia,
      descripcion: `Hora de salida registrada para asistencia ${id_asistencia}`,
      ...usuarioAuditoria(req),
    });

    res.status(200).json({ ok: true, mensaje: 'Hora de salida registrada correctamente.' });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

const actualizar = async (req, res) => {
  const { id_asistencia } = req.params;
  const { fecha, hora_entrada, hora_salida, estado, observaciones } = req.body;

  if (!fecha) {
    return res.status(400).json({ ok: false, mensaje: 'La fecha es requerida.' });
  }

  let conn;
  try {
    conn = await getConnection();
    await conn.query(
      `UPDATE asistencias SET fecha=$1, hora_entrada=$2, hora_salida=$3, estado=$4, observaciones=$5 WHERE id=$6`,
      [fecha, hora_entrada || null, hora_salida || null, estado || 'PRESENTE', observaciones || null, Number(id_asistencia)]
    );

    await registrarAuditoria(conn, {
      tabla: 'ASISTENCIAS',
      operacion: 'UPDATE',
      idRegistro: id_asistencia,
      descripcion: `Asistencia ${id_asistencia} actualizada`,
      ...usuarioAuditoria(req),
    });

    res.status(200).json({ ok: true, mensaje: 'Asistencia actualizada correctamente.' });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

const eliminar = async (req, res) => {
  const { id_asistencia } = req.params;
  let conn;
  try {
    conn = await getConnection();
    await conn.query(`DELETE FROM asistencias WHERE id = $1`, [Number(id_asistencia)]);

    await registrarAuditoria(conn, {
      tabla: 'ASISTENCIAS',
      operacion: 'DELETE',
      idRegistro: id_asistencia,
      descripcion: `Asistencia ${id_asistencia} eliminada`,
      ...usuarioAuditoria(req),
    });

    res.status(200).json({ ok: true, mensaje: 'Asistencia eliminada correctamente.' });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

module.exports = { listar, obtenerPorId, listarPorEmpleado, insertar, marcarSalida, actualizar, eliminar };