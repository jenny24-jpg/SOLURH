// ============================================================
// controllers/historialEmpleadoController.js
// ============================================================
const { getConnection, closeConnection } = require('../config/db');

const SELECT_BASE = `
  SELECT h.*, e.nombres, e.apellidos, e.supervisor_id, c.nombre AS cliente, s.nombre AS supervisor,
         u.nombre_completo AS usuario_nombre
  FROM historial_empleado h
  LEFT JOIN empleados e ON e.id = h.empleado_id
  LEFT JOIN clientes c ON c.id = e.cliente_id
  LEFT JOIN supervisores s ON s.id = e.supervisor_id
  LEFT JOIN usuarios u ON u.id = h.usuario_modifico
`;

// ── Consulta que usa el módulo "Bajas de Empleado" ──
// En vez de leer la tabla historial_empleado, lee directo de empleados,
// mostrando solo los que tienen una fecha de baja registrada, junto con
// su cliente y supervisor.
const SELECT_BAJAS = `
  SELECT
    e.id,
    e.id AS empleado_id,
    e.nombres,
    e.apellidos,
    e.fecha_ingreso,
e.estado,
e.fecha_baja AS fecha_de_baja,
    e.motivo_baja,
    e.supervisor_id,
    c.nombre AS cliente,
    s.nombre AS supervisor
  FROM empleados e
  LEFT JOIN clientes c ON c.id = e.cliente_id
  LEFT JOIN supervisores s ON s.id = e.supervisor_id
`;

const listar = async (req, res) => {
  let conn;
  try {
    conn = await getConnection();

    const esSupervisor = Number(req.usuario?.rol_id) === 2;
    const supervisorId = req.usuario?.supervisor_id;

    const query = esSupervisor && supervisorId
      ? `${SELECT_BAJAS} WHERE e.fecha_baja IS NOT NULL AND e.supervisor_id = $1 ORDER BY e.fecha_baja DESC`
      : `${SELECT_BAJAS} WHERE e.fecha_baja IS NOT NULL ORDER BY e.fecha_baja DESC`;

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
  const { id_historial } = req.params;
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.query(`${SELECT_BAJAS} WHERE e.id = $1`, [Number(id_historial)]);
    if (result.rows.length === 0) return res.status(404).json({ ok: false, mensaje: 'Registro no encontrado.' });
    res.status(200).json({ ok: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

// Trae todo el historial de cambios de un empleado específico
// (esta función se sigue usando para el historial de auditoría interno, sin cambios)
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

// ── Listar TODOS los cambios de historial (para el reporte general) ──
const listarCambios = async (req, res) => {
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

// Esta función NO se llama desde una ruta directamente —
// se usa internamente desde otros controladores (ej. al actualizar un
// empleado) para dejar constancia de qué cambió. SIN CAMBIOS.
async function registrarCambio(conn, { empleadoId, campoModificado, valorAnterior, valorNuevo, usuarioModifico }) {
  await conn.query(
    `INSERT INTO historial_empleado (empleado_id, campo_modificado, valor_anterior, valor_nuevo, usuario_modifico, fecha)
     VALUES ($1,$2,$3,$4,$5, NOW())`,
    [empleadoId, campoModificado, valorAnterior != null ? String(valorAnterior) : null, valorNuevo != null ? String(valorNuevo) : null, usuarioModifico || null]
  );
}

// ── Registrar una baja: actualiza el empleado directamente ──
const insertar = async (req, res) => {
  const { empleado_id, fecha_baja, motivo_baja } = req.body;

  if (!empleado_id) {
    return res.status(400).json({ ok: false, mensaje: 'El empleado es requerido.' });
  }
  if (!fecha_baja) {
    return res.status(400).json({ ok: false, mensaje: 'La fecha de baja es requerida.' });
  }
  if (!motivo_baja || String(motivo_baja).trim().length < 5) {
    return res.status(400).json({ ok: false, mensaje: 'El motivo debe tener al menos 5 caracteres.' });
  }

  let conn;
  try {
    conn = await getConnection();

    await conn.query(
      `UPDATE empleados SET fecha_baja = $1, motivo_baja = $2, estado = 'INACTIVO' WHERE id = $3`,
      [fecha_baja, motivo_baja.trim(), Number(empleado_id)]
    );

    await registrarCambio(conn, {
      empleadoId: Number(empleado_id),
      campoModificado: 'estado',
      valorAnterior: 'ACTIVO',
      valorNuevo: 'INACTIVO (baja)',
      usuarioModifico: req.usuario?.id || null,
    });

    res.status(201).json({ ok: true, mensaje: 'Baja registrada correctamente.' });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

// ── Editar una baja existente ──
const actualizar = async (req, res) => {
  const { id_historial } = req.params; // aquí llega el id del empleado
  const { fecha_baja, motivo_baja, estado } = req.body;

  if (!fecha_baja) {
    return res.status(400).json({ ok: false, mensaje: 'La fecha de baja es requerida.' });
  }
  if (!motivo_baja || String(motivo_baja).trim().length < 5) {
    return res.status(400).json({ ok: false, mensaje: 'El motivo debe tener al menos 5 caracteres.' });
  }

  let conn;
  try {
    conn = await getConnection();
    if (estado === 'ACTIVO') {

  await conn.query(
    `UPDATE empleados
     SET estado = 'ACTIVO',
         fecha_baja = NULL,
         motivo_baja = NULL
     WHERE id = $1`,
    [Number(id_historial)]
  );

  return res.status(200).json({
    ok: true,
    mensaje: 'Empleado reactivado correctamente.'
  });
}

await conn.query(
  `UPDATE empleados
   SET fecha_baja = $1,
       motivo_baja = $2,
       estado = 'INACTIVO'
   WHERE id = $3`,
  [fecha_baja, motivo_baja.trim(), Number(id_historial)]
);

res.status(200).json({
  ok: true,
  mensaje: 'Baja actualizada correctamente.'
});

    res.status(200).json({ ok: true, mensaje: 'Baja actualizada correctamente.' });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

// ── "Eliminar" un registro de baja = reactivar al empleado ──
const eliminar = async (req, res) => {
  const { id_historial } = req.params; // aquí llega el id del empleado

  let conn;
  try {
    conn = await getConnection();
    await conn.query(
      `UPDATE empleados SET fecha_baja = NULL, motivo_baja = NULL, estado = 'ACTIVO' WHERE id = $1`,
      [Number(id_historial)]
    );

    res.status(200).json({ ok: true, mensaje: 'Empleado reactivado correctamente.' });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

module.exports = { listar, obtenerPorId, listarPorEmpleado, listarCambios, insertar, actualizar, eliminar, registrarCambio };