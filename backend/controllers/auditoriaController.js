// ============================================================
// controllers/auditoriaController.js (PostgreSQL)
// ============================================================
const { getConnection, closeConnection } = require('../config/db');

// ── Registrar un evento (uso interno desde otros controllers) ──
const registrar = async (conn, { tabla, operacion, idRegistro, descripcion, usuarioId, usuarioNombre }) => {
  try {
    await conn.query(
      `INSERT INTO auditoria (tabla, operacion, id_registro, descripcion, usuario_id, usuario_nombre)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [tabla, operacion, idRegistro || null, descripcion || null, usuarioId || null, usuarioNombre || 'Sistema']
    );
  } catch (err) {
    console.error('[Auditoría] Error al registrar:', err.message);
    // No lanzar error — no interrumpir operación principal
  }
};

// ── GET /api/auditoria — Listar todos ──────────────
const listar = async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.query('SELECT * FROM auditoria ORDER BY fecha DESC');
    res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  } finally {
    await closeConnection(conn);
  }
};

// ── GET /api/auditoria/recientes?limite=50 ─────────
const listarRecientes = async (req, res) => {
  const limite = Math.min(parseInt(req.query.limite) || 50, 200);
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.query('SELECT * FROM auditoria ORDER BY fecha DESC LIMIT $1', [limite]);
    res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  } finally {
    await closeConnection(conn);
  }
};

// ── GET /api/auditoria/tabla/:tabla ────────────────
const listarPorTabla = async (req, res) => {
  const { tabla } = req.params;
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.query('SELECT * FROM auditoria WHERE tabla = $1 ORDER BY fecha DESC', [tabla.toUpperCase()]);
    res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  } finally {
    await closeConnection(conn);
  }
};

// ── GET /api/auditoria/resumen-usuarios ────────────
const resumenUsuariosActivos = async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.query(`
      SELECT
        usuario_id,
        usuario_nombre,
        COUNT(*) AS total_acciones,
        SUM(CASE WHEN operacion = 'LOGIN' THEN 1 ELSE 0 END) AS total_logins,
        MAX(fecha) AS ultima_actividad
      FROM auditoria
      WHERE usuario_id IS NOT NULL
      GROUP BY usuario_id, usuario_nombre
      ORDER BY total_acciones DESC
    `);
    res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  } finally {
    await closeConnection(conn);
  }
};

module.exports = { registrar, listar, listarRecientes, listarPorTabla, resumenUsuariosActivos };