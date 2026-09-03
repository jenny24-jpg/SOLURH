// ============================================================
// controllers/horaExtraController.js
// ============================================================
const { getConnection, closeConnection } = require('../config/db');
const { registrar: registrarAuditoria } = require('./auditoriaController');

function usuarioAuditoria(req) {
  return { usuarioId: req.usuario?.id || null, usuarioNombre: req.usuario?.username || 'Sistema' };
}

const SELECT_BASE = `
  SELECT h.*, e.nombres, e.apellidos, e.supervisor_id
  FROM horas_extras h
  LEFT JOIN empleados e ON e.id = h.empleado_id
`;

const listar = async (req, res) => {
  let conn;
  try {
    conn = await getConnection();

    const esSupervisor = Number(req.usuario?.rol_id) === 2;
    const supervisorId = req.usuario?.supervisor_id;

    const query = esSupervisor && supervisorId
      ? `${SELECT_BASE} WHERE e.supervisor_id = $1 ORDER BY h.fecha DESC`
      : `${SELECT_BASE} ORDER BY h.fecha DESC`;

    const params = esSupervisor && supervisorId ? [Number(supervisorId)] : [];

    const result = await conn.query(query, params);
    res.status(200).json({ ok: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

const obtenerPorId = async (req, res) => {
  const { id_hora_extra } = req.params;
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.query(`${SELECT_BASE} WHERE h.id = $1`, [Number(id_hora_extra)]);
    if (result.rows.length === 0) return res.status(404).json({ ok: false, mensaje: 'Registro no encontrado.' });
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
      `${SELECT_BASE} WHERE h.empleado_id = $1 ORDER BY h.fecha DESC`,
      [Number(empleado_id)]
    );
    res.status(200).json({ ok: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

// Normaliza horas_diurnas/horas_nocturnas recibidos del formulario nuevo
// (que ya no divide el registro en 2, sino que manda ambos valores juntos).
function leerHorasSplit(body) {
  const diurnas = body.horas_diurnas !== undefined && body.horas_diurnas !== null && body.horas_diurnas !== ''
    ? Number(body.horas_diurnas)
    : 0;
  const nocturnas = body.horas_nocturnas !== undefined && body.horas_nocturnas !== null && body.horas_nocturnas !== ''
    ? Number(body.horas_nocturnas)
    : 0;
  const total = diurnas + nocturnas;

  // tipo_hora_extra se conserva solo como campo legado (compatibilidad con
  // reportes/dashboard antiguos); no se usa para decidir qué columna llenar.
  const tipoLegacy = body.tipo_hora_extra
    || (nocturnas > 0 && diurnas === 0 ? 'Nocturna' : 'Diurna');

  return { diurnas, nocturnas, total, tipoLegacy };
}

const insertar = async (req, res) => {
  const { empleado_id, fecha, motivo } = req.body;
  const { diurnas, nocturnas, total, tipoLegacy } = leerHorasSplit(req.body);

  if (!empleado_id) {
    return res.status(400).json({ ok: false, mensaje: 'El empleado es requerido.' });
  }
  if (!fecha) {
    return res.status(400).json({ ok: false, mensaje: 'La fecha es requerida.' });
  }
  if (total <= 0) {
    return res.status(400).json({ ok: false, mensaje: 'Ingresa al menos horas diurnas o nocturnas.' });
  }

  let conn;
  try {
    conn = await getConnection();
    const result = await conn.query(
      `INSERT INTO horas_extras (empleado_id, fecha, horas, horas_diurnas, horas_nocturnas, motivo, aprobado, tipo_hora_extra, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,false,$7, NOW()) RETURNING id`,
      [Number(empleado_id), fecha, total, diurnas, nocturnas, motivo || null, tipoLegacy]
    );

    await registrarAuditoria(conn, {
      tabla: 'HORAS_EXTRAS',
      operacion: 'INSERT',
      idRegistro: result.rows[0].id,
      descripcion: `Horas extra registradas para empleado ${empleado_id} (D:${diurnas}h / N:${nocturnas}h)`,
      ...usuarioAuditoria(req),
    });

    res.status(201).json({ ok: true, mensaje: 'Horas extra registradas correctamente.' });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

// Aprobar o rechazar (solo cambia el booleano `aprobado`)
const cambiarAprobacion = async (req, res) => {
  const { id_hora_extra } = req.params;
  const { aprobado } = req.body;

  let conn;
  try {
    conn = await getConnection();
    const result = await conn.query(
      `UPDATE horas_extras SET aprobado = $1 WHERE id = $2 RETURNING id`,
      [Boolean(aprobado), Number(id_hora_extra)]
    );
    if (result.rowCount === 0) return res.status(404).json({ ok: false, mensaje: 'Registro no encontrado.' });

    await registrarAuditoria(conn, {
      tabla: 'HORAS_EXTRAS',
      operacion: 'UPDATE',
      idRegistro: id_hora_extra,
      descripcion: `Horas extra ${id_hora_extra} ${aprobado ? 'aprobadas' : 'rechazadas'}`,
      ...usuarioAuditoria(req),
    });

    res.status(200).json({ ok: true, mensaje: `Registro ${aprobado ? 'aprobado' : 'rechazado'} correctamente.` });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

const actualizar = async (req, res) => {
  const { id_hora_extra } = req.params;
  const { fecha, motivo } = req.body;
  const { diurnas, nocturnas, total, tipoLegacy } = leerHorasSplit(req.body);

  if (!fecha) {
    return res.status(400).json({ ok: false, mensaje: 'La fecha es requerida.' });
  }
  if (total <= 0) {
    return res.status(400).json({ ok: false, mensaje: 'Ingresa al menos horas diurnas o nocturnas.' });
  }

  let conn;
  try {
    conn = await getConnection();
    await conn.query(
      `UPDATE horas_extras SET fecha=$1, horas=$2, horas_diurnas=$3, horas_nocturnas=$4, motivo=$5, tipo_hora_extra=$6 WHERE id=$7`,
      [fecha, total, diurnas, nocturnas, motivo || null, tipoLegacy, Number(id_hora_extra)]
    );

    await registrarAuditoria(conn, {
      tabla: 'HORAS_EXTRAS',
      operacion: 'UPDATE',
      idRegistro: id_hora_extra,
      descripcion: `Registro de horas extra ${id_hora_extra} actualizado`,
      ...usuarioAuditoria(req),
    });

    res.status(200).json({ ok: true, mensaje: 'Registro actualizado correctamente.' });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

const eliminar = async (req, res) => {
  const { id_hora_extra } = req.params;
  let conn;
  try {
    conn = await getConnection();
    await conn.query(`DELETE FROM horas_extras WHERE id = $1`, [Number(id_hora_extra)]);

    await registrarAuditoria(conn, {
      tabla: 'HORAS_EXTRAS',
      operacion: 'DELETE',
      idRegistro: id_hora_extra,
      descripcion: `Registro de horas extra ${id_hora_extra} eliminado`,
      ...usuarioAuditoria(req),
    });

    res.status(200).json({ ok: true, mensaje: 'Registro eliminado correctamente.' });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

module.exports = { listar, obtenerPorId, listarPorEmpleado, insertar, cambiarAprobacion, actualizar, eliminar };
