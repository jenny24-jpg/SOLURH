// ============================================================
// controllers/documentoEmpleadoController.js
// ============================================================
const { getConnection, closeConnection } = require('../config/db');
const { registrar: registrarAuditoria } = require('./auditoriaController');

function usuarioAuditoria(req) {
  return { usuarioId: req.usuario?.id || null, usuarioNombre: req.usuario?.username || 'Sistema' };
}

const SELECT_BASE = `
  SELECT d.*, e.nombres, e.apellidos
  FROM documentos_empleado d
  LEFT JOIN empleados e ON e.id = d.empleado_id
`;

const listar = async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.query(`${SELECT_BASE} ORDER BY d.fecha_subida DESC`);
    res.status(200).json({ ok: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

const obtenerPorId = async (req, res) => {
  const { id_documento } = req.params;
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.query(`${SELECT_BASE} WHERE d.id = $1`, [Number(id_documento)]);
    if (result.rows.length === 0) return res.status(404).json({ ok: false, mensaje: 'Documento no encontrado.' });
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
      `${SELECT_BASE} WHERE d.empleado_id = $1 ORDER BY d.fecha_subida DESC`,
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
  const { empleado_id, tipo_documento, archivo_url, observaciones } = req.body;

  if (!empleado_id) {
    return res.status(400).json({ ok: false, mensaje: 'El empleado es requerido.' });
  }
  if (!tipo_documento || String(tipo_documento).trim().length < 2) {
    return res.status(400).json({ ok: false, mensaje: 'El tipo de documento es requerido.' });
  }
  if (!archivo_url) {
    return res.status(400).json({ ok: false, mensaje: 'El archivo es requerido.' });
  }

  let conn;
  try {
    conn = await getConnection();
    const result = await conn.query(
      `INSERT INTO documentos_empleado (empleado_id, tipo_documento, archivo_url, fecha_subida, observaciones)
       VALUES ($1,$2,$3, NOW(), $4) RETURNING id`,
      [Number(empleado_id), tipo_documento.trim(), archivo_url, observaciones || null]
    );

    await registrarAuditoria(conn, {
      tabla: 'DOCUMENTOS_EMPLEADO',
      operacion: 'INSERT',
      idRegistro: result.rows[0].id,
      descripcion: `Documento "${tipo_documento}" subido para empleado ${empleado_id}`,
      ...usuarioAuditoria(req),
    });

    res.status(201).json({ ok: true, mensaje: 'Documento registrado correctamente.' });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

const actualizar = async (req, res) => {
  const { id_documento } = req.params;
  const { tipo_documento, archivo_url, observaciones } = req.body;

  if (!tipo_documento || String(tipo_documento).trim().length < 2) {
    return res.status(400).json({ ok: false, mensaje: 'El tipo de documento es requerido.' });
  }

  let conn;
  try {
    conn = await getConnection();
    await conn.query(
      `UPDATE documentos_empleado SET tipo_documento=$1, archivo_url=$2, observaciones=$3 WHERE id=$4`,
      [tipo_documento.trim(), archivo_url || null, observaciones || null, Number(id_documento)]
    );

    await registrarAuditoria(conn, {
      tabla: 'DOCUMENTOS_EMPLEADO',
      operacion: 'UPDATE',
      idRegistro: id_documento,
      descripcion: `Documento ${id_documento} actualizado`,
      ...usuarioAuditoria(req),
    });

    res.status(200).json({ ok: true, mensaje: 'Documento actualizado correctamente.' });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

const eliminar = async (req, res) => {
  const { id_documento } = req.params;
  let conn;
  try {
    conn = await getConnection();
    await conn.query(`DELETE FROM documentos_empleado WHERE id = $1`, [Number(id_documento)]);

    await registrarAuditoria(conn, {
      tabla: 'DOCUMENTOS_EMPLEADO',
      operacion: 'DELETE',
      idRegistro: id_documento,
      descripcion: `Documento ${id_documento} eliminado`,
      ...usuarioAuditoria(req),
    });

    res.status(200).json({ ok: true, mensaje: 'Documento eliminado correctamente.' });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

module.exports = { listar, obtenerPorId, listarPorEmpleado, insertar, actualizar, eliminar };