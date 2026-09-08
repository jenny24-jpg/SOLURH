// ============================================================
// controllers/notificacionLeidaController.js
// ============================================================
const { getConnection, closeConnection } = require('../config/db');

const listar = async (req, res) => {
  const usuarioId = req.usuario?.id;
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.query(
      `SELECT notif_id FROM notificaciones_leidas WHERE usuario_id = $1`,
      [usuarioId]
    );
    res.status(200).json({ ok: true, data: result.rows.map(r => r.notif_id) });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

const marcar = async (req, res) => {
  const usuarioId = req.usuario?.id;
  const { notif_id } = req.body;

  if (!notif_id) {
    return res.status(400).json({ ok: false, mensaje: 'notif_id es requerido.' });
  }

  let conn;
  try {
    conn = await getConnection();
    await conn.query(
      `INSERT INTO notificaciones_leidas (usuario_id, notif_id)
       VALUES ($1, $2)
       ON CONFLICT (usuario_id, notif_id) DO NOTHING`,
      [usuarioId, notif_id]
    );
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

const marcarVarias = async (req, res) => {
  const usuarioId = req.usuario?.id;
  const { notif_ids } = req.body;

  if (!Array.isArray(notif_ids) || notif_ids.length === 0) {
    return res.status(400).json({ ok: false, mensaje: 'notif_ids debe ser un arreglo no vacío.' });
  }

  let conn;
  try {
    conn = await getConnection();
    await conn.query(
      `INSERT INTO notificaciones_leidas (usuario_id, notif_id)
       SELECT $1, UNNEST($2::text[])
       ON CONFLICT (usuario_id, notif_id) DO NOTHING`,
      [usuarioId, notif_ids]
    );
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

module.exports = { listar, marcar, marcarVarias };