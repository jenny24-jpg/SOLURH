  // ============================================================
// controllers/empleadoController.js
// ============================================================
const { getConnection, closeConnection } = require('../config/db');
const { registrar: registrarAuditoria } = require('./auditoriaController');

function usuarioAuditoria(req) {
  return { usuarioId: req.usuario?.id || null, usuarioNombre: req.usuario?.username || 'Sistema' };
}

// Trae también el nombre del cliente y del supervisor, para no tener
// que hacer consultas extra desde el frontend.
const SELECT_BASE = `
  SELECT e.*, c.nombre AS nombre_cliente, s.nombre AS nombre_supervisor
  FROM empleados e
  LEFT JOIN clientes c ON c.id = e.cliente_id
  LEFT JOIN supervisores s ON s.id = e.supervisor_id
`;

const listar = async (req, res) => {
  let conn;
  try {
    conn = await getConnection();

    // Si quien consulta es un usuario de tipo "supervisor" (rol_id === 2),
    // solo ve los empleados que están bajo su propio supervisor_id.
    const esSupervisor = Number(req.usuario?.rol_id) === 2;
    const supervisorId = req.usuario?.supervisor_id;

    const query = esSupervisor && supervisorId
      ? `${SELECT_BASE} WHERE e.estado = 'ACTIVO' AND e.supervisor_id = $1 ORDER BY e.apellidos, e.nombres`
      : `${SELECT_BASE} WHERE e.estado = 'ACTIVO' ORDER BY e.apellidos, e.nombres`;

    const params = esSupervisor && supervisorId ? [Number(supervisorId)] : [];

    const result = await conn.query(query, params);
    const data = result.rows.map(({ jornada, ...rest }) => rest);
    res.status(200).json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

const obtenerPorId = async (req, res) => {
  const { id_empleado } = req.params;
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.query(`${SELECT_BASE} WHERE e.id = $1`, [Number(id_empleado)]);
    if (result.rows.length === 0) return res.status(404).json({ ok: false, mensaje: 'Empleado no encontrado.' });
    const { jornada, ...row } = result.rows[0];
    res.status(200).json({ ok: true, data: row });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

const insertar = async (req, res) => {
  const {
    nombres, apellidos, dpi, nit,
    cliente_id, supervisor_id,
    fecha_ingreso, salario, observaciones, fotografia,
    banco, cuenta, tipo_cuenta, nombre_cuenta,
  } = req.body;

  if (!nombres || String(nombres).trim().length < 2) {
    return res.status(400).json({ ok: false, mensaje: 'El nombre es requerido.' });
  }
  if (!apellidos || String(apellidos).trim().length < 2) {
    return res.status(400).json({ ok: false, mensaje: 'El apellido es requerido.' });
  }
  if (!dpi) {
    return res.status(400).json({ ok: false, mensaje: 'El DPI es requerido.' });
  }
  if (!cliente_id) {
    return res.status(400).json({ ok: false, mensaje: 'El cliente es requerido.' });
  }
  if (!supervisor_id) {
    return res.status(400).json({ ok: false, mensaje: 'El supervisor es requerido.' });
  }
  if (!fecha_ingreso) {
    return res.status(400).json({ ok: false, mensaje: 'La fecha de ingreso es requerida.' });
  }

  let conn;
  try {
    conn = await getConnection();
    const result = await conn.query(
      `INSERT INTO empleados
        (nombres, apellidos, dpi, nit, cliente_id, supervisor_id, fecha_ingreso, salario, estado, observaciones, fotografia, banco, cuenta, tipo_cuenta, nombre_cuenta, fecha_creacion)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'ACTIVO',$9,$10,$11,$12,$13,$14, NOW())
       RETURNING id`,
      [
        nombres.trim(),
        apellidos.trim(),
        dpi,
        nit || null,
        Number(cliente_id),
        Number(supervisor_id),
        fecha_ingreso,
        salario || null,
        observaciones || null,
        fotografia || null,
        banco || null,
        cuenta || null,
        tipo_cuenta || null,
        nombre_cuenta || null,
      ]
    );

    await registrarAuditoria(conn, {
      tabla: 'EMPLEADOS',
      operacion: 'INSERT',
      idRegistro: result.rows[0].id,
      descripcion: `Nuevo empleado creado: ${nombres} ${apellidos}`,
      ...usuarioAuditoria(req),
    });

    res.status(201).json({ ok: true, mensaje: 'Empleado creado correctamente.' });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ ok: false, mensaje: 'El DPI ya está registrado.' });
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

const actualizar = async (req, res) => {
  const { id_empleado } = req.params;
  const {
    nombres, apellidos, dpi, nit,
    cliente_id, supervisor_id,
    fecha_ingreso, salario, estado, observaciones, fotografia,
    banco, cuenta, tipo_cuenta, nombre_cuenta,
  } = req.body;

  if (!nombres || String(nombres).trim().length < 2) {
    return res.status(400).json({ ok: false, mensaje: 'El nombre es requerido.' });
  }
  if (!apellidos || String(apellidos).trim().length < 2) {
    return res.status(400).json({ ok: false, mensaje: 'El apellido es requerido.' });
  }

  let conn;
  try {
    conn = await getConnection();
    await conn.query(
      `UPDATE empleados SET
        nombres=$1, apellidos=$2, dpi=$3, nit=$4,
        cliente_id=$5, supervisor_id=$6,
        fecha_ingreso=$7, salario=$8, estado=$9, observaciones=$10, fotografia=$11,
        banco=$12, cuenta=$13, tipo_cuenta=$14, nombre_cuenta=$15
       WHERE id=$16`,
      [
        nombres.trim(),
        apellidos.trim(),
        dpi,
        nit || null,
        Number(cliente_id),
        Number(supervisor_id),
        fecha_ingreso,
        salario || null,
        estado || 'ACTIVO',
        observaciones || null,
        fotografia || null,
        banco || null,
        cuenta || null,
        tipo_cuenta || null,
        nombre_cuenta || null,
        Number(id_empleado),
      ]
    );

    await registrarAuditoria(conn, {
      tabla: 'EMPLEADOS',
      operacion: 'UPDATE',
      idRegistro: id_empleado,
      descripcion: `Empleado ${id_empleado} actualizado`,
      ...usuarioAuditoria(req),
    });

    res.status(200).json({ ok: true, mensaje: 'Empleado actualizado correctamente.' });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ ok: false, mensaje: 'El DPI ya está registrado.' });
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

const eliminar = async (req, res) => {
  const { id_empleado } = req.params;
  const { motivo_baja } = req.body;
  let conn;
  try {
    conn = await getConnection();
    await conn.query(
      `UPDATE empleados SET estado = 'INACTIVO', fecha_baja = NOW(), motivo_baja = $1 WHERE id = $2`,
      [motivo_baja || null, Number(id_empleado)]
    );

    await registrarAuditoria(conn, {
      tabla: 'EMPLEADOS',
      operacion: 'DELETE',
      idRegistro: id_empleado,
      descripcion: `Empleado ${id_empleado} dado de baja`,
      ...usuarioAuditoria(req),
    });

    res.status(200).json({ ok: true, mensaje: 'Empleado dado de baja correctamente.' });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

module.exports = { listar, obtenerPorId, insertar, actualizar, eliminar };