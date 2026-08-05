// ============================================================
// controllers/asistenciaController.js
// ============================================================
const { getConnection, closeConnection } = require('../config/db');
const { registrar: registrarAuditoria } = require('./auditoriaController');

function usuarioAuditoria(req) {
  return { usuarioId: req.usuario?.id || null, usuarioNombre: req.usuario?.username || 'Sistema' };
}

const SELECT_BASE = `
  SELECT a.*, e.nombres, e.apellidos, c.nombre AS cliente, s.nombre AS supervisor,
         he.horas AS horas_extra
  FROM asistencias a
  LEFT JOIN empleados e ON e.id = a.empleado_id
  LEFT JOIN clientes c ON c.id = e.cliente_id
  LEFT JOIN supervisores s ON s.id = e.supervisor_id
  LEFT JOIN horas_extras he ON he.empleado_id = a.empleado_id AND he.fecha = a.fecha
`;

// ── Helper: crea, actualiza o elimina el registro de horas extra
// vinculado a un empleado + fecha, según el valor recibido ──────
async function sincronizarHorasExtra(conn, { empleado_id, fecha, horas_extra, usuarioId, usuarioNombre }) {
  const horas = horas_extra !== undefined && horas_extra !== null && horas_extra !== ''
    ? Number(horas_extra)
    : 0;

  const existente = await conn.query(
    `SELECT id FROM horas_extras WHERE empleado_id = $1 AND fecha = $2`,
    [Number(empleado_id), fecha]
  );

  if (horas > 0) {
    if (existente.rows.length > 0) {
      await conn.query(
        `UPDATE horas_extras SET horas = $1 WHERE id = $2`,
        [horas, existente.rows[0].id]
      );
    } else {
      await conn.query(
        `INSERT INTO horas_extras (empleado_id, fecha, horas, motivo, aprobado)
         VALUES ($1, $2, $3, $4, $5)`,
        [Number(empleado_id), fecha, horas, 'Registrado desde asistencia', false]
      );
    }

    await registrarAuditoria(conn, {
      tabla: 'HORAS_EXTRAS',
      operacion: existente.rows.length > 0 ? 'UPDATE' : 'INSERT',
      idRegistro: existente.rows[0]?.id || null,
      descripcion: `Horas extra (${horas}h) sincronizadas desde asistencia para empleado ${empleado_id} el ${fecha}`,
      usuarioId,
      usuarioNombre,
    });
  } else if (existente.rows.length > 0) {
    await conn.query(`DELETE FROM horas_extras WHERE id = $1`, [existente.rows[0].id]);

    await registrarAuditoria(conn, {
      tabla: 'HORAS_EXTRAS',
      operacion: 'DELETE',
      idRegistro: existente.rows[0].id,
      descripcion: `Horas extra eliminadas (quedaron en 0) para empleado ${empleado_id} el ${fecha}`,
      usuarioId,
      usuarioNombre,
    });
  }
}

const listar = async (req, res) => {
  let conn;
  try {
    conn = await getConnection();

    // Filtrado automático: si quien consulta es un usuario "supervisor",
    // solo ve las asistencias de empleados bajo su propio supervisor_id.
    const esSupervisor = Number(req.usuario?.rol_id) === 2;
    const supervisorIdUsuario = req.usuario?.supervisor_id;

    // Si además viene un supervisor_id explícito por query (uso admin/manual),
    // se respeta esa opción cuando quien consulta NO es un supervisor limitado.
    const supervisorIdQuery = req.query.supervisor_id;

    let query;
    let params;

    if (esSupervisor && supervisorIdUsuario) {
      query = `${SELECT_BASE} WHERE e.supervisor_id = $1 ORDER BY a.fecha DESC, a.hora_entrada DESC`;
      params = [Number(supervisorIdUsuario)];
    } else if (supervisorIdQuery) {
      query = `${SELECT_BASE} WHERE e.supervisor_id = $1 ORDER BY a.fecha DESC, a.hora_entrada DESC`;
      params = [Number(supervisorIdQuery)];
    } else {
      query = `${SELECT_BASE} ORDER BY a.fecha DESC, a.hora_entrada DESC`;
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
  const { empleado_id, fecha, hora_entrada, hora_salida, estado, observaciones, horas_extra } = req.body;

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

    await sincronizarHorasExtra(conn, {
      empleado_id,
      fecha,
      horas_extra,
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
  const { fecha, hora_entrada, hora_salida, estado, observaciones, empleado_id, horas_extra } = req.body;

  if (!fecha) {
    return res.status(400).json({ ok: false, mensaje: 'La fecha es requerida.' });
  }

  let conn;
  try {
    conn = await getConnection();

    let empleadoIdFinal = empleado_id;
    if (!empleadoIdFinal) {
      const actual = await conn.query(`SELECT empleado_id FROM asistencias WHERE id = $1`, [Number(id_asistencia)]);
      empleadoIdFinal = actual.rows[0]?.empleado_id;
    }

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

    if (empleadoIdFinal) {
      await sincronizarHorasExtra(conn, {
        empleado_id: empleadoIdFinal,
        fecha,
        horas_extra,
        ...usuarioAuditoria(req),
      });
    }

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