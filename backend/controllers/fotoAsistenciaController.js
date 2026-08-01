// ============================================================
// controllers/fotoAsistenciaController.js
// ============================================================
const { getConnection, closeConnection } = require('../config/db');
const { registrar: registrarAuditoria } = require('./auditoriaController');

function usuarioAuditoria(req) {
  return { usuarioId: req.usuario?.id || null, usuarioNombre: req.usuario?.username || 'Sistema' };
}

// Ahora la foto se liga directo a un supervisor y una fecha (no a un
// empleado ni a una asistencia individual). El cliente se obtiene
// automáticamente a través del supervisor.
const SELECT_BASE = `
  SELECT
    f.*,
    s.nombre AS supervisor,
    c.nombre AS cliente
  FROM fotos_asistencia f
  LEFT JOIN supervisores s ON s.id = f.supervisor_id
  LEFT JOIN clientes c ON c.id = s.cliente_id
`;

const listar = async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.query(`${SELECT_BASE} ORDER BY f.fecha_subida DESC`);
    res.status(200).json({ ok: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

const obtenerPorId = async (req, res) => {
  const { id_foto } = req.params;
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.query(`${SELECT_BASE} WHERE f.id = $1`, [Number(id_foto)]);
    if (result.rows.length === 0) return res.status(404).json({ ok: false, mensaje: 'Foto no encontrada.' });
    res.status(200).json({ ok: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

// Se deja por compatibilidad, aunque este flujo ya no usa asistencia_id
const listarPorAsistencia = async (req, res) => {
  const { asistencia_id } = req.params;
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.query(
      `SELECT * FROM fotos_asistencia WHERE asistencia_id = $1 ORDER BY intento`,
      [Number(asistencia_id)]
    );
    res.status(200).json({ ok: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

const insertar = async (req, res) => {
  const { supervisor_id, fecha, url_foto, observacion } = req.body;

  if (!supervisor_id) {
    return res.status(400).json({ ok: false, mensaje: 'El supervisor es requerido.' });
  }
  if (!fecha) {
    return res.status(400).json({ ok: false, mensaje: 'La fecha es requerida.' });
  }
  if (!url_foto) {
    return res.status(400).json({ ok: false, mensaje: 'La foto es requerida.' });
  }

  let conn;
  try {
    conn = await getConnection();

    const conteo = await conn.query(
      `SELECT COUNT(*)::int AS total FROM fotos_asistencia WHERE supervisor_id = $1 AND fecha = $2`,
      [Number(supervisor_id), fecha]
    );
    const siguienteIntento = (conteo.rows[0]?.total || 0) + 1;

    const result = await conn.query(
      `INSERT INTO fotos_asistencia (supervisor_id, fecha, intento, url_foto, fecha_subida, observacion)
       VALUES ($1,$2,$3,$4, NOW(), $5) RETURNING id`,
      [Number(supervisor_id), fecha, siguienteIntento, url_foto, observacion || null]
    );

    await registrarAuditoria(conn, {
      tabla: 'FOTOS_ASISTENCIA',
      operacion: 'INSERT',
      idRegistro: result.rows[0].id,
      descripcion: `Foto registrada para supervisor ${supervisor_id} el ${fecha} (intento ${siguienteIntento})`,
      ...usuarioAuditoria(req),
    });

    res.status(201).json({ ok: true, mensaje: 'Foto registrada correctamente.', data: { id: result.rows[0].id } });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

const eliminar = async (req, res) => {
  const { id_foto } = req.params;
  let conn;
  try {
    conn = await getConnection();
    await conn.query(`DELETE FROM fotos_asistencia WHERE id = $1`, [Number(id_foto)]);

    await registrarAuditoria(conn, {
      tabla: 'FOTOS_ASISTENCIA',
      operacion: 'DELETE',
      idRegistro: id_foto,
      descripcion: `Foto ${id_foto} eliminada`,
      ...usuarioAuditoria(req),
    });

    res.status(200).json({ ok: true, mensaje: 'Foto eliminada correctamente.' });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

module.exports = { listar, obtenerPorId, listarPorAsistencia, insertar, eliminar };