// ============================================================
// controllers/fotoAsistenciaController.js
// ============================================================
const { getConnection, closeConnection } = require('../config/db');
const { registrar: registrarAuditoria } = require('./auditoriaController');
const supabase = require('../config/supabaseClient');

const BUCKET = 'documentos';
const CARPETA_FOTOS = 'asistencias';

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

    const esSupervisor = Number(req.usuario?.rol_id) === 2;
    const supervisorId = req.usuario?.supervisor_id;

    const query = esSupervisor && supervisorId
      ? `${SELECT_BASE} WHERE f.supervisor_id = $1 ORDER BY f.fecha_subida DESC`
      : `${SELECT_BASE} ORDER BY f.fecha_subida DESC`;

    const params = esSupervisor && supervisorId ? [Number(supervisorId)] : [];

    const result = await conn.query(query, params);
    res.status(200).json({ ok: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    await closeConnection(conn);
  }
};

// Lista TODO lo que existe físicamente en el bucket de Supabase (carpeta
// "asistencias"), sin importar si el formulario llegó a guardarse en la
// base de datos. Cuando existe un registro en fotos_asistencia que
// corresponde a ese archivo, se le agregan sus datos (supervisor, cliente,
// fecha, observación, intento); si no, se muestra igual pero marcado como
// "sin registro" con los datos que da el propio Storage (nombre y fecha
// de subida).
const EXTENSIONES_IMAGEN = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic'];
const esImagen = (nombre) => EXTENSIONES_IMAGEN.some(ext => nombre.toLowerCase().endsWith(ext));

const listarTodasDeStorage = async (req, res) => {
  try {
    // 1) Fotos ya organizadas en su propia carpeta (subidas nuevas, en adelante).
    const { data: archivosCarpeta, error: errCarpeta } = await supabase.storage
      .from(BUCKET)
      .list(CARPETA_FOTOS, { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } });
    if (errCarpeta) {
      return res.status(500).json({ ok: false, mensaje: `Error al leer Supabase Storage: ${errCarpeta.message}` });
    }

    // 2) Fotos "viejas" que quedaron sueltas en la raíz del bucket (subidas
    // antes de existir la carpeta "asistencias"). Se filtran solo imágenes,
    // porque en la raíz también hay documentos de empleados (PDFs, etc).
    const { data: archivosRaiz, error: errRaiz } = await supabase.storage
      .from(BUCKET)
      .list('', { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } });
    if (errRaiz) {
      return res.status(500).json({ ok: false, mensaje: `Error al leer Supabase Storage: ${errRaiz.message}` });
    }

    const deCarpeta = (archivosCarpeta || [])
      .filter(a => a.id) // excluye "placeholders" de carpetas
      .map(a => ({ archivo: a, ruta: `${CARPETA_FOTOS}/${a.name}` }));

    const deRaiz = (archivosRaiz || [])
      .filter(a => a.id && esImagen(a.name)) // excluye carpetas y documentos no-imagen
      .map(a => ({ archivo: a, ruta: a.name }));

    const todos = [...deCarpeta, ...deRaiz];

    let conn;
    let registros = [];
    try {
      conn = await getConnection();
      const result = await conn.query(`${SELECT_BASE} ORDER BY f.fecha_subida DESC`);
      registros = result.rows;
    } finally {
      await closeConnection(conn);
    }

    const data = todos.map(({ archivo, ruta }) => {
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(ruta);
      const urlPublica = urlData.publicUrl;

      // IMPORTANTE: se compara contra la RUTA COMPLETA (incluye carpeta),
      // no solo el nombre del archivo. Comparar solo por nombre (antes:
      // `url_foto.endsWith(archivo.name)`) podía confundir dos fotos con
      // el mismo nombre subidas por supervisores distintos (muy común en
      // fotos de celular, ej. "IMG_0001.jpg"), pegándole a una foto el
      // cliente/supervisor de otra. El '/' antes de la ruta asegura que
      // coincida el segmento de carpeta completo, no un sufijo parcial.
      const registro = registros.find(
        r => r.url_foto && r.url_foto.endsWith(`/${ruta}`)
      );

      if (registro) {
        return { ...registro, url_foto: urlPublica, registrado: true };
      }

      return {
        id: null,
        supervisor_id: null,
        fecha: null,
        intento: null,
        url_foto: urlPublica,
        fecha_subida: archivo.created_at || archivo.updated_at || null,
        observacion: null,
        supervisor: null,
        cliente: null,
        nombre_archivo: archivo.name,
        registrado: false,
      };
    });

    data.sort((a, b) => new Date(b.fecha_subida || 0) - new Date(a.fecha_subida || 0));

    res.status(200).json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
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

module.exports = { listar, listarTodasDeStorage, obtenerPorId, listarPorAsistencia, insertar, eliminar };