// ============================================================
// controllers/empleadoController.js
// ============================================================
const { getConnection, closeConnection } = require('../config/db');
const { registrar: registrarAuditoria } = require('./auditoriaController');

function usuarioAuditoria(req) {
  return { usuarioId: req.usuario?.id || null, usuarioNombre: req.usuario?.username || 'Sistema' };
}

// Trae también el nombre del cliente y de ambos supervisores, para no
// tener que hacer consultas extra desde el frontend.
const SELECT_BASE = `
  SELECT e.*, c.nombre AS cliente, c2.nombre AS cliente_2,
         s.nombre AS supervisor, s2.nombre AS supervisor_2
  FROM empleados e
  LEFT JOIN clientes c ON c.id = e.cliente_id
  LEFT JOIN clientes c2 ON c2.id = e.cliente_id_2
  LEFT JOIN supervisores s ON s.id = e.supervisor_id
  LEFT JOIN supervisores s2 ON s2.id = e.supervisor_id_2
`;

// Para un supervisor específico: muestra "Cliente" y "Supervisor" como
// la relación que corresponde A ESE supervisor (sea principal o segundo),
// para que cada quien vea su propia área correcta, no la del otro.
const SELECT_VISTA_SUPERVISOR = `
  SELECT e.*,
         CASE WHEN e.supervisor_id = $1 THEN c.nombre ELSE c2.nombre END AS cliente,
         CASE WHEN e.supervisor_id = $1 THEN s.nombre ELSE s2.nombre END AS supervisor
  FROM empleados e
  LEFT JOIN clientes c ON c.id = e.cliente_id
  LEFT JOIN clientes c2 ON c2.id = e.cliente_id_2
  LEFT JOIN supervisores s ON s.id = e.supervisor_id
  LEFT JOIN supervisores s2 ON s2.id = e.supervisor_id_2
`;

const listar = async (req, res) => {
  let conn;
  try {
    conn = await getConnection();

    // Si quien consulta es un usuario de tipo "supervisor" (rol_id === 2),
    // solo ve los empleados que están bajo su propio supervisor_id, ya sea
    // como supervisor principal o como segundo supervisor — y ve el cliente
    // que le corresponde a ÉL, no al otro supervisor.
    const esSupervisor = Number(req.usuario?.rol_id) === 2;
    const supervisorId = req.usuario?.supervisor_id;

    const query = esSupervisor && supervisorId
      ? `${SELECT_VISTA_SUPERVISOR} WHERE e.estado = 'ACTIVO' AND (e.supervisor_id = $1 OR e.supervisor_id_2 = $1) ORDER BY e.apellidos, e.nombres`
      : `${SELECT_BASE} WHERE e.estado = 'ACTIVO' ORDER BY e.apellidos, e.nombres`;

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
  const { id_empleado } = req.params;
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.query(`${SELECT_BASE} WHERE e.id = $1`, [Number(id_empleado)]);
    if (result.rows.length === 0) return res.status(404).json({ ok: false, mensaje: 'Empleado no encontrado.' });
    res.status(200).json({ ok: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

const insertar = async (req, res) => {
  const {
    nombres, apellidos, dpi, nit,
    cliente_id, cliente_id_2, supervisor_id, supervisor_id_2, jornada,
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
  if (supervisor_id_2 && Number(supervisor_id_2) === Number(supervisor_id)) {
    return res.status(400).json({ ok: false, mensaje: 'El segundo supervisor debe ser diferente al primero.' });
  }
  if (!jornada) {
    return res.status(400).json({ ok: false, mensaje: 'La jornada es requerida.' });
  }
  if (!fecha_ingreso) {
    return res.status(400).json({ ok: false, mensaje: 'La fecha de ingreso es requerida.' });
  }

  let conn;
  try {
    conn = await getConnection();
    const result = await conn.query(
      `INSERT INTO empleados
        (nombres, apellidos, dpi, nit, cliente_id, cliente_id_2, supervisor_id, supervisor_id_2, jornada, fecha_ingreso, salario, estado, observaciones, fotografia, banco, cuenta, tipo_cuenta, nombre_cuenta, fecha_creacion)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'ACTIVO',$12,$13,$14,$15,$16,$17, NOW())
       RETURNING id`,
      [
        nombres.trim(),
        apellidos.trim(),
        dpi,
        nit || null,
        Number(cliente_id),
        cliente_id_2 ? Number(cliente_id_2) : null,
        Number(supervisor_id),
        supervisor_id_2 ? Number(supervisor_id_2) : null,
        jornada,
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
    cliente_id, cliente_id_2, supervisor_id, supervisor_id_2, jornada,
    fecha_ingreso, salario, estado, observaciones, fotografia,
    banco, cuenta, tipo_cuenta, nombre_cuenta,
  } = req.body;

  if (!nombres || String(nombres).trim().length < 2) {
    return res.status(400).json({ ok: false, mensaje: 'El nombre es requerido.' });
  }
  if (!apellidos || String(apellidos).trim().length < 2) {
    return res.status(400).json({ ok: false, mensaje: 'El apellido es requerido.' });
  }
  if (supervisor_id_2 && Number(supervisor_id_2) === Number(supervisor_id)) {
    return res.status(400).json({ ok: false, mensaje: 'El segundo supervisor debe ser diferente al primero.' });
  }

  let conn;
  try {
    conn = await getConnection();
    await conn.query(
      `UPDATE empleados SET
        nombres=$1, apellidos=$2, dpi=$3, nit=$4,
        cliente_id=$5, cliente_id_2=$6, supervisor_id=$7, supervisor_id_2=$8, jornada=$9,
        fecha_ingreso=$10, salario=$11, estado=$12, observaciones=$13, fotografia=$14,
        banco=$15, cuenta=$16, tipo_cuenta=$17, nombre_cuenta=$18
       WHERE id=$19`,
      [
        nombres.trim(),
        apellidos.trim(),
        dpi,
        nit || null,
        Number(cliente_id),
        cliente_id_2 ? Number(cliente_id_2) : null,
        Number(supervisor_id),
        supervisor_id_2 ? Number(supervisor_id_2) : null,
        jornada,
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